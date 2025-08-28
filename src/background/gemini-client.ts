import { GEMINI_CONFIG } from "../shared/constants";
import { debugLogger } from "../shared/debug";
import { measureAPICall, performanceMonitor } from "../shared/performance";
import type { GoldenNuggetType } from "../shared/schemas";
import { generateGoldenNuggetSchema } from "../shared/schemas";
import { storage } from "../shared/storage";
import {
	type AnalysisProgressMessage,
	type GeminiResponse,
	MESSAGE_TYPES,
	type TypeFilterOptions,
} from "../shared/types";
import type { Phase1Response, Phase2Response } from "../shared/types/providers";
import { TypeFilterService } from "./type-filter-service";

interface ResponseSchemaProperty {
	type: string;
	description: string;
	enum?: string[];
}

interface ResponseSchema {
	type: "object";
	properties: {
		golden_nuggets: {
			type: "array";
			description: string;
			minItems: number;
			items: {
				type: "object";
				properties: Record<string, ResponseSchemaProperty>;
				required: string[];
				propertyOrdering: string[];
			};
		};
	};
	required: string[];
	propertyOrdering: string[];
}

interface AnalysisProgressOptions {
	analysisId?: string;
	source?: "popup" | "context-menu";
	typeFilter?: TypeFilterOptions;
	responseSchema?: ResponseSchema;
	onProgress?: (
		progressType: AnalysisProgressMessage["type"],
		step: 1 | 2 | 3 | 4,
		message: string,
	) => void;
}

export class GeminiClient {
	private apiKey: string | null = null;
	private readonly MAX_RETRIES = 3;
	private readonly RETRY_DELAY = 1000; // 1 second
	private readonly API_BASE_URL =
		"https://generativelanguage.googleapis.com/v1beta/models";
	private readonly MAX_CONTENT_LENGTH = 30000; // Limit content size to optimize API calls
	private responseCache = new Map<
		string,
		{ response: GeminiResponse; timestamp: number }
	>();
	private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

	private async initializeClient(): Promise<void> {
		if (this.apiKey) return;

		try {
			this.apiKey = await storage.getApiKey({
				source: "background",
				action: "read",
				timestamp: Date.now(),
			});
		} catch (apiKeyError: unknown) {
			debugLogger.error(
				"[GeminiClient] API key retrieval failed:",
				apiKeyError,
			);

			// Check if this is a recoverable error that should trigger recovery flow
			if (
				apiKeyError &&
				(apiKeyError as any).code === "DEVICE_CHANGED" &&
				(apiKeyError as any).canRecover
			) {
				debugLogger.log(
					"[GeminiClient] Detected recoverable API key error, preserving enhanced error for recovery",
				);
				// Re-throw the enhanced error to preserve recovery information
				throw apiKeyError;
			}

			// For non-recoverable errors, throw generic message
			throw new Error(
				"Failed to retrieve API key. Please check your configuration in the options page.",
			);
		}

		if (!this.apiKey) {
			throw new Error(
				"Gemini API key not configured. Please set it in the options page.",
			);
		}
	}

