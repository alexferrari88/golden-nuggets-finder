import { describe, expect, it } from "vitest";
import {
	areWordsSimilar,
	calculateSimpleWordSimilarity,
	calculateTextSimilarity,
	calculateWordSimilarity,
	DEFAULT_WORD_SIMILARITY_OPTIONS,
	type WordSimilarityOptions,
} from "./word-similarity";

describe("calculateWordSimilarity", () => {
	describe("basic functionality", () => {
		it("should return 1.0 for identical word arrays", () => {
			expect(calculateWordSimilarity(["hello"], ["hello"])).toBe(1.0);
			expect(
				calculateWordSimilarity(["hello", "world"], ["hello", "world"]),
			).toBe(1.0);
			expect(calculateWordSimilarity([], [])).toBe(1.0);
		});

		it("should return 0.0 for different length arrays", () => {
			expect(calculateWordSimilarity(["hello"], ["hello", "world"])).toBe(0.0);
			expect(calculateWordSimilarity([], ["hello"])).toBe(0.0);
			expect(calculateWordSimilarity(["a", "b"], ["a"])).toBe(0.0);
		});

		it("should handle empty arrays correctly", () => {
			expect(calculateWordSimilarity([], [])).toBe(1.0);
		});
	});

	describe("exact matching", () => {
		it("should give full score for exact matches", () => {
			const result = calculateWordSimilarity(["test"], ["test"]);
			expect(result).toBe(1.0);
		});

		it("should be case sensitive for exact matches", () => {
			const result = calculateWordSimilarity(["Test"], ["test"]);
			// Should fall back to Levenshtein or substring matching
			expect(result).toBeLessThan(1.0);
		});
	});

	describe("substring matching", () => {
		it("should give substring score for partial matches", () => {
			const result = calculateWordSimilarity(["hello"], ["hel"]);
			expect(result).toBe(DEFAULT_WORD_SIMILARITY_OPTIONS.substringMatchScore);
		});

		it("should work both ways (word1 contains word2, word2 contains word1)", () => {
			const result1 = calculateWordSimilarity(["hello"], ["hel"]);
			const result2 = calculateWordSimilarity(["hel"], ["hello"]);
			expect(result1).toBe(result2);
			expect(result1).toBe(0.8);
		});

		it("should handle multiple word substring matching", () => {
			const result = calculateWordSimilarity(
				["hello", "world"],
				["hel", "wor"],
			);
			expect(result).toBe(0.8); // Both words are substring matches
		});
	});

	describe("levenshtein matching", () => {
		it("should use Levenshtein distance for similar words", () => {
			// "hello" vs "helo" - 1 edit, similarity = 0.8, score = 0.8 * 0.7 = 0.56
			const result = calculateWordSimilarity(["hello"], ["helo"]);
			expect(result).toBeCloseTo(0.56, 2);
		});

		it("should not score very different words", () => {
			// Words with low Levenshtein similarity should get 0 score
			const result = calculateWordSimilarity(["hello"], ["xyz"]);
			expect(result).toBe(0.0);
		});

		it("should respect Levenshtein threshold", () => {
			// With high threshold, should reject marginal matches
			const options: Partial<WordSimilarityOptions> = {
				levenshteinThreshold: 0.9,
			};
			const result = calculateWordSimilarity(["hello"], ["helo"], options);
			expect(result).toBe(0.0); // 0.8 similarity is below 0.9 threshold
		});
	});

	describe("mixed matching strategies", () => {
		it("should average scores across multiple words", () => {
			// ["hello", "world"] vs ["hello", "wor"]
			// "hello" = exact match (1.0)
			// "world" vs "wor" = substring match (0.8)
			// Average = (1.0 + 0.8) / 2 = 0.9
			const result = calculateWordSimilarity(
				["hello", "world"],
				["hello", "wor"],
			);
			expect(result).toBe(0.9);
		});

		it("should handle mix of all three strategies", () => {
			// Test exact + substring + Levenshtein in one call
			const result = calculateWordSimilarity(
				["exact", "substring", "similar"],
				["exact", "sub", "similer"], // exact, substring, Levenshtein
			);

			// exact = 1.0, substring = 0.8, similar->similer ≈ 0.56
			// Average = (1.0 + 0.8 + 0.56) / 3 ≈ 0.79
			expect(result).toBeGreaterThan(0.7);
			expect(result).toBeLessThan(0.85);
		});
	});

	describe("custom options", () => {
		it("should respect custom scoring options", () => {
			const customOptions: Partial<WordSimilarityOptions> = {
				exactMatchScore: 2.0,
				substringMatchScore: 1.5,
			};

			const result = calculateWordSimilarity(["hello"], ["hel"], customOptions);
			expect(result).toBe(1.5); // Custom substring score
		});

		it("should allow disabling Levenshtein matching", () => {
			const options: Partial<WordSimilarityOptions> = {
				levenshteinScoreMultiplier: 0.0,
			};

			const result = calculateWordSimilarity(["hello"], ["helo"], options);
			expect(result).toBe(0.0); // No Levenshtein scoring
		});
	});
});

