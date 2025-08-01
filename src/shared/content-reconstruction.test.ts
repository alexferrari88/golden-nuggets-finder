import { describe, expect, it } from "vitest";
import {
	advancedNormalize,
	getDisplayContent,
	improvedStartEndMatching,
	improvedStartEndTextMatching,
	reconstructFullContent,
} from "./content-reconstruction";
import type { GoldenNugget } from "./types";

describe("Content Reconstruction - Error Handling", () => {
	describe("advancedNormalize", () => {
		it("should handle undefined input gracefully", () => {
			expect(advancedNormalize(undefined as unknown as string)).toBe("");
		});

		it("should handle null input gracefully", () => {
			expect(advancedNormalize(null as unknown as string)).toBe("");
		});

		it("should handle empty string input", () => {
			expect(advancedNormalize("")).toBe("");
		});

		it("should handle non-string input gracefully", () => {
			expect(advancedNormalize(123 as unknown as string)).toBe("");
			expect(advancedNormalize({} as unknown as string)).toBe("");
			expect(advancedNormalize([] as unknown as string)).toBe("");
		});

		it("should normalize valid text correctly", () => {
			expect(advancedNormalize("Hello World")).toBe("hello world");
			expect(advancedNormalize("  Multiple   Spaces  ")).toBe(
				"multiple spaces",
			);
			expect(advancedNormalize("Smart 'quotes' and \"curly quotes\"")).toBe(
				"smart 'quotes' and \"curly quotes\"",
			);
		});
	});

	describe("reconstructFullContent", () => {
		it("should handle undefined nugget gracefully", () => {
			expect(
				reconstructFullContent(
					undefined as unknown as GoldenNugget,
					"some content",
				),
			).toBe("");
		});

		it("should handle null nugget gracefully", () => {
			expect(
				reconstructFullContent(null as unknown as GoldenNugget, "some content"),
			).toBe("");
		});

		it("should handle nugget with missing startContent", () => {
			const nugget = {
				endContent: "end",
			} as Partial<GoldenNugget> as GoldenNugget;
			expect(reconstructFullContent(nugget, "some content")).toBe("");
		});

		it("should handle nugget with missing endContent", () => {
			const nugget = {
				startContent: "start",
			} as Partial<GoldenNugget> as GoldenNugget;
			expect(reconstructFullContent(nugget, "some content")).toBe("");
		});

		it("should handle undefined pageContent gracefully", () => {
			const nugget: GoldenNugget = {
				type: "explanation",
				content: "Full content",
				synthesis: "Test synthesis",
				startContent: "start",
				endContent: "end",
			};
			expect(
				reconstructFullContent(nugget, undefined as unknown as string),
			).toBe("start...end");
		});

		it("should handle null pageContent gracefully", () => {
			const nugget: GoldenNugget = {
				type: "explanation",
				content: "Full content",
				synthesis: "Test synthesis",
				startContent: "start",
				endContent: "end",
			};
			expect(reconstructFullContent(nugget, null as unknown as string)).toBe(
				"start...end",
			);
		});

		it("should handle empty pageContent gracefully", () => {
			const nugget: GoldenNugget = {
				type: "explanation",
				content: "Full content",
				synthesis: "Test synthesis",
				startContent: "start",
				endContent: "end",
			};
			expect(reconstructFullContent(nugget, "")).toBe("start...end");
		});

		it("should work with valid inputs", () => {
			const nugget: GoldenNugget = {
				type: "explanation",
				content: "Full content",
				synthesis: "Test synthesis",
				startContent: "This is",
				endContent: "a test",
			};
			const pageContent = "This is some content that contains a test example.";
			const result = reconstructFullContent(nugget, pageContent);
			expect(result).toContain("This is");
			expect(result).toContain("a test");
		});
	});

	describe("getDisplayContent", () => {
		it("should handle undefined nugget gracefully", () => {
			expect(getDisplayContent(undefined as unknown as GoldenNugget)).toBe("");
		});

		it("should handle null nugget gracefully", () => {
			expect(getDisplayContent(null as unknown as GoldenNugget)).toBe("");
		});

		it("should handle nugget with missing startContent", () => {
			const nugget = {
				type: "explanation",
				content: "fallback content",
				endContent: "end",
			} as Partial<GoldenNugget> as GoldenNugget;
			expect(getDisplayContent(nugget)).toBe("fallback content");
		});

		it("should handle nugget with missing endContent", () => {
			const nugget = {
				type: "explanation",
				content: "fallback content",
				startContent: "start",
			} as Partial<GoldenNugget> as GoldenNugget;
			expect(getDisplayContent(nugget)).toBe("fallback content");
		});

		it("should handle undefined pageContent gracefully", () => {
			const nugget: GoldenNugget = {
				type: "explanation",
				content: "Full content",
				synthesis: "Test synthesis",
				startContent: "start",
				endContent: "end",
			};
			expect(getDisplayContent(nugget, undefined)).toBe("start...end");
		});

		it("should handle non-string pageContent gracefully", () => {
			const nugget: GoldenNugget = {
				type: "explanation",
				content: "Full content",
				synthesis: "Test synthesis",
				startContent: "start",
				endContent: "end",
			};
			expect(getDisplayContent(nugget, 123 as unknown as string)).toBe(
				"start...end",
			);
			expect(getDisplayContent(nugget, {} as unknown as string)).toBe(
				"start...end",
			);
		});

		it("should work with valid inputs", () => {
			const nugget: GoldenNugget = {
				type: "explanation",
				content: "Full content",
				synthesis: "Test synthesis",
				startContent: "start",
				endContent: "end",
			};
			expect(getDisplayContent(nugget, "valid page content")).toBe(
				"start...end",
			);
		});
	});

	describe("improvedStartEndMatching", () => {
		it("should handle undefined inputs gracefully", () => {
			const result = improvedStartEndMatching(
				undefined as unknown as string,
				"end",
				"content",
			);
			expect(result.success).toBe(false);
			// Since undefined becomes empty string, empty string is found at index 0,
			// but then 'end' content is searched for after that
			expect(result.reason).toBe("End content not found after start");
		});

		it("should handle null inputs gracefully", () => {
			const result = improvedStartEndMatching(
				"start",
				null as unknown as string,
				"content",
			);
			expect(result.success).toBe(false);
			// 'start' is found but null becomes empty string which is found immediately after
			expect(result.reason).toBe("Start content not found");
		});

		it("should handle empty string inputs", () => {
			const result = improvedStartEndMatching("", "end", "content");
			expect(result.success).toBe(false);
		});

		it("should handle undefined pageContent gracefully", () => {
			const result = improvedStartEndMatching(
				"start",
				"end",
				undefined as unknown as string,
			);
			expect(result.success).toBe(false);
			expect(result.reason).toBe("Start content not found");
		});

		it("should work with valid inputs", () => {
			const result = improvedStartEndMatching(
				"This",
				"test",
				"This is a test content",
			);
			expect(result.success).toBe(true);
			expect(result.matchedContent).toContain("this");
			expect(result.matchedContent).toContain("test");
		});
	});

	describe("improvedStartEndTextMatching", () => {
		it("should handle undefined nugget gracefully", () => {
			expect(
				improvedStartEndTextMatching(
					undefined as unknown as GoldenNugget,
					"search text",
				),
			).toBe(false);
		});

		it("should handle null nugget gracefully", () => {
			expect(
				improvedStartEndTextMatching(
					null as unknown as GoldenNugget,
					"search text",
				),
			).toBe(false);
		});

		it("should handle nugget with missing content", () => {
			const nugget = {
				type: "explanation",
			} as Partial<GoldenNugget> as GoldenNugget;
			expect(improvedStartEndTextMatching(nugget, "search text")).toBe(false);
		});

		it("should handle undefined searchText gracefully", () => {
			const nugget: GoldenNugget = {
				type: "explanation",
				content: "Full content",
				synthesis: "Test synthesis",
				startContent: "start",
				endContent: "end",
			};
			expect(
				improvedStartEndTextMatching(nugget, undefined as unknown as string),
			).toBe(false);
		});

		it("should handle null searchText gracefully", () => {
			const nugget: GoldenNugget = {
				type: "explanation",
				content: "Full content",
				synthesis: "Test synthesis",
				startContent: "start",
				endContent: "end",
			};
			expect(
				improvedStartEndTextMatching(nugget, null as unknown as string),
			).toBe(false);
		});

		it("should work with valid inputs", () => {
			const nugget: GoldenNugget = {
				type: "explanation",
				content: "Full content",
				synthesis: "Test synthesis",
				startContent: "This is",
				endContent: "a test",
			};
			const searchText = "This is some content that contains a test example.";
			expect(improvedStartEndTextMatching(nugget, searchText)).toBe(true);
		});
	});
});

