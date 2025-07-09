import { GEMINI_CONFIG } from '../shared/constants';
import { GOLDEN_NUGGET_SCHEMA } from '../shared/schemas';
import { GeminiResponse } from '../shared/types';
import { storage } from '../shared/storage';

export class GeminiClient {
  private apiKey: string | null = null;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 second
  private readonly API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

  private async initializeClient(): Promise<void> {
    if (this.apiKey) return;

    this.apiKey = await storage.getApiKey();
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured. Please set it in the options page.');
    }
  }

  async analyzeContent(content: string, userPrompt: string): Promise<GeminiResponse> {
    await this.initializeClient();

    if (!this.apiKey) {
      throw new Error('Gemini client not initialized');
    }

    // Construct prompt with user query at the end for optimal performance
    const fullPrompt = `${content}\n\n${userPrompt}`;

    return this.retryRequest(async () => {
      const requestBody = {
        contents: [{
          parts: [{ text: fullPrompt }]
        }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: GOLDEN_NUGGET_SCHEMA,
          thinkingConfig: {
            thinkingBudget: GEMINI_CONFIG.THINKING_BUDGET
          }
        }
      };

      const response = await fetch(`${this.API_BASE_URL}/${GEMINI_CONFIG.MODEL}:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const responseData = await response.json();
      
      // Extract the text from the response
      const responseText = responseData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!responseText) {
        throw new Error('No response text received from Gemini API');
      }

      const result = JSON.parse(responseText) as GeminiResponse;
      
      // Validate the response structure
      if (!result.golden_nuggets || !Array.isArray(result.golden_nuggets)) {
        throw new Error('Invalid response format from Gemini API');
      }

      return result;
    });
  }

  private async retryRequest<T>(
    operation: () => Promise<T>,
    currentAttempt: number = 1
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Handle specific API errors that shouldn't be retried
      if (this.isNonRetryableError(errorMessage)) {
        throw this.enhanceError(error);
      }

      // If we've exhausted retries, throw the enhanced error
      if (currentAttempt >= this.MAX_RETRIES) {
        throw this.enhanceError(error);
      }

      // Wait before retrying (exponential backoff)
      const delay = this.RETRY_DELAY * Math.pow(2, currentAttempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));

      console.warn(`Retrying Gemini API request (attempt ${currentAttempt + 1}/${this.MAX_RETRIES})`);
      return this.retryRequest(operation, currentAttempt + 1);
    }
  }

  private isNonRetryableError(errorMessage: string): boolean {
    const nonRetryableErrors = [
      'API key',
      'authentication',
      'authorization',
      'invalid request',
      'bad request',
      'malformed'
    ];
    
    return nonRetryableErrors.some(error => 
      errorMessage.toLowerCase().includes(error.toLowerCase())
    );
  }

  private enhanceError(error: unknown): Error {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      if (message.includes('api key') || message.includes('authentication')) {
        return new Error('Invalid API key. Please check your settings.');
      } else if (message.includes('rate limit') || message.includes('quota')) {
        return new Error('Rate limit reached. Please try again later.');
      } else if (message.includes('timeout')) {
        return new Error('Request timed out. Please try again.');
      } else if (message.includes('network') || message.includes('connection')) {
        return new Error('Network error. Please check your internet connection.');
      }
    }
    
    console.error('Gemini API error:', error);
    return new Error('Analysis failed. Please try again.');
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      // Basic validation first
      if (!apiKey || apiKey.trim().length === 0) {
        return false;
      }

      // Test the API key with a simple request
      const testRequestBody = {
        contents: [{
          parts: [{ text: "Test message" }]
        }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              test: {
                type: "string"
              }
            },
            required: ["test"]
          }
        }
      };

      const response = await fetch(`${this.API_BASE_URL}/${GEMINI_CONFIG.MODEL}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testRequestBody)
      });

      // If we get a 200 response, the API key is valid
      return response.ok;
    } catch (error) {
      console.warn('API key validation failed:', error);
      return false;
    }
  }
}