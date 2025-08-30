import type { GoldenNuggetType } from "./schemas";
import type { EnsembleExtractionResult, ProviderId } from "./types/providers";

// Export provider types for multi-LLM support
export * from "./types/providers";

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
}

export interface GeminiResponse {
	golden_nuggets: GoldenNugget[];
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

export interface ExtensionConfig {
	geminiApiKey: string;
	userPrompts: SavedPrompt[];
	userPersona?: string;

	// NEW: Multi-provider fields
	selectedProvider?: ProviderId;

	// Provider-specific settings
	providerSettings?: {
		[K in ProviderId]?: {
			modelName: string;
			lastUsed: string;
			isConfigured: boolean;
		};
	};

	// Metadata
	lastUsedProvider?: {
		providerId: ProviderId;
		modelName: string;
		responseTime: number;
		timestamp: string;
	};

	// Debug settings
	enableDebugLogging?: boolean;

	// Ensemble settings
	ensembleSettings?: {
		defaultRuns: number;
		defaultMode: "fast" | "balanced" | "comprehensive";
		enabled: boolean;
	};
}

// Separate type definitions for Ensemble
export type EnsembleMode = "fast" | "balanced" | "comprehensive";

export interface EnsembleSettings {
	defaultRuns: number;
	defaultMode: EnsembleMode;
	enabled: boolean;
}

export interface NuggetDisplayState {
	nugget: GoldenNugget;
	highlighted: boolean;
	elementRef?: HTMLElement;
}

export interface SidebarNuggetItem {
	nugget: GoldenNugget;
	status: "highlighted" | "not-found";
	selected: boolean;
	highlightVisited?: boolean; // Track if highlighted item was clicked
	feedback?: NuggetFeedback;
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

export interface AnalysisRequest {
	type?: string; // Message type for discrimination
	content: string;
	promptId: string;
	url: string;
	analysisId?: string; // Unique ID for tracking progress
	source?: "popup" | "context-menu"; // Who triggered this analysis
	typeFilter?: TypeFilterOptions; // Type filtering options
	// NEW: Full prompt metadata for analysis context tracking
	promptMetadata?: PromptMetadata; // Optional - will be resolved from promptId if not provided
}

// New ensemble analysis request
export interface EnsembleAnalysisRequest {
	type?: string; // Message type for discrimination
	content: string;
	promptId: string;
	url: string;
	analysisId?: string;
	source?: "popup" | "context-menu";
	ensembleOptions?: {
		runs: number;
		mode: EnsembleMode;
	};
	typeFilter?: TypeFilterOptions;
}

export interface CommentSelectionRequest {
	promptId: string;
	url: string;
	// NEW: Full prompt metadata for analysis context tracking
	promptMetadata?: PromptMetadata; // Optional - will be resolved from promptId if not provided
}

export interface SelectedContentAnalysisRequest {
	content: string;
	promptId: string;
	url: string;
	selectedComments: string[];
	typeFilter?: TypeFilterOptions; // Type filtering options
	analysisId?: string; // Optional analysis ID for tracking
	// NEW: Full prompt metadata for analysis context tracking
	promptMetadata?: PromptMetadata; // Optional - will be resolved from promptId if not provided
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

export interface AnalysisResponse {
	success: boolean;
	data?: GeminiResponse;
	error?: string;
	providerMetadata?: {
		providerId: ProviderId;
		modelName: string;
		responseTime: number;
	};
	// Optional metadata for two-phase extraction
	metadata?: {
		phase1Count: number;
		phase1FilteredCount: number;
		phase2FuzzyCount: number;
		phase2LlmCount: number;
		totalProcessingTime: number;
		confidenceThreshold: number;
		abortedDueToLowConfidence?: boolean;
		noNuggetsPassed?: boolean;
	};
}

// Enhanced response with ensemble data
export interface EnsembleAnalysisResponse {
	success: boolean;
	error?: string;
	data?: EnsembleExtractionResult & {
		providerMetadata: {
			providerId: ProviderId;
			modelName: string;
			ensembleRuns: number;
			consensusMethod: string;
		};
	};
}

// Prompt Context Types for Backend Integration
/**
 * PromptMetadata provides full prompt context for backend optimization.
 * This interface bridges the Chrome extension's SavedPrompt structure with
 * the backend's optimization requirements.
 *
 * DEFAULT_PROMPTS Structure Documentation:
 * The system currently uses a single sophisticated default prompt:
 * - ID: "default-insights"
 * - Name: "Find Key Insights"
 * - Type: "default"
 * - Version: "v1.0"
 *
 * Backend Optimization Context:
 * - Each feedback submission must include full prompt content
 * - DSPy optimization requires understanding prompt structure and intent
 * - Version tracking enables A/B testing between original and optimized prompts
 * - Performance metrics enable data-driven optimization decisions
 */
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
	modelProvider: ProviderId;
	modelName: string;
	// NEW: Prompt context for optimization
	prompt: PromptMetadata; // Full prompt metadata for backend optimization
}

export interface MissingContentFeedback {
	id: string;
	fullContent: string;
	suggestedType: GoldenNuggetType;
	timestamp: number;
	url: string;
	context: string; // Page context
	// Provider/model tracking for optimization
	modelProvider: ProviderId;
	modelName: string;
	// NEW: Prompt context for optimization
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
	// NEW: Prompt-specific optimization context
	originalPromptId: string; // ID of the original prompt that was optimized
	originalPromptName?: string; // Human-readable name of original prompt
	modelProvider?: ProviderId; // Provider this optimization is specific to
	modelName?: string; // Model this optimization is specific to
	providerSpecific?: boolean; // Whether this is provider-specific or generic
	fallbackUsed?: boolean; // Whether this is a fallback to generic optimization
}

export interface DebugLogMessage {
	type:
		| "log"
		| "error"
		| "warn"
		| "llm-request"
		| "llm-response"
		| "llm-validation";
	message: string;
	data?: unknown;
}

export interface AnalysisProgressMessage {
	type:
		| "ANALYSIS_CONTENT_EXTRACTED"
		| "ANALYSIS_CONTENT_OPTIMIZED"
		| "ANALYSIS_API_REQUEST_START"
		| "ANALYSIS_API_RESPONSE_RECEIVED"
		| "ANALYSIS_PROCESSING_RESULTS"
		| "ensemble_extraction_progress"
		| "ensemble_consensus_complete";
	step: 1 | 2 | 3 | 4;
	message: string;
	timestamp: number;
	analysisId: string; // Unique ID to track which analysis this progress belongs to
	source?: "popup" | "context-menu"; // Who triggered this analysis
}

// Persistent analysis state for popup restoration
export interface PersistentAnalysisState {
	analysisId: string;
	promptName: string;
	startTime: number;
	source: "popup" | "context-menu";
	currentPhase: number;
	completedPhases: number[];
	aiStartTime?: number;
}

export interface RateLimitedMessage {
	type: "ANALYSIS_RATE_LIMITED";
	provider: string;
	waitTime: number; // seconds
	attempt: number;
	maxAttempts: number;
	analysisId: string;
}

export interface RetryingMessage {
	type: "ANALYSIS_RETRYING";
	provider: string;
	attempt: number;
	maxAttempts: number;
	analysisId: string;
}

export interface MessageTypes {
	ANALYZE_CONTENT: "ANALYZE_CONTENT";
	ANALYSIS_COMPLETE: "ANALYSIS_COMPLETE";
	ANALYSIS_ERROR: "ANALYSIS_ERROR";
	ANALYSIS_CONTENT_EXTRACTED: "ANALYSIS_CONTENT_EXTRACTED";
	ANALYSIS_CONTENT_OPTIMIZED: "ANALYSIS_CONTENT_OPTIMIZED";
	ANALYSIS_API_REQUEST_START: "ANALYSIS_API_REQUEST_START";
	ANALYSIS_API_RESPONSE_RECEIVED: "ANALYSIS_API_RESPONSE_RECEIVED";
	ANALYSIS_PROCESSING_RESULTS: "ANALYSIS_PROCESSING_RESULTS";
	// Ensemble Analysis Messages
	ANALYZE_CONTENT_ENSEMBLE: "analyze_content_ensemble";
	ENSEMBLE_EXTRACTION_PROGRESS: "ensemble_extraction_progress";
	ENSEMBLE_CONSENSUS_COMPLETE: "ensemble_consensus_complete";
	SHOW_ERROR: "SHOW_ERROR";
	SHOW_INFO: "SHOW_INFO";
	SHOW_API_KEY_ERROR: "SHOW_API_KEY_ERROR";
	OPEN_OPTIONS_PAGE: "OPEN_OPTIONS_PAGE";
	GET_PROMPTS: "GET_PROMPTS";
	SAVE_PROMPT: "SAVE_PROMPT";
	DELETE_PROMPT: "DELETE_PROMPT";
	SET_DEFAULT_PROMPT: "SET_DEFAULT_PROMPT";
	GET_CONFIG: "GET_CONFIG";
	SAVE_CONFIG: "SAVE_CONFIG";
	DEBUG_LOG: "DEBUG_LOG";
	ENTER_SELECTION_MODE: "ENTER_SELECTION_MODE";
	ANALYZE_SELECTED_CONTENT: "ANALYZE_SELECTED_CONTENT";
	// Feedback System Messages
	SUBMIT_NUGGET_FEEDBACK: "SUBMIT_NUGGET_FEEDBACK";
	DELETE_NUGGET_FEEDBACK: "DELETE_NUGGET_FEEDBACK";
	ENTER_MISSING_CONTENT_MODE: "ENTER_MISSING_CONTENT_MODE";
	SUBMIT_MISSING_CONTENT_FEEDBACK: "SUBMIT_MISSING_CONTENT_FEEDBACK";
	GET_FEEDBACK_STATS: "GET_FEEDBACK_STATS";
	TRIGGER_OPTIMIZATION: "TRIGGER_OPTIMIZATION";
	GET_CURRENT_OPTIMIZED_PROMPT: "GET_CURRENT_OPTIMIZED_PROMPT";
	// Provider Management Messages
	SWITCH_PROVIDER: "SWITCH_PROVIDER";
	GET_AVAILABLE_PROVIDERS: "GET_AVAILABLE_PROVIDERS";
	GET_CURRENT_PROVIDER: "GET_CURRENT_PROVIDER";
	VALIDATE_PROVIDER: "VALIDATE_PROVIDER";
	// Rate Limiting and Retry Messages
	ANALYSIS_RATE_LIMITED: "ANALYSIS_RATE_LIMITED";
	ANALYSIS_RETRYING: "ANALYSIS_RETRYING";
	ABORT_ANALYSIS: "ABORT_ANALYSIS";
}

export const MESSAGE_TYPES: MessageTypes = {
	ANALYZE_CONTENT: "ANALYZE_CONTENT",
	ANALYSIS_COMPLETE: "ANALYSIS_COMPLETE",
	ANALYSIS_ERROR: "ANALYSIS_ERROR",
	ANALYSIS_CONTENT_EXTRACTED: "ANALYSIS_CONTENT_EXTRACTED",
	ANALYSIS_CONTENT_OPTIMIZED: "ANALYSIS_CONTENT_OPTIMIZED",
	ANALYSIS_API_REQUEST_START: "ANALYSIS_API_REQUEST_START",
	ANALYSIS_API_RESPONSE_RECEIVED: "ANALYSIS_API_RESPONSE_RECEIVED",
	ANALYSIS_PROCESSING_RESULTS: "ANALYSIS_PROCESSING_RESULTS",
	// New ensemble types
	ANALYZE_CONTENT_ENSEMBLE: "analyze_content_ensemble",
	ENSEMBLE_EXTRACTION_PROGRESS: "ensemble_extraction_progress",
	ENSEMBLE_CONSENSUS_COMPLETE: "ensemble_consensus_complete",
	SHOW_ERROR: "SHOW_ERROR",
	SHOW_INFO: "SHOW_INFO",
	SHOW_API_KEY_ERROR: "SHOW_API_KEY_ERROR",
	OPEN_OPTIONS_PAGE: "OPEN_OPTIONS_PAGE",
	GET_PROMPTS: "GET_PROMPTS",
	SAVE_PROMPT: "SAVE_PROMPT",
	DELETE_PROMPT: "DELETE_PROMPT",
	SET_DEFAULT_PROMPT: "SET_DEFAULT_PROMPT",
	GET_CONFIG: "GET_CONFIG",
	SAVE_CONFIG: "SAVE_CONFIG",
	DEBUG_LOG: "DEBUG_LOG",
	ENTER_SELECTION_MODE: "ENTER_SELECTION_MODE",
	ANALYZE_SELECTED_CONTENT: "ANALYZE_SELECTED_CONTENT",
	// Feedback System Messages
	SUBMIT_NUGGET_FEEDBACK: "SUBMIT_NUGGET_FEEDBACK",
	DELETE_NUGGET_FEEDBACK: "DELETE_NUGGET_FEEDBACK",
	ENTER_MISSING_CONTENT_MODE: "ENTER_MISSING_CONTENT_MODE",
	SUBMIT_MISSING_CONTENT_FEEDBACK: "SUBMIT_MISSING_CONTENT_FEEDBACK",
	GET_FEEDBACK_STATS: "GET_FEEDBACK_STATS",
	TRIGGER_OPTIMIZATION: "TRIGGER_OPTIMIZATION",
	GET_CURRENT_OPTIMIZED_PROMPT: "GET_CURRENT_OPTIMIZED_PROMPT",
	// Provider Management Messages
	SWITCH_PROVIDER: "SWITCH_PROVIDER",
	GET_AVAILABLE_PROVIDERS: "GET_AVAILABLE_PROVIDERS",
	GET_CURRENT_PROVIDER: "GET_CURRENT_PROVIDER",
	VALIDATE_PROVIDER: "VALIDATE_PROVIDER",
	// Rate Limiting and Retry Messages
	ANALYSIS_RATE_LIMITED: "ANALYSIS_RATE_LIMITED",
	ANALYSIS_RETRYING: "ANALYSIS_RETRYING",
	ABORT_ANALYSIS: "ABORT_ANALYSIS",
};
