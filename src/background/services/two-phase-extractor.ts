import {
	PHASE_1_HIGH_RECALL_PROMPT,
	PHASE_2_HIGH_PRECISION_PROMPT,
} from "../../shared/constants";
import { debugLogger } from "../../shared/debug";
import type { GoldenNuggetType } from "../../shared/schemas";
import type { LLMProvider, Phase1Response } from "../../shared/types/providers";
import { EnsembleExtractor } from "./ensemble-extractor";
import {
	FuzzyBoundaryMatcher,
	type Phase1Nugget,
	type Phase2NuggetResult,
} from "./fuzzy-boundary-matcher";

/**
 * Two-phase extraction system for improved golden nugget accuracy.
 * Phase 1: High recall extraction with confidence scoring
 * Phase 2: High precision boundary detection via fuzzy matching + LLM fallback
 */

// Final combined response format (compatible with existing GoldenNuggetsResponse)
export interface TwoPhaseExtractionResult {
	golden_nuggets: Array<{
		type: GoldenNuggetType;
		startContent: string;
		endContent: string;
		fullContent: string; // Include the preserved fullContent from Phase 1
		confidence?: number; // Optional confidence score for backward compatibility
		extractionMethod?: "fuzzy" | "llm"; // Optional method indicator
	}>;
	metadata: {
		phase1Count: number;
		phase1FilteredCount: number;
		phase2FuzzyCount: number;
		phase2LlmCount: number;
		totalProcessingTime: number;
		confidenceThreshold: number;
		abortedDueToLowConfidence?: boolean;
		noNuggetsPassed?: boolean;
	};
}

export interface TwoPhaseExtractionOptions {
	confidenceThreshold?: number; // Default 0.85
	useEnsemble?: boolean; // Default false
	ensembleRuns?: number; // Default 3
	phase1Temperature?: number; // Default 0.7
	phase2Temperature?: number; // Default 0.0
	fuzzyMatchOptions?: {
		tolerance?: number;
		minConfidenceThreshold?: number;
	};
	selectedTypes?: GoldenNuggetType[];
}

export class TwoPhaseExtractor {
	private fuzzyMatcher: FuzzyBoundaryMatcher;
	private ensembleExtractor: EnsembleExtractor;

	constructor() {
		this.fuzzyMatcher = new FuzzyBoundaryMatcher();
		this.ensembleExtractor = new EnsembleExtractor();
	}

