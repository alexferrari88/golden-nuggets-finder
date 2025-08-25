import { beforeEach, describe, expect, it, vi } from "vitest";
import { GeminiClient } from "../../src/background/gemini-client";
import { GeminiDirectProvider } from "../../src/shared/providers/gemini-direct-provider";

// Mock types
interface MockGeminiClient {
	analyzeContent: ReturnType<typeof vi.fn>;
	validateApiKey: ReturnType<typeof vi.fn>;
}

interface GeminiDirectProviderWithClient {
	geminiClient: MockGeminiClient;
}

// Mock GeminiClient
vi.mock("../../src/background/gemini-client", () => ({
	GeminiClient: vi.fn().mockImplementation(() => ({
		analyzeContent: vi.fn(),
		validateApiKey: vi.fn(),
	})),
}));

describe("GeminiDirectProvider", () => {
	let provider: GeminiDirectProvider;
	let mockGeminiClient: MockGeminiClient;

	beforeEach(() => {
		vi.clearAllMocks();

		provider = new GeminiDirectProvider({
			providerId: "gemini",
			apiKey: "test-api-key",
			modelName: "gemini-2.5-flash",
		});

		// Get the mocked GeminiClient instance
		mockGeminiClient = (provider as GeminiDirectProviderWithClient)
			.geminiClient;
	});

	describe("Provider Interface", () => {
		it("should implement LLMProvider interface correctly", () => {
			expect(provider.providerId).toBe("gemini");
			expect(provider.modelName).toBe("gemini-2.5-flash");
			expect(typeof provider.extractGoldenNuggets).toBe("function");
			expect(typeof provider.validateApiKey).toBe("function");
		});

		it("should use default model name when not provided", () => {
			const defaultProvider = new GeminiDirectProvider({
				providerId: "gemini",
				apiKey: "test-api-key",
				modelName: "",
			});

			expect(defaultProvider.modelName).toBe("gemini-2.5-flash");
		});
	});

	describe("extractGoldenNuggets", () => {
		it("should transform GeminiResponse to GoldenNuggetsResponse format", async () => {
			// Mock GeminiClient response (with startContent/endContent format)
			const mockGeminiResponse = {
				golden_nuggets: [
					{
						type: "tool" as const,
						startContent: "This is a test",
						endContent: "for the system",
					},
					{
						type: "explanation" as const,
						startContent: "Complex concepts",
						endContent: "are simplified here",
					},
				],
			};

			mockGeminiClient.analyzeContent.mockResolvedValue(mockGeminiResponse);

			const result = await provider.extractGoldenNuggets(
				"test content",
				"test prompt",
			);

			// Verify the transformation to GoldenNuggetsResponse format
			expect(result).toEqual({
				golden_nuggets: [
					{
						type: "tool",
						startContent: "This is a test",
						endContent: "for the system",
					},
					{
						type: "explanation",
						startContent: "Complex concepts",
						endContent: "are simplified here",
					},
				],
			});

			// Verify GeminiClient was called correctly
			expect(mockGeminiClient.analyzeContent).toHaveBeenCalledWith(
				"test content",
				"test prompt",
			);
		});

		it("should handle empty response", async () => {
			mockGeminiClient.analyzeContent.mockResolvedValue({
				golden_nuggets: [],
			});

			const result = await provider.extractGoldenNuggets(
				"test content",
				"test prompt",
			);

			expect(result).toEqual({
				golden_nuggets: [],
			});
		});

		it("should propagate errors from GeminiClient", async () => {
			const testError = new Error("Gemini API error");
			mockGeminiClient.analyzeContent.mockRejectedValue(testError);

			await expect(
				provider.extractGoldenNuggets("test content", "test prompt"),
			).rejects.toThrow("Gemini API error");
		});
	});

	describe("validateApiKey", () => {
		it("should delegate to GeminiClient validateApiKey method", async () => {
			mockGeminiClient.validateApiKey.mockResolvedValue(true);

			const result = await provider.validateApiKey();

			expect(result).toBe(true);
			expect(mockGeminiClient.validateApiKey).toHaveBeenCalledWith(
				"test-api-key",
			);
		});

		it("should return false and log warning on validation error", async () => {
			const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
			mockGeminiClient.validateApiKey.mockRejectedValue(
				new Error("Invalid API key"),
			);

			const result = await provider.validateApiKey();

			expect(result).toBe(false);
			expect(consoleSpy).toHaveBeenCalledWith(
				"Gemini API key validation failed:",
				"Invalid API key",
			);

			consoleSpy.mockRestore();
		});

		it("should return false when GeminiClient returns false", async () => {
			mockGeminiClient.validateApiKey.mockResolvedValue(false);

			const result = await provider.validateApiKey();

			expect(result).toBe(false);
		});
	});

	describe("Integration", () => {
		it("should preserve existing Gemini functionality", async () => {
			// This test ensures we don't break existing Gemini behavior
			const provider = new GeminiDirectProvider({
				providerId: "gemini",
				apiKey: "sk-test-key",
				modelName: "gemini-2.5-flash",
			});

			// Should create GeminiClient instance
			expect(GeminiClient).toHaveBeenCalled();

			// Should have correct provider ID
			expect(provider.providerId).toBe("gemini");

			// Should maintain model name
			expect(provider.modelName).toBe("gemini-2.5-flash");
		});
	});
});
