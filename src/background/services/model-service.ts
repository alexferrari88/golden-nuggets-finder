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

// API response types
interface GeminiModel {
	name: string;
	displayName?: string;
	description?: string;
	inputTokenLimit?: number;
	supportedGenerationMethods?: string[];
}

interface GeminiApiResponse {
	models?: GeminiModel[];
}

interface OpenAIModel {
	id: string;
	owner?: string;
	created?: number;
}

interface OpenAIApiResponse {
	data?: OpenAIModel[];
}

interface AnthropicModel {
	id: string;
	display_name?: string;
	created_at?: string;
}

interface AnthropicApiResponse {
	data?: AnthropicModel[];
}

interface OpenRouterModel {
	id: string;
	name?: string;
	description?: string;
	context_length?: number;
	architecture?: {
		modality?: string;
	};
}

interface OpenRouterApiResponse {
	data?: OpenRouterModel[];
}

// Constants
const FETCH_TIMEOUT = 10000; // 10 seconds
const MAX_DESCRIPTION_LENGTH = 100; // Maximum characters for description display

/**
 * Truncates a description to a reasonable length for UI display
 */
function truncateDescription(
	description: string | undefined,
	maxLength: number = MAX_DESCRIPTION_LENGTH,
): string | undefined {
	if (!description) return description;
	if (description.length <= maxLength) return description;

	// Find the last complete word before the limit
	const truncated = description.substring(0, maxLength);
	const lastSpaceIndex = truncated.lastIndexOf(" ");

	if (lastSpaceIndex > maxLength * 0.8) {
		// Only truncate at word boundary if it's not too early
		return `${truncated.substring(0, lastSpaceIndex)}...`;
	}

	return `${truncated}...`;
}

/**
 * Fetches available models for the specified provider
 */
async function fetchModels(
	providerId: ProviderId,
	apiKey: string,
): Promise<ModelListResponse> {
	try {
		switch (providerId) {
			case "gemini":
				return await fetchGeminiModels(apiKey);
			case "openai":
				return await fetchOpenAIModels(apiKey);
			case "anthropic":
				return await fetchAnthropicModels(apiKey);
			case "openrouter":
				return await fetchOpenRouterModels(apiKey);
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
async function fetchGeminiModels(apiKey: string): Promise<ModelListResponse> {
	const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`;

	const response = await fetchWithTimeout(url);

	if (!response.ok) {
		throw new Error(`HTTP ${response.status}: ${response.statusText}`);
	}

	const data: GeminiApiResponse = await response.json();

	// Filter models that support generateContent
	const textGenerationModels = data.models
		?.filter((model: GeminiModel) =>
			model.supportedGenerationMethods?.includes("generateContent"),
		)
		.map((model: GeminiModel) => ({
			id: model.name.replace("models/", ""), // Remove "models/" prefix
			name: model.displayName || model.name.replace("models/", ""),
			description: model.description,
			contextLength: model.inputTokenLimit,
		}))
		.sort((a: ModelInfo, b: ModelInfo) => (a.name || a.id).localeCompare(b.name || b.id));

	return {
		models: textGenerationModels || [],
	};
}

/**
 * Fetch available models from OpenAI API
 */
async function fetchOpenAIModels(apiKey: string): Promise<ModelListResponse> {
	const url = "https://api.openai.com/v1/models";

	const response = await fetchWithTimeout(url, {
		headers: {
			Authorization: `Bearer ${apiKey}`,
		},
	});

	if (!response.ok) {
		throw new Error(`HTTP ${response.status}: ${response.statusText}`);
	}

	const data: OpenAIApiResponse = await response.json();

	// Filter for chat/completion models (exclude embeddings, fine-tuning, etc.)
	const chatModels = data.data
		?.filter((model: OpenAIModel) => {
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
		.map((model: OpenAIModel) => ({
			id: model.id,
			name: model.id,
			description: `OpenAI ${model.id}`,
		}))
		.sort((a: ModelInfo, b: ModelInfo) => (a.name || a.id).localeCompare(b.name || b.id));

	return {
		models: chatModels || [],
	};
}

/**
 * Fetch available models from Anthropic API
 */
async function fetchAnthropicModels(
	apiKey: string,
): Promise<ModelListResponse> {
	const url = "https://api.anthropic.com/v1/models";

	const response = await fetchWithTimeout(url, {
		headers: {
			"x-api-key": apiKey,
			"anthropic-version": "2023-06-01",
		},
	});

	if (!response.ok) {
		throw new Error(`HTTP ${response.status}: ${response.statusText}`);
	}

	const data: AnthropicApiResponse = await response.json();

	const models = data.data
		?.map((model: AnthropicModel) => ({
			id: model.id,
			name: model.display_name || model.id,
			description: `Anthropic ${model.display_name || model.id}`,
		}))
		.sort((a: ModelInfo, b: ModelInfo) => (a.name || a.id).localeCompare(b.name || b.id));

	return {
		models: models || [],
	};
}

/**
 * Fetch available models from OpenRouter API
 */
async function fetchOpenRouterModels(
	apiKey: string,
): Promise<ModelListResponse> {
	const url = "https://openrouter.ai/api/v1/models";

	// OpenRouter doesn't require auth for listing models, but we include it if provided
	const headers: Record<string, string> = {};
	if (apiKey) {
		headers.Authorization = `Bearer ${apiKey}`;
	}

	const response = await fetchWithTimeout(url, { headers });

	if (!response.ok) {
		throw new Error(`HTTP ${response.status}: ${response.statusText}`);
	}

	const data: OpenRouterApiResponse = await response.json();

	// Filter for text generation models and sort by popularity/cost
	const textModels = data.data
		?.filter((model: OpenRouterModel) => {
			const modality = model.architecture?.modality;
			return modality === "text->text" || modality === "text+image->text";
		})
		.map((model: OpenRouterModel) => ({
			id: model.id,
			name: model.name || model.id,
			description: model.description,
			contextLength: model.context_length,
		}))
		.sort((a: ModelInfo, b: ModelInfo) => (a.name || a.id).localeCompare(b.name || b.id));

	return {
		models: textModels || [],
	};
}

/**
 * Utility method to fetch with timeout
 */
async function fetchWithTimeout(
	url: string,
	options?: RequestInit,
): Promise<Response> {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

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
function getFallbackModels(providerId: ProviderId): ModelInfo[] {
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

// Export service object that maintains the same API for backward compatibility
export const ModelService = {
	fetchModels,
	getFallbackModels,
	truncateDescription,
	// Internal method exposed for testing purposes only
	fetchWithTimeout,
};
