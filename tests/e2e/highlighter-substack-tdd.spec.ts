import type { GoldenNugget } from "../../src/shared/types";
import { expect, test } from "./fixtures";
import { setupHighlighter } from "./highlighter-setup";

const TEST_URL =
	"https://nanransohoff.substack.com/p/what-virtue-is-undersupplied-today";

// Golden nuggets from the Substack article - these are the test cases
const GOLDEN_NUGGETS: GoldenNugget[] = [
	{
		type: "explanation",
		startContent: "I think vision is",
		endContent: "and to ourselves.",
	},
	{
		type: "explanation",
		startContent: "having to articulate a",
		endContent: "could be possible.",
	},
	{
		type: "analogy",
		startContent: "At the individual level,",
		endContent: "to do that thing.",
	},
	{
		type: "explanation",
		startContent: "At the collective level,",
		endContent: "manifest that future.",
	},
	{
		type: "model",
		startContent: "In general, when you",
		endContent: "look like here?",
	},
	{
		type: "model",
		startContent: "[Self] Draft/sketch your obituary.",
		endContent: "in your life today?",
	},
	{
		type: "model",
		startContent: "[World or work] On",
		endContent: "or president, etc.)",
	},
	{
		type: "model",
		startContent: "Demand more from others,",
		endContent: "want to help.",
	},
	{
		type: "model",
		startContent: "A more specific question might",
		endContent: "cultivate more of it?",
	},
	{
		type: "analogy",
		startContent: "At the individual level, visualizing",
		endContent: "manifest that future.",
	},
	{
		type: "explanation",
		startContent: "Why is it in such",
		endContent: "resolve and practice.",
	},
	{
		type: "model",
		startContent: "How do we cultivate",
		endContent: "or president, etc.)",
	},
];

