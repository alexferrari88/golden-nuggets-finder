/**
 * Debug and development logging utilities
 */
import { type DebugLogMessage, MESSAGE_TYPES, type ProviderId } from "./types";
import type { GoldenNuggetsResponse } from "./types/providers";

/**
 * LLM request data structure for logging
 */
export interface LLMRequestData {
	endpoint: string;
	requestBody: LLMRequestBody;
}

/**
 * LLM request body structure
 */
export interface LLMRequestBody {
	provider?: ProviderId;
	contents?: Array<{
		parts: Array<{ text: string }>;
	}>;
	generationConfig?: {
		temperature?: number;
		maxOutputTokens?: number;
		responseMimeType?: string;
		responseSchema?: Record<string, unknown>;
	};
	// Additional fields for other providers
	model?: string;
	messages?: Array<{
		role: string;
		content: string;
	}>;
	max_tokens?: number;
	temperature?: number;
	[key: string]: unknown; // For additional provider-specific fields
}

/**
 * LLM response data structure for logging
 */
export interface LLMResponseData {
	candidates?: Array<{
		content: {
			parts: Array<{ text: string }>;
		};
		finishReason?: string;
	}>;
	usageMetadata?: {
		promptTokenCount: number;
		candidatesTokenCount: number;
		totalTokenCount: number;
	};
	// Additional fields for other providers
	choices?: Array<{
		message?: { content: string };
		finish_reason?: string;
	}>;
	usage?: {
		prompt_tokens?: number;
		completion_tokens?: number;
		total_tokens?: number;
	};
	[key: string]: unknown; // For additional provider-specific fields
}

/**
 * Validation result data structure
 */
export interface ValidationLogData {
	endpoint: string;
	requestBody: LLMRequestBody;
	status: number;
	statusText: string;
	valid: boolean;
}

/**
 * Extended window interface for global debug logger
 */
declare global {
	interface Window {
		debugLogger: DebugLogger;
	}
}

/**
 * Development mode detection
 */
