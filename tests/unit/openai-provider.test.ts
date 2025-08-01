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
						synthesis: "Test synthesis",
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
		const configWithoutModel = {
			...mockConfig,
			modelName: undefined,
		};

		const provider = new LangChainOpenAIProvider(
			configWithoutModel as ProviderConfig,
		);

		expect(provider.modelName).toBe("gpt-4.1-mini");
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
					synthesis: "Test synthesis",
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
		(ChatOpenAI as ReturnType<typeof vi.fn>).mockImplementationOnce(() => ({
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
});
