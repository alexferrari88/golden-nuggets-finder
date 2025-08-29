import type { GoldenNuggetType } from "../schemas";

export type ProviderId = "gemini" | "openai" | "anthropic" | "openrouter";

export interface ProviderConfig {
	providerId: ProviderId;
	apiKey: string;
	modelName: string;
}

export interface EnsembleExtractionResult {
	golden_nuggets: Array<{
		type: "tool" | "media" | "aha! moments" | "analogy" | "model";
		fullContent: string;
		confidence: number;
		validationScore?: number;
		runsSupportingThis: number;
		totalRuns: number;
		// Optional embedding metadata
		similarityMethod?: "embedding" | "word_overlap" | "fallback";
	}>;
	metadata: {
		totalRuns: number;
		successfulRuns: number;
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
	 * Extract golden nuggets from content using the provided prompt.
	 * Now uses fullContent approach with confidence scoring and validation.
	 * @param content - The content to analyze
	 * @param prompt - The analysis prompt
	 * @param temperature - Optional temperature parameter (0.0-2.0). Default 0.7 for optimal extraction
	 * @param selectedTypes - Optional array of nugget types to extract
	 */
	extractGoldenNuggets(
		content: string,
		prompt: string,
		temperature?: number,
		selectedTypes?: GoldenNuggetType[],
	): Promise<GoldenNuggetsResponse>;

	validateApiKey(): Promise<boolean>;

	// Optional ensemble support
	extractGoldenNuggetsEnsemble?(
		content: string,
		prompt: string,
		runs: number,
	): Promise<EnsembleExtractionResult>;
}

export interface GoldenNuggetsResponse {
	golden_nuggets: Array<{
		type: "tool" | "media" | "aha! moments" | "analogy" | "model";
		fullContent: string;
		confidence: number;
		validationScore?: number;
		extractionMethod?: "validated" | "unverified" | "fuzzy" | "llm";
	}>;
}

// Enhanced response format that preserves metadata from advanced extraction modes
export interface EnhancedGoldenNuggetsResponse {
	golden_nuggets: Array<{
		type: "tool" | "media" | "aha! moments" | "analogy" | "model";
		fullContent: string;
		// Optional metadata from advanced extraction modes
		confidence: number;
		validationScore?: number;
		extractionMethod?:
			| "validated"
			| "unverified"
			| "fuzzy"
			| "llm"
			| "ensemble";
		// Ensemble-specific metadata
		runsSupportingThis?: number;
		totalRuns?: number;
		similarityMethod?: "embedding" | "word_overlap" | "fallback";
	}>;
	// Optional metadata about the extraction process
	metadata?: {
		// Two-phase metadata
		phase1Count?: number;
		phase1FilteredCount?: number;
		phase2FuzzyCount?: number;
		phase2LlmCount?: number;
		confidenceThreshold?: number;
		abortedDueToLowConfidence?: boolean;
		noNuggetsPassed?: boolean;
		// Ensemble metadata
		totalRuns?: number;
		successfulRuns?: number;
		consensusReached?: number;
		duplicatesRemoved?: number;
		averageResponseTime?: number;
		embeddingGenerationTime?: number;
		embeddingCacheHits?: number;
		similarityMethod?: "embedding" | "hybrid" | "word_overlap_only";
		// General metadata
		totalProcessingTime?: number;
		extractionMode?: "standard" | "two-phase" | "ensemble";
	};
}

export interface ProviderStorageSchema {
	selectedProvider: ProviderId;
	apiKeys: Record<ProviderId, string>; // Encrypted
	providerConfigs: Record<ProviderId, ProviderConfig>;
}
