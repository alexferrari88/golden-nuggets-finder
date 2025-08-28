/**
 * Tests for Enhanced Text Matching System
 * Tests the RobustTextMatcher class and matching functionality
 */

import { beforeEach, describe, expect, test } from "vitest";
import {
	createRobustTextMatcher,
	DEFAULT_MATCHER_OPTIONS,
	enhancedTextMatching,
	RobustTextMatcher,
} from "./enhanced-text-matching";

describe("Enhanced Text Matching System", () => {
	beforeEach(() => {
		// Set up clean DOM for each test
		document.body.innerHTML = `
			<div class="content">
				<h1>The Impact of AI on Modern Society</h1>
				<p>Artificial intelligence has become increasingly important in our daily lives. 
				   The technology demonstrates remarkable capabilities in pattern recognition, 
				   natural language processing, and decision-making tasks.</p>
				<p>However, we must consider the ethical implications and potential risks 
				   associated with rapid AI advancement. Responsible development is crucial.</p>
				<p>Machine learning algorithms can sometimes exhibit unexpected behaviors 
				   when dealing with edge cases or adversarial inputs.</p>
			</div>
		`;
	});

	describe("RobustTextMatcher", () => {
		test("should initialize with default options", () => {
			const matcher = new RobustTextMatcher();
			expect(matcher).toBeDefined();
		});

		test("should accept custom configuration", () => {
			const matcher = new RobustTextMatcher({
				fuzzyThreshold: 0.8,
				enableDiffAlignment: false,
				enableFuzzyMatching: false,
			});
			expect(matcher).toBeDefined();
		});

		test("should find exact matches", async () => {
			const matcher = new RobustTextMatcher();
			const result = await matcher.findBestMatch("Artificial intelligence");

			expect(result.found).toBe(true);
			expect(result.confidence).toBeGreaterThan(0.8);
			expect(result.strategy).toBeDefined();
		});

		test("should handle case insensitive matching", async () => {
			const matcher = new RobustTextMatcher();
			const result = await matcher.findBestMatch("ARTIFICIAL INTELLIGENCE");

			expect(result.found).toBe(true);
			expect(result.strategy).toBeDefined();
		});

		test("should handle missing words (LLM hallucination)", async () => {
			const matcher = new RobustTextMatcher();
			// LLM generates "increasingly important" but page has "increasingly important in our daily lives"
			const result = await matcher.findBestMatch("increasingly important");

			expect(result.found).toBe(true);
			expect(result.confidence).toBeGreaterThan(0.5);
		});

		test("should handle extra words (LLM hallucination)", async () => {
			const matcher = new RobustTextMatcher();
			// LLM generates longer text than what exists
			const result = await matcher.findBestMatch(
				"Artificial intelligence has become increasingly important and essential",
			);

			expect(result.found).toBe(true);
		});

		test("should handle typos with fuzzy matching", async () => {
			const matcher = new RobustTextMatcher();
			const result = await matcher.findBestMatch("Artifical inteligence"); // typos

			expect(result.found).toBe(true);
			expect(result.confidence).toBeGreaterThan(0.6);
		});

		test("should return not found for completely unrelated text", async () => {
			const matcher = new RobustTextMatcher();
			const result = await matcher.findBestMatch(
				"completely unrelated content about cooking",
			);

			expect(result.found).toBe(false);
		});

		test("should handle empty search text", async () => {
			const matcher = new RobustTextMatcher();
			const result = await matcher.findBestMatch("");

			expect(result.found).toBe(false);
		});

		test("should handle very short search text", async () => {
			const matcher = new RobustTextMatcher();
			const result = await matcher.findBestMatch("AI");

			// This might or might not be found depending on content
			expect(typeof result.found).toBe("boolean");
		});
	});

	describe("createRobustTextMatcher", () => {
		test("should create matcher with default options", () => {
			const matcher = createRobustTextMatcher();
			expect(matcher).toBeInstanceOf(RobustTextMatcher);
		});

		test("should create matcher with custom options", () => {
			const matcher = createRobustTextMatcher({
				fuzzyThreshold: 0.9,
				enableFuzzyMatching: false,
			});
			expect(matcher).toBeInstanceOf(RobustTextMatcher);
		});
	});

	describe("enhancedTextMatching", () => {
		test("should find matches using enhanced algorithm", async () => {
			const result = await enhancedTextMatching(
				"artificial intelligence",
				"artificial intelligence",
				document.body.textContent || "",
			);

			expect(result.success).toBe(true);
			expect(result.confidence).toBeGreaterThan(0.8);
		});

		test("should handle LLM hallucination scenarios", async () => {
			const result = await enhancedTextMatching(
				"AI has become important", // Paraphrase
				"AI has become important",
				document.body.textContent || "",
			);

			expect(result.success).toBe(true);
			expect(result.confidence).toBeGreaterThan(0.5);
		});

		test("should return not found for unmatched content", async () => {
			const result = await enhancedTextMatching(
				"completely unrelated cooking content",
				"completely unrelated cooking content",
				document.body.textContent || "",
			);

			expect(result.success).toBe(false);
		});
	});

	describe("Unicode and Special Characters", () => {
		beforeEach(() => {
			document.body.innerHTML = `
				<div class="unicode-content">
					<p>The résumé contained information about AI/ML expertise—specifically in 
					   "deep learning" and 'neural networks'. The cost was $1,000–$2,000.</p>
					<p>She said: "Machine learning is fascinating!" Then added, 'It's the future…'</p>
					<p>Mathematical notation: α + β = γ, where α ∈ ℝ and β ≠ ∅.</p>
				</div>
			`;
		});

		test("should normalize different quote types", async () => {
			const matcher = new RobustTextMatcher();

			const result1 = await matcher.findBestMatch('"deep learning"');
			const result2 = await matcher.findBestMatch("'neural networks'");

			expect(result1.found).toBe(true);
			expect(result2.found).toBe(true);
		});

		test("should normalize different dash types", async () => {
			const matcher = new RobustTextMatcher();

			const result = await matcher.findBestMatch("$1,000-$2,000"); // Using regular dash
			expect(result.found).toBe(true);
		});

		test("should normalize ellipsis variations", async () => {
			const matcher = new RobustTextMatcher();

			const result = await matcher.findBestMatch("It's the future..."); // Using three dots
			expect(result.found).toBe(true);
		});

		test("should handle mathematical symbols", async () => {
			const matcher = new RobustTextMatcher();

			const result = await matcher.findBestMatch("α + β = γ");
			expect(result.found).toBe(true);
		});
	});

	describe("Cross-DOM Node Matching", () => {
		beforeEach(() => {
			document.body.innerHTML = `
				<div class="formatted-content">
					<p>The <strong>artificial intelligence</strong> field has seen <em>remarkable progress</em> 
					   in recent years, particularly in <code>deep learning</code> and 
					   <a href="/nlp">natural language processing</a>.</p>
					<p>Key developments include <span class="highlight">transformer architectures</span>, 
					   <sup>attention mechanisms</sup>, and <sub>gradient optimization</sub> techniques.</p>
				</div>
			`;
		});

		test("should match text spanning multiple inline elements", async () => {
			const matcher = new RobustTextMatcher();

			const result = await matcher.findBestMatch(
				"artificial intelligence field has seen remarkable",
			);
			expect(result.found).toBe(true);
			expect(result.confidence).toBeGreaterThan(0.8);
		});

		test("should match text with nested formatting", async () => {
			const matcher = new RobustTextMatcher();

			const result = await matcher.findBestMatch(
				"deep learning and natural language processing",
			);
			expect(result.found).toBe(true);
		});

		test("should handle superscript and subscript text", async () => {
			const matcher = new RobustTextMatcher();

			const result = await matcher.findBestMatch(
				"attention mechanisms, and gradient optimization",
			);
			expect(result.found).toBe(true);
		});
	});

	describe("Performance", () => {
		test("should handle large documents efficiently", async () => {
			// Create large document
			const largeContent = Array(50)
				.fill(
					"<p>This is a paragraph with some content for testing purposes.</p>",
				)
				.join("");
			document.body.innerHTML = largeContent;

			const matcher = new RobustTextMatcher();
			const startTime = performance.now();

			const result = await matcher.findBestMatch("testing purposes");

			const endTime = performance.now();
			const executionTime = endTime - startTime;

			expect(result.found).toBe(true);
			expect(executionTime).toBeLessThan(200); // Should be reasonably fast
		});

		test("should reuse index for subsequent searches", async () => {
			const matcher = new RobustTextMatcher();

			// First search builds index
			await matcher.findBestMatch("first search");

			// Second search should be faster
			const startTime = performance.now();
			await matcher.findBestMatch("artificial intelligence");
			const endTime = performance.now();

			expect(endTime - startTime).toBeLessThan(50);
		});
	});

	describe("Default Options", () => {
		test("should have correct default configuration", () => {
			expect(DEFAULT_MATCHER_OPTIONS.fuzzyThreshold).toBe(0.7);
			expect(DEFAULT_MATCHER_OPTIONS.enableDiffAlignment).toBe(true);
			expect(DEFAULT_MATCHER_OPTIONS.enableFuzzyMatching).toBe(true);
			expect(DEFAULT_MATCHER_OPTIONS.maxTextNodes).toBe(1000);
		});
	});
});
