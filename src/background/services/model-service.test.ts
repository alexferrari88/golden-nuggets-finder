import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProviderId } from "../../shared/types/providers";
import { ModelService } from "./model-service";

// Type to access private methods for testing
interface ModelServiceWithPrivates {
	fetchWithTimeout: (
		url: string,
		options?: RequestInit,
		timeout?: number,
	) => Promise<Response>;
}

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("ModelService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.clearAllTimers();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe("fetchModels", () => {
		it("should fetch Gemini models successfully", async () => {
			const mockGeminiResponse = {
				models: [
					{
						name: "models/gemini-2.5-flash",
						displayName: "Gemini 2.5 Flash",
						description: "Fast model for quick responses",
						supportedGenerationMethods: ["generateContent"],
						inputTokenLimit: 1048576,
					},
					{
						name: "models/gemini-2.5-pro",
						displayName: "Gemini 2.5 Pro",
						description: "Most capable model",
						supportedGenerationMethods: ["generateContent"],
						inputTokenLimit: 2097152,
					},
					{
						name: "models/embedding-model",
						displayName: "Embedding Model",
						description: "For embeddings only",
						supportedGenerationMethods: ["embedContent"],
					},
				],
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockGeminiResponse),
			});

			const result = await ModelService.fetchModels("gemini", "test-api-key");

			expect(result.models).toHaveLength(2); // Only generateContent models
			expect(result.models[0]).toEqual({
				id: "gemini-2.5-flash",
				name: "Gemini 2.5 Flash",
				description: "Fast model for quick responses",
				contextLength: 1048576,
			});
			expect(result.models[1]).toEqual({
				id: "gemini-2.5-pro",
				name: "Gemini 2.5 Pro",
				description: "Most capable model",
				contextLength: 2097152,
			});
			expect(result.error).toBeUndefined();

			expect(mockFetch).toHaveBeenCalledWith(
				"https://generativelanguage.googleapis.com/v1beta/models?key=test-api-key",
				expect.objectContaining({
					signal: expect.any(AbortSignal),
				}),
			);
		});

		it("should fetch OpenAI models successfully", async () => {
			const mockOpenAIResponse = {
				data: [
					{
						id: "gpt-4o",
						object: "model",
						created: 1677610602,
						owned_by: "openai",
					},
					{
						id: "gpt-3.5-turbo",
						object: "model",
						created: 1677610602,
						owned_by: "openai",
					},
					{
						id: "text-embedding-ada-002",
						object: "model",
						created: 1677610602,
						owned_by: "openai",
					},
					{
						id: "whisper-1",
						object: "model",
						created: 1677610602,
						owned_by: "openai",
					},
				],
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockOpenAIResponse),
			});

			const result = await ModelService.fetchModels("openai", "test-api-key");

			expect(result.models).toHaveLength(2); // Only GPT models, not embeddings or whisper
			expect(result.models[0]).toEqual({
				id: "gpt-3.5-turbo",
				name: "gpt-3.5-turbo",
				description: "OpenAI gpt-3.5-turbo",
			});
			expect(result.models[1]).toEqual({
				id: "gpt-4o",
				name: "gpt-4o",
				description: "OpenAI gpt-4o",
			});
			expect(result.error).toBeUndefined();

			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.openai.com/v1/models",
				expect.objectContaining({
					headers: {
						Authorization: "Bearer test-api-key",
					},
					signal: expect.any(AbortSignal),
				}),
			);
		});

		it("should fetch Anthropic models successfully", async () => {
			const mockAnthropicResponse = {
				data: [
					{
						id: "claude-sonnet-4-20250514",
						display_name: "Claude Sonnet 4",
						type: "message",
					},
					{
						id: "claude-3-5-sonnet-20241022",
						display_name: "Claude 3.5 Sonnet",
						type: "message",
					},
				],
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockAnthropicResponse),
			});

			const result = await ModelService.fetchModels(
				"anthropic",
				"test-api-key",
			);

			expect(result.models).toHaveLength(2);
			expect(result.models[0]).toEqual({
				id: "claude-3-5-sonnet-20241022",
				name: "Claude 3.5 Sonnet",
				description: "Anthropic Claude 3.5 Sonnet",
			});
			expect(result.models[1]).toEqual({
				id: "claude-sonnet-4-20250514",
				name: "Claude Sonnet 4",
				description: "Anthropic Claude Sonnet 4",
			});
			expect(result.error).toBeUndefined();

			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.anthropic.com/v1/models",
				expect.objectContaining({
					headers: {
						"x-api-key": "test-api-key",
						"anthropic-version": "2023-06-01",
					},
					signal: expect.any(AbortSignal),
				}),
			);
		});

		it("should fetch OpenRouter models successfully", async () => {
			const mockOpenRouterResponse = {
				data: [
					{
						id: "openai/gpt-4o",
						name: "GPT-4o",
						description: "OpenAI's latest multimodal model",
						architecture: { modality: "text->text" },
						context_length: 128000,
					},
					{
						id: "anthropic/claude-sonnet-4",
						name: "Claude Sonnet 4",
						description: "Anthropic's latest model",
						architecture: { modality: "text+image->text" },
						context_length: 200000,
					},
					{
						id: "stable-diffusion/model",
						name: "Stable Diffusion",
						description: "Image generation model",
						architecture: { modality: "text->image" },
					},
				],
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockOpenRouterResponse),
			});

			const result = await ModelService.fetchModels(
				"openrouter",
				"test-api-key",
			);

			expect(result.models).toHaveLength(2); // Only text generation models
			expect(result.models[0]).toEqual({
				id: "anthropic/claude-sonnet-4",
				name: "Claude Sonnet 4",
				description: "Anthropic's latest model",
				contextLength: 200000,
			});
			expect(result.models[1]).toEqual({
				id: "openai/gpt-4o",
				name: "GPT-4o",
				description: "OpenAI's latest multimodal model",
				contextLength: 128000,
			});
			expect(result.error).toBeUndefined();

			expect(mockFetch).toHaveBeenCalledWith(
				"https://openrouter.ai/api/v1/models",
				expect.objectContaining({
					headers: {
						Authorization: "Bearer test-api-key",
					},
					signal: expect.any(AbortSignal),
				}),
			);
		});

		it("should handle HTTP errors", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 401,
				statusText: "Unauthorized",
			});

			const result = await ModelService.fetchModels("gemini", "invalid-key");

			expect(result.models).toEqual([]);
			expect(result.error).toBe(
				"Failed to fetch models: HTTP 401: Unauthorized",
			);
		});

		it("should handle network errors", async () => {
			mockFetch.mockRejectedValueOnce(new Error("Network error"));

			const result = await ModelService.fetchModels("openai", "test-key");

			expect(result.models).toEqual([]);
			expect(result.error).toBe("Failed to fetch models: Network error");
		});

		it("should handle timeout errors", async () => {
			const abortError = new Error("Request timeout");
			abortError.name = "AbortError";

			mockFetch.mockRejectedValueOnce(abortError);

			const result = await ModelService.fetchModels("gemini", "test-key");

			expect(result.models).toEqual([]);
			expect(result.error).toBe("Failed to fetch models: Request timeout");
		});

		it("should handle unsupported provider", async () => {
			const result = await ModelService.fetchModels(
				"unsupported" as ProviderId,
				"test-key",
			);

			expect(result.models).toEqual([]);
			expect(result.error).toBe("Unsupported provider: unsupported");
			expect(mockFetch).not.toHaveBeenCalled();
		});

		it("should handle malformed JSON responses", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.reject(new Error("Invalid JSON")),
			});

			const result = await ModelService.fetchModels("gemini", "test-key");

			expect(result.models).toEqual([]);
			expect(result.error).toBe("Failed to fetch models: Invalid JSON");
		});

		it("should handle empty or missing models in response", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({}), // No models field
			});

			const result = await ModelService.fetchModels("gemini", "test-key");

			expect(result.models).toEqual([]);
			expect(result.error).toBeUndefined();
		});
	});

	describe("getFallbackModels", () => {
		it("should return Gemini fallback models", () => {
			const models = ModelService.getFallbackModels("gemini");

			expect(models).toHaveLength(3);
			expect(models[0]).toEqual({
				id: "gemini-2.5-flash",
				name: "Gemini 2.5 Flash",
				description: "Fast, cost-effective model",
			});
			expect(models[1]).toEqual({
				id: "gemini-2.5-pro",
				name: "Gemini 2.5 Pro",
				description: "Most capable model with enhanced reasoning",
			});
			expect(models[2]).toEqual({
				id: "gemini-2.0-flash",
				name: "Gemini 2.0 Flash",
				description: "Next-gen capabilities with superior speed",
			});
		});

		it("should return OpenAI fallback models", () => {
			const models = ModelService.getFallbackModels("openai");

			expect(models).toHaveLength(3);
			expect(models.map((m) => m.id)).toEqual([
				"gpt-4o",
				"gpt-4",
				"gpt-3.5-turbo",
			]);
		});

		it("should return Anthropic fallback models", () => {
			const models = ModelService.getFallbackModels("anthropic");

			expect(models).toHaveLength(3);
			expect(models.map((m) => m.id)).toEqual([
				"claude-sonnet-4-20250514",
				"claude-3-5-sonnet-20241022",
				"claude-3-5-haiku-20241022",
			]);
		});

		it("should return OpenRouter fallback models", () => {
			const models = ModelService.getFallbackModels("openrouter");

			expect(models).toHaveLength(3);
			expect(models.map((m) => m.id)).toEqual([
				"openai/gpt-4o",
				"anthropic/claude-sonnet-4",
				"google/gemini-pro",
			]);
		});

		it("should return empty array for unsupported provider", () => {
			const models = ModelService.getFallbackModels(
				"unsupported" as ProviderId,
			);
			expect(models).toEqual([]);
		});
	});

	describe("fetchWithTimeout", () => {
		it("should abort request on timeout", async () => {
			const abortError = new Error("Request timeout");
			abortError.name = "AbortError";

			mockFetch.mockRejectedValueOnce(abortError);

			try {
				await (
					ModelService as unknown as ModelServiceWithPrivates
				).fetchWithTimeout("http://test.com");
				expect.fail("Should have thrown an error");
			} catch (error) {
				expect(error.message).toBe("Request timeout");
			}
		});

		it("should clear timeout on successful response", async () => {
			const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({}),
			});

			await (
				ModelService as unknown as ModelServiceWithPrivates
			).fetchWithTimeout("http://test.com");

			expect(clearTimeoutSpy).toHaveBeenCalled();
		});
	});
});
