import { describe, expect, it } from "vitest";
import { extractUrl, isUrl, parseUrl } from "./url-detection";

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
});
