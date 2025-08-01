import { GeminiDirectProvider } from "../../shared/providers/gemini-direct-provider";
import { LangChainAnthropicProvider } from "../../shared/providers/langchain-anthropic-provider";
import { LangChainOpenAIProvider } from "../../shared/providers/langchain-openai-provider";
import { LangChainOpenRouterProvider } from "../../shared/providers/langchain-openrouter-provider";
import { ModelStorage } from "../../shared/storage/model-storage";
import type {
	LLMProvider,
	ProviderConfig,
	ProviderId,
} from "../../shared/types/providers";

export async function createProvider(
	config: ProviderConfig,
): Promise<LLMProvider> {
	switch (config.providerId) {
		case "gemini":
			return new GeminiDirectProvider(config);

		case "openai":
			return new LangChainOpenAIProvider(config);

		case "anthropic":
			return new LangChainAnthropicProvider(config);

		case "openrouter":
			return new LangChainOpenRouterProvider(config);

		default:
			throw new Error(`Unsupported provider: ${config.providerId}`);
	}
}

export function getDefaultModel(providerId: ProviderId): string {
	const defaults = {
		gemini: "gemini-2.5-flash",
		openai: "gpt-4.1-mini",
		anthropic: "claude-sonnet-4-20250514",
		openrouter: "openai/gpt-3.5-turbo",
	};
	return defaults[providerId];
}

export function getSupportedProviders(): ProviderId[] {
	return ["gemini", "openai", "anthropic", "openrouter"];
}

/**
 * Get the user-selected model for a provider, with fallback to default
 */
export async function getSelectedModel(
	providerId: ProviderId,
): Promise<string> {
	const selectedModel = await ModelStorage.get(providerId);
	return selectedModel || getDefaultModel(providerId);
}

/**
 * Create a provider using the user-selected model (convenience method)
 */
export async function createProviderWithSelectedModel(
	providerId: ProviderId,
	apiKey: string,
): Promise<LLMProvider> {
	const modelName = await getSelectedModel(providerId);
	return createProvider({
		providerId,
		apiKey,
		modelName,
	});
}
