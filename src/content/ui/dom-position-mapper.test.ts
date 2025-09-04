/**
 * Unit tests for DOMPositionMapper - Cross-node DOM range creation
 */

import { beforeEach, describe, expect, it } from "vitest";
import { DOMPositionMapper } from "./dom-position-mapper";

describe("DOMPositionMapper", () => {
	beforeEach(() => {
		// Clean up DOM
		document.body.innerHTML = "";
	});

	describe("convertOffsetToRange", () => {
		it("should handle simple single-node text", () => {
			document.body.innerHTML = "<p>Hello world, this is a test</p>";

			const ranges = DOMPositionMapper.convertOffsetToRange(0, 5);

			expect(ranges).toHaveLength(1);
			expect(ranges[0].toString()).toBe("Hello");
		});

		it("should handle empty input", () => {
			document.body.innerHTML = "<p>Test content</p>";

			const ranges = DOMPositionMapper.convertOffsetToRange(-1, 0);

			expect(ranges).toHaveLength(0);
		});

		it("should handle invalid range (start >= end)", () => {
			document.body.innerHTML = "<p>Test content</p>";

			const ranges = DOMPositionMapper.convertOffsetToRange(10, 5);

			expect(ranges).toHaveLength(0);
		});

		it("should handle text spanning multiple elements", () => {
			document.body.innerHTML =
				"<p>This is <em>important text that spans</em> <strong>across multiple elements</strong> here.</p>";

			// Target "important text that spans across multiple elements"
			const ranges = DOMPositionMapper.convertOffsetToRange(8, 60);

			expect(ranges.length).toBeGreaterThan(0);

			// Verify we can reconstruct the text from ranges
			const reconstructed = ranges.map((range) => range.toString()).join("");
			expect(reconstructed).toContain("important");
			expect(reconstructed).toContain("elements");
		});

		it("should handle nested HTML elements", () => {
			document.body.innerHTML =
				"<div><p>Start <span>nested <em>deeply nested</em> text</span> end</p></div>";

			// Target "nested deeply nested text"
			const ranges = DOMPositionMapper.convertOffsetToRange(6, 29);

			expect(ranges.length).toBeGreaterThan(0);
			const reconstructed = ranges.map((range) => range.toString()).join("");
			expect(reconstructed).toContain("nested");
			expect(reconstructed).toContain("deeply");
		});

		it("should skip script and style elements", () => {
			document.body.innerHTML = `
				<p>Visible text</p>
				<script>console.log("hidden")</script>
				<style>body { color: red; }</style>
				<p>More visible text</p>
			`;

			// Should only find text in p elements, not script/style
			const ranges = DOMPositionMapper.convertOffsetToRange(0, 30);

			expect(ranges.length).toBeGreaterThan(0);
			const reconstructed = ranges.map((range) => range.toString()).join("");
			expect(reconstructed).not.toContain("console.log");
			expect(reconstructed).not.toContain("color: red");
			expect(reconstructed).toContain("Visible");
		});

		it("should handle text at element boundaries", () => {
			document.body.innerHTML = "<p>First</p><p>Second</p>";

			// Target text that would span across the boundary
			const ranges = DOMPositionMapper.convertOffsetToRange(3, 8);

			expect(ranges.length).toBeGreaterThan(0);
			// Should handle the boundary gracefully
			const reconstructed = ranges.map((range) => range.toString()).join("");
			expect(reconstructed.length).toBeGreaterThan(0);
		});

		it("should handle whitespace-only text nodes", () => {
			document.body.innerHTML = "<p>Word1</p>    <p>Word2</p>";

			// Should skip whitespace-only nodes between elements
			const ranges = DOMPositionMapper.convertOffsetToRange(0, 10);

			expect(ranges.length).toBeGreaterThan(0);
			const reconstructed = ranges.map((range) => range.toString()).join("");
			expect(reconstructed).toContain("Word1");
			expect(reconstructed).toContain("Word2");
		});

		it("should handle very long text spans", () => {
			const longText = "a".repeat(1000);
			document.body.innerHTML = `<p>${longText}</p>`;

			const ranges = DOMPositionMapper.convertOffsetToRange(100, 900);

			expect(ranges).toHaveLength(1);
			expect(ranges[0].toString()).toBe("a".repeat(800));
		});

		it("should handle mixed content with inline elements", () => {
			document.body.innerHTML =
				'<p>Start <a href="#">link text</a> middle <code>code snippet</code> end</p>';

			// Target "link text middle code"
			const ranges = DOMPositionMapper.convertOffsetToRange(6, 29);

			expect(ranges.length).toBeGreaterThan(0);
			const reconstructed = ranges.map((range) => range.toString()).join("");
			expect(reconstructed).toContain("link");
			expect(reconstructed).toContain("code");
		});
	});

	describe("convertOffsetToRangeOptimized", () => {
		it("should return same result as basic method for single range", () => {
			document.body.innerHTML = "<p>Simple test text</p>";

			const basicRanges = DOMPositionMapper.convertOffsetToRange(0, 6);
			const optimizedRanges = DOMPositionMapper.convertOffsetToRangeOptimized(
				0,
				6,
			);

			expect(optimizedRanges).toHaveLength(basicRanges.length);
			expect(optimizedRanges[0].toString()).toBe(basicRanges[0].toString());
		});

		it("should handle multiple ranges efficiently", () => {
			document.body.innerHTML =
				"<p>Word <em>emphasized</em> <strong>bold</strong> text</p>";

			const optimizedRanges = DOMPositionMapper.convertOffsetToRangeOptimized(
				0,
				30,
			);

			expect(optimizedRanges.length).toBeGreaterThan(0);
			// Should potentially merge adjacent ranges for better performance
			const reconstructed = optimizedRanges
				.map((range) => range.toString())
				.join("");
			expect(reconstructed).toContain("Word");
			expect(reconstructed).toContain("text");
		});
	});

	describe("debugTextNodeMapping", () => {
		it("should provide accurate text node mapping information", () => {
			document.body.innerHTML =
				"<p>First paragraph</p><div>Second <em>emphasized</em> text</div>";

			const debug = DOMPositionMapper.debugTextNodeMapping();

			expect(debug.totalNodes).toBeGreaterThan(0);
			expect(debug.totalTextLength).toBeGreaterThan(0);
			expect(debug.nodeDetails).toHaveLength(debug.totalNodes);

			// Check that nodes are properly mapped
			const firstNode = debug.nodeDetails[0];
			expect(firstNode.offset).toBe(0);
			expect(firstNode.text).toContain("First");
		});

		it("should exclude hidden elements from mapping", () => {
			document.body.innerHTML = `
				<p>Visible text</p>
				<p style="display: none">Hidden text</p>
				<p style="visibility: hidden">Also hidden</p>
				<p style="opacity: 0">Transparent text</p>
			`;

			const debug = DOMPositionMapper.debugTextNodeMapping();

			// Should only include visible text node
			expect(debug.nodeDetails.length).toBe(1);
			expect(debug.nodeDetails[0].text).toContain("Visible");
		});

		it("should provide correct offset calculations", () => {
			document.body.innerHTML = "<p>ABC</p><p>DEF</p><p>GHI</p>";

			const debug = DOMPositionMapper.debugTextNodeMapping();

			expect(debug.nodeDetails).toHaveLength(3);
			expect(debug.nodeDetails[0].offset).toBe(0); // "ABC" starts at 0
			expect(debug.nodeDetails[1].offset).toBe(3); // "DEF" starts at 3
			expect(debug.nodeDetails[2].offset).toBe(6); // "GHI" starts at 6
			expect(debug.totalTextLength).toBe(9);
		});
	});

	describe("edge cases", () => {
		it("should handle empty document body", () => {
			document.body.innerHTML = "";

			const ranges = DOMPositionMapper.convertOffsetToRange(0, 5);

			expect(ranges).toHaveLength(0);
		});

		it("should handle document with only non-text content", () => {
			document.body.innerHTML =
				'<img src="test.jpg" alt=""><video></video><canvas></canvas>';

			const ranges = DOMPositionMapper.convertOffsetToRange(0, 10);

			expect(ranges).toHaveLength(0);
		});

		it("should handle ranges beyond document length", () => {
			document.body.innerHTML = "<p>Short</p>";

			const ranges = DOMPositionMapper.convertOffsetToRange(0, 1000);

			expect(ranges).toHaveLength(1);
			expect(ranges[0].toString()).toBe("Short");
		});

		it("should handle complex nested structures", () => {
			document.body.innerHTML = `
				<article>
					<header><h1>Title</h1></header>
					<section>
						<p>Paragraph with <a href="#">link</a> and <span>inline <em>nested</em> elements</span>.</p>
						<blockquote>Quote <strong>with emphasis</strong> here</blockquote>
					</section>
				</article>
			`;

			// Target text across multiple nested elements
			const ranges = DOMPositionMapper.convertOffsetToRange(5, 50);

			expect(ranges.length).toBeGreaterThan(0);
			const reconstructed = ranges.map((range) => range.toString()).join("");
			expect(reconstructed.length).toBeGreaterThan(0);
		});

		it("should handle text nodes with special characters", () => {
			document.body.innerHTML =
				'<p>Special chars: ñáéíóú & "quotes" & <symbols></p>';

			const ranges = DOMPositionMapper.convertOffsetToRange(0, 35);

			expect(ranges).toHaveLength(1);
			const reconstructed = ranges[0].toString();
			expect(reconstructed).toContain("ñáéíóú");
			expect(reconstructed).toContain("quotes");
		});
	});
});
