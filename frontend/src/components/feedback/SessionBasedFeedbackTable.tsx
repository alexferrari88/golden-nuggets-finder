import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/lib/api";
import type { FeedbackSession } from "@/types";
import { FeedbackAttributionDisplay } from "./FeedbackAttributionDisplay";

export const SessionBasedFeedbackTable: React.FC = () => {
	const [expandedSessions, setExpandedSessions] = useState<Set<string>>(
		new Set(),
	);

	const { data: sessions, isLoading } = useQuery({
		queryKey: ["feedback-sessions"],
		queryFn: apiClient.getFeedbackSessions,
		refetchInterval: 8000,
	});

	const toggleSession = (sessionId: string) => {
		const newExpanded = new Set(expandedSessions);
		if (newExpanded.has(sessionId)) {
			newExpanded.delete(sessionId);
		} else {
			newExpanded.add(sessionId);
		}
		setExpandedSessions(newExpanded);
	};

	if (isLoading) {
		return (
			<Card>
				<CardContent className="p-6">
					<div className="text-center">Loading sessions...</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-4">
			{sessions?.map((session) => (
				<SessionCard
					key={session.feedback_session_id}
					session={session}
					expanded={expandedSessions.has(session.feedback_session_id)}
					onToggle={() => toggleSession(session.feedback_session_id)}
				/>
			))}
			{(!sessions || sessions.length === 0) && (
				<Card>
					<CardContent className="p-6 text-center text-gray-500">
						<div className="text-sm">No feedback sessions found</div>
						<div className="text-xs mt-1">
							Sessions will appear after feedback is collected
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
};

const SessionCard: React.FC<{
	session: FeedbackSession;
	expanded: boolean;
	onToggle: () => void;
}> = ({ session, expanded, onToggle }) => {
	const { data: sessionFeedback } = useQuery({
		queryKey: ["session-feedback", session.feedback_session_id],
		queryFn: () => apiClient.getFeedbackBySession(session.feedback_session_id),
		enabled: expanded,
	});

	return (
		<Card>
			<CardHeader>
				<div
					className="flex items-center justify-between cursor-pointer"
					onClick={onToggle}
				>
					<CardTitle className="flex items-center gap-2">
						{expanded ? (
							<ChevronDown className="h-4 w-4" />
						) : (
							<ChevronRight className="h-4 w-4" />
						)}
						Session: {session.feedback_session_id.slice(0, 8)}
					</CardTitle>
					<div className="flex items-center gap-2">
						<Badge
							variant={
								session.attribution_source === "ensemble"
									? "default"
									: session.attribution_source === "chrome_extension"
										? "secondary"
										: "outline"
							}
						>
							{session.attribution_source}
						</Badge>
						<Badge variant="outline">
							{session.provider_context.providers_used.length} provider(s)
						</Badge>
					</div>
				</div>

				<div className="flex items-center gap-4 text-sm text-gray-500">
					<span>Created: {new Date(session.created_at).toLocaleString()}</span>
					{session.provider_context.ensemble_mode && (
						<Badge variant="secondary" className="text-xs">
							Ensemble
						</Badge>
					)}
				</div>
			</CardHeader>

			{expanded && (
				<CardContent>
					{sessionFeedback?.items ? (
						<div className="space-y-3">
							{sessionFeedback.items.map((feedback) => (
								<div key={feedback.id} className="p-3 border rounded-lg">
									<div className="flex justify-between items-start">
										<div className="flex-1">
											<div className="text-sm font-medium mb-1">
												{feedback.content}
											</div>
											<div className="text-xs text-gray-500 mb-2">
												Type: {feedback.type}
												{feedback.original_type &&
													` → ${feedback.original_type}`}
											</div>
											<FeedbackAttributionDisplay feedback={feedback} />
										</div>
										<div className="flex flex-col items-end gap-2">
											<Badge
												variant={
													feedback.rating === "positive"
														? "default"
														: feedback.rating === "negative"
															? "destructive"
															: "secondary"
												}
											>
												{feedback.rating || "unrated"}
											</Badge>
											<div className="text-xs text-gray-500">
												Used: {feedback.usage_count} times
											</div>
										</div>
									</div>
								</div>
							))}
						</div>
					) : (
						<div className="text-center py-4 text-gray-500">
							<div className="text-sm">Loading session feedback...</div>
						</div>
					)}
				</CardContent>
			)}
		</Card>
	);
};
