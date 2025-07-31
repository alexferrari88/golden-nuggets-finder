import { LLMProvider, ProviderConfig, ProviderId } from '../../shared/types/providers';
import { GeminiDirectProvider } from '../../shared/providers/gemini-direct-provider';
import { LangChainOpenAIProvider } from '../../shared/providers/langchain-openai-provider';
import { LangChainAnthropicProvider } from '../../shared/providers/langchain-anthropic-provider';
import { LangChainOpenRouterProvider } from '../../shared/providers/langchain-openrouter-provider';

export class ProviderFactory {
  static async createProvider(config: ProviderConfig): Promise<LLMProvider> {
    switch (config.providerId) {
      case 'gemini':
        return new GeminiDirectProvider(config);
      
      case 'openai':
        return new LangChainOpenAIProvider(config);
      
      case 'anthropic':
        return new LangChainAnthropicProvider(config);
      
      case 'openrouter':
        return new LangChainOpenRouterProvider(config);
      
      default:
        throw new Error(`Unsupported provider: ${config.providerId}`);
    }
  }

  static getDefaultModel(providerId: ProviderId): string {
    const defaults = {
					gemini: "gemini-2.5-flash",
					openai: "gpt-4.1-mini",
					anthropic: "claude-sonnet-4-20250514",
					openrouter: "openai/gpt-3.5-turbo",
				};
    return defaults[providerId];
  }

  static getSupportedProviders(): ProviderId[] {
    return ['gemini', 'openai', 'anthropic', 'openrouter'];
  }
}