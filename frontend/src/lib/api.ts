import axios, { type AxiosError, type AxiosRequestConfig } from "axios";
import type {
	ApiError,
	ChromeExtensionPrompt,
	CostBreakdown,
	CostSummary,
	DashboardStats,
	DetailedProgress,
	DuplicateAnalysisReport,
	EnsembleConfiguration,
	EnhancedOptimizationRun,
	EnhancedSystemHealth,
	FeedbackSession,
	FeedbackUsageStats,
	NuggetType,
	OptimizationProgress,
	PendingFeedback,
	ProgressActivity,
	PromptOptimizationMapping,
	ProviderId,
	SystemHealth,
} from "@/types";

// Create axios instance with enhanced configuration
const api = axios.create({
	baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:7532",
	timeout: 15000, // Increased timeout
	headers: {
		"Content-Type": "application/json",
	},
});

// Error handling utilities
const getErrorCode = (status: number): string => {
	if (status >= 500) return "SERVER_ERROR";
	if (status === 429) return "RATE_LIMITED";
	if (status === 404) return "NOT_FOUND";
	if (status === 401) return "UNAUTHORIZED";
	if (status === 403) return "FORBIDDEN";
	return "CLIENT_ERROR";
};

const handleApiError = (error: AxiosError): ApiError => {
	if (!error.response) {
		return {
			message: "Network error - check if backend is running",
			status: 0,
			code: "NETWORK_ERROR",
			retryable: true,
		};
	}

	const status = error.response.status;
	const message =
		(error.response.data as { message?: string })?.message || error.message;

	return {
		message,
		status,
		code: getErrorCode(status),
		retryable: status >= 500 || status === 429,
	};
};

// Retry utility for failed requests
const withRetry = async <T>(
	requestFn: () => Promise<T>,
	maxRetries: number = 2,
	backoffMs: number = 1000,
): Promise<T> => {
	let lastError: ApiError;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			return await requestFn();
		} catch (error) {
			const apiError = handleApiError(error as AxiosError);
			lastError = apiError;

			// Don't retry if not retryable or on last attempt
			if (!apiError.retryable || attempt === maxRetries) {
				throw apiError;
			}

			// Exponential backoff
			const delay = backoffMs * 2 ** attempt;
			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}

	throw lastError!;
};

// Enhanced request wrapper
const makeRequest = async <T>(config: AxiosRequestConfig): Promise<T> => {
	return withRetry(async () => {
		const response = await api.request<T>(config);
		return response.data;
	});
};

