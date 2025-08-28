import { advancedNormalize } from "../../shared/content-reconstruction";
import type { GoldenNuggetType } from "../../shared/schemas";

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
			// Found exact match, extract boundaries from original text
			const boundaries = this.extractBoundariesFromIndex(
				originalContent,
				index,
				nugget.fullContent.length,
			);

			return {
				type: nugget.type,
				startContent: boundaries.startContent,
				endContent: boundaries.endContent,
				confidence: Math.min(nugget.confidence * 1.0, 1.0), // Keep original confidence for exact matches
				matchMethod: "exact",
			};
		}

		return {
			type: nugget.type,
			startContent: "",
			endContent: "",
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
			// Find word boundaries in original text to extract proper boundaries
			const boundaries = this.extractBoundariesFromWordIndices(
				originalContent,
				bestMatch.startIndex,
				bestMatch.endIndex,
			);

			return {
				type: nugget.type,
				startContent: boundaries.startContent,
				endContent: boundaries.endContent,
				confidence: Math.min(nugget.confidence * bestMatch.confidence, 1.0),
				matchMethod: "fuzzy",
			};
		}

		return {
			type: nugget.type,
			startContent: "",
			endContent: "",
			confidence: 0.0,
			matchMethod: "not_found",
		};
	}

	/**
	 * Calculates similarity between two word arrays using multiple strategies.
	 */
	private calculateWordSimilarity(
		nuggetWords: string[],
		contentWords: string[],
	): number {
		if (nuggetWords.length !== contentWords.length) {
			return 0.0;
		}

		let totalScore = 0;
		for (let i = 0; i < nuggetWords.length; i++) {
			const nuggetWord = nuggetWords[i];
			const contentWord = contentWords[i];

			// Exact match
			if (nuggetWord === contentWord) {
				totalScore += 1.0;
			}
			// Substring match
			else if (
				nuggetWord.includes(contentWord) ||
				contentWord.includes(nuggetWord)
			) {
				totalScore += 0.8;
			}
			// Levenshtein distance match
			else {
				const distance = this.levenshteinDistance(nuggetWord, contentWord);
				const maxLength = Math.max(nuggetWord.length, contentWord.length);
				const similarity = 1.0 - distance / maxLength;
				if (similarity > 0.6) {
					totalScore += similarity * 0.7;
				}
			}
		}

		return totalScore / nuggetWords.length;
	}

	/**
	 * Extracts start and end content boundaries from character index position.
	 */
	private extractBoundariesFromIndex(
		originalContent: string,
		startIndex: number,
		contentLength: number,
	): { startContent: string; endContent: string } {
		// Find actual word boundaries around the matched content
		let actualStart = startIndex;
		let actualEnd = startIndex + contentLength;

		// Adjust start to word boundary
		while (
			actualStart > 0 &&
			!this.isWordBoundary(originalContent, actualStart)
		) {
			actualStart--;
		}

		// Adjust end to word boundary
		while (
			actualEnd < originalContent.length &&
			!this.isWordBoundary(originalContent, actualEnd)
		) {
			actualEnd++;
		}

		const matchedText = originalContent.slice(actualStart, actualEnd);
		const words = matchedText.split(/\s+/).filter((w) => w.length > 0);

		const startWords = words.slice(0, this.options.maxStartWords);
		const endWords = words.slice(-this.options.maxEndWords);

		return {
			startContent: startWords.join(" "),
			endContent: endWords.join(" "),
		};
	}

	/**
	 * Extracts boundaries from word indices in the content.
	 */
	private extractBoundariesFromWordIndices(
		originalContent: string,
		startWordIndex: number,
		endWordIndex: number,
	): { startContent: string; endContent: string } {
		const words = originalContent.split(/\s+/).filter((w) => w.length > 0);

		const startWords = words.slice(
			startWordIndex,
			Math.min(startWordIndex + this.options.maxStartWords, words.length),
		);
		const endWords = words.slice(
			Math.max(endWordIndex - this.options.maxEndWords + 1, 0),
			endWordIndex + 1,
		);

		return {
			startContent: startWords.join(" "),
			endContent: endWords.join(" "),
		};
	}

	/**
	 * Checks if a character position is at a word boundary.
	 */
	private isWordBoundary(text: string, index: number): boolean {
		if (index === 0 || index === text.length) return true;

		const charBefore = text[index - 1];
		const charAt = text[index];

		return (
			/\s/.test(charBefore) ||
			/\s/.test(charAt) ||
			/[.,;:!?]/.test(charBefore) ||
			/[.,;:!?]/.test(charAt)
		);
	}

	/**
	 * Calculates the Levenshtein distance between two strings.
	 */
	private levenshteinDistance(str1: string, str2: string): number {
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
