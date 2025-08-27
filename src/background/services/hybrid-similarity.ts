import { SIMILARITY_DEFAULTS } from "../../shared/constants";
import { debugLogger } from "../../shared/debug";
import type {
	NuggetWithEmbedding,
	SimilarityOptions,
	SimilarityResult,
} from "../../shared/types/embedding-types";
import { calculateCosineSimilarity } from "../../shared/utils/cosine-similarity";
import { embeddingService } from "./embedding-service";

export class HybridSimilarityMatcher {
	private readonly defaultOptions: SimilarityOptions =
		SIMILARITY_DEFAULTS.SIMILARITY_OPTIONS;

	constructor(private options: Partial<SimilarityOptions> = {}) {}

	/**
	 * Calculate similarity between two text strings using hybrid approach
	 */
	async calculateSimilarity(
		text1: string,
		text2: string,
		options: Partial<SimilarityOptions> = {},
	): Promise<SimilarityResult> {
		const config = { ...this.defaultOptions, ...this.options, ...options };

		if (!config.useEmbeddings) {
			const wordOverlapScore = this.calculateWordOverlapSimilarity(
				text1,
				text2,
			);
			return {
				similarity: wordOverlapScore,
				method: "word_overlap",
				isSimilar: wordOverlapScore >= config.wordOverlapThreshold,
				metadata: { wordOverlapScore },
			};
		}

		// Try embedding-based similarity first
		try {
			const embedding1 = await embeddingService.generateEmbedding(
				text1,
				config.embeddingOptions,
			);
			const embedding2 = await embeddingService.generateEmbedding(
				text2,
				config.embeddingOptions,
			);

			const embeddingScore = calculateCosineSimilarity(embedding1, embedding2);

			return {
				similarity: embeddingScore,
				method: "embedding",
				isSimilar: embeddingScore >= config.embeddingThreshold,
				metadata: { embeddingScore },
			};
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown embedding error";
			debugLogger.warn(
				"[HybridSimilarityMatcher] Embedding calculation failed, falling back to word overlap:",
				errorMessage,
			);

			// Fallback to word overlap
			const wordOverlapScore = this.calculateWordOverlapSimilarity(
				text1,
				text2,
			);

			return {
				similarity: wordOverlapScore,
				method: "fallback",
				isSimilar: wordOverlapScore >= config.wordOverlapThreshold,
				metadata: {
					embeddingError: errorMessage,
					wordOverlapScore,
				},
			};
		}
	}

	/**
	 * Calculate word overlap similarity (existing algorithm from ensemble extractor)
	 */
	private calculateWordOverlapSimilarity(text1: string, text2: string): number {
		const words1 = text1.toLowerCase().split(/\s+/);
		const words2 = text2.toLowerCase().split(/\s+/);

		const intersection = words1.filter((word) => words2.includes(word));
		const union = new Set([...words1, ...words2]);

		return intersection.length / union.size;
	}

	/**
	 * Generate embeddings for nuggets and attach them to the nugget objects
	 */
	async enrichNuggetsWithEmbeddings(
		nuggets: NuggetWithEmbedding[],
		options: Partial<SimilarityOptions> = {},
	): Promise<NuggetWithEmbedding[]> {
		const config = { ...this.defaultOptions, ...this.options, ...options };

		if (!config.useEmbeddings || nuggets.length === 0) {
			return nuggets; // Return nuggets unchanged if embeddings disabled or empty array
		}

		try {
			// Extract text content for embedding generation
			const texts = nuggets.map((nugget) =>
				`${nugget.startContent} ${nugget.endContent}`.trim(),
			);

			debugLogger.log(
				`[HybridSimilarityMatcher] Generating embeddings for ${texts.length} nuggets`,
			);

			// Generate embeddings in batch for efficiency
			const embeddings = await embeddingService.generateEmbeddings(
				texts,
				config.embeddingOptions,
			);

			// Attach embeddings to nuggets
			const enrichedNuggets = nuggets.map((nugget, index) => ({
				...nugget,
				embedding: embeddings[index],
			}));

			debugLogger.log(
				`[HybridSimilarityMatcher] Successfully enriched ${enrichedNuggets.length} nuggets with embeddings`,
			);

			return enrichedNuggets;
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			debugLogger.warn(
				"[HybridSimilarityMatcher] Failed to enrich nuggets with embeddings:",
				errorMessage,
			);

			// Return original nuggets without embeddings on failure
			return nuggets;
		}
	}

