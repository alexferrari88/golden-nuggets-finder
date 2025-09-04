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
	FeedbackStats,
	MESSAGE_TYPES,
	OptimizedPrompt,
	PromptMetadata,
	SavedPrompt,
	TypeFilterOptions,
} from "./types";
import type { ProviderId } from "./types/providers";

// Base message interface
export interface BaseMessage {
	type: string;
}

export interface BaseRequest extends BaseMessage {
	[key: string]: unknown;
}

export interface BaseResponse {
	success: boolean;
	error?: string;
	message?: string;
	data?: unknown;
}

// Message request types with the 'type' property for Chrome extension messaging
export interface AnalyzeContentMessage extends BaseMessage {
	type: typeof MESSAGE_TYPES.ANALYZE_CONTENT;
	content: string;
	promptId: string;
	url: string;
	analysisId?: string;
	source?: "popup" | "context-menu";
	typeFilter?: TypeFilterOptions;
	// NEW: Prompt metadata for feedback context
	promptMetadata?: PromptMetadata;
}

export interface EnterSelectionModeMessage extends BaseMessage {
	type: typeof MESSAGE_TYPES.ENTER_SELECTION_MODE;
	promptId: string;
	typeFilter?: TypeFilterOptions;
	// NEW: Prompt metadata for feedback context
	promptMetadata?: PromptMetadata;
}

export interface AnalyzeSelectedContentMessage extends BaseMessage {
	type: typeof MESSAGE_TYPES.ANALYZE_SELECTED_CONTENT;
	content: string;
	promptId: string;
	url: string;
	selectedComments: string[];
	typeFilter?: TypeFilterOptions;
	// NEW: Prompt metadata for feedback context
	promptMetadata?: PromptMetadata;
}

export interface GetPromptsMessage extends BaseMessage {
	type: typeof MESSAGE_TYPES.GET_PROMPTS;
}

export interface SavePromptMessage extends BaseMessage {
	type: typeof MESSAGE_TYPES.SAVE_PROMPT;
	prompt: SavedPrompt;
}

export interface GetConfigMessage extends BaseMessage {
	type: typeof MESSAGE_TYPES.GET_CONFIG;
}

// Union type for all possible messaging requests
export type MessagingRequest =
	| AnalyzeContentMessage
	| EnterSelectionModeMessage
	| AnalyzeSelectedContentMessage
	| GetPromptsMessage
	| SavePromptMessage
	| GetConfigMessage
	| BaseRequest;

// Response types for messaging
export type MessagingResponse =
	| AnalysisResponse
	| BaseResponse
	| { success: boolean; data?: ExtensionConfig; error?: string }
	| { success: boolean; data?: SavedPrompt[]; error?: string }
	| { success: boolean; data?: FeedbackStats; error?: string }
	| { success: boolean; data?: OptimizedPrompt; error?: string }
	| { success: boolean; data?: ProviderId[]; error?: string }
	| {
			success: boolean;
			data?: { providerId: ProviderId; modelName: string };
			error?: string;
	  };

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
 * Sends a message to a content script, ensuring the script is injected first
 * Combines the common pattern of injection + messaging used in both popup and background
 *
 * @param tabId - The ID of the tab to send the message to
 * @param message - The message to send to the content script
 * @returns Promise<T> The response from the content script
 * @throws {MessagingError} When injection or messaging fails
 */
export async function sendWithInjection<
	T extends MessagingResponse = MessagingResponse,
>(tabId: number, message: MessagingRequest): Promise<T> {
	try {
		// Ensure content script is injected first
		await injectContentScript(tabId);

		// Send the message
		const response = (await chrome.tabs.sendMessage(tabId, message)) as T;
		return response;
	} catch (error) {
		console.error(
			`[sendWithInjection] Failed to send message to tab ${tabId}:`,
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
 * Converts a SavedPrompt to PromptMetadata for backend communication
 * Maintains backward compatibility while adding prompt context
 *
 * @param savedPrompt - The SavedPrompt to convert
 * @returns PromptMetadata with all necessary context for backend optimization
 */
export function convertSavedPromptToMetadata(
	savedPrompt: SavedPrompt,
): PromptMetadata {
	return {
		id: savedPrompt.id,
		version: savedPrompt.isOptimized ? savedPrompt.optimizationDate : "v1.0",
		content: savedPrompt.prompt,
		type: savedPrompt.isOptimized
			? "optimized"
			: savedPrompt.isDefault
				? "default"
				: "custom",
		name: savedPrompt.name,
		isOptimized: savedPrompt.isOptimized,
		optimizationDate: savedPrompt.optimizationDate,
		performance: savedPrompt.performance,
	};
}

/**
 * Creates PromptMetadata from DEFAULT_PROMPTS structure
 * Used for documenting the current default prompt structure for backend integration
 *
 * @param defaultPrompt - Default prompt from constants
 * @returns PromptMetadata for the default prompt
 */
export function createDefaultPromptMetadata(defaultPrompt: {
	id: string;
	name: string;
	prompt: string;
	isDefault: boolean;
}): PromptMetadata {
	return {
		id: defaultPrompt.id,
		version: "v1.0",
		content: defaultPrompt.prompt,
		type: "default",
		name: defaultPrompt.name,
		isOptimized: false,
	};
}

/**
 * Gets the currently active tab
 * Common pattern used in both popup and background scripts
 *
 * @returns Promise<chrome.tabs.Tab> The active tab
 * @throws {MessagingError} When no active tab is found
 */
export async function getActiveTab(): Promise<chrome.tabs.Tab> {
	try {
		const [tab] = await chrome.tabs.query({
			active: true,
			currentWindow: true,
		});

		// Proper null checking instead of non-null assertion
		if (!tab) {
			throw new MessagingError("No active tab found");
		}

		if (typeof tab.id !== "number") {
			throw new MessagingError("Active tab has no valid ID");
		}

		return tab;
	} catch (error) {
		console.error("[getActiveTab] Failed to get active tab:", error);

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
export async function sendToActiveTab<
	T extends MessagingResponse = MessagingResponse,
>(message: MessagingRequest): Promise<T> {
	const tab = await getActiveTab();

	// Safe access to tab.id since we've already validated it's a number
	if (typeof tab.id !== "number") {
		throw new MessagingError("Tab ID is not valid for messaging");
	}

	return sendWithInjection<T>(tab.id, message);
}
