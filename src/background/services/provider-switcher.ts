import { ApiKeyStorage } from "../../shared/storage/api-key-storage";
import { storage } from "../../shared/storage";
import type { ProviderConfig, ProviderId } from "../../shared/types/providers";
import { ProviderFactory } from "./provider-factory";

export class ProviderSwitcher {
	static async switchProvider(providerId: ProviderId): Promise<boolean> {
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
				apiKey = await ApiKeyStorage.get(providerId);
			}

			if (!apiKey) {
				throw new Error(`No API key configured for ${providerId}`);
			}

			// Test provider connection
			const config: ProviderConfig = {
				providerId,
				apiKey,
				modelName: await ProviderFactory.getSelectedModel(providerId),
			};

			const provider = await ProviderFactory.createProvider(config);
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
					await chrome.tabs.sendMessage(tab.id!, {
						type: "provider-changed",
						providerId,
					});
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

	static async getAvailableProviders(): Promise<ProviderId[]> {
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
		} catch (error) {
			// If there's an error accessing the API key, treat as not available
		}

		// Check other providers
		const configuredProviders = await ApiKeyStorage.listConfiguredProviders();
		available.push(...configuredProviders);

		return [...new Set(available)]; // Remove duplicates
	}

	static async getFallbackProvider(): Promise<ProviderId | null> {
		const available = await ProviderSwitcher.getAvailableProviders();
		return available.length > 0 ? available[0] : null;
	}

	static async getCurrentProvider(): Promise<ProviderId> {
		const result = await chrome.storage.local.get(["selectedProvider"]);
		return result.selectedProvider || "gemini";
	}

	static async isProviderConfigured(providerId: ProviderId): Promise<boolean> {
		if (providerId === "gemini") {
			try {
				const apiKey = await storage.getApiKey({
					source: "background",
					action: "read",
					timestamp: Date.now(),
				});
				return !!apiKey;
			} catch (error) {
				// If there's an error accessing the API key, treat as not configured
				return false;
			}
		} else {
			const apiKey = await ApiKeyStorage.get(providerId);
			return !!apiKey;
		}
	}

	static async switchToFallbackProvider(): Promise<ProviderId | null> {
		const fallbackProvider = await ProviderSwitcher.getFallbackProvider();
		if (fallbackProvider) {
			const success = await ProviderSwitcher.switchProvider(fallbackProvider);
			return success ? fallbackProvider : null;
		}
		return null;
	}
}
