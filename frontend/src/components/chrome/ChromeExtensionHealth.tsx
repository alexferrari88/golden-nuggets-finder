import { useQuery } from "@tanstack/react-query";
import {
	Activity,
	AlertCircle,
	CheckCircle,
	Chrome,
	Clock,
	TrendingUp,
	Zap,
} from "lucide-react";
import type React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { apiClient } from "@/lib/api";

export const ChromeExtensionHealth: React.FC = () => {
	const { data: healthData, isLoading } = useQuery({
		queryKey: ["chrome-extension-health"],
		queryFn: apiClient.getChromeExtensionHealth,
		refetchInterval: 10000,
	}) as { data?: any; isLoading: boolean };

	const { data: usageStats } = useQuery({
		queryKey: ["chrome-extension-usage"],
		queryFn: apiClient.getChromeExtensionUsageStats,
	}) as { data?: any };

	if (isLoading) {
		return (
			<div className="space-y-4">
				<Card>
					<CardContent className="p-6 text-center">
						<div className="text-sm">Loading Chrome extension status...</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (!healthData) {
		return (
			<div className="space-y-4">
				<Card>
					<CardContent className="p-6 text-center text-gray-500">
						<Chrome className="mx-auto h-12 w-12 text-gray-300 mb-4" />
						<div className="text-sm">Chrome extension not connected</div>
						<div className="text-xs mt-1">
							Install and configure the extension to see health data
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{/* Health Status Card */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Chrome className="h-5 w-5" />
						Chrome Extension Health
						<Badge
							variant={
								healthData.status === "healthy" ? "default" : "secondary"
							}
						>
							{healthData.status}
						</Badge>
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div className="text-center">
							<div className="text-2xl font-bold text-blue-600">
								{healthData.active_prompts || 0}
							</div>
							<div className="text-sm text-gray-500">Active Prompts</div>
						</div>
						<div className="text-center">
							<div className="text-2xl font-bold text-green-600">
								{healthData.optimized_prompts || 0}
							</div>
							<div className="text-sm text-gray-500">Optimized</div>
						</div>
						<div className="text-center">
							<div className="text-2xl font-bold text-orange-600">
								{healthData.pending_optimizations || 0}
							</div>
							<div className="text-sm text-gray-500">Pending</div>
						</div>
					</div>

					{/* Optimization Coverage */}
					{healthData.optimization_coverage !== undefined && (
						<div className="mt-4">
							<div className="flex justify-between text-sm mb-2">
								<span>Optimization Coverage</span>
								<span>{healthData.optimization_coverage}%</span>
							</div>
							<Progress
								value={healthData.optimization_coverage}
								className="h-2"
							/>
						</div>
					)}

					{/* Health Indicators */}
					<div className="mt-4 pt-4 border-t">
						<div className="grid grid-cols-2 gap-4 text-sm">
							<div className="flex items-center gap-2">
								{healthData.status === "healthy" ? (
									<CheckCircle className="h-4 w-4 text-green-500" />
								) : (
									<AlertCircle className="h-4 w-4 text-yellow-500" />
								)}
								<span>Extension Status</span>
							</div>
							<div className="text-right">
								<Badge
									variant={
										healthData.status === "healthy" ? "default" : "secondary"
									}
								>
									{healthData.status}
								</Badge>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Usage Analytics Card */}
			{usageStats && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Activity className="h-5 w-5" />
							Usage Analytics
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							{/* Usage Frequency */}
							<div>
								<div className="text-sm font-medium mb-3">
									Most Used Prompts
								</div>
								<div className="space-y-2">
									{usageStats.most_used_prompts
										?.slice(0, 5)
										.map((prompt: any, index: number) => (
											<div key={prompt.id} className="flex items-center gap-3">
												<div className="w-6 text-center text-sm text-gray-500">
													{index + 1}
												</div>
												<div className="flex-1">
													<div className="text-sm font-medium truncate">
														{prompt.name}
													</div>
													<div className="text-xs text-gray-500">
														{prompt.usage_count} uses
													</div>
												</div>
												<Badge variant="outline" className="text-xs">
													{prompt.optimization_status}
												</Badge>
											</div>
										)) || (
										<div className="text-sm text-gray-500">
											No usage data available
										</div>
									)}
								</div>
							</div>

							{/* Performance Metrics */}
							<div>
								<div className="text-sm font-medium mb-3">Performance</div>
								<div className="space-y-3">
									<div className="flex justify-between">
										<div className="flex items-center gap-2">
											<Clock className="h-4 w-4 text-blue-500" />
											<span className="text-sm text-gray-600">
												Avg. Analysis Time
											</span>
										</div>
										<span className="font-medium">
											{usageStats.avg_analysis_time || 0}s
										</span>
									</div>
									<div className="flex justify-between">
										<div className="flex items-center gap-2">
											<CheckCircle className="h-4 w-4 text-green-500" />
											<span className="text-sm text-gray-600">
												Success Rate
											</span>
										</div>
										<span className="font-medium text-green-600">
											{usageStats.success_rate || 0}%
										</span>
									</div>
									<div className="flex justify-between">
										<div className="flex items-center gap-2">
											<TrendingUp className="h-4 w-4 text-purple-500" />
											<span className="text-sm text-gray-600">Daily Usage</span>
										</div>
										<span className="font-medium">
											{usageStats.daily_usage || 0} requests
										</span>
									</div>
									<div className="flex justify-between">
										<div className="flex items-center gap-2">
											<Zap className="h-4 w-4 text-orange-500" />
											<span className="text-sm text-gray-600">
												Total Feedback
											</span>
										</div>
										<span className="font-medium">
											{usageStats.total_feedback || 0}
										</span>
									</div>
								</div>
							</div>
						</div>

						{/* Recent Activity */}
						<div className="mt-4 pt-4 border-t">
							<div className="text-sm font-medium mb-2">Recent Activity</div>
							<div className="flex items-center justify-between text-sm">
								<span className="text-gray-600">Last optimization:</span>
								<span className="text-gray-900">
									{usageStats.last_optimization
										? new Date(usageStats.last_optimization).toLocaleString()
										: "Never"}
								</span>
							</div>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
};
