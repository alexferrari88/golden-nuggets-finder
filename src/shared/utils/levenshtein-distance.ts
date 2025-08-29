/**
 * Levenshtein Distance Utility
 *
 * Provides efficient calculation of Levenshtein distance (edit distance) between two strings.
 * Uses dynamic programming approach for optimal performance.
 *
 * Consolidated from multiple duplicate implementations across the codebase.
 */

/**
 * Calculate the Levenshtein distance between two strings.
 *
 * The Levenshtein distance is the minimum number of single-character edits
 * (insertions, deletions, or substitutions) required to change one string into another.
 *
 * @param str1 - First string
 * @param str2 - Second string
 * @returns The minimum edit distance between the strings
 *
 * @example
 * ```typescript
 * levenshteinDistance("kitten", "sitting") // returns 3
 * levenshteinDistance("hello", "hello") // returns 0
 * levenshteinDistance("", "abc") // returns 3
 * ```
 */
export function levenshteinDistance(str1: string, str2: string): number {
	// Handle edge cases
	if (str1 === str2) return 0;
	if (str1.length === 0) return str2.length;
	if (str2.length === 0) return str1.length;

	// Create matrix for dynamic programming
	const matrix: number[][] = [];

	// Initialize first column (distance from empty string)
	for (let i = 0; i <= str2.length; i++) {
		matrix[i] = [i];
	}

	// Initialize first row (distance from empty string)
	for (let j = 0; j <= str1.length; j++) {
		matrix[0][j] = j;
	}

	// Fill the matrix using dynamic programming
	for (let i = 1; i <= str2.length; i++) {
		for (let j = 1; j <= str1.length; j++) {
			if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
				// Characters match - no edit needed
				matrix[i][j] = matrix[i - 1][j - 1];
			} else {
				// Characters don't match - find minimum edit cost
				matrix[i][j] = Math.min(
					matrix[i - 1][j - 1] + 1, // Substitution
					matrix[i][j - 1] + 1, // Insertion
					matrix[i - 1][j] + 1, // Deletion
				);
			}
		}
	}

	return matrix[str2.length][str1.length];
}

/**
 * Calculate normalized similarity score (0.0 to 1.0) based on Levenshtein distance.
 *
 * @param str1 - First string
 * @param str2 - Second string
 * @returns Similarity score where 1.0 = identical, 0.0 = completely different
 *
 * @example
 * ```typescript
 * levenshteinSimilarity("hello", "hello") // returns 1.0
 * levenshteinSimilarity("hello", "help") // returns 0.75
 * ```
 */
export function levenshteinSimilarity(str1: string, str2: string): number {
	const distance = levenshteinDistance(str1, str2);
	const maxLength = Math.max(str1.length, str2.length);

	if (maxLength === 0) return 1.0; // Both strings are empty

	return 1.0 - distance / maxLength;
}

/**
 * Check if two strings are similar within a given threshold using Levenshtein distance.
 *
 * @param str1 - First string
 * @param str2 - Second string
 * @param threshold - Similarity threshold (0.0 to 1.0)
 * @returns True if strings are similar enough
 *
 * @example
 * ```typescript
 * isLevenshteinSimilar("hello", "helo", 0.8) // returns true
 * isLevenshteinSimilar("hello", "world", 0.8) // returns false
 * ```
 */
export function isLevenshteinSimilar(
	str1: string,
	str2: string,
	threshold: number = 0.8,
): boolean {
	return levenshteinSimilarity(str1, str2) >= threshold;
}
