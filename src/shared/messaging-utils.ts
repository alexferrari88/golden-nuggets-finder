/**
 * Messaging Utilities
 *
 * Shared utilities for Chrome extension messaging operations.
 * Combines content script injection with message sending to eliminate
 * duplication between popup.tsx and background.ts.
 */

import { injectContentScript } from "./chrome-extension-utils";

// Import message types for type safety
import type {
	AnalysisResponse,
	ExtensionConfig,
	SavedPrompt,
	FeedbackStats,
	OptimizedPrompt,
	TypeFilterOptions,
	MESSAGE_TYPES,
} from "./types";
import type { ProviderId } from "./types/providers";

// Base message interface
interface BaseMessage {
	type: string;
}

interface BaseRequest extends BaseMessage {
	[key: string]: unknown;
}

interface BaseResponse {
	success: boolean;
	error?: string;
	message?: string;
	data?: unknown;
}

// Message request types with the 'type' property for Chrome extension messaging
interface AnalyzeContentMessage extends BaseMessage {
	type: typeof MESSAGE_TYPES.ANALYZE_CONTENT;
	content: string;
	promptId: string;
	url: string;
	analysisId?: string;
	source?: "popup" | "context-menu";
	typeFilter?: TypeFilterOptions;
}

interface EnterSelectionModeMessage extends BaseMessage {
	type: typeof MESSAGE_TYPES.ENTER_SELECTION_MODE;
	promptId: string;
	typeFilter?: TypeFilterOptions;
}

interface AnalyzeSelectedContentMessage extends BaseMessage {
	type: typeof MESSAGE_TYPES.ANALYZE_SELECTED_CONTENT;
	content: string;
	promptId: string;
	url: string;
	selectedComments: string[];
	typeFilter?: TypeFilterOptions;
}

interface GetPromptsMessage extends BaseMessage {
	type: typeof MESSAGE_TYPES.GET_PROMPTS;
}

interface SavePromptMessage extends BaseMessage {
	type: typeof MESSAGE_TYPES.SAVE_PROMPT;
	prompt: SavedPrompt;
}

interface GetConfigMessage extends BaseMessage {
	type: typeof MESSAGE_TYPES.GET_CONFIG;
}

// Union type for all possible messaging requests
type MessagingRequest =
	| AnalyzeContentMessage
	| EnterSelectionModeMessage
	| AnalyzeSelectedContentMessage
	| GetPromptsMessage
	| SavePromptMessage
	| GetConfigMessage
	| BaseRequest;

// Response types for messaging
type MessagingResponse =
	| AnalysisResponse
	| BaseResponse
	| { success: boolean; data?: ExtensionConfig; error?: string }
	| { success: boolean; data?: SavedPrompt[]; error?: string }
	| { success: boolean; data?: FeedbackStats; error?: string }
	| { success: boolean; data?: OptimizedPrompt; error?: string }
	| { success: boolean; data?: ProviderId[]; error?: string }
	| { success: boolean; data?: { providerId: ProviderId; modelName: string }; error?: string };

/**
 * Custom error for messaging failures
 */
export class MessagingError extends Error {
	constructor(
		message: string,
		public tabId?: number,
		public messageType?: string,
		public cause?: Error,
	) {
		super(message);
		this.name = "MessagingError";
	}
}

/**
 * Messaging utility functions
 */
export class MessagingUtils {
	/**
	 * Sends a message to a content script, ensuring the script is injected first
	 * Combines the common pattern of injection + messaging used in both popup and background
	 *
	 * @param tabId - The ID of the tab to send the message to
	 * @param message - The message to send to the content script
	 * @returns Promise<T> The response from the content script
	 * @throws {MessagingError} When injection or messaging fails
	 */
	static async sendWithInjection<T extends MessagingResponse = MessagingResponse>(
		tabId: number,
		message: MessagingRequest,
	): Promise<T> {
		try {
			// Ensure content script is injected first
			await injectContentScript(tabId);

			// Send the message
			const response = await chrome.tabs.sendMessage(tabId, message) as T;
			return response;
		} catch (error) {
			console.error(
				`[MessagingUtils] Failed to send message to tab ${tabId}:`,
				error,
			);

			if (error instanceof Error) {
				throw new MessagingError(
					`Failed to send message: ${error.message}`,
					tabId,
					message.type,
					error,
				);
			}

			throw new MessagingError(
				"Failed to send message: Unknown error",
				tabId,
				message.type,
			);
		}
	}

	/**
	 * Gets the currently active tab
	 * Common pattern used in both popup and background scripts
	 *
	 * @returns Promise<chrome.tabs.Tab> The active tab
	 * @throws {MessagingError} When no active tab is found
	 */
	static async getActiveTab(): Promise<chrome.tabs.Tab> {
		try {
			const [tab] = await chrome.tabs.query({
				active: true,
				currentWindow: true,
			});

			// Proper null checking instead of non-null assertion
			if (!tab) {
				throw new MessagingError("No active tab found");
			}

			if (typeof tab.id !== 'number') {
				throw new MessagingError("Active tab has no valid ID");
			}

			return tab;
		} catch (error) {
			console.error("[MessagingUtils] Failed to get active tab:", error);

			if (error instanceof MessagingError) {
				throw error;
			}

			throw new MessagingError(
				`Failed to get active tab: ${error instanceof Error ? error.message : "Unknown error"}`,
				undefined,
				undefined,
				error instanceof Error ? error : undefined,
			);
		}
	}

	/**
	 * Sends a message to the active tab's content script
	 * Combines getActiveTab + sendWithInjection for convenience
	 *
	 * @param message - The message to send to the content script
	 * @returns Promise<T> The response from the content script
	 * @throws {MessagingError} When tab retrieval, injection, or messaging fails
	 */
	static async sendToActiveTab<T extends MessagingResponse = MessagingResponse>(
		message: MessagingRequest,
	): Promise<T> {
		const tab = await MessagingUtils.getActiveTab();
		
		// Safe access to tab.id since we've already validated it's a number
		if (typeof tab.id !== 'number') {
			throw new MessagingError("Tab ID is not valid for messaging");
		}
		
		return MessagingUtils.sendWithInjection<T>(tab.id, message);
	}
}
