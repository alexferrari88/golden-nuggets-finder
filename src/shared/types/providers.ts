export type ProviderId = "gemini" | "openai" | "anthropic" | "openrouter";

export interface ProviderConfig {
	providerId: ProviderId;
	apiKey: string;
	modelName: string;
}

export interface LLMProvider {
	readonly providerId: ProviderId;
	readonly modelName: string;
	extractGoldenNuggets(
		content: string,
		prompt: string,
		synthesisEnabled?: boolean, // Default: true for backwards compatibility
	): Promise<GoldenNuggetsResponse>;
	validateApiKey(): Promise<boolean>;
}

export interface GoldenNuggetsResponse {
	golden_nuggets: Array<{
		type: "tool" | "media" | "explanation" | "analogy" | "model";
		startContent: string;
		endContent: string;
		synthesis?: string; // Optional - only present when synthesis enabled and generated
	}>;
}

export interface ProviderStorageSchema {
	selectedProvider: ProviderId;
	apiKeys: Record<ProviderId, string>; // Encrypted
	providerConfigs: Record<ProviderId, ProviderConfig>;
}
