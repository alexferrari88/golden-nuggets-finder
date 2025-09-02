import { debugLogger } from "../../shared/debug";
import { GeminiDirectProvider } from "../../shared/providers/gemini-direct-provider";
import { LangChainAnthropicProvider } from "../../shared/providers/langchain-anthropic-provider";
import { LangChainOpenAIProvider } from "../../shared/providers/langchain-openai-provider";
import { LangChainOpenRouterProvider } from "../../shared/providers/langchain-openrouter-provider";
import { storage } from "../../shared/storage";
import { getApiKey } from "../../shared/storage/api-key-storage";
import { getModel } from "../../shared/storage/model-storage";
import type {
	LLMProvider,
	ProviderConfig,
	ProviderId,
} from "../../shared/types/providers";
import { ModelService } from "./model-service";

export async function createProvider(
	config: ProviderConfig,
): Promise<LLMProvider> {
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

	// Validate model against provider using enhanced validation
	const isValidModel = await validateModelForProvider(
		config.providerId,
		config.modelName,
		true, // Use dynamic validation
	);
	if (!isValidModel) {
		debugLogger.warn(
			`[ProviderFactory] Model "${config.modelName}" may not be supported by provider "${config.providerId}", but proceeding anyway`,
		);
	}

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
		gemini: "gemini-2.5-flash-lite",
		openai: "gpt-4o-mini",
		anthropic: "claude-sonnet-4-20250514",
		openrouter: "moonshotai/kimi-k2:free",
	};
	return defaults[providerId];
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
			"gemini-2.5-pro"
		],
		openai: [
			"gpt-4.1-mini",
			"gpt-5-mini",
			"gpt-5-nano",
			"gpt-5",
		],
		anthropic: [
			"claude-sonnet-4-20250514",
			"claude-3-5-sonnet-20241022",
			"claude-3-5-haiku-20241022",
			"claude-3-opus-20240229",
		],
		openrouter: [
			"moonshotai/kimi-k2:free",
			"openai/gpt-5-mini",
			"anthropic/claude-4-sonnet",
			"meta-llama/llama-2-70b-chat",
		],
	};

	return knownModels[providerId] || [];
}

// Cache for dynamic validation results (5 minute TTL)
const dynamicValidationCache = new Map<string, { result: boolean; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Enhanced dynamic validation that checks against real-time model availability
 * Includes caching for performance optimization
 */
async function validateModelDynamically(
	providerId: ProviderId,
	modelId: string,
): Promise<boolean> {
	try {
		// Check cache first
		const cacheKey = `${providerId}:${modelId}`;
		const cached = dynamicValidationCache.get(cacheKey);
		if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
			return cached.result;
		}

		// Handle Gemini's special API key retrieval
		let apiKey: string;
		if (providerId === "gemini") {
			try {
				apiKey = await storage.getApiKey({
					source: "background",
					action: "read",
					timestamp: Date.now(),
				});
			} catch (_error) {
				// Fall back to regular API key storage for other providers
				apiKey = (await getApiKey(providerId)) || "";
			}
		} else {
			apiKey = (await getApiKey(providerId)) || "";
		}

		if (!apiKey) {
			// Cache negative result for missing API key
			dynamicValidationCache.set(cacheKey, { result: false, timestamp: Date.now() });
			return false;
		}

		const result = await ModelService.fetchModels(providerId, apiKey);
		if (result.error) {
			// Don't cache API errors, allow retry
			return false;
		}

		const isValid = result.models.some((model) => model.id === modelId);
		
		// Cache the result
		dynamicValidationCache.set(cacheKey, { result: isValid, timestamp: Date.now() });
		
		return isValid;
	} catch {
		return false; // Fall back to static validation
	}
}

/**
 * Enhanced model validation with dynamic API checking
 * Uses both static and dynamic validation with smart warning logic
 */
export async function validateModelForProvider(
	providerId: ProviderId,
	modelName: string,
	useDynamicValidation: boolean = true,
): Promise<boolean> {
	if (!modelName || typeof modelName !== "string") {
		debugLogger.warn(`[ProviderFactory] Invalid model name: "${modelName}"`);
		return false;
	}

	// First check static validation
	const knownModels = getKnownModelsForProvider(providerId);
	const isKnownModel = knownModels.includes(modelName);

	// If model is statically known, no need for dynamic validation
	if (isKnownModel) {
		return true;
	}

	// If dynamic validation is disabled, use static validation only
	if (!useDynamicValidation) {
		debugLogger.warn(
			`[ProviderFactory] Model "${modelName}" not in known list for provider "${providerId}". Known models: ${knownModels.join(", ")}`,
		);
		return true; // Allow unknown models but log warnings
	}

	// Try dynamic validation for unknown models
	try {
		const isDynamicallyValid = await validateModelDynamically(providerId, modelName);
		
		if (isDynamicallyValid) {
			// Model is valid according to API, no warning needed
			debugLogger.log(
				`[ProviderFactory] Model "${modelName}" verified via API for provider "${providerId}"`,
			);
			return true;
		} else {
			// Both static and dynamic validation failed
			debugLogger.warn(
				`[ProviderFactory] Model "${modelName}" not found via API for provider "${providerId}". Known models: ${knownModels.join(", ")}`,
			);
			return true; // Still allow but warn since API might be incomplete
		}
	} catch (error) {
		// Dynamic validation failed, fall back to static with warning
		debugLogger.warn(
			`[ProviderFactory] Could not verify model "${modelName}" via API for provider "${providerId}" (${error}). Allowing anyway. Known models: ${knownModels.join(", ")}`,
		);
		return true; // Allow unknown models when API validation fails
	}
}

