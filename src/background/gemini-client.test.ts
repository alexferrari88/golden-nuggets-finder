import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockChrome } from "../../tests/setup";
import { storage } from "../shared/storage";
import { GeminiClient } from "./gemini-client";

// Type interface for accessing private methods in tests
interface GeminiClientTestable {
	initializeClient(): Promise<void>;
	apiKey: string | null;
	enhanceError(error: unknown): Error;
	isNonRetryableError(errorMessage: string): boolean;
}

describe("GeminiClient", () => {
	let geminiClient: GeminiClient;
	let geminiClientTestable: GeminiClientTestable;

	beforeEach(() => {
		geminiClient = new GeminiClient();
		geminiClientTestable = geminiClient as unknown as GeminiClientTestable;
		vi.clearAllMocks();
		global.fetch = vi.fn();
		// Clear storage cache to ensure fresh state for each test
		storage.clearAllCache();
	});

	describe("initializeClient", () => {
		it("should initialize with API key from storage", async () => {
			const testApiKey = "test-api-key";
			vi.spyOn(storage, "getApiKey").mockResolvedValue(testApiKey);

			await geminiClientTestable.initializeClient();

			expect(geminiClientTestable.apiKey).toBe(testApiKey);
		});

		it("should throw error if no API key found", async () => {
			vi.spyOn(storage, "getApiKey").mockResolvedValue("");

			await expect(geminiClientTestable.initializeClient()).rejects.toThrow(
				"Gemini API key not configured. Please set it in the options page.",
			);
		});

		it("should not reinitialize if already initialized", async () => {
			const testApiKey = "test-api-key";
			const getApiKeySpy = vi
				.spyOn(storage, "getApiKey")
				.mockResolvedValue(testApiKey);

			await geminiClientTestable.initializeClient();
			getApiKeySpy.mockClear();

			await geminiClientTestable.initializeClient();

			expect(getApiKeySpy).not.toHaveBeenCalled();
		});
	});

	describe("analyzeContent", () => {
		beforeEach(() => {
			vi.spyOn(storage, "getApiKey").mockResolvedValue("test-api-key");
		});

		it("should analyze content successfully", async () => {
			const mockResponse = {
				candidates: [
					{
						content: {
							parts: [
								{
									text: JSON.stringify({
										golden_nuggets: [
											{
												type: "tool",
												content: "Test content",
												synthesis: "Test synthesis",
											},
										],
									}),
								},
							],
						},
					},
				],
			};

			global.fetch = vi.fn().mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockResponse),
			});

			const result = await geminiClient.analyzeContent(
				"test content",
				"test prompt",
			);

			expect(result).toEqual({
				golden_nuggets: [
					{
						type: "tool",
						content: "Test content",
						synthesis: "Test synthesis",
					},
				],
			});
		});

		it("should construct proper request body", async () => {
			const mockResponse = {
				candidates: [
					{
						content: {
							parts: [
								{
									text: JSON.stringify({ golden_nuggets: [] }),
								},
							],
						},
					},
				],
			};

			global.fetch = vi.fn().mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockResponse),
			});

			await geminiClient.analyzeContent("test content", "test prompt");

			expect(global.fetch).toHaveBeenCalledWith(
				expect.stringContaining("gemini-2.5-flash:generateContent"),
				expect.objectContaining({
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"x-goog-api-key": "test-api-key",
					},
					body: expect.stringMatching(
						/"system_instruction":{"parts":\[{"text":"test prompt"}\]}.*"contents":\[{"parts":\[{"text":"test content"}\]}\]/,
					),
				}),
			);
		});

		it("should throw error if API key not initialized", async () => {
			vi.spyOn(storage, "getApiKey").mockResolvedValue("");

			await expect(
				geminiClient.analyzeContent("test content", "test prompt"),
			).rejects.toThrow(
				"Gemini API key not configured. Please set it in the options page.",
			);
		});

		it("should throw error on API error response", async () => {
			global.fetch = vi.fn().mockResolvedValueOnce({
				ok: false,
				status: 400,
				statusText: "Bad Request",
				text: () => Promise.resolve("Error details"),
			});

			await expect(
				geminiClient.analyzeContent("test content", "test prompt"),
			).rejects.toThrow(
				"Invalid request: Gemini API error: 400 Bad Request - Error details",
			);
		});

		it("should throw error if no response text", async () => {
			const mockResponse = {
				candidates: [
					{
						content: {
							parts: [{}],
						},
					},
				],
			};

			global.fetch = vi.fn().mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockResponse),
			});

			await expect(
				geminiClient.analyzeContent("test content", "test prompt"),
			).rejects.toThrow("Gemini API error:");
		});

		it("should throw error on invalid response format", async () => {
			const mockResponse = {
				candidates: [
					{
						content: {
							parts: [
								{
									text: JSON.stringify({ invalid: "format" }),
								},
							],
						},
					},
				],
			};

			global.fetch = vi.fn().mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockResponse),
			});

			await expect(
				geminiClient.analyzeContent("test content", "test prompt"),
			).rejects.toThrow("Gemini API error:");
		});

		it("should throw error on malformed JSON", async () => {
			const mockResponse = {
				candidates: [
					{
						content: {
							parts: [
								{
									text: "invalid json",
								},
							],
						},
					},
				],
			};

			global.fetch = vi.fn().mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockResponse),
			});

			await expect(
				geminiClient.analyzeContent("test content", "test prompt"),
			).rejects.toThrow();
		});
	});

	describe("retryRequest", () => {
		beforeEach(() => {
			mockChrome.storage.sync.get.mockResolvedValue({
				geminiApiKey: "test-api-key",
			});
		});

		it("should retry on network error", async () => {
			const mockResponse = {
				candidates: [
					{
						content: {
							parts: [
								{
									text: JSON.stringify({ golden_nuggets: [] }),
								},
							],
						},
					},
				],
			};

			global.fetch = vi
				.fn()
				.mockRejectedValueOnce(new Error("Network error"))
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve(mockResponse),
				});

			const result = await geminiClient.analyzeContent(
				"test content",
				"test prompt",
			);

			expect(global.fetch).toHaveBeenCalledTimes(2);
			expect(result).toEqual({ golden_nuggets: [] });
		});

		it("should not retry on API key error", async () => {
			vi.spyOn(storage, "getApiKey").mockResolvedValue("test-api-key");
			global.fetch = vi
				.fn()
				.mockRejectedValueOnce(new Error("API key invalid"));

			await expect(
				geminiClient.analyzeContent("test content", "test prompt"),
			).rejects.toThrow("Invalid API key");

			expect(global.fetch).toHaveBeenCalledTimes(1);
		});

		it("should exhaust retries and throw error", async () => {
			vi.spyOn(storage, "getApiKey").mockResolvedValue("test-api-key");
			global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

			await expect(
				geminiClient.analyzeContent("test content", "test prompt"),
			).rejects.toThrow(
				"Network error. Please check your internet connection.",
			);

			expect(global.fetch).toHaveBeenCalledTimes(3);
		});

		it("should use exponential backoff", async () => {
			vi.spyOn(storage, "getApiKey").mockResolvedValue("test-api-key");
			const mockResponse = {
				candidates: [
					{
						content: {
							parts: [
								{
									text: JSON.stringify({ golden_nuggets: [] }),
								},
							],
						},
					},
				],
			};

			global.fetch = vi
				.fn()
				.mockRejectedValueOnce(new Error("Network error"))
				.mockRejectedValueOnce(new Error("Network error"))
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve(mockResponse),
				});

			const startTime = Date.now();
			await geminiClient.analyzeContent("test content", "test prompt");
			const endTime = Date.now();

			// Should have waited at least 1000ms + 2000ms for retries
			expect(endTime - startTime).toBeGreaterThan(2000);
		});
	});

	describe("enhanceError", () => {
		it("should enhance API key error with original details", () => {
			const error = new Error(
				"API_KEY_INVALID: The provided API key is invalid",
			);
			const enhanced = geminiClientTestable.enhanceError(error);

			expect(enhanced.message).toBe(
				"Invalid API key: API_KEY_INVALID: The provided API key is invalid. Please check your Gemini API key in settings.",
			);
		});

		it("should enhance authentication error with context", () => {
			const error = new Error(
				"Authentication failed: Invalid credentials provided",
			);
			const enhanced = geminiClientTestable.enhanceError(error);

			expect(enhanced.message).toBe(
				"Invalid API key: Authentication failed: Invalid credentials provided. Please check your Gemini API key in settings.",
			);
		});

		it("should enhance rate limit error with details extraction", () => {
			const error = new Error("Rate limit exceeded. Reset in 3600 seconds");
			const enhanced = geminiClientTestable.enhanceError(error);

			// The regex captures just the number, not the full phrase
			expect(enhanced.message).toBe(
				"Rate limit reached (3600). Please wait before trying again.",
			);
		});

		it("should handle rate limit without specific details", () => {
			const error = new Error("Rate limit exceeded");
			const enhanced = geminiClientTestable.enhanceError(error);

			expect(enhanced.message).toBe(
				"Rate limit reached. Please wait before trying again.",
			);
		});

		it("should enhance quota errors with original message", () => {
			const error = new Error(
				"Quota exceeded for this API key. Current usage: 1000/1000 requests",
			);
			const enhanced = geminiClientTestable.enhanceError(error);

			// Quota errors are caught by "api key" check first, not the quota check
			expect(enhanced.message).toBe(
				"Invalid API key: Quota exceeded for this API key. Current usage: 1000/1000 requests. Please check your Gemini API key in settings.",
			);
		});

		it("should enhance timeout error with original context", () => {
			const error = new Error("Request timeout after 30000ms");
			const enhanced = geminiClientTestable.enhanceError(error);

			expect(enhanced.message).toBe(
				"Request timed out: Request timeout after 30000ms. Please try again.",
			);
		});

		it("should enhance network error with original details", () => {
			const error = new Error(
				"Network connection failed: DNS resolution failed",
			);
			const enhanced = geminiClientTestable.enhanceError(error);

			expect(enhanced.message).toBe(
				"Network error: Network connection failed: DNS resolution failed. Please check your internet connection.",
			);
		});

		it("should enhance failed to fetch errors", () => {
			const error = new Error(
				"Failed to fetch from https://generativelanguage.googleapis.com",
			);
			const enhanced = geminiClientTestable.enhanceError(error);

			expect(enhanced.message).toBe(
				"Network error: Failed to fetch from https://generativelanguage.googleapis.com. Please check your internet connection.",
			);
		});

		it("should handle 400 Bad Request errors", () => {
			const error = new Error("400 Bad Request: Invalid JSON in request body");
			const enhanced = geminiClientTestable.enhanceError(error);

			expect(enhanced.message).toBe(
				"Invalid request: 400 Bad Request: Invalid JSON in request body. The content might be too large or contain unsupported characters.",
			);
		});

		it("should handle 403 Forbidden errors with API key mention", () => {
			const error = new Error(
				"403 Forbidden: API key does not have permission",
			);
			const enhanced = geminiClientTestable.enhanceError(error);

			// 403 errors with "api key" in message are caught by API key check first
			expect(enhanced.message).toBe(
				"Invalid API key: 403 Forbidden: API key does not have permission. Please check your Gemini API key in settings.",
			);
		});

		it("should handle 403 Forbidden errors without API key mention", () => {
			const error = new Error("403 Forbidden: Access denied to this resource");
			const enhanced = geminiClientTestable.enhanceError(error);

			// 403 errors without "api key" should be handled by the 403 check
			expect(enhanced.message).toBe(
				"Access denied: 403 Forbidden: Access denied to this resource. Please check your API key permissions.",
			);
		});

		it("should handle 404 Not Found errors", () => {
			const error = new Error("404 Not Found: Model not found");
			const enhanced = geminiClientTestable.enhanceError(error);

			expect(enhanced.message).toBe(
				"API endpoint not found: 404 Not Found: Model not found. The Gemini API might be unavailable.",
			);
		});

		it("should handle 500 Internal Server Error", () => {
			const error = new Error(
				"500 Internal Server Error: Service temporarily unavailable",
			);
			const enhanced = geminiClientTestable.enhanceError(error);

			expect(enhanced.message).toBe(
				"Gemini API server error: 500 Internal Server Error: Service temporarily unavailable. Please try again later.",
			);
		});

		it("should preserve original message for unrecognized errors", () => {
			const error = new Error("Some unexpected API error occurred");
			const enhanced = geminiClientTestable.enhanceError(error);

			expect(enhanced.message).toBe(
				"Gemini API error: Some unexpected API error occurred",
			);
		});

		it("should handle unknown error types with fallback", () => {
			const enhanced = geminiClientTestable.enhanceError("string error");

			expect(enhanced.message).toBe(
				"Analysis failed with unknown error: string error",
			);
		});

		it("should handle null/undefined errors", () => {
			const enhanced = geminiClientTestable.enhanceError(null);

			expect(enhanced.message).toBe("Analysis failed with unknown error: null");
		});
	});

	describe("isNonRetryableError", () => {
		it("should identify API key errors as non-retryable", () => {
			const result =
				geminiClientTestable.isNonRetryableError("API key invalid");
			expect(result).toBe(true);
		});

		it("should identify authentication errors as non-retryable", () => {
			const result = geminiClientTestable.isNonRetryableError(
				"Authentication failed",
			);
			expect(result).toBe(true);
		});

		it("should identify bad request errors as non-retryable", () => {
			const result =
				geminiClientTestable.isNonRetryableError("Bad request format");
			expect(result).toBe(true);
		});

		it("should identify network errors as retryable", () => {
			const result = geminiClientTestable.isNonRetryableError(
				"Network connection failed",
			);
			expect(result).toBe(false);
		});

		it("should identify timeout errors as retryable", () => {
			const result =
				geminiClientTestable.isNonRetryableError("Request timed out");
			expect(result).toBe(false);
		});
	});

	describe("validateApiKey", () => {
		it("should validate API key successfully", async () => {
			global.fetch = vi.fn().mockResolvedValueOnce({
				ok: true,
			});

			const result = await geminiClient.validateApiKey("valid-api-key");

			expect(result).toBe(true);
			expect(global.fetch).toHaveBeenCalledWith(
				"https://generativelanguage.googleapis.com/v1beta/models",
				expect.objectContaining({
					method: "GET",
					headers: {
						"Content-Type": "application/json",
						"x-goog-api-key": "valid-api-key",
					},
				}),
			);
		});

		it("should reject invalid API key", async () => {
			global.fetch = vi.fn().mockResolvedValueOnce({
				ok: false,
			});

			const result = await geminiClient.validateApiKey("invalid-api-key");

			expect(result).toBe(false);
		});

		it("should reject empty API key", async () => {
			const result = await geminiClient.validateApiKey("");

			expect(result).toBe(false);
			expect(global.fetch).not.toHaveBeenCalled();
		});

		it("should reject whitespace-only API key", async () => {
			const result = await geminiClient.validateApiKey("   ");

			expect(result).toBe(false);
			expect(global.fetch).not.toHaveBeenCalled();
		});

		it("should handle network error during validation", async () => {
			global.fetch = vi.fn().mockRejectedValueOnce(new Error("Network error"));

			const result = await geminiClient.validateApiKey("test-api-key");

			expect(result).toBe(false);
		});

		it("should use GET request with API key in header", async () => {
			global.fetch = vi.fn().mockResolvedValueOnce({
				ok: true,
			});

			await geminiClient.validateApiKey("test-api-key");

			const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock
				.calls[0];
			expect(fetchCall[0]).toBe(
				"https://generativelanguage.googleapis.com/v1beta/models",
			);
			expect(fetchCall[1].method).toBe("GET");
			expect(fetchCall[1].headers["x-goog-api-key"]).toBe("test-api-key");
			expect(fetchCall[1].body).toBeUndefined();
		});
	});
});
