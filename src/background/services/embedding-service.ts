import { EMBEDDING_CONFIG } from "../../shared/constants";
import { debugLogger } from "../../shared/debug";
import { storage } from "../../shared/storage";
import type {
	EmbeddingCacheEntry,
	EmbeddingOptions,
	EmbeddingVector,
} from "../../shared/types/embedding-types";


export class EmbeddingService {
	private apiKey: string | null = null;
	private readonly MAX_RETRIES = EMBEDDING_CONFIG.MAX_RETRIES;
	private readonly RETRY_DELAY = EMBEDDING_CONFIG.RETRY_DELAY;
	private readonly API_BASE_URL =
		"https://generativelanguage.googleapis.com/v1beta/models";
	private readonly MAX_BATCH_SIZE = EMBEDDING_CONFIG.MAX_BATCH_SIZE;
	private readonly CACHE_DURATION = EMBEDDING_CONFIG.CACHE_DURATION;
	private embeddingCache = new Map<string, EmbeddingCacheEntry>();

	private async initializeClient(): Promise<void> {
		if (this.apiKey) return;

		try {
			this.apiKey = await storage.getApiKey({
				source: "background",
				action: "read",
				timestamp: Date.now(),
			});
		} catch (error: unknown) {
			debugLogger.error("[EmbeddingService] API key retrieval failed:", error);
			throw new Error("Failed to retrieve API key for embeddings");
		}

		if (!this.apiKey) {
			throw new Error("Gemini API key not configured for embedding service");
		}
	}

	private getCacheKey(text: string, options: EmbeddingOptions): string {
		const {
			taskType = EMBEDDING_CONFIG.TASK_TYPE,
			outputDimensionality = EMBEDDING_CONFIG.OUTPUT_DIMENSIONALITY,
		} = options;
		return `${text}|${taskType}|${outputDimensionality}`;
	}

	private getCachedEmbedding(
		text: string,
		options: EmbeddingOptions,
	): EmbeddingVector | null {
		const cacheKey = this.getCacheKey(text, options);
		const cached = this.embeddingCache.get(cacheKey);

		if (!cached) {
			return null;
		}

		// Check if cache entry is still valid
		if (Date.now() - cached.timestamp > this.CACHE_DURATION) {
			this.embeddingCache.delete(cacheKey);
			return null;
		}

		// Update access count for cache hit tracking
		cached.accessCount++;

		return cached.embedding;
	}

	private setCachedEmbedding(
		text: string,
		embedding: EmbeddingVector,
		options: EmbeddingOptions,
	): void {
		const cacheKey = this.getCacheKey(text, options);
		this.embeddingCache.set(cacheKey, {
			embedding,
			timestamp: Date.now(),
			accessCount: 1,
		});

		// Cleanup old cache entries (simple LRU)
		if (this.embeddingCache.size > EMBEDDING_CONFIG.MAX_CACHE_SIZE) {
			const oldestKey = this.embeddingCache.keys().next().value;
			if (oldestKey) {
				this.embeddingCache.delete(oldestKey);
			}
		}
	}

	/**
	 * Normalize embedding vector using L2 normalization
	 * Required for non-3072 dimensional embeddings per Gemini documentation
	 */
	private normalizeEmbedding(embedding: EmbeddingVector): EmbeddingVector {
		const values = embedding.values;
		
		// Calculate L2 norm (magnitude)
		const magnitude = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
		
		// Avoid division by zero
		if (magnitude === 0) {
			return embedding;
		}
		
		// Normalize by dividing each component by magnitude
		const normalizedValues = values.map(value => value / magnitude);
		
		return { values: normalizedValues };
	}

