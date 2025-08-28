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
						type: "aha! moments" as const,
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
						type: "aha! moments",
						startContent: "Complex concepts",
						endContent: "are simplified here",
					},
				],
			});

			// Verify GeminiClient was called correctly
			expect(mockGeminiClient.analyzeContent).toHaveBeenCalledWith(
				"test content",
				"test prompt",
				undefined, // progressOptions
				undefined, // temperature (not provided)
				"gemini-2.5-flash", // model name
			);
		});

		it("should pass temperature parameter to GeminiClient", async () => {
			mockGeminiClient.analyzeContent.mockResolvedValue({
				golden_nuggets: [],
			});

			await provider.extractGoldenNuggets("test content", "test prompt", 0.7);

			expect(mockGeminiClient.analyzeContent).toHaveBeenCalledWith(
				"test content",
				"test prompt",
				undefined, // progressOptions
				0.7, // temperature
				"gemini-2.5-flash", // model name
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

	describe("Phase 1 High Recall Extraction", () => {
		it("should extract Phase 1 nuggets with confidence scores", async () => {
			// Mock Phase 1 response with fullContent and confidence
			const mockPhase1Response = {
				golden_nuggets: [
					{
						type: "tool" as const,
						fullContent: "Complete tool description with all necessary details",
						confidence: 0.87,
					},
					{
						type: "aha! moments" as const,
						fullContent: "Deep insight that explains complex concept clearly",
						confidence: 0.94,
					},
				],
			};

			mockGeminiClient.analyzeContent.mockResolvedValue(mockPhase1Response);

			const result = await provider.extractPhase1HighRecall(
				"Test content for Phase 1 high recall extraction",
				"Test Phase 1 prompt",
				0.7,
			);

			expect(result).toEqual({
				golden_nuggets: [
					{
						type: "tool",
						fullContent: "Complete tool description with all necessary details",
						confidence: 0.87,
					},
					{
						type: "aha! moments",
						fullContent: "Deep insight that explains complex concept clearly",
						confidence: 0.94,
					},
				],
			});

			// Verify correct parameters passed to GeminiClient
			expect(mockGeminiClient.analyzeContent).toHaveBeenCalledWith(
				"Test content for Phase 1 high recall extraction",
				"Test Phase 1 prompt",
				expect.objectContaining({
					responseSchema: expect.objectContaining({
						type: "object",
						properties: expect.objectContaining({
							golden_nuggets: expect.objectContaining({
								items: expect.objectContaining({
									properties: expect.objectContaining({
										fullContent: expect.any(Object),
										confidence: expect.any(Object),
									}),
								}),
							}),
						}),
					}),
				}),
				0.7, // temperature
				"gemini-2.5-flash", // model
			);
		});

		it("should handle Phase 1 extraction errors", async () => {
			const testError = new Error("Phase 1 API error");
			mockGeminiClient.analyzeContent.mockRejectedValue(testError);

			await expect(
				provider.extractPhase1HighRecall("test content", "test prompt", 0.7),
			).rejects.toThrow("Phase 1 API error");
		});

		it("should use default temperature for Phase 1", async () => {
			mockGeminiClient.analyzeContent.mockResolvedValue({
				golden_nuggets: [],
			});

			await provider.extractPhase1HighRecall("test content", "test prompt");

			// Should use default Phase 1 temperature (0.7)
			expect(mockGeminiClient.analyzeContent).toHaveBeenCalledWith(
				"test content",
				"test prompt",
				expect.any(Object),
				0.7, // default temperature
				"gemini-2.5-flash",
			);
		});

		it("should support type filtering in Phase 1", async () => {
			mockGeminiClient.analyzeContent.mockResolvedValue({
				golden_nuggets: [
					{
						type: "analogy",
						fullContent: "Only analogies should be extracted",
						confidence: 0.9,
					},
				],
			});

			const result = await provider.extractPhase1HighRecall(
				"test content",
				"test prompt",
				0.7,
				["analogy"], // Filter only analogies
			);

			expect(result.golden_nuggets).toHaveLength(1);
			expect(result.golden_nuggets[0].type).toBe("analogy");
		});
	});

	describe("Phase 2 High Precision Extraction", () => {
		it("should extract Phase 2 nuggets with boundary detection", async () => {
			// Mock Phase 2 response with startContent/endContent
			const mockPhase2Response = {
				golden_nuggets: [
					{
						type: "analogy" as const,
						startContent: "Think of it",
						endContent: "like a framework",
						confidence: 0.89,
					},
				],
			};

			mockGeminiClient.analyzeContent.mockResolvedValue(mockPhase2Response);

			const nuggets = [
				{
					type: "analogy" as const,
					fullContent:
						"Think of it like building a house, you need a solid foundation like a framework",
					confidence: 0.85,
				},
			];

			const result = await provider.extractPhase2HighPrecision(
				"Original content: Think of it like building a house, you need a solid foundation like a framework for success",
				"Test Phase 2 prompt",
				nuggets,
				0.0,
			);

			expect(result).toEqual({
				golden_nuggets: [
					{
						type: "analogy",
						startContent: "Think of it",
						endContent: "like a framework",
						confidence: 0.89,
					},
				],
			});

			// Verify correct parameters for Phase 2
			expect(mockGeminiClient.analyzeContent).toHaveBeenCalledWith(
				"Original content: Think of it like building a house, you need a solid foundation like a framework for success",
				expect.stringContaining("NUGGETS TO PROCESS"), // Phase 2 prompt with context
				expect.objectContaining({
					responseSchema: expect.objectContaining({
						type: "object",
						properties: expect.objectContaining({
							golden_nuggets: expect.objectContaining({
								items: expect.objectContaining({
									properties: expect.objectContaining({
										startContent: expect.any(Object),
										endContent: expect.any(Object),
									}),
								}),
							}),
						}),
					}),
				}),
				0.0, // high precision temperature
				"gemini-2.5-flash", // model
			);
		});

		it("should handle Phase 2 extraction errors", async () => {
			const testError = new Error("Phase 2 API error");
			mockGeminiClient.analyzeContent.mockRejectedValue(testError);

			const nuggets = [
				{
					type: "tool" as const,
					fullContent: "test content",
					confidence: 0.85,
				},
			];

			await expect(
				provider.extractPhase2HighPrecision(
					"original content",
					"test prompt",
					nuggets,
					0.0,
				),
			).rejects.toThrow("Phase 2 API error");
		});

		it("should use high precision temperature for Phase 2", async () => {
			mockGeminiClient.analyzeContent.mockResolvedValue({
				golden_nuggets: [],
			});

			const nuggets = [
				{
					type: "tool" as const,
					fullContent: "test content",
					confidence: 0.85,
				},
			];

			await provider.extractPhase2HighPrecision(
				"original content",
				"test prompt",
				nuggets,
				0.0,
			);

			// Should use Phase 2 high precision temperature (0.0)
			expect(mockGeminiClient.analyzeContent).toHaveBeenCalledWith(
				"original content",
				expect.any(String),
				expect.any(Object),
				0.0, // high precision temperature
				"gemini-2.5-flash",
			);
		});

		it("should handle empty nuggets array in Phase 2", async () => {
			mockGeminiClient.analyzeContent.mockResolvedValue({
				golden_nuggets: [],
			});

			const result = await provider.extractPhase2HighPrecision(
				"original content",
				"test prompt",
				[], // Empty nuggets array
				0.0,
			);

			expect(result.golden_nuggets).toEqual([]);
		});

		it("should build Phase 2 prompt with nuggets context", async () => {
			mockGeminiClient.analyzeContent.mockResolvedValue({
				golden_nuggets: [],
			});

			const nuggets = [
				{
					type: "tool" as const,
					fullContent: "Some tool description",
					confidence: 0.85,
				},
				{
					type: "analogy" as const,
					fullContent: "Some analogy explanation",
					confidence: 0.92,
				},
			];

			await provider.extractPhase2HighPrecision(
				"original content",
				"Phase 2 base prompt",
				nuggets,
				0.0,
			);

			// Verify that the prompt includes nuggets context
			const callArgs = mockGeminiClient.analyzeContent.mock.calls[0];
			const promptWithContext = callArgs[1] as string;

			expect(promptWithContext).toContain("NUGGETS TO PROCESS");
			expect(promptWithContext).toContain("Some tool description");
			expect(promptWithContext).toContain("Some analogy explanation");
			expect(promptWithContext).toContain("original content");
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
