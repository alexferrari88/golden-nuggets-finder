import { describe, expect, it, vi } from "vitest";
import { LangChainAnthropicProvider } from "../../src/shared/providers/langchain-anthropic-provider";
import type { ProviderConfig } from "../../src/shared/types/providers";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Mock the LangChain modules
vi.mock("@langchain/anthropic", () => ({
	ChatAnthropic: vi.fn().mockImplementation(() => ({
		withStructuredOutput: vi.fn().mockReturnValue({
			invoke: vi.fn().mockResolvedValue({
				golden_nuggets: [
					{
						type: "tool",
						startContent: "Test content for",
						endContent: "Anthropic provider",
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

describe("LangChainAnthropicProvider", () => {
	const mockConfig: ProviderConfig = {
		providerId: "anthropic",
		apiKey: "sk-ant-test-key",
		modelName: "claude-3-5-haiku-latest",
	};

	it("should create provider with correct configuration", () => {
		const provider = new LangChainAnthropicProvider(mockConfig);

		expect(provider.providerId).toBe("anthropic");
		expect(provider.modelName).toBe("claude-3-5-haiku-latest");
	});

	it("should use default model when not specified", () => {
		const configWithoutModel: ProviderConfig = {
			...mockConfig,
			modelName: "",
		};

		const provider = new LangChainAnthropicProvider(configWithoutModel);

		expect(provider.modelName).toBe("claude-3-5-haiku-latest");
	});

	it("should use custom model when specified", () => {
		const customConfig = {
			...mockConfig,
			modelName: "claude-3-5-haiku-latest",
		};

		const provider = new LangChainAnthropicProvider(customConfig);

		expect(provider.modelName).toBe("claude-3-5-haiku-latest");
	});

	it("should extract golden nuggets successfully", async () => {
		const provider = new LangChainAnthropicProvider(mockConfig);

		const result = await provider.extractGoldenNuggets(
			"Test content for Anthropic",
			"Test prompt for Anthropic",
		);

		expect(result).toEqual({
			golden_nuggets: [
				{
					type: "tool",
					startContent: "Test content for",
					endContent: "Anthropic provider",
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

		const provider = new LangChainAnthropicProvider(mockConfig);

		const isValid = await provider.validateApiKey();

		expect(isValid).toBe(true);
		expect(mockFetch).toHaveBeenCalledWith(
			"https://api.anthropic.com/v1/models",
			{
				headers: {
					"x-api-key": mockConfig.apiKey,
					"anthropic-version": "2023-06-01",
				},
			},
		);
	});

	it("should handle API errors gracefully during extraction", async () => {
		const { ChatAnthropic } = await import("@langchain/anthropic");

		// Mock a failure for this test
		(ChatAnthropic as ReturnType<typeof vi.fn>).mockImplementationOnce(() => ({
			withStructuredOutput: vi.fn().mockReturnValue({
				invoke: vi.fn().mockRejectedValue(new Error("Anthropic API Error")),
			}),
		}));

		const provider = new LangChainAnthropicProvider(mockConfig);

		await expect(provider.extractGoldenNuggets("test", "test")).rejects.toThrow(
			"Anthropic API call failed: Anthropic API Error",
		);
	});

	it("should handle API key validation failure", async () => {
		// Mock failed API response
		mockFetch.mockResolvedValueOnce({
			ok: false,
			status: 401,
		});

		const provider = new LangChainAnthropicProvider(mockConfig);

		const isValid = await provider.validateApiKey();

		expect(isValid).toBe(false);
	});

	it("should handle malformed response during validation", async () => {
		const { ChatAnthropic } = await import("@langchain/anthropic");

		// Mock a malformed response (missing golden_nuggets field)
		(ChatAnthropic as ReturnType<typeof vi.fn>).mockImplementationOnce(() => ({
			withStructuredOutput: vi.fn().mockReturnValue({
				invoke: vi.fn().mockResolvedValue({
					// Missing golden_nuggets field - malformed response
				}),
			}),
		}));

		const provider = new LangChainAnthropicProvider(mockConfig);

		const isValid = await provider.validateApiKey();

		expect(isValid).toBe(false);
	});

	it("should handle empty golden nuggets array during validation", async () => {
		// Mock successful API response
		mockFetch.mockResolvedValueOnce({
			ok: true,
			status: 200,
		});

		const provider = new LangChainAnthropicProvider(mockConfig);

		const isValid = await provider.validateApiKey();

		expect(isValid).toBe(true); // API key validation should succeed regardless of response content
	});

	it("should handle credit balance errors appropriately", async () => {
		const { ChatAnthropic } = await import("@langchain/anthropic");

		// Mock credit balance error
		(ChatAnthropic as ReturnType<typeof vi.fn>).mockImplementationOnce(() => ({
			withStructuredOutput: vi.fn().mockReturnValue({
				invoke: vi
					.fn()
					.mockRejectedValue(
						new Error(
							"Your credit balance is too low to access the Anthropic API",
						),
					),
			}),
		}));

		const provider = new LangChainAnthropicProvider(mockConfig);

		await expect(provider.extractGoldenNuggets("test", "test")).rejects.toThrow(
			"Anthropic API call failed: Your credit balance is too low to access the Anthropic API",
		);
	});

	it("should handle rate limit errors appropriately", async () => {
		const { ChatAnthropic } = await import("@langchain/anthropic");

		// Mock rate limit error
		(ChatAnthropic as ReturnType<typeof vi.fn>).mockImplementationOnce(() => ({
			withStructuredOutput: vi.fn().mockReturnValue({
				invoke: vi.fn().mockRejectedValue(new Error("Rate limit exceeded")),
			}),
		}));

		const provider = new LangChainAnthropicProvider(mockConfig);

		await expect(provider.extractGoldenNuggets("test", "test")).rejects.toThrow(
			"Anthropic API call failed: Rate limit exceeded",
		);
	});

	it("should handle null response during validation", async () => {
		const { ChatAnthropic } = await import("@langchain/anthropic");

		// Mock a null response
		(ChatAnthropic as ReturnType<typeof vi.fn>).mockImplementationOnce(() => ({
			withStructuredOutput: vi.fn().mockReturnValue({
				invoke: vi.fn().mockResolvedValue(null),
			}),
		}));

		const provider = new LangChainAnthropicProvider(mockConfig);

		const isValid = await provider.validateApiKey();

		expect(isValid).toBe(false);
	});

	it("should handle undefined golden_nuggets field during validation", async () => {
		const { ChatAnthropic } = await import("@langchain/anthropic");

		// Mock response with undefined golden_nuggets
		(ChatAnthropic as ReturnType<typeof vi.fn>).mockImplementationOnce(() => ({
			withStructuredOutput: vi.fn().mockReturnValue({
				invoke: vi.fn().mockResolvedValue({
					golden_nuggets: undefined,
				}),
			}),
		}));

		const provider = new LangChainAnthropicProvider(mockConfig);

		const isValid = await provider.validateApiKey();

		expect(isValid).toBe(false);
	});
});
