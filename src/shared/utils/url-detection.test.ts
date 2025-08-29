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
