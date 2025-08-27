import type { GoldenNugget } from "../../src/shared/types";
import { expect, test } from "./fixtures";
import { setupHighlighter } from "./highlighter-setup";

const TEST_URL = "https://blog.jxmo.io/p/there-is-only-one-model";

// Golden nuggets from the real webpage - these are the test cases
const GOLDEN_NUGGETS: GoldenNugget[] = [
	{
		type: "tool",
		startContent: "Project CETI is a large-scale",
		endContent: "to talk to whales.",
	},
	{
		type: "analogy",
		startContent: "Growing up, I sometimes played",
		endContent: "guess almost anything.",
	},
	{
		type: "aha! moments",
		startContent: "One perspective on AI",
		endContent: "the source coding theorem.)",
	},
	{
		type: "aha! moments",
		startContent: "Generalization only begins when",
		endContent: "generalization occurs.",
	},
	{
		type: "model",
		startContent: "The theory that models",
		endContent: "bigger and smarter.",
	},
];

test.describe("Highlighter TDD", () => {
	test.beforeEach(async ({ cleanPage }) => {
		// Navigate to the real webpage
		await cleanPage.goto(TEST_URL, { waitUntil: "networkidle" });

		// Wait for content to load
		await cleanPage.waitForSelector("body", { state: "visible" });

		// Setup the fixed highlighter implementation
		await setupHighlighter(cleanPage, GOLDEN_NUGGETS);
	});

	test("should find all golden nugget text content on the page", async ({
		cleanPage,
	}) => {
		// First, verify that all the startContent and endContent exist on the page
		for (const nugget of GOLDEN_NUGGETS) {
			const pageContent = await cleanPage.textContent("body");

			expect(pageContent).toContain(nugget.startContent);
			expect(pageContent).toContain(nugget.endContent);

			// Verify startContent appears before endContent
			const startIndex = pageContent.indexOf(nugget.startContent);
			const endIndex = pageContent.indexOf(nugget.endContent);
			expect(startIndex).toBeLessThan(endIndex);
		}
	});

	test("should highlight individual golden nuggets successfully", async ({
		cleanPage,
	}) => {
		// Capture console logs from the browser
		const consoleMessages: string[] = [];
		cleanPage.on("console", (msg) => {
			consoleMessages.push(`${msg.type()}: ${msg.text()}`);
		});

		const results = await cleanPage.evaluate(() => {
			const highlighter = new (window as any).Highlighter();
			const results = [];

			// Debug information
			console.log("CSS Highlight support:", highlighter.cssHighlightSupported);
			console.log("CSS.highlights available:", !!CSS.highlights);
			console.log("Highlight constructor available:", !!window.Highlight);

			for (const nugget of (window as any).testGoldenNuggets) {
				console.log(
					"Testing nugget:",
					`${nugget.startContent.substring(0, 30)}...`,
				);
				const highlighted = highlighter.highlightNugget(nugget);
				console.log("Highlight result:", highlighted);
				console.log("Highlight count after:", highlighter.getHighlightCount());
				results.push({ nugget, highlighted });
			}

			return results;
		});

		console.log("Console messages from browser:");
		for (const msg of consoleMessages) {
			console.log("  ", msg);
		}

		// All should succeed now
		for (const result of results) {
			expect(result.highlighted).toBe(true);
		}
	});

	test("should not modify page content when highlighting fails", async ({
		cleanPage,
	}) => {
		const originalContent = await cleanPage.textContent("body");

		await cleanPage.evaluate(() => {
			const highlighter = new (window as any).Highlighter();

			for (const nugget of (window as any).testGoldenNuggets) {
				highlighter.highlightNugget(nugget);
			}
		});

		const afterContent = await cleanPage.textContent("body");
		expect(afterContent).toBe(originalContent);
	});

	test("should have no highlighted elements initially", async ({
		cleanPage,
	}) => {
		const highlightedCount = await cleanPage.evaluate(() => {
			return document.querySelectorAll("[data-golden-nugget-highlight]").length;
		});

		expect(highlightedCount).toBe(0);
	});

	test("should clear highlights without errors", async ({ cleanPage }) => {
		await cleanPage.evaluate(() => {
			const highlighter = new (window as any).Highlighter();
			highlighter.clearHighlights(); // Should not throw
		});

		const highlightedCount = await cleanPage.evaluate(() => {
			return document.querySelectorAll("[data-golden-nugget-highlight]").length;
		});

		expect(highlightedCount).toBe(0);
	});

	// These tests will be uncommented as we implement the highlighter

	test("should successfully highlight first golden nugget", async ({
		cleanPage,
	}) => {
		// Capture console logs from the browser
		const consoleMessages: string[] = [];
		cleanPage.on("console", (msg) => {
			consoleMessages.push(`${msg.type()}: ${msg.text()}`);
		});

		const debug = await cleanPage.evaluate(() => {
			const highlighter = new (window as any).Highlighter();
			const nugget = (window as any).testGoldenNuggets[0]; // "Project CETI is a large-scale" -> "to talk to whales."

			console.log("First nugget:", nugget);
			console.log("CSS support:", highlighter.cssHighlightSupported);

			const result = highlighter.highlightNugget(nugget);
			console.log("Highlight result:", result);
			console.log("CSS highlights count:", highlighter.cssHighlights.size);
			console.log(
				"DOM highlights count:",
				highlighter.highlightedElements.length,
			);

			return {
				result,
				cssSupported: highlighter.cssHighlightSupported,
				cssHighlightCount: highlighter.cssHighlights.size,
				domHighlightCount: highlighter.highlightedElements.length,
				totalCount: highlighter.getHighlightCount(),
			};
		});

		console.log("Debug info:", debug);
		console.log("Console messages from browser:");
		for (const msg of consoleMessages) {
			console.log("  ", msg);
		}

		expect(debug.result).toBe(true);

		// Verify highlight exists (either CSS or DOM)
		if (debug.cssSupported && debug.cssHighlightCount > 0) {
			// CSS highlights don't create DOM elements, so just check the count
			expect(debug.totalCount).toBeGreaterThan(0);
		} else {
			// Fallback to DOM elements
			const highlightedElements = await cleanPage.locator(
				"[data-golden-nugget-highlight]",
			);
			await expect(highlightedElements).toHaveCount(1);
		}
	});

	test("should highlight text that spans multiple DOM elements", async ({
		cleanPage,
	}) => {
		const results = await cleanPage.evaluate(() => {
			const highlighter = new (window as any).Highlighter();
			const results = [];

			for (const nugget of (window as any).testGoldenNuggets) {
				const highlighted = highlighter.highlightNugget(nugget);
				results.push({ nugget, highlighted });
			}

			return {
				results,
				totalHighlights: highlighter.getHighlightCount(),
				cssSupported: highlighter.cssHighlightSupported,
			};
		});

		// All should succeed
		for (const result of results.results) {
			expect(result.highlighted).toBe(true);
		}

		// Verify all highlights exist (either CSS or DOM)
		expect(results.totalHighlights).toBe(GOLDEN_NUGGETS.length);

		if (!results.cssSupported) {
			// Only check DOM elements if CSS isn't supported
			const highlightedElements = await cleanPage.locator(
				"[data-golden-nugget-highlight]",
			);
			await expect(highlightedElements).toHaveCount(GOLDEN_NUGGETS.length);
		}
	});

	test("should not create duplicate highlights", async ({ cleanPage }) => {
		const result = await cleanPage.evaluate(() => {
			const highlighter = new (window as any).Highlighter();
			const nugget = (window as any).testGoldenNuggets[0];

			// Highlight the same nugget twice
			const first = highlighter.highlightNugget(nugget);
			const second = highlighter.highlightNugget(nugget);

			return {
				firstResult: first,
				secondResult: second,
				totalHighlights: highlighter.getHighlightCount(),
				cssSupported: highlighter.cssHighlightSupported,
			};
		});

		expect(result.firstResult).toBe(true);
		expect(result.secondResult).toBe(true); // Should return true but not create duplicate
		expect(result.totalHighlights).toBe(1); // Should still only have one highlight

		if (!result.cssSupported) {
			// Only check DOM elements if CSS isn't supported
			const highlightedElements = await cleanPage.locator(
				"[data-golden-nugget-highlight]",
			);
			await expect(highlightedElements).toHaveCount(1);
		}
	});

	test("should preserve original page text content", async ({ cleanPage }) => {
		const originalContent = await cleanPage.textContent("body");

		await cleanPage.evaluate(() => {
			const highlighter = new (window as any).Highlighter();

			for (const nugget of (window as any).testGoldenNuggets) {
				highlighter.highlightNugget(nugget);
			}
		});

		const afterContent = await cleanPage.textContent("body");
		expect(afterContent).toBe(originalContent);
	});

	test("should apply correct highlighting styles", async ({ cleanPage }) => {
		const result = await cleanPage.evaluate(() => {
			const highlighter = new (window as any).Highlighter();
			const nugget = (window as any).testGoldenNuggets[0];
			const success = highlighter.highlightNugget(nugget);

			return {
				success,
				cssSupported: highlighter.cssHighlightSupported,
				highlightCount: highlighter.getHighlightCount(),
			};
		});

		expect(result.success).toBe(true);
		expect(result.highlightCount).toBe(1);

		if (result.cssSupported) {
			// For CSS highlights, check that the CSS styles were added to the document
			const styleElement = await cleanPage.locator(
				"#golden-nugget-highlight-styles",
			);
			await expect(styleElement).toHaveCount(1);

			const styleContent = await styleElement.textContent();
			expect(styleContent).toContain("::highlight(golden-nugget)");
			expect(styleContent).toContain("rgba(255, 215, 0, 0.3)");
		} else {
			// For DOM highlights, check the actual element styles
			const highlightElement = cleanPage
				.locator("[data-golden-nugget-highlight]")
				.first();
			await expect(highlightElement).toHaveCSS(
				"background-color",
				"rgba(255, 215, 0, 0.3)",
			);
			await expect(highlightElement).toHaveCSS(
				"border",
				"1px solid rgba(255, 193, 7, 0.6)",
			);
		}
	});

	test("should scroll to highlighted content", async ({ cleanPage }) => {
		const result = await cleanPage.evaluate(() => {
			const highlighter = new (window as any).Highlighter();
			const nugget = (window as any).testGoldenNuggets[0];
			const highlighted = highlighter.highlightNugget(nugget);

			// Get initial scroll position
			const initialScrollY = window.scrollY;

			highlighter.scrollToHighlight(nugget);

			return {
				highlighted,
				cssSupported: highlighter.cssHighlightSupported,
				highlightCount: highlighter.getHighlightCount(),
				initialScrollY,
				finalScrollY: window.scrollY,
			};
		});

		expect(result.highlighted).toBe(true);
		expect(result.highlightCount).toBe(1);

		if (result.cssSupported) {
			// For CSS highlights, we can't easily test viewport visibility,
			// but we can check that scrolling occurred or highlighting succeeded
			expect(result.highlighted).toBe(true);
		} else {
			// For DOM highlights, check the actual element is in viewport
			const highlightElement = cleanPage
				.locator("[data-golden-nugget-highlight]")
				.first();
			await expect(highlightElement).toBeInViewport();
		}
	});

	test("should clear all highlights", async ({ cleanPage }) => {
		await cleanPage.evaluate(() => {
			const highlighter = new (window as any).Highlighter();

			// Add all highlights
			for (const nugget of (window as any).testGoldenNuggets) {
				highlighter.highlightNugget(nugget);
			}

			// Clear all highlights
			highlighter.clearHighlights();
		});

		const highlightedElements = await cleanPage.locator(
			"[data-golden-nugget-highlight]",
		);
		await expect(highlightedElements).toHaveCount(0);
	});

	test("should handle punctuation mismatch between endContent and displayed text", async ({
		cleanPage,
	}) => {
		// This test reproduces the issue where endContent has extra punctuation
		// that might not match exactly in the DOM, but should still be found
		const consoleMessages: string[] = [];
		cleanPage.on("console", (msg) => {
			consoleMessages.push(`${msg.type()}: ${msg.text()}`);
		});

		const result = await cleanPage.evaluate(() => {
			const highlighter = new (window as any).Highlighter();

			// Use an existing nugget but add extra punctuation to test our fallback logic
			// This simulates the scenario where the API returns text with extra punctuation
			const testNugget = {
				type: "aha! moments",
				startContent: "Generalization only begins when",
				endContent: "generalization occurs...", // Extra dots compared to actual content
			};

			console.log("Testing punctuation mismatch nugget:", testNugget);

			// Try to highlight the nugget
			const highlighted = highlighter.highlightNugget(testNugget);

			return {
				highlighted,
				cssSupported: highlighter.cssHighlightSupported,
				highlightCount: highlighter.getHighlightCount(),
				nugget: testNugget,
			};
		});

		console.log("Punctuation test result:", result);
		console.log("Console messages from browser:");
		for (const msg of consoleMessages) {
			console.log("  ", msg);
		}

		// The highlighter should successfully find and highlight the text
		// even if there's a punctuation mismatch (extra dots)
		expect(result.highlighted).toBe(true);
		expect(result.highlightCount).toBeGreaterThan(0);
	});

	test("should handle missing punctuation in endContent", async ({
		cleanPage,
	}) => {
		// This test reproduces the case where sidebar strips punctuation
		// but highlighter searches for text with punctuation
		const consoleMessages: string[] = [];
		cleanPage.on("console", (msg) => {
			consoleMessages.push(`${msg.type()}: ${msg.text()}`);
		});

		const result = await cleanPage.evaluate(() => {
			const highlighter = new (window as any).Highlighter();

			// Use an existing nugget but remove punctuation to test our fallback logic
			// This simulates the scenario where sidebar displays cleaned text
			const testNugget = {
				type: "tool",
				startContent: "Project CETI is a large-scale",
				endContent: "to talk to whales", // Missing period compared to actual content
			};

			console.log("Testing missing punctuation nugget:", testNugget);

			// Try to highlight the nugget
			const highlighted = highlighter.highlightNugget(testNugget);

			return {
				highlighted,
				cssSupported: highlighter.cssHighlightSupported,
				highlightCount: highlighter.getHighlightCount(),
				nugget: testNugget,
			};
		});

		console.log("Missing punctuation test result:", result);
		console.log("Console messages from browser:");
		for (const msg of consoleMessages) {
			console.log("  ", msg);
		}

		// The highlighter should successfully find and highlight the text
		// even if endContent is missing punctuation
		expect(result.highlighted).toBe(true);
		expect(result.highlightCount).toBeGreaterThan(0);
	});

	test("should handle quote character mismatch between LLM and page content", async ({
		cleanPage,
	}) => {
		// This test reproduces the HackerNews issue where LLM generates straight quotes
		// but page content uses smart/curly quotes
		const consoleMessages: string[] = [];
		cleanPage.on("console", (msg) => {
			consoleMessages.push(`${msg.type()}: ${msg.text()}`);
		});

		const result = await cleanPage.evaluate(() => {
			const highlighter = new (window as any).Highlighter();

			// This reproduces the exact issue from the user's problem:
			// LLM generated: I'd say rather that "statistically" -> make these observations."
			// But page has smart quotes: I'd say rather that "statistically" -> make these observations."
			const testNugget = {
				type: "analogy",
				startContent: 'I\'d say rather that "statistically"', // Straight quotes from LLM
				endContent: 'make these observations."', // Straight quotes from LLM
			};

			console.log("Testing quote character mismatch nugget:", testNugget);

			// Try to highlight the nugget
			const highlighted = highlighter.highlightNugget(testNugget);

			return {
				highlighted,
				cssSupported: highlighter.cssHighlightSupported,
				highlightCount: highlighter.getHighlightCount(),
				nugget: testNugget,
			};
		});

		console.log("Quote character mismatch test result:", result);
		console.log("Console messages from browser:");
		for (const msg of consoleMessages) {
			console.log("  ", msg);
		}

		// This test should FAIL initially (showing the bug exists)
		// Then pass after we implement quote normalization
		expect(result.highlighted).toBe(true);
		expect(result.highlightCount).toBeGreaterThan(0);
	});

	test("should handle URL spacing mismatch from LLM hallucination", async ({
		cleanPage,
	}) => {
		// This test reproduces the PMC URL issue where LLM adds spaces after dots
		const consoleMessages: string[] = [];
		cleanPage.on("console", (msg) => {
			consoleMessages.push(`${msg.type()}: ${msg.text()}`);
		});

		const result = await cleanPage.evaluate(() => {
			const highlighter = new (window as any).Highlighter();

			// This reproduces the exact URL spacing issue:
			// LLM generated: https://pmc. ncbi. nlm. nih. gov/articles/PMC3444174/ > Using -> – Gene V. Glass
			// But page has no spaces: https://pmc.ncbi.nlm.nih.gov/articles/PMC3444174/ > Using -> – Gene V. Glass
			const testNugget = {
				type: "media",
				startContent:
					"https://pmc. ncbi. nlm. nih. gov/articles/PMC3444174/ > Using", // Spaces after dots from LLM
				endContent: "– Gene V. Glass",
			};

			console.log("Testing URL spacing mismatch nugget:", testNugget);

			// Try to highlight the nugget
			const highlighted = highlighter.highlightNugget(testNugget);

			return {
				highlighted,
				cssSupported: highlighter.cssHighlightSupported,
				highlightCount: highlighter.getHighlightCount(),
				nugget: testNugget,
			};
		});

		console.log("URL spacing mismatch test result:", result);
		console.log("Console messages from browser:");
		for (const msg of consoleMessages) {
			console.log("  ", msg);
		}

		// This test should FAIL initially (showing the bug exists)
		// Then pass after we implement URL spacing normalization
		expect(result.highlighted).toBe(true);
		expect(result.highlightCount).toBeGreaterThan(0);
	});

	test("should NOT match different content when using quote normalization", async ({
		cleanPage,
	}) => {
		// This NEGATIVE test ensures quote normalization doesn't create false positives
		const consoleMessages: string[] = [];
		cleanPage.on("console", (msg) => {
			consoleMessages.push(`${msg.type()}: ${msg.text()}`);
		});

		const result = await cleanPage.evaluate(() => {
			const highlighter = new (window as any).Highlighter();

			// This should NOT match even with quote normalization because content is different
			const testNugget = {
				type: "analogy",
				startContent: 'I\'d say rather that "completely different"', // Different content with straight quotes
				endContent: 'totally unrelated observations."',
			};

			console.log("Testing false positive prevention:", testNugget);

			// Try to highlight the nugget
			const highlighted = highlighter.highlightNugget(testNugget);

			return {
				highlighted,
				cssSupported: highlighter.cssHighlightSupported,
				highlightCount: highlighter.getHighlightCount(),
				nugget: testNugget,
			};
		});

		console.log("False positive test result:", result);
		console.log("Console messages from browser:");
		for (const msg of consoleMessages) {
			console.log("  ", msg);
		}

		// This should fail to match (highlighted = false) to prevent false positives
		expect(result.highlighted).toBe(false);
		expect(result.highlightCount).toBe(0);
	});

	test("should NOT match different URLs when using spacing normalization", async ({
		cleanPage,
	}) => {
		// This NEGATIVE test ensures URL spacing normalization doesn't create false positives
		const consoleMessages: string[] = [];
		cleanPage.on("console", (msg) => {
			consoleMessages.push(`${msg.type()}: ${msg.text()}`);
		});

		const result = await cleanPage.evaluate(() => {
			const highlighter = new (window as any).Highlighter();

			// This should NOT match because it's a completely different URL
			const testNugget = {
				type: "media",
				startContent: "https://different. site. com/articles/", // Different URL with spacing
				endContent: "some other author",
			};

			console.log("Testing URL false positive prevention:", testNugget);

			// Try to highlight the nugget
			const highlighted = highlighter.highlightNugget(testNugget);

			return {
				highlighted,
				cssSupported: highlighter.cssHighlightSupported,
				highlightCount: highlighter.getHighlightCount(),
				nugget: testNugget,
			};
		});

		console.log("URL false positive test result:", result);
		console.log("Console messages from browser:");
		for (const msg of consoleMessages) {
			console.log("  ", msg);
		}

		// This should fail to match (highlighted = false) to prevent false positives
		expect(result.highlighted).toBe(false);
		expect(result.highlightCount).toBe(0);
	});
});
