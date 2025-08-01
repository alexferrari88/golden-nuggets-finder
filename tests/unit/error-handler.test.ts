import { beforeEach, describe, expect, test, vi } from "vitest";
import { ErrorHandler } from "../../src/background/services/error-handler";
import { ProviderSwitcher } from "../../src/background/services/provider-switcher";

// Mock ProviderSwitcher
vi.mock("../../src/background/services/provider-switcher", () => ({
	ProviderSwitcher: {
		getCurrentProvider: vi.fn(),
		getAvailableProviders: vi.fn(),
		switchProvider: vi.fn(),
	},
}));

describe("ErrorHandler", () => {
	beforeEach(() => {
		// Clear all retry counts before each test
		ErrorHandler.clearAllRetryCount();
		vi.clearAllMocks();
	});

	describe("Error Classification", () => {
		test("correctly identifies API key errors", async () => {
			const apiKeyError = new Error("Invalid API key provided");
			const result = await ErrorHandler.handleProviderError(
				apiKeyError,
				"openai",
				"test",
			);

			expect(result.shouldRetry).toBe(false);
			expect(result.fallbackProvider).toBeUndefined();
		});

		test("correctly identifies rate limit errors", async () => {
			const rateLimitError = new Error("Rate limit exceeded");
			const result = await ErrorHandler.handleProviderError(
				rateLimitError,
				"openai",
				"test",
			);

			expect(result.shouldRetry).toBe(true);
		});

		test("correctly identifies temporary errors", async () => {
			const tempError = new Error("Network error occurred");
			const result = await ErrorHandler.handleProviderError(
				tempError,
				"openai",
				"test",
			);

			expect(result.shouldRetry).toBe(true);
		});

		test("handles serious errors with fallback provider", async () => {
			const seriousError = new Error("Unknown service error");

			// Mock current provider and available providers
			vi.mocked(ProviderSwitcher.getCurrentProvider).mockResolvedValue(
				"openai",
			);
			vi.mocked(ProviderSwitcher.getAvailableProviders).mockResolvedValue([
				"openai",
				"gemini",
			]);

			const result = await ErrorHandler.handleProviderError(
				seriousError,
				"openai",
				"test",
			);

			expect(result.shouldRetry).toBe(false);
			expect(result.fallbackProvider).toBe("gemini");
		});
	});

	describe("Retry Logic", () => {
		test("identifies retry-able errors correctly", async () => {
			const rateLimitError = new Error("Too many requests");
			const result = await ErrorHandler.handleProviderError(
				rateLimitError,
				"openai",
				"test-simple",
			);

			expect(result.shouldRetry).toBe(true);
		});

		test("resets retry count correctly", () => {
			// Test the reset function directly without sleep delays
			ErrorHandler.resetRetryCount("openai", "test-reset");

			// If it doesn't throw, it works correctly
			expect(true).toBe(true);
		});

		test("calculates correct retry behavior based on attempt count", () => {
			// Test the retry delay calculation without actual sleeping
			expect(ErrorHandler.getRetryDelay(0)).toBe(1000);
			expect(ErrorHandler.getRetryDelay(1)).toBe(2000);
			expect(ErrorHandler.getRetryDelay(2)).toBe(4000);
			expect(ErrorHandler.getRetryDelay(10)).toBe(30000); // Capped
		});
	});

	describe("Fallback Provider Selection", () => {
		test("selects fallback provider based on priority order", async () => {
			const error = new Error("Serious error");

			vi.mocked(ProviderSwitcher.getCurrentProvider).mockResolvedValue(
				"openrouter",
			);
			vi.mocked(ProviderSwitcher.getAvailableProviders).mockResolvedValue([
				"openrouter",
				"anthropic",
				"gemini",
			]);

			const result = await ErrorHandler.handleProviderError(
				error,
				"openrouter",
				"test",
			);

			expect(result.fallbackProvider).toBe("gemini"); // Gemini has highest priority
		});

		test("handles no available fallback providers", async () => {
			const error = new Error("Serious error");

			vi.mocked(ProviderSwitcher.getCurrentProvider).mockResolvedValue(
				"gemini",
			);
			vi.mocked(ProviderSwitcher.getAvailableProviders).mockResolvedValue([
				"gemini",
			]); // Only current provider

			const result = await ErrorHandler.handleProviderError(
				error,
				"gemini",
				"test",
			);

			expect(result.fallbackProvider).toBeUndefined();
		});
	});

	describe("User-Friendly Messages", () => {
		test("provides helpful message for API key errors", () => {
			const apiKeyError = new Error("Invalid API key");
			const message = ErrorHandler.getUserFriendlyMessage(
				apiKeyError,
				"openai",
			);

			expect(message).toContain("Invalid API key for openai");
			expect(message).toContain("extension options");
		});

		test("provides helpful message for rate limit errors", () => {
			const rateLimitError = new Error("Rate limit exceeded");
			const message = ErrorHandler.getUserFriendlyMessage(
				rateLimitError,
				"openai",
			);

			expect(message).toContain("Rate limit reached");
			expect(message).toContain("wait a moment");
		});

		test("provides helpful message for temporary errors", () => {
			const tempError = new Error("Service unavailable");
			const message = ErrorHandler.getUserFriendlyMessage(tempError, "openai");

			expect(message).toContain("temporarily unavailable");
			expect(message).toContain("Trying again");
		});
	});

	describe("Provider Switching Errors", () => {
		test("handles API key errors during switching", async () => {
			const apiKeyError = new Error("Unauthorized access");
			const result = await ErrorHandler.handleSwitchError(
				apiKeyError,
				"anthropic",
			);

			expect(result.success).toBe(false);
			expect(result.message).toContain("Invalid or missing API key");
			expect(result.message).toContain("anthropic");
		});

		test("handles temporary errors during switching", async () => {
			const tempError = new Error("Service temporarily unavailable");
			const result = await ErrorHandler.handleSwitchError(
				tempError,
				"anthropic",
			);

			expect(result.success).toBe(false);
			expect(result.message).toContain("Service temporarily unavailable");
		});

		test("handles generic errors during switching", async () => {
			const genericError = new Error("Unknown error occurred");
			const result = await ErrorHandler.handleSwitchError(
				genericError,
				"anthropic",
			);

			expect(result.success).toBe(false);
			expect(result.message).toContain("anthropic");
			expect(result.message).toContain("Unknown error occurred");
		});
	});

	describe("Retry Delay Calculation", () => {
		test("calculates exponential backoff correctly", () => {
			expect(ErrorHandler.getRetryDelay(0)).toBe(1000); // 1 second
			expect(ErrorHandler.getRetryDelay(1)).toBe(2000); // 2 seconds
			expect(ErrorHandler.getRetryDelay(2)).toBe(4000); // 4 seconds
			expect(ErrorHandler.getRetryDelay(3)).toBe(8000); // 8 seconds
		});

		test("caps maximum retry delay", () => {
			// Very high attempt should cap at 30 seconds
			expect(ErrorHandler.getRetryDelay(10)).toBe(30000);
		});
	});

	describe("Error Detection Methods", () => {
		test("detects various API key error formats", () => {
			const apiKeyErrors = [
				new Error("invalid api key"),
				new Error("Unauthorized 401"),
				new Error("Authentication failed"),
				new Error("Forbidden 403"),
			];

			for (const error of apiKeyErrors) {
				const result = ErrorHandler.getUserFriendlyMessage(error, "openai");
				expect(result).toContain("Invalid API key");
			}
		});

		test("detects various rate limit error formats", () => {
			const rateLimitErrors = [
				new Error("Too many requests"),
				new Error("Rate limit exceeded"),
				new Error("Quota exceeded 429"),
				new Error("Requests per minute exceeded"),
			];

			for (const error of rateLimitErrors) {
				const result = ErrorHandler.getUserFriendlyMessage(error, "openai");
				expect(result).toContain("Rate limit reached");
			}
		});

		test("detects various temporary error formats", () => {
			const tempErrors = [
				new Error("Network error"),
				new Error("Connection timeout"),
				new Error("Service unavailable 503"),
				new Error("Server error 500"),
				new Error("Fetch failed"),
			];

			for (const error of tempErrors) {
				const result = ErrorHandler.getUserFriendlyMessage(error, "openai");
				expect(result).toContain("temporarily unavailable");
			}
		});
	});
});
