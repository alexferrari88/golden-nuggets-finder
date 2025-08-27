import { debugLogger } from "../../shared/debug";
import { GeminiDirectProvider } from "../../shared/providers/gemini-direct-provider";
import { LangChainAnthropicProvider } from "../../shared/providers/langchain-anthropic-provider";
import { LangChainOpenAIProvider } from "../../shared/providers/langchain-openai-provider";
import { LangChainOpenRouterProvider } from "../../shared/providers/langchain-openrouter-provider";
import { getModel } from "../../shared/storage/model-storage";
import type {
	LLMProvider,
	ProviderConfig,
	ProviderId,
} from "../../shared/types/providers";

export async function createProvider(
	config: ProviderConfig,
): Promise<LLMProvider> {
	debugLogger.log(
		`[ProviderFactory] Creating provider "${config.providerId}" with model "${config.modelName}"`,
	);

	// Validate configuration
	if (!config) {
		const error = new Error("Provider config is required");
		debugLogger.error(`[ProviderFactory] ${error.message}`);
		throw error;
	}

	if (!config.providerId) {
		const error = new Error("Provider ID is required");
		debugLogger.error(`[ProviderFactory] ${error.message}`);
		throw error;
	}

	if (!config.modelName) {
		const error = new Error(
			`Model name is required for provider "${config.providerId}"`,
		);
		debugLogger.error(`[ProviderFactory] ${error.message}`);
		throw error;
	}

	if (!config.apiKey || config.apiKey.trim().length === 0) {
		const error = new Error(
			`API key is required for provider "${config.providerId}"`,
		);
		debugLogger.error(`[ProviderFactory] ${error.message}`);
		throw error;
	}

	// Validate model against provider
	const isValidModel = validateModelForProvider(
		config.providerId,
		config.modelName,
	);
	if (!isValidModel) {
		debugLogger.warn(
			`[ProviderFactory] Model "${config.modelName}" may not be supported by provider "${config.providerId}", but proceeding anyway`,
		);
	}

	debugLogger.log(
		`[ProviderFactory] Configuration validated, creating provider "${config.providerId}" with model "${config.modelName}"`,
	);

	switch (config.providerId) {
		case "gemini":
			return new GeminiDirectProvider(config);

		case "openai":
			return new LangChainOpenAIProvider(config);

		case "anthropic":
			return new LangChainAnthropicProvider(config);

		case "openrouter":
			return new LangChainOpenRouterProvider(config);

		default: {
			const error = new Error(`Unsupported provider: ${config.providerId}`);
			debugLogger.error(`[ProviderFactory] ${error.message}`);
			throw error;
		}
	}
}

export function getDefaultModel(providerId: ProviderId): string {
	const defaults = {
		gemini: "gemini-2.5-flash",
		openai: "gpt-5-mini",
		anthropic: "claude-sonnet-4-20250514",
		openrouter: "openai/gpt-3.5-turbo",
	};
	const defaultModel = defaults[providerId];

	debugLogger.log(
		`[ProviderFactory] Using default model "${defaultModel}" for provider "${providerId}"`,
	);

	return defaultModel;
}

export function getSupportedProviders(): ProviderId[] {
	return ["gemini", "openai", "anthropic", "openrouter"];
}

/**
 * Get a list of commonly supported models for a provider (for validation)
 * Note: This is a subset of models for basic validation - actual model lists are fetched dynamically
 */
export function getKnownModelsForProvider(providerId: ProviderId): string[] {
	const knownModels = {
		gemini: [
			"gemini-2.5-flash",
			"gemini-2.5-flash-lite",
			"gemini-2.5-flash-8b",
			"gemini-2.0-flash-exp",
			"gemini-1.5-flash",
			"gemini-1.5-flash-8b",
			"gemini-1.5-pro",
		],
		openai: [
			"gpt-4.1-mini",
			"gpt-4o",
			"gpt-4o-mini",
			"gpt-4-turbo",
			"gpt-4",
			"gpt-3.5-turbo",
		],
		anthropic: [
			"claude-sonnet-4-20250514",
			"claude-3-5-sonnet-20241022",
			"claude-3-5-haiku-20241022",
			"claude-3-opus-20240229",
		],
		openrouter: [
			"openai/gpt-3.5-turbo",
			"openai/gpt-4",
			"anthropic/claude-3-sonnet",
			"meta-llama/llama-2-70b-chat",
		],
	};

	return knownModels[providerId] || [];
}

/**
 * Validate if a model name appears to be supported by a provider
 * This is a basic validation - actual model availability should be checked via API
 */
