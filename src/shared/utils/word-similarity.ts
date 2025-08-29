/**
 * Advanced Word Similarity Utility
 *
 * Provides sophisticated word-by-word similarity calculation using multiple strategies:
 * 1. Exact matching (highest score)
 * 2. Substring matching (high score)
 * 3. Levenshtein distance-based matching (variable score based on edit distance)
 *
 * Extracted from FuzzyBoundaryMatcher for reuse across the codebase.
 */

import { levenshteinSimilarity } from "./levenshtein-distance";

/**
 * Configuration options for word similarity calculation
 */
export interface WordSimilarityOptions {
	/** Score for exact word matches (default: 1.0) */
	exactMatchScore: number;
	/** Score for substring matches (default: 0.8) */
	substringMatchScore: number;
	/** Multiplier for Levenshtein-based scores (default: 0.7) */
	levenshteinScoreMultiplier: number;
	/** Minimum Levenshtein similarity to count as a match (default: 0.6) */
	levenshteinThreshold: number;
}

/**
 * Default options for word similarity calculation
 */
export const DEFAULT_WORD_SIMILARITY_OPTIONS: WordSimilarityOptions = {
	exactMatchScore: 1.0,
	substringMatchScore: 0.8,
	levenshteinScoreMultiplier: 0.7,
	levenshteinThreshold: 0.6,
};

/**
 * Calculate similarity between two arrays of words using advanced multi-tier strategy.
 *
 * Uses three matching strategies in order of preference:
 * 1. Exact matches get highest score (1.0)
 * 2. Substring matches get high score (0.8)
 * 3. Similar words via Levenshtein distance get variable score (similarity * 0.7)
 *
 * @param words1 - First array of words
 * @param words2 - Second array of words
 * @param options - Configuration options for scoring
 * @returns Similarity score from 0.0 to 1.0
 *
 * @example
 * ```typescript
 * calculateWordSimilarity(["hello", "world"], ["hello", "world"]) // returns 1.0
 * calculateWordSimilarity(["hello", "world"], ["hello", "word"]) // returns ~0.9
 * calculateWordSimilarity(["cat"], ["dog"]) // returns 0.0 (below threshold)
 * ```
 */
export function calculateWordSimilarity(
	words1: string[],
	words2: string[],
	options: Partial<WordSimilarityOptions> = {},
): number {
	// Must have same length to compare
	if (words1.length !== words2.length) {
		return 0.0;
	}

	// Handle empty arrays
	if (words1.length === 0) {
		return 1.0; // Both empty = perfect match
	}

	const opts = { ...DEFAULT_WORD_SIMILARITY_OPTIONS, ...options };
	let totalScore = 0;

	for (let i = 0; i < words1.length; i++) {
		const word1 = words1[i];
		const word2 = words2[i];

		// Strategy 1: Exact match (highest priority)
		if (word1 === word2) {
			totalScore += opts.exactMatchScore;
		}
		// Strategy 2: Substring match (high priority)
		else if (word1.includes(word2) || word2.includes(word1)) {
			totalScore += opts.substringMatchScore;
		}
		// Strategy 3: Levenshtein distance match (fallback)
		else {
			const similarity = levenshteinSimilarity(word1, word2);
			if (similarity > opts.levenshteinThreshold) {
				totalScore += similarity * opts.levenshteinScoreMultiplier;
			}
			// If similarity is too low, word contributes 0 to total score
		}
	}

	return totalScore / words1.length;
}

/**
 * Simplified word similarity calculation with just exact and substring matching.
 * Useful when you don't need the complexity of Levenshtein distance.
 *
 * @param words1 - First array of words
 * @param words2 - Second array of words
 * @param substringScore - Score for substring matches (default: 0.8)
 * @returns Similarity score from 0.0 to 1.0
 */
export function calculateSimpleWordSimilarity(
	words1: string[],
	words2: string[],
	substringScore: number = 0.8,
): number {
	return calculateWordSimilarity(words1, words2, {
		exactMatchScore: 1.0,
		substringMatchScore: substringScore,
		levenshteinScoreMultiplier: 0.0, // Disable Levenshtein matching
		levenshteinThreshold: 1.1, // Impossible threshold
	});
}

/**
 * Check if two word arrays are similar above a given threshold.
 *
 * @param words1 - First array of words
 * @param words2 - Second array of words
 * @param threshold - Similarity threshold (0.0 to 1.0, default: 0.7)
 * @param options - Configuration options for similarity calculation
 * @returns True if similarity is above threshold
 *
 * @example
 * ```typescript
 * areWordsSimilar(["hello", "world"], ["hello", "word"], 0.8) // returns true
 * areWordsSimilar(["cat"], ["elephant"], 0.8) // returns false
 * ```
 */
export function areWordsSimilar(
	words1: string[],
	words2: string[],
	threshold: number = 0.7,
	options: Partial<WordSimilarityOptions> = {},
): boolean {
	return calculateWordSimilarity(words1, words2, options) >= threshold;
}

/**
 * Calculate similarity between two text strings by splitting into words first.
 * Convenience function that handles the word splitting automatically.
 *
 * @param text1 - First text string
 * @param text2 - Second text string
 * @param options - Configuration options for similarity calculation
 * @returns Similarity score from 0.0 to 1.0
 *
 * @example
 * ```typescript
 * calculateTextSimilarity("hello world", "hello word") // returns ~0.9
 * calculateTextSimilarity("cat dog", "elephant mouse") // returns 0.0
 * ```
 */
export function calculateTextSimilarity(
	text1: string,
	text2: string,
	options: Partial<WordSimilarityOptions> = {},
): number {
	const words1 = text1.split(/\s+/).filter((w) => w.length > 0);
	const words2 = text2.split(/\s+/).filter((w) => w.length > 0);

	return calculateWordSimilarity(words1, words2, options);
}
