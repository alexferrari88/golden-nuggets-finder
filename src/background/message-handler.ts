// processPromptTemplate removed - no longer needed without synthesis
import { debugLogger } from "../shared/debug";
import { storage } from "../shared/storage";
import { getApiKey } from "../shared/storage/api-key-storage";
import {
	type AnalysisProgressMessage,
	type AnalysisRequest,
	type AnalysisResponse,
	type EnsembleAnalysisRequest,
	type EnsembleAnalysisResponse,
	type ExtensionConfig,
	type FeedbackStats,
	type FeedbackSubmission,
	MESSAGE_TYPES,
	type MissingContentFeedback,
	type NuggetFeedback,
	type OptimizedPrompt,
	type SavedPrompt,
	type TypeFilterOptions,
} from "../shared/types";
import type {
	GoldenNuggetsResponse,
	ProviderConfig,
	ProviderId,
} from "../shared/types/providers";
import { EnsembleExtractor } from "./services/ensemble-extractor";
import {
	getUserFriendlyMessage,
	handleProviderError,
	handleSwitchError,
	resetRetryCount,
} from "./services/error-handler";
import { createProvider, getSelectedModel } from "./services/provider-factory";
import {
	getAvailableProviders,
	getCurrentProvider,
	isProviderConfigured,
	switchProvider,
	switchToFallbackProvider,
} from "./services/provider-switcher";
import { normalize as normalizeResponse } from "./services/response-normalizer";
import { TwoPhaseExtractor } from "./services/two-phase-extractor";
import {
	generateFilteredPrompt,
	validateSelectedTypes,
} from "./type-filter-service";

// Message type definitions for type safety
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

// Specific request/response types
interface AbortAnalysisRequest extends BaseRequest {
	type: typeof MESSAGE_TYPES.ABORT_ANALYSIS;
	analysisId: string;
}

interface AbortAnalysisResponse extends BaseResponse {
	message?: string;
}

interface AnalyzeSelectedContentRequest extends BaseRequest {
	type: typeof MESSAGE_TYPES.ANALYZE_SELECTED_CONTENT;
	content: string;
	promptId: string;
	url: string;
	analysisId?: string;
	typeFilter?: TypeFilterOptions;
}

interface GetPromptsRequest extends BaseRequest {
	type: typeof MESSAGE_TYPES.GET_PROMPTS;
}

interface GetPromptsResponse extends BaseResponse {
	data?: SavedPrompt[];
}

interface SavePromptRequest extends BaseRequest {
	type: typeof MESSAGE_TYPES.SAVE_PROMPT;
	prompt: SavedPrompt;
}

interface DeletePromptRequest extends BaseRequest {
	type: typeof MESSAGE_TYPES.DELETE_PROMPT;
	promptId: string;
}

interface SetDefaultPromptRequest extends BaseRequest {
	type: typeof MESSAGE_TYPES.SET_DEFAULT_PROMPT;
	promptId: string;
}

interface GetConfigRequest extends BaseRequest {
	type: typeof MESSAGE_TYPES.GET_CONFIG;
}

interface GetConfigResponse extends BaseResponse {
	data?: ExtensionConfig;
}

interface SaveConfigRequest extends BaseRequest {
	type: typeof MESSAGE_TYPES.SAVE_CONFIG;
	config: ExtensionConfig;
}

interface OpenOptionsPageRequest extends BaseRequest {
	type: typeof MESSAGE_TYPES.OPEN_OPTIONS_PAGE;
}

interface SubmitNuggetFeedbackRequest extends BaseRequest {
	type: typeof MESSAGE_TYPES.SUBMIT_NUGGET_FEEDBACK;
	feedback: NuggetFeedback;
}

interface SubmitNuggetFeedbackResponse extends BaseResponse {
	deduplication?: {
		user_message?: string;
	};
	warning?: string;
}

interface DeleteNuggetFeedbackRequest extends BaseRequest {
	type: typeof MESSAGE_TYPES.DELETE_NUGGET_FEEDBACK;
	feedbackId: string;
}

interface DeleteNuggetFeedbackResponse extends BaseResponse {
	warning?: string;
}

interface SubmitMissingContentFeedbackRequest extends BaseRequest {
	type: typeof MESSAGE_TYPES.SUBMIT_MISSING_CONTENT_FEEDBACK;
	missingContentFeedback: MissingContentFeedback[];
}

interface SubmitMissingContentFeedbackResponse extends BaseResponse {
	deduplication?: {
		user_message?: string;
	};
	warning?: string;
}

interface GetFeedbackStatsRequest extends BaseRequest {
	type: typeof MESSAGE_TYPES.GET_FEEDBACK_STATS;
}

interface GetFeedbackStatsResponse extends BaseResponse {
	data?: FeedbackStats;
	warning?: string;
}

interface TriggerOptimizationRequest extends BaseRequest {
	type: typeof MESSAGE_TYPES.TRIGGER_OPTIMIZATION;
	mode?: "expensive" | "cheap";
}

interface TriggerOptimizationResponse extends BaseResponse {
	retryable?: boolean;
}

interface GetCurrentOptimizedPromptRequest extends BaseRequest {
	type: typeof MESSAGE_TYPES.GET_CURRENT_OPTIMIZED_PROMPT;
}

interface GetCurrentOptimizedPromptResponse extends BaseResponse {
	data?: OptimizedPrompt;
	fallback?: string;
}

interface SwitchProviderRequest extends BaseRequest {
	type: typeof MESSAGE_TYPES.SWITCH_PROVIDER;
	providerId: ProviderId;
}

interface SwitchProviderResponse extends BaseResponse {
	providerId?: ProviderId;
}

interface GetAvailableProvidersRequest extends BaseRequest {
	type: typeof MESSAGE_TYPES.GET_AVAILABLE_PROVIDERS;
}

interface GetAvailableProvidersResponse extends BaseResponse {
	data?: ProviderId[];
}

interface GetCurrentProviderRequest extends BaseRequest {
	type: typeof MESSAGE_TYPES.GET_CURRENT_PROVIDER;
}

interface GetCurrentProviderResponse extends BaseResponse {
	data?: {
		providerId: ProviderId;
		modelName: string;
	};
}

interface ValidateProviderRequest extends BaseRequest {
	type: typeof MESSAGE_TYPES.VALIDATE_PROVIDER;
	providerId: ProviderId;
	apiKey: string;
}

interface ValidateProviderResponse extends BaseResponse {
	data?: {
		isValid: boolean;
		providerId: ProviderId;
		modelName: string;
		error?: string;
		originalError?: string;
	};
}

interface DebugTestRequest extends BaseRequest {
	type: "DEBUG_TEST";
}

interface DebugTestResponse extends BaseResponse {
	message?: string;
}

