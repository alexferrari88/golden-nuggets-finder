import { advancedNormalize } from "./content-reconstruction";
import { levenshteinDistance } from "./utils/levenshtein-distance";

/**
 * Fuzzy matching system for improved content highlighting with tolerance-based matching.
 * Uses word-level matching with Levenshtein distance for handling minor text variations.
 */

/**
 * Performs fuzzy matching between text and target with configurable tolerance.
 *
 * @param text - The text to search within
 * @param target - The target text to find
 * @param tolerance - Match tolerance threshold (0.0 to 1.0, default 0.8)
 * @returns True if the match ratio meets or exceeds the tolerance threshold
 */
export function fuzzyMatch(
	text: string,
	target: string,
	tolerance = 0.8,
): boolean {
	const textWords = advancedNormalize(text)
		.split(" ")
		.filter((w) => w.length > 0);
	const targetWords = advancedNormalize(target)
		.split(" ")
		.filter((w) => w.length > 0);

	const matches = targetWords.filter((word) =>
		textWords.some(
			(textWord) =>
				textWord.includes(word) ||
				word.includes(textWord) ||
				levenshteinDistance(textWord, word) <= 1,
		),
	);

	return matches.length / targetWords.length >= tolerance;
}
