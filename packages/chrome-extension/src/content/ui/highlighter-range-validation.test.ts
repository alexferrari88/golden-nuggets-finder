/**
 * Integration Tests for Highlighter Range Validation
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GoldenNugget } from "../../shared/types";
import { Highlighter } from "./highlighter";

// Mock mark.js
vi.mock("mark.js", () => {
	return {
		default: vi.fn().mockImplementation(() => ({
			mark: vi.fn(),
			unmark: vi.fn(),
		})),
	};
});

// Mock AnchorTextMatcher
vi.mock("./anchor-text-matcher", () => ({
	AnchorTextMatcher: vi.fn().mockImplementation(() => ({
		findTextWithContext: vi.fn(),
		isValidMatch: vi.fn(),
	})),
}));

describe("Highlighter Range Validation", () => {
	let highlighter: Highlighter;

	beforeEach(() => {
		// Set up DOM with main content and sidebar
		document.body.innerHTML = `
			<div class="main-content">
				<p>This is main page content with golden nugget text.</p>
			</div>
			<div class="nugget-sidebar">
				<div class="nugget-item">
					<p>This is sidebar content with golden nugget text.</p>
				</div>
			</div>
		`;

		// Reset CSS.highlights if it exists
		if (typeof CSS !== "undefined" && CSS.highlights) {
			CSS.highlights.clear();
		}

		highlighter = new Highlighter();
	});

	describe("Range Validation in Progressive Matching", () => {
		it("should filter out ranges in excluded elements", async () => {
			const mockNugget: GoldenNugget = {
				type: "tool",
				fullContent: "golden nugget text",
				confidence: 0.9,
			};

			// Mock the anchor text matcher to return ranges from both main content and sidebar
			const anchorTextMatcher = (highlighter as any).anchorTextMatcher;

			// Create ranges for both main content and sidebar
			const mainParagraph = document.querySelector(".main-content p");
			const sidebarParagraph = document.querySelector(
				".nugget-sidebar .nugget-item p",
			);

			const mainRange = document.createRange();
			mainRange.selectNodeContents(mainParagraph!);

			const sidebarRange = document.createRange();
			sidebarRange.selectNodeContents(sidebarParagraph!);

			// Mock findTextWithContext to return both ranges
			anchorTextMatcher.findTextWithContext.mockResolvedValue({
				ranges: [mainRange, sidebarRange],
				matchType: "exact",
				confidence: 0.9,
				matchedText: "golden nugget text",
			});

			anchorTextMatcher.isValidMatch.mockReturnValue(true);

			const result = await highlighter.highlightNugget(mockNugget);

			// Should succeed because main content range is valid
			expect(result.success).toBe(true);
			expect(result.ranges.length).toBe(1); // Only main content range should remain
		});

		it("should return failure when all ranges are in excluded elements", async () => {
			const mockNugget: GoldenNugget = {
				type: "tool",
				fullContent: "sidebar content",
				confidence: 0.9,
			};

			// Mock the anchor text matcher to return only sidebar ranges
			const anchorTextMatcher = (highlighter as any).anchorTextMatcher;

			const sidebarParagraph = document.querySelector(
				".nugget-sidebar .nugget-item p",
			);
			const sidebarRange = document.createRange();
			sidebarRange.selectNodeContents(sidebarParagraph!);

			anchorTextMatcher.findTextWithContext.mockResolvedValue({
				ranges: [sidebarRange],
				matchType: "exact",
				confidence: 0.9,
				matchedText: "sidebar content",
			});

			anchorTextMatcher.isValidMatch.mockReturnValue(true);

			const result = await highlighter.highlightNugget(mockNugget);

			// Should fail because all ranges are excluded
			expect(result.success).toBe(false);
			expect(result.ranges.length).toBe(0);
		});

		it("should handle mixed valid and invalid ranges correctly", async () => {
			const mockNugget: GoldenNugget = {
				type: "tool",
				fullContent: "test content",
				confidence: 0.9,
			};

			const anchorTextMatcher = (highlighter as any).anchorTextMatcher;

			// Create one valid range and one invalid range
			const mainParagraph = document.querySelector(".main-content p");
			const sidebarParagraph = document.querySelector(
				".nugget-sidebar .nugget-item p",
			);

			const validRange = document.createRange();
			validRange.selectNodeContents(mainParagraph!);

			const invalidRange = document.createRange();
			// Create an invalid range (malformed)
			// Don't set proper bounds - this should be filtered by basic validation

			const excludedRange = document.createRange();
			excludedRange.selectNodeContents(sidebarParagraph!);

			anchorTextMatcher.findTextWithContext.mockResolvedValue({
				ranges: [validRange, invalidRange, excludedRange],
				matchType: "exact",
				confidence: 0.9,
				matchedText: "test content",
			});

			anchorTextMatcher.isValidMatch.mockReturnValue(true);

			const result = await highlighter.highlightNugget(mockNugget);

			// Should succeed with only the valid range
			expect(result.success).toBe(true);
			expect(result.ranges.length).toBe(1);
			expect(result.ranges[0]).toBe(validRange);
		});
	});

	describe("CSS Highlight API Integration", () => {
		it("should validate ranges before using CSS Highlight API", async () => {
			// Mock CSS Highlight API support
			(global as any).CSS = {
				highlights: new Map(),
			};

			(global as any).window.Highlight = class MockHighlight {
				constructor(...ranges: Range[]) {
					this.ranges = ranges;
				}
				ranges: Range[];
			};

			const mockNugget: GoldenNugget = {
				type: "tool",
				fullContent: "main content",
				confidence: 0.9,
			};

			const anchorTextMatcher = (highlighter as any).anchorTextMatcher;
			const mainParagraph = document.querySelector(".main-content p");
			const validRange = document.createRange();
			validRange.selectNodeContents(mainParagraph!);

			anchorTextMatcher.findTextWithContext.mockResolvedValue({
				ranges: [validRange],
				matchType: "exact",
				confidence: 0.9,
				matchedText: "main content",
			});

			anchorTextMatcher.isValidMatch.mockReturnValue(true);

			const result = await highlighter.highlightNugget(mockNugget);

			expect(result.success).toBe(true);
			expect(result.ranges.length).toBe(1);
		});
	});

	describe("Mark.js Fallback Integration", () => {
		it("should validate ranges in mark.js fallback path", async () => {
			// Mock CSS Highlight API as not supported
			(highlighter as any).cssHighlightSupported = false;

			const mockNugget: GoldenNugget = {
				type: "tool",
				fullContent: "fallback content",
				confidence: 0.9,
			};

			const anchorTextMatcher = (highlighter as any).anchorTextMatcher;
			const mainParagraph = document.querySelector(".main-content p");
			const validRange = document.createRange();
			validRange.selectNodeContents(mainParagraph!);

			anchorTextMatcher.findTextWithContext.mockResolvedValue({
				ranges: [validRange],
				matchType: "exact",
				confidence: 0.9,
				matchedText: "fallback content",
			});

			anchorTextMatcher.isValidMatch.mockReturnValue(true);

			const result = await highlighter.highlightNugget(mockNugget);

			expect(result.success).toBe(true);
			expect(result.ranges.length).toBe(1);
		});
	});

	describe("Error Handling", () => {
		it("should handle range validation errors gracefully", async () => {
			const mockNugget: GoldenNugget = {
				type: "tool",
				fullContent: "error content",
				confidence: 0.9,
			};

			const anchorTextMatcher = (highlighter as any).anchorTextMatcher;

			// Mock an error in findTextWithContext
			anchorTextMatcher.findTextWithContext.mockRejectedValue(
				new Error("Test error"),
			);

			const result = await highlighter.highlightNugget(mockNugget);

			// Should handle error gracefully
			expect(result.success).toBe(false);
			expect(result.ranges.length).toBe(0);
		});

		it("should log filter statistics when ranges are filtered", async () => {
			const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

			const mockNugget: GoldenNugget = {
				type: "tool",
				fullContent: "mixed content",
				confidence: 0.9,
			};

			const anchorTextMatcher = (highlighter as any).anchorTextMatcher;

			// Create ranges that will be filtered (some invalid, some in excluded elements)
			const mainParagraph = document.querySelector(".main-content p");
			const sidebarParagraph = document.querySelector(
				".nugget-sidebar .nugget-item p",
			);

			const validRange = document.createRange();
			validRange.selectNodeContents(mainParagraph!);

			const excludedRange = document.createRange();
			excludedRange.selectNodeContents(sidebarParagraph!);

			anchorTextMatcher.findTextWithContext.mockResolvedValue({
				ranges: [validRange, excludedRange],
				matchType: "exact",
				confidence: 0.9,
				matchedText: "mixed content",
			});

			anchorTextMatcher.isValidMatch.mockReturnValue(true);

			await highlighter.highlightNugget(mockNugget);

			// Should log filtering statistics
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringMatching(/Filtered.*invalid ranges/),
				expect.objectContaining({
					originalCount: 2,
					basicValidCount: 2,
					finalValidCount: 1,
				}),
			);

			consoleSpy.mockRestore();
		});
	});

	describe("Highlight Statistics", () => {
		it("should provide accurate statistics after range validation", () => {
			const stats = highlighter.getHighlightStats();

			expect(stats).toHaveProperty("cssHighlights");
			expect(stats).toHaveProperty("domHighlights");
			expect(stats).toHaveProperty("supported");

			// Values should be numbers
			expect(typeof stats.cssHighlights).toBe("number");
			expect(typeof stats.domHighlights).toBe("number");
			expect(typeof stats.supported).toBe("boolean");
		});
	});

	describe("Cleanup", () => {
		it("should clean up properly after range validation", () => {
			expect(() => {
				highlighter.clearHighlights();
				highlighter.destroy();
			}).not.toThrow();
		});
	});
});
