import { useQuery } from "@tanstack/react-query";
import { CheckCircle, Clock, Loader2, XCircle } from "lucide-react";
import type React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { apiClient } from "@/lib/api";

export const PhaseProgressTracker: React.FC<{ runId: string }> = ({
	runId,
}) => {
	const { data: progress, isLoading } = useQuery({
		queryKey: ["detailed-progress", runId],
		queryFn: () => apiClient.getOptimizationProgress(runId),
		refetchInterval: 2000,
		enabled: !!runId,
	});

	if (isLoading) {
		return (
			<Card>
				<CardContent className="p-6 text-center">
					<Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-400" />
					<div className="mt-2 text-sm text-gray-500">Loading progress...</div>
				</CardContent>
			</Card>
		);
	}

	if (!progress) {
		return (
			<Card>
				<CardContent className="p-6 text-center text-gray-500">
					<div className="text-sm">No progress data available</div>
				</CardContent>
			</Card>
		);
	}

	const phases = [
		"initialization",
		"data_gathering",
		"optimization",
		"storing",
		"completed",
	];

	const getPhaseStatus = (
		phaseName: string,
		currentPhase: string,
		currentProgress: number,
	) => {
		const phaseIndex = phases.indexOf(phaseName);
		const currentIndex = phases.indexOf(currentPhase);

		if (phaseIndex < currentIndex) return "completed";
		if (phaseIndex === currentIndex)
			return currentProgress > 0 ? "in-progress" : "pending";
		return "pending";
	};

	const formatPhaseName = (phaseName: string) => {
		return phaseName
			.split("_")
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(" ");
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Clock className="h-5 w-5" />
					Phase Progress
					<Badge
						variant={progress.phase === "failed" ? "destructive" : "default"}
					>
						{formatPhaseName(progress.phase)}
					</Badge>
				</CardTitle>
			</CardHeader>
			<CardContent>
				{/* Overall Progress */}
				<div className="mb-6">
					<div className="flex justify-between text-sm mb-2">
						<span>Overall Progress</span>
						<span>{Math.round((progress.phase_progress || 0) * 100)}%</span>
					</div>
					<Progress
						value={(progress.phase_progress || 0) * 100}
						className="h-3"
					/>
				</div>

				{/* Phase Breakdown */}
				<div className="space-y-4">
					{phases.map((phaseName, _index) => {
						const status = getPhaseStatus(
							phaseName,
							progress.phase,
							progress.phase_progress,
						);
						const duration = progress.phase_durations?.[phaseName];

						return (
							<div key={phaseName} className="flex items-center gap-3">
								{/* Phase Icon */}
								<div
									className={`w-8 h-8 rounded-full flex items-center justify-center ${
										status === "completed"
											? "bg-green-500"
											: status === "in-progress"
												? "bg-blue-500"
												: progress.phase === "failed" && status === "pending"
													? "bg-red-500"
													: "bg-gray-300"
									}`}
								>
									{status === "completed" ? (
										<CheckCircle className="h-4 w-4 text-white" />
									) : status === "in-progress" ? (
										<div className="w-2 h-2 bg-white rounded-full animate-pulse" />
									) : progress.phase === "failed" && status === "pending" ? (
										<XCircle className="h-4 w-4 text-white" />
									) : (
										<div className="w-2 h-2 bg-gray-500 rounded-full" />
									)}
								</div>

								{/* Phase Info */}
								<div className="flex-1">
									<div className="flex items-center gap-2">
										<span className="font-medium">
											{formatPhaseName(phaseName)}
										</span>
										<Badge
											variant={
												status === "completed"
													? "default"
													: status === "in-progress"
														? "default"
														: progress.phase === "failed" &&
																phaseName === progress.phase
															? "destructive"
															: "secondary"
											}
											className="text-xs"
										>
											{status === "completed"
												? "Done"
												: status === "in-progress"
													? "Running"
													: progress.phase === "failed" &&
															phaseName === progress.phase
														? "Failed"
														: "Pending"}
										</Badge>
									</div>

									{duration && (
										<div className="text-sm text-gray-500">
											Duration: {Math.round(duration)}s
										</div>
									)}
								</div>

								{/* Phase Progress */}
								{status === "in-progress" && (
									<div className="w-24">
										<Progress
											value={progress.phase_progress * 100}
											className="h-2"
										/>
									</div>
								)}
							</div>
						);
					})}
				</div>

				{/* Activity Summary */}
				{progress.activity_timeline &&
					progress.activity_timeline.length > 0 && (
						<div className="mt-4 pt-4 border-t">
							<div className="text-sm font-medium mb-2">Recent Activity:</div>
							<div className="text-sm text-gray-600">
								{progress.activity_timeline.slice(-1)[0].message}
							</div>
							<div className="text-xs text-gray-500 mt-1">
								{new Date(
									progress.activity_timeline.slice(-1)[0].timestamp,
								).toLocaleTimeString()}
							</div>
						</div>
					)}

				{/* Run Metadata */}
				<div className="mt-4 pt-4 border-t">
					<div className="grid grid-cols-2 gap-4 text-sm">
						<div>
							<div className="text-gray-500">Run ID</div>
							<div className="font-mono text-xs">{progress.run_id}</div>
						</div>
						<div>
							<div className="text-gray-500">Total Phases</div>
							<div className="font-medium">
								{progress.total_phases || phases.length}
							</div>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
};
