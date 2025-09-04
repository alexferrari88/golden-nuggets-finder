import type { GoldenNuggetType } from "../schemas";

/**
 * Core types for golden nugget extraction and analysis
 * Platform-agnostic interfaces for shared library use
 */

export interface GoldenNugget {
	type: GoldenNuggetType;
	fullContent: string; // Primary content field
	confidence: number; // Required confidence score (from LLM analysis or validation)
	validationScore?: number; // Optional validation score
	extractionMethod?: "validated" | "unverified" | "fuzzy" | "llm" | "ensemble"; // Optional extraction method metadata
}

// Enhanced nugget interface with optional metadata for UI display
export interface EnhancedGoldenNugget extends GoldenNugget {
	// Ensemble-specific metadata (base interface now has confidence and extractionMethod)
	runsSupportingThis?: number;
	totalRuns?: number;
	similarityMethod?: "embedding" | "word_overlap" | "fallback";
	// Multi-provider metadata
	sourceProvider?: string; // Track which provider found this nugget (for single-provider scenarios)
	sourceModel?: string;
	contributingProviders?: Array<{ model: string; provider: string }>; // Track all providers that contributed to this nugget (for ensemble consensus)
}

export interface SavedPrompt {
	id: string;
	name: string;
	prompt: string;
	isDefault: boolean;
	// Optional properties for optimized prompts
	isOptimized?: boolean;
	optimizationDate?: string;
	performance?: {
		feedbackCount: number;
		positiveRate: number;
	};
}

export interface TypeFilterOptions {
	selectedTypes: GoldenNuggetType[];
	analysisMode: "combination" | "single";
}

export interface TypeConfiguration {
	type: GoldenNuggetType;
	label: string;
	emoji: string;
}

// Prompt Context Types for Backend Integration
export interface PromptMetadata {
	id: string; // Unique identifier for the prompt
	version?: string; // Version identifier (e.g., "v1.0", "optimized-2024-01-15")
	content: string; // Full prompt content
	type: "default" | "optimized" | "custom"; // Prompt type for backend categorization
	name: string; // Human-readable prompt name
	isOptimized?: boolean; // Whether this is an optimized version
	optimizationDate?: string; // When optimization occurred
	performance?: {
		feedbackCount: number;
		positiveRate: number;
	}; // Performance metrics for optimization context
}

// Feedback System Types
export type FeedbackRating = "positive" | "negative";

export interface NuggetFeedback {
	id: string;
	nuggetContent: string; // First 200 chars for identification
	originalType: GoldenNuggetType;
	correctedType?: GoldenNuggetType; // If user corrected the type
	rating: FeedbackRating;
	timestamp: number;
	url: string;
	context: string; // Surrounding content (first 200 chars)
	// Provider/model tracking for optimization
	modelProvider: string;
	modelName: string;
	// Prompt context for optimization
	prompt: PromptMetadata; // Full prompt metadata for backend optimization
	// Complete nugget object with attribution metadata
	nugget: EnhancedGoldenNugget; // Complete nugget with sourceProvider, sourceModel, contributingProviders
}

export interface MissingContentFeedback {
	id: string;
	fullContent: string;
	suggestedType: GoldenNuggetType;
	timestamp: number;
	url: string;
	context: string; // Page context
	// Provider/model tracking for optimization
	modelProvider: string;
	modelName: string;
	// Prompt context for optimization
	prompt: PromptMetadata; // Full prompt metadata for backend optimization
}

export interface FeedbackSubmission {
	nuggetFeedback?: NuggetFeedback[];
	missingContentFeedback?: MissingContentFeedback[];
}

export interface FeedbackStats {
	totalFeedback: number;
	positiveCount: number;
	negativeCount: number;
	lastOptimizationDate: string | null;
	daysSinceLastOptimization: number;
	recentNegativeRate: number; // Negative rate in last 20 items
	shouldOptimize: boolean;
	nextOptimizationTrigger: string;
}

export interface OptimizationRequest {
	mode: "expensive" | "cheap"; // MIPROv2 vs BootstrapFewShotWithRandomSearch
	manualTrigger?: boolean;
}

export interface OptimizedPrompt {
	id: string;
	version: number;
	prompt: string;
	optimizationDate: string;
	performance: {
		feedbackCount: number;
		positiveRate: number;
	};
	// Prompt-specific optimization context
	originalPromptId: string; // ID of the original prompt that was optimized
	originalPromptName?: string; // Human-readable name of original prompt
	modelProvider?: string; // Provider this optimization is specific to
	modelName?: string; // Model this optimization is specific to
	providerSpecific?: boolean; // Whether this is provider-specific or generic
	fallbackUsed?: boolean; // Whether this is a fallback to generic optimization
}

export interface ExportData {
	url: string;
	nuggets: Array<{
		type: string;
		content: string; // Use fullContent directly
		confidence?: number;
		validationScore?: number;
	}>;
}

export type ExportFormat = "json" | "markdown";

export interface ExportOptions {
	format: ExportFormat;
	scope: "all" | "selected";
}

// Vector and similarity types for embedding analysis
// Vector interface imported from cosine-similarity utils

export interface EmbeddingVector {
	values: number[];
	model: string;
	dimensions: number;
}

export interface SimilarityResult {
	similarity: number;
	method: "embedding" | "word_overlap" | "fallback";
	isSimilar: boolean;
	metadata?: {
		embeddingError?: string;
		[key: string]: any;
	};
}

// Re-export provider types for convenience
export type {
	EnsembleExtractionResult,
	GoldenNuggetsResponse,
	LLMProvider,
	ProviderCreateConfig,
	ProviderId,
	SimilarityOptions,
} from "../interfaces/providers";

// Nugget with embedding for similarity analysis
export interface NuggetWithEmbedding extends GoldenNugget {
	embedding?: number[];
	runId?: string; // Track source run for ensemble processing
	sourceProvider?: string;
	sourceModel?: string;
}

// Analysis types
export interface AnalysisOptions {
	providerId: string;
	typeFilter?: GoldenNuggetType[];
	temperature?: number;
}

export interface EnsembleOptions {
	mode: "single-model" | "multi-provider";
	providerId?: string; // For single-model mode
	providers?: Array<{ providerId: string; modelId?: string }>; // For multi-provider mode
	runs?: number; // For single-model mode
	typeFilter?: GoldenNuggetType[];
}
