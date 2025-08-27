export type ProviderId = "gemini" | "openai" | "anthropic" | "openrouter";

export interface ProviderConfig {
	providerId: ProviderId;
	apiKey: string;
	modelName: string;
}

export interface EnsembleExtractionResult {
	golden_nuggets: Array<{
		type: "tool" | "media" | "aha! moments" | "analogy" | "model";
		startContent: string;
		endContent: string;
		confidence: number;
		runsSupportingThis: number;
		totalRuns: number;
		// Optional embedding metadata
		similarityMethod?: "embedding" | "word_overlap" | "fallback";
	}>;
	metadata: {
		totalRuns: number;
		consensusReached: number;
		duplicatesRemoved: number;
		averageResponseTime: number;
		// Optional embedding-related metadata
		embeddingGenerationTime?: number;
		embeddingCacheHits?: number;
		similarityMethod?: "embedding" | "hybrid" | "word_overlap_only";
	};
}

export interface LLMProvider {
	readonly providerId: ProviderId;
	readonly modelName: string;
	/**
	 * Extract golden nuggets from content using the provided prompt
	 * @param content - The content to analyze
	 * @param prompt - The analysis prompt
	 * @param temperature - Optional temperature parameter (0.0-2.0). If not provided, uses provider default (typically 0.2)
	 */
	extractGoldenNuggets(
		content: string,
		prompt: string,
		temperature?: number,
	): Promise<GoldenNuggetsResponse>;
	validateApiKey(): Promise<boolean>;

	// New: Optional ensemble support
	extractGoldenNuggetsEnsemble?(
		content: string,
		prompt: string,
		runs: number,
	): Promise<EnsembleExtractionResult>;
}

export interface GoldenNuggetsResponse {
	golden_nuggets: Array<{
		type: "tool" | "media" | "aha! moments" | "analogy" | "model";
		startContent: string;
		endContent: string;
	}>;
}

export interface ProviderStorageSchema {
	selectedProvider: ProviderId;
	apiKeys: Record<ProviderId, string>; // Encrypted
	providerConfigs: Record<ProviderId, ProviderConfig>;
}
