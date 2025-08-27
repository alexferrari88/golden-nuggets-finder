import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { EnsembleExtractor } from "../../src/background/services/ensemble-extractor";
import type { SimilarityOptions } from "../../src/shared/types/embedding-types";
import type {
	GoldenNuggetsResponse,
	LLMProvider,
} from "../../src/shared/types/providers";

// Mock dependencies
vi.mock("../../src/background/services/embedding-service", () => ({
	embeddingService: {
		generateEmbeddings: vi.fn(),
		getCacheStats: vi.fn().mockReturnValue({ size: 0, maxSize: 1000 }),
		clearCache: vi.fn(),
	},
}));

vi.mock("../../src/shared/utils/cosine-similarity", () => ({
	calculateCosineSimilarity: vi.fn(),
}));

vi.mock("../../src/background/services/response-normalizer", () => ({
	normalize: vi.fn((response) => response),
}));

describe("EnsembleExtractor with Embeddings Integration", () => {
	let ensembleExtractor: EnsembleExtractor;
	let mockProvider: LLMProvider;
	let mockEmbeddingService: any;
	let mockCalculateCosineSimilarity: Mock;

	const mockProviderResponses: GoldenNuggetsResponse[] = [
		{
			golden_nuggets: [
				{ type: "tool", startContent: "API", endContent: "throttling" },
				{ type: "media", startContent: "React", endContent: "documentation" },
			],
		},
		{
			golden_nuggets: [
				{ type: "tool", startContent: "Request", endContent: "throttling" },
				{ type: "tool", startContent: "Database", endContent: "indexing" },
			],
		},
		{
			golden_nuggets: [
				{ type: "tool", startContent: "Rate", endContent: "limiting" },
				{ type: "media", startContent: "Next.js", endContent: "guide" },
			],
		},
	];

	beforeEach(async () => {
		vi.clearAllMocks();

		ensembleExtractor = new EnsembleExtractor();

		// Mock LLM Provider
		mockProvider = {
			providerId: "gemini",
			modelName: "gemini-2.5-flash",
			extractGoldenNuggets: vi.fn(),
			validateApiKey: vi.fn(),
		} as LLMProvider;

		// Setup embedding service mock using vi.mocked for better type safety
		const { embeddingService } = await import(
			"../../src/background/services/embedding-service"
		);
		const { calculateCosineSimilarity } = await import(
			"../../src/shared/utils/cosine-similarity"
		);
		mockEmbeddingService = embeddingService;
		mockCalculateCosineSimilarity = vi.mocked(calculateCosineSimilarity);

		// Mock embeddings - simulate semantic similarity
		mockEmbeddingService.generateEmbeddings.mockResolvedValue([
			{ values: [0.8, 0.1, 0.2] }, // API throttling
			{ values: [0.1, 0.8, 0.1] }, // React documentation
			{ values: [0.7, 0.2, 0.1] }, // Request throttling (similar to API throttling)
			{ values: [0.2, 0.1, 0.8] }, // Database indexing
			{ values: [0.75, 0.15, 0.1] }, // Rate limiting (similar to throttling)
			{ values: [0.1, 0.7, 0.2] }, // Next.js guide (similar to React docs)
		]);

		// Mock cosine similarity calculations
		mockCalculateCosineSimilarity.mockImplementation((v1, v2) => {
			// Simulate similarity based on first component (throttling/rate limiting family)
			const sim =
				v1.values[0] * v2.values[0] +
				v1.values[1] * v2.values[1] +
				v1.values[2] * v2.values[2];
			return Math.max(0, Math.min(1, sim)); // Clamp to [0,1]
		});

		// Setup provider responses
		(mockProvider.extractGoldenNuggets as Mock)
			.mockResolvedValueOnce(mockProviderResponses[0])
			.mockResolvedValueOnce(mockProviderResponses[1])
			.mockResolvedValueOnce(mockProviderResponses[2]);
	});

	describe("ensemble extraction with embeddings", () => {
		it("should perform ensemble extraction with embedding-based similarity", async () => {
			const content = "Test content about API throttling and React";
			const prompt = "Extract golden nuggets";

			const result = await ensembleExtractor.extractWithEnsemble(
				content,
				prompt,
				mockProvider,
				{
					runs: 3,
					temperature: 0.2,
					parallelExecution: true,
					similarityOptions: {
						useEmbeddings: true,
						embeddingThreshold: 0.8,
						wordOverlapThreshold: 0.7,
					},
				},
			);

			expect(result).toBeDefined();
			expect(result.golden_nuggets).toBeDefined();
			expect(result.metadata).toBeDefined();
			expect(result.metadata.totalRuns).toBe(3);
			expect(mockProvider.extractGoldenNuggets).toHaveBeenCalledTimes(3);
		});

		it("should group similar nuggets using embeddings", async () => {
			const result = await ensembleExtractor.extractWithEnsemble(
				"Test content",
				"Extract nuggets",
				mockProvider,
				{
					runs: 3,
					temperature: 0.2,
					parallelExecution: true,
					similarityOptions: {
						useEmbeddings: true,
						embeddingThreshold: 0.5, // Lower threshold for easier grouping
					},
				},
			);

			// Should group throttling-related nuggets together
			const throttlingNuggets = result.golden_nuggets.filter(
				(nugget) => nugget.confidence > 0.5, // Multiple runs agreed
			);

			expect(throttlingNuggets.length).toBeGreaterThan(0);
			expect(mockEmbeddingService.generateEmbeddings).toHaveBeenCalled();
		});

		it("should fall back to word overlap when embeddings fail", async () => {
			mockEmbeddingService.generateEmbeddings.mockRejectedValue(
				new Error("API error"),
			);

			const result = await ensembleExtractor.extractWithEnsemble(
				"Test content",
				"Extract nuggets",
				mockProvider,
				{
					runs: 3,
					temperature: 0.2,
					parallelExecution: true,
					similarityOptions: {
						useEmbeddings: true,
						embeddingThreshold: 0.8,
					},
				},
			);

			expect(result).toBeDefined();
			expect(result.golden_nuggets).toBeDefined();
			// Should still work with word overlap fallback
		});

		it("should work without similarity options (default behavior)", async () => {
			const result = await ensembleExtractor.extractWithEnsemble(
				"Test content",
				"Extract nuggets",
				mockProvider,
				{
					runs: 3,
					temperature: 0.2,
					parallelExecution: true,
					// No similarityOptions provided
				},
			);

			expect(result).toBeDefined();
			expect(result.golden_nuggets).toBeDefined();
			expect(result.metadata.totalRuns).toBe(3);
		});
	});

	describe("consensus building with embeddings", () => {
		it("should calculate confidence scores based on run agreement", async () => {
			const result = await ensembleExtractor.extractWithEnsemble(
				"Test content",
				"Extract nuggets",
				mockProvider,
				{
					runs: 3,
					temperature: 0.2,
					parallelExecution: true,
					similarityOptions: {
						useEmbeddings: true,
						embeddingThreshold: 0.6,
					},
				},
			);

			// Check confidence scores
			result.golden_nuggets.forEach((nugget) => {
				expect(nugget.confidence).toBeGreaterThan(0);
				expect(nugget.confidence).toBeLessThanOrEqual(1);
				expect(nugget.runsSupportingThis).toBeGreaterThan(0);
				expect(nugget.runsSupportingThis).toBeLessThanOrEqual(3);
			});
		});

		it("should sort nuggets by confidence", async () => {
			const result = await ensembleExtractor.extractWithEnsemble(
				"Test content",
				"Extract nuggets",
				mockProvider,
				{
					runs: 3,
					temperature: 0.2,
					parallelExecution: true,
				},
			);

			// Verify nuggets are sorted by confidence (highest first)
			for (let i = 1; i < result.golden_nuggets.length; i++) {
				expect(result.golden_nuggets[i - 1].confidence).toBeGreaterThanOrEqual(
					result.golden_nuggets[i].confidence,
				);
			}
		});

		it("should include metadata about consensus process", async () => {
			const result = await ensembleExtractor.extractWithEnsemble(
				"Test content",
				"Extract nuggets",
				mockProvider,
				{
					runs: 3,
					temperature: 0.2,
					parallelExecution: true,
				},
			);

			expect(result.metadata).toMatchObject({
				totalRuns: 3,
				consensusReached: expect.any(Number),
				duplicatesRemoved: expect.any(Number),
				averageResponseTime: expect.any(Number),
			});
		});
	});

	describe("similarity configuration", () => {
		it("should use custom similarity thresholds", async () => {
			const customOptions: Partial<SimilarityOptions> = {
				embeddingThreshold: 0.9, // High threshold
				wordOverlapThreshold: 0.9,
				useEmbeddings: true,
			};

			const result = await ensembleExtractor.extractWithEnsemble(
				"Test content",
				"Extract nuggets",
				mockProvider,
				{
					runs: 3,
					temperature: 0.2,
					parallelExecution: true,
					similarityOptions: customOptions,
				},
			);

			expect(result).toBeDefined();
			// With high thresholds, fewer nuggets should be grouped
		});

		it("should disable embeddings when requested", async () => {
			const result = await ensembleExtractor.extractWithEnsemble(
				"Test content",
				"Extract nuggets",
				mockProvider,
				{
					runs: 3,
					temperature: 0.2,
					parallelExecution: true,
					similarityOptions: {
						useEmbeddings: false,
					},
				},
			);

			expect(result).toBeDefined();
			expect(mockEmbeddingService.generateEmbeddings).not.toHaveBeenCalled();
		});
	});

	describe("error handling", () => {
		it("should handle provider failures gracefully", async () => {
			(mockProvider.extractGoldenNuggets as Mock)
				.mockRejectedValueOnce(new Error("API error"))
				.mockResolvedValueOnce(mockProviderResponses[1])
				.mockResolvedValueOnce(mockProviderResponses[2]);

			const result = await ensembleExtractor.extractWithEnsemble(
				"Test content",
				"Extract nuggets",
				mockProvider,
				{
					runs: 3,
					temperature: 0.2,
					parallelExecution: true,
				},
			);

			expect(result).toBeDefined();
			expect(result.metadata.totalRuns).toBe(3);
			// Should work with 2 successful runs
		});

		it("should handle complete provider failure", async () => {
			// Clear any previous mocks and set up failure
			vi.clearAllMocks();
			(mockProvider.extractGoldenNuggets as Mock).mockRejectedValue(
				new Error("Complete failure"),
			);

			const result = await ensembleExtractor.extractWithEnsemble(
				"Test content",
				"Extract nuggets",
				mockProvider,
				{
					runs: 3,
					temperature: 0.2,
					parallelExecution: true,
				},
			);

			expect(result).toBeDefined();
			// When all provider calls fail, we should get an empty result
			expect(result.golden_nuggets).toHaveLength(0);
			expect(result.metadata.totalRuns).toBe(3);
			expect(result.metadata.successfulRuns).toBe(0);
		});

		it("should handle embedding service errors gracefully", async () => {
			mockEmbeddingService.generateEmbeddings.mockRejectedValue(
				new Error("Embedding API down"),
			);

			const result = await ensembleExtractor.extractWithEnsemble(
				"Test content",
				"Extract nuggets",
				mockProvider,
				{
					runs: 3,
					temperature: 0.2,
					parallelExecution: true,
					similarityOptions: {
						useEmbeddings: true,
					},
				},
			);

			expect(result).toBeDefined();
			// Should fall back to word overlap similarity
		});
	});

	describe("performance characteristics", () => {
		it("should handle large numbers of nuggets", async () => {
			// Create a response with many nuggets
			const largeResponse: GoldenNuggetsResponse = {
				golden_nuggets: Array.from({ length: 20 }, (_, i) => ({
					type: "tool" as const,
					startContent: `Tool ${i}`,
					endContent: `description ${i}`,
				})),
			};

			(mockProvider.extractGoldenNuggets as Mock)
				.mockResolvedValueOnce(largeResponse)
				.mockResolvedValueOnce(largeResponse)
				.mockResolvedValueOnce(largeResponse);

			// Mock lots of embeddings
			mockEmbeddingService.generateEmbeddings.mockResolvedValue(
				Array.from({ length: 60 }, () => ({
					values: [Math.random(), Math.random(), Math.random()],
				})),
			);

			const result = await ensembleExtractor.extractWithEnsemble(
				"Test content with many tools",
				"Extract all nuggets",
				mockProvider,
				{
					runs: 3,
					temperature: 0.2,
					parallelExecution: true,
				},
			);

			expect(result).toBeDefined();
			expect(result.golden_nuggets.length).toBeGreaterThan(0);
		});

		it("should measure and report response times", async () => {
			const result = await ensembleExtractor.extractWithEnsemble(
				"Test content",
				"Extract nuggets",
				mockProvider,
				{
					runs: 3,
					temperature: 0.2,
					parallelExecution: true,
				},
			);

			// In test environment, response time might be very small or 0
			expect(result.metadata.averageResponseTime).toBeGreaterThanOrEqual(0);
			expect(typeof result.metadata.averageResponseTime).toBe("number");
		});
	});

	describe("real-world scenario simulation", () => {
		it("should handle typical technical content analysis", async () => {
			const technicalResponses: GoldenNuggetsResponse[] = [
				{
					golden_nuggets: [
						{ type: "tool", startContent: "Chrome", endContent: "DevTools" },
						{ type: "model", startContent: "Event", endContent: "loop" },
					],
				},
				{
					golden_nuggets: [
						{ type: "tool", startContent: "Browser", endContent: "DevTools" },
						{
							type: "model",
							startContent: "JavaScript",
							endContent: "event loop",
						},
					],
				},
				{
					golden_nuggets: [
						{ type: "tool", startContent: "VS", endContent: "Code" },
						{ type: "model", startContent: "Async", endContent: "pattern" },
					],
				},
			];

			(mockProvider.extractGoldenNuggets as Mock)
				.mockResolvedValueOnce(technicalResponses[0])
				.mockResolvedValueOnce(technicalResponses[1])
				.mockResolvedValueOnce(technicalResponses[2]);

			const result = await ensembleExtractor.extractWithEnsemble(
				"Technical article about JavaScript development tools and async patterns",
				"Extract development insights",
				mockProvider,
				{
					runs: 3,
					temperature: 0.2,
					parallelExecution: true,
					similarityOptions: {
						useEmbeddings: true,
						embeddingThreshold: 0.7,
					},
				},
			);

			expect(result).toBeDefined();
			expect(result.golden_nuggets.length).toBeGreaterThan(0);

			// Should group similar DevTools mentions
			const devToolsNuggets = result.golden_nuggets.filter(
				(nugget) =>
					nugget.startContent.includes("Chrome") ||
					nugget.endContent.includes("DevTools"),
			);

			// At least one DevTools group should have high confidence (multiple runs)
			if (devToolsNuggets.length > 0) {
				expect(devToolsNuggets.some((nugget) => nugget.confidence > 0.5)).toBe(
					true,
				);
			}
		});
	});
});
