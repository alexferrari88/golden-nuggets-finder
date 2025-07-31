import { LLMProvider, ProviderConfig, GoldenNuggetsResponse } from '../types/providers';
import { GeminiClient } from '../../background/gemini-client';

export class GeminiDirectProvider implements LLMProvider {
  readonly providerId = 'gemini' as const;
  readonly modelName: string;
  private geminiClient: GeminiClient;

  constructor(private config: ProviderConfig) {
    this.modelName = config.modelName || 'gemini-2.5-flash';
    this.geminiClient = new GeminiClient();
  }

  async extractGoldenNuggets(content: string, prompt: string): Promise<GoldenNuggetsResponse> {
    // Use existing GeminiClient implementation
    // The existing client already returns the correct format via analyzeContent
    const geminiResponse = await this.geminiClient.analyzeContent(content, prompt);
    
    // Transform GeminiResponse to GoldenNuggetsResponse format
    // The GeminiResponse uses startContent/endContent, but GoldenNuggetsResponse uses content
    // We'll use startContent as the primary content for consistency with other providers
    return {
      golden_nuggets: geminiResponse.golden_nuggets.map(nugget => ({
        type: nugget.type,
        content: nugget.startContent, // Use startContent as primary content
        synthesis: nugget.synthesis
      }))
    };
  }

  async validateApiKey(): Promise<boolean> {
    try {
      // Use existing GeminiClient validation method
      return await this.geminiClient.validateApiKey(this.config.apiKey);
    } catch (error) {
      console.warn(`Gemini API key validation failed:`, error.message);
      return false;
    }
  }
}