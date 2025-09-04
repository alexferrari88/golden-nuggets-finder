/**
 * Tests for TextMatcher - Fuzzy text matching with uFuzzy.js
 */

import { beforeEach, describe, expect, it } from "vitest";
import { TextMatcher } from "./text-matcher";

describe("TextMatcher", () => {
	let textMatcher: TextMatcher;

	beforeEach(() => {
		textMatcher = new TextMatcher();
	});

	describe("findBestMatch", () => {
		it("should find exact matches with perfect confidence", () => {
			const searchText = "This is a test sentence";
			const bodyText =
				"Here is some text. This is a test sentence. More text here.";

			const match = textMatcher.findBestMatch(searchText, bodyText);

			expect(match).toBeTruthy();
			expect(match!.confidence).toBeCloseTo(1.0, 1);
			expect(match!.matchedText).toBe(searchText);
			expect(match!.startIndex).toBeGreaterThanOrEqual(0);
			expect(match!.endIndex).toBeGreaterThan(match!.startIndex);
		});

		it("should handle case-insensitive matches", () => {
			const searchText = "IMPORTANT INFORMATION";
			const bodyText = "This contains important information about the topic.";

			const match = textMatcher.findBestMatch(searchText, bodyText);

			expect(match).toBeTruthy();
			expect(match!.confidence).toBeCloseTo(1.0, 1);
			expect(match!.matchedText.toLowerCase()).toBe(searchText.toLowerCase());
		});

		it("should find fuzzy matches with punctuation variations", () => {
			const searchText = "What is the best approach?";
			const bodyText =
				'The user asked: "What is the best approach." The answer is complex.';

			const match = textMatcher.findBestMatch(searchText, bodyText);

			expect(match).toBeTruthy();
			expect(match!.confidence).toBeGreaterThan(0.5);
			expect(match!.matchedText).toContain("What is the best approach");
		});

		it("should find fuzzy matches with spacing variations", () => {
			const searchText = "pmc.ncbi.nlm.nih.gov";
			const bodyText = "Visit pmc. ncbi. nlm. nih. gov for more information.";

			const match = textMatcher.findBestMatch(searchText, bodyText);

			expect(match).toBeTruthy();
			expect(match!.confidence).toBeGreaterThan(0.5);
			expect(match!.matchedText).toContain("pmc");
			expect(match!.matchedText).toContain("ncbi");
		});

		it("should find matches in longer texts", () => {
			const searchText = "machine learning algorithms";
			const bodyText = `
				Artificial intelligence has transformed many industries. 
				Machine learning algorithms are particularly effective at 
				pattern recognition and data analysis tasks.
				These technologies continue to evolve rapidly.
			`;

			const match = textMatcher.findBestMatch(searchText, bodyText);

			expect(match).toBeTruthy();
			expect(match!.confidence).toBeGreaterThan(0.7);
			expect(match!.matchedText.toLowerCase()).toContain(
				"machine learning algorithms",
			);
		});

		it("should return null for non-existent text", () => {
			const searchText = "completely unrelated content";
			const bodyText = "This text does not contain what we are looking for.";

			const match = textMatcher.findBestMatch(searchText, bodyText);

			expect(match).toBeNull();
		});

		it("should handle empty inputs gracefully", () => {
			expect(textMatcher.findBestMatch("", "some text")).toBeNull();
			expect(textMatcher.findBestMatch("some text", "")).toBeNull();
			expect(textMatcher.findBestMatch("", "")).toBeNull();
		});

		it("should find partial matches with reasonable confidence", () => {
			const searchText = "machine learning algorithms";
			const bodyText =
				"The article discusses machine learning algorithms that are very effective.";

			const match = textMatcher.findBestMatch(searchText, bodyText);

			expect(match).toBeTruthy();
			expect(match!.confidence).toBeGreaterThan(0.3);
			expect(match!.confidence).toBeLessThanOrEqual(1.0);
		});

		it("should handle special characters and symbols", () => {
			const searchText = "API endpoint: /api/v1/users";
			const bodyText =
				"The main API endpoint: /api/v1/users handles user operations.";

			const match = textMatcher.findBestMatch(searchText, bodyText);

			expect(match).toBeTruthy();
			expect(match!.confidence).toBeGreaterThan(0.8);
			expect(match!.matchedText).toContain("/api/v1/users");
		});
	});

	describe("isValidMatch", () => {
		it("should validate matches above minimum confidence", () => {
			const validMatch = {
				startIndex: 0,
				endIndex: 10,
				confidence: 0.8,
				matchedText: "test text",
			};

			expect(textMatcher.isValidMatch(validMatch, 0.5)).toBe(true);
			expect(textMatcher.isValidMatch(validMatch, 0.9)).toBe(false);
		});

		it("should reject null matches", () => {
			expect(textMatcher.isValidMatch(null, 0.5)).toBe(false);
		});

		it("should use default confidence threshold", () => {
			const lowConfidenceMatch = {
				startIndex: 0,
				endIndex: 10,
				confidence: 0.3,
				matchedText: "test text",
			};

			expect(textMatcher.isValidMatch(lowConfidenceMatch)).toBe(false);
		});
	});

	describe("getMatchStats", () => {
		it("should return correct stats for valid matches", () => {
			const exactMatch = {
				startIndex: 0,
				endIndex: 10,
				confidence: 0.95,
				matchedText: "test text",
			};

			const stats = textMatcher.getMatchStats(exactMatch);

			expect(stats.hasMatch).toBe(true);
			expect(stats.confidence).toBe(0.95);
			expect(stats.matchType).toBe("exact");
		});

		it("should classify fuzzy matches correctly", () => {
			const fuzzyMatch = {
				startIndex: 0,
				endIndex: 10,
				confidence: 0.7,
				matchedText: "test text",
			};

			const stats = textMatcher.getMatchStats(fuzzyMatch);

			expect(stats.hasMatch).toBe(true);
			expect(stats.confidence).toBe(0.7);
			expect(stats.matchType).toBe("fuzzy");
		});

		it("should handle null matches", () => {
			const stats = textMatcher.getMatchStats(null);

			expect(stats.hasMatch).toBe(false);
			expect(stats.confidence).toBe(0);
			expect(stats.matchType).toBe("none");
		});
	});

	describe("LLM text variations", () => {
		it("should handle quote variations", () => {
			const searchText = 'He said "Hello world"';
			const bodyText = 'He said "Hello world" to everyone.';

			const match = textMatcher.findBestMatch(searchText, bodyText);

			expect(match).toBeTruthy();
			expect(match!.confidence).toBeGreaterThan(0.8);
		});

		it("should handle apostrophe variations", () => {
			const searchText = "It's a great idea";
			const bodyText = "It's a great idea for the project.";

			const match = textMatcher.findBestMatch(searchText, bodyText);

			expect(match).toBeTruthy();
			expect(match!.confidence).toBeGreaterThan(0.8);
		});

		it("should handle dash and ellipsis variations", () => {
			const searchText = "The main point is this...";
			const bodyText = "The main point is this… we need more data.";

			const match = textMatcher.findBestMatch(searchText, bodyText);

			expect(match).toBeTruthy();
			expect(match!.confidence).toBeGreaterThan(0.7);
		});

		it("should handle whitespace normalization", () => {
			const searchText = "This  is    spaced   text";
			const bodyText = "This is spaced text in the document.";

			const match = textMatcher.findBestMatch(searchText, bodyText);

			expect(match).toBeTruthy();
			expect(match!.confidence).toBeGreaterThan(0.8);
		});
	});

	describe("Performance and edge cases", () => {
		it("should handle very long texts efficiently", () => {
			const searchText = "needle in a haystack";
			const largeText =
				"Lorem ipsum ".repeat(1000) +
				searchText +
				" dolor sit amet".repeat(500);

			const startTime = performance.now();
			const match = textMatcher.findBestMatch(searchText, largeText);
			const endTime = performance.now();

			expect(match).toBeTruthy();
			expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
		});

		it("should handle short texts", () => {
			const searchText = "yes";
			const bodyText = "yes";

			const match = textMatcher.findBestMatch(searchText, bodyText);

			expect(match).toBeTruthy();
			expect(match!.confidence).toBeCloseTo(1.0, 1);
		});

		it("should handle texts with overlapping content", () => {
			const searchText = "test test test";
			const bodyText = "This is test test test content for testing.";

			const match = textMatcher.findBestMatch(searchText, bodyText);

			expect(match).toBeTruthy();
			expect(match!.confidence).toBeGreaterThan(0.8);
		});

		it("should prioritize exact matches over fuzzy matches", () => {
			const searchText = "exact match";
			const bodyText =
				"This has an exact match and also inexact mitch content.";

			const match = textMatcher.findBestMatch(searchText, bodyText);

			expect(match).toBeTruthy();
			expect(match!.confidence).toBeCloseTo(1.0, 1);
			expect(match!.matchedText).toBe("exact match");
		});
	});
});