/**
 * Get the user-selected model for a provider, with fallback to default
 */
export async function getSelectedModel(
	providerId: ProviderId,
): Promise<string> {
	// Validate provider ID
	if (!getSupportedProviders().includes(providerId)) {
		debugLogger.error(
			`[ProviderFactory] Unsupported provider: "${providerId}"`,
		);
		throw new Error(`Unsupported provider: ${providerId}`);
	}

	const selectedModel = await getModel(providerId);

	if (selectedModel) {
		// Validate the selected model using enhanced validation
		const isValidModel = await validateModelForProvider(providerId, selectedModel, true);
		if (!isValidModel) {
			debugLogger.warn(
				`[ProviderFactory] Selected model "${selectedModel}" failed validation for provider "${providerId}", falling back to default`,
			);
			return getDefaultModel(providerId);
		}

		return selectedModel;
	} else {
		return getDefaultModel(providerId);
	}
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

	// Get default model
	const defaultModel = getDefaultModel(providerId);

	// Validate stored model if it exists
	let isStoredModelValid = true;
	if (storedModel) {
		isStoredModelValid = await validateModelForProvider(providerId, storedModel, true);
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
		`[ProviderFactory] === END MODEL SELECTION DEBUG FOR ${providerId} ===`,
		JSON.stringify(result, null, 2),
	);

	return result;
}

// Bulk provider creation for multi-provider ensemble
export async function createMultipleProviders(
	configurations: Array<{
		providerId: ProviderId;
		modelId: string;
	}>,
): Promise<
	Array<{
		providerId: ProviderId;
		modelId: string;
		provider: LLMProvider;
	}>
> {
	const results = await Promise.allSettled(
		configurations.map(async (config) => {
			try {
				// Handle Gemini's special API key retrieval using SecurityManager
				let apiKey: string;
				if (config.providerId === "gemini") {
					try {
						apiKey = await storage.getApiKey({
							source: "background",
							action: "read",
							timestamp: Date.now(),
						});
					} catch (error) {
						console.error(
							`Failed to retrieve Gemini API key for ensemble:`,
							error,
						);
						apiKey = "";
					}
				} else {
					apiKey = (await getApiKey(config.providerId)) || "";
				}

				if (!apiKey) {
					throw new Error(`No API key configured for ${config.providerId}`);
				}

				// Dynamic validation is now handled in createProvider()

				const providerConfig: ProviderConfig = {
					providerId: config.providerId,
					modelName: config.modelId,
					apiKey,
				};

				const provider = await createProvider(providerConfig);

				return {
					providerId: config.providerId,
					modelId: config.modelId,
					provider,
				};
			} catch (error) {
				console.error(`Failed to create provider ${config.providerId}:`, error);
				throw error;
			}
		}),
	);

	// Return only successful provider creations, filter out failures
	return results
		.filter(
			(result): result is PromiseFulfilledResult<any> =>
				result.status === "fulfilled",
		)
		.map((result) => result.value);
}

// Validate provider configurations before creating providers
export function validateProviderConfigurations(
	configurations: Array<{
		providerId: ProviderId;
		modelId: string;
	}>,
): { valid: boolean; errors: string[] } {
	const errors: string[] = [];

	if (configurations.length === 0) {
		errors.push("At least one provider configuration is required");
	}

	if (configurations.length > 5) {
		errors.push("Maximum 5 providers allowed for ensemble mode");
	}

	// Check for duplicate provider+model combinations
	const seen = new Set<string>();
	for (const config of configurations) {
		const key = `${config.providerId}:${config.modelId}`;
		if (seen.has(key)) {
			errors.push(
				`Duplicate configuration: ${config.providerId} with ${config.modelId}`,
			);
		}
		seen.add(key);
	}

	// Validate each provider configuration
	for (const config of configurations) {
		if (!config.providerId || !config.modelId) {
			errors.push(
				"Provider ID and Model ID are required for all configurations",
			);
		}
	}

	return {
		valid: errors.length === 0,
		errors,
	};
}
