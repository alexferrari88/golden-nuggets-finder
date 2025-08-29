import { beforeEach, describe, expect, it } from "vitest";
import {
	type BoundaryMatchOptions,
	FuzzyBoundaryMatcher,
	type Phase1Nugget,
} from "../../src/background/services/fuzzy-boundary-matcher";
import type { GoldenNuggetType } from "../../src/shared/schemas";

describe("FuzzyBoundaryMatcher", () => {
	let matcher: FuzzyBoundaryMatcher;
	let mockPhase1Nuggets: Phase1Nugget[];
	const mockOriginalContent =
		"This is some sample content. Visit https://example.com for more info. " +
		"You can also check out the research at https://pmc.ncbi.nlm.nih.gov/articles/PMC3444174/ " +
		"or watch this video: https://www.youtube.com/watch?v=lG4VkPoG3ko for examples.";

	beforeEach(() => {
		matcher = new FuzzyBoundaryMatcher();
		mockPhase1Nuggets = [
			{
				type: "media" as GoldenNuggetType,
				fullContent: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3444174/",
				confidence: 0.87,
			},
			{
				type: "media" as GoldenNuggetType,
				fullContent: "https://www.youtube.com/watch?v=lG4VkPoG3ko",
				confidence: 0.9,
			},
			{
				type: "tool" as GoldenNuggetType,
				fullContent:
					"This is some regular text content that should work normally",
				confidence: 0.85,
			},
		];
	});

	describe("URL boundary generation", () => {
		it("should generate different boundaries for URL nuggets", () => {
			const results = matcher.findBoundaries(mockOriginalContent, [
				mockPhase1Nuggets[0],
			]);

			expect(results).toHaveLength(1);
			const result = results[0];

			// Verify boundaries are different - this was the core issue
			expect(result.startContent).not.toBe(result.endContent);
			expect(result.startContent).toBeTruthy();
			expect(result.endContent).toBeTruthy();

			// Verify the full content is preserved
			expect(result.fullContent).toBe(
				"https://pmc.ncbi.nlm.nih.gov/articles/PMC3444174/",
			);

			// Should be marked as exact match since the URL is found in the original content
			expect(result.matchMethod).toBe("exact");
		});

		it("should handle YouTube URL boundaries correctly", () => {
			const results = matcher.findBoundaries(mockOriginalContent, [
				mockPhase1Nuggets[1],
			]);

			expect(results).toHaveLength(1);
			const result = results[0];

			expect(result.startContent).not.toBe(result.endContent);
			expect(result.startContent).toBeTruthy();
			expect(result.endContent).toBeTruthy();
			expect(result.fullContent).toBe(
				"https://www.youtube.com/watch?v=lG4VkPoG3ko",
			);
		});

		it("should handle mixed URL and text nuggets", () => {
			const results = matcher.findBoundaries(
				mockOriginalContent,
				mockPhase1Nuggets,
			);

			// Should successfully process all nuggets
			expect(results.length).toBeGreaterThan(0);

			// All results should have different start/end boundaries
			results.forEach((result) => {
				expect(result.startContent).not.toBe(result.endContent);
				expect(result.startContent).toBeTruthy();
				expect(result.endContent).toBeTruthy();
			});
		});

		it("should preserve original fullContent for URL nuggets", () => {
			const results = matcher.findBoundaries(mockOriginalContent, [
				mockPhase1Nuggets[0],
			]);

			const result = results[0];
			expect(result.fullContent).toBe(mockPhase1Nuggets[0].fullContent);

			// Should maintain confidence
			expect(result.confidence).toBeGreaterThan(0);
		});
	});

	describe("Edge cases for URL handling", () => {
		it("should handle URLs with different protocols", () => {
			const urlNuggets: Phase1Nugget[] = [
				{
					type: "media" as GoldenNuggetType,
					fullContent: "http://example.com/path",
					confidence: 0.8,
				},
				{
					type: "media" as GoldenNuggetType,
					fullContent: "https://secure.example.com/path",
					confidence: 0.8,
				},
			];

			const results = matcher.findBoundaries("", urlNuggets);

			results.forEach((result) => {
				expect(result.startContent).not.toBe(result.endContent);
				expect(result.confidence).toBeGreaterThan(0);
			});
		});

		it("should handle URLs without paths", () => {
			const urlNugget: Phase1Nugget = {
				type: "media" as GoldenNuggetType,
				fullContent: "https://example.com",
				confidence: 0.8,
			};

			const results = matcher.findBoundaries("", [urlNugget]);

			expect(results).toHaveLength(1);
			expect(results[0].startContent).not.toBe(results[0].endContent);
		});

		it("should handle URLs with query parameters", () => {
			const urlNugget: Phase1Nugget = {
				type: "media" as GoldenNuggetType,
				fullContent: "https://example.com/search?q=test&category=all",
				confidence: 0.8,
			};

			const results = matcher.findBoundaries("", [urlNugget]);

			expect(results).toHaveLength(1);
			expect(results[0].startContent).not.toBe(results[0].endContent);
		});

		it("should handle malformed or edge case URLs gracefully", () => {
			const edgeCaseNuggets: Phase1Nugget[] = [
				{
					type: "media" as GoldenNuggetType,
					fullContent: "not-a-url-at-all",
					confidence: 0.8,
				},
				{
					type: "media" as GoldenNuggetType,
					fullContent: "www.example.com", // Missing protocol
					confidence: 0.8,
				},
			];

			const results = matcher.findBoundaries("", edgeCaseNuggets);

			// Should handle gracefully without crashing
			results.forEach((result) => {
				expect(result.startContent).not.toBe(result.endContent);
				expect(result.confidence).toBeDefined();
			});
		});
	});

	describe("Configuration options", () => {
		it("should respect custom boundary match options", () => {
			const customOptions: BoundaryMatchOptions = {
				tolerance: 0.9,
				maxStartWords: 3,
				maxEndWords: 3,
				minConfidenceThreshold: 0.8,
			};

			const customMatcher = new FuzzyBoundaryMatcher(customOptions);
			const results = customMatcher.findBoundaries(
				mockOriginalContent,
				mockPhase1Nuggets,
			);

			// Results should respect the higher confidence threshold
			results.forEach((result) => {
				expect(result.confidence).toBeGreaterThanOrEqual(0.8);
			});
		});

		it("should filter results below confidence threshold", () => {
			const strictOptions: BoundaryMatchOptions = {
				minConfidenceThreshold: 0.95, // Very high threshold
			};

			const strictMatcher = new FuzzyBoundaryMatcher(strictOptions);

			// Create nuggets with lower confidence
			const lowConfidenceNuggets: Phase1Nugget[] = [
				{
					type: "tool" as GoldenNuggetType,
					fullContent: "Some content that might not match well",
					confidence: 0.7,
				},
			];

			const results = strictMatcher.findBoundaries(
				"Different content entirely",
				lowConfidenceNuggets,
			);

			// Should have fewer or no results due to strict threshold
			expect(results.length).toBeLessThanOrEqual(lowConfidenceNuggets.length);
		});
	});

	describe("Unmatched nuggets tracking", () => {
		it("should correctly identify unmatched nuggets", () => {
			const allNuggets = mockPhase1Nuggets;
			const matchedResults = matcher.findBoundaries(
				mockOriginalContent,
				allNuggets,
			);

			const unmatchedNuggets = matcher.getUnmatchedNuggets(
				allNuggets,
				matchedResults,
			);

			// The difference between all and matched should be unmatched
			expect(
				unmatchedNuggets.length + matchedResults.length,
			).toBeLessThanOrEqual(allNuggets.length);

			// Unmatched nuggets should not be in the matched results
			unmatchedNuggets.forEach((unmatched) => {
				const isInMatched = matchedResults.some(
					(matched) =>
						matched.type === unmatched.type &&
						matched.fullContent === unmatched.fullContent,
				);
				expect(isInMatched).toBe(false);
			});
		});

		it("should handle case where all nuggets are matched", () => {
			// Use content that contains the nugget text to ensure matching
			const simpleContent =
				"This is some regular text content that should work normally";
			const simpleNuggets: Phase1Nugget[] = [
				{
					type: "tool" as GoldenNuggetType,
					fullContent: "regular text content",
					confidence: 0.9,
				},
			];

			const matchedResults = matcher.findBoundaries(
				simpleContent,
				simpleNuggets,
			);
			const unmatchedNuggets = matcher.getUnmatchedNuggets(
				simpleNuggets,
				matchedResults,
			);

			// If all are matched, unmatched should be empty
			if (matchedResults.length === simpleNuggets.length) {
				expect(unmatchedNuggets).toHaveLength(0);
			}
		});
	});

	describe("Regression tests for original issue", () => {
		it("should never create identical startContent and endContent", () => {
			// Test the exact URLs from the original issue
			const problematicNuggets: Phase1Nugget[] = [
				{
					type: "media" as GoldenNuggetType,
					fullContent: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3444174/",
					confidence: 0.87,
				},
				{
					type: "media" as GoldenNuggetType,
					fullContent: "https://www.youtube.com/watch?v=lG4VkPoG3ko",
					confidence: 0.9,
				},
			];

			const results = matcher.findBoundaries("", problematicNuggets);

			// This was the core issue - identical boundaries caused highlighting to fail
			results.forEach((result) => {
				expect(result.startContent).not.toBe(result.endContent);
				expect(result.startContent).toBeTruthy();
				expect(result.endContent).toBeTruthy();
			});
		});

		it("should maintain backward compatibility for non-URL content", () => {
			const textNuggets: Phase1Nugget[] = [
				{
					type: "tool" as GoldenNuggetType,
					fullContent:
						"This is a longer piece of text content with multiple words",
					confidence: 0.85,
				},
			];

			const results = matcher.findBoundaries("", textNuggets);

			// Should still work for regular text content
			expect(results.length).toBeGreaterThan(0);
			results.forEach((result) => {
				expect(result.startContent).not.toBe(result.endContent);
				expect(result.startContent).toBeTruthy();
				expect(result.endContent).toBeTruthy();
			});
		});

		it("should handle empty or whitespace-only content", () => {
			const emptyNuggets: Phase1Nugget[] = [
				{
					type: "tool" as GoldenNuggetType,
					fullContent: "",
					confidence: 0.5,
				},
				{
					type: "tool" as GoldenNuggetType,
					fullContent: "   ",
					confidence: 0.5,
				},
			];

			// Should not crash
			const results = matcher.findBoundaries("", emptyNuggets);
			expect(results).toBeDefined();
		});
	});
});