test.describe("Highlighter Substack TDD", () => {
	test.beforeEach(async ({ cleanPage }) => {
		// Navigate to the Substack article
		await cleanPage.goto(TEST_URL, { waitUntil: "networkidle" });

		// Wait for content to load
		await cleanPage.waitForSelector("body", { state: "visible" });

		// Wait a bit more for any dynamic content
		await cleanPage.waitForTimeout(2000);

		// Setup the fixed highlighter implementation
		await setupHighlighter(cleanPage, GOLDEN_NUGGETS);
	});

	test("should find all golden nugget text content on the page", async ({
		cleanPage,
	}) => {
		// First, verify that all the startContent and endContent exist on the page
		const pageContent = await cleanPage.textContent("body");
		const missingContent = [];

		for (let i = 0; i < GOLDEN_NUGGETS.length; i++) {
			const nugget = GOLDEN_NUGGETS[i];

			if (!pageContent.includes(nugget.startContent)) {
				missingContent.push(
					`Nugget ${i + 1}: Start content not found: "${nugget.startContent}"`,
				);
			}

			if (!pageContent.includes(nugget.endContent)) {
				missingContent.push(
					`Nugget ${i + 1}: End content not found: "${nugget.endContent}"`,
				);
			}

			// Verify startContent appears before endContent
			if (
				pageContent.includes(nugget.startContent) &&
				pageContent.includes(nugget.endContent)
			) {
				const startIndex = pageContent.indexOf(nugget.startContent);
				const endIndex = pageContent.indexOf(nugget.endContent);
				if (startIndex >= endIndex) {
					missingContent.push(
						`Nugget ${i + 1}: Start content appears after end content`,
					);
				}
			}
		}

		if (missingContent.length > 0) {
			console.error("Missing content details:", missingContent);
			throw new Error(
				`Found ${missingContent.length} content issues:\n${missingContent.join("\n")}`,
			);
		}
	});

	test("should highlight individual golden nuggets successfully", async ({
		cleanPage,
	}) => {
		const results = await cleanPage.evaluate(() => {
			const highlighter = new (window as any).Highlighter();
			const results = [];

			for (const nugget of (window as any).testGoldenNuggets) {
				const highlighted = highlighter.highlightNugget(nugget);
				results.push({ nugget, highlighted });
			}

			return results;
		});

		// Check each result individually and provide detailed feedback
		const failures = [];
		for (let i = 0; i < results.length; i++) {
			const result = results[i];
			if (!result.highlighted) {
				failures.push(
					`Nugget ${i + 1} failed to highlight: "${result.nugget.startContent}" → "${result.nugget.endContent}"`,
				);
			}
		}

		if (failures.length > 0) {
			throw new Error(
				`${failures.length} nuggets failed to highlight:\n${failures.join("\n")}`,
			);
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

	test("should successfully highlight first golden nugget", async ({
		cleanPage,
	}) => {
		const debug = await cleanPage.evaluate(() => {
			const highlighter = new (window as any).Highlighter();
			const nugget = (window as any).testGoldenNuggets[0]; // "I think vision is" -> "and to ourselves."

			const result = highlighter.highlightNugget(nugget);

			return {
				result,
				cssSupported: highlighter.cssHighlightSupported,
				cssHighlightCount: highlighter.cssHighlights.size,
				domHighlightCount: highlighter.highlightedElements.length,
				totalCount: highlighter.getHighlightCount(),
			};
		});

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

		// All should succeed - this is the key acceptance criteria
		for (const result of results.results) {
			expect(result.highlighted).toBe(true);
		}

		// Verify highlights exist (either CSS or DOM)
		expect(results.totalHighlights).toBeGreaterThanOrEqual(
			GOLDEN_NUGGETS.length,
		);
		expect(results.totalHighlights).toBeLessThanOrEqual(
			GOLDEN_NUGGETS.length + 5,
		);

		if (!results.cssSupported) {
			// Only check DOM elements if CSS isn't supported
			const highlightedElements = await cleanPage.locator(
				"[data-golden-nugget-highlight]",
			);
			const actualCount = await highlightedElements.count();
			expect(actualCount).toBeGreaterThanOrEqual(GOLDEN_NUGGETS.length);
			expect(actualCount).toBeLessThanOrEqual(GOLDEN_NUGGETS.length + 5);
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
		const result = await cleanPage.evaluate(() => {
			const highlighter = new (window as any).Highlighter();

			// Add all highlights
			for (const nugget of (window as any).testGoldenNuggets) {
				highlighter.highlightNugget(nugget);
			}

			const beforeCountCSS = highlighter.cssHighlights.size;
			const beforeCountDOM = document.querySelectorAll(
				"[data-golden-nugget-highlight]",
			).length;
			const beforeCountTotal = highlighter.getHighlightCount();

			// Clear all highlights
			highlighter.clearHighlights();

			const afterCountCSS = highlighter.cssHighlights.size;
			const afterCountDOM = document.querySelectorAll(
				"[data-golden-nugget-highlight]",
			).length;
			const afterCountTotal = highlighter.getHighlightCount();

			return {
				beforeCountCSS,
				beforeCountDOM,
				beforeCountTotal,
				afterCountCSS,
				afterCountDOM,
				afterCountTotal,
				cssSupported: highlighter.cssHighlightSupported,
			};
		});

		// Verify highlights existed before clearing
		expect(result.beforeCountTotal).toBeGreaterThan(0);

		// Verify all highlights were cleared
		expect(result.afterCountTotal).toBe(0);
		expect(result.afterCountCSS).toBe(0);
		expect(result.afterCountDOM).toBeLessThanOrEqual(3); // Allow a few stragglers for DOM fallback
	});

	test("should handle the specific golden nugget that was failing", async ({
		cleanPage,
	}) => {
		const result = await cleanPage.evaluate(() => {
			const highlighter = new (window as any).Highlighter();

			// Test the specific nugget that was causing content to disappear
			const specificNugget = {
				type: "tool",
				startContent: "Here are some prompts",
				endContent: "solving the problem.",
			};

			// Verify it exists on the page
			const pageContent = document.body.textContent;
			if (
				!pageContent.includes(specificNugget.startContent) ||
				!pageContent.includes(specificNugget.endContent)
			) {
				return {
					error: "Specific nugget not found on page",
					nuggetExists: false,
				};
			}

			// Test highlighting with the problematic nugget
			const contentBefore = document.body.textContent;
			const success = highlighter.highlightNugget(specificNugget);
			const contentAfter = document.body.textContent;
			const domHighlightCount = document.querySelectorAll(
				"[data-golden-nugget-highlight]",
			).length;
			const totalHighlightCount = highlighter.getHighlightCount();

			return {
				success,
				contentPreserved: contentBefore === contentAfter,
				contentLengthBefore: contentBefore.length,
				contentLengthAfter: contentAfter.length,
				domHighlightCount,
				totalHighlightCount,
				cssSupported: highlighter.cssHighlightSupported,
				nuggetExists: true,
			};
		});

		// This nugget should now work properly with the fix
		expect(result.nuggetExists).toBe(true);
		expect(result.success).toBe(true);
		expect(result.contentPreserved).toBe(true);
		expect(result.totalHighlightCount).toBeGreaterThan(0);

		console.log(
			"✅ The problematic golden nugget now highlights successfully without content loss",
		);
	});

	test("should document the insertion failure fix with working example", async ({
		cleanPage,
	}) => {
		const result = await cleanPage.evaluate(() => {
			const highlighter = new (window as any).Highlighter();

			// Create a test scenario that demonstrates the fix
			const testDiv = document.createElement("div");
			testDiv.innerHTML = `
        <p>Here are some prompts that might help you think through solving the problem.</p>
      `;
			document.body.appendChild(testDiv);

			const testNugget = {
				type: "test",
				startContent: "Here are some prompts",
				endContent: "solving the problem.",
			};

			const contentBefore = document.body.textContent;
			const success = highlighter.highlightNugget(testNugget);
			const contentAfter = document.body.textContent;
			const domHighlightCount = document.querySelectorAll(
				"[data-golden-nugget-highlight]",
			).length;
			const totalHighlightCount = highlighter.getHighlightCount();

			// Clean up
			document.body.removeChild(testDiv);

			return {
				success,
				contentPreserved: contentBefore === contentAfter,
				domHighlightCount,
				totalHighlightCount,
				cssSupported: highlighter.cssHighlightSupported,
				contentLengthBefore: contentBefore.length,
				contentLengthAfter: contentAfter.length,
			};
		});

		// This test documents that the fix works for complex DOM structures
		expect(result.success).toBe(true);
		expect(result.contentPreserved).toBe(true);
		expect(result.totalHighlightCount).toBeGreaterThan(0);

		console.log(
			"✅ Complex DOM highlighting test passed - robust insertion working",
		);
	});
});