// Union types for all possible requests and responses
type MessageRequest =
	| AbortAnalysisRequest
	| AnalysisRequest
	| EnsembleAnalysisRequest
	| AnalyzeSelectedContentRequest
	| GetPromptsRequest
	| SavePromptRequest
	| DeletePromptRequest
	| SetDefaultPromptRequest
	| GetConfigRequest
	| SaveConfigRequest
	| OpenOptionsPageRequest
	| SubmitNuggetFeedbackRequest
	| DeleteNuggetFeedbackRequest
	| SubmitMissingContentFeedbackRequest
	| GetFeedbackStatsRequest
	| TriggerOptimizationRequest
	| GetCurrentOptimizedPromptRequest
	| SwitchProviderRequest
	| GetAvailableProvidersRequest
	| GetCurrentProviderRequest
	| ValidateProviderRequest
	| DebugTestRequest;

type MessageResponse =
	| AbortAnalysisResponse
	| AnalysisResponse
	| EnsembleAnalysisResponse
	| GetPromptsResponse
	| BaseResponse
	| GetConfigResponse
	| SubmitNuggetFeedbackResponse
	| DeleteNuggetFeedbackResponse
	| SubmitMissingContentFeedbackResponse
	| GetFeedbackStatsResponse
	| TriggerOptimizationResponse
	| GetCurrentOptimizedPromptResponse
	| SwitchProviderResponse
	| GetAvailableProvidersResponse
	| GetCurrentProviderResponse
	| ValidateProviderResponse
	| DebugTestResponse;

// Backend API response types
interface BackendFeedbackResponse {
	deduplication?: {
		user_message?: string;
	};
	id_mappings?: {
		nugget_feedback?: Record<string, string>;
		missing_content_feedback?: Record<string, string>;
	};
}

interface BackendErrorInfo {
	message: string;
	showToUser: boolean;
	retryable: boolean;
}

