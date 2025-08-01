import { storage } from "../shared/storage";
import { MESSAGE_TYPES } from "../shared/types";
import { MessageHandler } from "./message-handler";

// Mock dependencies
vi.mock("./gemini-client");
vi.mock("../shared/storage");
vi.mock("./services/provider-factory");
vi.mock("../shared/storage/api-key-storage");
vi.mock("./services/provider-switcher");
vi.mock("./services/error-handler");
vi.mock("./services/response-normalizer");

import { ErrorHandler } from "./services/error-handler";
// Import mocked modules for setup
import { ProviderFactory } from "./services/provider-factory";
import { ProviderSwitcher } from "./services/provider-switcher";
import * as ResponseNormalizer from "./services/response-normalizer";

// Mock Chrome APIs
global.chrome = {
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
} as Partial<typeof chrome>;

// Mock global fetch
global.fetch = vi.fn();

describe("MessageHandler", () => {
	let messageHandler: MessageHandler;
	let mockGeminiClient: {
		analyzeContent: ReturnType<typeof vi.fn>;
	};
	let mockSendResponse: ReturnType<typeof vi.fn>;
	let mockProvider: any;

	beforeEach(() => {
		mockGeminiClient = {
			analyzeContent: vi.fn().mockResolvedValue({ golden_nuggets: [] }),
		};
		mockSendResponse = vi.fn();
		messageHandler = new MessageHandler(mockGeminiClient);

		// Mock fetch to reject (simulating no optimized prompt available)
		(global.fetch as any).mockRejectedValue(
			new Error("No optimized prompt available"),
		);

		// Mock Chrome storage for provider selection
		(global.chrome.storage.local.get as any).mockImplementation((keys) => {
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
		});

		// Mock provider system
		(ProviderSwitcher.isProviderConfigured as any).mockResolvedValue(true);
		(ProviderFactory.getDefaultModel as any).mockReturnValue(
			"gemini-2.5-flash",
		);

		// Mock provider instance
		mockProvider = {
			extractGoldenNuggets: vi.fn().mockResolvedValue({ golden_nuggets: [] }),
			validateApiKey: vi.fn().mockResolvedValue(true),
		};
		(ProviderFactory.createProvider as any).mockResolvedValue(mockProvider);

		// Mock response normalizer
		vi.spyOn(ResponseNormalizer, 'normalize').mockImplementation(
			(response) => response as any,
		);

		// Mock error handler
		(ErrorHandler.resetRetryCount as any).mockImplementation(() => {});

		// Clear all mocks
		vi.clearAllMocks();

		// Re-initialize mockProvider after clearAllMocks
		mockProvider = {
			extractGoldenNuggets: vi.fn().mockResolvedValue({ golden_nuggets: [] }),
			validateApiKey: vi.fn().mockResolvedValue(true),
		};

		// Ensure mocks are reset but keep the implementation
		(global.fetch as any).mockRejectedValue(
			new Error("No optimized prompt available"),
		);
		(ProviderSwitcher.isProviderConfigured as any).mockResolvedValue(true);
		(ProviderFactory.getDefaultModel as any).mockReturnValue(
			"gemini-2.5-flash",
		);
		(ProviderFactory.createProvider as any).mockResolvedValue(mockProvider);
		vi.spyOn(ResponseNormalizer, 'normalize').mockImplementation(
			(response) => response as any,
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
		(storage.getApiKey as ReturnType<typeof vi.fn>).mockResolvedValue("test-api-key");
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
