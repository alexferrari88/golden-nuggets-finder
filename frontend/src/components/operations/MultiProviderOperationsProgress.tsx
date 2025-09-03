import type React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api";
import type {
	ProviderConfiguration,
	EnhancedOptimizationRun,
} from "@/types";

export const MultiProviderOperationsProgress: React.FC = () => {
	const { data: activeRuns } = useQuery({
		queryKey: ["active-optimization-runs"],
		queryFn: apiClient.getActiveOptimizationRuns,
		refetchInterval: 3000,
	});

	return (
		<div className="space-y-4">
			{activeRuns?.map((run) => (
				<MultiProviderRunCard key={run.id} run={run} />
			))}
			{(!activeRuns || activeRuns.length === 0) && (
				<Card>
					<CardContent className="p-6 text-center text-gray-500">
						<div className="text-sm">No active optimization runs</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
};

const MultiProviderRunCard: React.FC<{ run: EnhancedOptimizationRun }> = ({
	run,
}) => {
	const { data: progress } = useQuery({
		queryKey: ["optimization-progress", run.id],
		queryFn: () => apiClient.getOptimizationProgress(run.id),
		refetchInterval: 2000,
		enabled: run.status === "running",
	});

	const { data: costs } = useQuery({
		queryKey: ["optimization-costs", run.id],
		queryFn: () => apiClient.getOptimizationCosts(run.id),
		enabled: run.status !== "running",
	});

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center justify-between">
					<span>Optimization Run: {run.id.slice(0, 8)}</span>
					<div className="flex items-center gap-2">
						<Badge variant={run.status === "running" ? "default" : "secondary"}>
							{run.status}
						</Badge>
						{run.ensemble_mode && <Badge variant="outline">Ensemble</Badge>}
					</div>
				</CardTitle>
			</CardHeader>
			<CardContent>
				{/* Overall Progress */}
				<div className="mb-4">
					<div className="flex justify-between text-sm mb-2">
						<span>Phase: {progress?.phase || "Unknown"}</span>
						<span>{Math.round((progress?.phase_progress || 0) * 100)}%</span>
					</div>
					<Progress
						value={(progress?.phase_progress || 0) * 100}
						className="h-2"
					/>
				</div>

				{/* Provider-Specific Progress */}
				{run.ensemble_mode && run.provider_configurations && (
					<div className="space-y-2">
						<div className="text-sm font-medium">Provider Progress:</div>
						{run.provider_configurations.map((providerConfig) => (
							<ProviderProgressRow
								key={providerConfig.provider_id}
								config={providerConfig}
								runId={run.id}
							/>
						))}
					</div>
				)}

				{/* Duration and Basic Info */}
				<div className="mt-4 pt-4 border-t">
					<div className="grid grid-cols-2 gap-4 text-sm">
						<div>
							<div className="text-gray-500">Started</div>
							<div className="font-medium">
								{new Date(run.started_at).toLocaleTimeString()}
							</div>
						</div>
						{run.completed_at && (
							<div>
								<div className="text-gray-500">Duration</div>
								<div className="font-medium">
									{run.duration ? `${Math.round(run.duration)}s` : "N/A"}
								</div>
							</div>
						)}
					</div>
				</div>

				{/* Cost Tracking */}
				{costs && (
					<div className="mt-4 pt-4 border-t">
						<div className="flex justify-between items-center">
							<span className="text-sm">Total Cost:</span>
							<div className="text-right">
								<div className="font-medium">
									${costs.total_cost?.toFixed(4) || run.api_cost.toFixed(4)}
								</div>
								<div className="text-xs text-gray-500">
									{costs.cost_accuracy}% accuracy
								</div>
							</div>
						</div>

						{costs.provider_costs && costs.provider_costs.length > 0 && (
							<div className="mt-2">
								<div className="text-xs text-gray-500 mb-1">
									Provider Breakdown:
								</div>
								<div className="space-y-1">
									{costs.provider_costs.map((providerCost) => (
										<div
											key={providerCost.provider_id}
											className="flex justify-between text-xs"
										>
											<span>{providerCost.provider_id}</span>
											<span>${providerCost.cost.toFixed(4)}</span>
										</div>
									))}
								</div>
							</div>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	);
};

const ProviderProgressRow: React.FC<{
	config: ProviderConfiguration;
	runId: string;
}> = ({ config }) => {
	return (
		<div className="flex items-center gap-3 p-2 bg-gray-50 rounded">
			<Badge variant="outline" className="min-w-[80px]">
				{config.provider_id}
			</Badge>
			<div className="flex-1">
				<div className="text-sm">{config.model_id}</div>
			</div>
			<div
				className={`h-2 w-2 rounded-full ${
					config.status === "completed"
						? "bg-green-500"
						: config.status === "running"
							? "bg-blue-500 animate-pulse"
							: config.status === "failed"
								? "bg-red-500"
								: "bg-gray-300"
				}`}
			/>
		</div>
	);
};
