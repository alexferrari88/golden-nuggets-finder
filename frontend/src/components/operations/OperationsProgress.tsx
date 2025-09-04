import { useQuery } from "@tanstack/react-query";
import {
	Activity,
	AlertCircle,
	Brain,
	CheckCircle,
	ChevronDown,
	ChevronUp,
	Clock,
	Loader2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { apiClient } from "@/lib/api";
import type { ApiError, ProgressActivity } from "@/types";

interface OperationsProgressProps {
	refreshInterval?: number;
	maxLogEntries?: number;
}

export function OperationsProgress({
	refreshInterval = 2000,
	maxLogEntries = 20,
}: OperationsProgressProps) {
	const [isExpanded, setIsExpanded] = useState(true);
	const [logEntries, setLogEntries] = useState<ProgressActivity[]>([]);

	const {
		data: recentActivity,
		error,
		isLoading,
		isError,
	} = useQuery<ProgressActivity[], ApiError>({
		queryKey: ["recent-activity"],
		queryFn: () => apiClient.getRecentActivity(),
		refetchInterval: refreshInterval,
		staleTime: 1000,
	});

	// Update log entries when new data arrives
	useEffect(() => {
		if (recentActivity) {
			// Ensure recentActivity is an array before setting it
			const activities = Array.isArray(recentActivity) ? recentActivity : [];
			setLogEntries(activities);
		}
	}, [recentActivity]);

	const getStepIcon = (_step: string, progress: number) => {
		if (progress >= 100) {
			return <CheckCircle className="h-4 w-4 text-green-500" />;
		} else if (progress > 0) {
			return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
		} else {
			return <Clock className="h-4 w-4 text-gray-400" />;
		}
	};

	// Utility function for future use
	// const getProgressColor = (progress: number) => {
	//   if (progress >= 100) return 'bg-green-500';
	//   if (progress >= 75) return 'bg-blue-500';
	//   if (progress >= 50) return 'bg-yellow-500';
	//   if (progress >= 25) return 'bg-orange-500';
	//   return 'bg-gray-300';
	// };

	const formatTimestamp = (timestamp: string) => {
		const date = new Date(timestamp);
		return date.toLocaleTimeString([], {
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		});
	};

	const isActiveOperation = (entry: ProgressActivity) => {
		return (
			entry.phase !== "completed" &&
			entry.phase !== "failed" &&
			entry.phase !== "initialization"
		);
	};

	const safeLogEntries = Array.isArray(logEntries) ? logEntries : [];
	const activeOperations = safeLogEntries.filter(isActiveOperation);
	const completedOperations = safeLogEntries.filter(
		(entry) => entry.phase === "completed",
	);
	const pendingOperations = safeLogEntries.filter(
		(entry) => entry.phase === "initialization",
	);

	if (isError) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Activity className="h-5 w-5" />
						Operations Monitor
					</CardTitle>
				</CardHeader>
				<CardContent>
					<Alert variant="destructive">
						<AlertCircle className="h-4 w-4" />
						<AlertDescription>
							Failed to load operations data: {error?.message}
						</AlertDescription>
					</Alert>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle className="flex items-center gap-2">
						<Brain className="h-5 w-5 text-purple-500" />
						Operations Monitor
						<div className="flex gap-2">
							{activeOperations.length > 0 && (
								<Badge variant="default" className="bg-blue-500">
									{activeOperations.length} Active
								</Badge>
							)}
							{completedOperations.length > 0 && (
								<Badge variant="outline" className="text-green-600">
									{completedOperations.length} Complete
								</Badge>
							)}
						</div>
					</CardTitle>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => setIsExpanded(!isExpanded)}
					>
						{isExpanded ? (
							<ChevronUp className="h-4 w-4" />
						) : (
							<ChevronDown className="h-4 w-4" />
						)}
					</Button>
				</div>
			</CardHeader>
			<CardContent>
				{isLoading && logEntries.length === 0 ? (
					<div className="space-y-3">
						{Array.from({ length: 3 }).map((_, i) => (
							<div key={i} className="space-y-2">
								<div className="h-4 animate-pulse rounded bg-gray-200" />
								<div className="h-2 animate-pulse rounded bg-gray-100" />
							</div>
						))}
					</div>
				) : logEntries.length === 0 ? (
					<div className="py-8 text-center text-gray-500">
						<Activity className="mx-auto mb-4 h-12 w-12 text-gray-300" />
						<p>No operations data available</p>
						<p className="mt-2 text-sm">
							Operations will appear here when feedback processing begins.
						</p>
					</div>
				) : (
					<div className="space-y-4">
						{/* Active Operations - Always visible */}
						{activeOperations.length > 0 && (
							<div>
								<h4 className="mb-3 flex items-center gap-2 font-semibold text-gray-700 text-sm">
									<Loader2 className="h-4 w-4 animate-spin text-blue-500" />
									Active Operations ({activeOperations.length})
								</h4>
								<div className="space-y-3">
									{activeOperations.map((entry, index) => (
										<div
											key={`${entry.phase}-${index}`}
											className="rounded-lg border bg-blue-50 p-3"
										>
											<div className="mb-2 flex items-center justify-between">
												<div className="flex items-center gap-2">
													{getStepIcon(entry.phase, 50)}
													<span className="font-medium text-sm">
														{entry.phase}
													</span>
												</div>
												<div className="flex items-center gap-2">
													<Badge variant="outline">Active</Badge>
													<span className="text-gray-500 text-xs">
														{formatTimestamp(entry.timestamp)}
													</span>
												</div>
											</div>

											<Progress value={50} className="mb-2 h-2" />

											<p className="text-gray-600 text-sm">{entry.message}</p>
										</div>
									))}
								</div>
							</div>
						)}

						{/* Expandable Recent Activity Log */}
						{isExpanded &&
							(completedOperations.length > 0 ||
								pendingOperations.length > 0) && (
								<div>
									<h4 className="mb-3 flex items-center gap-2 font-semibold text-gray-700 text-sm">
										<Clock className="h-4 w-4 text-gray-400" />
										Recent Activity
									</h4>
									<div className="max-h-64 space-y-2 overflow-y-auto">
										{[...completedOperations, ...pendingOperations]
											.slice(0, maxLogEntries - activeOperations.length)
											.map((entry, index) => (
												<div
													key={`${entry.phase}-${index}`}
													className={`flex items-center justify-between rounded-lg p-2 text-sm ${
														entry.phase === "completed"
															? "border border-green-200 bg-green-50"
															: "border border-gray-200 bg-gray-50"
													}`}
												>
													<div className="flex flex-1 items-center gap-2">
														{getStepIcon(entry.phase, 100)}
														<span className="truncate font-medium">
															{entry.phase}
														</span>
														<span className="truncate text-gray-500 text-xs">
															{entry.message}
														</span>
													</div>
													<div className="flex flex-shrink-0 items-center gap-2">
														<Badge
															variant={
																entry.phase === "completed"
																	? "default"
																	: "outline"
															}
														>
															{entry.phase === "completed"
																? "Complete"
																: entry.phase}
														</Badge>
														<span className="w-16 text-right text-gray-400 text-xs">
															{formatTimestamp(entry.timestamp)}
														</span>
													</div>
												</div>
											))}
									</div>
								</div>
							)}

						{/* Empty state when expanded but no operations */}
						{isExpanded &&
							activeOperations.length === 0 &&
							completedOperations.length === 0 &&
							pendingOperations.length === 0 && (
								<div className="py-4 text-center text-gray-500">
									<Clock className="mx-auto mb-2 h-8 w-8 text-gray-300" />
									<p className="text-sm">No operations in progress</p>
								</div>
							)}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
