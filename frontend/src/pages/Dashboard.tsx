import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, Layout, BarChart3, MessageSquare, Settings } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Alert, AlertDescription } from '../components/ui/alert';
import { ResponsiveContainer, ResponsiveStack } from '../components/layout/ResponsiveContainer';
import { SystemHealthWidget } from '../components/dashboard/SystemHealthWidget';
import { QuickActionsPanel } from '../components/dashboard/QuickActionsPanel';
import { FeedbackQueueTable } from '../components/feedback/FeedbackQueueTable';
import { OperationsProgress } from '../components/operations/OperationsProgress';
import { CostAnalytics } from '../components/analytics/CostAnalytics';
import { HistoricalViews } from '../components/analytics/HistoricalViews';
import { apiClient } from '../lib/api';
import type { DashboardStats, ApiError } from '../types';

export function Dashboard() {
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState('overview');

  const {
    data: rawStats,
    isLoading: statsLoading,
    error: statsError,
  } = useQuery<DashboardStats, ApiError>({
    queryKey: ['dashboard-stats'],
    queryFn: () => apiClient.getDashboardStats(),
    refetchInterval: 10000,
    staleTime: 5000,
  });

  const handleActionComplete = (_action: string, success: boolean) => {
    if (success) {
      setLastUpdate(new Date());
    }
  };

  // Compute derived fields to maintain compatibility
  const stats = rawStats ? {
    ...rawStats,
    total_feedback_items: (rawStats.pending_nugget_feedback || 0) + 
                          (rawStats.pending_missing_feedback || 0) +
                          (rawStats.processed_nugget_feedback || 0) +
                          (rawStats.processed_missing_feedback || 0),
    pending_missing_content_feedback: rawStats.pending_missing_feedback
  } : null;

  const totalPendingFeedback = (stats?.pending_nugget_feedback || 0) + 
                               (stats?.pending_missing_feedback || 0);

  return (
    <ResponsiveContainer maxWidth="full" className="min-h-screen">
      {/* Dashboard Header */}
      <ResponsiveStack direction="horizontal-on-desktop" className="mb-6">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">
            Monitor your Golden Nuggets optimization system
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
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
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </ResponsiveStack>

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
        stats.total_feedback_items === 0 && stats.active_optimizations === 0 ? (
          <Alert>
            <AlertDescription className="text-center py-4">
              No data available. The database appears to be empty. Start using the Golden Nuggets extension to generate feedback data.
            </AlertDescription>
          </Alert>
        ) : (
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
                <span>🔴 {stats.pending_missing_feedback} missing</span>
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
        )
      ) : null}

      {/* Main Dashboard Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
          <TabsTrigger value="overview" className="text-xs sm:text-sm px-2 py-2">
            <span className="hidden sm:inline">Overview</span>
            <span className="sm:hidden">📊</span>
          </TabsTrigger>
          <TabsTrigger value="queue" className="text-xs sm:text-sm px-2 py-2">
            <span className="hidden sm:inline">Feedback Queue</span>
            <span className="sm:hidden">📥</span>
          </TabsTrigger>
          <TabsTrigger value="operations" className="text-xs sm:text-sm px-2 py-2">
            <span className="hidden sm:inline">Operations</span>
            <span className="sm:hidden">⚡</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs sm:text-sm px-2 py-2">
            <span className="hidden sm:inline">Analytics</span>
            <span className="sm:hidden">📈</span>
          </TabsTrigger>
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
          <Tabs defaultValue="costs" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="costs">Cost Analytics</TabsTrigger>
              <TabsTrigger value="historical">Historical Performance</TabsTrigger>
            </TabsList>
            
            <TabsContent value="costs">
              <CostAnalytics days={30} />
            </TabsContent>
            
            <TabsContent value="historical">
              <HistoricalViews limit={100} />
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </ResponsiveContainer>
  );
}