	/**
	 * Performs two-phase extraction: high-recall Phase 1 followed by high-precision Phase 2.
	 */
	async extractWithTwoPhase(
		content: string,
		prompt: string,
		provider: LLMProvider,
		options: TwoPhaseExtractionOptions = {},
	): Promise<TwoPhaseExtractionResult> {
		const startTime = performance.now();

		const opts = {
			confidenceThreshold: options.confidenceThreshold ?? 0.85,
			useEnsemble: options.useEnsemble ?? false,
			ensembleRuns: options.ensembleRuns ?? 3,
			phase1Temperature: options.phase1Temperature ?? 0.7,
			phase2Temperature: options.phase2Temperature ?? 0.0,
			fuzzyMatchOptions: {
				tolerance: options.fuzzyMatchOptions?.tolerance ?? 0.8,
				minConfidenceThreshold:
					options.fuzzyMatchOptions?.minConfidenceThreshold ?? 0.7,
				...options.fuzzyMatchOptions,
			},
			selectedTypes: options.selectedTypes || [],
		};

		console.log(
			`Starting two-phase extraction with provider ${provider.providerId}, ensemble: ${opts.useEnsemble}`,
		);
		debugLogger.log(`[TwoPhase] 🚀 Starting extraction with options:`, {
			confidenceThreshold: opts.confidenceThreshold,
			useEnsemble: opts.useEnsemble,
			phase1Temperature: opts.phase1Temperature,
			phase2Temperature: opts.phase2Temperature,
			contentLength: content.length,
		});

		try {
			// Phase 1: High-recall extraction
			const phase1Result = await this.executePhase1(
				content,
				prompt,
				provider,
				opts,
			);

			console.log(
				`Phase 1 completed: ${phase1Result.golden_nuggets.length} nuggets extracted`,
			);
			debugLogger.log(
				`[TwoPhase] Phase 1 raw nuggets:`,
				JSON.stringify(phase1Result.golden_nuggets.slice(0, 3), null, 2),
			);

			// Filter by confidence threshold
			const filteredNuggets = phase1Result.golden_nuggets.filter(
				(nugget) => nugget.confidence >= opts.confidenceThreshold,
			);

			console.log(
				`After confidence filtering (>= ${opts.confidenceThreshold}): ${filteredNuggets.length} nuggets`,
			);
			debugLogger.log(
				`[TwoPhase] Filtered nuggets:`,
				JSON.stringify(filteredNuggets.slice(0, 2), null, 2),
			);
			debugLogger.log(
				`[TwoPhase] Confidence scores:`,
				phase1Result.golden_nuggets.map((n) => n.confidence),
			);

			// Check confidence quality for user feedback
			const lowConfidenceRatio =
				1 -
				filteredNuggets.length /
					Math.max(phase1Result.golden_nuggets.length, 1);

			debugLogger.log(
				`[TwoPhase] Quality check: lowConfidenceRatio=${lowConfidenceRatio.toFixed(3)}, phase1Count=${phase1Result.golden_nuggets.length}, filteredCount=${filteredNuggets.length}`,
			);

			if (lowConfidenceRatio > 0.6 && phase1Result.golden_nuggets.length > 0) {
				// Many nuggets were filtered out due to low confidence - log warning but continue
				console.log(
					`Quality Warning: ${Math.round(lowConfidenceRatio * 100)}% of nuggets had confidence < ${opts.confidenceThreshold}. Continuing with ${filteredNuggets.length} high-confidence nuggets.`,
				);
				debugLogger.log(
					`[TwoPhase] ⚠️  WARNING: Low overall confidence, but proceeding with ${filteredNuggets.length} valid nuggets`,
				);
			}

			// Check if we have any nuggets left to process
			if (filteredNuggets.length === 0) {
				// No nuggets met the confidence threshold
				console.log(
					`No nuggets met confidence threshold ${opts.confidenceThreshold}. Consider lowering the threshold.`,
				);
				debugLogger.log(
					`[TwoPhase] ❌ No nuggets passed confidence filtering - returning empty results`,
				);

				return {
					golden_nuggets: [],
					metadata: {
						phase1Count: phase1Result.golden_nuggets.length,
						phase1FilteredCount: 0,
						phase2FuzzyCount: 0,
						phase2LlmCount: 0,
						totalProcessingTime: performance.now() - startTime,
						confidenceThreshold: opts.confidenceThreshold,
						abortedDueToLowConfidence: false,
						noNuggetsPassed: true,
					},
				};
			}

			// Phase 2: Boundary detection
			const phase2Result = await this.executePhase2(
				content,
				filteredNuggets,
				provider,
				opts,
			);

			const totalProcessingTime = performance.now() - startTime;

			console.log(
				`Two-phase extraction completed in ${totalProcessingTime}ms: ${phase2Result.fuzzyMatched.length} fuzzy + ${phase2Result.llmMatched.length} LLM matches`,
			);

			return {
				golden_nuggets: [
					...phase2Result.fuzzyMatched,
					...phase2Result.llmMatched,
				].map((nugget) => ({
					type: nugget.type,
					startContent: nugget.startContent,
					endContent: nugget.endContent,
					fullContent: nugget.fullContent, // Preserve the perfect fullContent from Phase 1
					confidence: nugget.confidence,
					extractionMethod:
						nugget.matchMethod === "exact" || nugget.matchMethod === "fuzzy"
							? "fuzzy"
							: "llm",
				})),
				metadata: {
					phase1Count: phase1Result.golden_nuggets.length,
					phase1FilteredCount: filteredNuggets.length,
					phase2FuzzyCount: phase2Result.fuzzyMatched.length,
					phase2LlmCount: phase2Result.llmMatched.length,
					totalProcessingTime,
					confidenceThreshold: opts.confidenceThreshold,
					abortedDueToLowConfidence: false,
				},
			};
		} catch (error) {
			console.error("Two-phase extraction failed:", error);
			throw error;
		}
	}

	/**
	 * Phase 1: High-recall extraction with confidence scoring
	 */
	private async executePhase1(
		content: string,
		originalPrompt: string,
		provider: LLMProvider,
		options: Required<TwoPhaseExtractionOptions>,
	): Promise<Phase1Response> {
		// Replace original prompt with Phase 1 prompt while preserving persona
		const phase1Prompt = this.replacePromptPlaceholders(
			PHASE_1_HIGH_RECALL_PROMPT,
			originalPrompt,
		);

		if (options.useEnsemble) {
			// Use ensemble extraction for Phase 1 - NOW WITH PROPER PHASE 1 INTEGRATION
			const ensembleResult = await this.ensembleExtractor.extractWithEnsemble(
				content,
				phase1Prompt,
				provider,
				{
					runs: options.ensembleRuns,
					temperature: options.phase1Temperature,
					parallelExecution: true,
					usePhase1: true, // Enable Phase 1 method usage
					selectedTypes: options.selectedTypes || [],
				},
			);

			// Convert ensemble result to Phase 1 format
			// Note: Ensemble results already have confidence scores from consensus
			return {
				golden_nuggets: ensembleResult.golden_nuggets.map((nugget) => ({
					type: nugget.type as GoldenNuggetType,
					fullContent: `${nugget.startContent} ... ${nugget.endContent}`, // Reconstruct full content
					confidence: nugget.confidence, // Use actual ensemble confidence
				})),
			};
		} else {
			// Single extraction for Phase 1 - NOW USING THE CORRECT PHASE 1 METHOD
			const rawResponse = await provider.extractPhase1HighRecall(
				content,
				phase1Prompt,
				options.phase1Temperature,
				options.selectedTypes,
			);

			debugLogger.log(`[TwoPhase] Phase 1 single extraction raw response:`, {
				nuggetCount: rawResponse.golden_nuggets.length,
				sampleNugget: rawResponse.golden_nuggets[0] || null,
				confidenceScores: rawResponse.golden_nuggets.map((n) => n.confidence),
			});

			debugLogger.log(
				`[TwoPhase] ✅ Now using proper Phase 1 method with real confidence scores`,
			);

			return rawResponse;
		}
	}

