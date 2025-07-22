import axios from 'axios';
import type { SystemHealth, PendingFeedback, OptimizationProgress, CostSummary, DashboardStats } from '@/types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:7532',
  timeout: 10000,
});

// API endpoints
export const apiClient = {
  // System Health
  getSystemHealth: (): Promise<SystemHealth> =>
    api.get('/monitor/health').then(res => res.data),

  // Dashboard Stats
  getDashboardStats: (): Promise<DashboardStats> =>
    api.get('/dashboard/stats').then(res => res.data),

  // Feedback Management
  getPendingFeedback: (params: {
    limit?: number;
    offset?: number;
    feedback_type?: string;
  } = {}): Promise<PendingFeedback> =>
    api.get('/feedback/pending', { params }).then(res => res.data),

  getRecentFeedback: (params: {
    limit?: number;
    include_processed?: boolean;
  } = {}): Promise<PendingFeedback> =>
    api.get('/feedback/recent', { params }).then(res => res.data),

  // Optimization Progress
  getOptimizationProgress: (runId: string): Promise<OptimizationProgress[]> =>
    api.get(`/optimization/${runId}/progress`).then(res => res.data),

  getRecentActivity: (params: { limit?: number } = {}): Promise<OptimizationProgress[]> =>
    api.get('/activity/recent', { params }).then(res => res.data),

  // Cost Analysis
  getOptimizationCosts: (runId: string): Promise<CostSummary> =>
    api.get(`/optimization/${runId}/costs`).then(res => res.data),

  getCostSummary: (params: { days?: number } = {}): Promise<CostSummary> =>
    api.get('/costs/summary', { params }).then(res => res.data),

  getCostTrends: (params: { days?: number } = {}): Promise<CostSummary> =>
    api.get('/costs/trends', { params }).then(res => res.data),
};

export default api;