// Golden nugget types
export type NuggetType = "tool" | "media" | "aha! moments" | "analogy" | "model"

// Provider types for multi-LLM support
export type ProviderId = "gemini" | "openai" | "anthropic" | "openrouter"

export interface ProviderInfo {
  id: ProviderId
  name: string
  models: string[]
}

export interface SystemHealth {
  status: "healthy" | "degraded" | "unhealthy"
  uptime_seconds: number
  active_optimizations: number
  dspy_available: boolean
  gemini_configured: boolean
  database_accessible: boolean
}

export interface PendingFeedback {
  items: FeedbackItem[]
  total_count: number
  has_more: boolean
}

export interface FeedbackItem {
  type: "nugget" | "missing_content"
  id: string
  content: string
  rating?: "positive" | "negative"
  processed: boolean
  usage_count: number
  created_at: string
  original_type?: string // Specific nugget type (tool, media, aha! moments, analogy, model)
  corrected_type?: string // User-corrected type if different from original
  suggested_type?: string // Suggested type for missing content feedback
  // Provider/model tracking for multi-provider support
  model_provider?: ProviderId // LLM provider used
  model_name?: string // Specific model used
}

export interface OptimizationProgress {
  step: string
  progress: number
  message: string
  timestamp: string
}

export interface CostSummary {
  total_cost: number
  total_tokens: number
  total_runs: number
  daily_breakdown: DailyCost[]
  costs_by_mode: Record<string, ModeCost>
  // Provider-specific cost breakdowns
  costs_by_provider?: Record<ProviderId, ModeCost>
  costs_by_model?: Record<string, ModeCost>
}

export interface DailyCost {
  date: string
  cost: number
  tokens: number
}

export interface ModeCost {
  cost: number
  tokens: number
  runs: number
}

export interface DashboardStats {
  pending_nugget_feedback: number
  pending_missing_feedback: number
  processed_nugget_feedback: number
  processed_missing_feedback: number
  active_optimizations: number
  completed_optimizations: number
  failed_optimizations: number
  monthly_costs: number
  monthly_tokens: number
  // Computed fields
  total_feedback_items?: number
  pending_missing_content_feedback?: number
}

export interface OptimizationRun {
  id: string
  status: "running" | "completed" | "failed"
  mode: string
  started_at: string
  completed_at?: string
  tokens_used: number
  api_cost: number
  feedback_items_processed: number
  success_rate?: number
  duration_seconds?: number
  // Provider/model tracking for multi-provider optimization
  model_provider?: ProviderId
  model_name?: string
}

export interface HistoricalPerformance {
  runs: OptimizationRun[]
  total_count: number
  has_more: boolean
  performance_trends: {
    avg_duration: number
    avg_cost: number
    avg_success_rate: number
    total_processed: number
  }
}

export interface ApiError {
  message: string
  status: number
  code: string
  retryable: boolean
}

// Provider filtering and analytics types
export interface ProviderFilter {
  providers?: ProviderId[]
  models?: string[]
  excludeProviders?: ProviderId[]
}

export interface ProviderStats {
  provider_id: ProviderId
  model_name: string
  feedback_count: number
  positive_rate: number
  avg_cost_per_feedback: number
  total_cost: number
  total_tokens: number
}

export interface ProviderComparison {
  providers: ProviderStats[]
  time_period_days: number
  last_updated: string
}