	/**
	 * Phase 2: Boundary detection via fuzzy matching + LLM fallback
	 */
	private async executePhase2(
		originalContent: string,
		phase1Nuggets: Array<{
			type: GoldenNuggetType;
			fullContent: string;
			confidence: number;
		}>,
		provider: LLMProvider,
		options: Required<TwoPhaseExtractionOptions>,
	): Promise<{
		fuzzyMatched: Phase2NuggetResult[];
		llmMatched: Phase2NuggetResult[];
	}> {
		// Step 1: Try fuzzy matching for boundary detection
		const fuzzyResults = this.fuzzyMatcher.findBoundaries(
			originalContent,
			phase1Nuggets,
		);

		console.log(
			`Fuzzy matching found boundaries for ${fuzzyResults.length} nuggets`,
		);

		// Step 2: Get nuggets that couldn't be matched with fuzzy search
		const unmatchedNuggets = this.fuzzyMatcher.getUnmatchedNuggets(
			phase1Nuggets,
			fuzzyResults,
		);

		console.log(
			`${unmatchedNuggets.length} nuggets need LLM boundary detection`,
		);

		let llmResults: Phase2NuggetResult[] = [];

		// Step 3: Use LLM for remaining nuggets (if any)
		if (unmatchedNuggets.length > 0) {
			llmResults = await this.llmBoundaryDetection(
				originalContent,
				unmatchedNuggets,
				provider,
				options.phase2Temperature,
			);
		}

		return {
			fuzzyMatched: fuzzyResults,
			llmMatched: llmResults,
		};
	}

	/**
	 * LLM-based boundary detection for nuggets that couldn't be fuzzy matched
	 */
	private async llmBoundaryDetection(
		originalContent: string,
		unmatchedNuggets: Phase1Nugget[],
		provider: LLMProvider,
		temperature: number,
	): Promise<Phase2NuggetResult[]> {
		try {
			// NOW USING THE CORRECT PHASE 2 METHOD
			const rawResponse = await provider.extractPhase2HighPrecision(
				originalContent,
				PHASE_2_HIGH_PRECISION_PROMPT,
				unmatchedNuggets,
				temperature,
			);

			debugLogger.log(
				`[TwoPhase] ✅ Now using proper Phase 2 method with real confidence scores`,
			);
			debugLogger.log(`[TwoPhase] Phase 2 LLM boundary detection response:`, {
				nuggetCount: rawResponse.golden_nuggets.length,
				confidenceScores: rawResponse.golden_nuggets.map((n) => n.confidence),
			});

			// Convert response to Phase2NuggetResult format, preserving original fullContent
			return rawResponse.golden_nuggets.map((nugget, index) => {
				// Find corresponding original nugget to preserve fullContent
				const originalNugget =
					unmatchedNuggets[index] ||
					unmatchedNuggets.find((n) => n.type === nugget.type);
				const fullContent = originalNugget?.fullContent || "";

				return {
					type: nugget.type as GoldenNuggetType,
					startContent: nugget.startContent,
					endContent: nugget.endContent,
					fullContent: fullContent, // Preserve the perfect Phase 1 fullContent
					confidence: nugget.confidence, // Use actual LLM-provided confidence
					matchMethod: "llm" as const,
				};
			});
		} catch (error) {
			console.error("LLM boundary detection failed:", error);
			// Return empty results rather than throwing
			return [];
		}
	}

	/**
	 * Replaces prompt placeholders (like {{ persona }}) from original prompt in Phase 1 prompt
	 */
	private replacePromptPlaceholders(
		phase1Prompt: string,
		originalPrompt: string,
	): string {
		// Extract persona from original prompt if it exists
		const personaMatch = originalPrompt.match(/persona:\s*([^\n]+)/i);
		const persona = personaMatch ? personaMatch[1].trim() : "";

		return phase1Prompt.replace(/\{\{\s*persona\s*\}\}/g, persona);
	}
}
