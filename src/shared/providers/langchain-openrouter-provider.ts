import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import { LLMProvider, ProviderConfig, GoldenNuggetsResponse } from '../types/providers';

const GoldenNuggetsSchema = z.object({
  golden_nuggets: z.array(z.object({
    type: z.enum(['tool', 'media', 'explanation', 'analogy', 'model']),
    content: z.string(),
    synthesis: z.string()
  }))
});

export class LangChainOpenRouterProvider implements LLMProvider {
  readonly providerId = 'openrouter' as const;
  readonly modelName: string;
  private model: ChatOpenAI;

  constructor(private config: ProviderConfig) {
    this.modelName = config.modelName || "z-ai/glm-4.5-air:free";
    this.model = new ChatOpenAI({
      apiKey: config.apiKey,
      model: this.modelName,
      temperature: 0,
      configuration: {
        baseURL: 'https://openrouter.ai/api/v1',
        defaultHeaders: {
          'HTTP-Referer': 'https://golden-nuggets-finder.com',
          'X-Title': 'Golden Nuggets Finder'
        }
      }
    });
  }

  async extractGoldenNuggets(content: string, prompt: string): Promise<GoldenNuggetsResponse> {
    try {
      const structuredModel = this.model.withStructuredOutput(GoldenNuggetsSchema, {
        name: "extract_golden_nuggets",
        method: "functionCalling"
      });

      const response = await structuredModel.invoke([
        new SystemMessage(prompt),
        new HumanMessage(content)
      ]);

      return response as GoldenNuggetsResponse;
    } catch (error) {
      console.error(`OpenRouter provider error:`, error);
      throw new Error(`OpenRouter API call failed: ${error.message}`);
    }
  }

  async validateApiKey(): Promise<boolean> {
    try {
      const testResult = await this.extractGoldenNuggets(
        'Test content for API validation',
        'Extract one simple insight from this text.'
      );
      return testResult && testResult.golden_nuggets && Array.isArray(testResult.golden_nuggets);
    } catch (error) {
      console.warn(`OpenRouter API key validation failed:`, error.message);
      return false;
    }
  }
}