import { ProviderSwitcher } from './provider-switcher';
import { ProviderId } from '../../shared/types/providers';

export class ErrorHandler {
  private static retryAttempts = new Map<string, number>();
  private static readonly MAX_RETRIES = 3;
  
  static async handleProviderError(
    error: Error,
    providerId: ProviderId,
    context: string
  ): Promise<{ shouldRetry: boolean; fallbackProvider?: ProviderId }> {
    
    const errorKey = `${providerId}-${context}`;
    const attempts = this.retryAttempts.get(errorKey) || 0;
    
    console.error(`Provider ${providerId} error in ${context}:`, error.message);
    
    // Categorize error
    if (this.isApiKeyError(error)) {
      // API key issues - don't retry, suggest re-configuration
      console.warn(`API key error for ${providerId}:`, error.message);
      return { shouldRetry: false };
    }
    
    if (this.isRateLimitError(error)) {
      // Rate limited - wait and retry
      console.warn(`Rate limit hit for ${providerId}, waiting...`);
      await this.sleep(2000 * (attempts + 1)); // Exponential backoff
      this.retryAttempts.set(errorKey, attempts + 1);
      return { shouldRetry: attempts < this.MAX_RETRIES };
    }
    
    if (this.isTemporaryError(error)) {
      // Temporary issue - retry with backoff
      console.warn(`Temporary error for ${providerId}, retrying...`);
      await this.sleep(1000 * (attempts + 1));
      this.retryAttempts.set(errorKey, attempts + 1);
      return { shouldRetry: attempts < this.MAX_RETRIES };
    }
    
    // Serious error - try fallback provider
    const currentProvider = await ProviderSwitcher.getCurrentProvider();
    if (currentProvider === providerId) {
      const fallbackProvider = await this.getFallbackProvider(providerId);
      if (fallbackProvider) {
        console.log(`Falling back from ${providerId} to provider: ${fallbackProvider}`);
        return { shouldRetry: false, fallbackProvider };
      }
    }
    
    return { shouldRetry: false };
  }
  
  private static isApiKeyError(error: Error): boolean {
    const apiKeyErrors = [
      'invalid api key',
      'unauthorized',
      'authentication failed',
      'api key not found',
      'forbidden',
      '401',
      '403'
    ];
    return apiKeyErrors.some(msg => 
      error.message.toLowerCase().includes(msg)
    );
  }
  
  private static isRateLimitError(error: Error): boolean {
    const rateLimitErrors = [
      'rate limit',
      'too many requests',
      'quota exceeded',
      'rate_limit_exceeded',
      '429',
      'requests per minute',
      'daily quota'
    ];
    return rateLimitErrors.some(msg => 
      error.message.toLowerCase().includes(msg)
    );
  }
  
  private static isTemporaryError(error: Error): boolean {
    const temporaryErrors = [
      'network error',
      'timeout',
      'service unavailable',
      'server error',
      'connection failed',
      'temporarily unavailable',
      '500',
      '502',
      '503',
      '504',
      'fetch failed',
      'network request failed'
    ];
    return temporaryErrors.some(msg => 
      error.message.toLowerCase().includes(msg)
    );
  }
  
  private static async getFallbackProvider(failedProvider: ProviderId): Promise<ProviderId | null> {
    const availableProviders = await ProviderSwitcher.getAvailableProviders();
    
    // Filter out the failed provider
    const fallbackCandidates = availableProviders.filter(p => p !== failedProvider);
    
    if (fallbackCandidates.length === 0) {
      return null;
    }
    
    // Prioritize providers in order of reliability: gemini > openai > anthropic > openrouter
    const priorityOrder: ProviderId[] = ['gemini', 'openai', 'anthropic', 'openrouter'];
    
    for (const provider of priorityOrder) {
      if (fallbackCandidates.includes(provider)) {
        return provider;
      }
    }
    
    // Return first available if no priority match
    return fallbackCandidates[0];
  }
  
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  static resetRetryCount(providerId: ProviderId, context: string): void {
    const errorKey = `${providerId}-${context}`;
    this.retryAttempts.delete(errorKey);
  }
  
  static clearAllRetryCount(): void {
    this.retryAttempts.clear();
  }
  
  /**
   * Gets a user-friendly error message for display
   */
  static getUserFriendlyMessage(error: Error, providerId: ProviderId): string {
    if (this.isApiKeyError(error)) {
      return `Invalid API key for ${providerId}. Please check your API key in the extension options.`;
    }
    
    if (this.isRateLimitError(error)) {
      return `Rate limit reached for ${providerId}. Please wait a moment and try again.`;
    }
    
    if (this.isTemporaryError(error)) {
      return `${providerId} service is temporarily unavailable. Trying again...`;
    }
    
    return `${providerId} encountered an error: ${error.message}`;
  }
  
  /**
   * Handles errors during provider switching operations
   */
  static async handleSwitchError(
    error: Error,
    targetProvider: ProviderId
  ): Promise<{ success: boolean; message: string }> {
    
    if (this.isApiKeyError(error)) {
      return {
        success: false,
        message: `Cannot switch to ${targetProvider}: Invalid or missing API key. Please configure the API key in options.`
      };
    }
    
    if (this.isTemporaryError(error)) {
      return {
        success: false,
        message: `Cannot switch to ${targetProvider}: Service temporarily unavailable. Please try again later.`
      };
    }
    
    return {
      success: false,
      message: `Failed to switch to ${targetProvider}: ${error.message}`
    };
  }
  
  /**
   * Gets retry delay in milliseconds based on attempt count
   */
  static getRetryDelay(attempt: number): number {
    return Math.min(1000 * Math.pow(2, attempt), 30000); // Max 30 seconds
  }
}