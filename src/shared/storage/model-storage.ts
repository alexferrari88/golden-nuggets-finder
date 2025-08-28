import { debugLogger } from "../debug";
import type { ProviderId } from "../types/providers";

const KEY_PREFIX = "selected_model_";

/**
 * Store the selected model for a provider
 */
export async function storeModel(
	providerId: ProviderId,
	modelName: string,
): Promise<void> {
	// Validate inputs
	if (!providerId || typeof providerId !== "string") {
		const error = new Error(`Invalid providerId: "${providerId}"`);
		debugLogger.error(`[ModelStorage] ${error.message}`);
		throw error;
	}

	if (
		!modelName ||
		typeof modelName !== "string" ||
		modelName.trim().length === 0
	) {
		const error = new Error(`Invalid modelName: "${modelName}"`);
		debugLogger.error(`[ModelStorage] ${error.message}`);
		throw error;
	}

	const trimmedModelName = modelName.trim();
	const storageKey = `${KEY_PREFIX}${providerId}`;

	try {
		// Check if chrome storage is available
		if (!chrome?.storage?.local) {
			const error = new Error("Chrome storage API not available");
			debugLogger.error(`[ModelStorage] ${error.message}`);
			throw error;
		}

		await chrome.storage.local.set({
			[storageKey]: trimmedModelName,
		});

		// Verify the storage worked by reading it back
		const verification = await chrome.storage.local.get(storageKey);
		const storedValue = verification[storageKey];

		if (storedValue !== trimmedModelName) {
			const error = new Error(
				`Storage verification failed: expected "${trimmedModelName}", got "${storedValue}"`,
			);
			debugLogger.error(`[ModelStorage] ${error.message}`);
			throw error;
		}
	} catch (error) {
		debugLogger.error(
			`[ModelStorage] Failed to store model for provider "${providerId}":`,
			error,
		);
		throw error;
	}
}

/**
 * Get the selected model for a provider, returns null if not set
 */
export async function getModel(providerId: ProviderId): Promise<string | null> {
	const storageKey = `${KEY_PREFIX}${providerId}`;

	// Validate input
	if (!providerId || typeof providerId !== "string") {
		debugLogger.error(`[ModelStorage] Invalid providerId: "${providerId}"`);
		return null;
	}

	try {
		// Check if chrome storage is available
		if (!chrome?.storage?.local) {
			debugLogger.error("[ModelStorage] Chrome storage API not available");
			return null;
		}

		const result = await chrome.storage.local.get(storageKey);
		const storedValue = result[storageKey];

		// More explicit handling of falsy values vs null/undefined
		let returnValue: string | null = null;
		if (
			storedValue &&
			typeof storedValue === "string" &&
			storedValue.trim().length > 0
		) {
			returnValue = storedValue.trim();
		}

		return returnValue;
	} catch (error) {
		debugLogger.error(
			`[ModelStorage] Failed to retrieve model for provider "${providerId}":`,
			error,
		);
		return null;
	}
}

/**
 * Remove the selected model for a provider (will fallback to default)
 */
export async function removeModel(providerId: ProviderId): Promise<void> {
	await chrome.storage.local.remove(`${KEY_PREFIX}${providerId}`);
}

/**
 * Get all selected models for all providers (with fallbacks handled by caller)
 */
export async function getAllModels(): Promise<
	Record<ProviderId, string | null>
> {
	const providers: ProviderId[] = [
		"gemini",
		"openai",
		"anthropic",
		"openrouter",
	];
	const models: Record<ProviderId, string | null> = {} as Record<
		ProviderId,
		string | null
	>;

	// Get all models in parallel
	const modelPromises = providers.map(async (providerId) => {
		const model = await getModel(providerId);
		return { providerId, model };
	});

	const results = await Promise.all(modelPromises);

	// Build the record
	for (const { providerId, model } of results) {
		models[providerId] = model;
	}

	return models;
}

/**
 * Set selected models for multiple providers at once
 */
export async function setAllModels(
	models: Partial<Record<ProviderId, string>>,
): Promise<void> {
	const updates: Record<string, string> = {};

	for (const [providerId, modelName] of Object.entries(models)) {
		if (modelName) {
			updates[`${KEY_PREFIX}${providerId}`] = modelName;
		}
	}

	if (Object.keys(updates).length > 0) {
		await chrome.storage.local.set(updates);
	}
}

/**
 * Check if a custom model is selected (different from default)
 */
export async function hasCustomModel(providerId: ProviderId): Promise<boolean> {
	const result = await chrome.storage.local.get(`${KEY_PREFIX}${providerId}`);
	return !!result[`${KEY_PREFIX}${providerId}`];
}

/**
 * Reset to default model for a provider
 */
export async function resetToDefaultModel(
	providerId: ProviderId,
): Promise<void> {
	await removeModel(providerId);
}

/**
 * Reset all providers to their default models
 */
export async function resetAllToDefaultModels(): Promise<void> {
	const providers: ProviderId[] = [
		"gemini",
		"openai",
		"anthropic",
		"openrouter",
	];
	const keysToRemove = providers.map((id) => `${KEY_PREFIX}${id}`);
	debugLogger.log(`[ModelStorage] Resetting all models to defaults`);
	await chrome.storage.local.remove(keysToRemove);
}

/**
 * Debug function to dump all stored model selections
 * Useful for troubleshooting model selection issues
 */
export async function debugDumpAllStoredModels(): Promise<
	Record<ProviderId, string | null>
> {
	debugLogger.log(
		"[ModelStorage] === DIAGNOSTIC DUMP OF ALL STORED MODELS ===",
	);

	const providers: ProviderId[] = [
		"gemini",
		"openai",
		"anthropic",
		"openrouter",
	];
	const result: Record<ProviderId, string | null> = {} as Record<
		ProviderId,
		string | null
	>;

	try {
		// Get all model-related keys
		const allKeys = providers.map((id) => `${KEY_PREFIX}${id}`);
		const storage = await chrome.storage.local.get(allKeys);

		for (const providerId of providers) {
			const storageKey = `${KEY_PREFIX}${providerId}`;
			const storedValue = storage[storageKey];
			result[providerId] = storedValue || null;
		}

		debugLogger.log("[ModelStorage] === END DIAGNOSTIC DUMP ===");
		return result;
	} catch (error) {
		debugLogger.error("[ModelStorage] Failed to dump stored models:", error);
		throw error;
	}
}
