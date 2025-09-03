import type React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
	Clock,
	Activity,
	Users,
	Zap,
	CheckCircle,
	XCircle,
	Loader2,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import type { ProgressActivity } from "@/types";

export const ActivityTimeline: React.FC = () => {
	const { data: activities, isLoading } = useQuery({
		queryKey: ["recent-activity"],
		queryFn: apiClient.getRecentActivity,
		refetchInterval: 5000,
	});

	if (isLoading) {
		return (
			<Card>
				<CardContent className="p-6 text-center">
					<Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-400" />
					<div className="mt-2 text-sm text-gray-500">
						Loading activity timeline...
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Activity className="h-5 w-5" />
					Activity Timeline
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="space-y-4 max-h-96 overflow-y-auto">
					{activities?.map((activity, index) => (
						<ActivityTimelineItem
							key={`${activity.timestamp}-${index}`}
							activity={activity}
							isLast={index === activities.length - 1}
						/>
					)) || (
						<div className="text-center py-8 text-gray-500">
							<Activity className="mx-auto h-12 w-12 text-gray-300 mb-4" />
							<p>No recent activity</p>
							<p className="text-sm mt-1">
								Activity will appear here as optimizations run
							</p>
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
};

const ActivityTimelineItem: React.FC<{
	activity: ProgressActivity;
	isLast: boolean;
}> = ({ activity, isLast }) => {
	const getPhaseIcon = (phase: string) => {
		switch (phase) {
			case "initialization":
				return <Clock className="h-4 w-4" />;
			case "data_gathering":
				return <Activity className="h-4 w-4" />;
			case "optimization":
				return <Zap className="h-4 w-4" />;
			case "storing":
				return <Users className="h-4 w-4" />;
			case "completed":
				return <CheckCircle className="h-4 w-4" />;
			case "failed":
				return <XCircle className="h-4 w-4" />;
			default:
				return <Activity className="h-4 w-4" />;
		}
	};

	const getPhaseColor = (phase: string) => {
		switch (phase) {
			case "completed":
				return "bg-green-500";
			case "failed":
				return "bg-red-500";
			case "optimization":
				return "bg-blue-500";
			case "data_gathering":
				return "bg-yellow-500";
			case "initialization":
				return "bg-purple-500";
			case "storing":
				return "bg-indigo-500";
			default:
				return "bg-gray-500";
		}
	};

	const formatTimestamp = (timestamp: string) => {
		try {
			const date = new Date(timestamp);
			const now = new Date();
			const diffMs = now.getTime() - date.getTime();
			const diffMins = Math.floor(diffMs / 60000);
			const diffHours = Math.floor(diffMs / 3600000);

			if (diffMins < 1) return "now";
			if (diffMins < 60) return `${diffMins}m ago`;
			if (diffHours < 24) return `${diffHours}h ago`;
			return date.toLocaleTimeString([], {
				hour: "2-digit",
				minute: "2-digit",
			});
		} catch {
			return "unknown";
		}
	};

	return (
		<div className="flex items-start gap-3">
			{/* Timeline dot and line */}
			<div className="flex flex-col items-center">
				<div
					className={`w-8 h-8 rounded-full ${getPhaseColor(activity.phase)} flex items-center justify-center text-white`}
				>
					{getPhaseIcon(activity.phase)}
				</div>
				{!isLast && <div className="w-0.5 h-6 bg-gray-200 mt-1" />}
			</div>

			{/* Activity content */}
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2 mb-1">
					<Badge variant="outline" className="text-xs">
						{activity.phase}
					</Badge>
					{activity.provider_id && (
						<Badge variant="secondary" className="text-xs">
							{activity.provider_id}
						</Badge>
					)}
					<span className="text-xs text-gray-500 ml-auto">
						{formatTimestamp(activity.timestamp)}
					</span>
				</div>
				<div className="text-sm text-gray-700">{activity.message}</div>
			</div>
		</div>
	);
};
