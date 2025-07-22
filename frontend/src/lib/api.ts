import axios, { AxiosError, type AxiosRequestConfig } from 'axios';
import type { 
  SystemHealth, 
  PendingFeedback, 
  OptimizationProgress, 
  CostSummary, 
  DashboardStats,
  ApiError
} from '@/types';

// Create axios instance with enhanced configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:7532',
  timeout: 15000, // Increased timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Error handling utilities
class ApiErrorHandler {
  static handleError(error: AxiosError): ApiError {
    if (!error.response) {
      return {
        message: 'Network error - check if backend is running',
        status: 0,
        code: 'NETWORK_ERROR',
        retryable: true,
      };
    }

    const status = error.response.status;
    const message = (error.response.data as { message?: string })?.message || error.message;

    return {
      message,
      status,
      code: this.getErrorCode(status),
      retryable: status >= 500 || status === 429,
    };
  }

  private static getErrorCode(status: number): string {
    if (status >= 500) return 'SERVER_ERROR';
    if (status === 429) return 'RATE_LIMITED';
    if (status === 404) return 'NOT_FOUND';
    if (status === 401) return 'UNAUTHORIZED';
    if (status === 403) return 'FORBIDDEN';
    return 'CLIENT_ERROR';
  }
}

// Retry utility for failed requests
class RetryHandler {
  static async withRetry<T>(
    requestFn: () => Promise<T>,
    maxRetries: number = 2,
    backoffMs: number = 1000
  ): Promise<T> {
    let lastError: ApiError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        const apiError = ApiErrorHandler.handleError(error as AxiosError);
        lastError = apiError;
        
        // Don't retry if not retryable or on last attempt
        if (!apiError.retryable || attempt === maxRetries) {
          throw apiError;
        }
        
        // Exponential backoff
        const delay = backoffMs * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }
}

// Enhanced request wrapper
const makeRequest = async <T>(config: AxiosRequestConfig): Promise<T> => {
  return RetryHandler.withRetry(async () => {
    const response = await api.request<T>(config);
    return response.data;
  });
};

// Enhanced API client with error handling and retry logic
export const apiClient = {
  // System Health - Critical for dashboard status
  getSystemHealth: (): Promise<SystemHealth> =>
    makeRequest<SystemHealth>({
      method: 'GET',
      url: '/monitor/health',
    }),

  // Dashboard Stats - Main dashboard data
  getDashboardStats: (): Promise<DashboardStats> =>
    makeRequest<DashboardStats>({
      method: 'GET', 
      url: '/dashboard/stats',
    }),

  // Feedback Management - Queue operations
  getPendingFeedback: (params: {
    limit?: number;
    offset?: number;
    feedback_type?: string;
  } = {}): Promise<PendingFeedback> =>
    makeRequest<PendingFeedback>({
      method: 'GET',
      url: '/feedback/pending',
      params,
    }),

  getRecentFeedback: (params: {
    limit?: number;
    include_processed?: boolean;
  } = {}): Promise<PendingFeedback> =>
    makeRequest<PendingFeedback>({
      method: 'GET',
      url: '/feedback/recent', 
      params,
    }),

  getFeedbackDetails: (feedbackId: string, feedbackType: 'nugget' | 'missing_content' = 'nugget') =>
    makeRequest({
      method: 'GET',
      url: `/feedback/${feedbackId}`,
      params: { feedback_type: feedbackType },
    }),

  getFeedbackUsageStats: () =>
    makeRequest({
      method: 'GET',
      url: '/feedback/usage/stats',
    }),

  // Feedback Item Management - Edit/Delete operations
  updateFeedbackItem: (id: string, feedbackType: 'nugget' | 'missing_content', updates: { content?: string; rating?: 'positive' | 'negative' | null }) =>
    makeRequest({
      method: 'PUT',
      url: `/feedback/${id}`,
      params: { feedback_type: feedbackType },
      data: updates,
    }),

  deleteFeedbackItem: (id: string, feedbackType: 'nugget' | 'missing_content') =>
    makeRequest({
      method: 'DELETE',
      url: `/feedback/${id}`,
      params: { feedback_type: feedbackType },
    }),

  // Optimization Progress - Live tracking
  getOptimizationProgress: (runId: string): Promise<OptimizationProgress[]> =>
    makeRequest<OptimizationProgress[]>({
      method: 'GET',
      url: `/optimization/${runId}/progress`,
    }),

  getRecentActivity: (params: { limit?: number } = {}): Promise<OptimizationProgress[]> =>
    makeRequest<{ activities: OptimizationProgress[]; count: number }>({
      method: 'GET',
      url: '/activity/recent',
      params,
    }).then(response => response.activities),

  // Cost Analysis - Financial tracking  
  getOptimizationCosts: (runId: string): Promise<CostSummary> =>
    makeRequest<CostSummary>({
      method: 'GET',
      url: `/optimization/${runId}/costs`,
    }),

  getCostSummary: (params: { days?: number } = {}): Promise<CostSummary> =>
    makeRequest<CostSummary>({
      method: 'GET',
      url: '/costs/summary',
      params,
    }),

  getCostTrends: (params: { days?: number } = {}): Promise<CostSummary> =>
    makeRequest<CostSummary>({
      method: 'GET',
      url: '/costs/trends',
      params,
    }),

  // Manual Actions - Quick controls
  triggerOptimization: (params?: { force?: boolean }) =>
    makeRequest({
      method: 'POST',
      url: '/optimization/trigger',
      data: params,
    }),

  exportData: (format: 'csv' | 'json', dataType: string) =>
    makeRequest({
      method: 'GET',
      url: `/export/${dataType}`,
      params: { format },
      responseType: 'blob',
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
  getStatusColor: (status: SystemHealth['status']): string => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'degraded': return 'text-yellow-600';
      case 'unhealthy': return 'text-red-600';
      default: return 'text-gray-600';
    }
  },

  // Get status icon
  getStatusIcon: (status: SystemHealth['status']): string => {
    switch (status) {
      case 'healthy': return '🟢';
      case 'degraded': return '🟡';
      case 'unhealthy': return '🔴';
      default: return '⚫';
    }
  },
};

// Export error types for component usage
export { ApiErrorHandler, RetryHandler };
export default api;