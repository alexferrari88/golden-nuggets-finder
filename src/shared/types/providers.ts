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

	/**
	 * Phase 1 extraction: High-recall extraction with confidence scoring
	 * @param content - The content to analyze
	 * @param prompt - The Phase 1 analysis prompt
	 * @param temperature - Temperature parameter (default 0.7 for high recall)
	 * @param selectedTypes - Optional array of nugget types to extract
	 */
	extractPhase1HighRecall(
		content: string,
		prompt: string,
		temperature?: number,
		selectedTypes?: GoldenNuggetType[],
	): Promise<Phase1Response>;

	/**
	 * Phase 2 extraction: High-precision boundary detection for specific nuggets
	 * @param content - The original content to analyze
	 * @param prompt - The Phase 2 boundary detection prompt
	 * @param nuggets - Array of nuggets from Phase 1 that need boundary detection
	 * @param temperature - Temperature parameter (default 0.0 for high precision)
	 */
	extractPhase2HighPrecision(
		content: string,
		prompt: string,
		nuggets: Array<{
			type: GoldenNuggetType;
			fullContent: string;
			confidence: number;
		}>,
		temperature?: number,
	): Promise<Phase2Response>;

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

// Enhanced response format that preserves metadata from advanced extraction modes
export interface EnhancedGoldenNuggetsResponse {
	golden_nuggets: Array<{
		type: "tool" | "media" | "aha! moments" | "analogy" | "model";
		startContent: string;
		endContent: string;
		// Optional metadata from advanced extraction modes
		confidence?: number;
		extractionMethod?: "standard" | "fuzzy" | "llm" | "ensemble";
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

// Phase 1 response format with fullContent and confidence
export interface Phase1Response {
	golden_nuggets: Array<{
		type: GoldenNuggetType;
		fullContent: string;
		confidence: number;
	}>;
}

// Phase 2 response format for boundary detection
export interface Phase2Response {
	golden_nuggets: Array<{
		type: GoldenNuggetType;
		startContent: string;
		endContent: string;
		confidence: number;
	}>;
}

export interface ProviderStorageSchema {
	selectedProvider: ProviderId;
	apiKeys: Record<ProviderId, string>; // Encrypted
	providerConfigs: Record<ProviderId, ProviderConfig>;
}
