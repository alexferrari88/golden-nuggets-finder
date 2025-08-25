import { describe, expect, it, vi } from "vitest";
import { normalize, validate } from "./response-normalizer";

describe("Response Normalizer Functions", () => {
	// Mock console.error to avoid cluttering test output
	const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

	afterEach(() => {
		consoleSpy.mockClear();
	});

	describe("normalize", () => {
		it("should normalize valid response correctly", () => {
			const validResponse = {
				golden_nuggets: [
					{
						type: "tool" as const,
						startContent: "Test content 1",
						endContent: "Test content 1",
					},
					{
						type: "aha! moments" as const,
						startContent: "Test content 2",
						endContent: "Test content 2",
					},
				],
			};

			const result = normalize(validResponse, "openai");

			expect(result).toEqual({
				golden_nuggets: [
					{
						type: "tool",
						startContent: "Test content 1",
						endContent: "Test content 1",
					},
					{
						type: "aha! moments",
						startContent: "Test content 2",
						endContent: "Test content 2",
					},
				],
			});
		});

		it("should trim whitespace from content", () => {
			const responseWithWhitespace = {
				golden_nuggets: [
					{
						type: "tool" as const,
						startContent: "  Test start content  ",
						endContent: "  Test end content  ",
					},
				],
			};

			const result = normalize(responseWithWhitespace, "anthropic");

			expect(result.golden_nuggets[0].startContent).toBe("Test start content");
			expect(result.golden_nuggets[0].endContent).toBe("Test end content");
		});

		it("should filter out nuggets with empty content", () => {
			const responseWithEmpty = {
				golden_nuggets: [
					{
						type: "tool" as const,
						startContent: "Valid start",
						endContent: "Valid end",
					},
					{
						type: "aha! moments" as const,
						startContent: "",
						endContent: "Has end but no start",
					},
					{
						type: "analogy" as const,
						startContent: "Has start but no end",
						endContent: "",
					},
					{
						type: "media" as const,
						startContent: "   ",
						endContent: "Content is just whitespace",
					},
				],
			};

			const result = normalize(responseWithEmpty, "gemini");

			expect(result.golden_nuggets).toHaveLength(1);
			expect(result.golden_nuggets[0]).toEqual({
				type: "tool",
				startContent: "Valid start",
				endContent: "Valid end",
			});
		});

		it("should convert non-string content to strings", () => {
			const responseWithNonStrings = {
				golden_nuggets: [
					{
						type: "model" as const,
						startContent: 123,
						endContent: true,
					},
				],
			};

			const result = normalize(responseWithNonStrings, "openrouter");

			expect(result.golden_nuggets[0].startContent).toBe("123");
			expect(result.golden_nuggets[0].endContent).toBe("true");
		});

		it("should return empty array for invalid response structure", () => {
			const invalidResponse = {
				invalid_field: "not golden_nuggets",
			};

			const result = normalize(invalidResponse, "openai");

			expect(result).toEqual({ golden_nuggets: [] });
			// Note: Console error is not called for this case as it's handled gracefully in preprocessing
		});

		it("should return empty array for response with invalid nugget types", () => {
			const responseWithInvalidType = {
				golden_nuggets: [
					{
						type: "invalid_type",
						startContent: "Test content",
						endContent: "Test content",
					},
				],
			};

			const result = normalize(responseWithInvalidType, "anthropic");

			expect(result).toEqual({ golden_nuggets: [] });
			expect(consoleSpy).toHaveBeenCalled();
		});

		it("should handle null or undefined responses gracefully", () => {
			expect(normalize(null, "gemini")).toEqual({
				golden_nuggets: [],
			});
			expect(normalize(undefined, "openai")).toEqual({
				golden_nuggets: [],
			});
		});

		it("should handle responses with missing required fields", () => {
			const responseWithMissingFields = {
				golden_nuggets: [
					{
						type: "tool" as const,
						startContent: "Has start content",
						// endContent field missing
					},
					{
						type: "aha! moments" as const,
						// startContent field missing
						endContent: "Has end content",
					},
				],
			};

			const result = normalize(responseWithMissingFields, "openrouter");

			// After preprocessing, missing fields become empty strings and get filtered out
			expect(result).toEqual({ golden_nuggets: [] });
			// Console should not be called since preprocessing handles this case gracefully
			expect(consoleSpy).not.toHaveBeenCalled();
		});

		it("should handle all valid nugget types", () => {
			const responseWithAllTypes = {
				golden_nuggets: [
					{
						type: "tool" as const,
						startContent: "Tool start",
						endContent: "Tool end",
					},
					{
						type: "media" as const,
						startContent: "Media start",
						endContent: "Media end",
					},
					{
						type: "aha! moments" as const,
						startContent: "Explanation start",
						endContent: "Explanation end",
					},
					{
						type: "analogy" as const,
						startContent: "Analogy start",
						endContent: "Analogy end",
					},
					{
						type: "model" as const,
						startContent: "Model start",
						endContent: "Model end",
					},
				],
			};

			const result = normalize(responseWithAllTypes, "gemini");

			expect(result.golden_nuggets).toHaveLength(5);
			expect(result.golden_nuggets.map((n) => n.type)).toEqual([
				"tool",
				"media",
				"aha! moments",
				"analogy",
				"model",
			]);
		});
	});

	describe("validate", () => {
		it("should return true for valid response", () => {
			const validResponse = {
				golden_nuggets: [
					{
						type: "tool" as const,
						startContent: "Test start content",
						endContent: "Test end content",
					},
				],
			};

			expect(validate(validResponse)).toBe(true);
		});

		it("should return false for invalid response structure", () => {
			const invalidResponse = {
				invalid_field: "not golden_nuggets",
			};

			expect(validate(invalidResponse)).toBe(false);
		});

		it("should return false for response with invalid nugget types", () => {
			const responseWithInvalidType = {
				golden_nuggets: [
					{
						type: "invalid_type",
						startContent: "Test start content",
						endContent: "Test end content",
					},
				],
			};

			expect(validate(responseWithInvalidType)).toBe(false);
		});

		it("should return true for response with all required fields", () => {
			const responseWithAllFields = {
				golden_nuggets: [
					{
						type: "tool" as const,
						startContent: "Has start content",
						endContent: "Has end content",
					},
				],
			};

			expect(validate(responseWithAllFields)).toBe(true);
		});

		it("should return false for null or undefined", () => {
			expect(validate(null)).toBe(false);
			expect(validate(undefined)).toBe(false);
		});

		it("should return true for empty golden_nuggets array", () => {
			const emptyResponse = {
				golden_nuggets: [],
			};

			expect(validate(emptyResponse)).toBe(true);
		});
	});
});
