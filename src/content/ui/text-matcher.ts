/**
 * TextMatcher - Centralized fuzzy text matching service using uFuzzy.js
 * Handles LLM text variations with fuzzy matching while maintaining performance
 */

import uFuzzy from "@leeoniya/ufuzzy";
import { TextNormalizer } from "./text-normalizer";

export interface FuzzyMatchResult {
	startIndex: number;
	endIndex: number;
	confidence: number;
	matchedText: string;
}

export class TextMatcher {
	private ufuzzy: uFuzzy;

	constructor() {
		this.ufuzzy = new uFuzzy({
			intraMode: 1, // Enable fuzzy matching
			intraSub: 1, // Substitution tolerance (0 or 1)
			intraTrn: 1, // Transposition tolerance (0 or 1)
			intraDel: 1, // Deletion tolerance (0 or 1)
		});
	}

	/**
	 * Find the best fuzzy match for searchText within bodyText
	 * Returns match with position and confidence, or null if no match found
	 */
	findBestMatch(searchText: string, bodyText: string): FuzzyMatchResult | null {
		if (!searchText || !bodyText) {
			return null;
		}

		// Try exact case-insensitive matching first for best performance
		const exactMatch = this.findExactMatch(searchText, bodyText);
		if (exactMatch) {
			return {
				...exactMatch,
				confidence: 1.0,
				matchedText: bodyText.substring(
					exactMatch.startIndex,
					exactMatch.endIndex,
				),
			};
		}

		// Try normalized exact matching for common variations
		const normalizedSearch = TextNormalizer.normalizeForMatching(searchText);
		const normalizedBody = TextNormalizer.normalizeForMatching(bodyText);

		// Always try normalized matching, not just when different from simple lowercase
		const normalizedMatch = this.findNormalizedMatch(
			normalizedSearch,
			normalizedBody,
			bodyText,
		);
		if (normalizedMatch) {
			return normalizedMatch;
		}

		// Fall back to fuzzy matching for LLM variations
		return this.findFuzzyMatch(searchText, bodyText);
	}

	/**
	 * Find exact match with case-insensitive search
	 */
	private findExactMatch(
		searchText: string,
		bodyText: string,
	): { startIndex: number; endIndex: number } | null {
		const searchLower = searchText.toLowerCase();
		const bodyLower = bodyText.toLowerCase();
		const startIndex = bodyLower.indexOf(searchLower);

		if (startIndex !== -1) {
			return {
				startIndex,
				endIndex: startIndex + searchText.length,
			};
		}

		return null;
	}

	/**
	 * Find match using normalized text but return original text positions
	 */
	private findNormalizedMatch(
		normalizedSearch: string,
		normalizedBody: string,
		originalBody: string,
	): FuzzyMatchResult | null {
		const normalizedSearchLower = normalizedSearch.toLowerCase();
		const normalizedBodyLower = normalizedBody.toLowerCase();
		const startIndex = normalizedBodyLower.indexOf(normalizedSearchLower);

		if (startIndex === -1) {
			return null;
		}

		// For Phase 1, map back to original text using approximate positioning
		// More sophisticated mapping will be added in Phase 2
		const endIndex = startIndex + normalizedSearch.length;

		// Try to find the corresponding text in the original by looking around the mapped position
		const searchRadius = Math.max(normalizedSearch.length * 0.5, 20);
		const searchStart = Math.max(0, startIndex - searchRadius);
		const searchEnd = Math.min(originalBody.length, endIndex + searchRadius);
		const searchRegion = originalBody.substring(searchStart, searchEnd);

		// Look for the closest match in the original text region
		const originalSearchLower =
			TextNormalizer.normalizeForMatching(searchRegion).toLowerCase();
		const matchIndexInRegion = originalSearchLower.indexOf(
			normalizedSearchLower,
		);

		if (matchIndexInRegion !== -1) {
			const actualStartIndex = searchStart + matchIndexInRegion;
			const actualEndIndex = actualStartIndex + normalizedSearch.length;

			return {
				startIndex: actualStartIndex,
				endIndex: Math.min(originalBody.length, actualEndIndex),
				confidence: 0.92, // High confidence for normalized matches
				matchedText: originalBody.substring(
					actualStartIndex,
					Math.min(originalBody.length, actualEndIndex),
				),
			};
		}

		// Fallback: use approximate positioning
		return {
			startIndex,
			endIndex: Math.min(originalBody.length, endIndex),
			confidence: 0.85, // Lower confidence for approximate positioning
			matchedText: originalBody.substring(
				startIndex,
				Math.min(originalBody.length, endIndex),
			),
		};
	}

