import type { ProviderId } from "../../shared/types/providers";

export interface ModelInfo {
	id: string;
	name: string;
	description?: string;
	contextLength?: number;
}

export interface ModelListResponse {
	models: ModelInfo[];
	error?: string;
}

export class ModelService {
	private static readonly FETCH_TIMEOUT = 10000; // 10 seconds
	private static readonly MAX_DESCRIPTION_LENGTH = 100; // Maximum characters for description display

	/**
	 * Truncates a description to a reasonable length for UI display
	 */
	static truncateDescription(description: string | undefined, maxLength: number = this.MAX_DESCRIPTION_LENGTH): string | undefined {
		if (!description) return description;
		if (description.length <= maxLength) return description;
		
		// Find the last complete word before the limit
		const truncated = description.substring(0, maxLength);
		const lastSpaceIndex = truncated.lastIndexOf(' ');
		
		if (lastSpaceIndex > maxLength * 0.8) { // Only truncate at word boundary if it's not too early
			return truncated.substring(0, lastSpaceIndex) + '...';
		}
		
		return truncated + '...';
	}

	/**
	 * Fetches available models for the specified provider
	 */
	static async fetchModels(
		providerId: ProviderId,
		apiKey: string,
	): Promise<ModelListResponse> {
		try {
			switch (providerId) {
				case "gemini":
					return await this.fetchGeminiModels(apiKey);
				case "openai":
					return await this.fetchOpenAIModels(apiKey);
				case "anthropic":
					return await this.fetchAnthropicModels(apiKey);
				case "openrouter":
					return await this.fetchOpenRouterModels(apiKey);
				default:
					return {
						models: [],
						error: `Unsupported provider: ${providerId}`,
					};
			}
		} catch (error) {
			console.error(`Failed to fetch models for ${providerId}:`, error);
			return {
				models: [],
				error: `Failed to fetch models: ${error instanceof Error ? error.message : "Unknown error"}`,
			};
		}
	}

