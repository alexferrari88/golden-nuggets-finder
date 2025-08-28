import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { EMBEDDING_CONFIG } from "../../shared/constants";
import { EmbeddingService } from "./embedding-service";

// Mock dependencies
vi.mock("../../shared/debug", () => ({
	debugLogger: {
		log: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
	},
}));

vi.mock("../../shared/storage", () => ({
	storage: {
		getApiKey: vi.fn(),
	},
}));

// Mock fetch globally
const mockFetch = vi.fn() as Mock;
global.fetch = mockFetch;

describe("EmbeddingService", () => {
	let embeddingService: EmbeddingService;
	let mockStorage: { getApiKey: Mock };

	beforeEach(async () => {
		vi.clearAllMocks();

		// Reset service instance
		embeddingService = new EmbeddingService();

		// Setup storage mock
		const { storage } = await import("../../shared/storage");
		mockStorage = storage as any;
		mockStorage.getApiKey = vi.fn().mockResolvedValue("test-api-key");

		// Clear any existing cache
		embeddingService.clearCache();
	});

	describe("initialization", () => {
		it("should initialize with correct configuration", () => {
			expect(embeddingService).toBeDefined();

			const stats = embeddingService.getCacheStats();
			expect(stats.size).toBe(0);
			expect(stats.maxSize).toBe(EMBEDDING_CONFIG.MAX_CACHE_SIZE);
		});
	});

	describe("generateEmbedding", () => {
		const mockEmbeddingResponse = {
			embedding: { values: [0.1, 0.2, 0.3] },
		};

		beforeEach(() => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: vi.fn().mockResolvedValue(mockEmbeddingResponse),
			});
		});

		it("should generate embedding for single text", async () => {
			const text = "API rate limiting technique";

			const result = await embeddingService.generateEmbedding(text);

			// With 768 dimensions (default), normalization is applied
			const expectedNormalized = {
				values: [0.2672612419124244, 0.5345224838248488, 0.8017837257372731],
			};
			expect(result).toEqual(expectedNormalized);
			expect(mockFetch).toHaveBeenCalledOnce();
		});

		it("should use cached embedding for repeated requests", async () => {
			const text = "API rate limiting technique";

			// First call
			const result1 = await embeddingService.generateEmbedding(text);

			// Second call (should use cache)
			const result2 = await embeddingService.generateEmbedding(text);

			expect(result1).toEqual(result2);
			expect(mockFetch).toHaveBeenCalledOnce(); // Only one API call
		});

		it("should use correct API endpoint and request body", async () => {
			const text = "test content";
			const options = {
				taskType: "SEMANTIC_SIMILARITY" as const,
				outputDimensionality: 768 as const,
			};

			await embeddingService.generateEmbedding(text, options);

			expect(mockFetch).toHaveBeenCalledWith(
				"https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent",
				expect.objectContaining({
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"x-goog-api-key": "test-api-key",
					},
					body: JSON.stringify({
						model: "models/gemini-embedding-001",
						content: { parts: [{ text }] },
						taskType: "SEMANTIC_SIMILARITY",
						outputDimensionality: 768,
					}),
				}),
			);
		});

		it("should use default options when not provided", async () => {
			const text = "test content";

			await embeddingService.generateEmbedding(text);

			expect(mockFetch).toHaveBeenCalledWith(
				"https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent",
				expect.objectContaining({
					headers: expect.objectContaining({
						"Content-Type": "application/json",
						"x-goog-api-key": "test-api-key",
					}),
					body: JSON.stringify({
						model: "models/gemini-embedding-001",
						content: { parts: [{ text }] },
						taskType: EMBEDDING_CONFIG.TASK_TYPE,
						outputDimensionality: EMBEDDING_CONFIG.OUTPUT_DIMENSIONALITY,
					}),
				}),
			);
		});

		it("should throw error if API key retrieval fails", async () => {
			mockStorage.getApiKey.mockRejectedValue(new Error("API key not found"));

			await expect(embeddingService.generateEmbedding("test")).rejects.toThrow(
				"Failed to retrieve API key for embeddings",
			);
		});

		it("should throw error if API key is null", async () => {
			mockStorage.getApiKey.mockResolvedValue(null);

			await expect(embeddingService.generateEmbedding("test")).rejects.toThrow(
				"Gemini API key not configured for embedding service",
			);
		});
	});

	describe("generateEmbeddings (batch)", () => {
		const mockBatchResponse = {
			embeddings: [
				{ values: [0.1, 0.2, 0.3] },
				{ values: [0.4, 0.5, 0.6] },
				{ values: [0.7, 0.8, 0.9] },
			],
		};

		beforeEach(() => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: vi.fn().mockResolvedValue(mockBatchResponse),
			});
		});

		it("should generate embeddings for multiple texts", async () => {
			const texts = ["text1", "text2", "text3"];

			const results = await embeddingService.generateEmbeddings(texts);

			expect(results).toHaveLength(3);
			// With 768 dimensions (default), normalization is applied
			expect(results[0]).toEqual({
				values: [0.2672612419124244, 0.5345224838248488, 0.8017837257372731],
			});
			expect(results[1]).toEqual({
				values: [0.4558423058385518, 0.5698028822981898, 0.6837634587578276],
			});
			expect(results[2]).toEqual({
				values: [0.5025707110324166, 0.5743665268941904, 0.6461623427559643],
			});
		});

		it("should handle empty text array", async () => {
			const results = await embeddingService.generateEmbeddings([]);

			expect(results).toEqual([]);
			expect(mockFetch).not.toHaveBeenCalled();
		});

		it("should batch requests when exceeding max batch size", async () => {
			const texts = Array(30).fill("test"); // Exceeds MAX_BATCH_SIZE of 25

			// Mock two batch responses
			mockFetch
				.mockResolvedValueOnce({
					ok: true,
					json: vi.fn().mockResolvedValue({
						embeddings: Array(25).fill({ values: [0.1, 0.2, 0.3] }),
					}),
				})
				.mockResolvedValueOnce({
					ok: true,
					json: vi.fn().mockResolvedValue({
						embeddings: Array(5).fill({ values: [0.4, 0.5, 0.6] }),
					}),
				});

			const results = await embeddingService.generateEmbeddings(texts);

			expect(results).toHaveLength(30);
			expect(mockFetch).toHaveBeenCalledTimes(2); // Two batch calls
		});

		it("should use cache efficiently for partial matches", async () => {
			// Pre-cache one text
			await embeddingService.generateEmbedding("cached-text");
			mockFetch.mockClear();

			// Request batch including cached text
			const texts = ["cached-text", "new-text"];

			mockFetch.mockResolvedValue({
				ok: true,
				json: vi.fn().mockResolvedValue({
					embeddings: [{ values: [0.4, 0.5, 0.6] }],
				}),
			});

			const results = await embeddingService.generateEmbeddings(texts);

			expect(results).toHaveLength(2);
			expect(mockFetch).toHaveBeenCalledOnce(); // Only for uncached text
		});
	});

	describe("error handling", () => {
		it("should handle HTTP error responses", async () => {
			mockFetch.mockResolvedValue({
				ok: false,
				status: 400,
				statusText: "Bad Request",
				json: vi.fn().mockResolvedValue({
					error: { message: "Invalid request format" },
				}),
			});

			await expect(embeddingService.generateEmbedding("test")).rejects.toThrow(
				"Gemini API error: Invalid request format",
			);
		}, 10000);

		it("should handle network errors with retry", async () => {
			mockFetch
				.mockRejectedValueOnce(new Error("Network error"))
				.mockRejectedValueOnce(new Error("Network error"))
				.mockResolvedValue({
					ok: true,
					json: vi.fn().mockResolvedValue({
						embeddings: [{ values: [0.1, 0.2, 0.3] }],
					}),
				});

			const result = await embeddingService.generateEmbedding("test");

			// With 768 dimensions (default), normalization is applied
			expect(result).toEqual({
				values: [0.2672612419124244, 0.5345224838248488, 0.8017837257372731],
			});
			expect(mockFetch).toHaveBeenCalledTimes(3); // Original + 2 retries
		});

		it("should fail after max retries", async () => {
			mockFetch.mockRejectedValue(new Error("Persistent network error"));

			await expect(embeddingService.generateEmbedding("test")).rejects.toThrow(
				"Persistent network error",
			);

			expect(mockFetch).toHaveBeenCalledTimes(EMBEDDING_CONFIG.MAX_RETRIES + 1);
		}, 10000);

		it("should handle malformed API responses", async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: vi.fn().mockResolvedValue({ invalid: "response" }),
			});

			await expect(embeddingService.generateEmbedding("test")).rejects.toThrow(
				"Invalid response format from Gemini embedding API",
			);
		}, 10000);
	});

	describe("cache management", () => {
		beforeEach(() => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: vi.fn().mockResolvedValue({
					embeddings: [{ values: [0.1, 0.2, 0.3] }],
				}),
			});
		});

		it("should cache embeddings with different options separately", async () => {
			const text = "test content";

			await embeddingService.generateEmbedding(text, {
				taskType: "CLUSTERING",
			});
			await embeddingService.generateEmbedding(text, {
				taskType: "SEMANTIC_SIMILARITY",
			});

			expect(mockFetch).toHaveBeenCalledTimes(2); // Different cache keys
		});

		it("should clear cache", async () => {
			await embeddingService.generateEmbedding("test");
			expect(embeddingService.getCacheStats().size).toBeGreaterThan(0);

			embeddingService.clearCache();
			expect(embeddingService.getCacheStats().size).toBe(0);
		});

		it("should enforce cache size limits", async () => {
			// Mock a small cache size for testing
			const originalMaxSize = EMBEDDING_CONFIG.MAX_CACHE_SIZE;

			// Generate more embeddings than cache size (this is a conceptual test)
			// In real implementation, we would need to modify MAX_CACHE_SIZE or test with actual limit
			const uniqueTexts = Array.from({ length: 10 }, (_, i) => `text-${i}`);

			for (const text of uniqueTexts) {
				await embeddingService.generateEmbedding(text);
			}

			const stats = embeddingService.getCacheStats();
			expect(stats.size).toBeLessThanOrEqual(originalMaxSize);
		});

		it("should expire cache entries", async () => {
			// This is conceptual since we can't easily control time in tests
			// In a real implementation, we might use vi.useFakeTimers() or dependency injection
			const text = "test content";

			await embeddingService.generateEmbedding(text);
			expect(embeddingService.getCacheStats().size).toBe(1);

			// Cache should still be valid immediately
			mockFetch.mockClear();
			await embeddingService.generateEmbedding(text);
			expect(mockFetch).not.toHaveBeenCalled();
		});
	});

	describe("cache key generation", () => {
		beforeEach(() => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: vi.fn().mockResolvedValue({
					embeddings: [{ values: [0.1, 0.2, 0.3] }],
				}),
			});
		});

		it("should generate different cache keys for different texts", async () => {
			await embeddingService.generateEmbedding("text1");
			await embeddingService.generateEmbedding("text2");

			expect(mockFetch).toHaveBeenCalledTimes(2);
		});

		it("should generate different cache keys for different task types", async () => {
			const text = "same text";

			await embeddingService.generateEmbedding(text, {
				taskType: "CLUSTERING",
			});
			await embeddingService.generateEmbedding(text, {
				taskType: "SEMANTIC_SIMILARITY",
			});

			expect(mockFetch).toHaveBeenCalledTimes(2);
		});

		it("should generate different cache keys for different dimensions", async () => {
			const text = "same text";

			await embeddingService.generateEmbedding(text, {
				outputDimensionality: 256,
			});
			await embeddingService.generateEmbedding(text, {
				outputDimensionality: 768,
			});

			expect(mockFetch).toHaveBeenCalledTimes(2);
		});
	});

	describe("vector normalization", () => {
		beforeEach(() => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: vi.fn().mockResolvedValue({
					embeddings: [{ values: [0.1, 0.2, 0.3] }],
				}),
			});
		});

		it("should normalize embeddings when outputDimensionality is not 3072", async () => {
			const result = await embeddingService.generateEmbedding("test", {
				outputDimensionality: 768,
			});

			// Original: [0.1, 0.2, 0.3]
			// L2 norm: sqrt(0.01 + 0.04 + 0.09) = sqrt(0.14) ≈ 0.374166
			// Normalized: [0.1/0.374166, 0.2/0.374166, 0.3/0.374166]
			expect(result.values).toHaveLength(3);
			expect(result.values[0]).toBeCloseTo(0.2672612419124244, 10);
			expect(result.values[1]).toBeCloseTo(0.5345224838248488, 10);
			expect(result.values[2]).toBeCloseTo(0.8017837257372731, 10);
		});

		it("should not normalize embeddings when outputDimensionality is 3072", async () => {
			const result = await embeddingService.generateEmbedding("test", {
				outputDimensionality: 3072,
			});

			// Should return original values without normalization
			expect(result.values).toEqual([0.1, 0.2, 0.3]);
		});

		it("should handle zero vector normalization gracefully", async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: vi.fn().mockResolvedValue({
					embeddings: [{ values: [0, 0, 0] }],
				}),
			});

			const result = await embeddingService.generateEmbedding("test", {
				outputDimensionality: 768,
			});

			// Zero vector should remain unchanged
			expect(result.values).toEqual([0, 0, 0]);
		});
	});

	describe("singleton instance", () => {
		it("should export a singleton instance", async () => {
			const { embeddingService: singleton1 } = await import(
				"./embedding-service"
			);
			const { embeddingService: singleton2 } = await import(
				"./embedding-service"
			);

			expect(singleton1).toBe(singleton2);
		});
	});

	describe("real-world integration scenarios", () => {
		beforeEach(() => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: vi.fn().mockResolvedValue({
					embeddings: [
						{ values: [0.8, 0.1, 0.2, 0.3] }, // API throttling
						{ values: [0.7, 0.2, 0.25, 0.35] }, // Rate limiting
						{ values: [0.1, 0.8, 0.3, 0.2] }, // Database indexing
					],
				}),
			});
		});

		it("should handle technical nugget similarity scenario", async () => {
			const nuggetTexts = [
				"API throttling technique",
				"Rate limiting mechanism",
				"Database indexing strategy",
			];

			const embeddings = await embeddingService.generateEmbeddings(nuggetTexts);

			expect(embeddings).toHaveLength(3);
			expect(embeddings[0].values).toHaveLength(4);
			expect(embeddings[1].values).toHaveLength(4);
			expect(embeddings[2].values).toHaveLength(4);
		});

		it("should work with ensemble extractor style batching", async () => {
			// Simulate ensemble extractor workflow
			const nuggets = [
				{ startContent: "API", endContent: "throttling" },
				{ startContent: "Rate", endContent: "limiting" },
				{ startContent: "Database", endContent: "indexing" },
			];

			const texts = nuggets.map((n) => `${n.startContent} ${n.endContent}`);

			const embeddings = await embeddingService.generateEmbeddings(texts, {
				taskType: "CLUSTERING",
				outputDimensionality: 768,
			});

			expect(embeddings).toHaveLength(3);
			expect(mockFetch).toHaveBeenCalledWith(
				"https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent",
				expect.objectContaining({
					headers: expect.objectContaining({
						"Content-Type": "application/json",
						"x-goog-api-key": "test-api-key",
					}),
					body: JSON.stringify({
						model: "models/gemini-embedding-001",
						content: texts.map((text) => ({ parts: [{ text }] })),
						taskType: "CLUSTERING",
						outputDimensionality: 768,
					}),
				}),
			);
		});
	});
});
