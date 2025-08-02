import { useQuery } from "@tanstack/react-query"
import {
  Activity,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { apiClient, apiUtils } from "../../lib/api"
import type { CostSummary } from "../../types"
import { Alert, AlertDescription } from "../ui/alert"
import { Badge } from "../ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card"

interface CostAnalyticsProps {
  days?: number
}

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#00ff7f"]

export const CostAnalytics: React.FC<CostAnalyticsProps> = ({ days = 30 }) => {
  const {
    data: costSummary,
    isLoading,
    error,
  } = useQuery<CostSummary>({
    queryKey: ["costSummary", days],
    queryFn: () => apiClient.getCostSummary({ days }),
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  const { isLoading: trendsLoading } = useQuery({
    queryKey: ["costTrends", days],
    queryFn: () => apiClient.getCostTrends({ days }),
    refetchInterval: 30000,
  })

  if (isLoading || trendsLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="mb-4 h-8 rounded bg-gray-200"></div>
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 rounded bg-gray-200"></div>
            ))}
          </div>
          <div className="mt-6 h-64 rounded bg-gray-200"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert>
        <AlertDescription>
          Failed to load cost analytics. Please try refreshing.
        </AlertDescription>
      </Alert>
    )
  }

  if (!costSummary) return null

  // Check if there's no meaningful cost data
  if (
    costSummary.total_cost === 0 &&
    costSummary.total_runs === 0 &&
    costSummary.total_tokens === 0
  ) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="mb-2 font-semibold text-2xl">Cost Analytics</h2>
          <p className="text-gray-600">
            Cost analysis and trends for the last {days} days
          </p>
        </div>
        <div className="py-12 text-center text-gray-500">
          <DollarSign className="mx-auto mb-4 h-16 w-16 text-gray-300" />
          <p className="mb-2 text-lg">No cost data available</p>
          <p className="text-sm">
            Cost analytics will appear here after optimization runs begin.
          </p>
        </div>
      </div>
    )
  }

  const calculateTrend = () => {
    if (
      !costSummary.daily_breakdown ||
      costSummary.daily_breakdown.length < 2
    ) {
      return { direction: "stable", percentage: 0 }
    }

    const recent = costSummary.daily_breakdown.slice(-7)
    const earlier = costSummary.daily_breakdown.slice(-14, -7)

    const recentAvg =
      recent.reduce((sum, day) => sum + day.cost, 0) / recent.length
    const earlierAvg =
      earlier.reduce((sum, day) => sum + day.cost, 0) / earlier.length

    if (earlierAvg === 0) return { direction: "stable", percentage: 0 }

    const percentage = ((recentAvg - earlierAvg) / earlierAvg) * 100
    const direction =
      percentage > 5 ? "up" : percentage < -5 ? "down" : "stable"

    return { direction, percentage: Math.abs(percentage) }
  }

  const trend = calculateTrend()

  const modeChartData = Object.entries(costSummary.costs_by_mode).map(
    ([mode, data]) => ({
      name: mode.toUpperCase(),
      cost: data.cost,
      tokens: data.tokens,
      runs: data.runs,
    }),
  )

  const avgCostPerRun =
    costSummary.total_runs > 0
      ? costSummary.total_cost / costSummary.total_runs
      : 0

  const avgTokensPerRun =
    costSummary.total_runs > 0
      ? costSummary.total_tokens / costSummary.total_runs
      : 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 font-semibold text-2xl">Cost Analytics</h2>
        <p className="text-gray-600">
          Cost analysis and trends for the last {days} days
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              ${costSummary.total_cost.toFixed(4)}
            </div>
            <div className="flex items-center text-muted-foreground text-xs">
              {trend.direction === "up" && (
                <>
                  <TrendingUp className="mr-1 h-3 w-3 text-red-500" />
                  <span className="text-red-500">
                    +{trend.percentage.toFixed(1)}% from last week
                  </span>
                </>
              )}
              {trend.direction === "down" && (
                <>
                  <TrendingDown className="mr-1 h-3 w-3 text-green-500" />
                  <span className="text-green-500">
                    -{trend.percentage.toFixed(1)}% from last week
                  </span>
                </>
              )}
              {trend.direction === "stable" && (
                <span className="text-gray-500">Stable trend</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Total Tokens</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {costSummary.total_tokens.toLocaleString()}
            </div>
            <p className="text-muted-foreground text-xs">
              Avg: {Math.round(avgTokensPerRun).toLocaleString()} per run
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Total Runs</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{costSummary.total_runs}</div>
            <p className="text-muted-foreground text-xs">Optimization runs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Avg Cost/Run</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              ${avgCostPerRun.toFixed(4)}
            </div>
            <p className="text-muted-foreground text-xs">Per optimization</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Daily Cost Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Cost Trend</CardTitle>
            <CardDescription>API costs over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={costSummary.daily_breakdown}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(date) =>
                    new Date(date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `$${value.toFixed(3)}`}
                />
                <Tooltip
                  formatter={(value: any) => [`$${value.toFixed(4)}`, "Cost"]}
                  labelFormatter={(date) => new Date(date).toLocaleDateString()}
                />
                <Area
                  type="monotone"
                  dataKey="cost"
                  stroke="#8884d8"
                  fill="#8884d8"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Token Usage Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Token Usage Trend</CardTitle>
            <CardDescription>Daily token consumption</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={costSummary.daily_breakdown}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(date) =>
                    new Date(date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => value.toLocaleString()}
                />
                <Tooltip
                  formatter={(value: any) => [value.toLocaleString(), "Tokens"]}
                  labelFormatter={(date) => new Date(date).toLocaleDateString()}
                />
                <Line
                  type="monotone"
                  dataKey="tokens"
                  stroke="#82ca9d"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Cost by Mode */}
        <Card>
          <CardHeader>
            <CardTitle>Cost by Mode</CardTitle>
            <CardDescription>
              Distribution of costs across optimization modes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={modeChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="cost"
                >
                  {modeChartData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => `$${value.toFixed(4)}`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Performance by Mode</CardTitle>
            <CardDescription>
              Runs and efficiency by optimization mode
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={modeChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="runs" fill="#8884d8" name="Runs" />
                <Bar dataKey="tokens" fill="#82ca9d" name="Tokens (K)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Provider Cost Breakdown - only show if provider data exists */}
        {costSummary.costs_by_provider &&
          Object.keys(costSummary.costs_by_provider).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Cost by Provider</CardTitle>
                <CardDescription>
                  Distribution of costs across AI providers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={Object.entries(costSummary.costs_by_provider).map(
                        ([provider, data]) => ({
                          name: apiUtils.getProviderDisplayName(
                            provider as any,
                          ),
                          cost: data.cost,
                          icon: apiUtils.getProviderIcon(provider as any),
                          provider,
                        }),
                      )}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="cost"
                    >
                      {Object.entries(costSummary.costs_by_provider).map(
                        (_, index) => (
                          <Cell
                            key={`provider-cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ),
                      )}
                    </Pie>
                    <Tooltip
                      formatter={(value: any) => `$${value.toFixed(4)}`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

        {/* Model Cost Breakdown - only show if model data exists */}
        {costSummary.costs_by_model &&
          Object.keys(costSummary.costs_by_model).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Cost by Model</CardTitle>
                <CardDescription>
                  Distribution of costs across specific models
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart
                    data={Object.entries(costSummary.costs_by_model).map(
                      ([model, data]) => ({
                        name: apiUtils.formatModelName(model),
                        cost: data.cost,
                        tokens: data.tokens,
                        runs: data.runs,
                        model,
                      }),
                    )}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="cost" fill="#8884d8" name="Cost ($)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
      </div>

      {/* Provider Details - only show if provider data exists */}
      {costSummary.costs_by_provider &&
        Object.keys(costSummary.costs_by_provider).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Provider Performance Details</CardTitle>
              <CardDescription>
                Detailed breakdown by AI provider
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(costSummary.costs_by_provider).map(
                  ([provider, data], index) => (
                    <div
                      key={provider}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{
                            backgroundColor: COLORS[index % COLORS.length],
                          }}
                        />
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">
                            {apiUtils.getProviderIcon(provider as any)}
                          </span>
                          <div>
                            <Badge variant="secondary">
                              {apiUtils.getProviderDisplayName(provider as any)}
                            </Badge>
                            <p className="mt-1 text-gray-600 text-sm">
                              {data.runs} runs • {data.tokens.toLocaleString()}{" "}
                              tokens
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">${data.cost.toFixed(4)}</p>
                        <p className="text-gray-500 text-xs">
                          ${(data.cost / data.runs).toFixed(4)} per run
                        </p>
                      </div>
                    </div>
                  ),
                )}
              </div>
            </CardContent>
          </Card>
        )}

      {/* Mode Details */}
      <Card>
        <CardHeader>
          <CardTitle>Mode Performance Details</CardTitle>
          <CardDescription>
            Detailed breakdown by optimization mode
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {modeChartData.map((mode, index) => (
              <div
                key={mode.name}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <div>
                    <Badge variant="secondary">{mode.name}</Badge>
                    <p className="mt-1 text-gray-600 text-sm">
                      {mode.runs} runs • {mode.tokens.toLocaleString()} tokens
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">${mode.cost.toFixed(4)}</p>
                  <p className="text-gray-500 text-xs">
                    ${(mode.cost / mode.runs).toFixed(4)} per run
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
