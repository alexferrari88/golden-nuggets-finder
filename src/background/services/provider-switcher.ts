import { storage } from "../../shared/storage";
import {
	getApiKey,
	listConfiguredProviders,
} from "../../shared/storage/api-key-storage";
import type { ProviderConfig, ProviderId } from "../../shared/types/providers";
import { createProvider, getSelectedModel } from "./provider-factory";

export async function switchProvider(providerId: ProviderId): Promise<boolean> {
	try {
		// Validate provider has API key
		let apiKey: string;
		if (providerId === "gemini") {
			apiKey = await storage.getApiKey({
				source: "background",
				action: "read",
				timestamp: Date.now(),
			});
		} else {
			apiKey = (await getApiKey(providerId)) || "";
		}

		if (!apiKey) {
			throw new Error(`No API key configured for ${providerId}`);
		}

		// Test provider connection
		const config: ProviderConfig = {
			providerId,
			apiKey,
			modelName: await getSelectedModel(providerId),
		};

		const provider = await createProvider(config);
		const isValid = await provider.validateApiKey();

		if (!isValid) {
			throw new Error(`Invalid API key for ${providerId}`);
		}

		// Save new selection
		await chrome.storage.local.set({ selectedProvider: providerId });

		// Notify content scripts of provider change
		const tabs = await chrome.tabs.query({});
		for (const tab of tabs) {
			try {
				if (tab.id) {
					await chrome.tabs.sendMessage(tab.id, {
						type: "provider-changed",
						providerId,
					});
				}
			} catch {
				// Tab may not have content script
			}
		}

		return true;
	} catch (error) {
		console.error(`Failed to switch to provider ${providerId}:`, error);
		return false;
	}
}

export async function getAvailableProviders(): Promise<ProviderId[]> {
	const available: ProviderId[] = [];

	// Check Gemini
	try {
		const geminiApiKey = await storage.getApiKey({
			source: "background",
			action: "read",
			timestamp: Date.now(),
		});
		if (geminiApiKey) {
			available.push("gemini");
		}
	} catch (_error) {
		// If there's an error accessing the API key, treat as not available
	}

	// Check other providers
	const configuredProviders = await listConfiguredProviders();
	available.push(...configuredProviders);

	return Array.from(new Set(available)); // Remove duplicates
}

export async function getFallbackProvider(): Promise<ProviderId | null> {
	const available = await getAvailableProviders();
	return available.length > 0 ? available[0] : null;
}

export async function getCurrentProvider(): Promise<ProviderId> {
	const result = await chrome.storage.local.get(["selectedProvider"]);
	return result.selectedProvider || "gemini";
}

export async function isProviderConfigured(
	providerId: ProviderId,
): Promise<boolean> {
	if (providerId === "gemini") {
		try {
			const apiKey = await storage.getApiKey({
				source: "background",
				action: "read",
				timestamp: Date.now(),
			});
			return !!apiKey;
		} catch (error) {
			const errorMessage = (error as Error).message;

			// Handle rate limit errors with retry logic
			if (errorMessage.includes("Rate limit exceeded")) {
				try {
					// Wait briefly and retry once for rate limit errors
					await new Promise((resolve) => setTimeout(resolve, 1000));
					const apiKey = await storage.getApiKey({
						source: "background",
						action: "read",
						timestamp: Date.now(),
					});
					return !!apiKey;
				} catch (retryError) {
					// If retry also fails with rate limiting, check raw storage as fallback
					// This indicates heavy usage but key might still exist
					const retryErrorMessage = (retryError as Error).message;
					if (retryErrorMessage.includes("Rate limit exceeded")) {
						try {
							const rawData = await chrome.storage.sync.get("geminiApiKey");
							// For rate limit errors, assume key exists if raw data exists
							// User can retry later when rate limit resets
							return !!rawData.geminiApiKey;
						} catch {
							return false;
						}
					} else {
						// Non-rate-limit error on retry, re-throw
						throw retryError;
					}
				}
			}

			// Handle non-rate-limit errors (decryption, storage corruption, etc.)
			try {
				const rawData = await chrome.storage.sync.get("geminiApiKey");
				// For non-rate-limit errors, only assume key exists if we can't decrypt but data exists
				// This handles device changes, key rotation, etc.
				return !!rawData.geminiApiKey;
			} catch {
				// If we can't even check for raw data, treat as not configured
				return false;
			}
		}
	} else {
		try {
			const apiKey = await getApiKey(providerId);
			return !!apiKey;
		} catch (_error) {
			// For other providers, if getApiKey fails, they're not configured
			// (Other providers use simple base64 encoding, less likely to have decryption issues)
			return false;
		}
	}
}

export async function switchToFallbackProvider(): Promise<ProviderId | null> {
	const fallbackProvider = await getFallbackProvider();
	if (fallbackProvider) {
		const success = await switchProvider(fallbackProvider);
		return success ? fallbackProvider : null;
	}
	return null;
}
