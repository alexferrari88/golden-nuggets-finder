import {
	type AnalysisProgressMessage,
	type AnalysisRequest,
	type DebugLogMessage,
	MESSAGE_TYPES,
	type RateLimitedMessage,
	type RetryingMessage,
	type TypeFilterOptions,
} from "../shared/types";

// Utility function to generate unique analysis IDs
function generateAnalysisId(): string {
	return `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

import {
	type CheckboxStyling,
	type Content,
	ContentScraper,
} from "threads-harvester";
import { UIManager } from "../content/ui/ui-manager";
import { isDevMode } from "../shared/debug";
import {
	borderRadius,
	colors,
	generateCSSCustomProperties,
	shadows,
	zIndex,
} from "../shared/design-system";
import {
	measureContentExtraction,
	measureDOMOperation,
	performanceMonitor,
} from "../shared/performance";

export default defineContentScript({
	matches: ["https://example.com/*"], // Restrictive match to prevent auto-injection
	runAt: "document_idle",
	main() {
		// Only initialize when explicitly activated to avoid auto-running on all pages
		let isActivated = false;
		let contentScraper: ContentScraper;
		let extractedPageContent: string | null = null; // Store extracted content for reconstruction
		const uiManager = new UIManager();

		function createContentScraper(): ContentScraper {
			// Create design-system-compliant styling functions for the library
			const checkboxStyling: CheckboxStyling = {
				getDefaultStyles: () => `
          position: absolute;
          width: 18px;
          height: 18px;
          border: 1px solid ${colors.border.default};
          border-radius: ${borderRadius.sm};
          background: ${colors.background.primary};
          cursor: pointer;
          z-index: ${zIndex.toggle};
          box-shadow: ${shadows.sm};
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        `,
				getSelectedStyles: () => `
          position: absolute;
          width: 18px;
          height: 18px;
          border: 1px solid ${colors.text.accent};
          border-radius: ${borderRadius.sm};
          background: ${colors.text.accent};
          color: ${colors.white};
          cursor: pointer;
          z-index: ${zIndex.toggle};
          box-shadow: ${shadows.md};
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        `,
				getHoverStyles: () => `
          position: absolute;
          width: 18px;
          height: 18px;
          border: 1px solid ${colors.border.medium};
          border-radius: ${borderRadius.sm};
          background: ${colors.background.secondary};
          cursor: pointer;
          z-index: ${zIndex.toggle};
          box-shadow: ${shadows.md};
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        `,
				getPositioningStyles: (targetRect: DOMRect) => {
					const scrollTop =
						window.pageYOffset || document.documentElement.scrollTop;
					const scrollLeft =
						window.pageXOffset || document.documentElement.scrollLeft;
					return {
						top: `${targetRect.top + scrollTop - 5}px`,
						left: `${targetRect.left + scrollLeft - 25}px`,
					};
				},
			};

			// The ContentScraper automatically detects the site type
			return new ContentScraper({
				includeHtml: true, // Include HTML content for better extraction
				checkboxStyling: checkboxStyling, // Provide design-system-compliant styling
				showCheckboxes: false, // Don't show checkboxes automatically during regular analysis
			});
		}

		function convertContentToText(content: Content | null): string {
			if (!content || !content.items || !Array.isArray(content.items) || content.items.length === 0) {
				return "";
			}

			// Combine all content items into a single text string with type delimiters
			const contentParts = [content.title];

			content.items.forEach((item) => {
				let textContent = "";

				if (item.textContent) {
					textContent = item.textContent;
				} else if (item.htmlContent) {
					// Strip HTML tags for text-only analysis
					textContent = item.htmlContent.replace(/<[^>]*>/g, "").trim();
				}

				if (textContent) {
					// Add delimiter to specify content type for LLM analysis
					const delimiter = item.type === "post" ? "[POST]" : "[COMMENT]";
					contentParts.push(`${delimiter} ${textContent}`);
				}
			});

			return contentParts.filter((part) => part?.trim()).join("\n\n");
		}

		function injectDesignSystemVariables(): void {
			// Check if already injected
			if (document.getElementById("nugget-design-system-vars")) return;

			// Create and inject CSS custom properties
			const styleElement = document.createElement("style");
			styleElement.id = "nugget-design-system-vars";
			styleElement.textContent = generateCSSCustomProperties();
			document.head.appendChild(styleElement);
		}

		function initialize(): void {
			if (!isActivated) {
				contentScraper = createContentScraper();
				injectDesignSystemVariables();
				isActivated = true;
			}
		}

		function handleDebugLog(debugLog: DebugLogMessage): void {
			// Only log in development mode - double check for safety
			if (!isDevMode()) return;

			switch (debugLog.type) {
				case "llm-request":
					if (debugLog.data) {
						console.log(
							"[LLM Request] Gemini API - Endpoint:",
							debugLog.data.endpoint,
						);
						console.log(
							"[LLM Request] Request Body:",
							JSON.stringify(debugLog.data.requestBody, null, 2),
						);
					}
					break;

				case "llm-response":
					if (debugLog.data) {
						console.log(
							"[LLM Response] Raw Response:",
							JSON.stringify(debugLog.data.responseData, null, 2),
						);
						if (debugLog.data.parsedResponse) {
							console.log(
								"[LLM Response] Parsed Response:",
								JSON.stringify(debugLog.data.parsedResponse, null, 2),
							);
						}
					}
					break;

				case "llm-validation":
					if (debugLog.data) {
						console.log(
							"[LLM Request] API Key Validation - Endpoint:",
							debugLog.data.endpoint,
						);
						console.log(
							"[LLM Request] Test Request Body:",
							JSON.stringify(debugLog.data.requestBody, null, 2),
						);
						console.log(
							"[LLM Response] API Key Validation - Status:",
							debugLog.data.status,
							debugLog.data.statusText,
						);
						console.log("[LLM Response] API Key Valid:", debugLog.data.valid);
					}
					break;

				case "log":
					console.log(debugLog.message, ...(debugLog.data || []));
					break;

				case "error":
					console.error(debugLog.message, ...(debugLog.data || []));
					break;

				case "warn":
					console.warn(debugLog.message, ...(debugLog.data || []));
					break;

				default:
					console.log("[Debug]", debugLog.message, debugLog.data);
			}
		}

		function handleProgressMessage(
			progressMessage: AnalysisProgressMessage,
		): void {
			// Forward progress messages to UI manager for real-time animation updates
			uiManager.handleProgressUpdate(progressMessage);

			// Also forward to popup if analysis was initiated from popup
			if (progressMessage.source === "popup") {
				chrome.runtime.sendMessage(progressMessage).catch(() => {
					// Ignore errors - popup might not be open
				});
			}
		}

		function handleRateLimitMessage(
			message: RateLimitedMessage | RetryingMessage,
		): void {
			if (message.type === MESSAGE_TYPES.ANALYSIS_RATE_LIMITED) {
				const rateLimitMsg = message as RateLimitedMessage;
				uiManager.showRateLimitedBanner(
					rateLimitMsg.provider,
					rateLimitMsg.waitTime,
					rateLimitMsg.attempt,
					rateLimitMsg.maxAttempts,
					rateLimitMsg.analysisId,
				);
			} else if (message.type === MESSAGE_TYPES.ANALYSIS_RETRYING) {
				const retryMsg = message as RetryingMessage;
				uiManager.showRetryingBanner(
					retryMsg.provider,
					retryMsg.attempt,
					retryMsg.maxAttempts,
				);
			}
		}

		// Always listen for messages from background script
		chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
			// Handle progress messages for real-time animation updates
			if (
				request.type === MESSAGE_TYPES.ANALYSIS_CONTENT_EXTRACTED ||
				request.type === MESSAGE_TYPES.ANALYSIS_CONTENT_OPTIMIZED ||
				request.type === MESSAGE_TYPES.ANALYSIS_API_REQUEST_START ||
				request.type === MESSAGE_TYPES.ANALYSIS_API_RESPONSE_RECEIVED ||
				request.type === MESSAGE_TYPES.ANALYSIS_PROCESSING_RESULTS
			) {
				handleProgressMessage(request as AnalysisProgressMessage);
				sendResponse({ success: true });
				return;
			}

			// Handle rate limiting and retry messages
			if (
				request.type === MESSAGE_TYPES.ANALYSIS_RATE_LIMITED ||
				request.type === MESSAGE_TYPES.ANALYSIS_RETRYING
			) {
				handleRateLimitMessage(request);
				sendResponse({ success: true });
				return;
			}

			handleMessage(request, sender, sendResponse);
			return true; // Keep the message channel open for async responses
		});

		// Listen for analysis requests from popup
		document.addEventListener("nugget-analyze", (event: Event) => {
			const customEvent = event as CustomEvent;
			analyzeContent(customEvent.detail.promptId);
		});

		async function handleMessage(
			request: any,
			_sender: chrome.runtime.MessageSender,
			sendResponse: (response: any) => void,
		): Promise<void> {
			try {
				switch (request.type) {
					case MESSAGE_TYPES.ANALYZE_CONTENT:
						initialize(); // Initialize when needed
						await analyzeContent(
							request.promptId,
							request.source,
							request.analysisId,
							request.typeFilter,
						);
						sendResponse({ success: true });
						break;

					case MESSAGE_TYPES.ENTER_SELECTION_MODE:
						initialize(); // Initialize when needed
						await enterSelectionMode(request.promptId, request.typeFilter);
						sendResponse({ success: true });
						break;

					case MESSAGE_TYPES.ENTER_MISSING_CONTENT_MODE:
						initialize(); // Initialize when needed
						await enterMissingContentMode(request.selectedText, request.url);
						sendResponse({ success: true });
						break;

					case MESSAGE_TYPES.ANALYSIS_COMPLETE:
						initialize(); // Initialize when needed
						if (request.data) {
							await measureDOMOperation("display_results", () =>
								handleAnalysisResults(request.data),
							);
						}
						// Exit selection mode if it was active (for selected content analysis)
						if (uiManager.isSelectionModeActive()) {
							uiManager.exitSelectionMode();
						}
						// Also ensure analysis modal is properly completed/closed
						uiManager.restoreSelectionMode();

						// Notify background script that analysis is complete for context menu tracking
						chrome.runtime.sendMessage({
							type: MESSAGE_TYPES.ANALYSIS_COMPLETE,
							fromContentScript: true,
						});

						sendResponse({ success: true });
						break;

					case MESSAGE_TYPES.ANALYSIS_ERROR:
						initialize(); // Initialize when needed
						uiManager.showErrorBanner(
							request.error || "Analysis failed. Please try again.",
						);
						// Exit selection mode if it was active (for selected content analysis)
						if (uiManager.isSelectionModeActive()) {
							uiManager.exitSelectionMode();
						}
						// Also ensure analysis modal is properly completed/closed
						uiManager.restoreSelectionMode();
						sendResponse({ success: true });
						break;

					case MESSAGE_TYPES.SHOW_ERROR:
						// No need to initialize for error display
						uiManager.showErrorBanner(request.message);
						sendResponse({ success: true });
						break;

					case MESSAGE_TYPES.SHOW_INFO:
						// No need to initialize for info display
						uiManager.showInfoBanner(request.message);
						sendResponse({ success: true });
						break;

					case MESSAGE_TYPES.SHOW_API_KEY_ERROR:
						// No need to initialize for error display
						uiManager.showApiKeyErrorBanner();
						sendResponse({ success: true });
						break;

					case MESSAGE_TYPES.DEBUG_LOG:
						// Handle debug log forwarding to page console (development mode only)
						if (isDevMode()) {
							handleDebugLog(request.data);
						}
						sendResponse({ success: true });
						break;

					case "PING":
						// Respond to ping messages for injection detection
						sendResponse({ success: true });
						break;

					default:
						sendResponse({ success: false, error: "Unknown message type" });
				}
			} catch (error) {
				console.error("Error handling message:", error);
				sendResponse({ success: false, error: (error as Error).message });
			}
		}

		async function analyzeContent(
			promptId: string,
			source?: string,
			providedAnalysisId?: string,
			typeFilter?: TypeFilterOptions,
		): Promise<void> {
			try {
				performanceMonitor.startTimer("total_analysis");

				// Use provided analysis ID (from popup) or generate new one
				const analysisId = providedAnalysisId || generateAnalysisId();

				// Start real-time progress tracking in UI manager
				uiManager.startRealTimeProgress(analysisId, source);

				// Only show progress banner if not triggered from popup (popup shows its own loading modal)
				if (source !== "popup") {
					uiManager.showProgressBanner();
				}

				// Extract content from the page using the new library
				const structuredContent = await measureContentExtraction(
					"page_content",
					async () => {
						await contentScraper.run();
						return contentScraper.getContent();
					},
				);

				// Convert structured content to text for AI analysis
				const content = convertContentToText(structuredContent);

				// Store the extracted content for reconstruction purposes
				extractedPageContent = content;

				if (!content || content.trim().length === 0) {
					if (source !== "popup") {
						uiManager.hideProgressBanner();
					}
					uiManager.showErrorBanner("No content found on this page.");
					return;
				}

				// Send analysis request to background script with progress tracking info
				const analysisRequest: AnalysisRequest = {
					content: content,
					promptId: promptId,
					url: window.location.href,
					analysisId: analysisId,
					source: source as "popup" | "context-menu",
					typeFilter: typeFilter,
				};

				performanceMonitor.startTimer("api_request");
				const response = await sendMessageToBackground(
					MESSAGE_TYPES.ANALYZE_CONTENT,
					analysisRequest,
				);
				performanceMonitor.logTimer("api_request", "Background API call");

				if (response.success && response.data) {
					await measureDOMOperation("display_results", () =>
						handleAnalysisResults(response.data, source),
					);
					// Notify popup and background script of successful completion
					chrome.runtime.sendMessage({
						type: MESSAGE_TYPES.ANALYSIS_COMPLETE,
						fromContentScript: true,
					});
				} else {
					if (source !== "popup") {
						uiManager.hideProgressBanner();
					}
					
					// Enhanced error message for provider failures
					const errorMessage = response.error || "Analysis failed. Please try again.";
					const isProviderError = errorMessage.toLowerCase().includes('provider') || 
											errorMessage.toLowerCase().includes('openrouter') || 
											errorMessage.toLowerCase().includes('gemini') || 
											errorMessage.toLowerCase().includes('anthropic');
					
					const displayMessage = isProviderError 
						? `🔥 LLM Provider Error: ${errorMessage}`
						: errorMessage;
						
					console.error("Analysis failed with provider error:", errorMessage);
					uiManager.showErrorBanner(displayMessage);
					
					// Notify popup of error
					chrome.runtime.sendMessage({
						type: MESSAGE_TYPES.ANALYSIS_ERROR,
						error: errorMessage,
					});
				}
			} catch (error) {
				console.error("Analysis failed with exception:", error);
				if (source !== "popup") {
					uiManager.hideProgressBanner();
				}
				
				const errorMessage = error instanceof Error ? error.message : "Analysis failed with an unexpected error.";
				uiManager.showErrorBanner(`🔥 Analysis Error: ${errorMessage} Please try again.`);
				
				// Notify popup of error
				chrome.runtime.sendMessage({
					type: MESSAGE_TYPES.ANALYSIS_ERROR,
					error: errorMessage,
				});
			} finally {
				performanceMonitor.logTimer(
					"total_analysis",
					"Complete analysis workflow",
				);
				performanceMonitor.measureMemory();
			}
		}

		async function enterSelectionMode(
			promptId?: string,
			typeFilter?: TypeFilterOptions,
		): Promise<void> {
			try {
				// Create a separate ContentScraper instance for selection mode
				const selectionScraper = createContentScraper();

				// Extract content first
				await selectionScraper.run();

				// Then explicitly display checkboxes for selection
				selectionScraper.displayCheckboxes();

				// Enter selection mode through UI manager with the scraper
				await uiManager.enterSelectionMode(
					promptId,
					selectionScraper,
					typeFilter,
				);
			} catch (error) {
				console.error("Failed to enter selection mode:", error);
				uiManager.showErrorBanner(
					"Failed to enter selection mode. Please try again.",
				);
			}
		}

		async function enterMissingContentMode(
			selectedText?: string,
			url?: string,
		): Promise<void> {
			try {
				if (selectedText) {
					// Direct missing content report with pre-selected text
					console.log(
						"[Content] Entering direct missing content mode with selected text",
					);
					await uiManager.enterDirectMissingContentMode(
						selectedText,
						url || window.location.href,
					);
				} else {
					// Original flow - use ContentScraper for multi-selection
					console.log(
						"[Content] Entering interactive missing content selection mode",
					);

					// Create a separate ContentScraper instance for missing content selection
					const selectionScraper = createContentScraper();

					// Extract content first
					await selectionScraper.run();

					// Then explicitly display checkboxes for selection
					selectionScraper.displayCheckboxes();

					// Enter missing content selection mode through UI manager
					await uiManager.enterMissingContentMode(selectionScraper);
				}
			} catch (error) {
				console.error("Failed to enter missing content selection mode:", error);
				uiManager.showErrorBanner(
					"Failed to enter missing content selection mode. Please try again.",
				);
			}
		}

		async function handleAnalysisResults(
			results: any,
			source?: string,
		): Promise<void> {
			// Validate results structure to prevent runtime errors
			if (!results || typeof results !== 'object') {
				console.error("Invalid analysis results:", results);
				uiManager.showErrorBanner("Analysis failed due to invalid response data. Please try again.");
				return;
			}
			
			const nuggets = Array.isArray(results.golden_nuggets) ? results.golden_nuggets : [];

			// Hide the progress banner now that we have results (only if not triggered from popup)
			if (source !== "popup") {
				uiManager.hideProgressBanner();
			}

			if (nuggets.length === 0) {
				uiManager.showNoResultsBanner();
				// Still show sidebar with empty state for better UX
				await uiManager.displayResults([], extractedPageContent || undefined);
				return;
			}

			// Highlight nuggets on the page and show sidebar with page content for reconstruction
			await uiManager.displayResults(
				nuggets,
				extractedPageContent || undefined,
			);
		}

		function sendMessageToBackground(type: string, data?: any): Promise<any> {
			return new Promise((resolve) => {
				chrome.runtime.sendMessage({ type, ...data }, (response) => {
					resolve(response);
				});
			});
		}

		// Content script is ready for dynamic injection and message handling
		// Initialization happens on-demand when messages are received
	},
});
