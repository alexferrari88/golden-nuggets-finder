/**
 * Tests for TextNormalizer - Enhanced text normalization functions
 */

import { describe, expect, it } from "vitest";
import { TextNormalizer } from "./text-normalizer";

describe("TextNormalizer", () => {
	describe("normalizeForMatching", () => {
		it("should handle empty and null inputs", () => {
			expect(TextNormalizer.normalizeForMatching("")).toBe("");
			expect(TextNormalizer.normalizeForMatching(null as any)).toBe("");
			expect(TextNormalizer.normalizeForMatching(undefined as any)).toBe("");
		});

		it("should normalize smart quotes", () => {
			const input = `He said "Hello" and 'goodbye'`;
			const expected = `He said "Hello" and 'goodbye'`;
			expect(TextNormalizer.normalizeForMatching(input)).toBe(expected);
		});

		it("should normalize fancy quotes", () => {
			const input = "‹Single› and «Double» quotes";
			const expected = '"Single" and "Double" quotes';
			expect(TextNormalizer.normalizeForMatching(input)).toBe(expected);
		});

		it("should normalize URL spacing", () => {
			const input = "Visit pmc. ncbi. nlm. nih. gov for info";
			const expected = "Visit pmc.ncbi.nlm.nih.gov for info";
			expect(TextNormalizer.normalizeForMatching(input)).toBe(expected);
		});

		it("should collapse whitespace", () => {
			const input = "This  has    multiple   spaces\t\tand\n\ntabs";
			const expected = "This has multiple spaces and tabs";
			expect(TextNormalizer.normalizeForMatching(input)).toBe(expected);
		});

		it("should normalize different dash types", () => {
			const input = "Short‒dash, medium–dash, long—dash, and extra―dash";
			const expected = "Short-dash, medium-dash, long-dash, and extra-dash";
			expect(TextNormalizer.normalizeForMatching(input)).toBe(expected);
		});

		it("should normalize ellipsis", () => {
			const input = "Wait for it… here it comes";
			const expected = "Wait for it... here it comes";
			expect(TextNormalizer.normalizeForMatching(input)).toBe(expected);
		});

		it("should normalize multiple punctuation marks", () => {
			const input = "Amazing!!! Really???";
			const expected = "Amazing! Really!";
			expect(TextNormalizer.normalizeForMatching(input)).toBe(expected);
		});

		it("should normalize multiple periods but preserve ellipsis", () => {
			const input = "End of sentence.... Wait... Continue.";
			const expected = "End of sentence... Wait... Continue.";
			expect(TextNormalizer.normalizeForMatching(input)).toBe(expected);
		});

		it("should normalize full-width characters", () => {
			const input = "Ｈｅｌｌｏ　１２３４５";
			const expected = "Hello 12345";
			expect(TextNormalizer.normalizeForMatching(input)).toBe(expected);
		});

		it("should normalize math symbols", () => {
			const input = "２＋３×４÷２＝８";
			const expected = "2+3x4/2=8";
			expect(TextNormalizer.normalizeForMatching(input)).toBe(expected);
		});

		it("should handle complex mixed input", () => {
			const input = `
				"Smart quotes" and 'apostrophes'…
				Visit   pmc. ncbi. gov   for—research
				Multiple   spaces    and	tabs!!!
			`;
			const result = TextNormalizer.normalizeForMatching(input);

			expect(result).toContain("\"Smart quotes\" and 'apostrophes'...");
			expect(result).toContain("pmc.ncbi.gov");
			expect(result).toContain("Multiple spaces and tabs!");
			expect(result.trim().split(" ")).not.toContain(""); // No empty strings from split
		});

		it("should trim whitespace from result", () => {
			const input = "  \n\t  Trimmed text  \n\t  ";
			const expected = "Trimmed text";
			expect(TextNormalizer.normalizeForMatching(input)).toBe(expected);
		});
	});

	describe("normalizeForDisplay", () => {
		it("should be less aggressive than normalizeForMatching", () => {
			const input = "Text with—dashes and… ellipsis";
			const display = TextNormalizer.normalizeForDisplay(input);
			const matching = TextNormalizer.normalizeForMatching(input);

			// Display should preserve more formatting
			expect(display.length).toBeGreaterThanOrEqual(matching.length - 2);
			expect(display).toContain("...");
		});

		it("should still collapse whitespace", () => {
			const input = "Multiple   spaces    here";
			const expected = "Multiple spaces here";
			expect(TextNormalizer.normalizeForDisplay(input)).toBe(expected);
		});

		it("should normalize basic quotes", () => {
			const input = 'Text with "smart quotes" here';
			const expected = 'Text with "smart quotes" here';
			expect(TextNormalizer.normalizeForDisplay(input)).toBe(expected);
		});
	});

	describe("extractKeyWords", () => {
		it("should extract meaningful words", () => {
			const input = "This is a test with some important keywords";
			const words = TextNormalizer.extractKeyWords(input);

			expect(words).toContain("test");
			expect(words).toContain("important");
			expect(words).toContain("keywords");
			expect(words).not.toContain("this"); // Common stop word
			expect(words).not.toContain("the"); // Common stop word
			expect(words).not.toContain("is"); // Common stop word
		});

		it("should filter out short words", () => {
			const input = "A big test of my AI system";
			const words = TextNormalizer.extractKeyWords(input);

			expect(words).toContain("big");
			expect(words).toContain("test");
			expect(words).toContain("system");
			expect(words).not.toContain("a"); // Too short
			expect(words).not.toContain("of"); // Too short
			expect(words).not.toContain("my"); // Too short
		});

		it("should filter out pure punctuation", () => {
			const input = "Hello!!! How... are??? you???";
			const words = TextNormalizer.extractKeyWords(input);

			expect(words).toContain("hello");
			expect(words).not.toContain("!!!");
			expect(words).not.toContain("...");
			expect(words).not.toContain("???");
		});

		it("should handle empty input", () => {
			const words = TextNormalizer.extractKeyWords("");
			expect(words).toEqual([]);
		});

		it("should handle input with only stop words", () => {
			const input = "the and but for are with";
			const words = TextNormalizer.extractKeyWords(input);
			expect(words).toEqual([]);
		});
	});

	describe("calculateSimilarity", () => {
		it("should return 1.0 for identical texts", () => {
			const text = "machine learning algorithms";
			const similarity = TextNormalizer.calculateSimilarity(text, text);
			expect(similarity).toBe(1.0);
		});

		it("should return 1.0 for both empty texts", () => {
			const similarity = TextNormalizer.calculateSimilarity("", "");
			expect(similarity).toBe(1.0);
		});

		it("should return 0.0 for one empty text", () => {
			const similarity1 = TextNormalizer.calculateSimilarity("text", "");
			const similarity2 = TextNormalizer.calculateSimilarity("", "text");
			expect(similarity1).toBe(0.0);
			expect(similarity2).toBe(0.0);
		});

		it("should calculate partial similarity correctly", () => {
			const text1 = "machine learning algorithms for data science";
			const text2 = "deep learning algorithms for computer vision";

			const similarity = TextNormalizer.calculateSimilarity(text1, text2);

			expect(similarity).toBeGreaterThan(0.0);
			expect(similarity).toBeLessThan(1.0);
			// Should have some overlap due to "learning", "algorithms"
			expect(similarity).toBeGreaterThan(0.2);
		});

		it("should return low similarity for completely different texts", () => {
			const text1 = "machine learning algorithms";
			const text2 = "cooking recipes vegetables";

			const similarity = TextNormalizer.calculateSimilarity(text1, text2);
			expect(similarity).toBeLessThan(0.2);
		});

		it("should handle case insensitive comparison", () => {
			const text1 = "Machine Learning Algorithms";
			const text2 = "machine learning algorithms";

			const similarity = TextNormalizer.calculateSimilarity(text1, text2);
			expect(similarity).toBe(1.0);
		});
	});

	describe("areTextsEquivalent", () => {
		it("should detect exact matches after normalization", () => {
			const text1 = 'This is a "test" with smart quotes';
			const text2 = 'This is a "test" with smart quotes';

			const equivalent = TextNormalizer.areTextsEquivalent(text1, text2);
			expect(equivalent).toBe(true);
		});

		it("should detect equivalent texts with different formatting", () => {
			const text1 = "Visit pmc.ncbi.nlm.nih.gov site";
			const text2 = "Visit pmc. ncbi. nlm. nih. gov site";

			const equivalent = TextNormalizer.areTextsEquivalent(text1, text2);
			expect(equivalent).toBe(true);
		});

		it("should respect custom thresholds", () => {
			const text1 = "machine learning algorithms data science";
			const text2 = "machine learning algorithms computer science";

			const strictEquivalent = TextNormalizer.areTextsEquivalent(
				text1,
				text2,
				0.95,
			);
			const lenientEquivalent = TextNormalizer.areTextsEquivalent(
				text1,
				text2,
				0.5,
			);

			expect(strictEquivalent).toBe(false);
			expect(lenientEquivalent).toBe(true);
		});

		it("should handle length ratio checks", () => {
			const text1 = "short";
			const text2 = "short but much much longer text here";

			const equivalent = TextNormalizer.areTextsEquivalent(text1, text2);
			expect(equivalent).toBe(false);
		});
	});

	describe("getNormalizationDiff", () => {
		it("should track normalization changes", () => {
			const input = 'Text with "smart quotes" and extra   spaces';
			const diff = TextNormalizer.getNormalizationDiff(input);

			expect(diff.original).toBe(input);
			expect(diff.normalized).not.toBe(input);
			expect(diff.changes).toContain("smart-quotes");
			expect(diff.changes).toContain("whitespace-collapse");
		});

		it("should report no changes for already normalized text", () => {
			const input = "Already normalized text";
			const diff = TextNormalizer.getNormalizationDiff(input);

			expect(diff.original).toBe(input);
			expect(diff.normalized).toBe(input.trim());
			expect(diff.changes).toEqual([]);
		});

		it("should handle URL spacing normalization", () => {
			const input = "Visit pmc. ncbi. gov site";
			const diff = TextNormalizer.getNormalizationDiff(input);

			expect(diff.changes).toContain("url-spacing");
			expect(diff.normalized).toContain("pmc.ncbi.gov");
		});

		it("should handle multiple normalizations", () => {
			const input = 'Text with—dashes and… "quotes" and   spaces';
			const diff = TextNormalizer.getNormalizationDiff(input);

			expect(diff.changes.length).toBeGreaterThan(1);
			expect(diff.changes).toContain("smart-quotes");
			expect(diff.changes).toContain("whitespace-collapse");
			expect(diff.changes).toContain("dash-normalization");
			expect(diff.changes).toContain("ellipsis-normalization");
		});
	});

	describe("Real-world LLM variations", () => {
		it("should handle common LLM punctuation variations", () => {
			const original = "What is the answer?";
			const variation1 = "What is the answer.";
			const variation2 = "What is the answer!";

			// All should normalize to similar forms
			const norm1 = TextNormalizer.normalizeForMatching(original);
			const norm2 = TextNormalizer.normalizeForMatching(variation1);
			const norm3 = TextNormalizer.normalizeForMatching(variation2);

			// Check that the core content is preserved
			expect(norm1).toContain("What is the answer");
			expect(norm2).toContain("What is the answer");
			expect(norm3).toContain("What is the answer");
		});

		it("should handle academic citation formats", () => {
			const original = "Smith et al. (2023) found that...";
			const variation = "Smith et al (2023) found that…";

			const similarity = TextNormalizer.calculateSimilarity(
				original,
				variation,
			);
			expect(similarity).toBeGreaterThan(0.8);
		});

		it("should handle technical terminology variations", () => {
			const original = "machine learning (ML) algorithms";
			const variation = "machine learning algorithms";

			const similarity = TextNormalizer.calculateSimilarity(
				original,
				variation,
			);
			expect(similarity).toBeGreaterThan(0.7);
		});
	});
});
