export type ProviderId = "gemini" | "openai" | "anthropic" | "openrouter";

export interface ProviderConfig {
	providerId: ProviderId;
	apiKey: string;
	modelName: string;
}

export interface EnsembleExtractionResult {
	golden_nuggets: Array<{
		type: "tool" | "media" | "aha! moments" | "analogy" | "model";
		startContent: string;
		endContent: string;
		confidence: number;
		runsSupportingThis: number;
		totalRuns: number;
	}>;
	metadata: {
		totalRuns: number;
		consensusReached: number;
		duplicatesRemoved: number;
		averageResponseTime: number;
	};
}

export interface LLMProvider {
	readonly providerId: ProviderId;
	readonly modelName: string;
	extractGoldenNuggets(
		content: string,
		prompt: string,
	): Promise<GoldenNuggetsResponse>;
	validateApiKey(): Promise<boolean>;

	// New: Optional ensemble support
	extractGoldenNuggetsEnsemble?(
		content: string,
		prompt: string,
		runs: number,
	): Promise<EnsembleExtractionResult>;
}

export interface GoldenNuggetsResponse {
	golden_nuggets: Array<{
		type: "tool" | "media" | "aha! moments" | "analogy" | "model";
		startContent: string;
		endContent: string;
	}>;
}

export interface ProviderStorageSchema {
	selectedProvider: ProviderId;
	apiKeys: Record<ProviderId, string>; // Encrypted
	providerConfigs: Record<ProviderId, ProviderConfig>;
}
