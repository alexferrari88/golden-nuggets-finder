import { describe, expect, it } from "vitest";
import {
	extractUrl,
	generateUrlBoundaries,
	isUrl,
	parseUrl,
	validateBoundaries,
} from "./url-detection";

describe("url-detection", () => {
	describe("isUrl", () => {
		it("detects valid HTTP URLs", () => {
			expect(isUrl("http://example.com")).toBe(true);
			expect(isUrl("https://example.com")).toBe(true);
			expect(isUrl("https://www.example.com")).toBe(true);
		});

		it("detects URLs with paths and query parameters", () => {
			expect(isUrl("https://example.com/path")).toBe(true);
			expect(isUrl("https://example.com/path?query=1")).toBe(true);
			expect(isUrl("https://example.com/path#fragment")).toBe(true);
		});

		it("detects complex URLs", () => {
			expect(isUrl("https://pmc.ncbi.nlm.nih.gov/articles/PMC3444174/")).toBe(
				true,
			);
			expect(isUrl("https://www.youtube.com/watch?v=lG4VkPoG3ko")).toBe(true);
		});

		it("rejects non-URL strings", () => {
			expect(isUrl("not a url")).toBe(false);
			expect(isUrl("just some text")).toBe(false);
			expect(isUrl("")).toBe(false);
		});

		// Critical test case for the reported bug
		it("rejects text that contains URLs but is not itself a URL", () => {
			// The exact case from the bug report
			expect(
				isUrl(
					"For reference, this is the https://en.wikipedia.org/wiki/Effect_size",
				),
			).toBe(false);

			// Other similar cases
			expect(isUrl("Check out https://example.com for more info")).toBe(false);
			expect(isUrl("Visit https://www.google.com today")).toBe(false);
			expect(isUrl("The link https://github.com/user/repo has the code")).toBe(
				false,
			);
			expect(
				isUrl(
					"See https://stackoverflow.com/questions/123 and https://example.org",
				),
			).toBe(false);
		});

		it("handles URLs with whitespace correctly", () => {
			// Pure URLs with whitespace should still be detected
			expect(isUrl("  https://example.com  ")).toBe(true);
			expect(isUrl("\t https://example.com/path \n")).toBe(true);

			// But text with URLs and whitespace should not
			expect(isUrl("  Check this: https://example.com  ")).toBe(false);
		});

		it("handles edge cases", () => {
			expect(isUrl("http://localhost:3000")).toBe(true);
			expect(isUrl("https://192.168.1.1:8080/path")).toBe(true);
		});
	});

	describe("extractUrl", () => {
		it("extracts URLs from text", () => {
			expect(extractUrl("Visit https://example.com for more info")).toBe(
				"https://example.com",
			);
			expect(
				extractUrl("Check out https://www.example.com/path?q=1 today"),
			).toBe("https://www.example.com/path?q=1");
		});

		// Test the exact bug case to ensure extractUrl still works
		it("extracts URLs from the bug report cases", () => {
			expect(
				extractUrl(
					"For reference, this is the https://en.wikipedia.org/wiki/Effect_size",
				),
			).toBe("https://en.wikipedia.org/wiki/Effect_size");
			expect(
				extractUrl("The link https://github.com/user/repo has the code"),
			).toBe("https://github.com/user/repo");
			expect(
				extractUrl("See https://stackoverflow.com/questions/123 and more info"),
			).toBe("https://stackoverflow.com/questions/123");
		});

		it("returns null for text without URLs", () => {
			expect(extractUrl("No URLs here")).toBe(null);
			expect(extractUrl("")).toBe(null);
		});
	});

	describe("parseUrl", () => {
		it("parses valid URLs correctly", () => {
			const result = parseUrl("https://example.com/path?q=1");
			expect(result.protocol).toBe("https");
			expect(result.domain).toBe("example.com");
			expect(result.path).toBe("/path?q=1");
			expect(result.isValid).toBe(true);
		});

		it("handles URLs without protocol", () => {
			const result = parseUrl("example.com/path");
			expect(result.domain).toBe("example.com");
			expect(result.path).toBe("/path");
		});

		it("handles root paths", () => {
			const result = parseUrl("https://example.com/");
			expect(result.path).toBe("");
		});

		it("handles complex URLs", () => {
			const result = parseUrl(
				"https://pmc.ncbi.nlm.nih.gov/articles/PMC3444174/",
			);
			expect(result.domain).toBe("pmc.ncbi.nlm.nih.gov");
			expect(result.path).toBe("/articles/PMC3444174/");
		});
	});

	describe("generateUrlBoundaries", () => {
		it("creates different boundaries for URLs", () => {
			const result = generateUrlBoundaries("https://example.com/path");
			expect(result.startContent).not.toBe(result.endContent);
			expect(validateBoundaries(result.startContent, result.endContent)).toBe(
				true,
			);
		});

		it("handles the problematic URLs from the issue", () => {
			const url1 = "https://pmc.ncbi.nlm.nih.gov/articles/PMC3444174/";
			const result1 = generateUrlBoundaries(url1);
			expect(result1.startContent).toBe("https://pmc.ncbi.nlm.nih.gov");
			expect(result1.endContent).toBe("/articles/PMC3444174/");
			expect(validateBoundaries(result1.startContent, result1.endContent)).toBe(
				true,
			);

			const url2 = "https://www.youtube.com/watch?v=lG4VkPoG3ko";
			const result2 = generateUrlBoundaries(url2);
			expect(result2.startContent).toBe("https://www.youtube.com");
			expect(result2.endContent).toBe("/watch?v=lG4VkPoG3ko");
			expect(validateBoundaries(result2.startContent, result2.endContent)).toBe(
				true,
			);
		});

		it("handles URLs with no path", () => {
			const result = generateUrlBoundaries("https://example.com");
			expect(result.startContent).toBe("https://example.com");
			expect(result.endContent).toBe("example.com");
			expect(validateBoundaries(result.startContent, result.endContent)).toBe(
				true,
			);
		});

		it("handles non-URL content gracefully", () => {
			const result = generateUrlBoundaries(
				"This is just regular text content that happens to be long",
			);
			expect(result.startContent).not.toBe(result.endContent);
			expect(validateBoundaries(result.startContent, result.endContent)).toBe(
				true,
			);
		});

		it("handles short non-URL content", () => {
			const result = generateUrlBoundaries("short text");
			expect(validateBoundaries(result.startContent, result.endContent)).toBe(
				true,
			);
		});

		// Critical test case for the bug fix
		it("handles text containing URLs without corruption", () => {
			// The exact case from the bug report
			const bugCase =
				"For reference, this is the https://en.wikipedia.org/wiki/Effect_size";
			const result = generateUrlBoundaries(bugCase);

			// Should NOT have URL encoding or mangling
			expect(result.startContent).not.toContain("%20");
			expect(result.endContent).not.toContain("%20");
			expect(result.startContent).not.toContain("https://for");

			// Should have valid different boundaries
			expect(validateBoundaries(result.startContent, result.endContent)).toBe(
				true,
			);

			// Should be reasonable word-based boundaries from the original text
			expect(result.startContent.length).toBeGreaterThan(0);
			expect(result.endContent.length).toBeGreaterThan(0);
			expect(result.startContent).toMatch(/^[A-Za-z]/);
		});

		it("generates clean boundaries for mixed content types", () => {
			const testCases = [
				"Check out https://example.com for details",
				"Visit https://www.google.com today",
				"The article https://en.wikipedia.org/wiki/Test explains it",
			];

			for (const testCase of testCases) {
				const result = generateUrlBoundaries(testCase);

				// Should not have URL encoding corruption
				expect(result.startContent).not.toContain("%20");
				expect(result.endContent).not.toContain("%20");

				// Should have valid boundaries
				expect(validateBoundaries(result.startContent, result.endContent)).toBe(
					true,
				);
			}
		});
	});

	describe("validateBoundaries", () => {
		it("validates different boundaries", () => {
			expect(validateBoundaries("start", "end")).toBe(true);
			expect(validateBoundaries("https://example.com", "/path")).toBe(true);
		});

		it("rejects identical boundaries", () => {
			expect(validateBoundaries("same", "same")).toBe(false);
		});

		it("rejects empty boundaries", () => {
			expect(validateBoundaries("", "end")).toBe(false);
			expect(validateBoundaries("start", "")).toBe(false);
			expect(validateBoundaries("", "")).toBe(false);
		});
	});
});
