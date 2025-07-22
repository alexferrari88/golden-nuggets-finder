import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  ScatterChart,
  Scatter,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Clock, CheckCircle, XCircle, PlayCircle, TrendingUp, BarChart3, Database } from 'lucide-react';
import api from '../../lib/api';
import type { OptimizationRun, HistoricalPerformance } from '../../types';

interface HistoricalViewsProps {
  limit?: number;
}

export const HistoricalViews: React.FC<HistoricalViewsProps> = ({ limit = 50 }) => {
  const [selectedMode, setSelectedMode] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<number>(30);
  const [viewType, setViewType] = useState<'table' | 'timeline' | 'performance'>('table');

  const {
    data: historicalData,
    isLoading,
    error,
  } = useQuery<HistoricalPerformance>({
    queryKey: ['historicalPerformance', selectedMode, timeRange, limit],
    queryFn: () => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        days: timeRange.toString(),
      });
      if (selectedMode !== 'all') {
        params.append('mode', selectedMode);
      }
      return api.get(`/optimization/history?${params}`).then(res => res.data);
    },
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert>
        <AlertDescription>
          Failed to load historical data. Please try refreshing.
        </AlertDescription>
      </Alert>
    );
  }

  if (!historicalData) return null;

  // Check if there's no historical data
  if (historicalData.runs.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-semibold mb-2">Historical Performance</h2>
            <p className="text-gray-600">
              Past optimization runs and performance analysis
            </p>
          </div>
        </div>
        <div className="text-center py-12 text-gray-500">
          <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <p className="text-lg mb-2">No historical data available</p>
          <p className="text-sm">Performance history will appear here after optimization runs complete.</p>
        </div>
      </div>
    );
  }

  const getStatusIcon = (status: OptimizationRun['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <PlayCircle className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadgeVariant = (status: OptimizationRun['status']) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'failed':
        return 'destructive';
      case 'running':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600 * 10) / 10}h`;
  };

  const timelineData = historicalData.runs.map(run => ({
    ...run,
    date: new Date(run.started_at).toLocaleDateString(),
    success_rate_percent: (run.success_rate || 0) * 100,
    cost_per_item: run.feedback_items_processed > 0 
      ? run.api_cost / run.feedback_items_processed 
      : 0,
  }));

  const performanceData = historicalData.runs
    .filter(run => run.duration_seconds && run.success_rate)
    .map(run => ({
      duration: run.duration_seconds!,
      success_rate: (run.success_rate! * 100),
      cost: run.api_cost,
      items: run.feedback_items_processed,
      mode: run.mode,
    }));

  const uniqueModes = Array.from(new Set(historicalData.runs.map(run => run.mode)));

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Historical Performance</h2>
          <p className="text-gray-600">
            Past optimization runs and performance analysis
          </p>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <Select value={selectedMode} onValueChange={setSelectedMode}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modes</SelectItem>
              {uniqueModes.map(mode => (
                <SelectItem key={mode} value={mode}>
                  {mode.toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={timeRange.toString()} onValueChange={(value) => setTimeRange(Number(value))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex border rounded-lg">
            <Button
              variant={viewType === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewType('table')}
            >
              Table
            </Button>
            <Button
              variant={viewType === 'timeline' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewType('timeline')}
            >
              Timeline
            </Button>
            <Button
              variant={viewType === 'performance' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewType('performance')}
            >
              Performance
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(historicalData.performance_trends.avg_duration)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Cost</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${historicalData.performance_trends.avg_cost.toFixed(4)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Success Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(historicalData.performance_trends.avg_success_rate * 100).toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Processed</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {historicalData.performance_trends.total_processed.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Feedback items
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Based on View Type */}
      {viewType === 'table' && (
        <Card>
          <CardHeader>
            <CardTitle>Optimization Runs</CardTitle>
            <CardDescription>
              Detailed view of recent optimization runs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Success Rate</TableHead>
                    <TableHead>Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historicalData.runs.map((run) => (
                    <TableRow key={run.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(run.status)}
                          <Badge variant={getStatusBadgeVariant(run.status)}>
                            {run.status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {run.mode.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(run.started_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {formatDuration(run.duration_seconds)}
                      </TableCell>
                      <TableCell>
                        {run.feedback_items_processed}
                      </TableCell>
                      <TableCell>
                        {run.success_rate 
                          ? `${(run.success_rate * 100).toFixed(1)}%` 
                          : 'N/A'
                        }
                      </TableCell>
                      <TableCell>
                        ${run.api_cost.toFixed(4)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {viewType === 'timeline' && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Success Rate Timeline</CardTitle>
              <CardDescription>
                Success rate trends over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value: any) => [`${value.toFixed(1)}%`, 'Success Rate']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="success_rate_percent" 
                    stroke="#8884d8" 
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cost per Item Timeline</CardTitle>
              <CardDescription>
                Efficiency trends over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value: any) => [`$${value.toFixed(5)}`, 'Cost per Item']}
                  />
                  <Bar dataKey="cost_per_item" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {viewType === 'performance' && (
        <Card>
          <CardHeader>
            <CardTitle>Performance Analysis</CardTitle>
            <CardDescription>
              Relationship between duration, success rate, and cost
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <ScatterChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="duration" 
                  name="Duration (seconds)"
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  dataKey="success_rate" 
                  name="Success Rate (%)"
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  formatter={(value: any, name: string) => {
                    if (name === 'cost') return [`$${value.toFixed(4)}`, 'Cost'];
                    if (name === 'items') return [value, 'Items Processed'];
                    return [value, name];
                  }}
                  labelFormatter={() => ''}
                />
                <Scatter 
                  dataKey="success_rate" 
                  fill="#8884d8"
                />
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};