	/**
	 * Group similar nuggets using hybrid similarity approach
	 */
	async groupSimilarNuggets(
		nuggets: NuggetWithEmbedding[],
		options: Partial<SimilarityOptions> = {},
	): Promise<NuggetWithEmbedding[][]> {
		const config = { ...this.defaultOptions, ...this.options, ...options };

		if (nuggets.length === 0) {
			return [];
		}

		// Enrich nuggets with embeddings if enabled
		const enrichedNuggets = await this.enrichNuggetsWithEmbeddings(
			nuggets,
			config,
		);

		const groups: NuggetWithEmbedding[][] = [];
		const processed = new Set<number>();

		for (let i = 0; i < enrichedNuggets.length; i++) {
			if (processed.has(i)) {
				continue;
			}

			const currentNugget = enrichedNuggets[i];
			const group = [currentNugget];
			processed.add(i);

			// Find similar nuggets
			for (let j = i + 1; j < enrichedNuggets.length; j++) {
				if (processed.has(j)) {
					continue;
				}

				const candidateNugget = enrichedNuggets[j];

				// Check type compatibility first
				if (currentNugget.type !== candidateNugget.type) {
					continue;
				}

				let isSimilar = false;

				if (
					config.useEmbeddings &&
					currentNugget.embedding &&
					candidateNugget.embedding
				) {
					// Use embedding similarity if available
					try {
						const embeddingScore = calculateCosineSimilarity(
							currentNugget.embedding,
							candidateNugget.embedding,
						);
						isSimilar = embeddingScore >= config.embeddingThreshold;
					} catch (error) {
						debugLogger.warn(
							"[HybridSimilarityMatcher] Embedding comparison failed, using word overlap:",
							error,
						);
						// Fall back to word overlap
						const currentText = `${currentNugget.startContent} ${currentNugget.endContent}`;
						const candidateText = `${candidateNugget.startContent} ${candidateNugget.endContent}`;
						const wordOverlapScore = this.calculateWordOverlapSimilarity(
							currentText,
							candidateText,
						);
						isSimilar = wordOverlapScore >= config.wordOverlapThreshold;
					}
				} else {
					// Use word overlap similarity
					const currentText = `${currentNugget.startContent} ${currentNugget.endContent}`;
					const candidateText = `${candidateNugget.startContent} ${candidateNugget.endContent}`;
					const wordOverlapScore = this.calculateWordOverlapSimilarity(
						currentText,
						candidateText,
					);
					isSimilar = wordOverlapScore >= config.wordOverlapThreshold;
				}

				if (isSimilar) {
					group.push(candidateNugget);
					processed.add(j);
				}
			}

			groups.push(group);
		}

		debugLogger.log(
			`[HybridSimilarityMatcher] Grouped ${nuggets.length} nuggets into ${groups.length} similarity groups`,
		);

		return groups;
	}

	/**
	 * Find the most similar nugget from a list of candidates
	 */
	async findMostSimilar(
		queryNugget: NuggetWithEmbedding,
		candidateNuggets: NuggetWithEmbedding[],
		options: Partial<SimilarityOptions> = {},
	): Promise<{
		index: number;
		nugget: NuggetWithEmbedding | null;
		similarity: number;
		method: string;
	}> {
		const config = { ...this.defaultOptions, ...this.options, ...options };

		if (candidateNuggets.length === 0) {
			return { index: -1, nugget: null, similarity: 0, method: "none" };
		}

		let bestIndex = -1;
		let bestSimilarity = -1;
		let bestMethod = "none";

		const queryText = `${queryNugget.startContent} ${queryNugget.endContent}`;

		for (let i = 0; i < candidateNuggets.length; i++) {
			const candidate = candidateNuggets[i];

			// Skip different types
			if (candidate.type !== queryNugget.type) {
				continue;
			}

			const candidateText = `${candidate.startContent} ${candidate.endContent}`;
			let similarity = 0;
			let method = "word_overlap";

			if (
				config.useEmbeddings &&
				queryNugget.embedding &&
				candidate.embedding
			) {
				try {
					similarity = calculateCosineSimilarity(
						queryNugget.embedding,
						candidate.embedding,
					);
					method = "embedding";
				} catch (_error) {
					// Fall back to word overlap
					similarity = this.calculateWordOverlapSimilarity(
						queryText,
						candidateText,
					);
					method = "fallback";
				}
			} else {
				similarity = this.calculateWordOverlapSimilarity(
					queryText,
					candidateText,
				);
			}

			if (similarity > bestSimilarity) {
				bestSimilarity = similarity;
				bestIndex = i;
				bestMethod = method;
			}
		}

		return {
			index: bestIndex,
			nugget: bestIndex >= 0 ? candidateNuggets[bestIndex] : null,
			similarity: bestSimilarity,
			method: bestMethod,
		};
	}

	/**
	 * Get current configuration
	 */
	getConfiguration(): SimilarityOptions {
		return { ...this.defaultOptions, ...this.options };
	}

	/**
	 * Update configuration
	 */
	updateConfiguration(newOptions: Partial<SimilarityOptions>): void {
		this.options = { ...this.options, ...newOptions };
	}
}
