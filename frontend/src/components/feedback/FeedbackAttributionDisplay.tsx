import type React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { EnhancedFeedbackItem, FeedbackItem } from "@/types";

export const FeedbackAttributionDisplay: React.FC<{
	feedback: FeedbackItem | EnhancedFeedbackItem;
}> = ({ feedback }) => {
	const enhancedFeedback = feedback as EnhancedFeedbackItem;
	const { attribution } = enhancedFeedback;

	if (!attribution || attribution.contributing_providers.length <= 1) {
		// Single provider attribution
		return (
			<div className="text-xs text-gray-500">
				Source: {feedback.model_provider || "Unknown"}{" "}
				{feedback.model_name ? `(${feedback.model_name})` : ""}
			</div>
		);
	}

	// Multi-provider consensus
	return (
		<Card className="mt-2 border-blue-200 bg-blue-50">
			<CardContent className="p-3">
				<div className="flex items-center gap-2 mb-2">
					<Badge variant="secondary" className="text-xs">
						Multi-Provider Consensus
					</Badge>
					<span className="text-xs text-gray-600">
						{Math.round(attribution.confidence_score)}% confidence
					</span>
				</div>

				<div className="text-xs">
					<div className="font-medium mb-1">Contributing Providers:</div>
					<div className="flex flex-wrap gap-1">
						{attribution.contributing_providers.map((provider, index) => (
							<Badge
								key={`${provider.provider_id}-${index}`}
								variant="outline"
								className="text-xs"
							>
								{provider.provider_id}
								{provider.model_name && (
									<span className="ml-1 text-gray-500">
										({provider.model_name.split("-")[0]})
									</span>
								)}
							</Badge>
						))}
					</div>
				</div>

				{attribution.similarity_method && (
					<div className="text-xs text-gray-500 mt-1">
						Matched via: {attribution.similarity_method}
					</div>
				)}
			</CardContent>
		</Card>
	);
};