// Utility function to generate unique analysis IDs
function generateAnalysisId(): string {
	return `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export class MessageHandler {
	// Track ongoing analyses and their abort controllers
	private static ongoingAnalyses = new Map<string, AbortController>();
	private ensembleExtractor = new EnsembleExtractor();

	// Helper to classify and enhance backend error messages for users
	private enhanceBackendError(error: Error | unknown): BackendErrorInfo {
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
		errorInfo: BackendErrorInfo,
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
		debugLogger.log("[MessageHandler] Getting selected provider configuration");

		// Get selected provider from storage
		const result = await chrome.storage.local.get(["selectedProvider"]);
		let providerId = result.selectedProvider;

		debugLogger.log(
			`[MessageHandler] Stored selectedProvider: ${providerId || "null"}`,
		);

		// If no provider is explicitly selected, find the first configured provider
		if (!providerId) {
			debugLogger.log(
				"[MessageHandler] No provider selected, finding first available",
			);
			const availableProviders = await getAvailableProviders();
			if (availableProviders.length > 0) {
				providerId = availableProviders[0];
				debugLogger.log(
					`[MessageHandler] Using first available provider: ${providerId}`,
				);
				// Automatically set this as the selected provider
				await chrome.storage.local.set({ selectedProvider: providerId });
				debugLogger.log(
					`[MessageHandler] Automatically saved provider: ${providerId}`,
				);
			} else {
				debugLogger.error("[MessageHandler] No configured providers available");
				throw new Error(
					`No configured providers available. Please configure an API key in the options page.`,
				);
			}
		} else {
			// Check if selected provider is still configured
			debugLogger.log(
				`[MessageHandler] Validating provider configuration for: ${providerId}`,
			);
			const isConfigured = await isProviderConfigured(providerId);
			if (!isConfigured) {
				debugLogger.warn(
					`[MessageHandler] Selected provider ${providerId} is not configured, trying fallback`,
				);

				// Try to switch to a fallback provider
				const fallbackProviderId = await switchToFallbackProvider();
				if (fallbackProviderId) {
					providerId = fallbackProviderId;
					debugLogger.log(
						`[MessageHandler] Switched to fallback provider: ${providerId}`,
					);
				} else {
					debugLogger.error("[MessageHandler] No fallback providers available");
					throw new Error(
						`No configured providers available. Please configure an API key in the options page.`,
					);
				}
			} else {
				debugLogger.log(
					`[MessageHandler] Provider ${providerId} is configured and ready`,
				);
			}
		}

		// Get API key for provider
		debugLogger.log(
			`[MessageHandler] Retrieving API key for provider: ${providerId}`,
		);
		let apiKey: string;
		if (providerId === "gemini") {
			try {
				apiKey = await storage.getApiKey({
					source: "background",
					action: "read",
					timestamp: Date.now(),
				});
				debugLogger.log(
					"[MessageHandler] Successfully retrieved Gemini API key",
				);
			} catch (error) {
				debugLogger.error(
					"[MessageHandler] Failed to retrieve Gemini API key:",
					error,
				);
				// If there's an error accessing the API key, treat as not configured
				apiKey = "";
			}
		} else {
			apiKey = (await getApiKey(providerId)) || "";
			debugLogger.log(
				`[MessageHandler] Retrieved API key for ${providerId}: ${apiKey ? "present" : "missing"}`,
			);
		}

		if (!apiKey) {
			debugLogger.error(
				`[MessageHandler] No API key found for provider: ${providerId}`,
			);
			throw new Error(`No API key found for provider: ${providerId}`);
		}

		// Get selected model for this provider (THIS IS CRITICAL FOR THE BUG)
		debugLogger.log(
			`[MessageHandler] Getting selected model for provider: ${providerId}`,
		);
		const modelName = await getSelectedModel(providerId);

		const finalConfig = {
			providerId,
			apiKey: "[REDACTED]", // Don't log the actual API key
			modelName,
		};

		debugLogger.log(
			`[MessageHandler] Final provider configuration: ${JSON.stringify({
				providerId: finalConfig.providerId,
				modelName: finalConfig.modelName,
				apiKey: "[REDACTED]",
			})}`,
		);

		return {
			providerId,
			apiKey,
			modelName,
		};
	}

	// Helper to handle golden nuggets extraction using provider routing with error handling and fallback
	static async handleExtractGoldenNuggets(
		content: string,
		prompt: string,
		analysisId?: string,
		tabId?: number,
		useEnsemble = false,
		ensembleRuns?: number,
		useTwoPhase = false,
	): Promise<GoldenNuggetsResponse> {
		let currentProviderId: ProviderId | null = null;
		let attempts = 0;
		const maxAttempts = 2; // Limit to 2 attempts to prevent infinite loops

		// Get ensemble settings if not provided
		let finalEnsembleRuns = ensembleRuns;
		if (useEnsemble && finalEnsembleRuns === undefined) {
			try {
				const ensembleSettings = await storage.getEnsembleSettings();
				finalEnsembleRuns = ensembleSettings.defaultRuns;
			} catch (error) {
				console.warn("Failed to get ensemble settings, using default:", error);
				finalEnsembleRuns = 3; // Fallback to original default
			}
		}

		// Create abort controller for this analysis
		const abortController = new AbortController();
		if (analysisId) {
			MessageHandler.ongoingAnalyses.set(analysisId, abortController);
		}

		try {
			while (attempts < maxAttempts) {
				// Check if analysis was aborted
				if (abortController.signal.aborted) {
					throw new Error("Analysis was aborted by user");
				}

				try {
					attempts++;

					// Get provider configuration (may change if we fall back)
					const providerConfig = await MessageHandler.getSelectedProvider();
					currentProviderId = providerConfig.providerId;

					console.log(
						`Attempt ${attempts}: Using provider ${currentProviderId}`,
					);

					// Create provider instance
					const provider = await createProvider(providerConfig);

					// Extract golden nuggets
					const startTime = performance.now();
					let normalizedResponse: GoldenNuggetsResponse;

					if (useTwoPhase) {
						// Use two-phase extraction
						const twoPhaseExtractor = new TwoPhaseExtractor();
						const twoPhaseResult = await twoPhaseExtractor.extractWithTwoPhase(
							content,
							prompt,
							provider,
							{
								useEnsemble,
								ensembleRuns: finalEnsembleRuns,
								confidenceThreshold: 0.85,
								phase1Temperature: 0.7,
								phase2Temperature: 0.0,
							},
						);

						// Convert two-phase result to standard response format
						normalizedResponse = {
							golden_nuggets: twoPhaseResult.golden_nuggets.map((nugget) => ({
								type: nugget.type,
								startContent: nugget.startContent,
								endContent: nugget.endContent,
							})),
						};

						debugLogger.log(`[TwoPhase] Final normalized response:`, {
							golden_nuggets_count: normalizedResponse.golden_nuggets.length,
							sample_nugget: normalizedResponse.golden_nuggets[0] || null,
							two_phase_metadata: twoPhaseResult.metadata,
						});

						console.log(
							`Two-phase extraction completed: ${twoPhaseResult.golden_nuggets.length} nuggets (${twoPhaseResult.metadata.phase2FuzzyCount} fuzzy + ${twoPhaseResult.metadata.phase2LlmCount} LLM)`,
						);
					} else if (useEnsemble) {
						// Use ensemble extraction
						const ensembleExtractor = new EnsembleExtractor();
						const ensembleResult = await ensembleExtractor.extractWithEnsemble(
							content,
							prompt,
							provider,
							{
								runs: finalEnsembleRuns!,
								temperature: 0.2,
								parallelExecution: true,
							},
						);

						// Convert ensemble result to standard response format
						normalizedResponse = {
							golden_nuggets: ensembleResult.golden_nuggets.map((nugget) => ({
								type: nugget.type as
									| "tool"
									| "media"
									| "aha! moments"
									| "analogy"
									| "model",
								startContent: nugget.startContent,
								endContent: nugget.endContent,
							})),
						};

						console.log(
							`Ensemble extraction completed: ${ensembleResult.metadata.consensusReached} nuggets with ${ensembleResult.metadata.duplicatesRemoved} duplicates removed`,
						);
					} else {
						// Use single extraction (existing logic)
						const rawResponse = await provider.extractGoldenNuggets(
							content,
							prompt,
						);

						// Normalize response
						normalizedResponse = normalizeResponse(
							rawResponse,
							providerConfig.providerId,
						);
					}

					const responseTime = performance.now() - startTime;

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
						resetRetryCount(currentProviderId, "extraction");
					}

					return normalizedResponse;
				} catch (error) {
					const errorMessage =
						error instanceof Error ? error.message : String(error);
					console.error(
						`Golden nuggets extraction failed (attempt ${attempts}):`,
						errorMessage,
					);

					// Check for structural errors that indicate a programming bug (don't retry these)
					const isStructuralError =
						errorMessage.includes("Cannot read properties of undefined") ||
						errorMessage.includes("is not a function") ||
						errorMessage.includes("Cannot read property") ||
						errorMessage.includes("undefined is not an object");

					if (isStructuralError) {
						console.error(
							"Structural error detected, stopping retries:",
							errorMessage,
						);
						throw new Error(
							`Provider configuration error: ${errorMessage}. Please check extension configuration.`,
						);
					}

					if (currentProviderId) {
						// Handle the error using our comprehensive error handler
						const errorResult = await handleProviderError(
							error as Error,
							currentProviderId,
							"extraction",
							analysisId,
							tabId,
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
							const switchSuccess = await switchProvider(
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
							? getUserFriendlyMessage(error as Error, currentProviderId)
							: errorMessage;
						console.error(
							`All attempts exhausted. Final error: ${userFriendlyMessage}`,
						);
						throw new Error(userFriendlyMessage);
					}
				}
			}

			// This should never be reached, but just in case
			throw new Error("All providers failed after maximum attempts");
		} finally {
			// Clean up the abort controller
			if (analysisId) {
				MessageHandler.ongoingAnalyses.delete(analysisId);
			}
		}
	}

	async handleMessage(
		request: MessageRequest,
		sender: chrome.runtime.MessageSender,
		sendResponse: (response: MessageResponse) => void,
	): Promise<void> {
		try {
			switch (request.type) {
				case MESSAGE_TYPES.ABORT_ANALYSIS:
					await this.handleAbortAnalysis(
						request as AbortAnalysisRequest,
						sendResponse,
					);
					break;
				case MESSAGE_TYPES.ANALYZE_CONTENT:
					await this.handleAnalyzeContent(
						request as AnalysisRequest,
						sender,
						sendResponse,
					);
					break;

				case MESSAGE_TYPES.ANALYZE_CONTENT_ENSEMBLE:
					await this.handleAnalyzeContentEnsemble(
						request as EnsembleAnalysisRequest,
						sender,
						sendResponse,
					);
					break;

				case MESSAGE_TYPES.ANALYZE_SELECTED_CONTENT:
					await this.handleAnalyzeSelectedContent(
						request as AnalyzeSelectedContentRequest,
						sender,
						sendResponse,
					);
					break;

				case MESSAGE_TYPES.GET_PROMPTS:
					await this.handleGetPrompts(sendResponse);
					break;

				case MESSAGE_TYPES.SAVE_PROMPT:
					await this.handleSavePrompt(
						request as SavePromptRequest,
						sendResponse,
					);
					break;

				case MESSAGE_TYPES.DELETE_PROMPT:
					await this.handleDeletePrompt(
						request as DeletePromptRequest,
						sendResponse,
					);
					break;

				case MESSAGE_TYPES.SET_DEFAULT_PROMPT:
					await this.handleSetDefaultPrompt(
						request as SetDefaultPromptRequest,
						sendResponse,
					);
					break;

				case MESSAGE_TYPES.GET_CONFIG:
					await this.handleGetConfig(sendResponse);
					break;

				case MESSAGE_TYPES.SAVE_CONFIG:
					await this.handleSaveConfig(
						request as SaveConfigRequest,
						sendResponse,
					);
					break;

				case MESSAGE_TYPES.OPEN_OPTIONS_PAGE:
					await this.handleOpenOptionsPage(sendResponse);
					break;

				case MESSAGE_TYPES.SUBMIT_NUGGET_FEEDBACK:
					await this.handleSubmitNuggetFeedback(
						request as SubmitNuggetFeedbackRequest,
						sender,
						sendResponse,
					);
					break;

				case MESSAGE_TYPES.DELETE_NUGGET_FEEDBACK:
					await this.handleDeleteNuggetFeedback(
						request as DeleteNuggetFeedbackRequest,
						sender,
						sendResponse,
					);
					break;

				case MESSAGE_TYPES.SUBMIT_MISSING_CONTENT_FEEDBACK:
					await this.handleSubmitMissingContentFeedback(
						request as SubmitMissingContentFeedbackRequest,
						sender,
						sendResponse,
					);
					break;

				case MESSAGE_TYPES.GET_FEEDBACK_STATS:
					await this.handleGetFeedbackStats(sendResponse);
					break;

				case MESSAGE_TYPES.TRIGGER_OPTIMIZATION:
					await this.handleTriggerOptimization(
						request as TriggerOptimizationRequest,
						sendResponse,
					);
					break;

				case MESSAGE_TYPES.GET_CURRENT_OPTIMIZED_PROMPT:
					await this.handleGetCurrentOptimizedPrompt(sendResponse);
					break;

				case MESSAGE_TYPES.SWITCH_PROVIDER:
					await this.handleSwitchProvider(
						request as SwitchProviderRequest,
						sendResponse,
					);
					break;

				case MESSAGE_TYPES.GET_AVAILABLE_PROVIDERS:
					await this.handleGetAvailableProviders(sendResponse);
					break;

				case MESSAGE_TYPES.GET_CURRENT_PROVIDER:
					await this.handleGetCurrentProvider(sendResponse);
					break;

				case MESSAGE_TYPES.VALIDATE_PROVIDER:
					await this.handleValidateProvider(
						request as ValidateProviderRequest,
						sendResponse,
					);
					break;

				case "DEBUG_TEST":
					// Test logging in background script
					console.log("🔍 [DEBUG TEST] Background script console logging test");
					debugLogger.log(
						"🔍 [DEBUG TEST] DebugLogger test from background script",
					);
					debugLogger.logLLMRequest(
						"https://test-endpoint.com/background-test",
						{ test: "This is a background test request" },
					);
					debugLogger.logLLMResponse({
						test: "This is a background test response",
					});
					sendResponse({
						success: true,
						message: "Debug test completed in background script",
					});
					break;

				default:
					sendResponse({ success: false, error: "Unknown message type" });
			}
		} catch (error) {
			console.error("Error handling message:", error);
			sendResponse({ success: false, error: (error as Error).message });
		}
	}

	private async handleAbortAnalysis(
		request: AbortAnalysisRequest,
		sendResponse: (response: AbortAnalysisResponse) => void,
	): Promise<void> {
		try {
			const analysisId = request.analysisId;
			if (!analysisId) {
				sendResponse({ success: false, error: "Analysis ID is required" });
				return;
			}

			const abortController = MessageHandler.ongoingAnalyses.get(analysisId);
			if (abortController) {
				abortController.abort();
				MessageHandler.ongoingAnalyses.delete(analysisId);
				console.log(`Analysis ${analysisId} was aborted by user`);
				sendResponse({ success: true, message: "Analysis aborted" });
			} else {
				sendResponse({
					success: false,
					error: "Analysis not found or already completed",
				});
			}
		} catch (error) {
			console.error("Failed to abort analysis:", error);
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
			let prompt: SavedPrompt | undefined;

			if (request.promptId === "default") {
				prompt = (await storage.getDefaultPrompt()) || undefined;
			} else {
				prompt = prompts.find((p) => p.id === request.promptId);
			}

			if (!prompt) {
				sendResponse({ success: false, error: "Prompt not found" });
				return;
			}

			// Validate persona is configured
			const persona = await storage.getPersona();
			if (!persona || persona.trim().length === 0) {
				sendResponse({
					success: false,
					error:
						"Please set a persona in extension options before analyzing content",
				});
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

			// Replace {{ persona }} placeholder with user persona
			processedPrompt = await this.replacePersonaPlaceholder(processedPrompt);

			// Check if we should use optimized prompt from backend
			try {
				const optimizedPromptResponse =
					await this.getOptimizedPromptIfAvailable(prompt.id);
				if (optimizedPromptResponse?.prompt) {
					console.log(
						`Using optimized prompt for ${prompt.id} from backend DSPy system`,
					);
					processedPrompt = this.replaceSourcePlaceholder(
						optimizedPromptResponse.prompt,
						request.url,
					);
					// Also replace persona placeholder for optimized prompt
					processedPrompt =
						await this.replacePersonaPlaceholder(processedPrompt);
				}
			} catch (error) {
				console.log(
					`No optimized prompt available for ${prompt.id}, using default:`,
					(error as Error).message,
				);
				// Continue with default prompt
			}

			// Process template (synthesis removed - use prompt directly)
			// processedPrompt is already processed

			// Apply type filtering if specified
			if (request.typeFilter && request.typeFilter.selectedTypes.length > 0) {
				// Validate selected types
				if (!validateSelectedTypes(request.typeFilter.selectedTypes)) {
					sendResponse({
						success: false,
						error: "Invalid nugget types selected",
					});
					return;
				}

				// Generate filtered prompt
				processedPrompt = generateFilteredPrompt(
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

			// Store prompt metadata for feedback tracking
			const promptMetadata = {
				id: prompt.id,
				version: prompt.isOptimized ? "optimized" : "original",
				content: processedPrompt,
				type: (prompt.isOptimized ? "optimized" : "default") as
					| "default"
					| "optimized"
					| "custom",
				name: prompt.name,
				isOptimized: prompt.isOptimized || false,
				optimizationDate: prompt.optimizationDate,
				performance: prompt.performance,
			};

			await chrome.storage.local.set({
				lastUsedPrompt: promptMetadata,
			});

			const result = await MessageHandler.handleExtractGoldenNuggets(
				request.content,
				processedPrompt,
				analysisId,
				sender.tab?.id,
				false, // useEnsemble - not used for regular content analysis
				undefined, // ensembleRuns - not used for regular content analysis
				request.useTwoPhase, // useTwoPhase - pass through from request
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

			// Get provider metadata to include in response
			const providerMetadata = await chrome.storage.local.get([
				"lastUsedProvider",
			]);
			const resultWithProvider = {
				...result,
				providerMetadata: providerMetadata.lastUsedProvider || null,
			};

			// Send results to content script for display
			if (sender.tab?.id) {
				await chrome.tabs.sendMessage(sender.tab.id, {
					type: MESSAGE_TYPES.ANALYSIS_COMPLETE,
					data: resultWithProvider,
				});
			}

			// Clear analysis state from storage since analysis completed successfully
			// This fixes the popup loading issue where state wasn't cleaned up because popup closed before receiving completion message
			try {
				await storage.clearAnalysisState();
				console.log(
					"[Background] Analysis state cleared after successful completion",
				);
			} catch (error) {
				console.warn(
					"[Background] Failed to clear analysis state after completion:",
					error,
				);
				// Continue anyway - don't fail the analysis response for cleanup issues
			}

			sendResponse({ success: true, data: resultWithProvider });
		} catch (error) {
			console.error("Analysis failed:", error);

			// Send error to content script to clear loading states
			if (sender.tab?.id) {
				await chrome.tabs
					.sendMessage(sender.tab.id, {
						type: MESSAGE_TYPES.ANALYSIS_ERROR,
						error: (error as Error).message,
						analysisId: request.analysisId || generateAnalysisId(),
					})
					.catch(() => {
						// Content script might not be ready, that's okay
						console.log("Could not send analysis error to content script");
					});
			}

			sendResponse({ success: false, error: (error as Error).message });

			// Clear analysis state from storage since analysis failed
			// This fixes the popup loading issue where state wasn't cleaned up after analysis errors
			try {
				await storage.clearAnalysisState();
				console.log("[Background] Analysis state cleared after analysis error");
			} catch (cleanupError) {
				console.warn(
					"[Background] Failed to clear analysis state after error:",
					cleanupError,
				);
				// Continue anyway - cleanup failure shouldn't prevent error response
			}
		}
	}

	private async handleAnalyzeContentEnsemble(
		request: EnsembleAnalysisRequest,
		sender: chrome.runtime.MessageSender,
		sendResponse: (response: EnsembleAnalysisResponse) => void,
	): Promise<void> {
		try {
			const analysisId = request.analysisId || generateAnalysisId();

			// Get prompt and validate persona (same as existing)
			const prompts = await storage.getPrompts();
			let prompt: SavedPrompt | undefined;

			if (request.promptId === "default") {
				prompt = (await storage.getDefaultPrompt()) || undefined;
			} else {
				prompt = prompts.find((p) => p.id === request.promptId);
			}

			if (!prompt) {
				sendResponse({ success: false, error: "Prompt not found" });
				return;
			}

			// Validate persona is configured
			const persona = await storage.getPersona();
			if (!persona || persona.trim().length === 0) {
				sendResponse({
					success: false,
					error:
						"Please set a persona in extension options before analyzing content",
				});
				return;
			}

			// Send enhanced progress: ensemble extraction starting
			this.sendProgressMessage(
				MESSAGE_TYPES.ENSEMBLE_EXTRACTION_PROGRESS,
				1,
				`Starting ensemble extraction (${request.ensembleOptions?.runs || 3} runs)`,
				analysisId,
				request.source || "context-menu",
				sender.tab?.id,
			);

			// Get provider configuration
			const providerConfig = await MessageHandler.getSelectedProvider();
			const provider = await createProvider(providerConfig);

			// Process prompt (same as existing system)
			let processedPrompt = this.replaceSourcePlaceholder(
				prompt.prompt,
				request.url,
			);
			processedPrompt = await this.replacePersonaPlaceholder(processedPrompt);

			// Check if we should use optimized prompt from backend
			try {
				const optimizedPromptResponse =
					await this.getOptimizedPromptIfAvailable(prompt.id);
				if (optimizedPromptResponse?.prompt) {
					console.log(
						`Using optimized prompt for ${prompt.id} from backend DSPy system for ensemble`,
					);
					processedPrompt = this.replaceSourcePlaceholder(
						optimizedPromptResponse.prompt,
						request.url,
					);
					// Also replace persona placeholder for optimized prompt
					processedPrompt =
						await this.replacePersonaPlaceholder(processedPrompt);
				}
			} catch (error) {
				console.log(
					`No optimized prompt available for ${prompt.id} for ensemble, using default:`,
					(error as Error).message,
				);
				// Continue with default prompt
			}

			// Apply type filtering if specified
			if (request.typeFilter && request.typeFilter.selectedTypes.length > 0) {
				processedPrompt = generateFilteredPrompt(
					processedPrompt,
					request.typeFilter.selectedTypes,
				);
			}

			// Send progress: consensus building
			this.sendProgressMessage(
				MESSAGE_TYPES.ENSEMBLE_EXTRACTION_PROGRESS,
				2,
				"Building consensus across runs",
				analysisId,
				request.source || "context-menu",
				sender.tab?.id,
			);

			// Execute ensemble extraction
			const ensembleOptions = {
				runs: request.ensembleOptions?.runs || 3,
				temperature: 0.7,
				parallelExecution: true,
			};

			const result = await this.ensembleExtractor.extractWithEnsemble(
				request.content,
				processedPrompt,
				provider,
				ensembleOptions,
			);

			// Send progress: processing results
			this.sendProgressMessage(
				MESSAGE_TYPES.ENSEMBLE_CONSENSUS_COMPLETE,
				3,
				"Processing ensemble results",
				analysisId,
				request.source || "context-menu",
				sender.tab?.id,
			);

			// Add provider metadata
			const resultWithMetadata = {
				...result,
				providerMetadata: {
					providerId: provider.providerId,
					modelName: provider.modelName,
					ensembleRuns: ensembleOptions.runs,
					consensusMethod: "majority-voting-v1",
				},
			};

			// Send results to content script
			if (sender.tab?.id) {
				await chrome.tabs.sendMessage(sender.tab.id, {
					type: MESSAGE_TYPES.ANALYSIS_COMPLETE,
					data: resultWithMetadata,
				});
			}

			// Clear analysis state from storage since ensemble analysis completed successfully
			// This fixes the popup loading issue where state wasn't cleaned up because popup closed before receiving completion message
			try {
				await storage.clearAnalysisState();
				console.log(
					"[Background] Analysis state cleared after successful ensemble completion",
				);
			} catch (error) {
				console.warn(
					"[Background] Failed to clear analysis state after ensemble completion:",
					error,
				);
				// Continue anyway - don't fail the analysis response for cleanup issues
			}

			sendResponse({ success: true, data: resultWithMetadata });
		} catch (error) {
			console.error("Ensemble analysis failed:", error);
			sendResponse({ success: false, error: (error as Error).message });

			// Clear analysis state from storage since analysis failed
			// This fixes the popup loading issue where state wasn't cleaned up after analysis errors
			try {
				await storage.clearAnalysisState();
				console.log(
					"[Background] Analysis state cleared after ensemble analysis error",
				);
			} catch (cleanupError) {
				console.warn(
					"[Background] Failed to clear analysis state after ensemble error:",
					cleanupError,
				);
				// Continue anyway - cleanup failure shouldn't prevent error response
			}
		}
	}

	private async handleAnalyzeSelectedContent(
		request: AnalyzeSelectedContentRequest,
		sender: chrome.runtime.MessageSender,
		sendResponse: (response: AnalysisResponse) => void,
	): Promise<void> {
		try {
			// Generate analysis ID if not provided
			const analysisId = request.analysisId || generateAnalysisId();
			const source = "context-menu"; // Selected content is always from context menu

			const prompts = await storage.getPrompts();
			let prompt: SavedPrompt | undefined;

			if (request.promptId === "default") {
				prompt = (await storage.getDefaultPrompt()) || undefined;
			} else {
				prompt = prompts.find((p) => p.id === request.promptId);
			}

			if (!prompt) {
				sendResponse({ success: false, error: "Prompt not found" });
				return;
			}

			// Validate persona is configured
			const persona = await storage.getPersona();
			if (!persona || persona.trim().length === 0) {
				sendResponse({
					success: false,
					error:
						"Please set a persona in extension options before analyzing content",
				});
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

			// Replace {{ persona }} placeholder with user persona
			processedPrompt = await this.replacePersonaPlaceholder(processedPrompt);

			// Check if we should use optimized prompt from backend
			try {
				const optimizedPromptResponse =
					await this.getOptimizedPromptIfAvailable(prompt.id);
				if (optimizedPromptResponse?.prompt) {
					console.log(
						`Using optimized prompt for ${prompt.id} from backend DSPy system for selected content`,
					);
					processedPrompt = this.replaceSourcePlaceholder(
						optimizedPromptResponse.prompt,
						request.url,
					);
					// Also replace persona placeholder for optimized prompt
					processedPrompt =
						await this.replacePersonaPlaceholder(processedPrompt);
				}
			} catch (error) {
				console.log(
					`No optimized prompt available for ${prompt.id} for selected content, using default:`,
					(error as Error).message,
				);
				// Continue with default prompt
			}

			// Process template (synthesis removed - use prompt directly)
			// processedPrompt is already processed

			// Apply type filtering if specified
			if (request.typeFilter && request.typeFilter.selectedTypes.length > 0) {
				// Validate selected types
				if (!validateSelectedTypes(request.typeFilter.selectedTypes)) {
					sendResponse({
						success: false,
						error: "Invalid nugget types selected",
					});
					return;
				}

				// Generate filtered prompt
				processedPrompt = generateFilteredPrompt(
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

			// Store prompt metadata for feedback tracking
			const promptMetadata = {
				id: prompt.id,
				version: prompt.isOptimized ? "optimized" : "original",
				content: processedPrompt,
				type: (prompt.isOptimized ? "optimized" : "default") as
					| "default"
					| "optimized"
					| "custom",
				name: prompt.name,
				isOptimized: prompt.isOptimized || false,
				optimizationDate: prompt.optimizationDate,
				performance: prompt.performance,
			};

			await chrome.storage.local.set({
				lastUsedPrompt: promptMetadata,
			});

			const result = await MessageHandler.handleExtractGoldenNuggets(
				request.content,
				processedPrompt,
				analysisId,
				sender.tab?.id,
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

			// Get provider metadata to include in response
			const providerMetadata = await chrome.storage.local.get([
				"lastUsedProvider",
			]);
			const resultWithProvider = {
				...result,
				providerMetadata: providerMetadata.lastUsedProvider || null,
			};

			// Send results to content script for display
			if (sender.tab?.id) {
				await chrome.tabs.sendMessage(sender.tab.id, {
					type: MESSAGE_TYPES.ANALYSIS_COMPLETE,
					data: resultWithProvider,
				});
			}

			sendResponse({ success: true, data: resultWithProvider });

			// Clear analysis state from storage since analysis completed successfully
			// This fixes the popup loading issue where state wasn't cleaned up because popup closed before receiving completion message
			try {
				await storage.clearAnalysisState();
				console.log(
					"[Background] Analysis state cleared after successful completion",
				);
			} catch (error) {
				console.warn(
					"[Background] Failed to clear analysis state after completion:",
					error,
				);
				// Continue anyway - don't fail the analysis response for cleanup issues
			}
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

			// Clear analysis state from storage since analysis failed
			// This fixes the popup loading issue where state wasn't cleaned up after analysis errors
			try {
				await storage.clearAnalysisState();
				console.log(
					"[Background] Analysis state cleared after selected content analysis error",
				);
			} catch (cleanupError) {
				console.warn(
					"[Background] Failed to clear analysis state after selected content error:",
					cleanupError,
				);
				// Continue anyway - cleanup failure shouldn't prevent error response
			}
		}
	}

	private async handleGetPrompts(
		sendResponse: (response: GetPromptsResponse) => void,
	): Promise<void> {
		try {
			const prompts = await storage.getPrompts();
			const enrichedPrompts: SavedPrompt[] = [];

			// For each prompt, check if there's an optimized version available
			for (const prompt of prompts) {
				try {
					const optimizedPromptResponse =
						await this.getOptimizedPromptIfAvailable(prompt.id);

					if (
						optimizedPromptResponse?.prompt &&
						optimizedPromptResponse.version > 0
					) {
						// Create an optimized version of this prompt
						const optimizedPromptItem: SavedPrompt = {
							id: `${prompt.id}-optimized-v${optimizedPromptResponse.version}`,
							name: `🚀 ${prompt.name} (Optimized v${optimizedPromptResponse.version})`,
							prompt: optimizedPromptResponse.prompt,
							isDefault: prompt.isDefault, // Preserve default status
							isOptimized: true,
							optimizationDate: optimizedPromptResponse.optimizationDate,
							performance: optimizedPromptResponse.performance,
						};

						// Add both the original and optimized version
						enrichedPrompts.push(prompt);
						enrichedPrompts.push(optimizedPromptItem);
						console.log(`Added optimized version for prompt: ${prompt.name}`);
					} else {
						// No optimized version available, just add the original
						enrichedPrompts.push(prompt);
					}
				} catch (error) {
					// If optimization check fails, just add the original prompt
					console.log(
						`No optimized version available for ${prompt.name}:`,
						(error as Error).message,
					);
					enrichedPrompts.push(prompt);
				}
			}

			sendResponse({ success: true, data: enrichedPrompts });
		} catch (error) {
			sendResponse({ success: false, error: (error as Error).message });
		}
	}

	private async handleSavePrompt(
		request: SavePromptRequest,
		sendResponse: (response: BaseResponse) => void,
	): Promise<void> {
		try {
			await storage.savePrompt(request.prompt);
			sendResponse({ success: true });
		} catch (error) {
			sendResponse({ success: false, error: (error as Error).message });
		}
	}

	private async handleDeletePrompt(
		request: DeletePromptRequest,
		sendResponse: (response: BaseResponse) => void,
	): Promise<void> {
		try {
			await storage.deletePrompt(request.promptId);
			sendResponse({ success: true });
		} catch (error) {
			sendResponse({ success: false, error: (error as Error).message });
		}
	}

	private async handleSetDefaultPrompt(
		request: SetDefaultPromptRequest,
		sendResponse: (response: BaseResponse) => void,
	): Promise<void> {
		try {
			await storage.setDefaultPrompt(request.promptId);
			sendResponse({ success: true });
		} catch (error) {
			sendResponse({ success: false, error: (error as Error).message });
		}
	}

	private async handleGetConfig(
		sendResponse: (response: GetConfigResponse) => void,
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
		request: SaveConfigRequest,
		sendResponse: (response: BaseResponse) => void,
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
		sendResponse: (response: BaseResponse) => void,
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

	private async replacePersonaPlaceholder(prompt: string): Promise<string> {
		try {
			const config = await storage.getConfig({
				source: "background",
				action: "read",
				timestamp: Date.now(),
			});
			const persona = config.userPersona || "";
			return prompt.replace(/\{\{\s*persona\s*\}\}/g, persona);
		} catch (error) {
			console.error(
				"Failed to get user persona for placeholder replacement:",
				error,
			);
			// Return empty string if persona can't be retrieved (validation handled separately)
			return prompt.replace(/\{\{\s*persona\s*\}\}/g, "");
		}
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

	/**
	 * Update local feedback storage with corrected IDs from backend response
	 */
	private async updateLocalFeedbackIds(
		feedbackType: "nugget" | "missing",
		idMappings: Record<string, string>,
	): Promise<void> {
		try {
			const key =
				feedbackType === "nugget" ? "nugget_feedback" : "missing_feedback";
			const existingData = await chrome.storage.local.get([key]);
			const feedbackArray = existingData[key] || [];

			// Update IDs in local storage
			let updatedCount = 0;
			for (const feedback of feedbackArray) {
				const originalId = feedback.id;
				if (originalId && idMappings[originalId]) {
					const newId = idMappings[originalId];
					if (newId !== originalId) {
						feedback.id = newId;
						updatedCount++;
						console.log(
							`Updated ${feedbackType} feedback ID: ${originalId} -> ${newId}`,
						);
					}
				}
			}

			if (updatedCount > 0) {
				await chrome.storage.local.set({ [key]: feedbackArray });
				console.log(
					`Updated ${updatedCount} ${feedbackType} feedback IDs in local storage`,
				);
			}
		} catch (error) {
			console.error(
				`Failed to update local ${feedbackType} feedback IDs:`,
				error,
			);
			// Don't throw - this is not critical for user experience
		}
	}

	private async handleSubmitNuggetFeedback(
		request: SubmitNuggetFeedbackRequest,
		sender: chrome.runtime.MessageSender,
		sendResponse: (response: SubmitNuggetFeedbackResponse) => void,
	): Promise<void> {
		try {
			const feedback: NuggetFeedback = request.feedback;

			if (!feedback) {
				sendResponse({ success: false, error: "No feedback data provided" });
				return;
			}

			// Add provider and prompt metadata from last used provider and prompt
			const providerInfo = await chrome.storage.local.get([
				"lastUsedProvider",
				"lastUsedPrompt",
			]);
			const feedbackWithProviderAndPrompt = {
				...feedback,
				modelProvider: providerInfo.lastUsedProvider?.providerId || "gemini",
				modelName:
					providerInfo.lastUsedProvider?.modelName || "gemini-2.5-flash",
				prompt: providerInfo.lastUsedPrompt || {
					id: "unknown",
					version: "original",
					content: "",
					type: "default" as const,
					name: "Unknown prompt",
				},
			};

			// Store feedback locally as backup
			console.log(
				`Storing nugget feedback locally with ID: ${feedbackWithProviderAndPrompt.id}`,
			);
			await this.storeFeedbackLocally("nugget", feedbackWithProviderAndPrompt);

			// Send to backend API
			try {
				console.log(
					`Sending nugget feedback to backend with original ID: ${feedbackWithProviderAndPrompt.id}`,
				);
				const result = await this.sendFeedbackToBackend({
					nuggetFeedback: [feedbackWithProviderAndPrompt],
				});
				console.log("Nugget feedback sent to backend:", result);

				// Log ID mappings if present
				if (result.id_mappings?.nugget_feedback) {
					console.log(
						"Backend returned nugget feedback ID mappings:",
						result.id_mappings.nugget_feedback,
					);
				}

				// Check for deduplication information and notify user if needed
				if (result.deduplication?.user_message) {
					await this.notifyUserOfDuplication(
						sender.tab?.id,
						result.deduplication.user_message,
					);
				}

				// Update local storage with corrected IDs from backend
				if (result.id_mappings?.nugget_feedback) {
					await this.updateLocalFeedbackIds(
						"nugget",
						result.id_mappings.nugget_feedback,
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
		request: DeleteNuggetFeedbackRequest,
		sender: chrome.runtime.MessageSender,
		sendResponse: (response: DeleteNuggetFeedbackResponse) => void,
	): Promise<void> {
		try {
			const feedbackId: string = request.feedbackId;

			if (!feedbackId) {
				sendResponse({ success: false, error: "No feedback ID provided" });
				return;
			}

			console.log(
				`Attempting to delete nugget feedback with ID: ${feedbackId}`,
			);

			// Remove from local storage backup
			console.log(
				`Removing nugget feedback from local storage with ID: ${feedbackId}`,
			);
			await this.removeFeedbackLocally("nugget", feedbackId);

			// Send delete request to backend API
			try {
				console.log(
					`Sending DELETE request to backend for feedback ID: ${feedbackId}`,
				);
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
		request: SubmitMissingContentFeedbackRequest,
		sender: chrome.runtime.MessageSender,
		sendResponse: (response: SubmitMissingContentFeedbackResponse) => void,
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

			// Add provider and prompt metadata to all missing content feedback from last used provider and prompt
			const providerInfo = await chrome.storage.local.get([
				"lastUsedProvider",
				"lastUsedPrompt",
			]);
			const missingContentWithProviderAndPrompt = missingContentFeedback.map(
				(feedback) => ({
					...feedback,
					modelProvider: providerInfo.lastUsedProvider?.providerId || "gemini",
					modelName:
						providerInfo.lastUsedProvider?.modelName || "gemini-2.5-flash",
					prompt: providerInfo.lastUsedPrompt || {
						id: "unknown",
						version: "original",
						content: "",
						type: "default" as const,
						name: "Unknown prompt",
					},
				}),
			);

			// Store feedback locally as backup
			for (const feedback of missingContentWithProviderAndPrompt) {
				console.log(
					`Storing missing content feedback locally with ID: ${feedback.id}`,
				);
				await this.storeFeedbackLocally("missing", feedback);
			}

			// Send to backend API
			try {
				const originalIds = missingContentWithProviderAndPrompt.map(
					(f) => f.id,
				);
				console.log(
					`Sending missing content feedback to backend with original IDs: ${originalIds.join(", ")}`,
				);
				const result = await this.sendFeedbackToBackend({
					missingContentFeedback: missingContentWithProviderAndPrompt,
				});
				console.log("Missing content feedback sent to backend:", result);

				// Log ID mappings if present
				if (result.id_mappings?.missing_content_feedback) {
					console.log(
						"Backend returned missing content feedback ID mappings:",
						result.id_mappings.missing_content_feedback,
					);
				}

				// Check for deduplication information and notify user if needed
				if (result.deduplication?.user_message) {
					await this.notifyUserOfDuplication(
						sender.tab?.id,
						result.deduplication.user_message,
					);
				}

				// Update local storage with corrected IDs from backend
				if (result.id_mappings?.missing_content_feedback) {
					await this.updateLocalFeedbackIds(
						"missing",
						result.id_mappings.missing_content_feedback,
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
		sendResponse: (response: GetFeedbackStatsResponse) => void,
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
		request: TriggerOptimizationRequest,
		sendResponse: (response: TriggerOptimizationResponse) => void,
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
				(feedback: NuggetFeedback | MissingContentFeedback) =>
					feedback.id !== feedbackId,
			);

			await chrome.storage.local.set({ [key]: filteredArray });
			console.log(`Removed feedback ${feedbackId} from local storage`);
		} catch (error) {
			console.error("Failed to remove feedback locally:", error);
			throw error;
		}
	}

	// Send delete request to backend API
	private async deleteFeedbackFromBackend(
		feedbackId: string,
	): Promise<Record<string, unknown>> {
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
		sendResponse: (response: GetCurrentOptimizedPromptResponse) => void,
	): Promise<void> {
		try {
			// Use the helper method which includes provider/model context and prompt-specific support
			const optimizedPrompt = await this.getOptimizedPromptIfAvailable();
			if (optimizedPrompt) {
				console.log("Current optimized prompt retrieved:", optimizedPrompt);
				sendResponse({ success: true, data: optimizedPrompt });
			} else {
				sendResponse({
					success: false,
					error: "No optimized prompt available",
					fallback: "Using default prompt - no optimized prompt available",
				});
			}
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
	): Promise<BackendFeedbackResponse> {
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
	private async getOptimizedPromptIfAvailable(
		promptId?: string,
	): Promise<OptimizedPrompt | null> {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout for prompt fetch

		try {
			// Get current provider and model for provider-specific optimization
			const currentProvider = await getCurrentProvider();
			let requestUrl = "http://localhost:7532/optimize/current";

			// Build query parameters
			const params = new URLSearchParams();

			// Add promptId if provided for prompt-specific optimization
			if (promptId) {
				params.set("promptId", promptId);
			}

			if (currentProvider) {
				const currentModel = await getSelectedModel(currentProvider);
				params.set("provider", currentProvider);
				if (currentModel) {
					params.set("model", currentModel);
					console.log(
						`Requesting optimized prompt for prompt=${promptId || "default"}, ${currentProvider}+${currentModel}`,
					);
				} else {
					console.log(
						`Requesting optimized prompt for prompt=${promptId || "default"}, ${currentProvider} (no model)`,
					);
				}
			} else {
				console.log(
					`Requesting optimized prompt for prompt=${promptId || "default"} (generic)`,
				);
			}

			// Add query parameters if any exist
			if (params.toString()) {
				requestUrl += `?${params.toString()}`;
			}

			const response = await fetch(requestUrl, {
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
				// Log which type of optimization was used
				const optimizationType = result.providerSpecific
					? `provider-specific (${result.modelProvider}+${result.modelName})`
					: result.fallbackUsed
						? "generic fallback"
						: "standard";
				console.log(
					`Using ${optimizationType} optimized prompt v${result.version}`,
				);
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
		request: SwitchProviderRequest,
		sendResponse: (response: SwitchProviderResponse) => void,
	): Promise<void> {
		try {
			const providerId: ProviderId = request.providerId;

			if (!providerId) {
				sendResponse({ success: false, error: "Provider ID is required" });
				return;
			}

			const success = await switchProvider(providerId);

			if (success) {
				// Clear any existing retry counts for the new provider
				resetRetryCount(providerId, "extraction");

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
			const errorResult = await handleSwitchError(
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
		sendResponse: (response: GetAvailableProvidersResponse) => void,
	): Promise<void> {
		try {
			const availableProviders = await getAvailableProviders();
			sendResponse({ success: true, data: availableProviders });
		} catch (error) {
			console.error("Failed to get available providers:", error);
			sendResponse({ success: false, error: (error as Error).message });
		}
	}

	private async handleGetCurrentProvider(
		sendResponse: (response: GetCurrentProviderResponse) => void,
	): Promise<void> {
		try {
			const currentProvider = await getCurrentProvider();
			const currentModel = await getSelectedModel(currentProvider);
			sendResponse({
				success: true,
				data: {
					providerId: currentProvider,
					modelName: currentModel,
				},
			});
		} catch (error) {
			console.error("Failed to get current provider:", error);
			sendResponse({ success: false, error: (error as Error).message });
		}
	}

	private async handleValidateProvider(
		request: ValidateProviderRequest,
		sendResponse: (response: ValidateProviderResponse) => void,
	): Promise<void> {
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

		// Create provider configuration outside try block
		let config: ProviderConfig | undefined;
		try {
			config = {
				providerId,
				apiKey,
				modelName: await getSelectedModel(providerId),
			};

			// Create provider instance and validate
			const provider = await createProvider(config);
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
			const userFriendlyMessage = getUserFriendlyMessage(
				error as Error,
				request.providerId,
			);

			sendResponse({
				success: true,
				data: {
					isValid: false,
					providerId: request.providerId,
					modelName: config?.modelName || "default",
					error: userFriendlyMessage,
					originalError: (error as Error).message,
				},
			});
		}
	}
}
