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
					fullContentExists: !!n.fullContent,
					fullContentType: typeof n.fullContent,
				})),
				rawResponse: response,
			});

			// Validate content exists in source using uFuzzy
			const validatedNuggets = response.golden_nuggets.map((nugget) => {
				// Ensure fullContent is properly preserved
				if (!nugget.fullContent) {
					debugLogger.log(
						`[ContentValidator] ⚠️ Missing fullContent for nugget:`,
						{
							type: nugget.type,
							nugget: nugget,
						},
					);
				}

				const validationScore = this.validateContentExists(
					nugget.fullContent || "",
					content,
				);
				const isValidated =
					validationScore >= (options.validationThreshold ?? 0.8);

				debugLogger.log(`[ContentValidator] 🔍 Validating nugget`, {
					type: nugget.type,
					validationScore: validationScore.toFixed(3),
					isValidated,
					fullContentPreview: `${(nugget.fullContent || "MISSING")?.substring(0, 50)}...`,
					fullContentLength: nugget.fullContent?.length || 0,
				});

				return {
					...nugget,
					// Explicitly preserve fullContent to prevent data loss
					fullContent: nugget.fullContent || "",
					validationScore,
					extractionMethod: isValidated ? ("fuzzy" as const) : ("llm" as const),
				};
			});

			const endTime = performance.now();
			const processingTime = endTime - startTime;

			const validatedCount = validatedNuggets.filter(
				(n) => n.validationScore >= (options.validationThreshold ?? 0.8),
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
	 * Validate that fullContent exists in source content
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
			const needle = fullContent.trim();

			// First try exact string match - highest confidence
			if (sourceContent.includes(needle)) {
				return 1.0;
			}

			// Try case-insensitive exact match
			if (sourceContent.toLowerCase().includes(needle.toLowerCase())) {
				return 0.95;
			}

			// Use uFuzzy for fuzzy matching - split source into chunks for better matching
			const chunkSize = Math.max(needle.length * 2, 200);
			const sourceChunks: string[] = [];

			// Create overlapping chunks to avoid missing content at boundaries
			for (let i = 0; i < sourceContent.length; i += chunkSize / 2) {
				const chunk = sourceContent.substring(i, i + chunkSize);
				if (chunk.length > needle.length / 2) {
					sourceChunks.push(chunk);
				}
			}

			// Search for needle in chunks using uFuzzy
			const searchResults = this.fuzzyValidator.search(sourceChunks, needle);

			if (searchResults && searchResults.length > 0) {
				// uFuzzy found matches - return good score based on match quality
				return 0.8;
			}

			// Try partial matching for very long content
			if (needle.length > 100) {
				const shortNeedle = needle.substring(0, 100);
				if (sourceContent.includes(shortNeedle)) {
					return 0.6;
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
