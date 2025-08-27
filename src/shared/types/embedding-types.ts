/**
 * Shared types for embedding functionality
 * Used across embedding service, hybrid similarity matcher, and ensemble extractor
 */

export interface EmbeddingVector {
	values: number[];
}

export interface EmbeddingOptions {
	/** Task type for embedding generation */
	taskType?: "SEMANTIC_SIMILARITY" | "CLASSIFICATION" | "CLUSTERING";
	/** Output dimensionality for embeddings */
	outputDimensionality?: 256 | 512 | 768 | 1536 | 3072;
}

export interface SimilarityOptions {
	/** Embedding-based similarity threshold (0.0-1.0) */
	embeddingThreshold: number;
	/** Word overlap similarity threshold (0.0-1.0) */
	wordOverlapThreshold: number;
	/** Enable embedding-based similarity (falls back to word overlap if disabled) */
	useEmbeddings: boolean;
	/** Embedding generation options */
	embeddingOptions?: EmbeddingOptions;
}

export interface SimilarityResult {
	/** Final similarity score */
	similarity: number;
	/** Method used for calculation */
	method: "embedding" | "word_overlap" | "fallback";
	/** Whether texts are considered similar based on thresholds */
	isSimilar: boolean;
	/** Additional metadata about the calculation */
	metadata?: {
		embeddingError?: string;
		wordOverlapScore?: number;
		embeddingScore?: number;
	};
}

export interface NuggetWithEmbedding {
	type: string;
	startContent: string;
	endContent: string;
	runId?: string;
	embedding?: EmbeddingVector;
}

export interface EmbeddingServiceConfig {
	/** Maximum number of retries for API calls */
	maxRetries?: number;
	/** Initial retry delay in milliseconds */
	retryDelay?: number;
	/** Maximum batch size for API calls */
	maxBatchSize?: number;
	/** Cache duration in milliseconds */
	cacheDuration?: number;
	/** Maximum cache size (number of entries) */
	maxCacheSize?: number;
}

export interface EmbeddingCacheEntry {
	embedding: EmbeddingVector;
	timestamp: number;
	accessCount: number;
}

export interface EmbeddingServiceStats {
	cacheSize: number;
	maxCacheSize: number;
	cacheHitRate?: number;
	totalEmbeddings: number;
	totalApiCalls: number;
	totalErrors: number;
	averageResponseTime?: number;
}

export type SimilarityMethod =
	| "embedding"
	| "word_overlap"
	| "fallback"
	| "hybrid";

export interface SimilarityGroupMetadata {
	totalNuggets: number;
	totalGroups: number;
	averageGroupSize: number;
	similarityMethod: SimilarityMethod;
	processingTime: number;
	embeddingErrors?: number;
}