export function validateModelForProvider(
	providerId: ProviderId,
	modelName: string,
): boolean {
	if (!modelName || typeof modelName !== "string") {
		debugLogger.warn(`[ProviderFactory] Invalid model name: "${modelName}"`);
		return false;
	}

	const knownModels = getKnownModelsForProvider(providerId);
	const isKnownModel = knownModels.includes(modelName);

	debugLogger.log(
		`[ProviderFactory] Model validation for "${modelName}" on provider "${providerId}": ${isKnownModel ? "VALID" : "UNKNOWN (may still work)"}`,
	);

	// For now, we return true even for unknown models since providers may have newer models
	// But we log a warning for truly suspicious model names
	if (!isKnownModel) {
		debugLogger.warn(
			`[ProviderFactory] Model "${modelName}" not in known list for provider "${providerId}". Known models: ${knownModels.join(", ")}`,
		);
	}

	return true; // Allow unknown models but log warnings
}

/**
 * Get the user-selected model for a provider, with fallback to default
 */
export async function getSelectedModel(
	providerId: ProviderId,
): Promise<string> {
	debugLogger.log(
		`[ProviderFactory] Getting selected model for provider "${providerId}"`,
	);

	// Validate provider ID
	if (!getSupportedProviders().includes(providerId)) {
		debugLogger.error(
			`[ProviderFactory] Unsupported provider: "${providerId}"`,
		);
		throw new Error(`Unsupported provider: ${providerId}`);
	}

	const selectedModel = await getModel(providerId);

	if (selectedModel) {
		debugLogger.log(
			`[ProviderFactory] User has selected model "${selectedModel}" for provider "${providerId}"`,
		);

		// Validate the selected model
		const isValidModel = validateModelForProvider(providerId, selectedModel);
		if (!isValidModel) {
			debugLogger.warn(
				`[ProviderFactory] Selected model "${selectedModel}" failed validation for provider "${providerId}", falling back to default`,
			);
			const defaultModel = getDefaultModel(providerId);
			debugLogger.log(
				`[ProviderFactory] Final model for provider "${providerId}": "${defaultModel}" (default due to validation failure)`,
			);
			return defaultModel;
		}

		debugLogger.log(
			`[ProviderFactory] Using validated user-selected model "${selectedModel}" for provider "${providerId}"`,
		);
		return selectedModel;
	} else {
		debugLogger.warn(
			`[ProviderFactory] No user-selected model for provider "${providerId}", falling back to default`,
		);
		const defaultModel = getDefaultModel(providerId);
		debugLogger.log(
			`[ProviderFactory] Final model for provider "${providerId}": "${defaultModel}" (default)`,
		);
		return defaultModel;
	}
}

/**
 * Create a provider using the user-selected model (convenience method)
 */
export async function createProviderWithSelectedModel(
	providerId: ProviderId,
	apiKey: string,
): Promise<LLMProvider> {
	debugLogger.log(
		`[ProviderFactory] Creating provider "${providerId}" with user-selected model`,
	);

	const modelName = await getSelectedModel(providerId);

	debugLogger.log(
		`[ProviderFactory] Final configuration: provider="${providerId}", model="${modelName}"`,
	);

	return createProvider({
		providerId,
		apiKey,
		modelName,
	});
}

/**
 * Comprehensive validation function to debug model selection issues
 * Returns detailed information about the entire model selection flow
 */
export async function debugModelSelection(providerId: ProviderId): Promise<{
	providerId: ProviderId;
	isSupported: boolean;
	storedModel: string | null;
	defaultModel: string;
	selectedModel: string;
	isStoredModelValid: boolean;
	isDefaultUsed: boolean;
	validationIssues: string[];
}> {
	debugLogger.log(
		`[ProviderFactory] === DEBUGGING MODEL SELECTION FOR ${providerId} ===`,
	);

	const validationIssues: string[] = [];

	// Check if provider is supported
	const supportedProviders = getSupportedProviders();
	const isSupported = supportedProviders.includes(providerId);
	if (!isSupported) {
		validationIssues.push(
			`Provider "${providerId}" is not in supported list: ${supportedProviders.join(", ")}`,
		);
	}

	// Get stored model
	const storedModel = await getModel(providerId);
	debugLogger.log(
		`[ProviderFactory] Stored model for ${providerId}: ${storedModel || "null"}`,
	);

	// Get default model
	const defaultModel = getDefaultModel(providerId);
	debugLogger.log(
		`[ProviderFactory] Default model for ${providerId}: ${defaultModel}`,
	);

	// Validate stored model if it exists
	let isStoredModelValid = true;
	if (storedModel) {
		isStoredModelValid = validateModelForProvider(providerId, storedModel);
		if (!isStoredModelValid) {
			validationIssues.push(
				`Stored model "${storedModel}" failed validation for provider "${providerId}"`,
			);
		}
	}

	// Get final selected model (what would actually be used)
	const selectedModel = await getSelectedModel(providerId);
	const isDefaultUsed = selectedModel === defaultModel;

	const result = {
		providerId,
		isSupported,
		storedModel,
		defaultModel,
		selectedModel,
		isStoredModelValid,
		isDefaultUsed,
		validationIssues,
	};

	debugLogger.log(
		`[ProviderFactory] Model selection debug result:`,
		JSON.stringify(result, null, 2),
	);
	debugLogger.log(
		`[ProviderFactory] === END MODEL SELECTION DEBUG FOR ${providerId} ===`,
	);

	return result;
}
