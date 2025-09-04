import type {
	LLMProvider,
	ProviderConfig,
	ProviderCreateConfig,
	ProviderId,
} from "../interfaces/providers";
import type { LoggerInterface, StorageInterface } from "../interfaces/storage";

import { GeminiDirectProvider } from "../providers/gemini-direct-provider";
import { LangChainAnthropicProvider } from "../providers/langchain-anthropic-provider";
import { LangChainOpenAIProvider } from "../providers/langchain-openai-provider";
import { LangChainOpenRouterProvider } from "../providers/langchain-openrouter-provider";

export class ProviderFactory {
	constructor(
		private storage: StorageInterface,
		private logger?: LoggerInterface,
	) {}

	async createProvider(config: ProviderCreateConfig): Promise<LLMProvider> {
		// Get API key from injected storage interface
		const apiKey = await this.storage.getApiKey(config.providerId);
		const modelName =
			config.modelName ||
			(await this.storage.getModel(config.providerId)) ||
			this.getDefaultModel(config.providerId);

		const providerConfig: ProviderConfig = {
			providerId: config.providerId,
			apiKey,
			modelName,
		};

		// Validate configuration
		this.validateConfig(providerConfig);

		return this.createProviderInstance(providerConfig);
	}

	async createMultipleProviders(
		configurations: Array<{ providerId: ProviderId; modelId?: string }>,
	): Promise<Array<{ providerId: ProviderId; provider: LLMProvider }>> {
		const results = await Promise.allSettled(
			configurations.map(async (config) => {
				try {
					const provider = await this.createProvider({
						providerId: config.providerId,
						modelName: config.modelId,
					});

					return {
						providerId: config.providerId,
						provider,
					};
				} catch (error) {
					this.logger?.error(
						`Failed to create provider ${config.providerId}`,
						error instanceof Error ? error : new Error(String(error)),
					);
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

	private validateConfig(config: ProviderConfig): void {
		if (!config) {
			const error = new Error("Provider config is required");
			this.logger?.error(error.message);
			throw error;
		}

		if (!config.providerId) {
			const error = new Error("Provider ID is required");
			this.logger?.error(error.message);
			throw error;
		}

		if (!config.modelName) {
			const error = new Error(
				`Model name is required for provider "${config.providerId}"`,
			);
			this.logger?.error(error.message);
			throw error;
		}

		if (!config.apiKey || config.apiKey.trim().length === 0) {
			const error = new Error(
				`API key is required for provider "${config.providerId}"`,
			);
			this.logger?.error(error.message);
			throw error;
		}
	}

	private createProviderInstance(config: ProviderConfig): LLMProvider {
		switch (config.providerId) {
			case "gemini":
				return new GeminiDirectProvider(config);
			case "anthropic":
				return new LangChainAnthropicProvider(config);
			case "openai":
				return new LangChainOpenAIProvider(config);
			case "openrouter":
				return new LangChainOpenRouterProvider(config);
			default: {
				const error = new Error(`Unsupported provider: ${config.providerId}`);
				this.logger?.error(error.message);
				throw error;
			}
		}
	}

	getDefaultModel(providerId: ProviderId): string {
		const defaults = {
			gemini: "gemini-2.5-flash-lite",
			openai: "gpt-4o-mini",
			anthropic: "claude-3-5-haiku-latest",
			openrouter: "z-ai/glm-4.5-air:free",
		};
		return defaults[providerId];
	}

	getSupportedProviders(): ProviderId[] {
		return ["gemini", "openai", "anthropic", "openrouter"];
	}

	/**
	 * Get a list of commonly supported models for a provider (for validation)
	 * Note: This is a subset of models for basic validation
	 */
	getKnownModelsForProvider(providerId: ProviderId): string[] {
		const knownModels = {
			gemini: ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.5-pro"],
			openai: ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo"],
			anthropic: [
				"claude-3-5-sonnet-latest",
				"claude-3-5-haiku-latest",
				"claude-3-opus-20240229",
			],
			openrouter: [
				"z-ai/glm-4.5-air:free",
				"openai/gpt-4o-mini",
				"anthropic/claude-3-5-sonnet",
				"meta-llama/llama-3.1-8b-instruct:free",
			],
		};

		return knownModels[providerId] || [];
	}

	/**
	 * Validate provider configurations before creating providers
	 */
	validateProviderConfigurations(
		configurations: Array<{
			providerId: ProviderId;
			modelId?: string;
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
			const key = `${config.providerId}:${config.modelId || "default"}`;
			if (seen.has(key)) {
				errors.push(
					`Duplicate configuration: ${config.providerId} with ${config.modelId || "default model"}`,
				);
			}
			seen.add(key);
		}

		// Validate each provider configuration
		for (const config of configurations) {
			if (!config.providerId) {
				errors.push("Provider ID is required for all configurations");
			}

			if (!this.getSupportedProviders().includes(config.providerId)) {
				errors.push(`Unsupported provider: ${config.providerId}`);
			}
		}

		return {
			valid: errors.length === 0,
			errors,
		};
	}
}
