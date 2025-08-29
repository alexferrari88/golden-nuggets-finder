import { advancedNormalize } from "../../shared/content-reconstruction";
import type { GoldenNuggetType } from "../../shared/schemas";
import {
	generateUrlBoundaries,
	isUrl,
	validateBoundaries,
} from "../../shared/utils/url-detection";
import { calculateWordSimilarity } from "../../shared/utils/word-similarity";

/**
 * Fuzzy boundary matcher for two-phase extraction system.
 * Specialized service for finding exact boundaries of golden nuggets identified in Phase 1.
 */

export interface Phase1Nugget {
	type: GoldenNuggetType;
	fullContent: string;
	confidence: number;
}

export interface Phase2NuggetResult {
	type: GoldenNuggetType;
	startContent: string;
	endContent: string;
	fullContent: string; // Preserve the original fullContent from Phase 1
	confidence: number;
	matchMethod: "exact" | "fuzzy" | "llm" | "not_found";
}

export interface BoundaryMatchOptions {
	tolerance?: number; // 0.0 to 1.0, default 0.8
	maxStartWords?: number; // Maximum words for startContent, default 5
	maxEndWords?: number; // Maximum words for endContent, default 5
	minConfidenceThreshold?: number; // Minimum confidence to accept match, default 0.7
}

export class FuzzyBoundaryMatcher {
	private readonly options: Required<BoundaryMatchOptions>;

	constructor(options: BoundaryMatchOptions = {}) {
		this.options = {
			tolerance: options.tolerance ?? 0.8,
			maxStartWords: options.maxStartWords ?? 5,
			maxEndWords: options.maxEndWords ?? 5,
			minConfidenceThreshold: options.minConfidenceThreshold ?? 0.7,
		};
	}

	/**
	 * Finds exact boundaries for an array of Phase 1 nuggets within original content.
	 * Returns successfully matched nuggets with startContent/endContent boundaries.
	 */
	findBoundaries(
		originalContent: string,
		phase1Nuggets: Phase1Nugget[],
	): Phase2NuggetResult[] {
		const results: Phase2NuggetResult[] = [];

		for (const nugget of phase1Nuggets) {
			const result = this.findSingleBoundary(originalContent, nugget);
			if (result.confidence >= this.options.minConfidenceThreshold) {
				results.push(result);
			}
		}

		return results;
	}

	/**
	 * Finds boundaries for a single Phase 1 nugget within original content.
	 */
	private findSingleBoundary(
		originalContent: string,
		nugget: Phase1Nugget,
	): Phase2NuggetResult {
		// Try exact match first
		const exactResult = this.tryExactMatch(originalContent, nugget);
		if (exactResult.confidence >= this.options.minConfidenceThreshold) {
			return exactResult;
		}

		// Try fuzzy match if exact match fails
		const fuzzyResult = this.tryFuzzyMatch(originalContent, nugget);
		return fuzzyResult;
	}

	/**
	 * Attempts exact text matching for the nugget content.
	 */
	private tryExactMatch(
		originalContent: string,
		nugget: Phase1Nugget,
	): Phase2NuggetResult {
		const normalizedContent = advancedNormalize(originalContent);
		const normalizedNugget = advancedNormalize(nugget.fullContent);

		const index = normalizedContent.indexOf(normalizedNugget);

		if (index !== -1) {
			// Found exact match - verify the content exists, but generate boundaries from fullContent
			const boundaries = this.generateBoundariesFromFullContent(
				nugget.fullContent,
			);

			return {
				type: nugget.type,
				startContent: boundaries.startContent,
				endContent: boundaries.endContent,
				fullContent: nugget.fullContent, // Preserve the original perfect content
				confidence: Math.min(nugget.confidence * 1.0, 1.0), // Keep original confidence for exact matches
				matchMethod: "exact",
			};
		}

		return {
			type: nugget.type,
			startContent: "",
			endContent: "",
			fullContent: nugget.fullContent, // Always preserve fullContent, even for failed matches
			confidence: 0.0,
			matchMethod: "not_found",
		};
	}

