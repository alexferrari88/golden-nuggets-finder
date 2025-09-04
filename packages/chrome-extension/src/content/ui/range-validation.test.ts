/**
 * Tests for Range Validation Utility
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
	filterValidRanges,
	hasValidRanges,
	isRangeInExcludedElement,
} from "./range-validation";

describe("Range Validation", () => {
	beforeEach(() => {
		// Set up a clean DOM for each test
		document.body.innerHTML = `
			<div class="main-content">
				<p>This is main page content that should be highlighted.</p>
				<div class="article">
					<h1>Article Title</h1>
					<p>Article content with some golden nugget text here.</p>
				</div>
			</div>
			<div class="nugget-sidebar">
				<div class="nugget-item">
					<p>This is sidebar content that should NOT be highlighted.</p>
					<p>Article content with some golden nugget text here.</p>
				</div>
			</div>
			<div class="golden-nugget-notification">
				<p>This is notification content that should NOT be highlighted.</p>
			</div>
		`;
	});

	describe("isRangeInExcludedElement", () => {
		it("should return false for ranges in main content", () => {
			const mainParagraph = document.querySelector(".main-content p");
			expect(mainParagraph).not.toBeNull();

			const range = document.createRange();
			range.selectNodeContents(mainParagraph!);

			expect(isRangeInExcludedElement(range)).toBe(false);
		});

		it("should return true for ranges in sidebar", () => {
			const sidebarParagraph = document.querySelector(
				".nugget-sidebar .nugget-item p",
			);
			expect(sidebarParagraph).not.toBeNull();

			const range = document.createRange();
			range.selectNodeContents(sidebarParagraph!);

			expect(isRangeInExcludedElement(range)).toBe(true);
		});

		it("should return true for ranges in notifications", () => {
			const notificationParagraph = document.querySelector(
				".golden-nugget-notification p",
			);
			expect(notificationParagraph).not.toBeNull();

			const range = document.createRange();
			range.selectNodeContents(notificationParagraph!);

			expect(isRangeInExcludedElement(range)).toBe(true);
		});

		it("should handle text node ranges correctly", () => {
			const mainParagraph = document.querySelector(".main-content p");
			const textNode = mainParagraph!.firstChild as Text;
			expect(textNode.nodeType).toBe(Node.TEXT_NODE);

			const range = document.createRange();
			range.setStart(textNode, 5);
			range.setEnd(textNode, 15);

			expect(isRangeInExcludedElement(range)).toBe(false);
		});

		it("should handle text node ranges in sidebar correctly", () => {
			const sidebarParagraph = document.querySelector(
				".nugget-sidebar .nugget-item p",
			);
			const textNode = sidebarParagraph!.firstChild as Text;
			expect(textNode.nodeType).toBe(Node.TEXT_NODE);

			const range = document.createRange();
			range.setStart(textNode, 5);
			range.setEnd(textNode, 15);

			expect(isRangeInExcludedElement(range)).toBe(true);
		});

		it("should return true for invalid ranges", () => {
			// @ts-expect-error - Testing invalid range
			expect(isRangeInExcludedElement(null)).toBe(true);
			// @ts-expect-error - Testing invalid range
			expect(isRangeInExcludedElement(undefined)).toBe(true);

			// Range with no common ancestor container set
			const range = document.createRange();
			// Create a detached range by setting start/end to detached nodes
			const detachedDiv = document.createElement('div');
			const textNode = document.createTextNode('test');
			detachedDiv.appendChild(textNode);
			// Don't append to document - this creates a detached range
			range.setStart(textNode, 0);
			range.setEnd(textNode, 4);
			// Range is valid but detached from document, should be excluded for safety
			expect(isRangeInExcludedElement(range)).toBe(true);
		});

		it("should handle ranges spanning multiple elements", () => {
			const article = document.querySelector(".article");
			const firstParagraph = article!.querySelector("h1");
			const secondParagraph = article!.querySelector("p");

			const range = document.createRange();
			range.setStartBefore(firstParagraph!);
			range.setEndAfter(secondParagraph!);

			// Should not be excluded since it's in main content
			expect(isRangeInExcludedElement(range)).toBe(false);
		});
	});

	describe("filterValidRanges", () => {
		it("should filter out ranges in excluded elements", () => {
			const mainParagraph = document.querySelector(".main-content p");
			const sidebarParagraph = document.querySelector(
				".nugget-sidebar .nugget-item p",
			);

			const validRange = document.createRange();
			validRange.selectNodeContents(mainParagraph!);

			const invalidRange = document.createRange();
			invalidRange.selectNodeContents(sidebarParagraph!);

			const ranges = [validRange, invalidRange];
			const filteredRanges = filterValidRanges(ranges);

			expect(filteredRanges).toHaveLength(1);
			expect(filteredRanges[0]).toBe(validRange);
		});

		it("should return empty array when all ranges are excluded", () => {
			const sidebarParagraph1 = document.querySelector(
				".nugget-sidebar .nugget-item p:first-child",
			);
			const sidebarParagraph2 = document.querySelector(
				".nugget-sidebar .nugget-item p:last-child",
			);

			const range1 = document.createRange();
			range1.selectNodeContents(sidebarParagraph1!);

			const range2 = document.createRange();
			range2.selectNodeContents(sidebarParagraph2!);

			const ranges = [range1, range2];
			const filteredRanges = filterValidRanges(ranges);

			expect(filteredRanges).toHaveLength(0);
		});

		it("should return all ranges when none are excluded", () => {
			const mainParagraph = document.querySelector(".main-content p");
			const articleTitle = document.querySelector(".article h1");
			const articleContent = document.querySelector(".article p");

			const range1 = document.createRange();
			range1.selectNodeContents(mainParagraph!);

			const range2 = document.createRange();
			range2.selectNodeContents(articleTitle!);

			const range3 = document.createRange();
			range3.selectNodeContents(articleContent!);

			const ranges = [range1, range2, range3];
			const filteredRanges = filterValidRanges(ranges);

			expect(filteredRanges).toHaveLength(3);
			expect(filteredRanges).toEqual(ranges);
		});

		it("should handle empty array input", () => {
			const filteredRanges = filterValidRanges([]);
			expect(filteredRanges).toHaveLength(0);
		});
	});

	describe("hasValidRanges", () => {
		it("should return true when at least one range is valid", () => {
			const mainParagraph = document.querySelector(".main-content p");
			const sidebarParagraph = document.querySelector(
				".nugget-sidebar .nugget-item p",
			);

			const validRange = document.createRange();
			validRange.selectNodeContents(mainParagraph!);

			const invalidRange = document.createRange();
			invalidRange.selectNodeContents(sidebarParagraph!);

			expect(hasValidRanges([validRange, invalidRange])).toBe(true);
		});

		it("should return false when all ranges are invalid", () => {
			const sidebarParagraph1 = document.querySelector(
				".nugget-sidebar .nugget-item p:first-child",
			);
			const sidebarParagraph2 = document.querySelector(
				".nugget-sidebar .nugget-item p:last-child",
			);

			const range1 = document.createRange();
			range1.selectNodeContents(sidebarParagraph1!);

			const range2 = document.createRange();
			range2.selectNodeContents(sidebarParagraph2!);

			expect(hasValidRanges([range1, range2])).toBe(false);
		});

		it("should return false for empty array", () => {
			expect(hasValidRanges([])).toBe(false);
		});

		it("should return true when all ranges are valid", () => {
			const mainParagraph = document.querySelector(".main-content p");
			const articleTitle = document.querySelector(".article h1");

			const range1 = document.createRange();
			range1.selectNodeContents(mainParagraph!);

			const range2 = document.createRange();
			range2.selectNodeContents(articleTitle!);

			expect(hasValidRanges([range1, range2])).toBe(true);
		});
	});

	describe("Edge Cases", () => {
		it("should handle custom excluded selectors via data attributes", () => {
			// Add custom extension UI element
			document.body.innerHTML += `
				<div data-golden-nugget-ui>
					<p>Custom extension UI content</p>
				</div>
			`;

			const customUIParagraph = document.querySelector(
				"[data-golden-nugget-ui] p",
			);

			const range = document.createRange();
			range.selectNodeContents(customUIParagraph!);

			expect(isRangeInExcludedElement(range)).toBe(true);
		});

		it("should handle mark.js highlighted elements", () => {
			// Add mark.js highlighted element
			document.body.innerHTML += `
				<div class="content">
					<span class="golden-nugget-highlight">Highlighted text</span>
				</div>
			`;

			const highlightedElement = document.querySelector(
				".golden-nugget-highlight",
			);

			const range = document.createRange();
			range.selectNodeContents(highlightedElement!);

			expect(isRangeInExcludedElement(range)).toBe(true);
		});

		it("should handle nested excluded elements", () => {
			document.body.innerHTML += `
				<div class="nugget-sidebar">
					<div class="inner-content">
						<div class="deeply-nested">
							<p>Deeply nested sidebar content</p>
						</div>
					</div>
				</div>
			`;

			const nestedParagraph = document.querySelector(
				".nugget-sidebar .deeply-nested p",
			);

			const range = document.createRange();
			range.selectNodeContents(nestedParagraph!);

			expect(isRangeInExcludedElement(range)).toBe(true);
		});
	});
});
