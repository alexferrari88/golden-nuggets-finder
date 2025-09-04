import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { apiClient } from "@/lib/api";
import type { EnsembleConfiguration, ProviderId } from "@/types";

export const EnsembleConfigurationPanel: React.FC = () => {
	const [config, setConfig] = useState<EnsembleConfiguration>({
		mode: "single-model",
		enabled_providers: ["gemini"],
		default_runs: 3,
		provider_configurations: [],
	});

	const queryClient = useQueryClient();

	const { data: providers } = useQuery({
		queryKey: ["available-providers"],
		queryFn: apiClient.getAvailableProviders,
	});

	const { data: currentConfig } = useQuery({
		queryKey: ["ensemble-config"],
		queryFn: apiClient.getEnsembleConfiguration,
	});

	// Update config when currentConfig changes
	React.useEffect(() => {
		if (currentConfig) {
			setConfig(currentConfig);
		}
	}, [currentConfig]);

	const configMutation = useMutation({
		mutationFn: apiClient.updateEnsembleConfiguration,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["ensemble-config"] });
		},
	});

	const handleProviderToggle = (providerId: ProviderId, enabled: boolean) => {
		setConfig((prev) => ({
			...prev,
			enabled_providers: enabled
				? [...prev.enabled_providers, providerId]
				: prev.enabled_providers.filter((id) => id !== providerId),
		}));
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					Ensemble Configuration
					<Badge
						variant={config.mode === "multi-provider" ? "default" : "secondary"}
					>
						{config.mode === "multi-provider"
							? "Multi-Provider"
							: "Single-Model"}
					</Badge>
				</CardTitle>
			</CardHeader>
			<CardContent>
				{/* Mode Selection */}
				<div className="flex items-center space-x-2 mb-4">
					<Switch
						checked={config.mode === "multi-provider"}
						onCheckedChange={(checked) =>
							setConfig((prev) => ({
								...prev,
								mode: checked ? "multi-provider" : "single-model",
							}))
						}
					/>
					<label>Multi-Provider Ensemble Mode</label>
				</div>

				{/* Provider Selection Grid */}
				{config.mode === "multi-provider" && (
					<div className="grid grid-cols-2 gap-3 mb-4">
						{providers?.map((provider) => (
							<div
								key={provider.id}
								className="flex items-center space-x-2 p-3 border rounded"
							>
								<Switch
									checked={config.enabled_providers.includes(provider.id)}
									onCheckedChange={(enabled) =>
										handleProviderToggle(provider.id, enabled)
									}
								/>
								<div className="flex-1">
									<div className="font-medium">{provider.name}</div>
									<div className="text-sm text-gray-500">{provider.model}</div>
								</div>
								<Badge variant={provider.healthy ? "default" : "destructive"}>
									{provider.status}
								</Badge>
							</div>
						))}
					</div>
				)}

				{/* Run Count Configuration for Single-Model Mode */}
				{config.mode === "single-model" && (
					<div className="mb-4 p-3 border rounded">
						<div className="text-sm font-medium mb-2">Run Count</div>
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() =>
									setConfig((prev) => ({
										...prev,
										default_runs: Math.max(1, prev.default_runs - 1),
									}))
								}
								disabled={config.default_runs <= 1}
							>
								-
							</Button>
							<span className="w-8 text-center">{config.default_runs}</span>
							<Button
								variant="outline"
								size="sm"
								onClick={() =>
									setConfig((prev) => ({
										...prev,
										default_runs: Math.min(5, prev.default_runs + 1),
									}))
								}
								disabled={config.default_runs >= 5}
							>
								+
							</Button>
						</div>
						<div className="text-xs text-gray-500 mt-1">
							Number of analysis runs with the same provider
						</div>
					</div>
				)}

				{/* Cost Indicator */}
				<div className="bg-blue-50 p-3 rounded mb-4">
					<div className="text-sm font-medium">Estimated Cost Multiplier</div>
					<div className="text-lg">
						{config.mode === "multi-provider"
							? `${config.enabled_providers.length}x`
							: `${config.default_runs}x`}
					</div>
					<div className="text-xs text-gray-500 mt-1">
						{config.mode === "multi-provider"
							? `One analysis run per provider (${config.enabled_providers.length} providers)`
							: `Multiple runs with same provider (${config.default_runs} runs)`}
					</div>
				</div>

				<Button
					onClick={() => configMutation.mutate(config)}
					disabled={
						configMutation.isPending ||
						(config.mode === "multi-provider" &&
							config.enabled_providers.length === 0)
					}
					className="w-full"
				>
					{configMutation.isPending ? "Saving..." : "Save Configuration"}
				</Button>

				{config.mode === "multi-provider" &&
					config.enabled_providers.length === 0 && (
						<div className="text-sm text-red-500 mt-2 text-center">
							Please select at least one provider for multi-provider mode
						</div>
					)}
			</CardContent>
		</Card>
	);
};