describe("Content Reconstruction - OpenRouter Error Integration", () => {
	it("should handle API failure scenario gracefully", () => {
		// Simulate what happens when OpenRouter API fails and undefined data is passed
		const malformedNugget = {
			type: undefined,
			content: undefined,
			startContent: undefined,
			endContent: undefined,
		} as unknown as GoldenNugget;

		// These should not throw errors even with malformed data
		expect(() => getDisplayContent(malformedNugget)).not.toThrow();
		expect(() =>
			reconstructFullContent(malformedNugget, undefined),
		).not.toThrow();
		expect(() => advancedNormalize(undefined)).not.toThrow();

		// Results should be safe fallback values
		expect(getDisplayContent(malformedNugget)).toBe("");
		expect(reconstructFullContent(malformedNugget, undefined)).toBe("");
		expect(advancedNormalize(undefined)).toBe("");
	});

	it("should handle partial API response gracefully", () => {
		// Simulate partial response from API
		const partialNugget = {
			type: "explanation",
			content: "Some content",
			startContent: "valid start",
			endContent: undefined,
		} as Partial<GoldenNugget> as GoldenNugget;

		expect(() => getDisplayContent(partialNugget)).not.toThrow();
		expect(() =>
			reconstructFullContent(partialNugget, "some page content"),
		).not.toThrow();

		// Should fallback to safe values
		expect(getDisplayContent(partialNugget)).toBe("Some content");
		expect(reconstructFullContent(partialNugget, "some page content")).toBe("");
	});

	it("should handle edge case where text processing fails", () => {
		const nugget: GoldenNugget = {
			type: "explanation",
			content: "Full content",
			synthesis: "Test synthesis",
			startContent: "start",
			endContent: "end",
		};

		// Test with various invalid pageContent values that could come from failed API calls
		const invalidPageContents = [undefined, null, "", 0, false, {}, []];

		invalidPageContents.forEach((invalidContent) => {
			expect(() =>
				getDisplayContent(nugget, invalidContent as unknown as string),
			).not.toThrow();
			expect(() =>
				reconstructFullContent(nugget, invalidContent as unknown as string),
			).not.toThrow();

			// Should always return safe fallback
			const result = getDisplayContent(
				nugget,
				invalidContent as unknown as string,
			);
			expect(result).toBe("start...end");
		});
	});
});