	private async makeApiCall(
		texts: string[],
		options: EmbeddingOptions,
		retryCount = 0,
	): Promise<EmbeddingVector[]> {
		await this.initializeClient();

		const {
			taskType = EMBEDDING_CONFIG.TASK_TYPE,
			outputDimensionality = EMBEDDING_CONFIG.OUTPUT_DIMENSIONALITY,
		} = options;

		const isBatch = texts.length > 1;
		let requestBody: any;
		let apiUrl: string;

		if (isBatch) {
			// Use batch endpoint for multiple texts
			apiUrl = `${this.API_BASE_URL}/gemini-embedding-001:batchEmbedContents`;
			requestBody = {
				requests: texts.map(text => ({
					model: `models/${EMBEDDING_CONFIG.MODEL}`,
					content: { parts: [{ text }] },
					taskType,
					outputDimensionality,
				}))
			};
		} else {
			// Use single endpoint for single text
			apiUrl = `${this.API_BASE_URL}/gemini-embedding-001:embedContent`;
			requestBody = {
				model: `models/${EMBEDDING_CONFIG.MODEL}`,
				content: { parts: [{ text: texts[0] }] },
				taskType,
				outputDimensionality,
			};
		}

		// Detailed logging for debugging
		debugLogger.log(`[EmbeddingService] Making ${isBatch ? 'batch' : 'single'} API call with ${texts.length} texts`);
		debugLogger.log(`[EmbeddingService] Request body:`, JSON.stringify(requestBody, null, 2));
		debugLogger.log(`[EmbeddingService] API URL:`, apiUrl);

		try {
			const response = await fetch(
				apiUrl,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"x-goog-api-key": this.apiKey,
					},
					body: JSON.stringify(requestBody),
				},
			);

			debugLogger.log(`[EmbeddingService] Response status:`, response.status, response.statusText);

			if (!response.ok) {
				let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
				let errorData = null;
				try {
					errorData = await response.json();
					debugLogger.log(`[EmbeddingService] Error response:`, JSON.stringify(errorData, null, 2));
					if (errorData.error?.message) {
						errorMessage = errorData.error.message;
					}
				} catch (parseError) {
					debugLogger.log(`[EmbeddingService] Failed to parse error response:`, parseError);
					// Use default error message if JSON parsing fails
				}

				debugLogger.error(`[EmbeddingService] API call failed:`, errorMessage);
				throw new Error(`Gemini API error: ${errorMessage}`);
			}

			const data = await response.json();
			debugLogger.log(`[EmbeddingService] Response data:`, JSON.stringify(data, null, 2));

