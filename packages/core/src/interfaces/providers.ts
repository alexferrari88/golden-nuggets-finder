import type { GoldenNuggetType } from "../schemas";

// Provider identification types
export type ProviderId = "gemini" | "openai" | "anthropic" | "openrouter";

// Provider configuration interface
export interface ProviderConfig {
	providerId: ProviderId;
	apiKey: string;
	modelName?: string;
}

// Provider creation configuration
export interface ProviderCreateConfig {
	providerId: ProviderId;
	modelName?: string;
}

// Golden nuggets response format
export interface GoldenNuggetsResponse {
	golden_nuggets: Array<{
		type: GoldenNuggetType;
		fullContent: string;
		confidence: number;
		validationScore?: number;
		extractionMethod?:
			| "validated"
			| "unverified"
			| "fuzzy"
			| "llm"
			| "ensemble";
	}>;
}

// Core LLM provider interface that all providers must implement
export interface LLMProvider {
	readonly providerId: ProviderId;
	readonly modelName: string;

	/**
	 * Extract golden nuggets from content using fullContent approach
	 */
	extractGoldenNuggets(
		content: string,
		prompt: string,
		temperature?: number,
		selectedTypes?: GoldenNuggetType[],
	): Promise<GoldenNuggetsResponse>;

	/**
	 * Validate the provider's API key
	 */
	validateApiKey(): Promise<boolean>;
}

// Enhanced ensemble extraction result with metadata
export interface EnsembleExtractionResult {
	golden_nuggets: Array<{
		type: GoldenNuggetType;
		fullContent: string;
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
		// Multi-provider attribution metadata
		sourceProvider?: ProviderId;
		sourceModel?: string;
		contributingProviders?: Array<{ model: string; provider: string }>;
	}>;
	metadata?: {
		extractionMode?: string;
		totalRuns?: number;
		successfulRuns?: number;
		consensusReached?: number;
		duplicatesRemoved?: number;
		averageResponseTime?: number;
		providersUsed?: Array<{
			providerId: ProviderId;
			modelId: string;
			responseTime: number;
			successful: boolean;
		}>;
	};
}

// Ensemble extraction options
export interface EnsembleExtractionOptions {
	runs?: number;
	temperature?: number;
	parallelExecution?: boolean;
}

// Similarity options for consensus building
export interface SimilarityOptions {
	useEmbeddings?: boolean;
	embeddingThreshold?: number;
	wordOverlapThreshold?: number;
	embeddingOptions?: {
		taskType?: string;
		outputDimensionality?: number;
		model?: string;
		dimensions?: number;
		batchSize?: number;
	};
}
