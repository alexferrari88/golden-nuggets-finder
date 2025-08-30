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
						fullContent: "Test content 1",
						confidence: 0.9,
					},
					{
						type: "aha! moments" as const,
						fullContent: "Test content 2",
						confidence: 0.8,
					},
				],
			};

			const result = normalize(validResponse, "openai");

			expect(result).toEqual({
				golden_nuggets: [
					{
						type: "tool",
						fullContent: "Test content 1",
						confidence: 0.9,
						validationScore: undefined,
						extractionMethod: "llm",
					},
					{
						type: "aha! moments",
						fullContent: "Test content 2",
						confidence: 0.8,
						validationScore: undefined,
						extractionMethod: "llm",
					},
				],
			});
		});

		it("should trim whitespace from content", () => {
			const responseWithWhitespace = {
				golden_nuggets: [
					{
						type: "tool" as const,
						fullContent: "  Test full content  ",
						confidence: 0.9,
					},
				],
			};

			const result = normalize(responseWithWhitespace, "anthropic");

			expect(result.golden_nuggets[0].fullContent).toBe("Test full content");
		});

		it("should filter out nuggets with empty content", () => {
			const responseWithEmpty = {
				golden_nuggets: [
					{
						type: "tool" as const,
						fullContent: "Valid full content",
						confidence: 0.9,
					},
					{
						type: "aha! moments" as const,
						fullContent: "",
						confidence: 0.5,
					},
					{
						type: "analogy" as const,
						fullContent: "   ",
						confidence: 0.3,
					},
				],
			};

			const result = normalize(responseWithEmpty, "gemini");

			expect(result.golden_nuggets).toHaveLength(1);
			expect(result.golden_nuggets[0]).toEqual({
				type: "tool",
				fullContent: "Valid full content",
				confidence: 0.9,
				validationScore: undefined,
				extractionMethod: "llm",
			});
		});

		it("should convert non-string content to strings", () => {
			const responseWithNonStrings = {
				golden_nuggets: [
					{
						type: "model" as const,
						fullContent: 123,
						confidence: 0.8,
					},
				],
			};

			const result = normalize(responseWithNonStrings, "openrouter");

			expect(result.golden_nuggets[0].fullContent).toBe("123");
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
						fullContent: "Test content",
						confidence: 0.8,
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

		it("should reject legacy boundary format (no backward compatibility)", () => {
			const responseWithBoundaries = {
				golden_nuggets: [
					{
						type: "tool" as const,
						startContent: "Use advanced debugging",
						endContent: "techniques for complex problems",
						confidence: 0.8,
						// NO fullContent - should be rejected
					},
					{
						type: "aha! moments" as const,
						// NO fullContent - should be rejected
						startContent: "Complete explanation content",
						confidence: 0.7,
					},
				],
			};

			const result = normalize(responseWithBoundaries, "openrouter");

			// Should return empty array - NO backward compatibility
			expect(result.golden_nuggets).toEqual([]);
		});

		it("should handle all valid nugget types", () => {
			const responseWithAllTypes = {
				golden_nuggets: [
					{
						type: "tool" as const,
						fullContent: "Tool content",
						confidence: 0.9,
					},
					{
						type: "media" as const,
						fullContent: "Media content",
						confidence: 0.8,
					},
					{
						type: "aha! moments" as const,
						fullContent: "Explanation content",
						confidence: 0.7,
					},
					{
						type: "analogy" as const,
						fullContent: "Analogy content",
						confidence: 0.6,
					},
					{
						type: "model" as const,
						fullContent: "Model content",
						confidence: 0.5,
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
						fullContent: "Test full content",
						confidence: 0.8,
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
						fullContent: "Test full content",
						confidence: 0.8,
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
						fullContent: "Has full content",
						confidence: 0.9,
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