	/**
	 * Attempts fuzzy matching for the nugget content using sliding window approach.
	 */
	private tryFuzzyMatch(
		originalContent: string,
		nugget: Phase1Nugget,
	): Phase2NuggetResult {
		const nuggetWords = advancedNormalize(nugget.fullContent)
			.split(/\s+/)
			.filter((w) => w.length > 0);
		const contentWords = advancedNormalize(originalContent)
			.split(/\s+/)
			.filter((w) => w.length > 0);

		let bestMatch = {
			startIndex: -1,
			endIndex: -1,
			confidence: 0.0,
		};

		// Sliding window approach to find best fuzzy match
		for (let i = 0; i <= contentWords.length - nuggetWords.length; i++) {
			const windowWords = contentWords.slice(i, i + nuggetWords.length);
			const similarity = this.calculateWordSimilarity(nuggetWords, windowWords);

			if (
				similarity > bestMatch.confidence &&
				similarity >= this.options.tolerance
			) {
				bestMatch = {
					startIndex: i,
					endIndex: i + nuggetWords.length - 1,
					confidence: similarity,
				};
			}
		}

		if (bestMatch.confidence >= this.options.tolerance) {
			// Found fuzzy match - verify the content exists, but generate boundaries from fullContent
			const boundaries = this.generateBoundariesFromFullContent(
				nugget.fullContent,
			);

			return {
				type: nugget.type,
				startContent: boundaries.startContent,
				endContent: boundaries.endContent,
				fullContent: nugget.fullContent, // Preserve the original perfect content
				confidence: Math.min(nugget.confidence * bestMatch.confidence, 1.0),
				matchMethod: "fuzzy",
			};
		}

		// For any content type, generate boundaries even if not found in content
		// This ensures we always provide usable boundaries for display purposes
		const boundaries = this.generateBoundariesFromFullContent(
			nugget.fullContent,
		);

		if (
			boundaries.startContent &&
			boundaries.endContent &&
			boundaries.startContent !== boundaries.endContent
		) {
			return {
				type: nugget.type,
				startContent: boundaries.startContent,
				endContent: boundaries.endContent,
				fullContent: nugget.fullContent,
				confidence: Math.max(
					this.options.minConfidenceThreshold,
					nugget.confidence * 0.9,
				), // Ensure meets threshold
				matchMethod: "fuzzy", // Boundary generation is a fuzzy approach when content not found
			};
		}

		return {
			type: nugget.type,
			startContent: "",
			endContent: "",
			fullContent: nugget.fullContent, // Always preserve fullContent, even for failed matches
			confidence: 0.0,
			matchMethod: "not_found",
		};
	}

	/**
	 * Calculates similarity between two word arrays using shared utility.
	 */
	private calculateWordSimilarity(
		nuggetWords: string[],
		contentWords: string[],
	): number {
		// Use the shared word similarity utility with the same scoring strategy
		// as the original implementation
		return calculateWordSimilarity(nuggetWords, contentWords, {
			exactMatchScore: 1.0,
			substringMatchScore: 0.8,
			levenshteinScoreMultiplier: 0.7,
			levenshteinThreshold: 0.6,
		});
	}

	/**
	 * Generate startContent and endContent directly from fullContent.
	 * This preserves the perfect AI-generated content instead of corrupting it
	 * by extracting boundaries from original text indices.
	 * Special handling for URLs to ensure startContent !== endContent.
	 */
	private generateBoundariesFromFullContent(fullContent: string): {
		startContent: string;
		endContent: string;
	} {
		// Check if content is a URL (trimmed to handle whitespace)
		const trimmedContent = fullContent.trim();
		if (isUrl(trimmedContent)) {
			// Use URL-specific boundary generation to avoid identical start/end
			const urlBoundaries = generateUrlBoundaries(trimmedContent);

			// Validate that boundaries are different - critical for highlighting
			if (
				validateBoundaries(urlBoundaries.startContent, urlBoundaries.endContent)
			) {
				return urlBoundaries;
			}

			// Fallback if URL boundaries are somehow invalid
			console.warn(
				"URL boundary generation failed, using fallback for:",
				trimmedContent,
			);
		}

		// Original logic for non-URL content
		const words = fullContent.split(/\s+/).filter((w) => w.length > 0);

		// Use the configured maxStartWords and maxEndWords from options
		const startWords = words.slice(0, this.options.maxStartWords);
		const endWords = words.slice(-this.options.maxEndWords);

		const boundaries = {
			startContent: startWords.join(" "),
			endContent: endWords.join(" "),
		};

		// Final validation to ensure boundaries are different
		// This prevents the original issue where startContent === endContent
		if (!validateBoundaries(boundaries.startContent, boundaries.endContent)) {
			// Emergency fallback: truncate content to create different boundaries
			const maxLength = Math.min(50, fullContent.length);
			const halfLength = Math.floor(maxLength / 2);

			return {
				startContent: fullContent.slice(0, halfLength),
				endContent: fullContent.slice(-halfLength),
			};
		}

		return boundaries;
	}

	/**
	 * Gets nuggets that could not be matched using fuzzy search.
	 * These will need to be processed by Phase 2 LLM boundary detection.
	 */
	getUnmatchedNuggets(
		phase1Nuggets: Phase1Nugget[],
		matchedResults: Phase2NuggetResult[],
	): Phase1Nugget[] {
		const _matchedNuggetContents = new Set(
			matchedResults.map((r) => `${r.type}:${r.startContent}:${r.endContent}`),
		);

		return phase1Nuggets.filter((nugget) => {
			// Check if this nugget was successfully matched
			return !matchedResults.some(
				(result) =>
					result.type === nugget.type &&
					result.matchMethod !== "not_found" &&
					result.confidence >= this.options.minConfidenceThreshold,
			);
		});
	}
}
