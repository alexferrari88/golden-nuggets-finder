/**
 * Pure TypeScript implementation of cosine similarity calculation
 * Used for comparing embedding vectors without external dependencies
 */

export interface Vector {
	values: number[];
}

export class CosineSimilarityError extends Error {
	constructor(
		message: string,
		public readonly vector1Length?: number,
		public readonly vector2Length?: number,
	) {
		super(message);
		this.name = "CosineSimilarityError";
	}
}

/**
 * Calculate the dot product of two vectors
 */
function dotProduct(a: number[], b: number[]): number {
	if (a.length !== b.length) {
		throw new CosineSimilarityError(
			`Vector dimension mismatch: ${a.length} vs ${b.length}`,
			a.length,
			b.length,
		);
	}

	let sum = 0;
	for (let i = 0; i < a.length; i++) {
		sum += a[i] * b[i];
	}

	return sum;
}

/**
 * Calculate the magnitude (Euclidean norm) of a vector
 */
function magnitude(vector: number[]): number {
	if (vector.length === 0) {
		return 0;
	}

	let sum = 0;
	for (let i = 0; i < vector.length; i++) {
		sum += vector[i] * vector[i];
	}

	return Math.sqrt(sum);
}

/**
 * Normalize a vector to unit length
 */
export function normalizeVector(vector: number[]): number[] {
	const mag = magnitude(vector);

	if (mag === 0) {
		// Return zero vector if magnitude is 0
		return new Array(vector.length).fill(0);
	}

	return vector.map((component) => component / mag);
}

/**
 * Calculate cosine similarity between two vectors
 * Returns a value between -1 and 1, where:
 * - 1 means vectors are identical in direction
 * - 0 means vectors are orthogonal (90 degrees apart)
 * - -1 means vectors are opposite in direction
 */
export function calculateCosineSimilarity(
	vector1: number[] | Vector,
	vector2: number[] | Vector,
): number {
	// Extract values arrays if Vector objects are passed
	const a = Array.isArray(vector1) ? vector1 : vector1.values;
	const b = Array.isArray(vector2) ? vector2 : vector2.values;

	// Validate input vectors
	if (!Array.isArray(a) || !Array.isArray(b)) {
		throw new CosineSimilarityError(
			"Both inputs must be arrays or Vector objects",
		);
	}

	if (a.length === 0 || b.length === 0) {
		throw new CosineSimilarityError("Vectors cannot be empty");
	}

	if (a.length !== b.length) {
		throw new CosineSimilarityError(
			`Vector dimension mismatch: ${a.length} vs ${b.length}`,
			a.length,
			b.length,
		);
	}

	// Validate that all components are numbers
	for (let i = 0; i < a.length; i++) {
		if (typeof a[i] !== "number" || Number.isNaN(a[i])) {
			throw new CosineSimilarityError(
				`Invalid number in vector1 at index ${i}: ${a[i]}`,
			);
		}
		if (typeof b[i] !== "number" || Number.isNaN(b[i])) {
			throw new CosineSimilarityError(
				`Invalid number in vector2 at index ${i}: ${b[i]}`,
			);
		}
	}

	// Calculate magnitudes
	const magA = magnitude(a);
	const magB = magnitude(b);

	// Handle zero vectors
	if (magA === 0 || magB === 0) {
		// If one or both vectors are zero vectors, similarity is 0
		return 0;
	}

	// Calculate cosine similarity
	const dotProd = dotProduct(a, b);
	const similarity = dotProd / (magA * magB);

	// Clamp result to [-1, 1] range to handle floating point precision issues
	return Math.max(-1, Math.min(1, similarity));
}

/**
 * Calculate cosine similarity for multiple vector pairs efficiently
 * Useful for batch processing in ensemble systems
 */
export function calculateBatchCosineSimilarity(
	vectors1: (number[] | Vector)[],
	vectors2: (number[] | Vector)[],
): number[] {
	if (vectors1.length !== vectors2.length) {
		throw new CosineSimilarityError(
			`Batch size mismatch: ${vectors1.length} vs ${vectors2.length}`,
		);
	}

	const results: number[] = [];

	for (let i = 0; i < vectors1.length; i++) {
		try {
			const similarity = calculateCosineSimilarity(vectors1[i], vectors2[i]);
			results.push(similarity);
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			throw new CosineSimilarityError(
				`Error calculating similarity for pair ${i}: ${errorMessage}`,
				Array.isArray(vectors1[i])
					? (vectors1[i] as number[]).length
					: (vectors1[i] as Vector).values.length,
				Array.isArray(vectors2[i])
					? (vectors2[i] as number[]).length
					: (vectors2[i] as Vector).values.length,
			);
		}
	}

	return results;
}

/**
 * Find the most similar vector from a list of candidates
 * Returns the index and similarity score of the best match
 */
export function findMostSimilar(
	queryVector: number[] | Vector,
	candidateVectors: (number[] | Vector)[],
	threshold = 0.0,
): { index: number; similarity: number; found: boolean } {
	if (candidateVectors.length === 0) {
		return { index: -1, similarity: 0, found: false };
	}

	let bestIndex = -1;
	let bestSimilarity = -1;

	for (let i = 0; i < candidateVectors.length; i++) {
		try {
			const similarity = calculateCosineSimilarity(
				queryVector,
				candidateVectors[i],
			);

			if (similarity > bestSimilarity && similarity >= threshold) {
				bestSimilarity = similarity;
				bestIndex = i;
			}
		} catch (error) {
			// Skip invalid vectors and continue processing
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			console.warn(`Skipping vector ${i} due to error:`, errorMessage);
		}
	}

	return {
		index: bestIndex,
		similarity: bestSimilarity,
		found: bestIndex >= 0,
	};
}

/**
 * Group vectors by similarity using cosine similarity threshold
 * Returns groups of similar vector indices
 */
export function groupBySimilarity(
	vectors: (number[] | Vector)[],
	threshold = 0.8,
): number[][] {
	if (vectors.length === 0) {
		return [];
	}

	const groups: number[][] = [];
	const processed = new Set<number>();

	for (let i = 0; i < vectors.length; i++) {
		if (processed.has(i)) {
			continue;
		}

		const group = [i];
		processed.add(i);

		// Find all vectors similar to vector i
		for (let j = i + 1; j < vectors.length; j++) {
			if (processed.has(j)) {
				continue;
			}

			try {
				const similarity = calculateCosineSimilarity(vectors[i], vectors[j]);

				if (similarity >= threshold) {
					group.push(j);
					processed.add(j);
				}
			} catch (error) {
				// Skip invalid vector pairs
				const errorMessage =
					error instanceof Error ? error.message : String(error);
				console.warn(
					`Skipping vector pair (${i}, ${j}) due to error:`,
					errorMessage,
				);
			}
		}

		groups.push(group);
	}

	return groups;
}

/**
 * Calculate average cosine similarity within a group of vectors
 */
export function calculateGroupCohesion(vectors: (number[] | Vector)[]): number {
	if (vectors.length < 2) {
		return 1.0; // Single vector or empty group has perfect cohesion
	}

	let totalSimilarity = 0;
	let comparisons = 0;

	for (let i = 0; i < vectors.length; i++) {
		for (let j = i + 1; j < vectors.length; j++) {
			try {
				const similarity = calculateCosineSimilarity(vectors[i], vectors[j]);
				totalSimilarity += similarity;
				comparisons++;
			} catch (_error) {
				// Skip invalid vector pairs
			}
		}
	}

	return comparisons > 0 ? totalSimilarity / comparisons : 0;
}
