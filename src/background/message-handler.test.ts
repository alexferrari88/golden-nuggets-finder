import { beforeEach, describe, expect, it, vi } from "vitest";
import { storage } from "../shared/storage";
import { MESSAGE_TYPES } from "../shared/types";
import type {
	GoldenNuggetsResponse,
	LLMProvider,
	ProviderId,
} from "../shared/types/providers";
import { MessageHandler } from "./message-handler";

// Mock dependencies
vi.mock("./gemini-client");
vi.mock("../shared/storage");
vi.mock("./services/provider-factory");
vi.mock("../shared/storage/api-key-storage");
vi.mock("./services/provider-switcher");
vi.mock("./services/error-handler");
vi.mock("./services/response-normalizer");

import * as ErrorHandler from "./services/error-handler";
// Import mocked modules for setup
import * as ProviderFactory from "./services/provider-factory";
import * as ProviderSwitcher from "./services/provider-switcher";
import * as ResponseNormalizer from "./services/response-normalizer";

// Type definitions for mocks
interface MockChromeStorage {
	get: ReturnType<typeof vi.fn>;
	set: ReturnType<typeof vi.fn>;
}

interface MockChromeRuntime {
	sendMessage: ReturnType<typeof vi.fn>;
}

interface MockChromeTabs {
	sendMessage: ReturnType<typeof vi.fn>;
}

interface MockChrome {
	runtime: MockChromeRuntime;
	tabs: MockChromeTabs;
	storage: {
		local: MockChromeStorage;
	};
}

interface MockGeminiClient {
	analyzeContent: ReturnType<typeof vi.fn>;
}

interface MockProvider extends LLMProvider {
	extractGoldenNuggets: ReturnType<typeof vi.fn>;
	validateApiKey: ReturnType<typeof vi.fn>;
}

// Mock Chrome APIs with proper typing
const mockChrome: MockChrome = {
	runtime: {
		sendMessage: vi.fn().mockResolvedValue({}),
	},
	tabs: {
		sendMessage: vi.fn().mockResolvedValue({}),
	},
	storage: {
		local: {
			get: vi.fn().mockResolvedValue({}),
			set: vi.fn().mockResolvedValue({}),
		},
	},
};

global.chrome = mockChrome as unknown as typeof chrome;

// Mock global fetch with proper typing
const mockFetch = vi.fn() as ReturnType<typeof vi.fn> & typeof fetch;
global.fetch = mockFetch;