	/**
	 * Find fuzzy match using uFuzzy.js for LLM text variations
	 */
	private findFuzzyMatch(
		searchText: string,
		bodyText: string,
	): FuzzyMatchResult | null {
		try {
			// For Phase 1, use a simpler approach with word-based matching
			// Split text into words and clean up punctuation for better matching
			const searchWords = searchText
				.toLowerCase()
				.trim()
				.split(/\s+/)
				.map((word) => word.replace(/[^\w\s]/g, "").trim()) // Remove punctuation
				.filter((word) => word.length > 0);
			const bodyWords = bodyText
				.toLowerCase()
				.split(/\s+/)
				.map((word) => word.replace(/[^\w\s]/g, "").trim()) // Remove punctuation
				.filter((word) => word.length > 0);

			if (searchWords.length === 0 || bodyWords.length === 0) {
				return null;
			}

			// Before using uFuzzy, try direct word sequence matching
			const searchSequence = searchWords.join(" ");
			const bodySequence = bodyWords.join(" ");
			const directMatchIndex = bodySequence.indexOf(searchSequence);

			if (directMatchIndex !== -1) {
				// Find the corresponding position in the original text
				// For now, use a simple approach: look for the search phrase in the original text
				const originalSearchLower = searchText
					.toLowerCase()
					.replace(/[^\w\s]/g, " ")
					.replace(/\s+/g, " ")
					.trim();
				const originalBodyLower = bodyText.toLowerCase();

				// Search for the closest match in original text
				let bestMatch = null;
				let bestDistance = Number.MAX_SAFE_INTEGER;

				for (
					let i = 0;
					i <= originalBodyLower.length - originalSearchLower.length;
					i++
				) {
					const candidate = originalBodyLower.substring(
						i,
						i + originalSearchLower.length,
					);
					const normalizedCandidate = candidate
						.replace(/[^\w\s]/g, " ")
						.replace(/\s+/g, " ")
						.trim();

					if (normalizedCandidate === originalSearchLower) {
						// Calculate how close this is to our expected position
						const distance = Math.abs(i - directMatchIndex);
						if (distance < bestDistance) {
							bestDistance = distance;
							bestMatch = { start: i, end: i + originalSearchLower.length };
						}
					}
				}

				if (bestMatch) {
					return {
						startIndex: bestMatch.start,
						endIndex: bestMatch.end,
						confidence: 0.95,
						matchedText: bodyText.substring(bestMatch.start, bestMatch.end),
					};
				}
			}

			// Create sliding windows of text to match against
			// Make windows larger to ensure they can contain the full search query + some context
			const windowSize = Math.max(searchWords.length + 2, 6); // Add buffer for context
			const windows: string[] = [];
			const windowPositions: Array<{ start: number; end: number }> = [];

			for (let i = 0; i <= bodyWords.length - windowSize; i++) {
				const window = bodyWords.slice(i, i + windowSize).join(" ");
				windows.push(window);

				// Calculate approximate character positions
				const beforeText = bodyWords.slice(0, i).join(" ");
				const windowText = bodyWords.slice(i, i + windowSize).join(" ");
				const startPos = beforeText.length + (beforeText.length > 0 ? 1 : 0);

				windowPositions.push({
					start: startPos,
					end: startPos + windowText.length,
				});
			}

			if (windows.length === 0) {
				return null;
			}

			// Use uFuzzy to find the best matching window
			const searchQuery = searchWords.join(" ");
			const searchResults = this.ufuzzy.search(windows, searchQuery);

			// uFuzzy search returns [indexes, info, order] or null
			if (
				!searchResults ||
				!searchResults[0] ||
				searchResults[0].length === 0
			) {
				// Try partial matching with individual words
				return this.findPartialWordMatch(searchWords, bodyText);
			}

			// Get the best match (first result is highest ranked)
			const matchIndexes = searchResults[0];
			const bestMatchIndex = matchIndexes[0];
			if (bestMatchIndex === null || bestMatchIndex === undefined) {
				return this.findPartialWordMatch(searchWords, bodyText);
			}

			const windowPos = windowPositions[bestMatchIndex];
			const matchedWindow = windows[bestMatchIndex];

			if (!windowPos) {
				return null;
			}

			// Calculate confidence based on similarity
			const confidence = this.calculateConfidence(searchQuery, matchedWindow);

			return {
				startIndex: windowPos.start,
				endIndex: windowPos.end,
				confidence,
				matchedText: bodyText.substring(windowPos.start, windowPos.end),
			};
		} catch (error) {
			console.warn("Fuzzy matching failed:", error);
			return null;
		}
	}

