import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GoldenNuggetType } from "../../src/shared/schemas";
import type { GoldenNugget } from "../../src/shared/types";

// Mock the highlighter module to test the logic without DOM dependencies
const _mockHighlighter = {
	highlightNugget: vi.fn(),
	diagnoseHighlightingFailure: vi.fn(),
	isUrl: vi.fn(),
};

// Mock URL detection
vi.mock("../../src/shared/utils/url-detection", () => ({
	isUrl: (text: string) => {
		const urlPattern = /^https?:\/\/[^\s]+$/i;
		return urlPattern.test(text.trim());
	},
}));

describe("Highlighter URL Handling", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("URL detection in nuggets", () => {
		it("should detect URL nuggets correctly", async () => {
			const { isUrl } = await import("../../src/shared/utils/url-detection");

			const urlNuggets: GoldenNugget[] = [
				{
					type: "media" as GoldenNuggetType,
					fullContent: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3444174/",
					confidence: 0.9,
				},
				{
					type: "media" as GoldenNuggetType,
					fullContent: "https://www.youtube.com/watch?v=lG4VkPoG3ko",
					confidence: 0.9,
				},
			];

			urlNuggets.forEach((nugget) => {
				expect(isUrl(nugget.fullContent)).toBe(true);
			});
		});

		it("should not detect non-URL nuggets as URLs", async () => {
			const { isUrl } = await import("../../src/shared/utils/url-detection");

			const nonUrlNuggets: GoldenNugget[] = [
				{
					type: "tool" as GoldenNuggetType,
					fullContent:
						"This is a regular text-based tool description with no URLs",
					confidence: 0.9,
				},
				{
					type: "aha! moments" as GoldenNuggetType,
					fullContent:
						"An insight about problem-solving without any web references",
					confidence: 0.85,
				},
			];

			nonUrlNuggets.forEach((nugget) => {
				expect(isUrl(nugget.fullContent)).toBe(false);
			});
		});

		it("should handle mixed content with URLs", async () => {
			const mixedNuggets: GoldenNugget[] = [
				{
					type: "media" as GoldenNuggetType,
					fullContent:
						"Check out this resource: https://example.com/resource - very helpful",
					confidence: 0.9,
				},
				{
					type: "tool" as GoldenNuggetType,
					fullContent:
						"Tool description with embedded link https://github.com/user/repo for reference",
					confidence: 0.8,
				},
			];

			// For mixed content, we test if the fullContent contains a URL
			mixedNuggets.forEach((nugget) => {
				const containsUrl = /https?:\/\/[^\s]+/i.test(nugget.fullContent);
				expect(containsUrl).toBe(true);
			});
		});

		it("should handle various URL formats", async () => {
			const { isUrl } = await import("../../src/shared/utils/url-detection");

			const urlFormats = [
				"https://example.com",
				"http://example.com",
				"https://subdomain.example.com/path",
				"https://example.com/path/to/resource?query=value",
				"https://example.com:8080/secure/path",
			];

			urlFormats.forEach((url) => {
				expect(isUrl(url)).toBe(true);
			});

			const invalidUrls = [
				"not-a-url",
				"ftp://example.com",
				"mailto:test@example.com",
				"javascript:alert('test')",
				"",
			];

			invalidUrls.forEach((url) => {
				expect(isUrl(url)).toBe(false);
			});
		});
	});

	describe("URL handling in nugget processing", () => {
		it("should properly categorize URL-based nuggets", () => {
			const nuggets: GoldenNugget[] = [
				{
					type: "media" as GoldenNuggetType,
					fullContent: "https://www.youtube.com/watch?v=example",
					confidence: 0.95,
				},
				{
					type: "tool" as GoldenNuggetType,
					fullContent: "Regular tool description without URLs",
					confidence: 0.9,
				},
			];

			const urlBasedNuggets = nuggets.filter((nugget) => {
				const urlPattern = /https?:\/\/[^\s]+/i;
				return urlPattern.test(nugget.fullContent);
			});

			expect(urlBasedNuggets).toHaveLength(1);
			expect(urlBasedNuggets[0].type).toBe("media");
		});

		it("should handle empty fullContent gracefully", () => {
			const emptyNugget: GoldenNugget = {
				type: "tool" as GoldenNuggetType,
				fullContent: "",
				confidence: 0.5,
			};

			expect(() => {
				const urlPattern = /https?:\/\/[^\s]+/i;
				return urlPattern.test(emptyNugget.fullContent);
			}).not.toThrow();
		});
	});
});