export function isDevMode(): boolean {
	try {
		const manifest = chrome.runtime.getManifest();
		const isDev = !("update_url" in manifest);
		console.log(
			`[DevMode Check] Development mode: ${isDev}, Update URL present: ${"update_url" in manifest}`,
		);
		return isDev;
	} catch (error) {
		// During build time or if chrome API is not available, assume development
		console.log(
			`[DevMode Check] Chrome API not available (${error}), assuming development mode`,
		);
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
		// Enable logging immediately in development mode, then check user setting
		this.enabled = isDevMode();
		console.log(
			`[DebugLogger] Constructor - Initial enabled state: ${this.enabled}`,
		);

		// Asynchronously check user setting and update if needed
		this.checkAndUpdateLoggingState();
	}

	private async checkAndUpdateLoggingState(): Promise<void> {
		try {
			console.log(`[DebugLogger] checkAndUpdateLoggingState() called`);

			if (typeof chrome === "undefined" || !chrome.runtime) {
				console.log(
					`[DebugLogger] Chrome API not available, skipping storage check`,
				);
				return;
			}

			// Check if we're in development mode
			const isDev = isDevMode();
			console.log(`[DebugLogger] Development mode check: ${isDev}`);

			// Check user's debug logging preference
			let userDebugEnabled = false;
			try {
				console.log(`[DebugLogger] Checking storage for extensionConfig...`);
				const result = await chrome.storage.local.get(["extensionConfig"]);
				console.log(`[DebugLogger] Storage result:`, result);
				userDebugEnabled = result.extensionConfig?.enableDebugLogging || false;
				console.log(`[DebugLogger] User debug setting: ${userDebugEnabled}`);
			} catch (error) {
				console.log(`[DebugLogger] Storage error:`, error);
			}

			// Enable logging if either development mode or user has enabled it
			const shouldBeEnabled = isDev || userDebugEnabled;
			console.log(
				`[DebugLogger] Should be enabled: ${shouldBeEnabled} (dev: ${isDev} || user: ${userDebugEnabled})`,
			);

			// Always update and log current state
			const previousState = this.enabled;
			this.enabled = shouldBeEnabled;
			console.log(
				`[DebugLogger] State change - Previous: ${previousState}, Current: ${this.enabled}`,
			);

			// Test logging immediately if enabled
			if (this.enabled) {
				console.log(`[DebugLogger] ✅ LOGGING IS NOW ENABLED - Testing...`);
				this.log("🔍 Test log message from checkAndUpdateLoggingState");
			} else {
				console.log(`[DebugLogger] ❌ LOGGING IS DISABLED`);
			}
		} catch (error) {
			console.log(`[DebugLogger] Error in checkAndUpdateLoggingState:`, error);
		}
	}

	/**
	 * Forward debug message to active content script for page console logging
	 */
	private async forwardToPageConsole(debugLog: DebugLogMessage): Promise<void> {
		if (!this.enabled) return;

		try {
			// Get active tab and send message to content script
			const tabs = await chrome.tabs.query({
				active: true,
				currentWindow: true,
			});
			if (tabs.length > 0 && tabs[0].id) {
				await chrome.tabs.sendMessage(tabs[0].id, {
					type: MESSAGE_TYPES.DEBUG_LOG,
					data: debugLog,
				});
			}
		} catch (_error) {
			// Silently fail if content script not available or other issues
			// This is expected when no content script is injected
		}
	}

	logLLMRequest(endpoint: string, requestBody: LLMRequestBody): void {
		console.log(
			`[DebugLogger] logLLMRequest called - enabled: ${this.enabled}`,
		);
		if (!this.enabled) {
			console.log(`[DebugLogger] logLLMRequest skipped - logging disabled`);
			return;
		}

		// Detect provider from request body or endpoint
		let providerName = "Unknown API";
		if (requestBody?.provider) {
			// Provider explicitly set (OpenAI, Anthropic, OpenRouter)
			providerName =
				requestBody.provider.charAt(0).toUpperCase() +
				requestBody.provider.slice(1) +
				" API";
		} else if (endpoint.includes("gemini")) {
			providerName = "Gemini API";
		} else if (endpoint.includes("openai.com")) {
			providerName = "OpenAI API";
		} else if (endpoint.includes("anthropic.com")) {
			providerName = "Anthropic API";
		} else if (endpoint.includes("openrouter.ai")) {
			providerName = "OpenRouter API";
		}

		// Log to service worker console
		console.log(`[LLM Request] ${providerName} - Endpoint:`, endpoint);
		console.log(
			"[LLM Request] Request Body:",
			JSON.stringify(requestBody, null, 2),
		);

		// Forward to page console
		this.forwardToPageConsole({
			type: "llm-request",
			message: `${providerName} - Endpoint: ${endpoint}`,
			data: { endpoint, requestBody } as LLMRequestData,
		});
	}

	logLLMResponse(
		responseData: LLMResponseData,
		parsedResponse?: GoldenNuggetsResponse,
	): void {
		if (!this.enabled) return;

		// Log to service worker console
		console.log(
			"[LLM Response] Raw Response:",
			JSON.stringify(responseData, null, 2),
		);
		if (parsedResponse) {
			console.log(
				"[LLM Response] Parsed Response:",
				JSON.stringify(parsedResponse, null, 2),
			);
		}

		// Forward to page console
		this.forwardToPageConsole({
			type: "llm-response",
			message: "LLM Response received",
			data: { responseData, parsedResponse },
		});
	}

	logLLMValidation(
		endpoint: string,
		requestBody: LLMRequestBody,
		status: number,
		statusText: string,
		valid: boolean,
	): void {
		if (!this.enabled) return;

		// Log to service worker console
		console.log("[LLM Request] API Key Validation - Endpoint:", endpoint);
		console.log(
			"[LLM Request] Test Request Body:",
			JSON.stringify(requestBody, null, 2),
		);
		console.log(
			"[LLM Response] API Key Validation - Status:",
			status,
			statusText,
		);
		console.log("[LLM Response] API Key Valid:", valid);

		// Forward to page console
		this.forwardToPageConsole({
			type: "llm-validation",
			message: `API Key Validation - Status: ${status} ${statusText} - Valid: ${valid}`,
			data: {
				endpoint,
				requestBody,
				status,
				statusText,
				valid,
			} as ValidationLogData,
		});
	}

	/**
	 * Manually refresh the logging state (call when user changes settings)
	 */
	async refreshLoggingState(): Promise<void> {
		await this.checkAndUpdateLoggingState();
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

	/**
	 * Manual test function for debugging
	 */
	testLogging(): void {
		console.log(`[DebugLogger] === MANUAL TEST LOGGING ===`);
		console.log(`[DebugLogger] Current enabled state: ${this.enabled}`);
		console.log(`[DebugLogger] isDevMode(): ${isDevMode()}`);

		// Force enable for test
		const originalState = this.enabled;
		this.enabled = true;

		console.log(`[DebugLogger] Testing with forced enabled state...`);
		this.log("🧪 Test log message");
		this.logLLMRequest("https://test.com/manual-test", {
			manual: "test",
		} as LLMRequestBody);
		this.logLLMResponse({ manual: "test response" } as LLMResponseData);

		// Restore original state
		this.enabled = originalState;
		console.log(
			`[DebugLogger] Test complete, restored enabled state to: ${this.enabled}`,
		);
	}

	log(message: string, ...args: unknown[]): void {
		console.log(
			`[DebugLogger] log() called - enabled: ${this.enabled}, message: ${message}`,
		);
		if (!this.enabled) {
			console.log(`[DebugLogger] log() skipped - logging disabled`);
			return;
		}

		// Log to service worker console
		console.log(message, ...args);

		// Forward to page console
		this.forwardToPageConsole({
			type: "log",
			message,
			data: args.length > 0 ? args : undefined,
		});
	}

	error(message: string, ...args: unknown[]): void {
		if (!this.enabled) return;

		// Log to service worker console
		console.error(message, ...args);

		// Forward to page console
		this.forwardToPageConsole({
			type: "error",
			message,
			data: args.length > 0 ? args : undefined,
		});
	}

	warn(message: string, ...args: unknown[]): void {
		if (!this.enabled) return;

		// Log to service worker console
		console.warn(message, ...args);

		// Forward to page console
		this.forwardToPageConsole({
			type: "warn",
			message,
			data: args.length > 0 ? args : undefined,
		});
	}
}

// Global debug logger instance
export const debugLogger = DebugLogger.getInstance();

// Make debugLogger available in global scope for manual testing
if (typeof window !== "undefined") {
	window.debugLogger = debugLogger;
	console.log("[DebugLogger] Available globally as window.debugLogger");
}
