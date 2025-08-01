/**
 * Chrome Extension Utilities
 *
 * Shared utilities for Chrome extension operations like content script injection
 * and analysis ID generation. Extracted from popup.tsx and background.ts to
 * eliminate code duplication.
 */

/**
 * Custom error for content script injection failures
 */
export class ContentScriptError extends Error {
	constructor(
		message: string,
		public tabId?: number,
		public cause?: Error,
	) {
		super(message);
		this.name = "ContentScriptError";
	}
}

/**
 * Chrome Extension utility functions
 */
export class ChromeExtensionUtils {
	/**
	 * Injects content script into specified tab with verification and retry logic
	 * Uses the more robust implementation from popup.tsx with retry mechanism
	 *
	 * @param tabId - The ID of the tab to inject the content script into
	 * @throws {ContentScriptError} When injection or verification fails
	 */
	static async injectContentScript(tabId: number): Promise<void> {
		try {
			// Check if content script is already injected by trying to send a test message
			const testResponse = await chrome.tabs
				.sendMessage(tabId, { type: "PING" })
				.catch(() => null);

			if (testResponse) {
				// Content script already exists
				return;
			}

			// Inject the content script
			await chrome.scripting.executeScript({
				target: { tabId },
				files: ["content-scripts/content.js"],
			});

			// Wait for content script to be ready with retries
			let attempts = 0;
			const maxAttempts = 10;
			while (attempts < maxAttempts) {
				await new Promise((resolve) => setTimeout(resolve, 100));
				try {
					const response = await chrome.tabs.sendMessage(tabId, {
						type: "PING",
					});
					if (response?.success) {
						break;
					}
				} catch (_error) {
					// Still not ready, continue trying
				}
				attempts++;
			}

			if (attempts >= maxAttempts) {
				throw new ContentScriptError(
					"Content script failed to initialize after injection",
					tabId,
				);
			}
		} catch (error) {
			console.error("Failed to inject content script:", error);
			if (error instanceof ContentScriptError) {
				throw error;
			}
			throw new ContentScriptError(
				`Failed to inject content script: ${error instanceof Error ? error.message : "Unknown error"}`,
				tabId,
				error instanceof Error ? error : undefined,
			);
		}
	}

	/**
	 * Generates a unique analysis ID for tracking analysis sessions
	 * Moved from popup.tsx to eliminate duplication
	 *
	 * @returns A unique analysis ID string
	 */
	static generateAnalysisId(): string {
		return `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}
}