// Note: This will be loaded via script tag or bundled for browser
// import { GoogleGenAI } from '@google/genai';
import { GEMINI_CONFIG } from '../shared/constants';
import { GOLDEN_NUGGET_SCHEMA } from '../shared/schemas';
import { GeminiResponse } from '../shared/types';
import { storage } from '../shared/storage';

export class GeminiClient {
  private genAI: any | null = null;

  private async initializeClient(): Promise<void> {
    if (this.genAI) return;

    const apiKey = await storage.getApiKey();
    if (!apiKey) {
      throw new Error('Gemini API key not configured. Please set it in the options page.');
    }

    // this.genAI = new GoogleGenAI({ apiKey });
    // For now, we'll throw an error to indicate this needs to be implemented
    throw new Error('Gemini API integration not yet implemented');
  }

  async analyzeContent(content: string, userPrompt: string): Promise<GeminiResponse> {
    await this.initializeClient();

    if (!this.genAI) {
      throw new Error('Gemini client not initialized');
    }

    try {
      // Construct prompt with user query at the end for optimal performance
      const fullPrompt = `${content}\n\n${userPrompt}`;

      const response = await this.genAI.models.generateContent({
        model: GEMINI_CONFIG.MODEL,
        contents: fullPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: GOLDEN_NUGGET_SCHEMA,
          thinkingConfig: {
            thinkingBudget: GEMINI_CONFIG.THINKING_BUDGET
          }
        }
      });

      const result = JSON.parse(response.text) as GeminiResponse;
      
      // Validate the response structure
      if (!result.golden_nuggets || !Array.isArray(result.golden_nuggets)) {
        throw new Error('Invalid response format from Gemini API');
      }

      return result;
    } catch (error) {
      if (error instanceof Error) {
        // Handle specific API errors
        if (error.message.includes('API key')) {
          throw new Error('Invalid API key. Please check your settings.');
        } else if (error.message.includes('rate limit')) {
          throw new Error('Rate limit reached. Please try again later.');
        } else if (error.message.includes('timeout')) {
          throw new Error('Request timed out. Please try again.');
        }
      }
      
      console.error('Gemini API error:', error);
      throw new Error('Analysis failed. Please try again.');
    }
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      // For now, just validate that the API key is non-empty
      // In a real implementation, this would test the API key
      return apiKey.trim().length > 0;
    } catch (error) {
      return false;
    }
  }
}