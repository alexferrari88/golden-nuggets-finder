import type { ProviderId } from "../types/providers";

const KEY_PREFIX = "selected_model_";

/**
 * Store the selected model for a provider
 */
export async function storeModel(providerId: ProviderId, modelName: string): Promise<void> {
	await chrome.storage.local.set({
		[`${KEY_PREFIX}${providerId}`]: modelName,
	});
}

/**
 * Get the selected model for a provider, returns null if not set
 */
export async function getModel(providerId: ProviderId): Promise<string | null> {
	const result = await chrome.storage.local.get(
		`${KEY_PREFIX}${providerId}`,
	);
	return result[`${KEY_PREFIX}${providerId}`] || null;
}

/**
 * Remove the selected model for a provider (will fallback to default)
 */
export async function removeModel(providerId: ProviderId): Promise<void> {
	await chrome.storage.local.remove(
		`${KEY_PREFIX}${providerId}`,
	);
}

/**
 * Get all selected models for all providers (with fallbacks handled by caller)
 */
export async function getAllModels(): Promise<Record<ProviderId, string | null>> {
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
	const result = await chrome.storage.local.get(
		`${KEY_PREFIX}${providerId}`,
	);
	return !!result[`${KEY_PREFIX}${providerId}`];
}

/**
 * Reset to default model for a provider
 */
export async function resetToDefaultModel(providerId: ProviderId): Promise<void> {
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
	const keysToRemove = providers.map(
		(id) => `${KEY_PREFIX}${id}`,
	);
	await chrome.storage.local.remove(keysToRemove);
}
