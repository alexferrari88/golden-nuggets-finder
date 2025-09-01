/**
 * TextNormalizer - Enhanced text normalization for improved fuzzy matching
 * Handles various text variations common in LLM-generated content and web text
 */

export class TextNormalizer {
	/**
	 * Normalize text for fuzzy matching by standardizing various text variations
	 * This builds upon the existing normalization in the highlighter and adds comprehensive coverage
	 */
	static normalizeForMatching(text: string): string {
		if (!text) {
			return "";
		}

		return (
			text
				// Step 1: Basic quote and spacing normalizations
				.replace(/[""]/g, '"') // Smart quotes to regular quotes
				.replace(/['']/g, "'") // Smart apostrophes to regular apostrophes
				.replace(/([a-zA-Z0-9])\s*\.\s*([a-zA-Z0-9])/g, "$1.$2") // URL spacing

				// Step 2: Ellipsis first (before multiple periods processing)
				.replace(/[…]/g, "...") // Normalize ellipsis to three dots

				// Step 3: Multiple punctuation normalization (after ellipsis)
				.replace(/\.{4,}/g, "...") // Multiple periods (4+) to ellipsis
				.replace(/[!?]{2,}/g, "!") // Multiple exclamation/question marks to single

				// Step 4: Other character normalizations
				.replace(/[‒–—―]/g, "-") // Normalize all dash types to hyphen
				.replace(/[‹›«»]/g, '"') // Normalize fancy quotes to regular quotes
				.replace(/[‚„]/g, '"') // Normalize low quotes to regular quotes
				.replace(/[,;]\s*[,;]/g, ",") // Duplicate commas/semicolons to single comma

				// Step 5: Parentheses and brackets normalization
				.replace(/[（）]/g, (m) => (m === "（" ? "(" : ")")) // Full-width to regular parentheses
				.replace(/[［］]/g, (m) => (m === "［" ? "[" : "]")) // Full-width to regular brackets
				.replace(/[｛｝]/g, (m) => (m === "｛" ? "{" : "}")) // Full-width to regular braces

				// Step 6: Number and symbol normalizations
				.replace(/[０-９]/g, (m) =>
					String.fromCharCode(m.charCodeAt(0) - 65248),
				) // Full-width digits to regular
				.replace(/[Ａ-Ｚａ-ｚ]/g, (m) =>
					String.fromCharCode(m.charCodeAt(0) - 65248),
				) // Full-width letters to regular
				.replace(/[＋－×÷＝]/g, (m) => {
					// Math symbols to ASCII
					const map: Record<string, string> = {
						"＋": "+",
						"－": "-",
						"×": "x",
						"÷": "/",
						"＝": "=",
					};
					return map[m] || m;
				})

				// Step 7: Final punctuation and spacing cleanup
				.replace(/\s*([!?])\s*([!?])\s*/g, "$1$2 ") // Normalize spaced punctuation (excludes periods to preserve ellipsis)
				.replace(/([!?])\1{2,}/g, "$1") // Remove excessive repeated punctuation (excludes periods)
				.replace(/\s+/g, " ") // Collapse all whitespace to single spaces

				// Step 8: Final trim
				.trim()
		);
	}

	/**
	 * Normalize text specifically for display purposes (less aggressive than matching)
	 * Used when we need to show normalized text to users
	 */
	static normalizeForDisplay(text: string): string {
		if (!text) {
			return "";
		}

		return (
			text
				// Only basic normalizations that improve readability
				.replace(/\s+/g, " ") // Collapse whitespace
				.replace(/[""]/g, '"') // Smart quotes
				.replace(/['']/g, "'") // Smart apostrophes
				.replace(/[…]/g, "...") // Ellipsis
				.trim()
		);
	}

	/**
	 * Extract meaningful words for comparison (removes common stop patterns)
	 * Useful for confidence scoring and fuzzy matching quality assessment
	 */
	static extractKeyWords(text: string): string[] {
		const normalized = TextNormalizer.normalizeForMatching(text);

		// Split into words and filter meaningful ones
		const words = normalized
			.toLowerCase()
			.split(/\s+/)
			.map((word) => word.replace(/[^a-z0-9]/g, "")) // Remove all punctuation from words
			.filter((word) => {
				// Remove very short words and common stop words
				return word.length > 2 && !TextNormalizer.isStopWord(word);
			});

		return words;
	}

