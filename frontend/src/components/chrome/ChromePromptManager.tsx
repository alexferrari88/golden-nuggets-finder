import type React from "react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Plus,
	Settings,
	Play,
	Clock,
	CheckCircle,
	AlertTriangle,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import type { ChromeExtensionPrompt } from "@/types";

export const ChromePromptManager: React.FC = () => {
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const queryClient = useQueryClient();

	const { data: prompts, isLoading } = useQuery({
		queryKey: ["chrome-prompts"],
		queryFn: apiClient.getChromePrompts,
	});

	const createPromptMutation = useMutation({
		mutationFn: apiClient.createChromePrompt,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["chrome-prompts"] });
			setIsCreateDialogOpen(false);
		},
	});

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center justify-between">
					<span>Chrome Extension Prompts</span>
					<Dialog
						open={isCreateDialogOpen}
						onOpenChange={setIsCreateDialogOpen}
					>
						<DialogTrigger asChild>
							<Button size="sm">
								<Plus className="h-4 w-4 mr-2" />
								Add Prompt
							</Button>
						</DialogTrigger>
						<DialogContent className="max-w-2xl">
							<DialogHeader>
								<DialogTitle>Create Chrome Extension Prompt</DialogTitle>
							</DialogHeader>
							<CreatePromptForm
								onSubmit={createPromptMutation.mutate}
								isLoading={createPromptMutation.isPending}
							/>
						</DialogContent>
					</Dialog>
				</CardTitle>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<div className="text-center py-4">Loading prompts...</div>
				) : (
					<div className="space-y-4">
						{prompts?.map((prompt) => (
							<ChromePromptCard key={prompt.id} prompt={prompt} />
						))}
						{(!prompts || prompts.length === 0) && (
							<div className="text-center py-8 text-gray-500">
								<Settings className="mx-auto h-12 w-12 text-gray-300 mb-4" />
								<p>No Chrome extension prompts registered</p>
								<p className="text-sm mt-1">
									Add prompts to enable optimization tracking
								</p>
							</div>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	);
};

const ChromePromptCard: React.FC<{
	prompt: ChromeExtensionPrompt;
}> = ({ prompt }) => {
	const [isOptimizing, setIsOptimizing] = useState(false);
	const queryClient = useQueryClient();

	const optimizeMutation = useMutation({
		mutationFn: () =>
			apiClient.optimizeChromePrompt(prompt.id, {
				mode: "multi-provider",
				enabled_providers: ["gemini", "openai"],
				default_runs: 3,
				provider_configurations: [
					{
						provider_id: "gemini",
						model_id: "gemini-2.5-flash",
						enabled: true,
					},
					{ provider_id: "openai", model_id: "gpt-4o-mini", enabled: true },
				],
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["chrome-prompts"] });
			setIsOptimizing(false);
		},
		onError: () => {
			setIsOptimizing(false);
		},
	});

	const getStatusIcon = (status: string) => {
		switch (status) {
			case "optimized":
				return <CheckCircle className="h-4 w-4 text-green-500" />;
			case "pending":
				return <Clock className="h-4 w-4 text-yellow-500" />;
			case "failed":
				return <AlertTriangle className="h-4 w-4 text-red-500" />;
			default:
				return <div className="h-4 w-4 rounded-full bg-gray-300" />;
		}
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case "optimized":
				return "default";
			case "pending":
				return "secondary";
			case "failed":
				return "destructive";
			default:
				return "outline";
		}
	};

	return (
		<Card className="border-l-4 border-l-blue-500">
			<CardContent className="p-4">
				<div className="flex items-start justify-between">
					<div className="flex-1">
						<div className="flex items-center gap-2 mb-2">
							<h3 className="font-medium">{prompt.prompt_name}</h3>
							<Badge variant={getStatusColor(prompt.optimization_status)}>
								{prompt.optimization_status}
							</Badge>
							<div className="text-xs text-gray-500">v{prompt.version}</div>
						</div>

						<div className="text-sm text-gray-600 mb-3">
							{prompt.full_prompt_content.substring(0, 150)}
							{prompt.full_prompt_content.length > 150 && "..."}
						</div>

						{prompt.last_optimized && (
							<div className="text-xs text-gray-500">
								Last optimized:{" "}
								{new Date(prompt.last_optimized).toLocaleString()}
							</div>
						)}
					</div>

					<div className="flex items-center gap-2">
						{getStatusIcon(prompt.optimization_status)}
						<Button
							size="sm"
							variant="outline"
							onClick={() => {
								setIsOptimizing(true);
								optimizeMutation.mutate();
							}}
							disabled={optimizeMutation.isPending || isOptimizing}
						>
							{optimizeMutation.isPending || isOptimizing ? (
								<>
									<Clock className="h-4 w-4 mr-2 animate-spin" />
									Optimizing...
								</>
							) : (
								<>
									<Play className="h-4 w-4 mr-2" />
									Optimize
								</>
							)}
						</Button>
					</div>
				</div>
			</CardContent>
		</Card>
	);
};

const CreatePromptForm: React.FC<{
	onSubmit: (data: {
		prompt_name: string;
		full_prompt_content: string;
	}) => void;
	isLoading: boolean;
}> = ({ onSubmit, isLoading }) => {
	const [formData, setFormData] = useState({
		prompt_name: "",
		full_prompt_content: "",
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (formData.prompt_name && formData.full_prompt_content) {
			onSubmit(formData);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div>
				<label className="text-sm font-medium block mb-1">Prompt Name</label>
				<Input
					value={formData.prompt_name}
					onChange={(e) =>
						setFormData((prev) => ({ ...prev, prompt_name: e.target.value }))
					}
					placeholder="e.g., Golden Nugget Extraction v2"
				/>
			</div>

			<div>
				<label className="text-sm font-medium block mb-1">Prompt Content</label>
				<Textarea
					value={formData.full_prompt_content}
					onChange={(e) =>
						setFormData((prev) => ({
							...prev,
							full_prompt_content: e.target.value,
						}))
					}
					placeholder="Enter the full Chrome extension prompt content..."
					rows={8}
					className="min-h-[200px]"
				/>
				<div className="text-xs text-gray-500 mt-1">
					Enter the complete prompt text as used in the Chrome extension
				</div>
			</div>

			<Button
				type="submit"
				disabled={
					isLoading || !formData.prompt_name || !formData.full_prompt_content
				}
				className="w-full"
			>
				{isLoading ? "Creating..." : "Create Prompt"}
			</Button>
		</form>
	);
};