describe("MessageHandler", () => {
	let messageHandler: MessageHandler;
	let _mockGeminiClient: MockGeminiClient;
	let mockSendResponse: ReturnType<typeof vi.fn>;
	let mockProvider: MockProvider;

	beforeEach(() => {
		_mockGeminiClient = {
			analyzeContent: vi.fn().mockResolvedValue({ golden_nuggets: [] }),
		};
		mockSendResponse = vi.fn();
		messageHandler = new MessageHandler();

		// Mock fetch to reject (simulating no optimized prompt available)
		mockFetch.mockRejectedValue(new Error("No optimized prompt available"));

		// Mock Chrome storage for provider selection
		mockChrome.storage.local.get.mockImplementation(
			(keys: string | string[] | Record<string, unknown> | null) => {
				if (Array.isArray(keys) && keys.includes("selectedProvider")) {
					return Promise.resolve({ selectedProvider: "gemini" });
				}
				if (Array.isArray(keys) && keys.includes("geminiApiKey")) {
					return Promise.resolve({ geminiApiKey: "test-api-key" });
				}
				if (typeof keys === "string" && keys === "selectedProvider") {
					return Promise.resolve({ selectedProvider: "gemini" });
				}
				if (typeof keys === "string" && keys === "geminiApiKey") {
					return Promise.resolve({ geminiApiKey: "test-api-key" });
				}
				return Promise.resolve({});
			},
		);

		// Mock provider system
		(
			ProviderSwitcher.isProviderConfigured as ReturnType<typeof vi.fn>
		).mockResolvedValue(true);
		(
			ProviderFactory.getDefaultModel as ReturnType<typeof vi.fn>
		).mockReturnValue("gemini-2.5-flash");

		// Mock provider instance
		const mockResponse: GoldenNuggetsResponse = { golden_nuggets: [] };
		mockProvider = {
			providerId: "gemini",
			modelName: "gemini-2.5-flash",
			extractGoldenNuggets: vi.fn().mockResolvedValue(mockResponse),
			validateApiKey: vi.fn().mockResolvedValue(true),
		};
		(
			ProviderFactory.createProvider as ReturnType<typeof vi.fn>
		).mockResolvedValue(mockProvider);

		// Mock response normalizer
		vi.spyOn(ResponseNormalizer, "normalize").mockImplementation(
			(response: unknown, _providerId: ProviderId) =>
				response as GoldenNuggetsResponse,
		);

		// Mock error handler
		(
			ErrorHandler.resetRetryCount as ReturnType<typeof vi.fn>
		).mockImplementation(() => {});

		// Clear all mocks
		vi.clearAllMocks();

		// Re-initialize mockProvider after clearAllMocks
		const mockResponseAfterClear: GoldenNuggetsResponse = {
			golden_nuggets: [],
		};
		mockProvider = {
			providerId: "gemini",
			modelName: "gemini-2.5-flash",
			extractGoldenNuggets: vi.fn().mockResolvedValue(mockResponseAfterClear),
			validateApiKey: vi.fn().mockResolvedValue(true),
		};

		// Ensure mocks are reset but keep the implementation
		mockFetch.mockRejectedValue(new Error("No optimized prompt available"));
		(
			ProviderSwitcher.isProviderConfigured as ReturnType<typeof vi.fn>
		).mockResolvedValue(true);
		(
			ProviderFactory.getDefaultModel as ReturnType<typeof vi.fn>
		).mockReturnValue("gemini-2.5-flash");
		(
			ProviderFactory.createProvider as ReturnType<typeof vi.fn>
		).mockResolvedValue(mockProvider);
		vi.spyOn(ResponseNormalizer, "normalize").mockImplementation(
			(response: unknown, _providerId: ProviderId) =>
				response as GoldenNuggetsResponse,
		);

		// Mock storage.getPrompts with default prompts
		(storage.getPrompts as ReturnType<typeof vi.fn>).mockResolvedValue([
			{
				id: "test-prompt",
				name: "Test Prompt",
				prompt: "Analyze this {{ source }} for insights.",
				isDefault: true,
			},
		]);

		// Mock storage.getApiKey
		(storage.getApiKey as ReturnType<typeof vi.fn>).mockResolvedValue(
			"test-api-key",
		);

		// Mock storage.getPersona
		(storage.getPersona as ReturnType<typeof vi.fn>).mockResolvedValue(
			"test-persona",
		);

		// getSynthesisEnabled removed with synthesis functionality
	});

	describe("Source placeholder replacement", () => {
		beforeEach(() => {
			(storage.getPrompts as ReturnType<typeof vi.fn>).mockResolvedValue([
				{
					id: "test-prompt",
					name: "Test Prompt",
					prompt: "Analyze this {{ source }} for insights.",
					isDefault: true,
				},
			]);
		});

		it('should replace {{ source }} with "HackerNews thread" for HackerNews URLs', async () => {
			const request = {
				type: MESSAGE_TYPES.ANALYZE_CONTENT,
				content: "Test content",
				promptId: "test-prompt",
				url: "https://news.ycombinator.com/item?id=12345",
			};

			await messageHandler.handleMessage(
				request,
				{} as chrome.runtime.MessageSender,
				mockSendResponse,
			);

			// Check if sendResponse was called with an error
			if (mockSendResponse.mock.calls.length > 0) {
				const responseCall = mockSendResponse.mock.calls[0][0];
				if (!responseCall.success) {
					console.error("Handler returned error:", responseCall.error);
				}
			}

			// Verify that the provider system was called correctly
			expect(mockProvider.extractGoldenNuggets).toHaveBeenCalledWith(
				"Test content",
				"Analyze this HackerNews thread for insights.",
			);
		});

		it('should replace {{ source }} with "Reddit thread" for Reddit URLs', async () => {
			const request = {
				type: MESSAGE_TYPES.ANALYZE_CONTENT,
				content: "Test content",
				promptId: "test-prompt",
				url: "https://www.reddit.com/r/programming/comments/abc123/test-post",
			};

			await messageHandler.handleMessage(
				request,
				{} as chrome.runtime.MessageSender,
				mockSendResponse,
			);

			// Verify that the provider system was called correctly
			expect(mockProvider.extractGoldenNuggets).toHaveBeenCalledWith(
				"Test content",
				"Analyze this Reddit thread for insights.",
			);
		});

		it('should replace {{ source }} with "Twitter thread" for Twitter URLs', async () => {
			const request = {
				type: MESSAGE_TYPES.ANALYZE_CONTENT,
				content: "Test content",
				promptId: "test-prompt",
				url: "https://twitter.com/user/status/123456789",
			};

			await messageHandler.handleMessage(
				request,
				{} as chrome.runtime.MessageSender,
				mockSendResponse,
			);

			// Verify that the provider system was called correctly
			expect(mockProvider.extractGoldenNuggets).toHaveBeenCalledWith(
				"Test content",
				"Analyze this Twitter thread for insights.",
			);
		});

		it('should replace {{ source }} with "Twitter thread" for X.com URLs', async () => {
			const request = {
				type: MESSAGE_TYPES.ANALYZE_CONTENT,
				content: "Test content",
				promptId: "test-prompt",
				url: "https://x.com/user/status/123456789",
			};

			await messageHandler.handleMessage(
				request,
				{} as chrome.runtime.MessageSender,
				mockSendResponse,
			);

			// Verify that the provider system was called correctly
			expect(mockProvider.extractGoldenNuggets).toHaveBeenCalledWith(
				"Test content",
				"Analyze this Twitter thread for insights.",
			);
		});

		it('should replace {{ source }} with "text" for other URLs', async () => {
			const request = {
				type: MESSAGE_TYPES.ANALYZE_CONTENT,
				content: "Test content",
				promptId: "test-prompt",
				url: "https://example.com/some-article",
			};

			await messageHandler.handleMessage(
				request,
				{} as chrome.runtime.MessageSender,
				mockSendResponse,
			);

			// Verify that the provider system was called correctly
			expect(mockProvider.extractGoldenNuggets).toHaveBeenCalledWith(
				"Test content",
				"Analyze this text for insights.",
			);
		});

		it("should handle multiple {{ source }} placeholders in the same prompt", async () => {
			(storage.getPrompts as ReturnType<typeof vi.fn>).mockResolvedValue([
				{
					id: "multi-source-prompt",
					name: "Multi Source Prompt",
					prompt:
						"First analyze this {{ source }} and then review the {{ source }} again.",
					isDefault: true,
				},
			]);

			const request = {
				type: MESSAGE_TYPES.ANALYZE_CONTENT,
				content: "Test content",
				promptId: "multi-source-prompt",
				url: "https://news.ycombinator.com/item?id=12345",
			};

			await messageHandler.handleMessage(
				request,
				{} as chrome.runtime.MessageSender,
				mockSendResponse,
			);

			// Verify that the provider system was called correctly
			expect(mockProvider.extractGoldenNuggets).toHaveBeenCalledWith(
				"Test content",
				"First analyze this HackerNews thread and then review the HackerNews thread again.",
			);
		});

		it("should handle prompts without {{ source }} placeholder", async () => {
			(storage.getPrompts as ReturnType<typeof vi.fn>).mockResolvedValue([
				{
					id: "no-placeholder-prompt",
					name: "No Placeholder Prompt",
					prompt: "Analyze this content for insights.",
					isDefault: true,
				},
			]);

			const request = {
				type: MESSAGE_TYPES.ANALYZE_CONTENT,
				content: "Test content",
				promptId: "no-placeholder-prompt",
				url: "https://news.ycombinator.com/item?id=12345",
			};

			await messageHandler.handleMessage(
				request,
				{} as chrome.runtime.MessageSender,
				mockSendResponse,
			);

			// Verify that the provider system was called correctly
			expect(mockProvider.extractGoldenNuggets).toHaveBeenCalledWith(
				"Test content",
				"Analyze this content for insights.",
			);
		});

		it("should handle {{ source }} with different spacing", async () => {
			(storage.getPrompts as ReturnType<typeof vi.fn>).mockResolvedValue([
				{
					id: "spaced-prompt",
					name: "Spaced Prompt",
					prompt:
						"Analyze this {{source}} and this {{  source  }} for insights.",
					isDefault: true,
				},
			]);

			const request = {
				type: MESSAGE_TYPES.ANALYZE_CONTENT,
				content: "Test content",
				promptId: "spaced-prompt",
				url: "https://reddit.com/r/test",
			};

			await messageHandler.handleMessage(
				request,
				{} as chrome.runtime.MessageSender,
				mockSendResponse,
			);

			// Verify that the provider system was called correctly
			expect(mockProvider.extractGoldenNuggets).toHaveBeenCalledWith(
				"Test content",
				"Analyze this Reddit thread and this Reddit thread for insights.",
			);
		});
	});

	describe("Persona placeholder replacement", () => {
		describe("replacePersonaPlaceholder method", () => {
			it("should replace {{ persona }} with user persona", async () => {
				// Mock persona in storage
				(storage.getConfig as ReturnType<typeof vi.fn>).mockResolvedValue({
					userPersona: "data scientist specializing in machine learning",
				});

				// Access private method for testing
				const result = await (messageHandler as any).replacePersonaPlaceholder(
					"You are a {{ persona }}. Analyze this content.",
				);

				expect(result).toBe(
					"You are a data scientist specializing in machine learning. Analyze this content.",
				);
			});

			it("should replace multiple {{ persona }} placeholders in the same prompt", async () => {
				// Mock persona in storage
				(storage.getConfig as ReturnType<typeof vi.fn>).mockResolvedValue({
					userPersona: "senior software engineer",
				});

				// Access private method for testing
				const result = await (messageHandler as any).replacePersonaPlaceholder(
					"As a {{ persona }}, analyze this code. Remember you are a {{ persona }}.",
				);

				expect(result).toBe(
					"As a senior software engineer, analyze this code. Remember you are a senior software engineer.",
				);
			});

			it("should handle {{ persona }} with different spacing", async () => {
				// Mock persona in storage
				(storage.getConfig as ReturnType<typeof vi.fn>).mockResolvedValue({
					userPersona: "UX designer",
				});

				// Access private method for testing
				const result = await (messageHandler as any).replacePersonaPlaceholder(
					"You are a {{persona}} and also a {{  persona  }}.",
				);

				expect(result).toBe("You are a UX designer and also a UX designer.");
			});

			it("should replace with empty string when persona is not configured", async () => {
				// Mock empty persona in storage
				(storage.getConfig as ReturnType<typeof vi.fn>).mockResolvedValue({
					userPersona: "",
				});

				// Access private method for testing
				const result = await (messageHandler as any).replacePersonaPlaceholder(
					"You are a {{ persona }}. Analyze this content.",
				);

				expect(result).toBe("You are a . Analyze this content.");
			});

			it("should replace with empty string when persona is undefined", async () => {
				// Mock undefined persona in storage
				(storage.getConfig as ReturnType<typeof vi.fn>).mockResolvedValue({});

				// Access private method for testing
				const result = await (messageHandler as any).replacePersonaPlaceholder(
					"You are a {{ persona }}. Analyze this content.",
				);

				expect(result).toBe("You are a . Analyze this content.");
			});

			it("should handle storage errors gracefully", async () => {
				// Mock storage error
				(storage.getConfig as ReturnType<typeof vi.fn>).mockRejectedValue(
					new Error("Storage access failed"),
				);

				// Access private method for testing
				const result = await (messageHandler as any).replacePersonaPlaceholder(
					"You are a {{ persona }}. Analyze this content.",
				);

				expect(result).toBe("You are a . Analyze this content.");
			});

			it("should handle prompts without {{ persona }} placeholder", async () => {
				// Mock persona in storage
				(storage.getConfig as ReturnType<typeof vi.fn>).mockResolvedValue({
					userPersona: "product manager",
				});

				// Access private method for testing
				const result = await (messageHandler as any).replacePersonaPlaceholder(
					"Analyze this content for insights.",
				);

				expect(result).toBe("Analyze this content for insights.");
			});
		});

		describe("Persona validation in analysis", () => {
			beforeEach(() => {
				(storage.getPrompts as ReturnType<typeof vi.fn>).mockResolvedValue([
					{
						id: "test-prompt",
						name: "Test Prompt",
						prompt:
							"As a {{ persona }}, analyze this {{ source }} for insights.",
						isDefault: true,
					},
				]);
			});

			it("should fail analysis when persona is empty", async () => {
				// Mock empty persona
				(storage.getPersona as ReturnType<typeof vi.fn>).mockResolvedValue("");

				const request = {
					type: MESSAGE_TYPES.ANALYZE_CONTENT,
					content: "Test content",
					promptId: "test-prompt",
					url: "https://example.com/test-article",
				};

				await messageHandler.handleMessage(
					request,
					{} as chrome.runtime.MessageSender,
					mockSendResponse,
				);

				expect(mockSendResponse).toHaveBeenCalledWith({
					success: false,
					error:
						"Please set a persona in extension options before analyzing content",
				});

				// Ensure AI provider was not called
				expect(mockProvider.extractGoldenNuggets).not.toHaveBeenCalled();
			});

			it("should fail analysis when persona is only whitespace", async () => {
				// Mock whitespace-only persona
				(storage.getPersona as ReturnType<typeof vi.fn>).mockResolvedValue(
					"   \n\t  ",
				);

				const request = {
					type: MESSAGE_TYPES.ANALYZE_CONTENT,
					content: "Test content",
					promptId: "test-prompt",
					url: "https://example.com/test-article",
				};

				await messageHandler.handleMessage(
					request,
					{} as chrome.runtime.MessageSender,
					mockSendResponse,
				);

				expect(mockSendResponse).toHaveBeenCalledWith({
					success: false,
					error:
						"Please set a persona in extension options before analyzing content",
				});

				// Ensure AI provider was not called
				expect(mockProvider.extractGoldenNuggets).not.toHaveBeenCalled();
			});

			it("should succeed analysis when persona is properly configured", async () => {
				// Mock valid persona
				(storage.getPersona as ReturnType<typeof vi.fn>).mockResolvedValue(
					"experienced software architect",
				);

				// Mock config for replacePersonaPlaceholder method
				(storage.getConfig as ReturnType<typeof vi.fn>).mockResolvedValue({
					userPersona: "experienced software architect",
				});

				const request = {
					type: MESSAGE_TYPES.ANALYZE_CONTENT,
					content: "Test content",
					promptId: "test-prompt",
					url: "https://example.com/test-article",
				};

				await messageHandler.handleMessage(
					request,
					{} as chrome.runtime.MessageSender,
					mockSendResponse,
				);

				// Verify that the provider system was called with both placeholders replaced
				expect(mockProvider.extractGoldenNuggets).toHaveBeenCalledWith(
					"Test content",
					"As a experienced software architect, analyze this text for insights.",
				);
			});

			it("should handle selected content analysis with persona validation", async () => {
				// Mock empty persona
				(storage.getPersona as ReturnType<typeof vi.fn>).mockResolvedValue(
					null,
				);

				const request = {
					type: MESSAGE_TYPES.ANALYZE_SELECTED_CONTENT,
					content: "Selected test content",
					promptId: "test-prompt",
					url: "https://reddit.com/r/programming/test",
				};

				await messageHandler.handleMessage(
					request,
					{} as chrome.runtime.MessageSender,
					mockSendResponse,
				);

				expect(mockSendResponse).toHaveBeenCalledWith({
					success: false,
					error:
						"Please set a persona in extension options before analyzing content",
				});

				// Ensure AI provider was not called
				expect(mockProvider.extractGoldenNuggets).not.toHaveBeenCalled();
			});
		});

		describe("Combined placeholder replacement", () => {
			beforeEach(() => {
				(storage.getPrompts as ReturnType<typeof vi.fn>).mockResolvedValue([
					{
						id: "combined-prompt",
						name: "Combined Prompt",
						prompt:
							"You are a {{ persona }}. Analyze this {{ source }} and find {{ persona }}-relevant insights.",
						isDefault: true,
					},
				]);

				// Mock valid persona
				(storage.getPersona as ReturnType<typeof vi.fn>).mockResolvedValue(
					"data analyst",
				);

				// Mock config for replacePersonaPlaceholder method
				(storage.getConfig as ReturnType<typeof vi.fn>).mockResolvedValue({
					userPersona: "data analyst",
				});
			});

			it("should replace both {{ source }} and {{ persona }} placeholders", async () => {
				const request = {
					type: MESSAGE_TYPES.ANALYZE_CONTENT,
					content: "Test content",
					promptId: "combined-prompt",
					url: "https://news.ycombinator.com/item?id=12345",
				};

				await messageHandler.handleMessage(
					request,
					{} as chrome.runtime.MessageSender,
					mockSendResponse,
				);

				// Verify that both placeholders were replaced correctly
				expect(mockProvider.extractGoldenNuggets).toHaveBeenCalledWith(
					"Test content",
					"You are a data analyst. Analyze this HackerNews thread and find data analyst-relevant insights.",
				);
			});

			it("should handle prompts with only {{ source }} placeholder (no persona)", async () => {
				(storage.getPrompts as ReturnType<typeof vi.fn>).mockResolvedValue([
					{
						id: "source-only-prompt",
						name: "Source Only Prompt",
						prompt: "Analyze this {{ source }} for insights.",
						isDefault: true,
					},
				]);

				const request = {
					type: MESSAGE_TYPES.ANALYZE_CONTENT,
					content: "Test content",
					promptId: "source-only-prompt",
					url: "https://twitter.com/user/status/123",
				};

				await messageHandler.handleMessage(
					request,
					{} as chrome.runtime.MessageSender,
					mockSendResponse,
				);

				// Verify that only source placeholder was replaced
				expect(mockProvider.extractGoldenNuggets).toHaveBeenCalledWith(
					"Test content",
					"Analyze this Twitter thread for insights.",
				);
			});

			it("should handle prompts with only {{ persona }} placeholder (no source)", async () => {
				(storage.getPrompts as ReturnType<typeof vi.fn>).mockResolvedValue([
					{
						id: "persona-only-prompt",
						name: "Persona Only Prompt",
						prompt: "As a {{ persona }}, analyze this content.",
						isDefault: true,
					},
				]);

				const request = {
					type: MESSAGE_TYPES.ANALYZE_CONTENT,
					content: "Test content",
					promptId: "persona-only-prompt",
					url: "https://example.com/article",
				};

				await messageHandler.handleMessage(
					request,
					{} as chrome.runtime.MessageSender,
					mockSendResponse,
				);

				// Verify that only persona placeholder was replaced
				expect(mockProvider.extractGoldenNuggets).toHaveBeenCalledWith(
					"Test content",
					"As a data analyst, analyze this content.",
				);
			});
		});
	});

	describe("Provider-specific optimized prompt retrieval", () => {
		beforeEach(() => {
			// Reset fetch mock for each test
			mockFetch.mockClear();
		});

		it("should request provider-specific optimization when provider and model are available", async () => {
			// Mock persona for validation
			(storage.getPersona as ReturnType<typeof vi.fn>).mockResolvedValue(
				"test persona",
			);

			// Mock provider and model detection
			(
				ProviderSwitcher.getCurrentProvider as ReturnType<typeof vi.fn>
			).mockResolvedValue("openai");
			(
				ProviderFactory.getSelectedModel as ReturnType<typeof vi.fn>
			).mockResolvedValue("gpt-4o-mini");

			// Mock successful response with provider-specific optimization
			const mockOptimizedResponse = {
				prompt: "Provider-specific optimized prompt",
				version: 2,
				providerSpecific: true,
				modelProvider: "openai",
				modelName: "gpt-4o-mini",
			};
			mockFetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(mockOptimizedResponse),
			} as Response);

			// Mock storage to return prompts
			(storage.getPrompts as ReturnType<typeof vi.fn>).mockResolvedValue([
				{
					id: "test-prompt",
					name: "Test Prompt",
					prompt: "Original prompt {{ source }}",
					isDefault: true,
				},
			]);

			const request = {
				type: MESSAGE_TYPES.ANALYZE_CONTENT,
				content: "Test content",
				promptId: "test-prompt",
				url: "https://example.com",
			};

			await messageHandler.handleMessage(
				request,
				{} as chrome.runtime.MessageSender,
				mockSendResponse,
			);

			// Verify the correct URL was requested with query parameters
			expect(mockFetch).toHaveBeenCalledWith(
				"http://localhost:7532/optimize/current?promptId=test-prompt&provider=openai&model=gpt-4o-mini",
				{
					method: "GET",
					headers: { "Content-Type": "application/json" },
					signal: expect.any(AbortSignal),
				},
			);

			// Verify optimized prompt was used
			expect(mockProvider.extractGoldenNuggets).toHaveBeenCalledWith(
				"Test content",
				"Provider-specific optimized prompt",
			);
		});

		it("should fallback to generic optimization when no model is selected", async () => {
			// Mock persona for validation
			(storage.getPersona as ReturnType<typeof vi.fn>).mockResolvedValue(
				"test persona",
			);

			// Mock provider without model
			(
				ProviderSwitcher.getCurrentProvider as ReturnType<typeof vi.fn>
			).mockResolvedValue("anthropic");
			(
				ProviderFactory.getSelectedModel as ReturnType<typeof vi.fn>
			).mockResolvedValue(null);

			// Mock generic optimization response
			const mockOptimizedResponse = {
				prompt: "Generic optimized prompt",
				version: 1,
				providerSpecific: false,
				fallbackUsed: false,
			};
			mockFetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(mockOptimizedResponse),
			} as Response);

			(storage.getPrompts as ReturnType<typeof vi.fn>).mockResolvedValue([
				{
					id: "test-prompt",
					name: "Test Prompt",
					prompt: "Original prompt {{ source }}",
					isDefault: true,
				},
			]);

			const request = {
				type: MESSAGE_TYPES.ANALYZE_CONTENT,
				content: "Test content",
				promptId: "test-prompt",
				url: "https://example.com",
			};

			await messageHandler.handleMessage(
				request,
				{} as chrome.runtime.MessageSender,
				mockSendResponse,
			);

			// Verify URL was requested with prompt ID and provider (but no model)
			expect(mockFetch).toHaveBeenCalledWith(
				"http://localhost:7532/optimize/current?promptId=test-prompt&provider=anthropic",
				{
					method: "GET",
					headers: { "Content-Type": "application/json" },
					signal: expect.any(AbortSignal),
				},
			);

			// Verify optimized prompt was used
			expect(mockProvider.extractGoldenNuggets).toHaveBeenCalledWith(
				"Test content",
				"Generic optimized prompt",
			);
		});

		it("should fallback to generic optimization when no provider is configured", async () => {
			// Mock persona for validation
			(storage.getPersona as ReturnType<typeof vi.fn>).mockResolvedValue(
				"test persona",
			);

			// Mock no provider configured
			(
				ProviderSwitcher.getCurrentProvider as ReturnType<typeof vi.fn>
			).mockResolvedValue(null);

			// Mock generic optimization response
			const mockOptimizedResponse = {
				prompt: "Generic fallback prompt",
				version: 1,
				providerSpecific: false,
				fallbackUsed: true,
			};
			mockFetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(mockOptimizedResponse),
			} as Response);

			(storage.getPrompts as ReturnType<typeof vi.fn>).mockResolvedValue([
				{
					id: "test-prompt",
					name: "Test Prompt",
					prompt: "Original prompt {{ source }}",
					isDefault: true,
				},
			]);

			const request = {
				type: MESSAGE_TYPES.ANALYZE_CONTENT,
				content: "Test content",
				promptId: "test-prompt",
				url: "https://example.com",
			};

			await messageHandler.handleMessage(
				request,
				{} as chrome.runtime.MessageSender,
				mockSendResponse,
			);

			// Verify URL was requested with prompt ID only (no provider)
			expect(mockFetch).toHaveBeenCalledWith(
				"http://localhost:7532/optimize/current?promptId=test-prompt",
				{
					method: "GET",
					headers: { "Content-Type": "application/json" },
					signal: expect.any(AbortSignal),
				},
			);

			// Verify optimized prompt was used
			expect(mockProvider.extractGoldenNuggets).toHaveBeenCalledWith(
				"Test content",
				"Generic fallback prompt",
			);
		});

		it("should use original prompt when optimization fails", async () => {
			// Mock persona for validation
			(storage.getPersona as ReturnType<typeof vi.fn>).mockResolvedValue(
				"test persona",
			);

			// Mock provider and model detection
			(
				ProviderSwitcher.getCurrentProvider as ReturnType<typeof vi.fn>
			).mockResolvedValue("gemini");
			(
				ProviderFactory.getSelectedModel as ReturnType<typeof vi.fn>
			).mockResolvedValue("gemini-2.5-flash");

			// Mock fetch failure
			mockFetch.mockRejectedValue(new Error("Backend not available"));

			(storage.getPrompts as ReturnType<typeof vi.fn>).mockResolvedValue([
				{
					id: "test-prompt",
					name: "Test Prompt",
					prompt: "Original prompt {{ source }}",
					isDefault: true,
				},
			]);

			const request = {
				type: MESSAGE_TYPES.ANALYZE_CONTENT,
				content: "Test content",
				promptId: "test-prompt",
				url: "https://example.com",
			};

			await messageHandler.handleMessage(
				request,
				{} as chrome.runtime.MessageSender,
				mockSendResponse,
			);

			// Verify original prompt was used as fallback
			expect(mockProvider.extractGoldenNuggets).toHaveBeenCalledWith(
				"Test content",
				"Original prompt text",
			);
		});

		it("should handle HTTP errors from optimization endpoint", async () => {
			// Mock persona for validation
			(storage.getPersona as ReturnType<typeof vi.fn>).mockResolvedValue(
				"test persona",
			);

			// Mock provider and model detection
			(
				ProviderSwitcher.getCurrentProvider as ReturnType<typeof vi.fn>
			).mockResolvedValue("openai");
			(
				ProviderFactory.getSelectedModel as ReturnType<typeof vi.fn>
			).mockResolvedValue("gpt-4o");

			// Mock HTTP error response
			mockFetch.mockResolvedValue({
				ok: false,
				status: 404,
				statusText: "Not Found",
			} as Response);

			(storage.getPrompts as ReturnType<typeof vi.fn>).mockResolvedValue([
				{
					id: "test-prompt",
					name: "Test Prompt",
					prompt: "Original prompt {{ source }}",
					isDefault: true,
				},
			]);

			const request = {
				type: MESSAGE_TYPES.ANALYZE_CONTENT,
				content: "Test content",
				promptId: "test-prompt",
				url: "https://example.com",
			};

			await messageHandler.handleMessage(
				request,
				{} as chrome.runtime.MessageSender,
				mockSendResponse,
			);

			// Verify original prompt was used as fallback
			expect(mockProvider.extractGoldenNuggets).toHaveBeenCalledWith(
				"Test content",
				"Original prompt text",
			);
		});

		it("should handle timeout during optimization request", async () => {
			// Mock persona for validation
			(storage.getPersona as ReturnType<typeof vi.fn>).mockResolvedValue(
				"test persona",
			);

			// Mock provider and model detection
			(
				ProviderSwitcher.getCurrentProvider as ReturnType<typeof vi.fn>
			).mockResolvedValue("anthropic");
			(
				ProviderFactory.getSelectedModel as ReturnType<typeof vi.fn>
			).mockResolvedValue("claude-3-5-sonnet-20241022");

			// Mock AbortError (timeout)
			const abortError = new Error("Request timed out");
			abortError.name = "AbortError";
			mockFetch.mockRejectedValue(abortError);

			(storage.getPrompts as ReturnType<typeof vi.fn>).mockResolvedValue([
				{
					id: "test-prompt",
					name: "Test Prompt",
					prompt: "Original prompt {{ source }}",
					isDefault: true,
				},
			]);

			const request = {
				type: MESSAGE_TYPES.ANALYZE_CONTENT,
				content: "Test content",
				promptId: "test-prompt",
				url: "https://example.com",
			};

			await messageHandler.handleMessage(
				request,
				{} as chrome.runtime.MessageSender,
				mockSendResponse,
			);

			// Verify original prompt was used as fallback
			expect(mockProvider.extractGoldenNuggets).toHaveBeenCalledWith(
				"Test content",
				"Original prompt text",
			);
		});

		it("should reject optimization with invalid version", async () => {
			// Mock persona for validation
			(storage.getPersona as ReturnType<typeof vi.fn>).mockResolvedValue(
				"test persona",
			);

			// Mock provider and model detection
			(
				ProviderSwitcher.getCurrentProvider as ReturnType<typeof vi.fn>
			).mockResolvedValue("openai");
			(
				ProviderFactory.getSelectedModel as ReturnType<typeof vi.fn>
			).mockResolvedValue("gpt-4o");

			// Mock response with invalid version (0 or negative)
			const mockOptimizedResponse = {
				prompt: "Invalid optimization",
				version: 0,
				providerSpecific: true,
				modelProvider: "openai",
				modelName: "gpt-4o",
			};
			mockFetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(mockOptimizedResponse),
			} as Response);

			(storage.getPrompts as ReturnType<typeof vi.fn>).mockResolvedValue([
				{
					id: "test-prompt",
					name: "Test Prompt",
					prompt: "Original prompt {{ source }}",
					isDefault: true,
				},
			]);

			const request = {
				type: MESSAGE_TYPES.ANALYZE_CONTENT,
				content: "Test content",
				promptId: "test-prompt",
				url: "https://example.com",
			};

			await messageHandler.handleMessage(
				request,
				{} as chrome.runtime.MessageSender,
				mockSendResponse,
			);

			// Verify original prompt was used (optimization rejected due to invalid version)
			expect(mockProvider.extractGoldenNuggets).toHaveBeenCalledWith(
				"Test content",
				"Original prompt text",
			);
		});

		it("should reject optimization with missing prompt", async () => {
			// Mock persona for validation
			(storage.getPersona as ReturnType<typeof vi.fn>).mockResolvedValue(
				"test persona",
			);

			// Mock provider and model detection
			(
				ProviderSwitcher.getCurrentProvider as ReturnType<typeof vi.fn>
			).mockResolvedValue("gemini");
			(
				ProviderFactory.getSelectedModel as ReturnType<typeof vi.fn>
			).mockResolvedValue("gemini-2.5-flash");

			// Mock response with missing prompt
			const mockOptimizedResponse = {
				prompt: null,
				version: 1,
				providerSpecific: true,
				modelProvider: "gemini",
				modelName: "gemini-2.5-flash",
			};
			mockFetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(mockOptimizedResponse),
			} as Response);

			(storage.getPrompts as ReturnType<typeof vi.fn>).mockResolvedValue([
				{
					id: "test-prompt",
					name: "Test Prompt",
					prompt: "Original prompt {{ source }}",
					isDefault: true,
				},
			]);

			const request = {
				type: MESSAGE_TYPES.ANALYZE_CONTENT,
				content: "Test content",
				promptId: "test-prompt",
				url: "https://example.com",
			};

			await messageHandler.handleMessage(
				request,
				{} as chrome.runtime.MessageSender,
				mockSendResponse,
			);

			// Verify original prompt was used (optimization rejected due to missing prompt)
			expect(mockProvider.extractGoldenNuggets).toHaveBeenCalledWith(
				"Test content",
				"Original prompt text",
			);
		});
	});
});
