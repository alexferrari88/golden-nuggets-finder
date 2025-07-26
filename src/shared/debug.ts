/**
 * Debug and development logging utilities
 */
import { type DebugLogMessage, MESSAGE_TYPES } from "./types";

/**
 * Development mode detection
 */
export function isDevMode(): boolean {
	try {
		return !("update_url" in chrome.runtime.getManifest());
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
		// Auto-enable debug logging in development only
		try {
			if (typeof chrome !== "undefined" && chrome.runtime && isDevMode()) {
				this.enabled = true;
			}
		} catch {
			// Ignore errors during build time
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

	logLLMRequest(endpoint: string, requestBody: any): void {
		if (!this.enabled) return;

		// Log to service worker console
		console.log("[LLM Request] Gemini API - Endpoint:", endpoint);
		console.log(
			"[LLM Request] Request Body:",
			JSON.stringify(requestBody, null, 2),
		);

		// Forward to page console
		this.forwardToPageConsole({
			type: "llm-request",
			message: `Gemini API - Endpoint: ${endpoint}`,
			data: { endpoint, requestBody },
		});
	}

	logLLMResponse(responseData: any, parsedResponse?: any): void {
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
		requestBody: any,
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
			data: { endpoint, requestBody, status, statusText, valid },
		});
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
		if (!this.enabled) return;

		// Log to service worker console
		console.log(message, ...args);

		// Forward to page console
		this.forwardToPageConsole({
			type: "log",
			message,
			data: args.length > 0 ? args : undefined,
		});
	}

	error(message: string, ...args: any[]): void {
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

	warn(message: string, ...args: any[]): void {
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