	/**
	 * Check if a word is a common stop word (less important for matching)
	 */
	private static isStopWord(word: string): boolean {
		const stopWords = new Set([
			"the",
			"and",
			"but",
			"for",
			"are",
			"with",
			"his",
			"they",
			"this",
			"have",
			"from",
			"not",
			"was",
			"you",
			"all",
			"any",
			"can",
			"had",
			"her",
			"what",
			"when",
			"where",
			"who",
			"why",
			"how",
			"that",
			"there",
			"their",
			"then",
			"than",
			"them",
			"these",
			"those",
			"would",
			"could",
			"should",
			"will",
			"also",
			"just",
			"only",
			"very",
			"much",
			"more",
			"most",
			"some",
			"such",
		]);

		return stopWords.has(word.toLowerCase());
	}

	/**
	 * Calculate text similarity based on normalized key words
	 * Returns a score from 0-1 indicating how similar the texts are
	 */
	static calculateSimilarity(text1: string, text2: string): number {
		const words1 = new Set(TextNormalizer.extractKeyWords(text1));
		const words2 = new Set(TextNormalizer.extractKeyWords(text2));

		if (words1.size === 0 && words2.size === 0) {
			return 1.0; // Both empty, consider them similar
		}

		if (words1.size === 0 || words2.size === 0) {
			return 0.0; // One empty, one not
		}

		// Calculate Jaccard similarity
		const intersection = new Set([...words1].filter((w) => words2.has(w)));
		const union = new Set([...words1, ...words2]);

		return intersection.size / union.size;
	}

	/**
	 * Check if two texts are likely the same content after normalization
	 * More aggressive than similarity scoring - used for exact match detection
	 */
	static areTextsEquivalent(
		text1: string,
		text2: string,
		threshold: number = 0.9,
	): boolean {
		const norm1 = TextNormalizer.normalizeForMatching(text1).toLowerCase();
		const norm2 = TextNormalizer.normalizeForMatching(text2).toLowerCase();

		// Exact match after normalization
		if (norm1 === norm2) {
			return true;
		}

		// High similarity with length check
		const similarity = TextNormalizer.calculateSimilarity(text1, text2);
		const lengthRatio =
			Math.min(norm1.length, norm2.length) /
			Math.max(norm1.length, norm2.length);

		return similarity >= threshold && lengthRatio >= 0.8;
	}

	/**
	 * Debug helper: show what normalizations were applied
	 * Useful for understanding why matches succeed or fail
	 */
	static getNormalizationDiff(original: string): {
		original: string;
		normalized: string;
		changes: string[];
	} {
		const changes: string[] = [];
		let current = original;

		// Track each normalization step (matches normalizeForMatching order)
		const steps = [
			{ name: "smart-quotes", regex: /[""]/g, replacement: '"' },
			{ name: "smart-apostrophes", regex: /['']/g, replacement: "'" },
			{
				name: "url-spacing",
				regex: /([a-zA-Z0-9])\s*\.\s*([a-zA-Z0-9])/g,
				replacement: "$1.$2",
			},
			{ name: "ellipsis-normalization", regex: /[…]/g, replacement: "..." },
			{ name: "multiple-periods", regex: /\.{4,}/g, replacement: "..." },
			{ name: "multiple-punctuation", regex: /[!?]{2,}/g, replacement: "!" },
			{ name: "dash-normalization", regex: /[‒–—―]/g, replacement: "-" },
			{ name: "fancy-quotes", regex: /[‹›«»]/g, replacement: '"' },
			{ name: "low-quotes", regex: /[‚„]/g, replacement: '"' },
			{ name: "duplicate-commas", regex: /[,;]\s*[,;]/g, replacement: "," },
			{ name: "whitespace-collapse", regex: /\s+/g, replacement: " " },
		];

		for (const step of steps) {
			const before = current;
			current = current.replace(step.regex, step.replacement);

			if (before !== current) {
				changes.push(step.name);
			}
		}

		return {
			original,
			normalized: current.trim(),
			changes,
		};
	}
}
