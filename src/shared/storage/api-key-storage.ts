import type { ProviderId } from "../types/providers";

const KEY_PREFIX = "encrypted_api_key_";

export async function storeApiKey(
	providerId: ProviderId,
	apiKey: string,
): Promise<void> {
	// Simple encryption using base64 for now (can be enhanced later)
	const encrypted = btoa(apiKey);
	await chrome.storage.local.set({
		[`${KEY_PREFIX}${providerId}`]: encrypted,
	});
}

export async function getApiKey(
	providerId: ProviderId,
): Promise<string | null> {
	const result = await chrome.storage.local.get(`${KEY_PREFIX}${providerId}`);
	const encrypted = result[`${KEY_PREFIX}${providerId}`];

	if (!encrypted) return null;

	try {
		return atob(encrypted);
	} catch (error) {
		console.error(`Failed to decrypt API key for ${providerId}:`, error);
		return null;
	}
}

export async function removeApiKey(providerId: ProviderId): Promise<void> {
	await chrome.storage.local.remove(`${KEY_PREFIX}${providerId}`);
}

export async function listConfiguredProviders(): Promise<ProviderId[]> {
	const keys = await chrome.storage.local.get();
	return Object.keys(keys)
		.filter((key) => key.startsWith(KEY_PREFIX))
		.map((key) => key.replace(KEY_PREFIX, "") as ProviderId);
}
