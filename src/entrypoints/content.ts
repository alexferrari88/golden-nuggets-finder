import {
	type AnalysisProgressMessage,
	type DebugLogMessage,
	type GoldenNugget,
	MESSAGE_TYPES,
	type ProviderId,
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

// Type definitions for content script functionality
interface ContentScriptMessage {
	type: string;
	promptId?: string;
	source?: string;
	analysisId?: string;
	typeFilter?: TypeFilterOptions;
	selectedText?: string;
	url?: string;
	data?: unknown;
	error?: string;
	message?: string;
	fromContentScript?: boolean;
}

interface ContentScriptResponse {
	success: boolean;
	data?: unknown;
	error?: string;
}

interface AnalysisResults {
	golden_nuggets?: GoldenNugget[];
	data?: {
		golden_nuggets?: GoldenNugget[];
	};
	nuggets?: GoldenNugget[];
	providerMetadata?: {
		providerId: ProviderId;
		modelName: string;
		responseTime: number;
	};
}

interface CustomAnalyzeEvent extends CustomEvent {
	detail: {
		promptId: string;
	};
}

interface BackgroundMessageRequest {
	type: string;
	[key: string]: unknown;
}

interface BackgroundMessageResponse {
	success: boolean;
	data?: unknown;
	error?: string;
}

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
			if (
				!content ||
				!content.items ||
				!Array.isArray(content.items) ||
				content.items.length === 0
			) {
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
						const requestData = debugLog.data as {
							endpoint?: string;
							requestBody?: unknown;
						};
						console.log(
							"[LLM Request] Gemini API - Endpoint:",
							requestData.endpoint,
						);
						console.log(
							"[LLM Request] Request Body:",
							JSON.stringify(requestData.requestBody, null, 2),
						);
					}
					break;

				case "llm-response":
					if (debugLog.data) {
						const responseData = debugLog.data as {
							responseData?: unknown;
							parsedResponse?: unknown;
						};
						console.log(
							"[LLM Response] Raw Response:",
							JSON.stringify(responseData.responseData, null, 2),
						);
						if (responseData.parsedResponse) {
							console.log(
								"[LLM Response] Parsed Response:",
								JSON.stringify(responseData.parsedResponse, null, 2),
							);
						}
					}
					break;

				case "llm-validation":
					if (debugLog.data) {
						const validationData = debugLog.data as {
							endpoint?: string;
							requestBody?: unknown;
							status?: number;
							statusText?: string;
							valid?: boolean;
						};
						console.log(
							"[LLM Request] API Key Validation - Endpoint:",
							validationData.endpoint,
						);
						console.log(
							"[LLM Request] Test Request Body:",
							JSON.stringify(validationData.requestBody, null, 2),
						);
						console.log(
							"[LLM Response] API Key Validation - Status:",
							validationData.status,
							validationData.statusText,
						);
						console.log("[LLM Response] API Key Valid:", validationData.valid);
					}
					break;

				case "log":
					console.log(
						debugLog.message,
						...(Array.isArray(debugLog.data) ? debugLog.data : []),
					);
					break;

				case "error":
					console.error(
						debugLog.message,
						...(Array.isArray(debugLog.data) ? debugLog.data : []),
					);
					break;

				case "warn":
					console.warn(
						debugLog.message,
						...(Array.isArray(debugLog.data) ? debugLog.data : []),
					);
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
				request.type === MESSAGE_TYPES.ANALYSIS_PROCESSING_RESULTS ||
				request.type === MESSAGE_TYPES.ENSEMBLE_EXTRACTION_PROGRESS ||
				request.type === MESSAGE_TYPES.ENSEMBLE_CONSENSUS_COMPLETE
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
			const customEvent = event as CustomAnalyzeEvent;
			analyzeContent(customEvent.detail.promptId);
		});

		async function handleMessage(
			request: ContentScriptMessage,
			_sender: chrome.runtime.MessageSender,
			sendResponse: (response: ContentScriptResponse) => void,
		): Promise<void> {
			try {
				switch (request.type) {
					case MESSAGE_TYPES.ANALYZE_CONTENT:
						initialize(); // Initialize when needed
						await analyzeContent(
							request.promptId || "",
							request.source,
							request.analysisId || "",
							request.typeFilter,
							(request as any).useTwoPhase,
						);
						sendResponse({ success: true });
						break;

					case MESSAGE_TYPES.ANALYZE_CONTENT_ENSEMBLE:
						initialize(); // Initialize when needed
						await analyzeContentEnsemble(
							request.promptId || "",
							request.source,
							request.analysisId || "",
							request.typeFilter,
							(request as any).ensembleOptions,
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
								handleAnalysisResults(request.data as AnalysisResults),
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
						uiManager.showErrorBanner(request.message || "An error occurred");
						sendResponse({ success: true });
						break;

					case MESSAGE_TYPES.SHOW_INFO:
						// No need to initialize for info display
						uiManager.showInfoBanner(request.message || "Information");
						sendResponse({ success: true });
						break;

					case MESSAGE_TYPES.SHOW_API_KEY_ERROR: {
						// No need to initialize for error display
						const errorType = (request as any).errorType || "missing_key";
						uiManager.showApiKeyErrorBanner(errorType);
						sendResponse({ success: true });
						break;
					}

					case MESSAGE_TYPES.DEBUG_LOG:
						// Handle debug log forwarding to page console (development mode only)
						if (isDevMode() && request.data) {
							handleDebugLog(request.data as DebugLogMessage);
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
				const errorMessage =
					error instanceof Error ? error.message : "Unknown error occurred";
				sendResponse({ success: false, error: errorMessage });
			}
		}

		async function analyzeContent(
			promptId: string,
			source?: string,
			providedAnalysisId?: string,
			typeFilter?: TypeFilterOptions,
			useTwoPhase?: boolean,
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
				const analysisRequest = {
					content: content,
					promptId: promptId,
					url: window.location.href,
					analysisId: analysisId,
					source: source as "popup" | "context-menu",
					typeFilter: typeFilter,
					useTwoPhase: useTwoPhase,
				};

				performanceMonitor.startTimer("api_request");
				const response = await sendMessageToBackground(
					MESSAGE_TYPES.ANALYZE_CONTENT,
					analysisRequest as any,
				);
				performanceMonitor.logTimer("api_request", "Background API call");

				if (response.success && response.data) {
					await measureDOMOperation("display_results", () =>
						handleAnalysisResults(response.data as AnalysisResults, source),
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
					const errorMessage =
						response.error || "Analysis failed. Please try again.";
					const isProviderError =
						errorMessage.toLowerCase().includes("provider") ||
						errorMessage.toLowerCase().includes("openrouter") ||
						errorMessage.toLowerCase().includes("gemini") ||
						errorMessage.toLowerCase().includes("anthropic");

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

				const errorMessage =
					error instanceof Error
						? error.message
						: "Analysis failed with an unexpected error.";
				uiManager.showErrorBanner(
					`🔥 Analysis Error: ${errorMessage} Please try again.`,
				);

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

		async function analyzeContentEnsemble(
			promptId: string,
			source?: string,
			providedAnalysisId?: string,
			typeFilter?: TypeFilterOptions,
			ensembleOptions?: { runs: number; mode: string },
		): Promise<void> {
			try {
				performanceMonitor.startTimer("total_ensemble_analysis");

				// Use provided analysis ID or generate new one
				const analysisId = providedAnalysisId || generateAnalysisId();

				// Start real-time progress tracking in UI manager
				uiManager.startRealTimeProgress(analysisId, source);

				// Show ensemble-specific progress banner
				if (source !== "popup") {
					uiManager.showProgressBanner();
				}

				// Extract content from the page using the same logic as regular analysis
				const structuredContent = await measureContentExtraction(
					"ensemble_page_content",
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

				// Get ensemble options if not provided
				let finalEnsembleOptions = ensembleOptions;
				if (!finalEnsembleOptions) {
					// Use hardcoded defaults since content scripts should receive options from callers
					finalEnsembleOptions = { runs: 3, mode: "balanced" };
				}

				// Send ensemble analysis request to background script
				const ensembleRequest = {
					content: content,
					promptId: promptId,
					url: window.location.href,
					analysisId: analysisId,
					source: source as "popup" | "context-menu",
					typeFilter: typeFilter,
					ensembleOptions: finalEnsembleOptions,
				};

				performanceMonitor.startTimer("ensemble_api_request");
				const response = await sendMessageToBackground(
					MESSAGE_TYPES.ANALYZE_CONTENT_ENSEMBLE,
					ensembleRequest as any,
				);
				performanceMonitor.logTimer(
					"ensemble_api_request",
					"Ensemble Background API call",
				);

				if (response.success && response.data) {
					await measureDOMOperation("display_ensemble_results", () =>
						handleAnalysisResults(response.data as AnalysisResults, source),
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

					// Enhanced error message for ensemble failures
					const errorMessage =
						response.error || "Ensemble analysis failed. Please try again.";
					const isProviderError =
						errorMessage.toLowerCase().includes("provider") ||
						errorMessage.toLowerCase().includes("openrouter") ||
						errorMessage.toLowerCase().includes("gemini") ||
						errorMessage.toLowerCase().includes("anthropic");

					const displayMessage = isProviderError
						? `🔥 LLM Provider Error: ${errorMessage}`
						: `🎯 Ensemble Error: ${errorMessage}`;

					console.error(
						"Ensemble analysis failed with provider error:",
						errorMessage,
					);
					uiManager.showErrorBanner(displayMessage);

					// Notify popup of error
					chrome.runtime.sendMessage({
						type: MESSAGE_TYPES.ANALYSIS_ERROR,
						error: errorMessage,
					});
				}
			} catch (error) {
				console.error("Ensemble analysis failed with exception:", error);
				if (source !== "popup") {
					uiManager.hideProgressBanner();
				}

				const errorMessage =
					error instanceof Error
						? error.message
						: "Ensemble analysis failed with an unexpected error.";
				uiManager.showErrorBanner(
					`🎯 Ensemble Analysis Error: ${errorMessage} Please try again.`,
				);

				// Notify popup of error
				chrome.runtime.sendMessage({
					type: MESSAGE_TYPES.ANALYSIS_ERROR,
					error: errorMessage,
				});
			} finally {
				performanceMonitor.logTimer(
					"total_ensemble_analysis",
					"Complete ensemble analysis workflow",
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
			results: AnalysisResults,
			source?: string,
		): Promise<void> {
			// Debug logging to identify the issue
			console.log("[Content Script] handleAnalysisResults called with:", {
				results,
				resultsType: typeof results,
				hasGoldenNuggets: results && "golden_nuggets" in results,
				goldenNuggetsType: results?.golden_nuggets
					? typeof results.golden_nuggets
					: "undefined",
				goldenNuggetsLength: Array.isArray(results?.golden_nuggets)
					? results.golden_nuggets.length
					: "not array",
			});

			// Validate results structure to prevent runtime errors
			if (!results || typeof results !== "object") {
				console.error("Invalid analysis results:", results);
				uiManager.showErrorBanner(
					"Analysis failed due to invalid response data. Please try again.",
				);
				return;
			}

			// Try multiple possible data structures
			let nuggets: GoldenNugget[] = [];
			if (Array.isArray(results.golden_nuggets)) {
				nuggets = results.golden_nuggets;
			} else if (Array.isArray(results.data?.golden_nuggets)) {
				nuggets = results.data.golden_nuggets;
			} else if (Array.isArray(results.nuggets)) {
				nuggets = results.nuggets;
			}

			// Extract provider metadata
			const providerMetadata = results.providerMetadata || null;

			console.log("[Content Script] Nuggets extraction attempt:", {
				foundStructure: nuggets.length > 0 ? "success" : "failed",
				nuggetCount: nuggets.length,
				providerMetadata: providerMetadata,
			});

			console.log("[Content Script] Extracted nuggets:", {
				nuggetsLength: nuggets.length,
				firstNugget: nuggets[0] || "none",
				extractedPageContentLength: extractedPageContent?.length || 0,
			});

			// Hide the progress banner now that we have results (only if not triggered from popup)
			if (source !== "popup") {
				uiManager.hideProgressBanner();
			}

			if (nuggets.length === 0) {
				console.warn("[Content Script] No nuggets found, showing empty state");
				uiManager.showNoResultsBanner();
				// Still show sidebar with empty state for better UX
				await uiManager.displayResults(
					[],
					extractedPageContent || undefined,
					providerMetadata || undefined,
				);
				return;
			}

			console.log(
				"[Content Script] Calling uiManager.displayResults with",
				nuggets.length,
				"nuggets",
			);
			// Highlight nuggets on the page and show sidebar with page content for reconstruction
			await uiManager.displayResults(
				nuggets,
				extractedPageContent || undefined,
				providerMetadata || undefined,
			);
		}

		function sendMessageToBackground(
			type: string,
			data?: BackgroundMessageRequest,
		): Promise<BackgroundMessageResponse> {
			return new Promise((resolve) => {
				const message: BackgroundMessageRequest = { type, ...data };
				chrome.runtime.sendMessage(
					message,
					(response: BackgroundMessageResponse) => {
						resolve(
							response || { success: false, error: "No response received" },
						);
					},
				);
			});
		}

		// Content script is ready for dynamic injection and message handling
		// Initialization happens on-demand when messages are received
	},
});
