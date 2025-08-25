/**
 * Case Sensitivity Tests for Highlighter
 * These tests specifically verify that highlighting works regardless of case differences
 * between search terms and actual page content.
 */

import { beforeEach, describe, expect, test, vi } from "vitest";
import type { GoldenNugget } from "../../shared/types";
import { Highlighter } from "./highlighter";

// Mock design system since it's not available in test environment
vi.mock("../../shared/design-system", () => ({
	colors: {
		highlight: {
			background: "rgba(255, 215, 0, 0.3)",
			border: "rgba(255, 193, 7, 0.6)",
		},
	},
	generateInlineStyles: {
		highlightStyle: () =>
			"background-color: rgba(255, 215, 0, 0.3); border: 1px solid rgba(255, 193, 7, 0.6);",
	},
}));

describe("Highlighter Case Sensitivity Tests", () => {
	let highlighter: Highlighter;

	beforeEach(() => {
		// Set up a clean DOM for each test
		document.body.innerHTML = `
      <div class="content">
        <h1>My Distractibility as an Impediment</h1>
        <p>I've always bemoaned my distractibility as an impediment to deep expertise, 
           but at least it taught me to write well, for all kinds of audiences.</p>
        <p>An unhealthy attachment to determinism will turn out to be a career-limiting hangup.</p>
        <p>The QUICK brown fox jumps over the lazy dog.</p>
        <p>Some text with MIXED Case WordS scattered throughout the paragraph.</p>
      </div>
    `;

		highlighter = new Highlighter();
	});

	describe("Basic Case Insensitive Matching", () => {
		test("should highlight when search term case differs from page content", () => {
			const nugget: GoldenNugget = {
				type: "aha! moments",
				startContent: "my distractibility", // lowercase in search
				endContent: "an impediment", // page has uppercase 'My' and mixed case
			};

			const success = highlighter.highlightNugget(nugget);
			expect(success).toBe(true);
			expect(highlighter.getHighlightCount()).toBe(1);
		});

		test("should highlight when search terms are uppercase", () => {
			const nugget: GoldenNugget = {
				type: "aha! moments",
				startContent: "MY DISTRACTIBILITY", // all uppercase
				endContent: "ALL KINDS OF AUDIENCES", // all uppercase
			};

			const success = highlighter.highlightNugget(nugget);
			expect(success).toBe(true);
			expect(highlighter.getHighlightCount()).toBe(1);
		});

		test("should highlight when page content is uppercase but search is lowercase", () => {
			const nugget: GoldenNugget = {
				type: "aha! moments",
				startContent: "the quick", // lowercase search term
				endContent: "lazy dog", // lowercase search term
			};

			const success = highlighter.highlightNugget(nugget);
			expect(success).toBe(true);
			expect(highlighter.getHighlightCount()).toBe(1);
		});
	});

	describe("Mixed Case Scenarios", () => {
		test("should handle mixed case in both search terms and content", () => {
			const nugget: GoldenNugget = {
				type: "aha! moments",
				startContent: "Some TEXT with", // mixed case
				endContent: "scattered THROUGHOUT", // mixed case
			};

			const success = highlighter.highlightNugget(nugget);
			expect(success).toBe(true);
			expect(highlighter.getHighlightCount()).toBe(1);
		});

		test("should work with title case search on mixed content", () => {
			const nugget: GoldenNugget = {
				type: "aha! moments",
				startContent: "An Unhealthy Attachment", // title case
				endContent: "Career-Limiting Hangup", // title case with hyphen
			};

			const success = highlighter.highlightNugget(nugget);
			expect(success).toBe(true);
			expect(highlighter.getHighlightCount()).toBe(1);
		});
	});

	describe("Real-world Case Sensitivity Bugs", () => {
		test("should highlight the original HackerNews failing case (My vs my)", () => {
			// This test specifically reproduces the original bug report
			const nugget: GoldenNugget = {
				type: "aha! moments",
				startContent: "My distractibility as an impediment", // capital M
				endContent: "all kinds of audiences", // exactly as reported
			};

			const success = highlighter.highlightNugget(nugget);
			expect(success).toBe(true);
			expect(highlighter.getHighlightCount()).toBe(1);
		});

		test("should handle sentence-start capitalization differences", () => {
			// Test where AI might generate text starting with capital but page has it mid-sentence
			document.body.innerHTML = `
        <p>This is some text and my distractibility as an impediment to learning 
           has been documented for all kinds of audiences to see.</p>
      `;

			const nugget: GoldenNugget = {
				type: "aha! moments",
				startContent: "My distractibility as an impediment", // capital M but page has lowercase
				endContent: "all kinds of audiences",
			};

			const success = highlighter.highlightNugget(nugget);
			expect(success).toBe(true);
			expect(highlighter.getHighlightCount()).toBe(1);
		});
	});

	describe("Edge Cases", () => {
		test("should handle acronyms and abbreviations", () => {
			document.body.innerHTML = `
        <p>The CEO of the company said that AI and ML technologies are the future.</p>
      `;

			const nugget: GoldenNugget = {
				type: "aha! moments",
				startContent: "ceo of the company", // lowercase version of CEO
				endContent: "ai and ml technologies", // lowercase version of AI and ML
			};

			const success = highlighter.highlightNugget(nugget);
			expect(success).toBe(true);
			expect(highlighter.getHighlightCount()).toBe(1);
		});

		test("should preserve original text content after highlighting", () => {
			const originalContent = document.body.textContent;

			const nugget: GoldenNugget = {
				type: "aha! moments",
				startContent: "my distractibility",
				endContent: "an impediment",
			};

			highlighter.highlightNugget(nugget);

			// Text content should be preserved (highlighting doesn't change text)
			const afterContent = document.body.textContent;
			expect(afterContent).toBe(originalContent);
		});

		test("should not highlight when text doesn't exist regardless of case", () => {
			const nugget: GoldenNugget = {
				type: "aha! moments",
				startContent: "nonexistent text",
				endContent: "that is not there",
			};

			const success = highlighter.highlightNugget(nugget);
			expect(success).toBe(false);
			expect(highlighter.getHighlightCount()).toBe(0);
		});
	});

	describe("Multiple Highlights with Case Variations", () => {
		test("should handle multiple highlights with different case patterns", () => {
			const nuggets: GoldenNugget[] = [
				{
					type: "aha! moments",
					startContent: "my distractibility", // lowercase
					endContent: "an impediment",
				},
				{
					type: "aha! moments",
					startContent: "THE QUICK", // uppercase
					endContent: "lazy dog",
				},
			];

			let successCount = 0;
			for (const nugget of nuggets) {
				if (highlighter.highlightNugget(nugget)) {
					successCount++;
				}
			}

			expect(successCount).toBe(2);
			expect(highlighter.getHighlightCount()).toBe(2);
		});

		test("should not create duplicate highlights for same text with different cases", () => {
			// Highlight the same text twice with different cases
			const nugget1: GoldenNugget = {
				type: "aha! moments",
				startContent: "my distractibility",
				endContent: "an impediment",
			};

			const nugget2: GoldenNugget = {
				type: "aha! moments",
				startContent: "MY DISTRACTIBILITY", // same text, different case
				endContent: "AN IMPEDIMENT",
			};

			const success1 = highlighter.highlightNugget(nugget1);
			const success2 = highlighter.highlightNugget(nugget2);

			expect(success1).toBe(true);
			expect(success2).toBe(true); // Should return true but not create duplicate
			expect(highlighter.getHighlightCount()).toBe(1); // Only one highlight should exist
		});
	});

	describe("Clear Highlights", () => {
		test("should clear all highlights regardless of case used for creation", () => {
			const nuggets: GoldenNugget[] = [
				{
					type: "aha! moments",
					startContent: "my distractibility",
					endContent: "an impediment",
				},
				{
					type: "aha! moments",
					startContent: "THE QUICK",
					endContent: "lazy dog",
				},
			];

			// Create highlights
			for (const nugget of nuggets) {
				highlighter.highlightNugget(nugget);
			}

			expect(highlighter.getHighlightCount()).toBe(2);

			// Clear all highlights
			highlighter.clearHighlights();
			expect(highlighter.getHighlightCount()).toBe(0);
		});
	});
});
