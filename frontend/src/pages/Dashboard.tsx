import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { apiClient } from '@/lib/api';

export function Dashboard() {
  const { data: health, isLoading: healthLoading } = useQuery({
    queryKey: ['health'],
    queryFn: apiClient.getSystemHealth,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: apiClient.getDashboardStats,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const { data: recentActivity } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: () => apiClient.getRecentActivity({ limit: 5 }),
    refetchInterval: 5000,
  });

  if (healthLoading || statsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
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
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge variant="default" className="bg-green-100 text-green-800">Healthy</Badge>;
      case 'degraded':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Degraded</Badge>;
      case 'unhealthy':
        return <Badge variant="destructive">Unhealthy</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* System Health */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {getStatusBadge(health?.status || 'unknown')}
              <div className="text-2xl font-bold">
                {Math.floor((health?.uptime_seconds || 0) / 3600)}h uptime
              </div>
              <div className="text-xs text-gray-500">
                DSPy: {health?.dspy_available ? '✓' : '✗'} | 
                API: {health?.gemini_configured ? '✓' : '✗'} | 
                DB: {health?.database_accessible ? '✓' : '✗'}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Operations */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Operations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {health?.active_optimizations || 0}
              </div>
              <div className="text-xs text-gray-500">
                {health?.active_optimizations ? 'MIPROv2 Running' : 'No active operations'}
              </div>
              {health?.active_optimizations ? (
                <Progress value={67} className="h-2" />
              ) : null}
            </div>
          </CardContent>
        </Card>

        {/* Feedback Queue */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Feedback Queue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {(stats?.pending_nugget_feedback || 0) + (stats?.pending_missing_content_feedback || 0)}
              </div>
              <div className="text-xs text-gray-500 space-x-2">
                <span>👍 {stats?.pending_nugget_feedback || 0} nuggets</span>
                <span>✏️ {stats?.pending_missing_content_feedback || 0} missing</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <button className="w-full text-left text-sm bg-blue-50 hover:bg-blue-100 p-2 rounded">
                ▶️ Run Optimization
              </button>
              <button className="w-full text-left text-sm bg-gray-50 hover:bg-gray-100 p-2 rounded">
                📊 Export Data
              </button>
              <button className="w-full text-left text-sm bg-gray-50 hover:bg-gray-100 p-2 rounded">
                🔄 Refresh Status
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      {recentActivity && recentActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center space-x-3 text-sm">
                  <Badge variant="outline">{activity.step}</Badge>
                  <span className="flex-1">{activity.message}</span>
                  <span className="text-gray-500">{new Date(activity.timestamp).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Status Alert */}
      {health && health.status !== 'healthy' && (
        <Alert>
          <AlertDescription>
            System status is {health.status}. Some functionality may be limited.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}