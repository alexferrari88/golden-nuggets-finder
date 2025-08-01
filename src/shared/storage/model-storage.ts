import type { ProviderId } from "../types/providers";

export class ModelStorage {
	private static readonly KEY_PREFIX = "selected_model_";

	/**
	 * Store the selected model for a provider
	 */
	static async store(providerId: ProviderId, modelName: string): Promise<void> {
		await chrome.storage.local.set({
			[`${ModelStorage.KEY_PREFIX}${providerId}`]: modelName,
		});
	}

	/**
	 * Get the selected model for a provider, returns null if not set
	 */
	static async get(providerId: ProviderId): Promise<string | null> {
		const result = await chrome.storage.local.get(
			`${ModelStorage.KEY_PREFIX}${providerId}`,
		);
		return result[`${ModelStorage.KEY_PREFIX}${providerId}`] || null;
	}

	/**
	 * Remove the selected model for a provider (will fallback to default)
	 */
	static async remove(providerId: ProviderId): Promise<void> {
		await chrome.storage.local.remove(
			`${ModelStorage.KEY_PREFIX}${providerId}`,
		);
	}

	/**
	 * Get all selected models for all providers (with fallbacks handled by caller)
	 */
	static async getAll(): Promise<Record<ProviderId, string | null>> {
		const providers: ProviderId[] = ["gemini", "openai", "anthropic", "openrouter"];
		const models: Record<ProviderId, string | null> = {} as Record<ProviderId, string | null>;

		// Get all models in parallel
		const modelPromises = providers.map(async (providerId) => {
			const model = await this.get(providerId);
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
	static async setAll(models: Partial<Record<ProviderId, string>>): Promise<void> {
		const updates: Record<string, string> = {};
		
		for (const [providerId, modelName] of Object.entries(models)) {
			if (modelName) {
				updates[`${ModelStorage.KEY_PREFIX}${providerId}`] = modelName;
			}
		}

		if (Object.keys(updates).length > 0) {
			await chrome.storage.local.set(updates);
		}
	}

	/**
	 * Check if a custom model is selected (different from default)
	 */
	static async hasCustomModel(providerId: ProviderId): Promise<boolean> {
		const result = await chrome.storage.local.get(
			`${ModelStorage.KEY_PREFIX}${providerId}`,
		);
		return !!result[`${ModelStorage.KEY_PREFIX}${providerId}`];
	}

	/**
	 * Reset to default model for a provider
	 */
	static async resetToDefault(providerId: ProviderId): Promise<void> {
		await this.remove(providerId);
	}

	/**
	 * Reset all providers to their default models
	 */
	static async resetAllToDefaults(): Promise<void> {
		const providers: ProviderId[] = ["gemini", "openai", "anthropic", "openrouter"];
		const keysToRemove = providers.map(id => `${ModelStorage.KEY_PREFIX}${id}`);
		await chrome.storage.local.remove(keysToRemove);
	}
}