	async analyzeContent(
		content: string,
		userPrompt: string,
		progressOptions?: AnalysisProgressOptions,
		temperature?: number,
		modelName?: string,
	): Promise<GeminiResponse> {
		await this.initializeClient();

		if (!this.apiKey) {
			throw new Error("Gemini client not initialized");
		}

		// Use passed model name or fallback to config default
		const selectedModel = modelName || GEMINI_CONFIG.MODEL;
		debugLogger.log(
			`[GeminiClient] Using model: "${selectedModel}" (passed: "${modelName}", default: "${GEMINI_CONFIG.MODEL}")`,
		);

		// Optimize content size to improve API performance
		const optimizedContent = this.optimizeContentForAPI(content);

		// Check cache first
		const cacheKey = this.getCacheKey(optimizedContent, userPrompt);
		const cachedResponse = this.getCachedResponse(cacheKey);
		if (cachedResponse) {
			return cachedResponse;
		}

		return this.retryRequest(async () => {
			return measureAPICall("gemini_generate_content", async () => {
				// Use custom schema if provided, otherwise generate dynamic schema
				const responseSchema =
					progressOptions?.responseSchema ||
					(progressOptions?.typeFilter?.selectedTypes?.length
						? TypeFilterService.generateDynamicSchema(
								progressOptions.typeFilter.selectedTypes,
							)
						: generateGoldenNuggetSchema([]));

				const requestBody = {
					system_instruction: {
						parts: [{ text: userPrompt }],
					},
					contents: [
						{
							parts: [{ text: optimizedContent }],
						},
					],
					generationConfig: {
						responseMimeType: "application/json",
						responseSchema,
						...(temperature !== undefined && { temperature }),
						thinkingConfig: {
							thinkingBudget: GEMINI_CONFIG.THINKING_BUDGET,
						},
					},
				};

				// Log request payload in development mode
				debugLogger.logLLMRequest(
					`${this.API_BASE_URL}/${selectedModel}:generateContent`,
					requestBody,
				);

				// Send step 3 progress: API request start
				if (
					progressOptions &&
					typeof progressOptions.onProgress === "function"
				) {
					progressOptions.onProgress(
						MESSAGE_TYPES.ANALYSIS_API_REQUEST_START,
						3,
						"Generating golden nuggets",
					);
				}

				performanceMonitor.startTimer("gemini_request");
				const response = await fetch(
					`${this.API_BASE_URL}/${selectedModel}:generateContent`,
					{
						method: "POST",
						headers: this.getSecureHeaders(),
						body: JSON.stringify(requestBody),
					},
				);
				performanceMonitor.logTimer(
					"gemini_request",
					"HTTP request to Gemini API",
				);

				if (!response.ok) {
					const errorText = await response.text();
					throw new Error(
						`Gemini API error: ${response.status} ${response.statusText} - ${errorText}`,
					);
				}

				// Send step 3 completion: API response received
				if (
					progressOptions &&
					typeof progressOptions.onProgress === "function"
				) {
					progressOptions.onProgress(
						MESSAGE_TYPES.ANALYSIS_API_RESPONSE_RECEIVED,
						3,
						"Generating golden nuggets",
					);
				}

				// Send step 4 progress: processing results
				if (
					progressOptions &&
					typeof progressOptions.onProgress === "function"
				) {
					progressOptions.onProgress(
						MESSAGE_TYPES.ANALYSIS_PROCESSING_RESULTS,
						4,
						"Finalizing analysis",
					);
				}

				performanceMonitor.startTimer("gemini_response_parse");
				const responseData = await response.json();

				// Extract the text from the response
				const responseText =
					responseData.candidates?.[0]?.content?.parts?.[0]?.text;
				if (!responseText) {
					throw new Error("No response text received from Gemini API");
				}

				const result = JSON.parse(responseText) as GeminiResponse;

				// Log response payload in development mode
				debugLogger.logLLMResponse(responseData, result);

				performanceMonitor.logTimer(
					"gemini_response_parse",
					"Parse Gemini response",
				);

				// Validate the response structure
				if (!result.golden_nuggets || !Array.isArray(result.golden_nuggets)) {
					throw new Error("Invalid response format from Gemini API");
				}

				// Cache the response
				this.setCachedResponse(cacheKey, result);

				return result;
			});
		});
	}

