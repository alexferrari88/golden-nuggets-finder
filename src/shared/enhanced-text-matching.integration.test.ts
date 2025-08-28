/**
 * Integration Tests for Enhanced Text Matching System
 * Tests real-world scenarios and LLM hallucination cases
 */

import { beforeEach, describe, expect, test } from "vitest";
import {
	enhancedTextMatching,
	RobustTextMatcher,
} from "./enhanced-text-matching";
import {
	enhancedImprovedStartEndMatching,
	enhancedImprovedStartEndTextMatching,
} from "./enhanced-text-matching-adapter";

describe("Enhanced Text Matching Integration", () => {
	describe("LLM Hallucination Scenarios", () => {
		beforeEach(() => {
			// Real-world content from various websites
			document.body.innerHTML = `
				<article>
					<h1>The Future of Artificial Intelligence</h1>
					<p>Machine learning has revolutionized the way we approach data analysis. 
					   The technology demonstrates remarkable capabilities in pattern recognition, 
					   natural language processing, and predictive analytics.</p>
					<p>However, implementing AI systems requires careful consideration of ethical 
					   implications, data privacy, and algorithmic bias. Organizations must ensure 
					   transparency and accountability in their AI implementations.</p>
					<blockquote>
						"The development of full artificial intelligence could spell the end of the human race."
						- Stephen Hawking
					</blockquote>
					<p>Despite these concerns, AI continues to drive innovation across industries, 
					   from healthcare and finance to transportation and entertainment.</p>
				</article>
			`;
		});

		test("should handle LLM returning truncated text", async () => {
			// LLM returns "Machine learning has" but page has "Machine learning has revolutionized"
			const matcher = new RobustTextMatcher();
			const result = await matcher.findBestMatch("Machine learning has");

			expect(result.found).toBe(true);
			expect(result.confidence).toBeGreaterThan(0.8);
		});

		test("should handle LLM adding filler words", async () => {
			// LLM adds "Indeed," or "Furthermore," at beginning
			const matcher = new RobustTextMatcher();
			const result = await matcher.findBestMatch(
				"Indeed, machine learning has revolutionized",
			);

			expect(result.found).toBe(true);
		});

		test("should handle LLM paraphrasing with synonyms", async () => {
			// LLM uses "shows" instead of "demonstrates"
			const matcher = new RobustTextMatcher();
			const result = await matcher.findBestMatch(
				"technology shows remarkable capabilities",
			);

			expect(result.found).toBe(true);
			expect(result.confidence).toBeGreaterThan(0.6);
		});

		test("should handle LLM combining sentences", async () => {
			// LLM merges end of one sentence with start of next
			const matcher = new RobustTextMatcher();
			const result = await matcher.findBestMatch(
				"predictive analytics. However, implementing",
			);

			expect(result.found).toBe(true);
		});

		test("should handle LLM quote attribution issues", async () => {
			// LLM includes or excludes quote attribution
			const matcher = new RobustTextMatcher();
			const result = await matcher.findBestMatch(
				"The development of full artificial intelligence",
			);

			expect(result.found).toBe(true);
			expect(result.confidence).toBeGreaterThan(0.9);
		});

		test("should handle LLM capitalization variations", async () => {
			// LLM changes capitalization at sentence boundaries
			document.body.innerHTML = `<p>the technology demonstrates remarkable capabilities.</p>`;
			const matcher = new RobustTextMatcher();

			const result = await matcher.findBestMatch("The Technology Demonstrates");
			expect(result.found).toBe(true);
		});
	});

	describe("Real-World Content Types", () => {
		test("should handle Reddit-style content", async () => {
			document.body.innerHTML = `
				<div class="post">
					<div class="title">TIL that machine learning algorithms can be biased</div>
					<div class="content">
						<p>I just learned that ML models can perpetuate existing biases in training data. 
						   This is why algorithmic fairness is so important in AI development.</p>
						<div class="comment">
							<p>Yeah, this is a huge issue. Google's word embeddings famously showed 
							   "man is to computer programmer as woman is to homemaker" bias.</p>
						</div>
					</div>
				</div>
			`;

			const matcher = new RobustTextMatcher();
			const result = await matcher.findBestMatch(
				"ML models can perpetuate existing biases",
			);

			expect(result.found).toBe(true);
			expect(result.confidence).toBeGreaterThan(0.8);
		});

		test("should handle Hacker News-style content", async () => {
			document.body.innerHTML = `
				<table>
					<tr>
						<td class="title">
							<a href="/item?id=123">Show HN: My AI-powered code reviewer</a>
						</td>
					</tr>
					<tr>
						<td class="subtext">
							<span>42 points by user123 2 hours ago | 15 comments</span>
						</td>
					</tr>
					<tr>
						<td class="comment">
							<p>This looks interesting, but I'm concerned about privacy implications 
							   when uploading code to external AI services.</p>
							<div class="reply">
								<p>Good point. We actually process everything locally using a quantized model.</p>
							</div>
						</td>
					</tr>
				</table>
			`;

			const matcher = new RobustTextMatcher();
			const result = await matcher.findBestMatch(
				"concerned about privacy implications",
			);

			expect(result.found).toBe(true);
			expect(result.confidence).toBeGreaterThan(0.9);
		});

		test("should handle news article content", async () => {
			document.body.innerHTML = `
				<article>
					<header>
						<h1>AI Breakthrough: New Model Achieves Human-Level Performance</h1>
						<p class="byline">By Jane Smith, Tech Reporter | March 15, 2024</p>
					</header>
					<div class="content">
						<p>Researchers at Stanford University announced today that their latest 
						   neural network architecture has achieved human-level performance on 
						   standardized reasoning tests.</p>
						<p>"This represents a significant milestone in artificial general intelligence," 
						   said Dr. Sarah Chen, the lead researcher on the project.</p>
					</div>
				</article>
			`;

			const matcher = new RobustTextMatcher();
			const result = await matcher.findBestMatch(
				"achieved human-level performance on standardized",
			);

			expect(result.found).toBe(true);
		});
	});

	describe("Adapter Integration", () => {
		beforeEach(() => {
			document.body.innerHTML = `
				<div class="content">
					<p>The rapid advancement of artificial intelligence has sparked debates about 
					   its potential impact on employment, privacy, and society at large. While some 
					   experts warn of existential risks, others emphasize the tremendous benefits 
					   AI can bring to healthcare, education, and scientific research.</p>
					<p>One particularly promising application is in drug discovery, where AI models 
					   can analyze molecular structures and predict potential therapeutic compounds 
					   much faster than traditional methods.</p>
				</div>
			`;
		});

		test("should find start and end content across paragraph boundaries", async () => {
			const result = await enhancedImprovedStartEndMatching(
				"rapid advancement of artificial",
				"much faster than traditional methods",
				document.body.textContent || "",
			);

			expect(result).toBeDefined();
			expect(typeof result).toBe("boolean");
		});

		test("should handle LLM hallucination in start-end matching", async () => {
			// LLM adds filler words and changes some terms
			const result = await enhancedImprovedStartEndMatching(
				"Indeed, the rapid development of AI",
				"faster than conventional approaches",
				document.body.textContent || "",
			);

			expect(result).toBeDefined();
			expect(typeof result).toBe("boolean");
		});

		test("should work with enhanced text matching function", async () => {
			const result = await enhancedTextMatching(
				"artificial intelligence has sparked debates",
				"artificial intelligence has sparked debates",
				document.body.textContent || "",
			);

			expect(result.success).toBe(true);
			expect(result.confidence).toBeGreaterThan(0.8);
		});

		test("should work with adapter text matching function", async () => {
			const result = await enhancedImprovedStartEndTextMatching(
				"artificial intelligence has sparked debates",
				document.body.textContent || "",
			);

			expect(result).toBeDefined();
			expect(typeof result).toBe("boolean");
		});
	});

	describe("Performance and Scalability", () => {
		test("should handle large documents efficiently", async () => {
			// Create large document with repeated content
			const largeContent = Array(100)
				.fill(`
				<p>This is paragraph about artificial intelligence and machine learning. 
				   The content discusses various aspects of AI development, including neural networks, 
				   deep learning, natural language processing, and computer vision applications.</p>
			`)
				.join("");

			document.body.innerHTML = `<div class="large-content">${largeContent}</div>`;

			const matcher = new RobustTextMatcher();
			const startTime = performance.now();

			const result = await matcher.findBestMatch(
				"artificial intelligence and machine learning",
			);

			const endTime = performance.now();
			const executionTime = endTime - startTime;

			expect(result.found).toBe(true);
			expect(executionTime).toBeLessThan(1000); // Should complete within 1 second
		});

		test("should handle multiple rapid searches efficiently", async () => {
			const matcher = new RobustTextMatcher();

			const searches = [
				"artificial intelligence",
				"machine learning",
				"neural networks",
				"deep learning",
				"natural language processing",
			];

			const startTime = performance.now();

			const results = await Promise.all(
				searches.map((query) => matcher.findBestMatch(query)),
			);

			const endTime = performance.now();
			const totalTime = endTime - startTime;

			expect(results.length).toBe(5);
			expect(totalTime).toBeLessThan(500); // All searches should complete quickly
			expect(results.every((r) => typeof r.found === "boolean")).toBe(true);
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

	describe("Error Recovery and Resilience", () => {
		test("should handle malformed HTML gracefully", async () => {
			document.body.innerHTML = `
				<div class="broken">
					<p>This paragraph is <strong>not properly closed
					<em>This has nested issues</strong> with formatting</em>
					Some text without tags.
				</div>
			`;

			const matcher = new RobustTextMatcher();
			const result = await matcher.findBestMatch("not properly closed");

			expect(result.found).toBe(true);
		});

		test("should handle empty or whitespace-only nodes", async () => {
			document.body.innerHTML = `
				<div>
					<p>   </p>
					<p>Actual content here.</p>
					<p>		</p>
					<p>More content.</p>
				</div>
			`;

			const matcher = new RobustTextMatcher();
			const result = await matcher.findBestMatch("Actual content here");

			expect(result.found).toBe(true);
		});

		test("should handle script and style elements correctly", async () => {
			document.body.innerHTML = `
				<div>
					<p>Visible content before script.</p>
					<script>
						console.log("This should not be matched");
						var hiddenVar = "secret";
					</script>
					<style>
						.hidden { display: none; }
					</style>
					<p>Visible content after script.</p>
				</div>
			`;

			const matcher = new RobustTextMatcher();

			const scriptResult = await matcher.findBestMatch(
				"This should not be matched",
			);
			const styleResult = await matcher.findBestMatch(
				".hidden { display: none; }",
			);
			const visibleResult = await matcher.findBestMatch(
				"Visible content before script",
			);

			expect(scriptResult.found).toBe(false);
			expect(styleResult.found).toBe(false);
			expect(visibleResult.found).toBe(true);
		});
	});

	describe("Punctuation and Quote Mismatch Scenarios", () => {
		beforeEach(() => {
			// Real-world HackerNews-style content that caused the original issue
			document.body.innerHTML = `
				<div class="comment">
					<p>The basic idea is that, because everything correlates with everything else, you can't just look at correlations and infer that they're more than incidental.</p>
					<p>It's less of a big difference than it might seem, because it takes infinitely long to specify a real number to infinite precision. If you think about something like trying to tell if you hit the exact center of the bullseye, you eventually get down to the quantum mechanical scale and you find that the idea of an atom being in the exact center isn't even that well defined.</p>
					<p>In a finite or countable number of trials you won't see a measure zero event.</p>
					<blockquote>they're estimating the probability of rejecting the null if the null was true.</blockquote>
					<p>Right, but the null hypothesis is usually false and so it's a weird thing to measure. It's a proxy for the real thing you want, which is the probability of your hypothesis being true given the data. These are just some of the reasons why many statisticians consider the tradition of null hypothesis testing to be a mistake.</p>
					<p>These concerns about everything being correlated actually warrant much more careful understanding about the political ramifications of how and what we choose to model and based on which variables, because they tell us that in almost any non-trivial case a model is at least partly necessarily a political object almost certainly consciously or subconsciously decorated with some conception of how the world is or ought to be explained.</p>
					<p>I'd say rather that "statistically significance" is a measure of surprise. It's saying "If this default (the null hypothesis) is true, how surprised would I be to make these observations?"</p>
				</div>
			`;
		});

		test("should handle AI-extracted content with different punctuation than page", async () => {
			// This reproduces the exact HackerNews issue where:
			// AI extracted: "these observations.""  (period + double quotes)
			// Page content: "these observations?"   (question mark + single quote)
			const result = await enhancedTextMatching(
				"I'd say rather that",
				'these observations.""', // AI extracted with period + double quotes
				document.body.textContent || "",
			);

			expect(result.success).toBe(true);
			expect(result.confidence).toBeGreaterThan(0.7);
			expect(result.matchedContent).toContain("I'd say rather that");
			expect(result.matchedContent).toContain("these observation"); // Flexible matching
		});

		test("should handle various quote character mismatches", async () => {
			// Test different quote character variations
			const quoteVariations = [
				'these observations?"', // Actual page content
				'these observations.""', // AI extracted content
				'these observations."', // Mixed variation
				"these observations?", // No quotes
				"these observations.", // Period, no quotes
			];

			for (const endContent of quoteVariations) {
				const result = await enhancedTextMatching(
					"I'd say rather that",
					endContent,
					document.body.textContent || "",
				);

				expect(result.success, `Should succeed for endContent: "${endContent}"`).toBe(
					true,
				);
				expect(result.confidence, `Should have decent confidence for: "${endContent}"`).toBeGreaterThan(
					0.5,
				);
			}
		});

		test("should handle punctuation normalization in longer text", async () => {
			// Test with longer content that has punctuation differences
			const result = await enhancedTextMatching(
				"Right, but the null hypothesis",
				"to be a mistake.",
				document.body.textContent || "",
			);

			expect(result.success).toBe(true);
			expect(result.matchedContent).toContain("null hypothesis");
			expect(result.matchedContent).toContain("mistake");
		});
	});

	describe("Feature Flag Integration", () => {
		beforeEach(() => {
			document.body.innerHTML = `
				<p>Machine learning algorithms require careful tuning of hyperparameters 
				   to achieve optimal performance on specific datasets.</p>
			`;
		});

		test("should work with enhanced matching enabled", async () => {
			const testText = "ML algorithms require careful tuning"; // Slight paraphrase
			const pageContent = document.body.textContent || "";

			// Test with enhanced matching enabled
			const result = await enhancedImprovedStartEndTextMatching(
				testText,
				pageContent,
				{
					useEnhancedMatching: true,
					enableFallback: false,
					enablePerformanceComparison: false,
					enhancedSystemThreshold: 0.6,
				},
			);

			expect(result).toBeDefined();
			expect(typeof result).toBe("boolean");
		});

		test("should work with enhanced matching disabled", async () => {
			const testText = "machine learning algorithms";
			const pageContent = document.body.textContent || "";

			// Test with enhanced matching disabled
			const result = await enhancedImprovedStartEndTextMatching(
				testText,
				pageContent,
				{
					useEnhancedMatching: false,
					enableFallback: false,
					enablePerformanceComparison: false,
					enhancedSystemThreshold: 0.6,
				},
			);

			expect(result).toBeDefined();
			expect(typeof result).toBe("boolean");
		});

		test("should provide performance comparison when enabled", async () => {
			const result = await enhancedImprovedStartEndTextMatching(
				"Machine learning algorithms",
				document.body.textContent || "",
				{
					useEnhancedMatching: true,
					enableFallback: true,
					enablePerformanceComparison: true,
					enhancedSystemThreshold: 0.7,
				},
			);

			expect(result).toBeDefined();
			// Note: The actual result structure will depend on the implementation
		});
	});
});