// Enhanced API client with error handling and retry logic
export const apiClient = {
	// System Health - Critical for dashboard status
	getSystemHealth: (): Promise<SystemHealth> =>
		makeRequest<SystemHealth>({
			method: "GET",
			url: "/monitor/health",
		}),

	// Dashboard Stats - Main dashboard data
	getDashboardStats: (): Promise<DashboardStats> =>
		makeRequest<DashboardStats>({
			method: "GET",
			url: "/dashboard/stats",
		}),

	// Feedback Management - Queue operations
	getPendingFeedback: (
		params: {
			limit?: number;
			offset?: number;
			feedback_type?: string;
			// Provider filtering support
			provider?: ProviderId;
			model?: string;
			providers?: ProviderId[];
		} = {},
	): Promise<PendingFeedback> =>
		makeRequest<PendingFeedback>({
			method: "GET",
			url: "/feedback/pending",
			params,
		}),

	getRecentFeedback: (
		params: {
			limit?: number;
			include_processed?: boolean;
			// Provider filtering support
			provider?: ProviderId;
			model?: string;
			providers?: ProviderId[];
		} = {},
	): Promise<PendingFeedback> =>
		makeRequest<PendingFeedback>({
			method: "GET",
			url: "/feedback/recent",
			params,
		}),

	getFeedbackDetails: (
		feedbackId: string,
		feedbackType: "nugget" | "missing_content" = "nugget",
	) =>
		makeRequest({
			method: "GET",
			url: `/feedback/${feedbackId}`,
			params: { feedback_type: feedbackType },
		}),

	getFeedbackUsageStats: () =>
		makeRequest({
			method: "GET",
			url: "/feedback/usage/stats",
		}),

	// Feedback Item Management - Edit/Delete operations
	updateFeedbackItem: (
		id: string,
		feedbackType: "nugget" | "missing_content",
		updates: {
			content?: string;
			rating?: "positive" | "negative" | null;
			corrected_type?: NuggetType | null;
			suggested_type?: NuggetType | null;
		},
	) =>
		makeRequest({
			method: "PUT",
			url: `/feedback/${id}`,
			params: { feedback_type: feedbackType },
			data: updates,
		}),

	deleteFeedbackItem: (
		id: string,
		feedbackType: "nugget" | "missing_content",
	) =>
		makeRequest({
			method: "DELETE",
			url: `/feedback/${id}`,
			params: { feedback_type: feedbackType },
		}),

	bulkDeleteFeedbackItems: async (
		items: Array<{ id: string; feedbackType: "nugget" | "missing_content" }>,
	) => {
		// Use individual delete calls since bulk endpoint doesn't exist yet
		const deletePromises = items.map((item) =>
			makeRequest({
				method: "DELETE",
				url: `/feedback/${item.id}`,
				params: { feedback_type: item.feedbackType },
			}),
		);

		const results = await Promise.allSettled(deletePromises);

		// Check if any failed
		const failures = results.filter((result) => result.status === "rejected");
		if (failures.length > 0) {
			throw new Error(
				`Failed to delete ${failures.length} of ${items.length} items`,
			);
		}

		return { success: true, deleted: items.length };
	},

	// Legacy Optimization Progress - Live tracking
	getOptimizationProgressLegacy: (runId: string): Promise<OptimizationProgress[]> =>
		makeRequest<OptimizationProgress[]>({
			method: "GET",
			url: `/optimization/${runId}/progress`,
		}),

	getRecentActivityLegacy: (
		params: { limit?: number } = {},
	): Promise<OptimizationProgress[]> =>
		makeRequest<{ activities: OptimizationProgress[]; count: number }>({
			method: "GET",
			url: "/activity/recent",
			params,
		}).then((response) => response.activities),

	// Cost Analysis - Financial tracking (Legacy)
	getOptimizationCostsLegacy: (runId: string): Promise<CostSummary> =>
		makeRequest<CostSummary>({
			method: "GET",
			url: `/optimization/${runId}/costs`,
		}),

	getCostSummary: (
		params: {
			days?: number;
			// Provider filtering support
			provider?: ProviderId;
			model?: string;
			providers?: ProviderId[];
		} = {},
	): Promise<CostSummary> =>
		makeRequest<CostSummary>({
			method: "GET",
			url: "/costs/summary",
			params,
		}),

	getCostTrends: (
		params: {
			days?: number;
			// Provider filtering support
			provider?: ProviderId;
			model?: string;
			providers?: ProviderId[];
		} = {},
	): Promise<CostSummary> =>
		makeRequest<CostSummary>({
			method: "GET",
			url: "/costs/trends",
			params,
		}),

	// Manual Actions - Quick controls
	triggerOptimization: (params?: { force?: boolean }) =>
		makeRequest({
			method: "POST",
			url: "/optimization/trigger",
			data: params,
		}),

	exportData: (format: "csv" | "json", dataType: string) =>
		makeRequest({
			method: "GET",
			url: `/export/${dataType}`,
			params: { format },
			responseType: "blob",
		}),

	// Provider-specific API methods for multi-provider analytics
	getProviderStats: (
		params: { days?: number; providers?: ProviderId[] } = {},
	) =>
		makeRequest({
			method: "GET",
			url: "/providers/stats",
			params,
		}),

	getProviderComparison: (
		params: { days?: number; providers?: ProviderId[] } = {},
	) =>
		makeRequest({
			method: "GET",
			url: "/providers/comparison",
			params,
		}),

	// Chrome Extension Prompt Management
	getChromePrompts: (): Promise<ChromeExtensionPrompt[]> =>
		makeRequest<ChromeExtensionPrompt[]>({
			method: "GET",
			url: "/chrome-prompts",
		}),

	createChromePrompt: (prompt: {
		prompt_name: string;
		full_prompt_content: string;
	}): Promise<ChromeExtensionPrompt> =>
		makeRequest<ChromeExtensionPrompt>({
			method: "POST",
			url: "/chrome-prompts",
			data: prompt,
		}),

	optimizeChromePrompt: (
		promptId: string,
		config: EnsembleConfiguration,
	): Promise<EnhancedOptimizationRun> =>
		makeRequest<EnhancedOptimizationRun>({
			method: "POST",
			url: `/optimize/chrome-prompt/${promptId}`,
			data: config,
		}),

	// Enhanced Progress and Cost Tracking
	getOptimizationProgress: (runId: string): Promise<DetailedProgress> =>
		makeRequest<DetailedProgress>({
			method: "GET",
			url: `/optimization/${runId}/progress`,
		}),

	getOptimizationCosts: (runId: string): Promise<CostBreakdown> =>
		makeRequest<CostBreakdown>({
			method: "GET",
			url: `/optimization/${runId}/costs`,
		}),

	// Enhanced System Health with Provider Details
	getEnhancedSystemHealth: (): Promise<EnhancedSystemHealth> =>
		makeRequest<EnhancedSystemHealth>({
			method: "GET",
			url: "/monitor/health/enhanced",
		}),

	// Session-Based Feedback Management
	getFeedbackSessions: (): Promise<FeedbackSession[]> =>
		makeRequest<FeedbackSession[]>({
			method: "GET",
			url: "/feedback/sessions",
		}),

	getFeedbackBySession: (sessionId: string): Promise<PendingFeedback> =>
		makeRequest<PendingFeedback>({
			method: "GET",
			url: `/feedback/sessions/${sessionId}`,
		}),

	// Duplicate Analysis
	getDuplicateFeedback: (): Promise<DuplicateAnalysisReport> =>
		makeRequest<DuplicateAnalysisReport>({
			method: "GET",
			url: "/feedback/duplicates",
		}),

	// Enhanced Feedback Usage Statistics
	getEnhancedFeedbackUsageStats: (): Promise<FeedbackUsageStats> =>
		makeRequest<FeedbackUsageStats>({
			method: "GET",
			url: "/feedback/usage/stats/enhanced",
		}),

	// Recent Activity Timeline
	getRecentActivity: (): Promise<ProgressActivity[]> =>
		makeRequest<ProgressActivity[]>({
			method: "GET",
			url: "/activity/recent",
		}),

	// Chrome Extension Health and Usage
	getChromeExtensionHealth: () =>
		makeRequest({
			method: "GET",
			url: "/chrome-extension/health",
		}),

	getChromeExtensionUsageStats: () =>
		makeRequest({
			method: "GET",
			url: "/chrome-extension/usage/stats",
		}),

	// Optimization Mapping
	getOptimizationMappings: (): Promise<PromptOptimizationMapping[]> =>
		makeRequest<PromptOptimizationMapping[]>({
			method: "GET",
			url: "/optimization/mappings",
		}),

	getOptimizationRun: (runId: string): Promise<EnhancedOptimizationRun> =>
		makeRequest<EnhancedOptimizationRun>({
			method: "GET",
			url: `/optimization/${runId}`,
		}),

	// Ensemble Configuration Management
	getEnsembleConfiguration: (): Promise<EnsembleConfiguration> =>
		makeRequest<EnsembleConfiguration>({
			method: "GET",
			url: "/ensemble/configuration",
		}),

	updateEnsembleConfiguration: (
		config: EnsembleConfiguration,
	): Promise<EnsembleConfiguration> =>
		makeRequest<EnsembleConfiguration>({
			method: "PUT",
			url: "/ensemble/configuration",
			data: config,
		}),

	// Available Providers for Ensemble Mode
	getAvailableProviders: () =>
		makeRequest<
			Array<{
				id: ProviderId;
				name: string;
				model: string;
				healthy: boolean;
				status: string;
			}>
		>({
			method: "GET",
			url: "/providers/available",
		}),

	// Active Optimization Runs
	getActiveOptimizationRuns: (): Promise<EnhancedOptimizationRun[]> =>
		makeRequest<EnhancedOptimizationRun[]>({
			method: "GET",
			url: "/optimization/active",
		}),

	// Enhanced Cost Summary with DSPy Accuracy
	getEnhancedCostSummary: () =>
		makeRequest({
			method: "GET",
			url: "/costs/summary/enhanced",
		}),

	getProviderCostBreakdown: () =>
		makeRequest({
			method: "GET",
			url: "/costs/providers/breakdown",
		}),
};