describe("calculateSimpleWordSimilarity", () => {
	it("should only use exact and substring matching", () => {
		// This should return 0 because it doesn't use Levenshtein
		const result = calculateSimpleWordSimilarity(["hello"], ["helo"]);
		expect(result).toBe(0.0);
	});

	it("should work for exact matches", () => {
		const result = calculateSimpleWordSimilarity(["hello"], ["hello"]);
		expect(result).toBe(1.0);
	});

	it("should work for substring matches", () => {
		const result = calculateSimpleWordSimilarity(["hello"], ["hel"]);
		expect(result).toBe(0.8);
	});

	it("should respect custom substring score", () => {
		const result = calculateSimpleWordSimilarity(["hello"], ["hel"], 0.5);
		expect(result).toBe(0.5);
	});
});

describe("areWordsSimilar", () => {
	describe("threshold testing", () => {
		it("should use default threshold of 0.7", () => {
			// Should pass default threshold
			expect(areWordsSimilar(["hello", "world"], ["hello", "wor"])).toBe(true); // 0.9 > 0.7

			// Should fail default threshold
			expect(areWordsSimilar(["hello"], ["xyz"])).toBe(false); // 0.0 < 0.7
		});

		it("should respect custom thresholds", () => {
			expect(areWordsSimilar(["hello"], ["hel"], 0.9)).toBe(false); // 0.8 < 0.9
			expect(areWordsSimilar(["hello"], ["hel"], 0.7)).toBe(true); // 0.8 > 0.7
		});
	});

	describe("practical scenarios", () => {
		it("should identify similar phrases", () => {
			expect(
				areWordsSimilar(["machine", "learning"], ["machine", "learn"]),
			).toBe(true);
		});

		it("should reject very different phrases", () => {
			expect(areWordsSimilar(["hello", "world"], ["goodbye", "universe"])).toBe(
				false,
			);
		});
	});
});

describe("calculateTextSimilarity", () => {
	describe("text processing", () => {
		it("should split text into words automatically", () => {
			const result = calculateTextSimilarity("hello world", "hello wor");
			expect(result).toBe(0.9); // Same as word array version
		});

		it("should handle extra whitespace", () => {
			const result1 = calculateTextSimilarity("hello  world", "hello world");
			const result2 = calculateTextSimilarity("hello\tworld", "hello world");
			expect(result1).toBe(1.0);
			expect(result2).toBe(1.0);
		});

		it("should filter empty words", () => {
			const result = calculateTextSimilarity("hello  world", "hello world");
			expect(result).toBe(1.0);
		});
	});

	describe("integration with word similarity", () => {
		it("should produce same results as word array version", () => {
			const textResult = calculateTextSimilarity("hello world", "hello wor");
			const wordResult = calculateWordSimilarity(
				["hello", "world"],
				["hello", "wor"],
			);
			expect(textResult).toBe(wordResult);
		});

		it("should respect custom options", () => {
			const options: Partial<WordSimilarityOptions> = {
				substringMatchScore: 0.5,
			};

			const result = calculateTextSimilarity("hello world", "hel wor", options);
			expect(result).toBe(0.5); // Both are substring matches with custom score
		});
	});
});

describe("DEFAULT_WORD_SIMILARITY_OPTIONS", () => {
	it("should have expected default values", () => {
		expect(DEFAULT_WORD_SIMILARITY_OPTIONS.exactMatchScore).toBe(1.0);
		expect(DEFAULT_WORD_SIMILARITY_OPTIONS.substringMatchScore).toBe(0.8);
		expect(DEFAULT_WORD_SIMILARITY_OPTIONS.levenshteinScoreMultiplier).toBe(
			0.7,
		);
		expect(DEFAULT_WORD_SIMILARITY_OPTIONS.levenshteinThreshold).toBe(0.6);
	});
});

describe("edge cases and error handling", () => {
	it("should handle single character words", () => {
		expect(calculateWordSimilarity(["a"], ["a"])).toBe(1.0);
		expect(calculateWordSimilarity(["a"], ["b"])).toBe(0.0);
	});

	it("should handle numeric strings", () => {
		expect(calculateWordSimilarity(["123"], ["123"])).toBe(1.0);
		expect(calculateWordSimilarity(["123"], ["12"])).toBe(0.8);
	});

	it("should handle special characters", () => {
		expect(calculateWordSimilarity(["hello!"], ["hello?"])).toBeGreaterThan(
			0.5,
		);
	});
});
