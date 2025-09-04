import { describe, expect, it } from "vitest";
import {
	CosineSimilarityError,
	calculateBatchCosineSimilarity,
	calculateCosineSimilarity,
	calculateGroupCohesion,
	findMostSimilar,
	groupBySimilarity,
	normalizeVector,
	type Vector,
} from "./cosine-similarity";

describe("CosineSimilarity Utility", () => {
	describe("normalizeVector", () => {
		it("should normalize a vector to unit length", () => {
			const vector = [3, 4]; // magnitude = 5
			const normalized = normalizeVector(vector);

			expect(normalized).toEqual([0.6, 0.8]);

			// Verify magnitude is 1
			const magnitude = Math.sqrt(normalized[0] ** 2 + normalized[1] ** 2);
			expect(magnitude).toBeCloseTo(1, 10);
		});

		it("should handle zero vector", () => {
			const vector = [0, 0, 0];
			const normalized = normalizeVector(vector);

			expect(normalized).toEqual([0, 0, 0]);
		});

		it("should handle single dimension", () => {
			const vector = [5];
			const normalized = normalizeVector(vector);

			expect(normalized).toEqual([1]);
		});
	});

	describe("calculateCosineSimilarity", () => {
		it("should calculate similarity for identical vectors", () => {
			const vector1 = [1, 2, 3];
			const vector2 = [1, 2, 3];

			const similarity = calculateCosineSimilarity(vector1, vector2);

			expect(similarity).toBe(1);
		});

		it("should calculate similarity for opposite vectors", () => {
			const vector1 = [1, 0];
			const vector2 = [-1, 0];

			const similarity = calculateCosineSimilarity(vector1, vector2);

			expect(similarity).toBe(-1);
		});

		it("should calculate similarity for orthogonal vectors", () => {
			const vector1 = [1, 0];
			const vector2 = [0, 1];

			const similarity = calculateCosineSimilarity(vector1, vector2);

			expect(similarity).toBe(0);
		});

		it("should handle Vector objects", () => {
			const vector1: Vector = { values: [1, 2, 3] };
			const vector2: Vector = { values: [4, 5, 6] };

			const similarity = calculateCosineSimilarity(vector1, vector2);

			expect(similarity).toBeGreaterThan(0);
			expect(similarity).toBeLessThan(1);
		});

		it("should return 0 for zero vectors", () => {
			const vector1 = [0, 0, 0];
			const vector2 = [1, 2, 3];

			const similarity = calculateCosineSimilarity(vector1, vector2);

			expect(similarity).toBe(0);
		});

		it("should throw error for mismatched dimensions", () => {
			const vector1 = [1, 2];
			const vector2 = [1, 2, 3];

			expect(() => {
				calculateCosineSimilarity(vector1, vector2);
			}).toThrow(CosineSimilarityError);
		});

		it("should throw error for empty vectors", () => {
			const vector1: number[] = [];
			const vector2: number[] = [];

			expect(() => {
				calculateCosineSimilarity(vector1, vector2);
			}).toThrow(CosineSimilarityError);
		});

		it("should throw error for invalid numbers", () => {
			const vector1 = [1, NaN, 3];
			const vector2 = [1, 2, 3];

			expect(() => {
				calculateCosineSimilarity(vector1, vector2);
			}).toThrow(CosineSimilarityError);
		});

		it("should clamp results to [-1, 1] range", () => {
			// Use very small numbers that might cause floating point precision issues
			const vector1 = [1e-10, 1e-10];
			const vector2 = [1e-10, 1e-10];

			const similarity = calculateCosineSimilarity(vector1, vector2);

			expect(similarity).toBeGreaterThanOrEqual(-1);
			expect(similarity).toBeLessThanOrEqual(1);
		});
	});

	describe("calculateBatchCosineSimilarity", () => {
		it("should calculate similarities for multiple vector pairs", () => {
			const vectors1 = [
				[1, 0],
				[0, 1],
				[1, 1],
			];
			const vectors2 = [
				[1, 0],
				[1, 0],
				[-1, -1],
			];

			const similarities = calculateBatchCosineSimilarity(vectors1, vectors2);

			expect(similarities).toHaveLength(3);
			expect(similarities[0]).toBe(1); // identical
			expect(similarities[1]).toBe(0); // orthogonal
			expect(similarities[2]).toBeCloseTo(-1, 10); // opposite (allowing for floating point precision)
		});

		it("should throw error for mismatched batch sizes", () => {
			const vectors1 = [
				[1, 0],
				[0, 1],
			];
			const vectors2 = [[1, 0]];

			expect(() => {
				calculateBatchCosineSimilarity(vectors1, vectors2);
			}).toThrow(CosineSimilarityError);
		});

		it("should handle Vector objects in batches", () => {
			const vectors1: Vector[] = [{ values: [1, 0] }, { values: [0, 1] }];
			const vectors2: Vector[] = [{ values: [1, 0] }, { values: [1, 0] }];

			const similarities = calculateBatchCosineSimilarity(vectors1, vectors2);

			expect(similarities).toHaveLength(2);
			expect(similarities[0]).toBe(1);
			expect(similarities[1]).toBe(0);
		});
	});

	describe("findMostSimilar", () => {
		it("should find the most similar vector", () => {
			const queryVector = [1, 0];
			const candidates = [
				[0, 1],
				[1, 0],
				[-1, 0],
			];

			const result = findMostSimilar(queryVector, candidates);

			expect(result.found).toBe(true);
			expect(result.index).toBe(1);
			expect(result.similarity).toBe(1);
		});

		it("should respect similarity threshold", () => {
			const queryVector = [1, 0];
			const candidates = [
				[0, 1],
				[0.5, 0.5],
			]; // orthogonal and 45-degree

			const result = findMostSimilar(queryVector, candidates, 0.8);

			expect(result.found).toBe(false);
			expect(result.index).toBe(-1);
		});

		it("should handle empty candidates", () => {
			const queryVector = [1, 0];
			const candidates: number[][] = [];

			const result = findMostSimilar(queryVector, candidates);

			expect(result.found).toBe(false);
			expect(result.index).toBe(-1);
			expect(result.similarity).toBe(0);
		});

		it("should skip invalid vectors", () => {
			const queryVector = [1, 0];
			const candidates = [[1], [1, 0]]; // First has wrong dimension

			const result = findMostSimilar(queryVector, candidates);

			expect(result.found).toBe(true);
			expect(result.index).toBe(1);
			expect(result.similarity).toBe(1);
		});
	});

	describe("groupBySimilarity", () => {
		it("should group similar vectors", () => {
			const vectors = [
				[1, 0], // group 1
				[0.9, 0.1], // group 1 (similar to first)
				[0, 1], // group 2
				[0.1, 0.9], // group 2 (similar to third)
			];

			const groups = groupBySimilarity(vectors, 0.8);

			expect(groups).toHaveLength(2);
			expect(groups[0]).toContain(0); // first vector
			expect(groups[0]).toContain(1); // second vector (similar)
			expect(groups[1]).toContain(2); // third vector
			expect(groups[1]).toContain(3); // fourth vector (similar)
		});

		it("should handle empty vector list", () => {
			const vectors: number[][] = [];

			const groups = groupBySimilarity(vectors);

			expect(groups).toEqual([]);
		});

		it("should put dissimilar vectors in separate groups", () => {
			const vectors = [
				[1, 0],
				[0, 1],
				[-1, 0],
				[0, -1],
			];

			const groups = groupBySimilarity(vectors, 0.8);

			expect(groups).toHaveLength(4); // All orthogonal, separate groups
		});

		it("should handle Vector objects", () => {
			const vectors: Vector[] = [{ values: [1, 0] }, { values: [0.9, 0.1] }];

			const groups = groupBySimilarity(vectors, 0.8);

			expect(groups).toHaveLength(1);
			expect(groups[0]).toEqual([0, 1]);
		});
	});

	describe("calculateGroupCohesion", () => {
		it("should return 1.0 for single vector", () => {
			const vectors = [[1, 2, 3]];

			const cohesion = calculateGroupCohesion(vectors);

			expect(cohesion).toBe(1.0);
		});

		it("should return 1.0 for empty group", () => {
			const vectors: number[][] = [];

			const cohesion = calculateGroupCohesion(vectors);

			expect(cohesion).toBe(1.0);
		});

		it("should calculate average similarity for group", () => {
			const vectors = [
				[1, 0], // similarity with [1, 0] = 1.0
				[1, 0], // similarity with [0, 1] = 0.0
				[0, 1], // average = 0.5
			];

			const cohesion = calculateGroupCohesion(vectors);

			expect(cohesion).toBeCloseTo(0.333, 2); // (1 + 0 + 0) / 3 comparisons
		});

		it("should handle Vector objects", () => {
			const vectors: Vector[] = [{ values: [1, 0] }, { values: [1, 0] }];

			const cohesion = calculateGroupCohesion(vectors);

			expect(cohesion).toBe(1.0);
		});

		it("should skip invalid vector pairs", () => {
			const vectors = [
				[1, 0],
				[1], // Invalid dimension
				[0, 1],
			];

			const cohesion = calculateGroupCohesion(vectors);

			expect(cohesion).toBe(0); // Only one valid comparison: [1,0] vs [0,1] = 0
		});
	});

	describe("CosineSimilarityError", () => {
		it("should include vector lengths in error", () => {
			const error = new CosineSimilarityError("Test error", 2, 3);

			expect(error.name).toBe("CosineSimilarityError");
			expect(error.message).toBe("Test error");
			expect(error.vector1Length).toBe(2);
			expect(error.vector2Length).toBe(3);
		});

		it("should work without vector lengths", () => {
			const error = new CosineSimilarityError("Test error");

			expect(error.name).toBe("CosineSimilarityError");
			expect(error.message).toBe("Test error");
			expect(error.vector1Length).toBeUndefined();
			expect(error.vector2Length).toBeUndefined();
		});
	});

	describe("real-world scenarios", () => {
		it("should work with embedding-like vectors", () => {
			// Simulate 768-dimensional embeddings (reduced for testing)
			const embedding1 = Array(128)
				.fill(0)
				.map((_, i) => Math.sin(i * 0.1));
			const embedding2 = Array(128)
				.fill(0)
				.map((_, i) => Math.sin(i * 0.1 + 0.1));
			const embedding3 = Array(128)
				.fill(0)
				.map((_, i) => Math.cos(i * 0.1));

			const similarity12 = calculateCosineSimilarity(embedding1, embedding2);
			const similarity13 = calculateCosineSimilarity(embedding1, embedding3);

			expect(similarity12).toBeGreaterThan(similarity13); // More similar phase shift
			expect(similarity12).toBeGreaterThan(0.5);
		});

		it("should handle technical text similarity scenario", () => {
			// Simulate embeddings for technical terms that should be similar
			const apiThrottling = [0.8, 0.1, 0.2, 0.3];
			const rateLimiting = [0.7, 0.2, 0.25, 0.35];
			const databaseIndexing = [0.1, 0.8, 0.3, 0.2];

			const throttlingVsRateLimit = calculateCosineSimilarity(
				apiThrottling,
				rateLimiting,
			);
			const throttlingVsDatabase = calculateCosineSimilarity(
				apiThrottling,
				databaseIndexing,
			);

			expect(throttlingVsRateLimit).toBeGreaterThan(throttlingVsDatabase);
			expect(throttlingVsRateLimit).toBeGreaterThan(0.8); // Should be considered similar
		});
	});
});
