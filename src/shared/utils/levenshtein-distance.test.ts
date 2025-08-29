import { describe, expect, it } from "vitest";
import {
	isLevenshteinSimilar,
	levenshteinDistance,
	levenshteinSimilarity,
} from "./levenshtein-distance";

describe("levenshteinDistance", () => {
	describe("basic functionality", () => {
		it("should return 0 for identical strings", () => {
			expect(levenshteinDistance("hello", "hello")).toBe(0);
			expect(levenshteinDistance("", "")).toBe(0);
			expect(levenshteinDistance("test", "test")).toBe(0);
		});

		it("should return string length when comparing with empty string", () => {
			expect(levenshteinDistance("", "hello")).toBe(5);
			expect(levenshteinDistance("world", "")).toBe(5);
			expect(levenshteinDistance("", "")).toBe(0);
		});

		it("should calculate correct distance for classic examples", () => {
			// Classic example: kitten -> sitting
			expect(levenshteinDistance("kitten", "sitting")).toBe(3);

			// Single character changes
			expect(levenshteinDistance("cat", "bat")).toBe(1); // substitution
			expect(levenshteinDistance("cat", "cats")).toBe(1); // insertion
			expect(levenshteinDistance("cats", "cat")).toBe(1); // deletion
		});

		it("should handle case sensitivity", () => {
			expect(levenshteinDistance("Hello", "hello")).toBe(1);
			expect(levenshteinDistance("TEST", "test")).toBe(4);
		});
	});

	describe("edge cases", () => {
		it("should handle special characters and numbers", () => {
			expect(levenshteinDistance("hello!", "hello?")).toBe(1);
			expect(levenshteinDistance("123", "124")).toBe(1);
			expect(levenshteinDistance("a@b", "a#b")).toBe(1);
		});

		it("should handle unicode characters", () => {
			expect(levenshteinDistance("café", "cafe")).toBe(1);
			expect(levenshteinDistance("🐱", "🐶")).toBe(1);
		});

		it("should handle very different strings", () => {
			expect(levenshteinDistance("abc", "xyz")).toBe(3);
			expect(levenshteinDistance("hello", "world")).toBe(4);
		});
	});

	describe("performance and consistency", () => {
		it("should be symmetric (distance(a,b) == distance(b,a))", () => {
			const pairs = [
				["hello", "world"],
				["kitten", "sitting"],
				["test", "best"],
				["", "abc"],
			];

			for (const [str1, str2] of pairs) {
				expect(levenshteinDistance(str1, str2)).toBe(
					levenshteinDistance(str2, str1),
				);
			}
		});

		it("should handle reasonably long strings", () => {
			const str1 = "This is a reasonably long string for testing";
			const str2 = "This was a reasonably long string for testing";
			expect(levenshteinDistance(str1, str2)).toBe(2); // "is" -> "was"
		});
	});

	describe("validation against known results", () => {
		// Test cases that match the original implementations
		it("should match original fuzzy-boundary-matcher results", () => {
			// These are typical word comparisons from the boundary matcher
			expect(levenshteinDistance("hello", "helo")).toBe(1);
			expect(levenshteinDistance("world", "word")).toBe(1);
			expect(levenshteinDistance("testing", "test")).toBe(3);
		});
	});
});

describe("levenshteinSimilarity", () => {
	describe("similarity scoring", () => {
		it("should return 1.0 for identical strings", () => {
			expect(levenshteinSimilarity("hello", "hello")).toBe(1.0);
			expect(levenshteinSimilarity("", "")).toBe(1.0);
		});

		it("should return 0.0 for completely different strings of same length", () => {
			expect(levenshteinSimilarity("abc", "xyz")).toBe(0.0);
		});

		it("should calculate correct similarity scores", () => {
			// 1 edit in 5 characters = 0.8 similarity
			expect(levenshteinSimilarity("hello", "helo")).toBe(0.8);

			// 1 edit in 4 characters = 0.75 similarity
			expect(levenshteinSimilarity("test", "best")).toBe(0.75);

			// 2 edits in 4 characters = 0.5 similarity
			expect(levenshteinSimilarity("test", "best")).toBe(0.75);
		});

		it("should handle different length strings correctly", () => {
			// Distance 1, max length 5 = similarity 0.8
			expect(levenshteinSimilarity("test", "tests")).toBe(0.8);

			// Distance 4, max length 5 = similarity 0.2
			expect(levenshteinSimilarity("hi", "hello")).toBeCloseTo(0.2, 10);
		});
	});

	describe("edge cases", () => {
		it("should handle empty strings", () => {
			expect(levenshteinSimilarity("", "")).toBe(1.0);
			expect(levenshteinSimilarity("", "abc")).toBe(0.0);
			expect(levenshteinSimilarity("abc", "")).toBe(0.0);
		});
	});
});

describe("isLevenshteinSimilar", () => {
	describe("threshold testing", () => {
		it("should use default threshold of 0.8", () => {
			expect(isLevenshteinSimilar("hello", "helo")).toBe(true); // 0.8 similarity
			expect(isLevenshteinSimilar("hello", "help")).toBe(false); // 0.6 similarity
		});

		it("should respect custom thresholds", () => {
			expect(isLevenshteinSimilar("hello", "help", 0.6)).toBe(true);
			expect(isLevenshteinSimilar("hello", "help", 0.7)).toBe(false);
		});

		it("should handle edge threshold values", () => {
			expect(isLevenshteinSimilar("test", "test", 1.0)).toBe(true);
			expect(isLevenshteinSimilar("abc", "xyz", 0.0)).toBe(true);
			expect(isLevenshteinSimilar("abc", "xyz", 0.1)).toBe(false);
		});
	});

	describe("practical use cases", () => {
		it("should handle typos and minor differences", () => {
			// Common typos should be similar with appropriate threshold
			expect(isLevenshteinSimilar("receive", "recieve", 0.7)).toBe(true);
			expect(isLevenshteinSimilar("definite", "definate", 0.7)).toBe(true);

			// Single character typos should be similar with high threshold
			expect(isLevenshteinSimilar("hello", "helo", 0.8)).toBe(true);
			expect(isLevenshteinSimilar("world", "word", 0.8)).toBe(true);
		});

		it("should reject very different words", () => {
			expect(isLevenshteinSimilar("hello", "goodbye", 0.8)).toBe(false);
			expect(isLevenshteinSimilar("cat", "elephant", 0.8)).toBe(false);
		});
	});
});
