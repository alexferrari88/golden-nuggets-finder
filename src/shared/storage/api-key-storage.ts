import type { ProviderId } from "../types/providers";

export class ApiKeyStorage {
	private static readonly KEY_PREFIX = "encrypted_api_key_";

	static async store(providerId: ProviderId, apiKey: string): Promise<void> {
		// Simple encryption using base64 for now (can be enhanced later)
		const encrypted = btoa(apiKey);
		await chrome.storage.local.set({
			[`${ApiKeyStorage.KEY_PREFIX}${providerId}`]: encrypted,
		});
	}

	static async get(providerId: ProviderId): Promise<string | null> {
		const result = await chrome.storage.local.get(
			`${ApiKeyStorage.KEY_PREFIX}${providerId}`,
		);
		const encrypted = result[`${ApiKeyStorage.KEY_PREFIX}${providerId}`];

		if (!encrypted) return null;

		try {
			return atob(encrypted);
		} catch (error) {
			console.error(`Failed to decrypt API key for ${providerId}:`, error);
			return null;
		}
	}

	static async remove(providerId: ProviderId): Promise<void> {
		await chrome.storage.local.remove(
			`${ApiKeyStorage.KEY_PREFIX}${providerId}`,
		);
	}

	static async listConfiguredProviders(): Promise<ProviderId[]> {
		const keys = await chrome.storage.local.get();
		return Object.keys(keys)
			.filter((key) => key.startsWith(ApiKeyStorage.KEY_PREFIX))
			.map((key) => key.replace(ApiKeyStorage.KEY_PREFIX, "") as ProviderId);
	}
}
