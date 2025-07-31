export type ProviderId = 'gemini' | 'openai' | 'anthropic' | 'openrouter';

export interface ProviderConfig {
  providerId: ProviderId;
  apiKey: string;
  modelName: string;
}

export interface LLMProvider {
  readonly providerId: ProviderId;
  readonly modelName: string;
  extractGoldenNuggets(content: string, prompt: string): Promise<GoldenNuggetsResponse>;
  validateApiKey(): Promise<boolean>;
}

export interface GoldenNuggetsResponse {
  golden_nuggets: Array<{
    type: 'tool' | 'media' | 'explanation' | 'analogy' | 'model';
    content: string;
    synthesis: string;
  }>;
}

export interface ProviderStorageSchema {
  selectedProvider: ProviderId;
  apiKeys: Record<ProviderId, string>; // Encrypted
  providerConfigs: Record<ProviderId, ProviderConfig>;
}