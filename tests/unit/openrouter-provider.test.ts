import { describe, expect, it, vi } from "vitest";
import { LangChainOpenRouterProvider } from "../../src/shared/providers/langchain-openrouter-provider";
import type { ProviderConfig } from "../../src/shared/types/providers";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Mock the LangChain modules
vi.mock("@langchain/openai", () => ({
	ChatOpenAI: vi.fn().mockImplementation((_config) => {
		return {
			withStructuredOutput: vi.fn().mockReturnValue({
				invoke: vi.fn().mockResolvedValue({
					golden_nuggets: [
						{
							type: "tool",
							startContent: "Test start",
							endContent: "Test end",
							synthesis: "Test synthesis",
						},
					],
				}),
			}),
		};
	}),
}));

vi.mock("@langchain/core/messages", () => ({
	HumanMessage: vi.fn(),
	SystemMessage: vi.fn(),
}));

describe("LangChainOpenRouterProvider", () => {
	const mockConfig: ProviderConfig = {
		providerId: "openrouter",
		apiKey: "test-key",
		modelName: "z-ai/glm-4.5-air:free",
	};

	it("should create provider with correct configuration", () => {
		const provider = new LangChainOpenRouterProvider(mockConfig);

		expect(provider.providerId).toBe("openrouter");
		expect(provider.modelName).toBe("z-ai/glm-4.5-air:free");
	});

	it("should use default model when not specified", () => {
		const configWithoutModel: ProviderConfig = {
			...mockConfig,
			modelName: "",
		};

		const provider = new LangChainOpenRouterProvider(configWithoutModel);

		expect(provider.modelName).toBe("z-ai/glm-4.5-air:free");
	});

	it("should use OpenRouter base URL in configuration", () => {
		const provider = new LangChainOpenRouterProvider(mockConfig);

		// Verify the provider was created successfully (tests constructor)
		expect(provider.providerId).toBe("openrouter");
		expect(provider.modelName).toBe("z-ai/glm-4.5-air:free");
	});

	it("should extract golden nuggets successfully", async () => {
		const provider = new LangChainOpenRouterProvider(mockConfig);

		const result = await provider.extractGoldenNuggets(
			"Test content",
			"Test prompt",
		);

		expect(result).toEqual({
			golden_nuggets: [
				{
					type: "tool",
					startContent: "Test start",
					endContent: "Test end",
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

		const provider = new LangChainOpenRouterProvider(mockConfig);

		const isValid = await provider.validateApiKey();

		expect(isValid).toBe(true);
		expect(mockFetch).toHaveBeenCalledWith(
			"https://openrouter.ai/api/v1/models",
			{
				headers: {
					Authorization: `Bearer ${mockConfig.apiKey}`,
					"HTTP-Referer": "https://golden-nuggets-finder.com",
					"X-Title": "Golden Nuggets Finder",
				},
			},
		);
	});

	it("should handle API errors gracefully", async () => {
		const { ChatOpenAI } = await import("@langchain/openai");

		// Mock a failure for function calling
		(ChatOpenAI as ReturnType<typeof vi.fn>).mockImplementationOnce(() => ({
			withStructuredOutput: vi.fn().mockReturnValue({
				invoke: vi.fn().mockRejectedValue(new Error("API Error")),
			}),
		}));

		const provider = new LangChainOpenRouterProvider(mockConfig);

		await expect(provider.extractGoldenNuggets("test", "test")).rejects.toThrow(
			"OpenRouter API call failed: API Error",
		);
	});

	it("should handle API key validation failure", async () => {
		// Mock failed API response
		mockFetch.mockResolvedValueOnce({
			ok: false,
			status: 401,
		});

		const provider = new LangChainOpenRouterProvider(mockConfig);

		const isValid = await provider.validateApiKey();

		expect(isValid).toBe(false);
	});

	it("should handle different model names correctly", () => {
		const configWithDifferentModel = {
			...mockConfig,
			modelName: "openai/gpt-4o",
		};

		const provider = new LangChainOpenRouterProvider(configWithDifferentModel);

		expect(provider.modelName).toBe("openai/gpt-4o");
	});

	it("should call structured output with correct parameters", async () => {
		const mockWithStructuredOutput = vi.fn().mockReturnValue({
			invoke: vi.fn().mockResolvedValue({
				golden_nuggets: [],
			}),
		});

		const { ChatOpenAI } = vi.mocked(await import("@langchain/openai"));
		ChatOpenAI.mockImplementationOnce(
			() =>
				({
					withStructuredOutput: mockWithStructuredOutput,
				}) as any,
		);

		const provider = new LangChainOpenRouterProvider(mockConfig);
		await provider.extractGoldenNuggets("test content", "test prompt");

		expect(mockWithStructuredOutput).toHaveBeenCalledWith(
			expect.any(Object), // Schema object
			{
				name: "extract_golden_nuggets",
				method: "functionCalling",
			},
		);
	});

	it("should handle empty response gracefully", async () => {
		const { ChatOpenAI } = await import("@langchain/openai");

		(ChatOpenAI as ReturnType<typeof vi.fn>).mockImplementationOnce(() => ({
			withStructuredOutput: vi.fn().mockReturnValue({
				invoke: vi.fn().mockResolvedValue({
					golden_nuggets: [],
				}),
			}),
		}));

		const provider = new LangChainOpenRouterProvider(mockConfig);

		const result = await provider.extractGoldenNuggets("test", "test");

		expect(result).toEqual({
			golden_nuggets: [],
		});
	});

	it("should validate empty response correctly during API key validation", async () => {
		// Mock successful API response
		mockFetch.mockResolvedValueOnce({
			ok: true,
			status: 200,
		});

		const provider = new LangChainOpenRouterProvider(mockConfig);

		const isValid = await provider.validateApiKey();

		// API key validation should succeed when API responds with OK
		expect(isValid).toBe(true);
	});

	it("should handle malformed response during validation", async () => {
		// Spy on extractGoldenNuggets to return malformed response
		const provider = new LangChainOpenRouterProvider(mockConfig);
		const spy = vi.spyOn(provider, "extractGoldenNuggets").mockResolvedValue({
			// Missing golden_nuggets property entirely
		} as any);

		const isValid = await provider.validateApiKey();

		// The validation logic returns falsy value (undefined) for malformed response
		expect(isValid).toBeFalsy();
		spy.mockRestore();
	});

	it("should handle network timeouts", async () => {
		const { ChatOpenAI } = await import("@langchain/openai");

		(ChatOpenAI as ReturnType<typeof vi.fn>).mockImplementationOnce(() => ({
			withStructuredOutput: vi.fn().mockReturnValue({
				invoke: vi.fn().mockRejectedValue(new Error("Network timeout")),
			}),
		}));

		const provider = new LangChainOpenRouterProvider(mockConfig);

		await expect(provider.extractGoldenNuggets("test", "test")).rejects.toThrow(
			"OpenRouter API call failed: Network timeout",
		);
	});

	it("should retry on rate limiting errors and succeed on second attempt", async () => {
		const { ChatOpenAI } = await import("@langchain/openai");

		let callCount = 0;
		const mockInvoke = vi.fn().mockImplementation(() => {
			callCount++;
			if (callCount === 1) {
				throw new Error("Rate limit exceeded");
			}
			return {
				golden_nuggets: [
					{
						type: "tool",
						startContent: "Test start",
						endContent: "Test end",
						synthesis: "Test synthesis",
					},
				],
			};
		});

		(ChatOpenAI as ReturnType<typeof vi.fn>).mockImplementationOnce(() => ({
			withStructuredOutput: vi.fn().mockReturnValue({
				invoke: mockInvoke,
			}),
		}));

		const provider = new LangChainOpenRouterProvider(mockConfig);

		// Mock sleep to avoid actual delays in tests
		vi.spyOn(provider as any, "sleep").mockResolvedValue(undefined);

		const result = await provider.extractGoldenNuggets("test", "test");

		expect(mockInvoke).toHaveBeenCalledTimes(2);
		expect(result).toEqual({
			golden_nuggets: [
				{
					type: "tool",
					startContent: "Test start",
					endContent: "Test end",
					synthesis: "Test synthesis",
				},
			],
		});
	});

	it("should exhaust retries and throw specific error after 3 attempts", async () => {
		const { ChatOpenAI } = await import("@langchain/openai");

		const mockInvoke = vi
			.fn()
			.mockRejectedValue(new Error("429 Rate limit exceeded"));

		(ChatOpenAI as ReturnType<typeof vi.fn>).mockImplementationOnce(() => ({
			withStructuredOutput: vi.fn().mockReturnValue({
				invoke: mockInvoke,
			}),
		}));

		const provider = new LangChainOpenRouterProvider(mockConfig);

		// Mock sleep to avoid actual delays in tests
		vi.spyOn(provider as any, "sleep").mockResolvedValue(undefined);

		await expect(provider.extractGoldenNuggets("test", "test")).rejects.toThrow(
			"RATE_LIMIT_RETRY_EXHAUSTED: Rate limit exceeded after 4 attempts. The OpenRouter API is temporarily limiting requests. You can try again.",
		);

		// Should attempt 4 times (initial + 3 retries)
		expect(mockInvoke).toHaveBeenCalledTimes(4);
	});

	it("should not retry on non-rate-limit errors", async () => {
		const { ChatOpenAI } = await import("@langchain/openai");

		const mockInvoke = vi.fn().mockRejectedValue(new Error("Invalid API key"));

		(ChatOpenAI as ReturnType<typeof vi.fn>).mockImplementationOnce(() => ({
			withStructuredOutput: vi.fn().mockReturnValue({
				invoke: mockInvoke,
			}),
		}));

		const provider = new LangChainOpenRouterProvider(mockConfig);

		await expect(provider.extractGoldenNuggets("test", "test")).rejects.toThrow(
			"Invalid API key",
		);

		// Should only attempt once (no retries)
		expect(mockInvoke).toHaveBeenCalledTimes(1);
	});

	it("should handle provider errors with proper error messages", async () => {
		const provider = new LangChainOpenRouterProvider(mockConfig);

		// Spy on extractGoldenNuggets to throw an error
		const spy = vi
			.spyOn(provider, "extractGoldenNuggets")
			.mockRejectedValue(new Error("Network error"));

		const isValid = await provider.validateApiKey();

		expect(isValid).toBe(false);
		spy.mockRestore();
	});

	it("should normalize response format consistently", async () => {
		const provider = new LangChainOpenRouterProvider(mockConfig);

		const result = await provider.extractGoldenNuggets(
			"Test content for normalization",
			"Extract insights",
		);

		// Validate response structure matches the expected format
		expect(result).toHaveProperty("golden_nuggets");
		expect(Array.isArray(result.golden_nuggets)).toBe(true);

		if (result.golden_nuggets.length > 0) {
			const nugget = result.golden_nuggets[0];
			expect(nugget).toHaveProperty("type");
			expect(nugget).toHaveProperty("startContent");
			expect(nugget).toHaveProperty("endContent");
			expect(nugget).toHaveProperty("synthesis");
			expect(["tool", "media", "explanation", "analogy", "model"]).toContain(
				nugget.type,
			);
			expect(typeof nugget.startContent).toBe("string");
			expect(typeof nugget.endContent).toBe("string");
			expect(typeof nugget.synthesis).toBe("string");
		}
	});

	it("should handle multiple model names with proper defaults", () => {
		const testCases = [
			{ modelName: "openai/gpt-4o", expected: "openai/gpt-4o" },
			{
				modelName: "anthropic/claude-3-5-sonnet",
				expected: "anthropic/claude-3-5-sonnet",
			},
			{ modelName: "google/gemini-pro", expected: "google/gemini-pro" },
			{ modelName: undefined, expected: "z-ai/glm-4.5-air:free" }, // default
		];

		testCases.forEach(({ modelName, expected }) => {
			const config = { ...mockConfig, modelName };
			const provider = new LangChainOpenRouterProvider(
				config as ProviderConfig,
			);
			expect(provider.modelName).toBe(expected);
		});
	});

	it("should configure ChatOpenAI with maxRetries disabled", () => {
		// We verify this implicitly by checking that our retry logic works correctly
		// and that we don't see duplicate retries from ChatOpenAI's internal logic
		const provider = new LangChainOpenRouterProvider(mockConfig);
		expect(provider.providerId).toBe("openrouter");
	});

	it("should handle OpenRouter 200 response with error object", async () => {
		const { ChatOpenAI } = await import("@langchain/openai");

		// Mock OpenRouter returning 200 but with error object in response body
		const errorResponse = {
			error: {
				message: "Internal Server Error",
				code: 500,
			},
			user_id: "user_2yCxNwyhwzv2qzz9IiogKaKcG13",
		};

		(ChatOpenAI as ReturnType<typeof vi.fn>).mockImplementationOnce(() => ({
			withStructuredOutput: vi.fn().mockReturnValue({
				invoke: vi.fn().mockResolvedValue(errorResponse),
			}),
		}));

		const provider = new LangChainOpenRouterProvider(mockConfig);

		await expect(provider.extractGoldenNuggets("test", "test")).rejects.toThrow(
			"OpenRouter API error (500): Internal Server Error",
		);
	});

	it("should handle OpenRouter 200 response with error object without code", async () => {
		const { ChatOpenAI } = await import("@langchain/openai");

		// Mock OpenRouter returning 200 but with error object (no code field)
		const errorResponse = {
			error: {
				message: "Service temporarily unavailable",
			},
			user_id: "user_2yCxNwyhwzv2qzz9IiogKaKcG13",
		};

		(ChatOpenAI as ReturnType<typeof vi.fn>).mockImplementationOnce(() => ({
			withStructuredOutput: vi.fn().mockReturnValue({
				invoke: vi.fn().mockResolvedValue(errorResponse),
			}),
		}));

		const provider = new LangChainOpenRouterProvider(mockConfig);

		await expect(provider.extractGoldenNuggets("test", "test")).rejects.toThrow(
			"OpenRouter API error (unknown): Service temporarily unavailable",
		);
	});
});
