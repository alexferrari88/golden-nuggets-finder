import uFuzzy from "@leeoniya/ufuzzy";
import { debugLogger } from "../../shared/debug";
import type { GoldenNuggetType } from "../../shared/schemas";
import type { GoldenNugget } from "../../shared/types";
import type { LLMProvider } from "../../shared/types/providers";

export interface ContentValidationOptions {
	temperature?: number;
	selectedTypes?: GoldenNuggetType[];
	validationThreshold?: number;
}

export interface ValidatedExtractionResult {
	golden_nuggets: Array<
		GoldenNugget & {
			validationScore: number;
		}
	>;
	metadata: {
		totalNuggets: number;
		validatedCount: number;
		averageValidationScore: number;
		processingTime: number;
	};
}

/**
 * Simplified content validator that replaces the complex two-phase system.
 * Uses battle-tested uFuzzy.js for content validation instead of custom boundary matching.
 */
export class ContentValidator {
	private fuzzyValidator: uFuzzy;

	constructor() {
		// Configure uFuzzy for high-quality content validation
		this.fuzzyValidator = new uFuzzy({
			// Intra-string character insertion/substitution/transposition/deletion costs
			intraMode: 1,
			intraIns: 1,
			intraSub: 1,
			intraTrn: 1,
			intraDel: 1,
		});
	}

	/**
	 * Extract and validate content using single LLM call + uFuzzy validation
	 */
	async extractWithValidation(
		content: string,
		prompt: string,
		provider: LLMProvider,
		options: ContentValidationOptions = {},
	): Promise<ValidatedExtractionResult> {
		const startTime = performance.now();

		debugLogger.log(
			`[ContentValidator] 🚀 Starting extraction with validation`,
			{
				contentLength: content.length,
				temperature: options.temperature ?? 0.7,
				selectedTypes: options.selectedTypes?.length || "all",
				validationThreshold: options.validationThreshold ?? 0.8,
			},
		);

		try {
			// Single LLM call for fullContent extraction (no complex two-phase process)
			const response = await provider.extractGoldenNuggets(
				content,
				prompt,
				options.temperature ?? 0.7,
				options.selectedTypes,
			);

			debugLogger.log(`[ContentValidator] 🤖 LLM extraction complete`, {
				nuggetCount: response.golden_nuggets.length,
				nuggets: response.golden_nuggets.map((n) => ({
					type: n.type,
					confidence: n.confidence,
					fullContentLength: n.fullContent?.length || 0,
					fullContentPreview: `${n.fullContent?.substring(0, 100)}...`,
				})),
			});

			// Validate content exists in source using uFuzzy
			const validatedNuggets = response.golden_nuggets.map((nugget) => {
				const validationScore = this.validateContentExists(
					nugget.fullContent,
					content,
				);
				const isValidated =
					validationScore >= (options.validationThreshold ?? 0.8);

				debugLogger.log(`[ContentValidator] 🔍 Validating nugget`, {
					type: nugget.type,
					validationScore: validationScore.toFixed(3),
					isValidated,
					fullContentPreview: `${nugget.fullContent?.substring(0, 50)}...`,
				});

				return {
					...nugget,
					validationScore,
					extractionMethod: isValidated ? "fuzzy" : "llm", // Use existing GoldenNugget extractionMethod types
				};
			});

			const endTime = performance.now();
			const processingTime = endTime - startTime;

			const validatedCount = validatedNuggets.filter(
				(n) => n.extractionMethod === "validated",
			).length;
			const averageValidationScore =
				this.calculateAverageScore(validatedNuggets);

			debugLogger.log(`[ContentValidator] ✅ Validation complete`, {
				totalNuggets: validatedNuggets.length,
				validatedCount,
				averageValidationScore: averageValidationScore.toFixed(3),
				processingTime: `${processingTime.toFixed(1)}ms`,
			});

			return {
				golden_nuggets: validatedNuggets,
				metadata: {
					totalNuggets: validatedNuggets.length,
					validatedCount,
					averageValidationScore,
					processingTime,
				},
			};
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			debugLogger.log(
				`[ContentValidator] ❌ Extraction failed: ${errorMessage}`,
			);
			throw error;
		}
	}

	/**
	 * Validate that fullContent exists in source using uFuzzy.js
	 * Returns a score from 0.0 to 1.0 indicating match quality
	 */
	private validateContentExists(
		fullContent: string,
		sourceContent: string,
	): number {
		if (!fullContent || !sourceContent) {
			return 0.0;
		}

		try {
			// Use uFuzzy for content validation instead of complex boundary matching
			const haystack = [sourceContent]; // Source content as single item
			const needle = fullContent.trim();

			// Search for the content
			const indices = this.fuzzyValidator.search(haystack, [needle]);

			if (indices && indices.length > 0) {
				// uFuzzy returns match indices - convert to quality score
				// For exact matches, this should be very high
				const score = Math.min(1.0, Math.max(0.5, 1.0 - indices[0] * 0.01)); // Higher index = lower score
				return score;
			}

			// Try partial matching for very long content
			if (needle.length > 100) {
				const shortNeedle = needle.substring(0, 100);
				const shortIndices = this.fuzzyValidator.search(haystack, [
					shortNeedle,
				]);
				if (shortIndices && shortIndices.length > 0) {
					return Math.min(0.7, Math.max(0.3, 0.7 - shortIndices[0] * 0.01));
				}
			}

			return 0.0;
		} catch (error) {
			debugLogger.log(`[ContentValidator] ⚠️ Validation error: ${error}`);
			return 0.0;
		}
	}

	/**
	 * Calculate average validation score across all nuggets
	 */
	private calculateAverageScore(
		nuggets: Array<{ validationScore: number }>,
	): number {
		if (nuggets.length === 0) return 0.0;

		const sum = nuggets.reduce(
			(acc, nugget) => acc + nugget.validationScore,
			0,
		);
		return sum / nuggets.length;
	}
}