	private async retryRequest<T>(
		operation: () => Promise<T>,
		currentAttempt: number = 1,
	): Promise<T> {
		try {
			return await operation();
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);

			// Handle specific API errors that shouldn't be retried
			if (this.isNonRetryableError(errorMessage)) {
				throw this.enhanceError(error);
			}

			// If we've exhausted retries, throw the enhanced error
			if (currentAttempt >= this.MAX_RETRIES) {
				throw this.enhanceError(error);
			}

			// Smart backoff: longer delays for rate limiting, shorter for transient errors
			const isRateLimit = errorMessage.toLowerCase().includes("rate limit");
			const baseDelay = isRateLimit ? this.RETRY_DELAY * 2 : this.RETRY_DELAY;
			const delay = baseDelay * 2 ** (currentAttempt - 1);

			// Add jitter to prevent thundering herd
			const jitter = Math.random() * 0.1 * delay;
			await new Promise((resolve) => setTimeout(resolve, delay + jitter));

			debugLogger.warn(
				`Retrying Gemini API request (attempt ${currentAttempt + 1}/${this.MAX_RETRIES})`,
			);
			return this.retryRequest(operation, currentAttempt + 1);
		}
	}

	private isNonRetryableError(errorMessage: string): boolean {
		const nonRetryableErrors = [
			"API key",
			"authentication",
			"authorization",
			"invalid request",
			"bad request",
			"malformed",
		];

		return nonRetryableErrors.some((error) =>
			errorMessage.toLowerCase().includes(error.toLowerCase()),
		);
	}

	private enhanceError(error: unknown): Error {
		if (error instanceof Error) {
			const message = error.message.toLowerCase();
			const originalMessage = error.message;

			if (message.includes("api key") || message.includes("authentication")) {
				return new Error(
					`Invalid API key: ${originalMessage}. Please check your Gemini API key in settings.`,
				);
			} else if (message.includes("rate limit")) {
				// Extract rate limit details if available
				const match = originalMessage.match(/rate limit exceeded.*?(\d+.*?)/i);
				const details = match ? ` (${match[1]})` : "";
				return new Error(
					`Rate limit reached${details}. Please wait before trying again.`,
				);
			} else if (message.includes("quota")) {
				return new Error(
					`API quota exceeded: ${originalMessage}. Please check your Gemini API usage limits.`,
				);
			} else if (message.includes("timeout")) {
				return new Error(
					`Request timed out: ${originalMessage}. Please try again.`,
				);
			} else if (
				message.includes("network") ||
				message.includes("connection") ||
				message.includes("failed to fetch")
			) {
				return new Error(
					`Network error: ${originalMessage}. Please check your internet connection.`,
				);
			} else if (message.includes("400") || message.includes("bad request")) {
				return new Error(
					`Invalid request: ${originalMessage}. The content might be too large or contain unsupported characters.`,
				);
			} else if (message.includes("403") || message.includes("forbidden")) {
				return new Error(
					`Access denied: ${originalMessage}. Please check your API key permissions.`,
				);
			} else if (message.includes("404") || message.includes("not found")) {
				return new Error(
					`API endpoint not found: ${originalMessage}. The Gemini API might be unavailable.`,
				);
			} else if (
				message.includes("500") ||
				message.includes("internal server error")
			) {
				return new Error(
					`Gemini API server error: ${originalMessage}. Please try again later.`,
				);
			}

			// For unrecognized errors, preserve original message with context
			return new Error(`Gemini API error: ${originalMessage}`);
		}

		debugLogger.error("Gemini API error:", error);
		return new Error(`Analysis failed with unknown error: ${error}`);
	}

	private optimizeContentForAPI(content: string): string {
		// Truncate content if too long
		if (content.length > this.MAX_CONTENT_LENGTH) {
			// Try to truncate at sentence boundaries
			const sentences = content.split(/[.!?]+/);
			let truncated = "";

			for (const sentence of sentences) {
				if (truncated.length + sentence.length > this.MAX_CONTENT_LENGTH) {
					break;
				}
				truncated += `${sentence}. `;
			}

			return truncated || content.substring(0, this.MAX_CONTENT_LENGTH);
		}

		return content;
	}

	private getCacheKey(content: string, prompt: string): string {
		// Create a hash-like key for caching
		return `${content.length}_${prompt.length}_${content.substring(0, 50)}_${prompt.substring(0, 50)}`;
	}

	private getCachedResponse(cacheKey: string): GeminiResponse | null {
		const cached = this.responseCache.get(cacheKey);
		if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
			return cached.response;
		}

		// Remove expired cache entry
		if (cached) {
			this.responseCache.delete(cacheKey);
		}

		return null;
	}

	private setCachedResponse(cacheKey: string, response: GeminiResponse): void {
		// Limit cache size to prevent memory issues
		if (this.responseCache.size > 10) {
			// Remove oldest entries
			const oldestKey = this.responseCache.keys().next().value;
			if (oldestKey !== undefined) {
				this.responseCache.delete(oldestKey);
			}
		}

		this.responseCache.set(cacheKey, {
			response,
			timestamp: Date.now(),
		});
	}

	async validateApiKey(apiKey: string): Promise<boolean> {
		try {
			// Basic validation first
			if (!apiKey || apiKey.trim().length === 0) {
				return false;
			}

			// Test the API key with a GET request to list models (cheaper than generateContent)
			// SECURITY FIX: Use header instead of URL parameter to prevent API key exposure
			const modelsUrl =
				"https://generativelanguage.googleapis.com/v1beta/models";

			const response = await fetch(modelsUrl, {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
					"x-goog-api-key": apiKey,
				},
			});

			// Log API key validation request/response in development mode
			debugLogger.logLLMValidation(
				modelsUrl,
				{}, // No request body for GET
				response.status,
				response.statusText,
				response.ok,
			);

			// If we get a 200 response, the API key is valid
			return response.ok;
		} catch (error) {
			debugLogger.warn("API key validation failed:", error);
			return false;
		}
	}

	/**
	 * Generate headers for API requests
	 */
	private getSecureHeaders(apiKey?: string): HeadersInit {
		const effectiveApiKey = apiKey || this.apiKey;

		if (!effectiveApiKey) {
			throw new Error(
				"API key is required but not available. Please ensure the client is initialized or provide an API key.",
			);
		}

		return {
			"Content-Type": "application/json",
			"x-goog-api-key": effectiveApiKey,
		};
	}

	/**
	 * Extract golden nuggets using Phase 1: High Recall approach
	 * Returns nuggets with fullContent and confidence scores
	 */
	async extractPhase1HighRecall(
		content: string,
		prompt: string,
		temperature = 0.7,
		selectedTypes?: GoldenNuggetType[],
		modelName?: string,
	): Promise<Phase1Response> {
		await this.initializeClient();

		if (!this.apiKey) {
			throw new Error("Gemini client not initialized");
		}

		// Use passed model name or fallback to config default
		const selectedModel = modelName || GEMINI_CONFIG.MODEL;
		debugLogger.log(
			`[GeminiClient] Phase 1 High Recall using model: "${selectedModel}" (passed: "${modelName}", default: "${GEMINI_CONFIG.MODEL}")`,
		);

		// Use dedicated Gemini Phase 1 schema
		const { generateGeminiPhase1HighRecallSchema } = await import(
			"../shared/schemas"
		);
		const geminiSchema = generateGeminiPhase1HighRecallSchema(
			selectedTypes || [],
		);

		// Optimize content size
		const optimizedContent = this.optimizeContentForAPI(content);

		return this.retryRequest(async () => {
			return measureAPICall("gemini_phase1_high_recall", async () => {
				const requestBody = {
					system_instruction: {
						parts: [{ text: prompt }],
					},
					contents: [
						{
							parts: [{ text: optimizedContent }],
						},
					],
					generationConfig: {
						responseMimeType: "application/json",
						responseSchema: geminiSchema,
						temperature: temperature,
						thinkingConfig: {
							thinkingBudget: GEMINI_CONFIG.THINKING_BUDGET,
						},
					},
				};

				// Log request in development mode
				debugLogger.logLLMRequest(
					`${this.API_BASE_URL}/${selectedModel}:generateContent - Phase 1`,
					requestBody,
				);

				performanceMonitor.startTimer("gemini_phase1_request");
				const response = await fetch(
					`${this.API_BASE_URL}/${selectedModel}:generateContent`,
					{
						method: "POST",
						headers: this.getSecureHeaders(),
						body: JSON.stringify(requestBody),
					},
				);
				performanceMonitor.logTimer(
					"gemini_phase1_request",
					"HTTP request to Gemini API - Phase 1",
				);

				if (!response.ok) {
					const errorText = await response.text();
					throw new Error(
						`Gemini API error (Phase 1): ${response.status} ${response.statusText} - ${errorText}`,
					);
				}

				performanceMonitor.startTimer("gemini_phase1_response_parse");
				const responseData = await response.json();

				// Extract the text from the response
				const responseText =
					responseData.candidates?.[0]?.content?.parts?.[0]?.text;
				if (!responseText) {
					throw new Error(
						"No response text received from Gemini API (Phase 1)",
					);
				}

				const result = JSON.parse(responseText) as Phase1Response;

				// Log response in development mode
				debugLogger.logLLMResponse(responseData);

				performanceMonitor.logTimer(
					"gemini_phase1_response_parse",
					"Parse Gemini Phase 1 response",
				);

				// Validate the response structure
				if (!result.golden_nuggets || !Array.isArray(result.golden_nuggets)) {
					throw new Error("Invalid Phase 1 response format from Gemini API");
				}

				return result;
			});
		});
	}

	/**
	 * Extract golden nuggets using Phase 2: High Precision approach
	 * Returns nuggets with precise startContent/endContent boundaries and confidence scores
	 */
	async extractPhase2HighPrecision(
		content: string,
		prompt: string,
		nuggets: Array<{
			type: GoldenNuggetType;
			fullContent: string;
			confidence: number;
		}>,
		temperature = 0.0,
		modelName?: string,
	): Promise<Phase2Response> {
		await this.initializeClient();

		if (!this.apiKey) {
			throw new Error("Gemini client not initialized");
		}

		// Use passed model name or fallback to config default
		const selectedModel = modelName || GEMINI_CONFIG.MODEL;
		debugLogger.log(
			`[GeminiClient] Phase 2 High Precision using model: "${selectedModel}" (passed: "${modelName}", default: "${GEMINI_CONFIG.MODEL}")`,
		);

		// Use dedicated Gemini Phase 2 schema
		const { generateGeminiPhase2HighPrecisionSchema } = await import(
			"../shared/schemas"
		);
		const geminiSchema = generateGeminiPhase2HighPrecisionSchema([]);

		// Build the Phase 2 prompt with nuggets context
		const nuggetsList = nuggets
			.map(
				(nugget, index) =>
					`${index + 1}. Type: ${nugget.type}\n   Content: "${nugget.fullContent}"\n   Confidence: ${nugget.confidence}`,
			)
			.join("\n\n");

		const phase2PromptWithContext = `${prompt}\n\nNUGGETS TO PROCESS:\n${nuggetsList}\n\nORIGINAL CONTENT:\n${content}`;

		// Optimize content size
		const optimizedContent = this.optimizeContentForAPI(content);

		return this.retryRequest(async () => {
			return measureAPICall("gemini_phase2_high_precision", async () => {
				const requestBody = {
					system_instruction: {
						parts: [{ text: phase2PromptWithContext }],
					},
					contents: [
						{
							parts: [{ text: optimizedContent }],
						},
					],
					generationConfig: {
						responseMimeType: "application/json",
						responseSchema: geminiSchema,
						temperature: temperature,
						thinkingConfig: {
							thinkingBudget: GEMINI_CONFIG.THINKING_BUDGET,
						},
					},
				};

				// Log request in development mode
				debugLogger.logLLMRequest(
					`${this.API_BASE_URL}/${selectedModel}:generateContent - Phase 2`,
					requestBody,
				);

				performanceMonitor.startTimer("gemini_phase2_request");
				const response = await fetch(
					`${this.API_BASE_URL}/${selectedModel}:generateContent`,
					{
						method: "POST",
						headers: this.getSecureHeaders(),
						body: JSON.stringify(requestBody),
					},
				);
				performanceMonitor.logTimer(
					"gemini_phase2_request",
					"HTTP request to Gemini API - Phase 2",
				);

				if (!response.ok) {
					const errorText = await response.text();
					throw new Error(
						`Gemini API error (Phase 2): ${response.status} ${response.statusText} - ${errorText}`,
					);
				}

				performanceMonitor.startTimer("gemini_phase2_response_parse");
				const responseData = await response.json();

				// Extract the text from the response
				const responseText =
					responseData.candidates?.[0]?.content?.parts?.[0]?.text;
				if (!responseText) {
					throw new Error(
						"No response text received from Gemini API (Phase 2)",
					);
				}

				const result = JSON.parse(responseText) as Phase2Response;

				// Log response in development mode
				debugLogger.logLLMResponse(responseData);

				performanceMonitor.logTimer(
					"gemini_phase2_response_parse",
					"Parse Gemini Phase 2 response",
				);

				// Validate the response structure
				if (!result.golden_nuggets || !Array.isArray(result.golden_nuggets)) {
					throw new Error("Invalid Phase 2 response format from Gemini API");
				}

				return result;
			});
		});
	}

	/**
	 * Clear sensitive data from memory
	 */
	clearSensitiveData(): void {
		this.apiKey = null;
		this.responseCache.clear();
		debugLogger.log("[GeminiClient] Sensitive data cleared from memory");
	}
}
