import { storage } from "../shared/storage";
import { MESSAGE_TYPES } from "../shared/types";
import type {
	GoldenNuggetsResponse,
	LLMProvider,
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
	let mockGeminiClient: MockGeminiClient;
	let mockSendResponse: ReturnType<typeof vi.fn>;
	let mockProvider: MockProvider;

	beforeEach(() => {
		mockGeminiClient = {
			analyzeContent: vi.fn().mockResolvedValue({ golden_nuggets: [] }),
		};
		mockSendResponse = vi.fn();
		messageHandler = new MessageHandler(mockGeminiClient);

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
			(response: GoldenNuggetsResponse) => response,
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
			(response: GoldenNuggetsResponse) => response,
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
});