// Utility functions for common patterns
export const apiUtils = {
	// Format uptime seconds to human readable
	formatUptime: (seconds: number): string => {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);

		if (hours > 0) {
			return `${hours}h ${minutes}m`;
		}
		return `${minutes}m`;
	},

	// Get status color for UI
	getStatusColor: (status: SystemHealth["status"]): string => {
		switch (status) {
			case "healthy":
				return "text-green-600";
			case "degraded":
				return "text-yellow-600";
			case "unhealthy":
				return "text-red-600";
			default:
				return "text-gray-600";
		}
	},

	// Get status icon
	getStatusIcon: (status: SystemHealth["status"]): string => {
		switch (status) {
			case "healthy":
				return "🟢";
			case "degraded":
				return "🟡";
			case "unhealthy":
				return "🔴";
			default:
				return "⚫";
		}
	},

	// Provider utility functions
	getProviderDisplayName: (providerId: ProviderId): string => {
		switch (providerId) {
			case "gemini":
				return "Google Gemini";
			case "openai":
				return "OpenAI";
			case "anthropic":
				return "Anthropic Claude";
			case "openrouter":
				return "OpenRouter";
			default:
				return providerId;
		}
	},

	getProviderIcon: (providerId: ProviderId): string => {
		switch (providerId) {
			case "gemini":
				return "🟦";
			case "openai":
				return "🟢";
			case "anthropic":
				return "🟠";
			case "openrouter":
				return "🔀";
			default:
				return "⚪";
		}
	},

	formatModelName: (modelName: string): string => {
		// Simplify long model names for display
		const mapping: Record<string, string> = {
			"gemini-2.5-flash": "Gemini 2.5 Flash",
			"gpt-4o-mini": "GPT-4o Mini",
			"gpt-4o": "GPT-4o",
			"claude-3-sonnet": "Claude 3 Sonnet",
			"claude-3-haiku": "Claude 3 Haiku",
		};
		return mapping[modelName] || modelName;
	},
};

// Export error handling functions for component usage
export { handleApiError, withRetry };
export default api;