			if (isBatch) {
				// Batch response format: { embeddings: [{ values: [...] }, ...] }
				if (!data.embeddings || !Array.isArray(data.embeddings)) {
					throw new Error("Invalid batch response format from Gemini embedding API");
				}
				return data.embeddings;
			} else {
				// Single response format: { embedding: { values: [...] } }
				if (!data.embedding || !Array.isArray(data.embedding.values)) {
					throw new Error("Invalid single response format from Gemini embedding API");
				}
				return [data.embedding]; // Return array for consistency
			}
		} catch (error) {
			debugLogger.error(
				`[EmbeddingService] API call failed (attempt ${retryCount + 1}):`,
				error,
			);

			if (retryCount < this.MAX_RETRIES) {
				const delay = this.RETRY_DELAY * 2 ** retryCount;
				debugLogger.log(`[EmbeddingService] Retrying in ${delay}ms...`);

				await new Promise((resolve) => setTimeout(resolve, delay));
				return this.makeApiCall(texts, options, retryCount + 1);
			}

			throw error;
		}
	}

	/**
	 * Generate embeddings for a single text
	 */
	async generateEmbedding(
		text: string,
		options: EmbeddingOptions = {},
	): Promise<EmbeddingVector> {
		// Check cache first
		const cached = this.getCachedEmbedding(text, options);
		if (cached) {
			debugLogger.log(
				"[EmbeddingService] Cache hit for text:",
				`${text.substring(0, 50)}...`,
			);
			return cached;
		}

		const embeddings = await this.makeApiCall([text], options);
		let embedding = embeddings[0];

		// Normalize embeddings for non-3072 dimensions (per Gemini documentation)
		const outputDimensionality = options.outputDimensionality ?? EMBEDDING_CONFIG.OUTPUT_DIMENSIONALITY;
		if (outputDimensionality !== 3072) {
			embedding = this.normalizeEmbedding(embedding);
		}

		// Cache the result
		this.setCachedEmbedding(text, embedding, options);

		return embedding;
	}

	/**
	 * Generate embeddings for multiple texts in batches
	 */
	async generateEmbeddings(
		texts: string[],
		options: EmbeddingOptions = {},
	): Promise<EmbeddingVector[]> {
		debugLogger.log(`[EmbeddingService] generateEmbeddings called with ${texts.length} texts`);
		
		if (texts.length === 0) {
			debugLogger.log(`[EmbeddingService] Empty texts array, returning empty results`);
			return [];
		}

		const results: EmbeddingVector[] = [];
		const uncachedTexts: string[] = [];
		const uncachedIndices: number[] = [];

		// Check cache for each text
		for (let i = 0; i < texts.length; i++) {
			const text = texts[i];
			const cached = this.getCachedEmbedding(text, options);

			if (cached) {
				results[i] = cached;
				debugLogger.log(`[EmbeddingService] Cache hit for text ${i}: "${text.substring(0, 50)}..."`);
			} else {
				uncachedTexts.push(text);
				uncachedIndices.push(i);
				debugLogger.log(`[EmbeddingService] Cache miss for text ${i}: "${text.substring(0, 50)}..."`);
			}
		}

		debugLogger.log(`[EmbeddingService] Cache summary: ${results.filter(r => r).length} hits, ${uncachedTexts.length} misses`);

		// Process uncached texts in batches
		if (uncachedTexts.length > 0) {
			const outputDimensionality = options.outputDimensionality ?? EMBEDDING_CONFIG.OUTPUT_DIMENSIONALITY;
			const needsNormalization = outputDimensionality !== 3072;

			debugLogger.log(`[EmbeddingService] Processing ${uncachedTexts.length} uncached texts in batches of ${this.MAX_BATCH_SIZE}`);
			debugLogger.log(`[EmbeddingService] Normalization needed: ${needsNormalization} (dimension: ${outputDimensionality})`);

			// Process texts in batches using proper batch API
			for (let i = 0; i < uncachedTexts.length; i += this.MAX_BATCH_SIZE) {
				const batch = uncachedTexts.slice(i, i + this.MAX_BATCH_SIZE);
				const batchIndices = uncachedIndices.slice(i, i + this.MAX_BATCH_SIZE);

				debugLogger.log(
					`[EmbeddingService] Processing batch ${Math.floor(i / this.MAX_BATCH_SIZE) + 1}/${Math.ceil(uncachedTexts.length / this.MAX_BATCH_SIZE)} with ${batch.length} texts (batch API)`,
				);

				const batchEmbeddings = await this.makeApiCall(batch, options);

				debugLogger.log(`[EmbeddingService] Received ${batchEmbeddings.length} embeddings from batch API`);

				// Store results and cache embeddings
				for (let j = 0; j < batch.length; j++) {
					const text = batch[j];
					let embedding = batchEmbeddings[j];
					const originalIndex = batchIndices[j];

					debugLogger.log(`[EmbeddingService] Processing embedding ${j} for original index ${originalIndex}`);
					debugLogger.log(`[EmbeddingService] Original embedding dimension: ${embedding.values.length}`);

					// Normalize embeddings for non-3072 dimensions
					if (needsNormalization) {
						const originalMagnitude = Math.sqrt(embedding.values.reduce((sum, value) => sum + value * value, 0));
						embedding = this.normalizeEmbedding(embedding);
						const normalizedMagnitude = Math.sqrt(embedding.values.reduce((sum, value) => sum + value * value, 0));
						debugLogger.log(`[EmbeddingService] Normalized embedding: ${originalMagnitude.toFixed(4)} -> ${normalizedMagnitude.toFixed(4)}`);
					}

					results[originalIndex] = embedding;
					this.setCachedEmbedding(text, embedding, options);
				}
			}
		}

		debugLogger.log(`[EmbeddingService] Returning ${results.length} embeddings total`);
		return results;
	}

	/**
	 * Clear the embedding cache
	 */
	clearCache(): void {
		this.embeddingCache.clear();
		debugLogger.log("[EmbeddingService] Embedding cache cleared");
	}

	/**
	 * Get cache statistics
	 */
	getCacheStats(): { size: number; maxSize: number; hitRate?: number } {
		return {
			size: this.embeddingCache.size,
			maxSize: EMBEDDING_CONFIG.MAX_CACHE_SIZE,
		};
	}
}

// Export singleton instance
export const embeddingService = new EmbeddingService();
