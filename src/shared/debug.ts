/**
 * Debug and development logging utilities
 */

/**
 * Development mode detection
 */
export function isDevMode(): boolean {
  try {
    return !('update_url' in chrome.runtime.getManifest());
  } catch {
    // During build time or if chrome API is not available, assume development
    return true;
  }
}

/**
 * Development-only logging utilities
 */
export class DebugLogger {
  private static instance: DebugLogger;
  private enabled: boolean = false;

  static getInstance(): DebugLogger {
    if (!DebugLogger.instance) {
      DebugLogger.instance = new DebugLogger();
    }
    return DebugLogger.instance;
  }

  constructor() {
    // Auto-enable debug logging in development
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && isDevMode()) {
        this.enabled = true;
      }
    } catch {
      // Ignore errors during build time
    }
  }

  logLLMRequest(endpoint: string, requestBody: any): void {
    if (this.enabled) {
      console.log('[LLM Request] Gemini API - Endpoint:', endpoint);
      console.log('[LLM Request] Request Body:', JSON.stringify(requestBody, null, 2));
    }
  }

  logLLMResponse(responseData: any, parsedResponse?: any): void {
    if (this.enabled) {
      console.log('[LLM Response] Raw Response:', JSON.stringify(responseData, null, 2));
      if (parsedResponse) {
        console.log('[LLM Response] Parsed Response:', JSON.stringify(parsedResponse, null, 2));
      }
    }
  }

  logLLMValidation(endpoint: string, requestBody: any, status: number, statusText: string, valid: boolean): void {
    if (this.enabled) {
      console.log('[LLM Request] API Key Validation - Endpoint:', endpoint);
      console.log('[LLM Request] Test Request Body:', JSON.stringify(requestBody, null, 2));
      console.log('[LLM Response] API Key Validation - Status:', status, statusText);
      console.log('[LLM Response] API Key Valid:', valid);
    }
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  log(message: string, ...args: any[]): void {
    if (this.enabled) {
      console.log(message, ...args);
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.enabled) {
      console.error(message, ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.enabled) {
      console.warn(message, ...args);
    }
  }
}

// Global debug logger instance
export const debugLogger = DebugLogger.getInstance();