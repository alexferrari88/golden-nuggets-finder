import type React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
} from "recharts";
import { apiClient } from "@/lib/api";
import type { ProviderCost } from "@/types";


export const EnhancedCostAnalytics: React.FC = () => {
	const { data: costSummary } = useQuery({
		queryKey: ["enhanced-cost-summary"],
		queryFn: apiClient.getEnhancedCostSummary,
		refetchInterval: 10000,
	}) as { data?: any };

	const { data: providerCosts } = useQuery({
		queryKey: ["provider-cost-breakdown"],
		queryFn: apiClient.getProviderCostBreakdown,
	}) as { data?: any };

	if (!costSummary) {
		return (
			<div className="space-y-6">
				<div className="animate-pulse">
					<div className="mb-4 h-8 rounded bg-gray-200"></div>
					<div className="grid gap-4 md:grid-cols-3">
						{[1, 2, 3].map((i) => (
							<div key={i} className="h-32 rounded bg-gray-200"></div>
						))}
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Cost Accuracy Overview */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						Cost Tracking Accuracy
						<Badge
							variant={
								costSummary.overall_accuracy >= 95 ? "default" : "secondary"
							}
						>
							{costSummary.overall_accuracy}% accurate
						</Badge>
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div className="text-center">
							<div className="text-2xl font-bold">
								${costSummary.total_cost?.toFixed(4) || "0.0000"}
							</div>
							<div className="text-sm text-gray-500">Total Cost (24h)</div>
						</div>
						<div className="text-center">
							<div className="text-2xl font-bold">
								{costSummary.operation_count || 0}
							</div>
							<div className="text-sm text-gray-500">Total Operations</div>
						</div>
						<div className="text-center">
							<div className="text-2xl font-bold">
								{costSummary.token_count?.toLocaleString() || "0"}
							</div>
							<div className="text-sm text-gray-500">Tokens Processed</div>
						</div>
					</div>

					{/* Accuracy Breakdown */}
					{costSummary.accuracy_by_method && (
						<div className="mt-4">
							<div className="text-sm font-medium mb-2">
								Accuracy by Method:
							</div>
							<div className="space-y-2">
								{costSummary.accuracy_by_method.map((method: any) => (
									<div key={method.method} className="flex items-center gap-3">
										<div className="w-24 text-sm">{method.method}</div>
										<Progress value={method.accuracy} className="flex-1 h-2" />
										<div className="w-12 text-sm text-right">
											{method.accuracy}%
										</div>
									</div>
								))}
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Provider Cost Comparison with Accuracy */}
			{providerCosts && providerCosts.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle>Provider Cost Breakdown</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							{providerCosts.map((provider: ProviderCost) => (
								<ProviderCostRow
									key={provider.provider_id}
									provider={provider}
								/>
							))}
						</div>
					</CardContent>
				</Card>
			)}

			{/* DSPy Operation Breakdown */}
			{costSummary.operation_breakdown && (
				<Card>
					<CardHeader>
						<CardTitle>Operation-Level Cost Analysis</CardTitle>
					</CardHeader>
					<CardContent>
						<ResponsiveContainer width="100%" height={300}>
							<BarChart data={costSummary.operation_breakdown}>
								<CartesianGrid strokeDasharray="3 3" />
								<XAxis dataKey="operation_type" />
								<YAxis />
								<Tooltip
									formatter={(value: any, name: string) => [
										name === "cost" ? `$${value.toFixed(4)}` : `${value}%`,
										name === "cost" ? "Cost" : "Accuracy",
									]}
								/>
								<Bar dataKey="cost" fill="#8884d8" name="Cost" />
								<Bar dataKey="accuracy" fill="#82ca9d" name="Accuracy" />
							</BarChart>
						</ResponsiveContainer>
					</CardContent>
				</Card>
			)}

			{/* DSPy Metadata Analysis */}
			{costSummary.dspy_metadata && (
				<Card>
					<CardHeader>
						<CardTitle>DSPy Cost Analysis</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
							<div className="text-center">
								<div className="text-lg font-bold text-blue-600">
									{costSummary.dspy_metadata.total_tokens?.toLocaleString() ||
										"0"}
								</div>
								<div className="text-xs text-gray-500">Total Tokens</div>
							</div>
							<div className="text-center">
								<div className="text-lg font-bold text-green-600">
									{costSummary.dspy_metadata.input_tokens?.toLocaleString() ||
										"0"}
								</div>
								<div className="text-xs text-gray-500">Input Tokens</div>
							</div>
							<div className="text-center">
								<div className="text-lg font-bold text-orange-600">
									{costSummary.dspy_metadata.output_tokens?.toLocaleString() ||
										"0"}
								</div>
								<div className="text-xs text-gray-500">Output Tokens</div>
							</div>
							<div className="text-center">
								<Badge variant="outline" className="text-xs">
									{costSummary.dspy_metadata.accuracy_method || "Unknown"}
								</Badge>
								<div className="text-xs text-gray-500 mt-1">Method</div>
							</div>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
};

const ProviderCostRow: React.FC<{ provider: ProviderCost }> = ({
	provider,
}) => {
	return (
		<div className="flex items-center justify-between p-3 border rounded">
			<div className="flex items-center gap-3">
				<Badge variant="outline">{provider.provider_id}</Badge>
				<div>
					<div className="font-medium">{provider.model_name}</div>
					<div className="text-sm text-gray-500">
						{provider.tokens_used?.toLocaleString() || "0"} tokens
					</div>
				</div>
			</div>
			<div className="text-right">
				<div className="font-medium">
					${provider.cost?.toFixed(4) || "0.0000"}
				</div>
				<div className="text-sm text-gray-500">
					{provider.accuracy || 0}% accuracy
				</div>
			</div>
		</div>
	);
};