	/**
	 * Fallback method for partial word matching
	 */
	private findPartialWordMatch(
		searchWords: string[],
		bodyText: string,
	): FuzzyMatchResult | null {
		const bodyLower = bodyText.toLowerCase();

		// First try to find individual words and create a match that encompasses them
		const wordPositions: Array<{
			word: string;
			index: number;
			length: number;
		}> = [];

		for (const word of searchWords) {
			const index = bodyLower.indexOf(word);
			if (index !== -1) {
				wordPositions.push({ word, index, length: word.length });
			}
		}

		// If we found most words, create a span that covers them
		if (wordPositions.length >= Math.ceil(searchWords.length * 0.6)) {
			// Sort by position to find the span
			wordPositions.sort((a, b) => a.index - b.index);

			const firstWord = wordPositions[0];
			const lastWord = wordPositions[wordPositions.length - 1];
			const startIndex = firstWord.index;
			const endIndex = lastWord.index + lastWord.length;
			const confidence = (wordPositions.length / searchWords.length) * 0.75;

			return {
				startIndex,
				endIndex,
				confidence,
				matchedText: bodyText.substring(startIndex, endIndex),
			};
		}

		// Fallback to subsequence matching
		for (
			let i = searchWords.length;
			i >= Math.max(1, searchWords.length * 0.5);
			i--
		) {
			for (let j = 0; j <= searchWords.length - i; j++) {
				const subsequence = searchWords.slice(j, j + i).join(" ");
				const index = bodyLower.indexOf(subsequence);

				if (index !== -1) {
					const confidence = (i / searchWords.length) * 0.7; // Partial match confidence
					return {
						startIndex: index,
						endIndex: index + subsequence.length,
						confidence,
						matchedText: bodyText.substring(index, index + subsequence.length),
					};
				}
			}
		}

		return null;
	}

	/**
	 * Calculate confidence score based on text similarity
	 * Higher scores for closer matches
	 */
	private calculateConfidence(searchText: string, matchedText: string): number {
		if (!searchText || !matchedText) {
			return 0;
		}

		// Exact match after normalization gets highest confidence
		if (searchText.toLowerCase() === matchedText.toLowerCase()) {
			return 0.95;
		}

		// Length similarity factor
		const lengthRatio =
			Math.min(searchText.length, matchedText.length) /
			Math.max(searchText.length, matchedText.length);

		// Character overlap factor (simple approach)
		const searchChars = new Set(searchText.toLowerCase().split(""));
		const matchChars = new Set(matchedText.toLowerCase().split(""));
		const intersection = new Set(
			[...searchChars].filter((c) => matchChars.has(c)),
		);
		const charOverlap =
			intersection.size / Math.max(searchChars.size, matchChars.size);

		// Combined confidence score
		const confidence = lengthRatio * 0.4 + charOverlap * 0.6;

		// Ensure reasonable bounds for fuzzy matches
		return Math.max(0.3, Math.min(0.9, confidence));
	}

	/**
	 * Validate if a match meets the minimum confidence threshold
	 */
	isValidMatch(
		match: FuzzyMatchResult | null,
		minConfidence: number = 0.5,
	): boolean {
		return match !== null && match.confidence >= minConfidence;
	}

	/**
	 * Get match statistics for debugging and optimization
	 */
	getMatchStats(match: FuzzyMatchResult | null): {
		hasMatch: boolean;
		confidence: number;
		matchType: "exact" | "fuzzy" | "none";
	} {
		if (!match) {
			return {
				hasMatch: false,
				confidence: 0,
				matchType: "none",
			};
		}

		return {
			hasMatch: true,
			confidence: match.confidence,
			matchType: match.confidence >= 0.95 ? "exact" : "fuzzy",
		};
	}
}
