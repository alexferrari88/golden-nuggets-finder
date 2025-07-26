import { advancedNormalize } from "./content-reconstruction";

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

/**
 * Calculates the Levenshtein distance between two strings.
 * Used for fuzzy matching with tolerance for minor spelling differences.
 *
 * @param str1 - First string to compare
 * @param str2 - Second string to compare
 * @returns The Levenshtein distance (number of single-character edits required)
 */
function levenshteinDistance(str1: string, str2: string): number {
	const matrix: number[][] = [];
	for (let i = 0; i <= str2.length; i++) {
		matrix[i] = [i];
	}
	for (let j = 0; j <= str1.length; j++) {
		matrix[0][j] = j;
	}
	for (let i = 1; i <= str2.length; i++) {
		for (let j = 1; j <= str1.length; j++) {
			if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
				matrix[i][j] = matrix[i - 1][j - 1];
			} else {
				matrix[i][j] = Math.min(
					matrix[i - 1][j - 1] + 1,
					matrix[i][j - 1] + 1,
					matrix[i - 1][j] + 1,
				);
			}
		}
	}
	return matrix[str2.length][str1.length];
}
