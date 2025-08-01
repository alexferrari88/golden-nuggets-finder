import { debugLogger } from "../shared/debug";
import { storage } from "../shared/storage";
import { ApiKeyStorage } from "../shared/storage/api-key-storage";
import {
	type AnalysisProgressMessage,
	type AnalysisRequest,
	type AnalysisResponse,
	type FeedbackSubmission,
	MESSAGE_TYPES,
	type MissingContentFeedback,
	type NuggetFeedback,
} from "../shared/types";
import type {
	GoldenNuggetsResponse,
	ProviderConfig,
	ProviderId,
} from "../shared/types/providers";
import { ErrorHandler } from "./services/error-handler";
import { ProviderFactory } from "./services/provider-factory";
import { ProviderSwitcher } from "./services/provider-switcher";
import { normalize as normalizeResponse } from "./services/response-normalizer";
import { TypeFilterService } from "./type-filter-service";

// Utility function to generate unique analysis IDs
function generateAnalysisId(): string {
	return `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export class MessageHandler {
	// Helper to classify and enhance backend error messages for users
	private enhanceBackendError(error: any): {
		message: string;
		showToUser: boolean;
		retryable: boolean;
	} {
		const errorMessage = (error as Error).message.toLowerCase();
		const originalMessage = (error as Error).message;

		// Network/Connection errors
		if (
			errorMessage.includes("failed to fetch") ||
			errorMessage.includes("networkerror") ||
			errorMessage.includes("network error")
		) {
			return {
				message:
					"Backend service is unavailable. Your data has been saved locally and will sync when the backend is available.",
				showToUser: true,
				retryable: true,
			};
		}

		// Database errors
		if (
			errorMessage.includes("database is locked") ||
			errorMessage.includes("database error")
		) {
			return {
				message:
					"Backend database is temporarily busy. Your data has been saved locally and will sync when available.",
				showToUser: true,
				retryable: true,
			};
		}

		// DSPy configuration errors
		if (
			errorMessage.includes("dspy not available") ||
			errorMessage.includes("install with: pip install dspy-ai")
		) {
			return {
				message:
					"Backend optimization system not configured. Using default prompts. Contact administrator to enable DSPy optimization.",
				showToUser: true,
				retryable: false,
			};
		}

		// DSPy training data errors
		if (
			errorMessage.includes("not enough training examples") ||
			errorMessage.includes("need at least")
		) {
			const match = originalMessage.match(/need at least (\d+)/i);
			const required = match ? match[1] : "more";
			return {
				message: `More feedback needed for optimization (need at least ${required} items). Keep using the extension to provide feedback.`,
				showToUser: true,
				retryable: false,
			};
		}

		// API key/configuration errors
		if (
			errorMessage.includes("gemini_api_key") ||
			errorMessage.includes("environment variable")
		) {
			return {
				message:
					"Backend API configuration missing. Contact administrator to configure Gemini API key.",
				showToUser: true,
				retryable: false,
			};
		}

		// Server errors (500)
		if (
			errorMessage.includes("500") ||
			errorMessage.includes("internal server error")
		) {
			return {
				message:
					"Backend server error occurred. Your data has been saved locally. Please try again later.",
				showToUser: true,
				retryable: true,
			};
		}

		// Timeout errors
		if (
			errorMessage.includes("timed out") ||
			errorMessage.includes("timeout")
		) {
			return {
				message:
					"Backend request timed out. Your data has been saved locally. Please try again.",
				showToUser: true,
				retryable: true,
			};
		}

		// Generic server error - preserve original message but make it user-friendly
		return {
			message: `Backend error: ${originalMessage.replace(/^[^:]*:\s*/, "")}. Your data has been saved locally.`,
			showToUser: true,
			retryable: true,
		};
	}

	// Helper to notify users of backend errors
	private async notifyUserOfBackendError(
		tabId: number | undefined,
		errorInfo: { message: string; showToUser: boolean; retryable: boolean },
	) {
		if (!errorInfo.showToUser || !tabId) return;

		// Send error notification to content script for user visibility
		try {
			await chrome.tabs.sendMessage(tabId, {
				type: MESSAGE_TYPES.SHOW_ERROR,
				message: errorInfo.message,
				retryable: errorInfo.retryable,
			});
		} catch (error) {
			// Content script might not be ready, that's okay
			console.log("Could not send backend error to content script:", error);
		}
	}

	// Helper to notify users of duplicate feedback submissions
	private async notifyUserOfDuplication(
		tabId: number | undefined,
		message: string,
	) {
		if (!tabId) return;

		// Send info notification to content script for user visibility
		try {
			await chrome.tabs.sendMessage(tabId, {
				type: MESSAGE_TYPES.SHOW_INFO,
				message: message,
			});
		} catch (error) {
			// Content script might not be ready, that's okay
			console.log(
				"Could not send deduplication info to content script:",
				error,
			);
		}
	}

	// Helper to send progress messages to all listeners
	private sendProgressMessage(
		progressType: AnalysisProgressMessage["type"],
		step: 1 | 2 | 3 | 4,
		message: string,
		analysisId: string,
		source?: "popup" | "context-menu",
		tabId?: number,
	): void {
		const progressMessage: AnalysisProgressMessage = {
			type: progressType,
			step,
			message,
			timestamp: Date.now(),
			analysisId,
			source,
		};

		// Send to all extension contexts (popup, content script, etc.)
		chrome.runtime.sendMessage(progressMessage).catch(() => {
			// Ignore errors - popup might not be open
		});

		// Also send specifically to the tab if we have a tab ID
		if (tabId) {
			chrome.tabs.sendMessage(tabId, progressMessage).catch(() => {
				// Ignore errors - content script might not be ready
			});
		}
	}

	// Helper to get the selected provider configuration from storage with fallback support
	private static async getSelectedProvider(): Promise<ProviderConfig> {
		// Get selected provider from storage
		const result = await chrome.storage.local.get(["selectedProvider"]);
		let providerId = result.selectedProvider;

		// If no provider is explicitly selected, find the first configured provider
		if (!providerId) {
			const availableProviders = await ProviderSwitcher.getAvailableProviders();
			if (availableProviders.length > 0) {
				providerId = availableProviders[0];
				console.log(`No provider selected, using first available: ${providerId}`);
				// Automatically set this as the selected provider
				await chrome.storage.local.set({ selectedProvider: providerId });
			} else {
				throw new Error(
					`No configured providers available. Please configure an API key in the options page.`,
				);
			}
		} else {
			// Check if selected provider is still configured
			const isConfigured =
				await ProviderSwitcher.isProviderConfigured(providerId);
			if (!isConfigured) {
				console.warn(
					`Selected provider ${providerId} is not configured, trying fallback...`,
				);

				// Try to switch to a fallback provider
				const fallbackProviderId =
					await ProviderSwitcher.switchToFallbackProvider();
				if (fallbackProviderId) {
					providerId = fallbackProviderId;
					console.log(`Switched to fallback provider: ${providerId}`);
				} else {
					throw new Error(
						`No configured providers available. Please configure an API key in the options page.`,
					);
				}
			}
		}

		// Get API key for provider
		let apiKey: string;
		if (providerId === "gemini") {
			// Use existing Gemini key storage
			const geminiResult = await chrome.storage.local.get(["geminiApiKey"]);
			apiKey = geminiResult.geminiApiKey;
		} else {
			apiKey = await ApiKeyStorage.get(providerId);
		}

		if (!apiKey) {
			throw new Error(`No API key found for provider: ${providerId}`);
		}

		return {
			providerId,
			apiKey,
			modelName: await ProviderFactory.getSelectedModel(providerId),
		};
	}

	// Helper to handle golden nuggets extraction using provider routing with error handling and fallback
	static async handleExtractGoldenNuggets(
		content: string,
		prompt: string,
	): Promise<GoldenNuggetsResponse> {
		let currentProviderId: ProviderId | null = null;
		let attempts = 0;
		const maxAttempts = 2; // Limit to 2 attempts to prevent infinite loops

		while (attempts < maxAttempts) {
			try {
				attempts++;

				// Get provider configuration (may change if we fall back)
				const providerConfig = await MessageHandler.getSelectedProvider();
				currentProviderId = providerConfig.providerId;

				console.log(`Attempt ${attempts}: Using provider ${currentProviderId}`);

				// Create provider instance
				const provider = await ProviderFactory.createProvider(providerConfig);

				// Extract golden nuggets
				const startTime = performance.now();
				const rawResponse = await provider.extractGoldenNuggets(
					content,
					prompt,
				);
				const responseTime = performance.now() - startTime;

				// Normalize response
				const normalizedResponse = normalizeResponse(
					rawResponse,
					providerConfig.providerId,
				);

				// Store provider metadata for feedback
				await chrome.storage.local.set({
					lastUsedProvider: {
						providerId: providerConfig.providerId,
						modelName: providerConfig.modelName,
						responseTime,
					},
				});

				// Clear retry count on success
				if (currentProviderId) {
					ErrorHandler.resetRetryCount(currentProviderId, "extraction");
				}

				return normalizedResponse;
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error);
				console.error(
					`Golden nuggets extraction failed (attempt ${attempts}):`,
					errorMessage,
				);

				// Check for structural errors that indicate a programming bug (don't retry these)
				const isStructuralError = errorMessage.includes("Cannot read properties of undefined") ||
					errorMessage.includes("is not a function") ||
					errorMessage.includes("Cannot read property") ||
					errorMessage.includes("undefined is not an object");

				if (isStructuralError) {
					console.error("Structural error detected, stopping retries:", errorMessage);
					throw new Error(`Provider configuration error: ${errorMessage}. Please check extension configuration.`);
				}

				if (currentProviderId) {
					// Handle the error using our comprehensive error handler
					const errorResult = await ErrorHandler.handleProviderError(
						error as Error,
						currentProviderId,
						"extraction",
					);

					if (errorResult.shouldRetry && attempts < maxAttempts) {
						console.log(
							`Retrying with ${currentProviderId} after error handling... (attempt ${attempts}/${maxAttempts})`,
						);
						continue; // Retry with same provider
					}

					if (errorResult.fallbackProvider && attempts < maxAttempts) {
						console.log(
							`Switching to fallback provider: ${errorResult.fallbackProvider}`,
						);

						// Switch to fallback provider
						const switchSuccess = await ProviderSwitcher.switchProvider(
							errorResult.fallbackProvider,
						);
						if (switchSuccess) {
							console.log(
								`Successfully switched to fallback provider: ${errorResult.fallbackProvider}`,
							);
							continue; // Try again with fallback provider
						} else {
							console.error(
								`Failed to switch to fallback provider: ${errorResult.fallbackProvider}`,
							);
						}
					}
				}

				// If we're on the last attempt or no more fallbacks, throw the error
				if (attempts >= maxAttempts) {
					const userFriendlyMessage = currentProviderId
						? ErrorHandler.getUserFriendlyMessage(
								error as Error,
								currentProviderId,
							)
						: errorMessage;
					console.error(`All attempts exhausted. Final error: ${userFriendlyMessage}`);
					throw new Error(userFriendlyMessage);
				}
			}
		}

		// This should never be reached, but just in case
		throw new Error("All providers failed after maximum attempts");
	}

	async handleMessage(
		request: any,
		sender: chrome.runtime.MessageSender,
		sendResponse: (response: any) => void,
	): Promise<void> {
		try {
			switch (request.type) {
				case MESSAGE_TYPES.ANALYZE_CONTENT:
					await this.handleAnalyzeContent(request, sender, sendResponse);
					break;

				case MESSAGE_TYPES.ANALYZE_SELECTED_CONTENT:
					await this.handleAnalyzeSelectedContent(
						request,
						sender,
						sendResponse,
					);
					break;

				case MESSAGE_TYPES.GET_PROMPTS:
					await this.handleGetPrompts(sendResponse);
					break;

				case MESSAGE_TYPES.SAVE_PROMPT:
					await this.handleSavePrompt(request, sendResponse);
					break;

				case MESSAGE_TYPES.DELETE_PROMPT:
					await this.handleDeletePrompt(request, sendResponse);
					break;

				case MESSAGE_TYPES.SET_DEFAULT_PROMPT:
					await this.handleSetDefaultPrompt(request, sendResponse);
					break;

				case MESSAGE_TYPES.GET_CONFIG:
					await this.handleGetConfig(sendResponse);
					break;

				case MESSAGE_TYPES.SAVE_CONFIG:
					await this.handleSaveConfig(request, sendResponse);
					break;

				case MESSAGE_TYPES.OPEN_OPTIONS_PAGE:
					await this.handleOpenOptionsPage(sendResponse);
					break;

				case MESSAGE_TYPES.SUBMIT_NUGGET_FEEDBACK:
					await this.handleSubmitNuggetFeedback(request, sender, sendResponse);
					break;

				case MESSAGE_TYPES.DELETE_NUGGET_FEEDBACK:
					await this.handleDeleteNuggetFeedback(request, sender, sendResponse);
					break;

				case MESSAGE_TYPES.SUBMIT_MISSING_CONTENT_FEEDBACK:
					await this.handleSubmitMissingContentFeedback(
						request,
						sender,
						sendResponse,
					);
					break;

				case MESSAGE_TYPES.GET_FEEDBACK_STATS:
					await this.handleGetFeedbackStats(sendResponse);
					break;

				case MESSAGE_TYPES.TRIGGER_OPTIMIZATION:
					await this.handleTriggerOptimization(request, sendResponse);
					break;

				case MESSAGE_TYPES.GET_CURRENT_OPTIMIZED_PROMPT:
					await this.handleGetCurrentOptimizedPrompt(sendResponse);
					break;

				case MESSAGE_TYPES.SWITCH_PROVIDER:
					await this.handleSwitchProvider(request, sendResponse);
					break;

				case MESSAGE_TYPES.GET_AVAILABLE_PROVIDERS:
					await this.handleGetAvailableProviders(sendResponse);
					break;

				case MESSAGE_TYPES.GET_CURRENT_PROVIDER:
					await this.handleGetCurrentProvider(sendResponse);
					break;

				case MESSAGE_TYPES.VALIDATE_PROVIDER:
					await this.handleValidateProvider(request, sendResponse);
					break;

				case "DEBUG_TEST":
					// Test logging in background script
					console.log("🔍 [DEBUG TEST] Background script console logging test");
					debugLogger.log("🔍 [DEBUG TEST] DebugLogger test from background script");
					debugLogger.logLLMRequest("https://test-endpoint.com/background-test", { test: "This is a background test request" });
					debugLogger.logLLMResponse({ test: "This is a background test response" });
					sendResponse({ success: true, message: "Debug test completed in background script" });
					break;

				default:
					sendResponse({ success: false, error: "Unknown message type" });
			}
		} catch (error) {
			console.error("Error handling message:", error);
			sendResponse({ success: false, error: (error as Error).message });
		}
	}

	private async handleAnalyzeContent(
		request: AnalysisRequest,
		sender: chrome.runtime.MessageSender,
		sendResponse: (response: AnalysisResponse) => void,
	): Promise<void> {
		try {
			// Generate analysis ID if not provided
			const analysisId = request.analysisId || generateAnalysisId();
			const source = request.source || "context-menu";

			const prompts = await storage.getPrompts();
			const prompt = prompts.find((p) => p.id === request.promptId);

			if (!prompt) {
				sendResponse({ success: false, error: "Prompt not found" });
				return;
			}

			// Send step 1 progress: content extraction
			this.sendProgressMessage(
				MESSAGE_TYPES.ANALYSIS_CONTENT_EXTRACTED,
				1,
				"Extracting key insights",
				analysisId,
				source,
				sender.tab?.id,
			);

			// Replace {{ source }} placeholder with appropriate source type
			let processedPrompt = this.replaceSourcePlaceholder(
				prompt.prompt,
				request.url,
			);

			// Check if we should use optimized prompt from backend
			try {
				const optimizedPromptResponse =
					await this.getOptimizedPromptIfAvailable();
				if (optimizedPromptResponse?.prompt) {
					console.log("Using optimized prompt from backend DSPy system");
					processedPrompt = this.replaceSourcePlaceholder(
						optimizedPromptResponse.prompt,
						request.url,
					);
				}
			} catch (error) {
				console.log(
					"No optimized prompt available, using default:",
					(error as Error).message,
				);
				// Continue with default prompt
			}

			// Apply type filtering if specified
			if (request.typeFilter && request.typeFilter.selectedTypes.length > 0) {
				// Validate selected types
				if (
					!TypeFilterService.validateSelectedTypes(
						request.typeFilter.selectedTypes,
					)
				) {
					sendResponse({
						success: false,
						error: "Invalid nugget types selected",
					});
					return;
				}

				// Generate filtered prompt
				processedPrompt = TypeFilterService.generateFilteredPrompt(
					processedPrompt,
					request.typeFilter.selectedTypes,
				);
			}

			// Send step 2 progress: content optimization
			this.sendProgressMessage(
				MESSAGE_TYPES.ANALYSIS_CONTENT_OPTIMIZED,
				2,
				"Identifying patterns",
				analysisId,
				source,
				sender.tab?.id,
			);

			// Send step 3 progress: API request start
			this.sendProgressMessage(
				MESSAGE_TYPES.ANALYSIS_API_REQUEST_START,
				3,
				"Sending to AI model",
				analysisId,
				source,
				sender.tab?.id,
			);

			const result = await MessageHandler.handleExtractGoldenNuggets(
				request.content,
				processedPrompt,
			);

			// Send step 4 progress: processing results
			this.sendProgressMessage(
				MESSAGE_TYPES.ANALYSIS_PROCESSING_RESULTS,
				4,
				"Processing results",
				analysisId,
				source,
				sender.tab?.id,
			);

			sendResponse({ success: true, data: result });
		} catch (error) {
			console.error("Analysis failed:", error);
			
			// Send error to content script to clear loading states
			if (sender.tab?.id) {
				await chrome.tabs.sendMessage(sender.tab.id, {
					type: MESSAGE_TYPES.ANALYSIS_ERROR,
					error: (error as Error).message,
					analysisId: request.analysisId || generateAnalysisId(),
				}).catch(() => {
					// Content script might not be ready, that's okay
					console.log("Could not send analysis error to content script");
				});
			}
			
			sendResponse({ success: false, error: (error as Error).message });
		}
	}

	private async handleAnalyzeSelectedContent(
		request: any,
		sender: chrome.runtime.MessageSender,
		sendResponse: (response: any) => void,
	): Promise<void> {
		try {
			// Generate analysis ID if not provided
			const analysisId = request.analysisId || generateAnalysisId();
			const source = "context-menu"; // Selected content is always from context menu

			const prompts = await storage.getPrompts();
			const prompt = prompts.find((p) => p.id === request.promptId);

			if (!prompt) {
				sendResponse({ success: false, error: "Prompt not found" });
				return;
			}

			// Send step 1 progress: content extraction
			this.sendProgressMessage(
				MESSAGE_TYPES.ANALYSIS_CONTENT_EXTRACTED,
				1,
				"Extracting key insights",
				analysisId,
				source,
				sender.tab?.id,
			);

			// Replace {{ source }} placeholder with appropriate source type
			let processedPrompt = this.replaceSourcePlaceholder(
				prompt.prompt,
				request.url,
			);

			// Check if we should use optimized prompt from backend
			try {
				const optimizedPromptResponse =
					await this.getOptimizedPromptIfAvailable();
				if (optimizedPromptResponse?.prompt) {
					console.log(
						"Using optimized prompt from backend DSPy system for selected content",
					);
					processedPrompt = this.replaceSourcePlaceholder(
						optimizedPromptResponse.prompt,
						request.url,
					);
				}
			} catch (error) {
				console.log(
					"No optimized prompt available for selected content, using default:",
					(error as Error).message,
				);
				// Continue with default prompt
			}

			// Apply type filtering if specified
			if (request.typeFilter && request.typeFilter.selectedTypes.length > 0) {
				// Validate selected types
				if (
					!TypeFilterService.validateSelectedTypes(
						request.typeFilter.selectedTypes,
					)
				) {
					sendResponse({
						success: false,
						error: "Invalid nugget types selected",
					});
					return;
				}

				// Generate filtered prompt
				processedPrompt = TypeFilterService.generateFilteredPrompt(
					processedPrompt,
					request.typeFilter.selectedTypes,
				);
			}

			// Send step 2 progress: content optimization
			this.sendProgressMessage(
				MESSAGE_TYPES.ANALYSIS_CONTENT_OPTIMIZED,
				2,
				"Identifying patterns",
				analysisId,
				source,
				sender.tab?.id,
			);

			// Send step 3 progress: API request start
			this.sendProgressMessage(
				MESSAGE_TYPES.ANALYSIS_API_REQUEST_START,
				3,
				"Sending to AI model",
				analysisId,
				source,
				sender.tab?.id,
			);

			const result = await MessageHandler.handleExtractGoldenNuggets(
				request.content,
				processedPrompt,
			);

			// Send step 4 progress: processing results
			this.sendProgressMessage(
				MESSAGE_TYPES.ANALYSIS_PROCESSING_RESULTS,
				4,
				"Processing results",
				analysisId,
				source,
				sender.tab?.id,
			);

			// Send results to content script for display
			if (sender.tab?.id) {
				await chrome.tabs.sendMessage(sender.tab.id, {
					type: MESSAGE_TYPES.ANALYSIS_COMPLETE,
					data: result,
				});
			}

			sendResponse({ success: true, data: result });
		} catch (error) {
			console.error("Selected content analysis failed:", error);

			// Send error to content script
			if (sender.tab?.id) {
				await chrome.tabs.sendMessage(sender.tab.id, {
					type: MESSAGE_TYPES.ANALYSIS_ERROR,
					error: (error as Error).message,
				});
			}

			sendResponse({ success: false, error: (error as Error).message });
		}
	}

	private async handleGetPrompts(
		sendResponse: (response: any) => void,
	): Promise<void> {
		try {
			const prompts = await storage.getPrompts();

			// Try to add current optimized prompt if available
			try {
				const optimizedPromptResponse =
					await this.getOptimizedPromptIfAvailable();
				if (
					optimizedPromptResponse?.prompt &&
					optimizedPromptResponse.version > 0
				) {
					const optimizedPromptItem = {
						id: `optimized-v${optimizedPromptResponse.version}`,
						name: `🚀 Optimized Prompt v${optimizedPromptResponse.version} (DSPy)`,
						prompt: optimizedPromptResponse.prompt,
						isDefault: false,
						isOptimized: true,
						optimizationDate: optimizedPromptResponse.optimizationDate,
						performance: optimizedPromptResponse.performance,
					};

					// Add optimized prompt at the beginning of the list
					const promptsWithOptimized = [optimizedPromptItem, ...prompts];
					console.log("Added optimized prompt to prompts list");
					sendResponse({ success: true, data: promptsWithOptimized });
					return;
				}
			} catch (error) {
				console.log(
					"No optimized prompt available for prompts list:",
					(error as Error).message,
				);
				// Continue with regular prompts
			}

			sendResponse({ success: true, data: prompts });
		} catch (error) {
			sendResponse({ success: false, error: (error as Error).message });
		}
	}

	private async handleSavePrompt(
		request: any,
		sendResponse: (response: any) => void,
	): Promise<void> {
		try {
			await storage.savePrompt(request.prompt);
			sendResponse({ success: true });
		} catch (error) {
			sendResponse({ success: false, error: (error as Error).message });
		}
	}

	private async handleDeletePrompt(
		request: any,
		sendResponse: (response: any) => void,
	): Promise<void> {
		try {
			await storage.deletePrompt(request.promptId);
			sendResponse({ success: true });
		} catch (error) {
			sendResponse({ success: false, error: (error as Error).message });
		}
	}

	private async handleSetDefaultPrompt(
		request: any,
		sendResponse: (response: any) => void,
	): Promise<void> {
		try {
			await storage.setDefaultPrompt(request.promptId);
			sendResponse({ success: true });
		} catch (error) {
			sendResponse({ success: false, error: (error as Error).message });
		}
	}

	private async handleGetConfig(
		sendResponse: (response: any) => void,
	): Promise<void> {
		try {
			const config = await storage.getConfig({
				source: "background",
				action: "read",
				timestamp: Date.now(),
			});
			sendResponse({ success: true, data: config });
		} catch (error) {
			sendResponse({ success: false, error: (error as Error).message });
		}
	}

	private async handleSaveConfig(
		request: any,
		sendResponse: (response: any) => void,
	): Promise<void> {
		try {
			await storage.saveConfig(request.config, {
				source: "background",
				action: "write",
				timestamp: Date.now(),
			});
			sendResponse({ success: true });
		} catch (error) {
			sendResponse({ success: false, error: (error as Error).message });
		}
	}

	private async handleOpenOptionsPage(
		sendResponse: (response: any) => void,
	): Promise<void> {
		try {
			await chrome.runtime.openOptionsPage();
			sendResponse({ success: true });
		} catch (error) {
			sendResponse({ success: false, error: (error as Error).message });
		}
	}

	private replaceSourcePlaceholder(prompt: string, url: string): string {
		const sourceType = this.detectSourceType(url);
		return prompt.replace(/\{\{\s*source\s*\}\}/g, sourceType);
	}

	private detectSourceType(url: string): string {
		if (url.includes("news.ycombinator.com")) {
			return "HackerNews thread";
		} else if (url.includes("reddit.com")) {
			return "Reddit thread";
		} else if (url.includes("twitter.com") || url.includes("x.com")) {
			return "Twitter thread";
		} else {
			return "text";
		}
	}

	// Feedback System Handlers

	private async handleSubmitNuggetFeedback(
		request: any,
		sender: chrome.runtime.MessageSender,
		sendResponse: (response: any) => void,
	): Promise<void> {
		try {
			const feedback: NuggetFeedback = request.feedback;

			if (!feedback) {
				sendResponse({ success: false, error: "No feedback data provided" });
				return;
			}

			// Add provider metadata from last used provider
			const providerInfo = await chrome.storage.local.get(["lastUsedProvider"]);
			const feedbackWithProvider = {
				...feedback,
				modelProvider: providerInfo.lastUsedProvider?.providerId || "gemini",
				modelName:
					providerInfo.lastUsedProvider?.modelName || "gemini-2.5-flash",
			};

			// Store feedback locally as backup
			await this.storeFeedbackLocally("nugget", feedbackWithProvider);

			// Send to backend API
			try {
				const result = await this.sendFeedbackToBackend({
					nuggetFeedback: [feedbackWithProvider],
				});
				console.log("Nugget feedback sent to backend:", result);

				// Check for deduplication information and notify user if needed
				if (result.deduplication?.user_message) {
					await this.notifyUserOfDuplication(
						sender.tab?.id,
						result.deduplication.user_message,
					);
				}

				sendResponse({
					success: true,
					message: "Feedback submitted successfully",
					deduplication: result.deduplication,
				});
			} catch (error) {
				console.error("Failed to send nugget feedback to backend:", error);

				// Classify backend error and notify user
				const errorInfo = this.enhanceBackendError(error);
				await this.notifyUserOfBackendError(sender.tab?.id, errorInfo);

				// Still return success since data was stored locally as fallback
				sendResponse({
					success: true,
					message: "Feedback saved locally (backend unavailable)",
					warning: errorInfo.message,
				});
			}
		} catch (error) {
			console.error("Failed to submit nugget feedback:", error);
			sendResponse({ success: false, error: (error as Error).message });
		}
	}

	private async handleDeleteNuggetFeedback(
		request: any,
		sender: chrome.runtime.MessageSender,
		sendResponse: (response: any) => void,
	): Promise<void> {
		try {
			const feedbackId: string = request.feedbackId;

			if (!feedbackId) {
				sendResponse({ success: false, error: "No feedback ID provided" });
				return;
			}

			// Remove from local storage backup
			await this.removeFeedbackLocally("nugget", feedbackId);

			// Send delete request to backend API
			try {
				const result = await this.deleteFeedbackFromBackend(feedbackId);
				console.log("Nugget feedback deleted from backend:", result);

				sendResponse({
					success: true,
					message: "Feedback deleted successfully",
				});
			} catch (error) {
				console.error("Failed to delete nugget feedback from backend:", error);

				// Classify backend error and notify user
				const errorInfo = this.enhanceBackendError(error);
				await this.notifyUserOfBackendError(sender.tab?.id, errorInfo);

				// Still return success since data was removed locally as fallback
				sendResponse({
					success: true,
					message: "Feedback removed locally (backend unavailable)",
					warning: errorInfo.message,
				});
			}
		} catch (error) {
			console.error("Failed to delete nugget feedback:", error);
			sendResponse({ success: false, error: (error as Error).message });
		}
	}

	private async handleSubmitMissingContentFeedback(
		request: any,
		sender: chrome.runtime.MessageSender,
		sendResponse: (response: any) => void,
	): Promise<void> {
		try {
			const missingContentFeedback: MissingContentFeedback[] =
				request.missingContentFeedback;

			if (!missingContentFeedback || missingContentFeedback.length === 0) {
				sendResponse({
					success: false,
					error: "No missing content feedback provided",
				});
				return;
			}

			// Add provider metadata to all missing content feedback from last used provider
			const providerInfo = await chrome.storage.local.get(["lastUsedProvider"]);
			const missingContentWithProvider = missingContentFeedback.map(
				(feedback) => ({
					...feedback,
					modelProvider: providerInfo.lastUsedProvider?.providerId || "gemini",
					modelName:
						providerInfo.lastUsedProvider?.modelName || "gemini-2.5-flash",
				}),
			);

			// Store feedback locally as backup
			for (const feedback of missingContentWithProvider) {
				await this.storeFeedbackLocally("missing", feedback);
			}

			// Send to backend API
			try {
				const result = await this.sendFeedbackToBackend({
					missingContentFeedback: missingContentWithProvider,
				});
				console.log("Missing content feedback sent to backend:", result);

				// Check for deduplication information and notify user if needed
				if (result.deduplication?.user_message) {
					await this.notifyUserOfDuplication(
						sender.tab?.id,
						result.deduplication.user_message,
					);
				}

				sendResponse({
					success: true,
					message: `${missingContentFeedback.length} missing content feedback items submitted successfully`,
					deduplication: result.deduplication,
				});
			} catch (error) {
				console.error(
					"Failed to send missing content feedback to backend:",
					error,
				);

				// Classify backend error and notify user
				const errorInfo = this.enhanceBackendError(error);
				await this.notifyUserOfBackendError(sender.tab?.id, errorInfo);

				// Still return success since data was stored locally as fallback
				sendResponse({
					success: true,
					message: `${missingContentFeedback.length} feedback items saved locally (backend unavailable)`,
					warning: errorInfo.message,
				});
			}
		} catch (error) {
			console.error("Failed to submit missing content feedback:", error);
			sendResponse({ success: false, error: (error as Error).message });
		}
	}

	private async handleGetFeedbackStats(
		sendResponse: (response: any) => void,
	): Promise<void> {
		try {
			// Get stats from backend API
			const response = await fetch("http://localhost:7532/feedback/stats", {
				method: "GET",
				headers: { "Content-Type": "application/json" },
			});

			if (!response.ok) {
				throw new Error(
					`Backend stats request failed: ${response.status} ${response.statusText}`,
				);
			}

			const stats = await response.json();
			console.log("Feedback stats retrieved from backend:", stats);
			sendResponse({ success: true, data: stats });
		} catch (error) {
			console.error("Failed to get feedback stats from backend:", error);

			// Fallback to mock stats if backend is unavailable
			const fallbackStats = {
				totalFeedback: 0,
				positiveCount: 0,
				negativeCount: 0,
				lastOptimizationDate: null,
				daysSinceLastOptimization: 0,
				recentNegativeRate: 0,
				shouldOptimize: false,
				nextOptimizationTrigger: "Backend not available - using local data",
			};
			sendResponse({
				success: true,
				data: fallbackStats,
				warning: "Backend not available, using fallback stats",
			});
		}
	}

	private async handleTriggerOptimization(
		request: any,
		sendResponse: (response: any) => void,
	): Promise<void> {
		try {
			const optimizationRequest = {
				mode: request.mode || "cheap",
				manualTrigger: true,
			};

			console.log("Triggering optimization:", optimizationRequest);

			// Send optimization request to backend
			const response = await fetch("http://localhost:7532/optimize", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(optimizationRequest),
			});

			if (!response.ok) {
				throw new Error(
					`Optimization request failed: ${response.status} ${response.statusText}`,
				);
			}

			const result = await response.json();
			console.log("Optimization triggered successfully:", result);
			sendResponse({ success: true, data: result });
		} catch (error) {
			console.error("Failed to trigger optimization:", error);

			// Use the new backend error classification system
			const errorInfo = this.enhanceBackendError(error);
			sendResponse({
				success: false,
				error: errorInfo.message,
				retryable: errorInfo.retryable,
			});
		}
	}

	// Helper method to store feedback locally for now
	private async storeFeedbackLocally(
		type: "nugget" | "missing",
		feedback: NuggetFeedback | MissingContentFeedback,
	): Promise<void> {
		try {
			const key = type === "nugget" ? "nugget_feedback" : "missing_feedback";
			const existingData = await chrome.storage.local.get([key]);
			const feedbackArray = existingData[key] || [];

			feedbackArray.push({
				...feedback,
				storedAt: Date.now(),
			});

			// Keep only last 1000 feedback items to prevent storage overflow
			if (feedbackArray.length > 1000) {
				feedbackArray.splice(0, feedbackArray.length - 1000);
			}

			await chrome.storage.local.set({ [key]: feedbackArray });
		} catch (error) {
			console.error("Failed to store feedback locally:", error);
			throw error;
		}
	}

	// Helper method to remove feedback locally
	private async removeFeedbackLocally(
		type: "nugget" | "missing",
		feedbackId: string,
	): Promise<void> {
		try {
			const key = type === "nugget" ? "nugget_feedback" : "missing_feedback";
			const existingData = await chrome.storage.local.get([key]);
			const feedbackArray = existingData[key] || [];

			// Filter out the feedback item with the matching ID
			const filteredArray = feedbackArray.filter(
				(feedback: any) => feedback.id !== feedbackId,
			);

			await chrome.storage.local.set({ [key]: filteredArray });
			console.log(`Removed feedback ${feedbackId} from local storage`);
		} catch (error) {
			console.error("Failed to remove feedback locally:", error);
			throw error;
		}
	}

	// Send delete request to backend API
	private async deleteFeedbackFromBackend(feedbackId: string): Promise<any> {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

		try {
			const response = await fetch(
				`http://localhost:7532/feedback/${feedbackId}`,
				{
					method: "DELETE",
					headers: { "Content-Type": "application/json" },
					signal: controller.signal,
				},
			);

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(
					`Backend feedback deletion failed: ${response.status} ${response.statusText} - ${errorText}`,
				);
			}

			return await response.json();
		} catch (error) {
			if ((error as Error).name === "AbortError") {
				throw new Error("Backend request timed out after 10 seconds");
			}
			throw error;
		} finally {
			clearTimeout(timeoutId);
		}
	}

	private async handleGetCurrentOptimizedPrompt(
		sendResponse: (response: any) => void,
	): Promise<void> {
		try {
			// Get current optimized prompt from backend
			const response = await fetch("http://localhost:7532/optimize/current", {
				method: "GET",
				headers: { "Content-Type": "application/json" },
			});

			if (!response.ok) {
				throw new Error(
					`Get optimized prompt failed: ${response.status} ${response.statusText}`,
				);
			}

			const optimizedPrompt = await response.json();
			console.log("Current optimized prompt retrieved:", optimizedPrompt);
			sendResponse({ success: true, data: optimizedPrompt });
		} catch (error) {
			console.error("Failed to get current optimized prompt:", error);
			sendResponse({
				success: false,
				error: (error as Error).message,
				fallback: "Using default prompt - no optimized prompt available",
			});
		}
	}

	// Send feedback to backend API with timeout and retry logic
	private async sendFeedbackToBackend(
		feedback: FeedbackSubmission,
	): Promise<any> {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

		try {
			const response = await fetch("http://localhost:7532/feedback", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(feedback),
				signal: controller.signal,
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(
					`Backend feedback submission failed: ${response.status} ${response.statusText} - ${errorText}`,
				);
			}

			return await response.json();
		} catch (error) {
			if ((error as Error).name === "AbortError") {
				throw new Error("Backend request timed out after 10 seconds");
			}
			throw error;
		} finally {
			clearTimeout(timeoutId);
		}
	}

	// Helper method to get optimized prompt if available (used during analysis)
	private async getOptimizedPromptIfAvailable(): Promise<any> {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout for prompt fetch

		try {
			const response = await fetch("http://localhost:7532/optimize/current", {
				method: "GET",
				headers: { "Content-Type": "application/json" },
				signal: controller.signal,
			});

			if (!response.ok) {
				throw new Error(
					`Failed to get optimized prompt: ${response.status} ${response.statusText}`,
				);
			}

			const result = await response.json();
			// Only return if we have a valid prompt with decent performance
			if (result?.prompt && result.version > 0) {
				return result;
			}
			return null;
		} catch (error) {
			if ((error as Error).name === "AbortError") {
				throw new Error("Optimized prompt request timed out");
			}
			throw error;
		} finally {
			clearTimeout(timeoutId);
		}
	}

	// Provider Management Handlers

	private async handleSwitchProvider(
		request: any,
		sendResponse: (response: any) => void,
	): Promise<void> {
		try {
			const providerId: ProviderId = request.providerId;

			if (!providerId) {
				sendResponse({ success: false, error: "Provider ID is required" });
				return;
			}

			const success = await ProviderSwitcher.switchProvider(providerId);

			if (success) {
				// Clear any existing retry counts for the new provider
				ErrorHandler.resetRetryCount(providerId, "extraction");

				sendResponse({
					success: true,
					message: `Successfully switched to ${providerId}`,
					providerId,
				});
			} else {
				sendResponse({
					success: false,
					error: `Failed to switch to ${providerId}. Check API key configuration.`,
				});
			}
		} catch (error) {
			console.error("Failed to switch provider:", error);

			// Use error handler for switch-specific error messages
			const errorResult = ErrorHandler.handleSwitchError(
				error as Error,
				request.providerId,
			);
			sendResponse({
				success: errorResult.success,
				error: errorResult.message,
			});
		}
	}

	private async handleGetAvailableProviders(
		sendResponse: (response: any) => void,
	): Promise<void> {
		try {
			const availableProviders = await ProviderSwitcher.getAvailableProviders();
			sendResponse({ success: true, data: availableProviders });
		} catch (error) {
			console.error("Failed to get available providers:", error);
			sendResponse({ success: false, error: (error as Error).message });
		}
	}

	private async handleGetCurrentProvider(
		sendResponse: (response: any) => void,
	): Promise<void> {
		try {
			const currentProvider = await ProviderSwitcher.getCurrentProvider();
			sendResponse({ success: true, data: currentProvider });
		} catch (error) {
			console.error("Failed to get current provider:", error);
			sendResponse({ success: false, error: (error as Error).message });
		}
	}

	private async handleValidateProvider(
		request: any,
		sendResponse: (response: any) => void,
	): Promise<void> {
		try {
			const providerId: ProviderId = request.providerId;
			const apiKey: string = request.apiKey;

			if (!providerId) {
				sendResponse({ success: false, error: "Provider ID is required" });
				return;
			}

			if (!apiKey) {
				sendResponse({ success: false, error: "API key is required" });
				return;
			}

			// Create provider configuration
			const config: ProviderConfig = {
				providerId,
				apiKey,
				modelName: await ProviderFactory.getSelectedModel(providerId),
			};

			// Create provider instance and validate
			const provider = await ProviderFactory.createProvider(config);
			const isValid = await provider.validateApiKey();

			sendResponse({
				success: true,
				data: {
					isValid,
					providerId,
					modelName: config.modelName,
				},
			});
		} catch (error) {
			console.error("Failed to validate provider:", error);

			// Use error handler for user-friendly validation error messages
			const userFriendlyMessage = ErrorHandler.getUserFriendlyMessage(
				error as Error,
				request.providerId,
			);

			sendResponse({
				success: true,
				data: {
					isValid: false,
					error: userFriendlyMessage,
					originalError: (error as Error).message,
				},
			});
		}
	}
}
