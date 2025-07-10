import { GEMINI_CONFIG } from '../shared/constants';
import { GOLDEN_NUGGET_SCHEMA } from '../shared/schemas';
import { GeminiResponse } from '../shared/types';
import { storage } from '../shared/storage';
import { performanceMonitor, measureAPICall } from '../shared/performance';
import { securityManager } from '../shared/security';
import { debugLogger } from '../shared/debug';

export class GeminiClient {
  private apiKey: string | null = null;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 second
  private readonly API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
  private readonly MAX_CONTENT_LENGTH = 30000; // Limit content size to optimize API calls
  private responseCache = new Map<string, { response: GeminiResponse; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private async initializeClient(): Promise<void> {
    if (this.apiKey) return;

    try {
      this.apiKey = await storage.getApiKey({ source: 'background', action: 'read', timestamp: Date.now() });
    } catch (apiKeyError: any) {
      debugLogger.error('[GeminiClient] API key retrieval failed:', apiKeyError);
      
      // Check if this is a recoverable error that should trigger recovery flow
      if (apiKeyError && apiKeyError.code === 'DEVICE_CHANGED' && apiKeyError.canRecover) {
        debugLogger.log('[GeminiClient] Detected recoverable API key error, preserving enhanced error for recovery');
        // Re-throw the enhanced error to preserve recovery information
        throw apiKeyError;
      }
      
      // For non-recoverable errors, throw generic message
      throw new Error('Failed to retrieve API key. Please check your configuration in the options page.');
    }
    
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured. Please set it in the options page.');
    }
  }

  async analyzeContent(content: string, userPrompt: string): Promise<GeminiResponse> {
    await this.initializeClient();

    if (!this.apiKey) {
      throw new Error('Gemini client not initialized');
    }

    // Optimize content size to improve API performance
    const optimizedContent = this.optimizeContentForAPI(content);
    
    // Check cache first
    const cacheKey = this.getCacheKey(optimizedContent, userPrompt);
    const cachedResponse = this.getCachedResponse(cacheKey);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Construct prompt with user query at the end for optimal performance
    const fullPrompt = `${optimizedContent}\n\n${userPrompt}`;

    return this.retryRequest(async () => {
      return measureAPICall('gemini_generate_content', async () => {
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

        // Log request payload in development mode
        debugLogger.logLLMRequest(`${this.API_BASE_URL}/${GEMINI_CONFIG.MODEL}:generateContent`, requestBody);

        performanceMonitor.startTimer('gemini_request');
        const response = await fetch(`${this.API_BASE_URL}/${GEMINI_CONFIG.MODEL}:generateContent`, {
          method: 'POST',
          headers: this.getSecureHeaders(),
          body: JSON.stringify(requestBody)
        });
        performanceMonitor.logTimer('gemini_request', 'HTTP request to Gemini API');

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        performanceMonitor.startTimer('gemini_response_parse');
        const responseData = await response.json();
        
        // Extract the text from the response
        const responseText = responseData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!responseText) {
          throw new Error('No response text received from Gemini API');
        }

        const result = JSON.parse(responseText) as GeminiResponse;
        
        // Log response payload in development mode
        debugLogger.logLLMResponse(responseData, result);
        
        performanceMonitor.logTimer('gemini_response_parse', 'Parse Gemini response');
        
        // Validate the response structure
        if (!result.golden_nuggets || !Array.isArray(result.golden_nuggets)) {
          throw new Error('Invalid response format from Gemini API');
        }

        // Cache the response
        this.setCachedResponse(cacheKey, result);

        return result;
      });
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

      // Smart backoff: longer delays for rate limiting, shorter for transient errors
      const isRateLimit = errorMessage.toLowerCase().includes('rate limit');
      const baseDelay = isRateLimit ? this.RETRY_DELAY * 2 : this.RETRY_DELAY;
      const delay = baseDelay * Math.pow(2, currentAttempt - 1);
      
      // Add jitter to prevent thundering herd
      const jitter = Math.random() * 0.1 * delay;
      await new Promise(resolve => setTimeout(resolve, delay + jitter));

      debugLogger.warn(`Retrying Gemini API request (attempt ${currentAttempt + 1}/${this.MAX_RETRIES})`);
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
    
    debugLogger.error('Gemini API error:', error);
    return new Error('Analysis failed. Please try again.');
  }
  
  private optimizeContentForAPI(content: string): string {
    // Truncate content if too long
    if (content.length > this.MAX_CONTENT_LENGTH) {
      // Try to truncate at sentence boundaries
      const sentences = content.split(/[.!?]+/);
      let truncated = '';
      
      for (const sentence of sentences) {
        if (truncated.length + sentence.length > this.MAX_CONTENT_LENGTH) {
          break;
        }
        truncated += sentence + '. ';
      }
      
      return truncated || content.substring(0, this.MAX_CONTENT_LENGTH);
    }
    
    return content;
  }
  
  private getCacheKey(content: string, prompt: string): string {
    // Create a hash-like key for caching
    return `${content.length}_${prompt.length}_${content.substring(0, 50)}_${prompt.substring(0, 50)}`;
  }
  
  private getCachedResponse(cacheKey: string): GeminiResponse | null {
    const cached = this.responseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.response;
    }
    
    // Remove expired cache entry
    if (cached) {
      this.responseCache.delete(cacheKey);
    }
    
    return null;
  }
  
  private setCachedResponse(cacheKey: string, response: GeminiResponse): void {
    // Limit cache size to prevent memory issues
    if (this.responseCache.size > 10) {
      // Remove oldest entries
      const oldestKey = this.responseCache.keys().next().value;
      this.responseCache.delete(oldestKey);
    }
    
    this.responseCache.set(cacheKey, {
      response,
      timestamp: Date.now()
    });
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

      const response = await fetch(`${this.API_BASE_URL}/${GEMINI_CONFIG.MODEL}:generateContent`, {
        method: 'POST',
        headers: this.getSecureHeaders(apiKey),
        body: JSON.stringify(testRequestBody)
      });

      // Log API key validation request/response in development mode
      debugLogger.logLLMValidation(
        `${this.API_BASE_URL}/${GEMINI_CONFIG.MODEL}:generateContent`,
        testRequestBody,
        response.status,
        response.statusText,
        response.ok
      );

      // If we get a 200 response, the API key is valid
      return response.ok;
    } catch (error) {
      debugLogger.warn('API key validation failed:', error);
      return false;
    }
  }

  /**
   * Generate headers for API requests
   */
  private getSecureHeaders(apiKey?: string): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey || this.apiKey!
    };
  }


  /**
   * Clear sensitive data from memory
   */
  clearSensitiveData(): void {
    this.apiKey = null;
    this.responseCache.clear();
    debugLogger.log('[GeminiClient] Sensitive data cleared from memory');
  }
}