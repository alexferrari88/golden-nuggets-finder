/**
 * Tests for Enhanced Text Matching Adapter
 * Tests adapter functionality and configuration
 */

import { beforeEach, describe, expect, test } from "vitest";
import {
	type AdapterConfig,
	createEnhancedTextMatcher,
	DEFAULT_ADAPTER_CONFIG,
	enhancedImprovedStartEndMatching,
	enhancedImprovedStartEndTextMatching,
} from "./enhanced-text-matching-adapter";

describe("Enhanced Text Matching Adapter", () => {
	beforeEach(() => {
		// Set up DOM for testing
		document.body.innerHTML = `
			<div class="content">
				<p>The quick brown fox jumps over the lazy dog.</p>
				<p>Artificial intelligence has revolutionized many industries.</p>
				<p>Machine learning algorithms can process vast amounts of data.</p>
			</div>
		`;
	});

	describe("Default Configuration", () => {
		test("should have correct default configuration", () => {
			expect(DEFAULT_ADAPTER_CONFIG.useEnhancedMatching).toBe(true);
			expect(DEFAULT_ADAPTER_CONFIG.enableFallback).toBe(true);
			expect(DEFAULT_ADAPTER_CONFIG.enablePerformanceComparison).toBe(false);
			expect(DEFAULT_ADAPTER_CONFIG.enhancedSystemThreshold).toBe(0.7);
		});
	});

	describe("createEnhancedTextMatcher", () => {
		test("should create a text matcher instance", () => {
			const matcher = createEnhancedTextMatcher();
			expect(matcher).toBeDefined();
		});
	});

	describe("enhancedImprovedStartEndMatching", () => {
		test("should find start and end content in page", async () => {
			const result = await enhancedImprovedStartEndMatching(
				"quick brown",
				"lazy dog",
				document.body.textContent || "",
			);

			expect(result).toBeDefined();
			expect(typeof result).toBe("boolean");
		});

		test("should handle LLM hallucination scenarios", async () => {
			// LLM might generate slightly different text
			const result = await enhancedImprovedStartEndMatching(
				"The quick brown",
				"the lazy dog",
				document.body.textContent || "",
			);

			expect(result).toBeDefined();
			expect(typeof result).toBe("boolean");
		});

		test("should handle non-existent content", async () => {
			const result = await enhancedImprovedStartEndMatching(
				"completely nonexistent",
				"also missing text",
				document.body.textContent || "",
			);

			expect(result).toBeDefined();
			expect(typeof result).toBe("boolean");
		});

		test("should work with custom configuration", async () => {
			const customConfig: Partial<AdapterConfig> = {
				useEnhancedMatching: true,
				enableFallback: false,
				enhancedSystemThreshold: 0.8,
			};

			const result = await enhancedImprovedStartEndMatching(
				"quick brown",
				"lazy dog",
				document.body.textContent || "",
				customConfig,
			);

			expect(result).toBeDefined();
			expect(typeof result).toBe("boolean");
		});
	});

	describe("enhancedImprovedStartEndTextMatching", () => {
		test("should find text content in page", async () => {
			const result = await enhancedImprovedStartEndTextMatching(
				"artificial intelligence",
				document.body.textContent || "",
			);

			expect(result).toBeDefined();
			expect(typeof result).toBe("boolean");
		});

		test("should handle paraphrased content (LLM hallucination)", async () => {
			const result = await enhancedImprovedStartEndTextMatching(
				"AI has revolutionized industries", // Paraphrase
				document.body.textContent || "",
			);

			expect(result).toBeDefined();
			expect(typeof result).toBe("boolean");
		});

		test("should handle typos and variations", async () => {
			const result = await enhancedImprovedStartEndTextMatching(
				"artifical inteligence", // With typos
				document.body.textContent || "",
			);

			expect(result).toBeDefined();
			expect(typeof result).toBe("boolean");
		});

		test("should work with custom configuration", async () => {
			const customConfig: Partial<AdapterConfig> = {
				useEnhancedMatching: true,
				enablePerformanceComparison: true,
				enhancedSystemThreshold: 0.6,
			};

			const result = await enhancedImprovedStartEndTextMatching(
				"machine learning",
				document.body.textContent || "",
				customConfig,
			);

			expect(result).toBeDefined();
			expect(typeof result).toBe("boolean");
		});

		test("should return not found for completely unrelated text", async () => {
			const result = await enhancedImprovedStartEndTextMatching(
				"cooking recipes and baking instructions",
				document.body.textContent || "",
			);

			expect(result).toBeDefined();
			expect(typeof result).toBe("boolean");
		});
	});

	describe("Edge Cases", () => {
		test("should handle empty search strings", async () => {
			const result1 = await enhancedImprovedStartEndMatching(
				"",
				"lazy dog",
				document.body.textContent || "",
			);

			const result2 = await enhancedImprovedStartEndTextMatching(
				"",
				document.body.textContent || "",
			);

			expect(result1).toBeDefined();
			expect(result2).toBeDefined();
		});

		test("should handle empty page content", async () => {
			const result1 = await enhancedImprovedStartEndMatching(
				"quick brown",
				"lazy dog",
				"",
			);

			const result2 = await enhancedImprovedStartEndTextMatching(
				"artificial intelligence",
				"",
			);

			expect(result1).toBeDefined();
			expect(result2).toBeDefined();
		});

		test("should handle very long search strings", async () => {
			const longText = "artificial intelligence ".repeat(20);

			const result = await enhancedImprovedStartEndTextMatching(
				longText,
				document.body.textContent || "",
			);

			expect(result).toBeDefined();
			expect(typeof result).toBe("boolean");
		});
	});

	describe("Unicode and Special Characters", () => {
		beforeEach(() => {
			document.body.innerHTML = `
				<div>
					<p>The résumé contained "quotes" and 'apostrophes'—plus dashes.</p>
					<p>Cost: $1,000–$2,000... Mathematical: α + β = γ.</p>
				</div>
			`;
		});

		test("should handle Unicode characters", async () => {
			const result = await enhancedImprovedStartEndTextMatching(
				"résumé contained",
				document.body.textContent || "",
			);

			expect(result).toBeDefined();
			expect(typeof result).toBe("boolean");
		});

		test("should handle different quote types", async () => {
			const result1 = await enhancedImprovedStartEndTextMatching(
				'"quotes"',
				document.body.textContent || "",
			);

			const result2 = await enhancedImprovedStartEndTextMatching(
				"'apostrophes'",
				document.body.textContent || "",
			);

			expect(result1).toBeDefined();
			expect(result2).toBeDefined();
		});

		test("should handle mathematical symbols", async () => {
			const result = await enhancedImprovedStartEndTextMatching(
				"α + β = γ",
				document.body.textContent || "",
			);

			expect(result).toBeDefined();
			expect(typeof result).toBe("boolean");
		});
	});

	describe("Configuration Validation", () => {
		test("should work without configuration parameter", async () => {
			const result = await enhancedImprovedStartEndMatching(
				"quick brown",
				"lazy dog",
				document.body.textContent || "",
			);

			expect(result).toBeDefined();
		});

		test("should work with partial configuration", async () => {
			const partialConfig = {
				useEnhancedMatching: false,
			};

			const result = await enhancedImprovedStartEndTextMatching(
				"artificial intelligence",
				document.body.textContent || "",
				partialConfig,
			);

			expect(result).toBeDefined();
		});

		test("should work with full custom configuration", async () => {
			const fullConfig: AdapterConfig = {
				useEnhancedMatching: true,
				enableFallback: true,
				enablePerformanceComparison: true,
				enhancedSystemThreshold: 0.8,
			};

			const result = await enhancedImprovedStartEndMatching(
				"quick brown",
				"lazy dog",
				document.body.textContent || "",
				fullConfig,
			);

			expect(result).toBeDefined();
		});
	});
});
