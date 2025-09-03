import { useQuery } from "@tanstack/react-query";
import {
	Clock,
	ExternalLink,
	GitBranch,
	TrendingUp,
	Users,
} from "lucide-react";
import type React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/lib/api";
import type { PromptOptimizationMapping } from "@/types";

export const OptimizationMappingTable: React.FC = () => {
	const { data: mappings, isLoading } = useQuery({
		queryKey: ["optimization-mappings"],
		queryFn: apiClient.getOptimizationMappings,
	});

	if (isLoading) {
		return (
			<Card>
				<CardContent className="p-6 text-center">
					<div className="text-sm">Loading optimization mappings...</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<GitBranch className="h-5 w-5" />
					Prompt → Optimization Mapping
				</CardTitle>
			</CardHeader>
			<CardContent>
				{!mappings || mappings.length === 0 ? (
					<div className="text-center py-8 text-gray-500">
						<GitBranch className="mx-auto h-12 w-12 text-gray-300 mb-4" />
						<p>No optimization mappings found</p>
						<p className="text-sm mt-1">
							Optimize prompts to see mapping history
						</p>
					</div>
				) : (
					<div className="space-y-4">
						{mappings.map((mapping) => (
							<OptimizationMappingCard key={mapping.id} mapping={mapping} />
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
};

const OptimizationMappingCard: React.FC<{
	mapping: PromptOptimizationMapping;
}> = ({ mapping }) => {
	const { data: optimizationDetails } = useQuery({
		queryKey: ["optimization-details", mapping.optimization_run_id],
		queryFn: () => apiClient.getOptimizationRun(mapping.optimization_run_id),
	});

	const formatDuration = (duration?: number) => {
		if (!duration) return "N/A";
		if (duration < 60) return `${Math.round(duration)}s`;
		const mins = Math.floor(duration / 60);
		const secs = Math.round(duration % 60);
		return `${mins}m ${secs}s`;
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case "successful":
				return "default";
			case "failed":
				return "destructive";
			case "pending":
				return "secondary";
			default:
				return "outline";
		}
	};

	return (
		<Card className="border-l-4 border-l-purple-500">
			<CardContent className="p-4">
				<div className="flex items-start justify-between">
					<div className="flex-1">
						{/* Prompt Info */}
						<div className="flex items-center gap-2 mb-2">
							<h3 className="font-medium">{mapping.prompt_name}</h3>
							<Badge variant="outline" className="text-xs">
								v{mapping.prompt_version}
							</Badge>
							<Badge variant={getStatusColor(mapping.status)}>
								{mapping.status}
							</Badge>
						</div>

						{/* Optimization Details */}
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-3">
							<div>
								<div className="text-gray-500">Optimization Run</div>
								<div className="font-medium font-mono">
									{mapping.optimization_run_id.slice(0, 8)}...
								</div>
							</div>
							<div>
								<div className="text-gray-500">Created</div>
								<div className="font-medium">
									{new Date(mapping.created_at).toLocaleDateString()}
								</div>
							</div>
							<div>
								<div className="text-gray-500">Duration</div>
								<div className="font-medium">
									{formatDuration(optimizationDetails?.duration)}
								</div>
							</div>
						</div>

						{/* Provider Configuration */}
						{mapping.provider_configuration && (
							<div className="mb-3">
								<div className="text-sm text-gray-500 mb-1">Configuration:</div>
								<div className="flex items-center gap-2">
									<Badge variant="outline" className="text-xs">
										{mapping.provider_configuration.mode}
									</Badge>
									{mapping.provider_configuration.enabled_providers && (
										<div className="flex flex-wrap gap-1">
											{mapping.provider_configuration.enabled_providers.map(
												(providerId) => (
													<Badge
														key={providerId}
														variant="secondary"
														className="text-xs"
													>
														{providerId}
													</Badge>
												),
											)}
										</div>
									)}
								</div>
							</div>
						)}

						{/* Performance Metrics */}
						{mapping.performance_metrics && (
							<div className="p-2 bg-gray-50 rounded">
								<div className="text-xs text-gray-600 mb-1">
									Performance Improvement:
								</div>
								<div className="flex items-center gap-1">
									{mapping.performance_metrics.improvement_percentage > 0 ? (
										<TrendingUp className="h-3 w-3 text-green-500" />
									) : (
										<TrendingUp className="h-3 w-3 text-red-500" />
									)}
									<div className="text-sm font-medium">
										{mapping.performance_metrics.improvement_percentage > 0
											? "+"
											: ""}
										{mapping.performance_metrics.improvement_percentage}%
									</div>
								</div>
							</div>
						)}
					</div>

					{/* Actions */}
					<div className="flex flex-col gap-2">
						<Button
							size="sm"
							variant="outline"
							onClick={() =>
								window.open(
									`/optimization/${mapping.optimization_run_id}`,
									"_blank",
								)
							}
						>
							<ExternalLink className="h-4 w-4 mr-2" />
							View Run
						</Button>

						{mapping.status === "successful" && (
							<Badge variant="default" className="text-xs text-center">
								<Clock className="h-3 w-3 mr-1" />
								Complete
							</Badge>
						)}

						{optimizationDetails?.ensemble_mode && (
							<Badge variant="secondary" className="text-xs text-center">
								<Users className="h-3 w-3 mr-1" />
								Ensemble
							</Badge>
						)}
					</div>
				</div>

				{/* Additional Metadata */}
				{optimizationDetails && (
					<div className="mt-3 pt-3 border-t text-xs text-gray-500">
						<div className="grid grid-cols-2 gap-4">
							<div>
								Started:{" "}
								{new Date(optimizationDetails.started_at).toLocaleTimeString()}
							</div>
							{optimizationDetails.completed_at && (
								<div>
									Completed:{" "}
									{new Date(
										optimizationDetails.completed_at,
									).toLocaleTimeString()}
								</div>
							)}
						</div>
						{optimizationDetails.tokens_used && (
							<div className="mt-1">
								Tokens used: {optimizationDetails.tokens_used.toLocaleString()}
								{optimizationDetails.api_cost && (
									<span className="ml-2">
										Cost: ${optimizationDetails.api_cost.toFixed(4)}
									</span>
								)}
							</div>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	);
};
