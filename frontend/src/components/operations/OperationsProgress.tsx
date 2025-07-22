import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Activity, 
  Brain, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiClient } from '@/lib/api';
import type { OptimizationProgress, ApiError } from '@/types';

interface OperationsProgressProps {
  refreshInterval?: number;
  maxLogEntries?: number;
}

export function OperationsProgress({ 
  refreshInterval = 2000, 
  maxLogEntries = 20 
}: OperationsProgressProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [logEntries, setLogEntries] = useState<OptimizationProgress[]>([]);

  const {
    data: recentActivity,
    error,
    isLoading,
    isError,
  } = useQuery<OptimizationProgress[], ApiError>({
    queryKey: ['recent-activity'],
    queryFn: () => apiClient.getRecentActivity({ limit: maxLogEntries }),
    refetchInterval: refreshInterval,
    staleTime: 1000,
  });

  // Update log entries when new data arrives
  useEffect(() => {
    if (recentActivity) {
      // Ensure recentActivity is an array before setting it
      const activities = Array.isArray(recentActivity) ? recentActivity : [];
      setLogEntries(activities);
    }
  }, [recentActivity]);

  const getStepIcon = (_step: string, progress: number) => {
    if (progress >= 100) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    } else if (progress > 0) {
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    } else {
      return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  // Utility function for future use
  // const getProgressColor = (progress: number) => {
  //   if (progress >= 100) return 'bg-green-500';
  //   if (progress >= 75) return 'bg-blue-500';
  //   if (progress >= 50) return 'bg-yellow-500';
  //   if (progress >= 25) return 'bg-orange-500';
  //   return 'bg-gray-300';
  // };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const isActiveOperation = (entry: OptimizationProgress) => {
    return entry.progress > 0 && entry.progress < 100;
  };

  const safeLogEntries = Array.isArray(logEntries) ? logEntries : [];
  const activeOperations = safeLogEntries.filter(isActiveOperation);
  const completedOperations = safeLogEntries.filter(entry => entry.progress >= 100);
  const pendingOperations = safeLogEntries.filter(entry => entry.progress === 0);

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Operations Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load operations data: {error?.message}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            Operations Monitor
            <div className="flex gap-2">
              {activeOperations.length > 0 && (
                <Badge variant="default" className="bg-blue-500">
                  {activeOperations.length} Active
                </Badge>
              )}
              {completedOperations.length > 0 && (
                <Badge variant="outline" className="text-green-600">
                  {completedOperations.length} Complete
                </Badge>
              )}
            </div>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && logEntries.length === 0 ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse" />
                <div className="h-2 bg-gray-100 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : logEntries.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No recent operations</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Active Operations - Always visible */}
            {activeOperations.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  Active Operations ({activeOperations.length})
                </h4>
                <div className="space-y-3">
                  {activeOperations.map((entry, index) => (
                    <div key={`${entry.step}-${index}`} className="border rounded-lg p-3 bg-blue-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getStepIcon(entry.step, entry.progress)}
                          <span className="font-medium text-sm">{entry.step}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{entry.progress}%</Badge>
                          <span className="text-xs text-gray-500">
                            {formatTimestamp(entry.timestamp)}
                          </span>
                        </div>
                      </div>
                      
                      <Progress 
                        value={entry.progress} 
                        className="h-2 mb-2" 
                      />
                      
                      <p className="text-sm text-gray-600">{entry.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Expandable Recent Activity Log */}
            {isExpanded && (completedOperations.length > 0 || pendingOperations.length > 0) && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  Recent Activity
                </h4>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {[...completedOperations, ...pendingOperations]
                    .slice(0, maxLogEntries - activeOperations.length)
                    .map((entry, index) => (
                    <div 
                      key={`${entry.step}-${index}`} 
                      className={`flex items-center justify-between p-2 rounded-lg text-sm ${
                        entry.progress >= 100 
                          ? 'bg-green-50 border border-green-200' 
                          : 'bg-gray-50 border border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        {getStepIcon(entry.step, entry.progress)}
                        <span className="font-medium truncate">{entry.step}</span>
                        <span className="text-gray-500 text-xs truncate">
                          {entry.message}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant={entry.progress >= 100 ? "default" : "outline"}>
                          {entry.progress >= 100 ? 'Complete' : `${entry.progress}%`}
                        </Badge>
                        <span className="text-xs text-gray-400 w-16 text-right">
                          {formatTimestamp(entry.timestamp)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state when expanded but no operations */}
            {isExpanded && activeOperations.length === 0 && completedOperations.length === 0 && pendingOperations.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                <Clock className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No operations in progress</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}