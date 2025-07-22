export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime_seconds: number;
  active_optimizations: number;
  dspy_available: boolean;
  gemini_configured: boolean;
  database_accessible: boolean;
}

export interface PendingFeedback {
  items: FeedbackItem[];
  total_count: number;
  has_more: boolean;
}

export interface FeedbackItem {
  type: 'nugget' | 'missing_content';
  id: string;
  content: string;
  rating?: 'positive' | 'negative';
  processed: boolean;
  usage_count: number;
  created_at: string;
}

export interface OptimizationProgress {
  step: string;
  progress: number;
  message: string;
  timestamp: string;
}

export interface CostSummary {
  total_cost: number;
  total_tokens: number;
  total_runs: number;
  daily_breakdown: DailyCost[];
  costs_by_mode: Record<string, ModeCost>;
}

export interface DailyCost {
  date: string;
  cost: number;
  tokens: number;
}

export interface ModeCost {
  cost: number;
  tokens: number;
  runs: number;
}

export interface DashboardStats {
  pending_nugget_feedback: number;
  pending_missing_content_feedback: number;
  active_optimizations: number;
  total_feedback_items: number;
}

export interface ApiError {
  message: string;
  status: number;
  code: string;
  retryable: boolean;
}