	/**
	 * Fetch available models from Google Gemini API
	 */
	private static async fetchGeminiModels(
		apiKey: string,
	): Promise<ModelListResponse> {
		const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`;

		const response = await this.fetchWithTimeout(url);

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		const data = await response.json();

		// Filter models that support generateContent
		const textGenerationModels = data.models
			?.filter(
				(model: any) =>
					model.supportedGenerationMethods?.includes("generateContent"),
			)
			.map((model: any) => ({
				id: model.name.replace("models/", ""), // Remove "models/" prefix
				name: model.displayName || model.name.replace("models/", ""),
				description: model.description,
				contextLength: model.inputTokenLimit,
			}));

		return {
			models: textGenerationModels || [],
		};
	}

	/**
	 * Fetch available models from OpenAI API
	 */
	private static async fetchOpenAIModels(
		apiKey: string,
	): Promise<ModelListResponse> {
		const url = "https://api.openai.com/v1/models";

		const response = await this.fetchWithTimeout(url, {
			headers: {
				Authorization: `Bearer ${apiKey}`,
			},
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		const data = await response.json();

		// Filter for chat/completion models (exclude embeddings, fine-tuning, etc.)
		const chatModels = data.data
			?.filter((model: any) => {
				const modelId = model.id.toLowerCase();
				return (
					(modelId.includes("gpt") ||
						modelId.includes("o1") ||
						modelId.includes("o3")) &&
					!modelId.includes("embed") &&
					!modelId.includes("whisper") &&
					!modelId.includes("tts") &&
					!modelId.includes("davinci-002") &&
					!modelId.includes("babbage-002")
				);
			})
			.map((model: any) => ({
				id: model.id,
				name: model.id,
				description: `OpenAI ${model.id}`,
			}));

		return {
			models: chatModels || [],
		};
	}

	/**
	 * Fetch available models from Anthropic API
	 */
	private static async fetchAnthropicModels(
		apiKey: string,
	): Promise<ModelListResponse> {
		const url = "https://api.anthropic.com/v1/models";

		const response = await this.fetchWithTimeout(url, {
			headers: {
				"x-api-key": apiKey,
				"anthropic-version": "2023-06-01",
			},
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		const data = await response.json();

		const models = data.data?.map((model: any) => ({
			id: model.id,
			name: model.display_name || model.id,
			description: `Anthropic ${model.display_name || model.id}`,
		}));

		return {
			models: models || [],
		};
	}

	/**
	 * Fetch available models from OpenRouter API
	 */
	private static async fetchOpenRouterModels(
		apiKey: string,
	): Promise<ModelListResponse> {
		const url = "https://openrouter.ai/api/v1/models";

		// OpenRouter doesn't require auth for listing models, but we include it if provided
		const headers: Record<string, string> = {};
		if (apiKey) {
			headers.Authorization = `Bearer ${apiKey}`;
		}

		const response = await this.fetchWithTimeout(url, { headers });

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		const data = await response.json();

		// Filter for text generation models and sort by popularity/cost
		const textModels = data.data
			?.filter((model: any) => {
				const modality = model.architecture?.modality;
				return modality === "text->text" || modality === "text+image->text";
			})
			.map((model: any) => ({
				id: model.id,
				name: model.name || model.id,
				description: model.description,
				contextLength: model.context_length,
			}))
			.sort((a: any, b: any) => {
				// Prioritize popular models
				const popularModels = [
					"openai/gpt-4o",
					"anthropic/claude-sonnet-4",
					"anthropic/claude-3.5-sonnet",
					"openai/gpt-4",
					"google/gemini-pro",
				];
				const aIndex = popularModels.indexOf(a.id);
				const bIndex = popularModels.indexOf(b.id);

				if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
				if (aIndex !== -1) return -1;
				if (bIndex !== -1) return 1;
				return a.name.localeCompare(b.name);
			});

		return {
			models: textModels || [],
		};
	}

	/**
	 * Utility method to fetch with timeout
	 */
	private static async fetchWithTimeout(
		url: string,
		options?: RequestInit,
	): Promise<Response> {
		const controller = new AbortController();
		const timeoutId = setTimeout(
			() => controller.abort(),
			this.FETCH_TIMEOUT,
		);

		try {
			const response = await fetch(url, {
				...options,
				signal: controller.signal,
			});
			clearTimeout(timeoutId);
			return response;
		} catch (error) {
			clearTimeout(timeoutId);
			if (error instanceof Error && error.name === "AbortError") {
				throw new Error("Request timeout");
			}
			throw error;
		}
	}

	/**
	 * Get hardcoded fallback models when API calls fail
	 */
	static getFallbackModels(providerId: ProviderId): ModelInfo[] {
		const fallbackModels = {
			gemini: [
				{
					id: "gemini-2.5-flash",
					name: "Gemini 2.5 Flash",
					description: "Fast, cost-effective model",
				},
				{
					id: "gemini-2.5-pro",
					name: "Gemini 2.5 Pro",
					description: "Most capable model with enhanced reasoning",
				},
				{
					id: "gemini-2.0-flash",
					name: "Gemini 2.0 Flash",
					description: "Next-gen capabilities with superior speed",
				},
			],
			openai: [
				{
					id: "gpt-4o",
					name: "GPT-4o",
					description: "Latest multimodal model",
				},
				{
					id: "gpt-4",
					name: "GPT-4",
					description: "High accuracy for complex problems",
				},
				{
					id: "gpt-3.5-turbo",
					name: "GPT-3.5 Turbo",
					description: "Cost-effective option",
				},
			],
			anthropic: [
				{
					id: "claude-sonnet-4-20250514",
					name: "Claude Sonnet 4",
					description: "Latest Claude model with enhanced capabilities",
				},
				{
					id: "claude-3-5-sonnet-20241022",
					name: "Claude 3.5 Sonnet",
					description: "High intelligence and performance",
				},
				{
					id: "claude-3-5-haiku-20241022",
					name: "Claude 3.5 Haiku",
					description: "Fastest Claude model",
				},
			],
			openrouter: [
				{
					id: "openai/gpt-4o",
					name: "GPT-4o (via OpenRouter)",
					description: "GPT-4o through OpenRouter",
				},
				{
					id: "anthropic/claude-sonnet-4",
					name: "Claude Sonnet 4 (via OpenRouter)",
					description: "Claude Sonnet 4 through OpenRouter",
				},
				{
					id: "google/gemini-pro",
					name: "Gemini Pro (via OpenRouter)",
					description: "Gemini Pro through OpenRouter",
				},
			],
		};

		return fallbackModels[providerId] || [];
	}
}