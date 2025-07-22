import { useQuery } from '@tanstack/react-query';
import { Clock, Database, Brain, Key, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiClient, apiUtils } from '@/lib/api';
import type { SystemHealth, ApiError } from '@/types';

interface SystemHealthWidgetProps {
  refreshInterval?: number;
}

export function SystemHealthWidget({ refreshInterval = 5000 }: SystemHealthWidgetProps) {
  const {
    data: health,
    error,
    isLoading,
    isError,
  } = useQuery<SystemHealth, ApiError>({
    queryKey: ['system-health'],
    queryFn: apiClient.getSystemHealth,
    refetchInterval: refreshInterval,
    staleTime: 2000, // Consider data stale after 2 seconds
    gcTime: 10000, // Keep in cache for 10 seconds
    retry: (failureCount, error) => {
      // Only retry for retryable errors, max 3 attempts
      return error?.retryable && failureCount < 3;
    },
  });

  const getStatusBadgeVariant = (status: SystemHealth['status']) => {
    switch (status) {
      case 'healthy':
        return 'default'; // Green
      case 'degraded':
        return 'secondary'; // Yellow
      case 'unhealthy':
        return 'destructive'; // Red
      default:
        return 'outline';
    }
  };

  const getStatusIcon = (status: SystemHealth['status']) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4" />;
      case 'degraded':
        return <AlertCircle className="h-4 w-4" />;
      case 'unhealthy':
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            System Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to fetch system status: {error?.message || 'Unknown error'}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            {health && getStatusIcon(health.status)}
            System Health
          </span>
          {health && (
            <Badge variant={getStatusBadgeVariant(health.status)}>
              {health.status.charAt(0).toUpperCase() + health.status.slice(1)}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
          </div>
        ) : health ? (
          <div className="space-y-3">
            {/* Uptime */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Uptime</span>
              </div>
              <span className="text-sm text-gray-600">
                {apiUtils.formatUptime(health.uptime_seconds)}
              </span>
            </div>

            {/* Active Optimizations */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">Active Operations</span>
              </div>
              <Badge variant={health.active_optimizations > 0 ? 'default' : 'secondary'}>
                {health.active_optimizations}
              </Badge>
            </div>

            {/* Component Status */}
            <div className="border-t pt-3 space-y-2">
              <h4 className="text-sm font-semibold text-gray-700">Components</h4>
              
              <div className="grid grid-cols-1 gap-2">
                {/* Database */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="h-3 w-3" />
                    <span className="text-xs">Database</span>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${
                    health.database_accessible ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                </div>

                {/* DSPy */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain className="h-3 w-3" />
                    <span className="text-xs">DSPy</span>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${
                    health.dspy_available ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                </div>

                {/* Gemini API */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key className="h-3 w-3" />
                    <span className="text-xs">Gemini API</span>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${
                    health.gemini_configured ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}