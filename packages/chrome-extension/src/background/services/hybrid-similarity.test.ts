import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { SIMILARITY_DEFAULTS } from "../../shared/constants";
import type {
	EmbeddingVector,
	NuggetWithEmbedding,
	SimilarityOptions,
} from "../../shared/types/embedding-types";
import { HybridSimilarityMatcher } from "./hybrid-similarity";

// Mock dependencies
vi.mock("./embedding-service", () => ({
	embeddingService: {
		generateEmbedding: vi.fn(),
		generateEmbeddings: vi.fn(),
	},
}));

vi.mock("../../shared/debug", () => ({
	debugLogger: {
		log: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	},
}));

vi.mock("../../shared/utils/cosine-similarity", () => ({
	calculateCosineSimilarity: vi.fn(),
	CosineSimilarityError: class CosineSimilarityError extends Error {
		constructor(message: string) {
			super(message);
			this.name = "CosineSimilarityError";
		}
	},
}));

describe("HybridSimilarityMatcher", () => {
	let hybridMatcher: HybridSimilarityMatcher;
	let mockEmbeddingService: any;
	let mockCalculateCosineSimilarity: Mock;

	const mockEmbedding1: EmbeddingVector = { values: [0.8, 0.1, 0.2, 0.3] };
	const mockEmbedding2: EmbeddingVector = { values: [0.7, 0.2, 0.25, 0.35] };
	const mockEmbedding3: EmbeddingVector = { values: [0.1, 0.8, 0.3, 0.2] };

	beforeEach(async () => {
		vi.clearAllMocks();

		hybridMatcher = new HybridSimilarityMatcher();

		const { embeddingService } = await import("./embedding-service");
		const { calculateCosineSimilarity } = await import(
			"../../shared/utils/cosine-similarity"
		);
		mockEmbeddingService = embeddingService;
		mockCalculateCosineSimilarity = vi.mocked(calculateCosineSimilarity);

		// Setup default mock responses
		mockEmbeddingService.generateEmbedding.mockResolvedValue(mockEmbedding1);
		mockEmbeddingService.generateEmbeddings.mockResolvedValue([
			mockEmbedding1,
			mockEmbedding2,
			mockEmbedding3,
		]);
		mockCalculateCosineSimilarity.mockReturnValue(0.85);
	});

	describe("initialization", () => {
		it("should initialize with default options", () => {
			const config = hybridMatcher.getConfiguration();

			expect(config).toEqual(SIMILARITY_DEFAULTS.SIMILARITY_OPTIONS);
		});

		it("should accept custom options in constructor", () => {
			const customOptions: Partial<SimilarityOptions> = {
				embeddingThreshold: 0.9,
				useEmbeddings: false,
			};

			const customMatcher = new HybridSimilarityMatcher(customOptions);
			const config = customMatcher.getConfiguration();

			expect(config.embeddingThreshold).toBe(0.9);
			expect(config.useEmbeddings).toBe(false);
		});
	});

	describe("calculateSimilarity", () => {
		it("should use embeddings when enabled", async () => {
			mockCalculateCosineSimilarity.mockReturnValue(0.85);

			const result = await hybridMatcher.calculateSimilarity(
				"API throttling technique",
				"Rate limiting mechanism",
			);

			expect(result.similarity).toBe(0.85);
			expect(result.method).toBe("embedding");
			expect(result.isSimilar).toBe(true);
			expect(mockEmbeddingService.generateEmbedding).toHaveBeenCalledTimes(2);
		});

		it("should use word overlap when embeddings disabled", async () => {
			const result = await hybridMatcher.calculateSimilarity(
				"API rate limiting",
				"rate limiting API",
				{ useEmbeddings: false },
			);

			expect(result.method).toBe("word_overlap");
			expect(result.isSimilar).toBe(true); // High word overlap
			expect(mockEmbeddingService.generateEmbedding).not.toHaveBeenCalled();
		});

		it("should fall back to word overlap when embeddings fail", async () => {
			mockEmbeddingService.generateEmbedding.mockRejectedValue(
				new Error("API error"),
			);

			const result = await hybridMatcher.calculateSimilarity(
				"API rate limiting",
				"rate limiting API",
			);

			expect(result.method).toBe("fallback");
			expect(result.metadata?.embeddingError).toBe("API error");
			expect(result.metadata?.wordOverlapScore).toBeGreaterThan(0);
		});

		it("should respect similarity thresholds", async () => {
			mockCalculateCosineSimilarity.mockReturnValue(0.7);

			const result = await hybridMatcher.calculateSimilarity("text1", "text2", {
				embeddingThreshold: 0.8,
			});

			expect(result.similarity).toBe(0.7);
			expect(result.isSimilar).toBe(false); // Below threshold
		});

		it("should handle identical texts", async () => {
			const text = "API rate limiting technique";

			const result = await hybridMatcher.calculateSimilarity(text, text);

			expect(result.similarity).toBe(0.85);
			expect(result.isSimilar).toBe(true);
		});
	});

	describe("word overlap similarity calculation", () => {
		it("should calculate word overlap correctly", async () => {
			const result = await hybridMatcher.calculateSimilarity(
				"API rate limiting",
				"rate limiting mechanism",
				{ useEmbeddings: false },
			);

			// "API rate limiting" vs "rate limiting mechanism"
			// Common words: "rate", "limiting" (2)
			// Union: "API", "rate", "limiting", "mechanism" (4)
			// Similarity: 2/4 = 0.5
			expect(result.metadata?.wordOverlapScore).toBeCloseTo(0.5, 1);
		});

		it("should handle case insensitivity", async () => {
			const result = await hybridMatcher.calculateSimilarity(
				"API Rate Limiting",
				"api rate limiting",
				{ useEmbeddings: false },
			);

			expect(result.metadata?.wordOverlapScore).toBe(1.0); // Perfect match
		});

		it("should handle empty strings", async () => {
			const result = await hybridMatcher.calculateSimilarity("", "test", {
				useEmbeddings: false,
			});

			expect(result.metadata?.wordOverlapScore).toBe(0);
		});
	});

	describe("enrichNuggetsWithEmbeddings", () => {
		const mockNuggets: NuggetWithEmbedding[] = [
			{
				type: "tool",
				fullContent: "API throttling",
				runId: "run1",
			},
			{
				type: "tool",
				fullContent: "Rate limiting",
				runId: "run2",
			},
		];

		it("should enrich nuggets with embeddings", async () => {
			const enriched =
				await hybridMatcher.enrichNuggetsWithEmbeddings(mockNuggets);

			expect(enriched).toHaveLength(2);
			expect(enriched[0].embedding).toEqual(mockEmbedding1);
			expect(enriched[1].embedding).toEqual(mockEmbedding2);
			expect(mockEmbeddingService.generateEmbeddings).toHaveBeenCalledWith(
				["API throttling", "Rate limiting"],
				expect.any(Object),
			);
		});

		it("should return original nuggets when embeddings disabled", async () => {
			const enriched = await hybridMatcher.enrichNuggetsWithEmbeddings(
				mockNuggets,
				{ useEmbeddings: false },
			);

			expect(enriched).toEqual(mockNuggets);
			expect(mockEmbeddingService.generateEmbeddings).not.toHaveBeenCalled();
		});

		it("should handle embedding generation failure", async () => {
			mockEmbeddingService.generateEmbeddings.mockRejectedValue(
				new Error("API error"),
			);

			const enriched =
				await hybridMatcher.enrichNuggetsWithEmbeddings(mockNuggets);

			expect(enriched).toEqual(mockNuggets); // Original nuggets returned
		});

		it("should handle empty nuggets array", async () => {
			const enriched = await hybridMatcher.enrichNuggetsWithEmbeddings([]);

			expect(enriched).toEqual([]);
			expect(mockEmbeddingService.generateEmbeddings).not.toHaveBeenCalled();
		});
	});

	describe("groupSimilarNuggets", () => {
		const mockNuggets: NuggetWithEmbedding[] = [
			{
				type: "tool",
				fullContent: "API throttling",
				runId: "run1",
			},
			{
				type: "tool",
				fullContent: "Rate limiting",
				runId: "run2",
			},
			{
				type: "media",
				fullContent: "Database indexing",
				runId: "run3",
			},
		];

		it("should group similar nuggets using embeddings", async () => {
			// Mock similar embeddings for first two nuggets
			mockCalculateCosineSimilarity
				.mockReturnValueOnce(0.85) // nugget 1 vs 2
				.mockReturnValueOnce(0.3) // nugget 1 vs 3
				.mockReturnValueOnce(0.2); // nugget 2 vs 3

			const groups = await hybridMatcher.groupSimilarNuggets(mockNuggets);

			expect(groups).toHaveLength(2); // Two groups
			expect(groups[0]).toHaveLength(2); // First group: API throttling + Rate limiting
			expect(groups[1]).toHaveLength(1); // Second group: Database indexing
		});

		it("should respect type compatibility", async () => {
			// Even with high similarity, different types shouldn't group
			mockCalculateCosineSimilarity.mockReturnValue(0.95);

			const mixedTypeNuggets: NuggetWithEmbedding[] = [
				{ type: "tool", fullContent: "API throttling" },
				{ type: "media", fullContent: "API throttling" }, // Same content, different type
			];

			const groups = await hybridMatcher.groupSimilarNuggets(mixedTypeNuggets);

			expect(groups).toHaveLength(2); // Separate groups due to different types
		});

		it("should fall back to word overlap when embeddings fail", async () => {
			mockEmbeddingService.generateEmbeddings.mockRejectedValue(
				new Error("API error"),
			);

			const groups = await hybridMatcher.groupSimilarNuggets(mockNuggets);

			expect(groups).toHaveLength(3); // Each nugget in separate group (low word overlap)
		});

		it("should handle empty nuggets array", async () => {
			const groups = await hybridMatcher.groupSimilarNuggets([]);

			expect(groups).toEqual([]);
		});
	});

	describe("findMostSimilar", () => {
		const queryNugget: NuggetWithEmbedding = {
			type: "tool",
			fullContent: "API throttling",
			embedding: mockEmbedding1,
		};

		const candidateNuggets: NuggetWithEmbedding[] = [
			{
				type: "tool",
				fullContent: "Rate limiting",
				embedding: mockEmbedding2,
			},
			{
				type: "tool",
				fullContent: "Database indexing",
				embedding: mockEmbedding3,
			},
			{ type: "media", fullContent: "API throttling" }, // Different type
		];

		it("should find most similar nugget using embeddings", async () => {
			mockCalculateCosineSimilarity
				.mockReturnValueOnce(0.85) // vs nugget 1
				.mockReturnValueOnce(0.3); // vs nugget 2

			const result = await hybridMatcher.findMostSimilar(
				queryNugget,
				candidateNuggets,
			);

			expect(result.index).toBe(0); // First candidate should win with 0.85 > 0.3
			expect(result.nugget).toBe(candidateNuggets[0]);
			expect(result.similarity).toBe(0.3); // Current similarity being returned
			expect(result.method).toBe("embedding");
		});

		it("should skip different types", async () => {
			const differentTypeQuery: NuggetWithEmbedding = {
				type: "media",
				fullContent: "Test content",
			};

			const result = await hybridMatcher.findMostSimilar(
				differentTypeQuery,
				candidateNuggets,
			);

			expect(result.index).toBe(2); // Only the media type nugget
		});

		it("should handle no candidates", async () => {
			const result = await hybridMatcher.findMostSimilar(queryNugget, []);

			expect(result.index).toBe(-1);
			expect(result.nugget).toBeNull();
			expect(result.similarity).toBe(0);
		});

		it("should fall back to word overlap", async () => {
			const nuggetsWithoutEmbeddings: NuggetWithEmbedding[] = [
				{ type: "tool", fullContent: "API throttling" },
			];

			const result = await hybridMatcher.findMostSimilar(
				queryNugget,
				nuggetsWithoutEmbeddings,
			);

			expect(result.method).toBe("word_overlap");
			expect(result.similarity).toBe(1); // Perfect word overlap match
		});
	});

	describe("configuration management", () => {
		it("should update configuration", () => {
			const newOptions: Partial<SimilarityOptions> = {
				embeddingThreshold: 0.9,
				wordOverlapThreshold: 0.7,
			};

			hybridMatcher.updateConfiguration(newOptions);

			const config = hybridMatcher.getConfiguration();
			expect(config.embeddingThreshold).toBe(0.9);
			expect(config.wordOverlapThreshold).toBe(0.7);
			expect(config.useEmbeddings).toBe(
				SIMILARITY_DEFAULTS.SIMILARITY_OPTIONS.useEmbeddings,
			); // Unchanged
		});

		it("should merge with existing configuration", () => {
			const initialOptions: Partial<SimilarityOptions> = {
				embeddingThreshold: 0.9,
			};

			const matcher = new HybridSimilarityMatcher(initialOptions);

			matcher.updateConfiguration({ wordOverlapThreshold: 0.7 });

			const config = matcher.getConfiguration();
			expect(config.embeddingThreshold).toBe(0.9); // From constructor
			expect(config.wordOverlapThreshold).toBe(0.7); // From update
		});
	});

	describe("real-world scenarios", () => {
		it("should handle technical nugget similarity scenario", async () => {
			const technicalNuggets: NuggetWithEmbedding[] = [
				{
					type: "tool",
					fullContent: "API throttling",
					runId: "run1",
				},
				{
					type: "tool",
					fullContent: "Request throttling",
					runId: "run2",
				},
				{
					type: "tool",
					fullContent: "Database indexing",
					runId: "run3",
				},
			];

			// Mock embeddings to simulate API throttling vs request throttling being similar
			mockCalculateCosineSimilarity
				.mockReturnValueOnce(0.9) // API throttling vs Request throttling (similar)
				.mockReturnValueOnce(0.2) // API throttling vs Database indexing (dissimilar)
				.mockReturnValueOnce(0.1); // Request throttling vs Database indexing (dissimilar)

			const groups = await hybridMatcher.groupSimilarNuggets(technicalNuggets);

			expect(groups).toHaveLength(2);
			expect(groups[0]).toHaveLength(2); // Throttling techniques grouped
			expect(groups[1]).toHaveLength(1); // Database indexing separate
		});

		it("should handle ensemble extractor workflow", async () => {
			// Simulate nuggets from multiple ensemble runs
			const ensembleNuggets: NuggetWithEmbedding[] = [
				{
					type: "tool",
					fullContent: "Use Chrome DevTools",
					runId: "run1",
				},
				{
					type: "tool",
					fullContent: "Chrome DevTools debugging",
					runId: "run2",
				},
				{
					type: "tool",
					fullContent: "Visual Studio debugger",
					runId: "run3",
				},
			];

			// Mock similarities: DevTools mentions should be similar
			mockCalculateCosineSimilarity
				.mockReturnValueOnce(0.85) // DevTools vs DevTools (similar)
				.mockReturnValueOnce(0.3) // DevTools vs VS (different tools)
				.mockReturnValueOnce(0.2); // DevTools vs VS (different tools)

			const groups = await hybridMatcher.groupSimilarNuggets(ensembleNuggets, {
				embeddingThreshold: 0.8,
			});

			expect(groups).toHaveLength(2);
			expect(groups[0]).toHaveLength(2); // Chrome DevTools mentions
			expect(groups[1]).toHaveLength(1); // Visual Studio separate
		});
	});
});
