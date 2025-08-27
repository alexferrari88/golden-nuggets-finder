import { describe, expect, test } from "vitest";

// Simulating the private methods for testing
class TestHighlighter {
	/**
	 * Conservative quote normalization - only normalizes quote characters
	 */
	normalizeQuotes(text: string): string {
		return (
			text
				// Convert opening smart/curly quotes to straight quotes
				.replace(/[""]/g, '"') // " and " to "
				.replace(/['']/g, "'") // ' and ' to '
				// Convert any remaining quote entities
				.replace(/&quot;/g, '"')
				.replace(/&#39;/g, "'")
				.replace(/&apos;/g, "'")
		);
	}

	/**
	 * URL spacing normalization - removes spaces around dots in URLs
	 */
	normalizeUrlSpacing(text: string): string {
		return (
			text
				// Remove spaces around dots in URL-like patterns
				// Matches patterns like "pmc. ncbi. nlm. nih. gov" -> "pmc.ncbi.nlm.nih.gov"
				.replace(/([a-zA-Z0-9])\s*\.\s*([a-zA-Z0-9])/g, "$1.$2")
				// Handle multiple consecutive replacements for patterns like "a. b. c. d"
				.replace(/([a-zA-Z0-9])\s*\.\s*([a-zA-Z0-9])/g, "$1.$2")
		);
	}
}

describe("Highlighter Normalization Functions", () => {
	const highlighter = new TestHighlighter();

	describe("Quote Normalization", () => {
		test("should normalize smart quotes to straight quotes", () => {
			// Using the exact same Unicode characters as in the highlighter implementation
			const input = `I'd say rather that "statistically"`;
			const expected = 'I\'d say rather that "statistically"';
			expect(highlighter.normalizeQuotes(input)).toBe(expected);
		});

		test("should normalize both opening and closing smart quotes", () => {
			// Using the exact same Unicode characters as in the highlighter implementation
			const input = `"Hello" and 'World'`;
			const expected = "\"Hello\" and 'World'";
			expect(highlighter.normalizeQuotes(input)).toBe(expected);
		});

		test("should handle HTML entities", () => {
			const input = "&quot;Hello&quot; and &#39;World&#39;";
			const expected = "\"Hello\" and 'World'";
			expect(highlighter.normalizeQuotes(input)).toBe(expected);
		});

		test("should not change already normalized quotes", () => {
			const input = "Normal \"quotes\" and 'apostrophes'";
			expect(highlighter.normalizeQuotes(input)).toBe(input);
		});

		test("should handle the exact user case", () => {
			const llmGenerated = 'make these observations."';
			const pageContent = `make these observations."`; // Using smart quote from implementation
			expect(highlighter.normalizeQuotes(llmGenerated)).toBe(
				highlighter.normalizeQuotes(pageContent),
			);
		});
	});

	describe("URL Spacing Normalization", () => {
		test("should remove spaces around dots in URLs", () => {
			const input = "https://pmc. ncbi. nlm. nih. gov/articles/PMC3444174/";
			const expected = "https://pmc.ncbi.nlm.nih.gov/articles/PMC3444174/";
			expect(highlighter.normalizeUrlSpacing(input)).toBe(expected);
		});

		test("should handle multiple consecutive dots", () => {
			const input = "example. com. org. net";
			const expected = "example.com.org.net";
			expect(highlighter.normalizeUrlSpacing(input)).toBe(expected);
		});

		test("should preserve spaces that are not around dots", () => {
			const input = "Visit pmc. ncbi. nlm. gov for more info";
			const expected = "Visit pmc.ncbi.nlm.gov for more info";
			expect(highlighter.normalizeUrlSpacing(input)).toBe(expected);
		});

		test("should not change URLs without spacing issues", () => {
			const input = "https://pmc.ncbi.nlm.nih.gov/articles/PMC3444174/";
			expect(highlighter.normalizeUrlSpacing(input)).toBe(input);
		});

		test("should handle the exact user case", () => {
			const llmGenerated =
				"https://pmc. ncbi. nlm. nih. gov/articles/PMC3444174/ > Using";
			const expected =
				"https://pmc.ncbi.nlm.nih.gov/articles/PMC3444174/ > Using";
			expect(highlighter.normalizeUrlSpacing(llmGenerated)).toBe(expected);
		});
	});

	describe("Combined Edge Cases", () => {
		test("should handle text with both quote and URL issues", () => {
			const input = `Visit "pmc. ncbi. nlm. gov" for research`; // Using smart quotes from implementation
			const quoteNormalized = highlighter.normalizeQuotes(input);
			const fullyNormalized = highlighter.normalizeUrlSpacing(quoteNormalized);
			expect(fullyNormalized).toBe('Visit "pmc.ncbi.nlm.gov" for research');
		});

		test("should be idempotent (applying twice gives same result)", () => {
			const input = 'Some "text" with pmc. ncbi. gov';
			const once = highlighter.normalizeUrlSpacing(
				highlighter.normalizeQuotes(input),
			);
			const twice = highlighter.normalizeUrlSpacing(
				highlighter.normalizeQuotes(once),
			);
			expect(once).toBe(twice);
		});
	});
});
