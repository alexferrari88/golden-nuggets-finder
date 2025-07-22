import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, Layout, BarChart3, MessageSquare, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SystemHealthWidget } from '@/components/dashboard/SystemHealthWidget';
import { QuickActionsPanel } from '@/components/dashboard/QuickActionsPanel';
import { FeedbackQueueTable } from '@/components/feedback/FeedbackQueueTable';
import { OperationsProgress } from '@/components/operations/OperationsProgress';
import { apiClient } from '@/lib/api';
import type { DashboardStats, ApiError } from '@/types';

export function Dashboard() {
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState('overview');

  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useQuery<DashboardStats, ApiError>({
    queryKey: ['dashboard-stats'],
    queryFn: apiClient.getDashboardStats,
    refetchInterval: 10000,
    staleTime: 5000,
  });

  const handleActionComplete = (_action: string, success: boolean) => {
    if (success) {
      setLastUpdate(new Date());
    }
  };

  const totalPendingFeedback = (stats?.pending_nugget_feedback || 0) + 
                               (stats?.pending_missing_content_feedback || 0);

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">
            Monitor your Golden Nuggets optimization system
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-sm text-gray-500">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              window.location.reload();
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Overview Cards */}
      {statsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : statsError ? (
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load dashboard statistics: {statsError.message}
          </AlertDescription>
        </Alert>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Feedback Items */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Total Feedback
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_feedback_items}</div>
              <p className="text-xs text-gray-500">All feedback items</p>
            </CardContent>
          </Card>

          {/* Pending Queue */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Layout className="h-4 w-4" />
                Pending Queue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPendingFeedback}</div>
              <div className="text-xs text-gray-500 flex gap-2">
                <span>🟡 {stats.pending_nugget_feedback} nuggets</span>
                <span>🔴 {stats.pending_missing_content_feedback} missing</span>
              </div>
            </CardContent>
          </Card>

          {/* Active Operations */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Operations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active_optimizations}</div>
              <div className="flex items-center gap-2">
                <Badge variant={stats.active_optimizations > 0 ? "default" : "secondary"}>
                  {stats.active_optimizations > 0 ? 'Active' : 'Idle'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Queue Health */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Queue Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalPendingFeedback > 0 ? 
                  `${Math.round((stats.pending_nugget_feedback / totalPendingFeedback) * 100)}%` : 
                  '100%'
                }
              </div>
              <p className="text-xs text-gray-500">Quality ratio</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Main Dashboard Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="queue">Feedback Queue</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* System Health - Takes 2/3 width */}
            <div className="lg:col-span-2">
              <SystemHealthWidget refreshInterval={5000} />
            </div>
            
            {/* Quick Actions - Takes 1/3 width */}
            <div className="lg:col-span-1">
              <QuickActionsPanel onActionComplete={handleActionComplete} />
            </div>
          </div>

          {/* Operations Progress - Full width */}
          <OperationsProgress refreshInterval={3000} maxLogEntries={10} />
        </TabsContent>

        <TabsContent value="queue" className="space-y-6">
          <FeedbackQueueTable refreshInterval={8000} pageSize={25} />
        </TabsContent>

        <TabsContent value="operations" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <OperationsProgress refreshInterval={2000} maxLogEntries={20} />
            </div>
            <div className="lg:col-span-1 space-y-6">
              <SystemHealthWidget refreshInterval={3000} />
              <QuickActionsPanel onActionComplete={handleActionComplete} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Cost Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Cost analytics coming in Phase 4</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Performance Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Performance charts coming in Phase 4</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}