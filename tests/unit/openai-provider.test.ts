import { describe, expect, it, vi } from "vitest";
import { LangChainOpenAIProvider } from "../../src/shared/providers/langchain-openai-provider";
import type { ProviderConfig } from "../../src/shared/types/providers";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Mock the LangChain modules
vi.mock("@langchain/openai", () => ({
	ChatOpenAI: vi.fn().mockImplementation(() => ({
		withStructuredOutput: vi.fn().mockReturnValue({
			invoke: vi.fn().mockResolvedValue({
				golden_nuggets: [
					{
						type: "tool",
						startContent: "Test content",
						endContent: "Test content",
					},
				],
			}),
		}),
	})),
}));

vi.mock("@langchain/core/messages", () => ({
	HumanMessage: vi.fn(),
	SystemMessage: vi.fn(),
}));

describe("LangChainOpenAIProvider", () => {
	const mockConfig: ProviderConfig = {
		providerId: "openai",
		apiKey: "test-key",
		modelName: "gpt-4.1-mini",
	};

	it("should create provider with correct configuration", () => {
		const provider = new LangChainOpenAIProvider(mockConfig);

		expect(provider.providerId).toBe("openai");
		expect(provider.modelName).toBe("gpt-4.1-mini");
	});

	it("should use default model when not specified", () => {
		const configWithoutModel: ProviderConfig = {
			...mockConfig,
			modelName: "",
		};

		const provider = new LangChainOpenAIProvider(configWithoutModel);

		expect(provider.modelName).toBe("gpt-5-mini");
	});

	it("should extract golden nuggets successfully", async () => {
		const provider = new LangChainOpenAIProvider(mockConfig);

		const result = await provider.extractGoldenNuggets(
			"Test content",
			"Test prompt",
		);

		expect(result).toEqual({
			golden_nuggets: [
				{
					type: "tool",
					startContent: "Test content",
					endContent: "Test content",
				},
			],
		});
	});

	it("should validate API key successfully", async () => {
		// Mock successful API response
		mockFetch.mockResolvedValueOnce({
			ok: true,
			status: 200,
		});

		const provider = new LangChainOpenAIProvider(mockConfig);

		const isValid = await provider.validateApiKey();

		expect(isValid).toBe(true);
		expect(mockFetch).toHaveBeenCalledWith("https://api.openai.com/v1/models", {
			headers: {
				Authorization: `Bearer ${mockConfig.apiKey}`,
			},
		});
	});

	it("should handle API errors gracefully", async () => {
		const { ChatOpenAI } = await import("@langchain/openai");

		// Mock a failure for this test
		(ChatOpenAI as any).mockImplementationOnce(() => ({
			withStructuredOutput: vi.fn().mockReturnValue({
				invoke: vi.fn().mockRejectedValue(new Error("API Error")),
			}),
		}));

		const provider = new LangChainOpenAIProvider(mockConfig);

		await expect(provider.extractGoldenNuggets("test", "test")).rejects.toThrow(
			"OpenAI API call failed: API Error",
		);
	});

	it("should handle API key validation failure", async () => {
		// Mock failed API response
		mockFetch.mockResolvedValueOnce({
			ok: false,
			status: 401,
		});

		const provider = new LangChainOpenAIProvider(mockConfig);

		const isValid = await provider.validateApiKey();

		expect(isValid).toBe(false);
	});

	describe("Phase 1 High Recall Extraction", () => {
		it("should extract Phase 1 nuggets with confidence scores", async () => {
			const { ChatOpenAI } = await import("@langchain/openai");

			// Mock Phase 1 response with confidence scores
			(ChatOpenAI as any).mockImplementationOnce(() => ({
				withStructuredOutput: vi.fn().mockReturnValue({
					invoke: vi.fn().mockResolvedValue({
						golden_nuggets: [
							{
								type: "media",
								fullContent: "Complete book recommendation with all details",
								confidence: 0.87,
							},
							{
								type: "model",
								fullContent: "Complete mental model description with context",
								confidence: 0.93,
							},
						],
					}),
				}),
			}));

			const provider = new LangChainOpenAIProvider(mockConfig);

			const result = await provider.extractPhase1HighRecall(
				"Test content for Phase 1 high recall extraction",
				"Test Phase 1 prompt",
				0.7,
			);

			expect(result).toEqual({
				golden_nuggets: [
					{
						type: "media",
						fullContent: "Complete book recommendation with all details",
						confidence: 0.87,
					},
					{
						type: "model",
						fullContent: "Complete mental model description with context",
						confidence: 0.93,
					},
				],
			});
		});

		it("should handle Phase 1 extraction errors", async () => {
			const { ChatOpenAI } = await import("@langchain/openai");

			// Mock Phase 1 error
			(ChatOpenAI as any).mockImplementationOnce(() => ({
				withStructuredOutput: vi.fn().mockReturnValue({
					invoke: vi.fn().mockRejectedValue(new Error("Phase 1 API Error")),
				}),
			}));

			const provider = new LangChainOpenAIProvider(mockConfig);

			await expect(
				provider.extractPhase1HighRecall("test content", "test prompt", 0.7),
			).rejects.toThrow("OpenAI Phase 1 API call failed: Phase 1 API Error");
		});

		it("should use default temperature for Phase 1", async () => {
			const { ChatOpenAI } = await import("@langchain/openai");

			const mockChatOpenAI = vi.fn().mockReturnValue({
				withStructuredOutput: vi.fn().mockReturnValue({
					invoke: vi.fn().mockResolvedValue({
						golden_nuggets: [],
					}),
				}),
			});
			(ChatOpenAI as any).mockImplementationOnce(mockChatOpenAI);

			const provider = new LangChainOpenAIProvider(mockConfig);

			await provider.extractPhase1HighRecall("test content", "test prompt");

			expect(mockChatOpenAI).toHaveBeenCalledWith({
				apiKey: mockConfig.apiKey,
				model: mockConfig.modelName,
				temperature: 0.7, // Default temperature
			});
		});

		it("should support type filtering in Phase 1", async () => {
			const { ChatOpenAI } = await import("@langchain/openai");

			// Mock successful response
			(ChatOpenAI as any).mockImplementationOnce(() => ({
				withStructuredOutput: vi.fn().mockReturnValue({
					invoke: vi.fn().mockResolvedValue({
						golden_nuggets: [
							{
								type: "media",
								fullContent: "Only media should be extracted",
								confidence: 0.9,
							},
						],
					}),
				}),
			}));

			const provider = new LangChainOpenAIProvider(mockConfig);

			const result = await provider.extractPhase1HighRecall(
				"test content",
				"test prompt",
				0.7,
				["media"], // Filter only media
			);

			expect(result.golden_nuggets).toHaveLength(1);
			expect(result.golden_nuggets[0].type).toBe("media");
		});
	});

	describe("Phase 2 High Precision Extraction", () => {
		it("should extract Phase 2 nuggets with boundary detection", async () => {
			const { ChatOpenAI } = await import("@langchain/openai");

			// Mock Phase 2 response with start/end boundaries
			(ChatOpenAI as any).mockImplementationOnce(() => ({
				withStructuredOutput: vi.fn().mockReturnValue({
					invoke: vi.fn().mockResolvedValue({
						golden_nuggets: [
							{
								type: "media",
								startContent: "The book",
								endContent: "highly recommended read",
								confidence: 0.91,
							},
						],
					}),
				}),
			}));

			const provider = new LangChainOpenAIProvider(mockConfig);

			const nuggets = [
				{
					type: "media" as const,
					fullContent:
						"The book 'Deep Work' by Cal Newport is a highly recommended read",
					confidence: 0.85,
				},
			];

			const result = await provider.extractPhase2HighPrecision(
				"Original content containing: The book 'Deep Work' by Cal Newport is a highly recommended read for productivity",
				"Test Phase 2 prompt",
				nuggets,
				0.0,
			);

			expect(result).toEqual({
				golden_nuggets: [
					{
						type: "media",
						startContent: "The book",
						endContent: "highly recommended read",
						confidence: 0.91,
					},
				],
			});
		});

		it("should handle Phase 2 extraction errors", async () => {
			const { ChatOpenAI } = await import("@langchain/openai");

			// Mock Phase 2 error
			(ChatOpenAI as any).mockImplementationOnce(() => ({
				withStructuredOutput: vi.fn().mockReturnValue({
					invoke: vi.fn().mockRejectedValue(new Error("Phase 2 API Error")),
				}),
			}));

			const provider = new LangChainOpenAIProvider(mockConfig);

			const nuggets = [
				{
					type: "media" as const,
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
			).rejects.toThrow("OpenAI Phase 2 API call failed: Phase 2 API Error");
		});

		it("should use high precision temperature for Phase 2", async () => {
			const { ChatOpenAI } = await import("@langchain/openai");

			const mockChatOpenAI = vi.fn().mockReturnValue({
				withStructuredOutput: vi.fn().mockReturnValue({
					invoke: vi.fn().mockResolvedValue({
						golden_nuggets: [],
					}),
				}),
			});
			(ChatOpenAI as any).mockImplementationOnce(mockChatOpenAI);

			const provider = new LangChainOpenAIProvider(mockConfig);

			const nuggets = [
				{
					type: "media" as const,
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

			expect(mockChatOpenAI).toHaveBeenCalledWith({
				apiKey: mockConfig.apiKey,
				model: mockConfig.modelName,
				temperature: 0.0, // High precision temperature
			});
		});

		it("should handle empty nuggets array in Phase 2", async () => {
			const { ChatOpenAI } = await import("@langchain/openai");

			// Mock empty response
			(ChatOpenAI as any).mockImplementationOnce(() => ({
				withStructuredOutput: vi.fn().mockReturnValue({
					invoke: vi.fn().mockResolvedValue({
						golden_nuggets: [],
					}),
				}),
			}));

			const provider = new LangChainOpenAIProvider(mockConfig);

			const result = await provider.extractPhase2HighPrecision(
				"original content",
				"test prompt",
				[], // Empty nuggets
				0.0,
			);

			expect(result.golden_nuggets).toEqual([]);
		});
	});
});
