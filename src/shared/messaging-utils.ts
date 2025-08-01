/**
 * Messaging Utilities
 * 
 * Shared utilities for Chrome extension messaging operations.
 * Combines content script injection with message sending to eliminate
 * duplication between popup.tsx and background.ts.
 */

import { ChromeExtensionUtils } from "./chrome-extension-utils";

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
	static async sendWithInjection<T = any>(
		tabId: number,
		message: any,
	): Promise<T> {
		try {
			// Ensure content script is injected first
			await ChromeExtensionUtils.injectContentScript(tabId);

			// Send the message
			const response = await chrome.tabs.sendMessage(tabId, message);
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
					message?.type,
					error,
				);
			}
			
			throw new MessagingError(
				"Failed to send message: Unknown error",
				tabId,
				message?.type,
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

			if (!tab || !tab.id) {
				throw new MessagingError("No active tab found or tab has no ID");
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
	static async sendToActiveTab<T = any>(message: any): Promise<T> {
		const tab = await this.getActiveTab();
		return this.sendWithInjection<T>(tab.id!, message);
	}
}