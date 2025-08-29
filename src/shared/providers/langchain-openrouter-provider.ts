import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { debugLogger } from "../debug";
import type { GoldenNuggetType } from "../schemas";
import type {
	GoldenNuggetsResponse,
	LLMProvider,
	Phase1Response,
	Phase2Response,
	ProviderConfig,
} from "../types/providers";

// Schema definition for golden nuggets (synthesis removed)
const GoldenNuggetsSchema = z.object({
	golden_nuggets: z.array(
		z.object({
			type: z.enum(["tool", "media", "aha! moments", "analogy", "model"]),
			startContent: z.string(),
			endContent: z.string(),
		}),
	),
});

export class LangChainOpenRouterProvider implements LLMProvider {
	readonly providerId = "openrouter" as const;
	readonly modelName: string;
	private model: ChatOpenAI;

	/**
	 * Safely extracts error message from unknown error objects
	 */
	private getErrorMessage(error: unknown): string {
		if (error instanceof Error) {
			return error.message;
		} else if (error && typeof error === "object") {
			// Handle OpenRouter API error format
			if (
				"error" in error &&
				typeof (error as Record<string, unknown>).error === "object" &&
				(error as Record<string, unknown>).error !== null
			) {
				const apiError = (error as Record<string, unknown>).error as Record<
					string,
					unknown
				>;
				if ("message" in apiError) {
					return String(apiError.message);
				}
			}
			// Handle other object-type errors
			else if ("message" in error) {
				return String((error as Record<string, unknown>).message);
			}
		}
		return String(error);
	}

	/**
	 * Checks if an error is a rate limiting error (429)
	 */
	private isRateLimitError(errorMessage: string): boolean {
		return (
			errorMessage.toLowerCase().includes("429") ||
			errorMessage.toLowerCase().includes("rate limit") ||
			errorMessage.toLowerCase().includes("too many requests")
		);
	}

	/**
	 * Sleep utility for retry delays
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	/**
	 * Validates OpenRouter response for error objects even in 200 responses
	 */
	private validateOpenRouterResponse(response: unknown): void {
		// Check if response contains error object (OpenRouter can return 200 with error content)
		if (response && typeof response === "object" && "error" in response) {
			const error = (response as Record<string, unknown>).error;
			if (error && typeof error === "object" && "message" in error) {
				const errorObj = error as Record<string, unknown>;
				const errorMessage = String(errorObj.message);
				const errorCode = errorObj.code ? String(errorObj.code) : "unknown";
				debugLogger.log(
					`🚨 OpenRouter returned 200 with error object: ${errorMessage} (code: ${errorCode})`,
				);
				throw new Error(`OpenRouter API error (${errorCode}): ${errorMessage}`);
			}
		}
	}

	/**
	 * Execute API call with retry logic and exponential backoff for rate limiting errors
	 */
	private async executeWithRetry<T>(
		operation: () => Promise<T>,
		maxRetries: number = 3,
	): Promise<T> {
		let _lastError: unknown;

		debugLogger.log(
			`🔄 Starting OpenRouter request with retry logic (max ${maxRetries} retries)`,
		);

		for (let attempt = 0; attempt <= maxRetries; attempt++) {
			try {
				debugLogger.log(
					`📤 OpenRouter attempt ${attempt + 1}/${maxRetries + 1} starting...`,
				);
				const result = await operation();
				debugLogger.log(
					`✅ OpenRouter attempt ${attempt + 1}/${maxRetries + 1} succeeded`,
				);
				return result;
			} catch (error) {
				_lastError = error;
				const errorMessage = this.getErrorMessage(error);

				debugLogger.log(
					`❌ OpenRouter attempt ${attempt + 1}/${maxRetries + 1} failed: ${errorMessage}`,
				);

				// Only retry on rate limiting errors
				if (!this.isRateLimitError(errorMessage)) {
					debugLogger.log(`🚫 Not a rate limit error, stopping retries`);
					throw error;
				}

				// Don't retry on the last attempt
				if (attempt === maxRetries) {
					debugLogger.log(`🔚 Last attempt failed, no more retries`);
					break;
				}

				// Exponential backoff: 1s, 2s, 4s
				const delayMs = 2 ** attempt * 1000;
				debugLogger.log(
					`⏱️ Rate limit hit, retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries + 1})`,
				);
				await this.sleep(delayMs);
			}
		}

		// All retries exhausted, throw with specific error for UI to handle
		const finalErrorMessage = `RATE_LIMIT_RETRY_EXHAUSTED: Rate limit exceeded after ${maxRetries + 1} attempts. The OpenRouter API is temporarily limiting requests. You can try again.`;
		debugLogger.log(`🔴 All retries exhausted, throwing: ${finalErrorMessage}`);
		throw new Error(finalErrorMessage);
	}

	constructor(private config: ProviderConfig) {
		this.modelName = config.modelName || "z-ai/glm-4.5-air:free";
		this.model = new ChatOpenAI({
			apiKey: config.apiKey,
			model: this.modelName,
			temperature: 0.2,
			maxRetries: 0, // Disable ChatOpenAI's built-in retry logic - we handle retries ourselves
			configuration: {
				baseURL: "https://openrouter.ai/api/v1",
				defaultHeaders: {
					"HTTP-Referer": "https://golden-nuggets-finder.com",
					"X-Title": "Golden Nuggets Finder",
				},
			},
		});
	}

	async extractGoldenNuggets(
		content: string,
		prompt: string,
		temperature?: number,
	): Promise<GoldenNuggetsResponse> {
		// Use provided temperature or fallback to default (0.2)
		const effectiveTemperature = temperature ?? 0.2;

		// Create model with specified temperature
		const model =
			temperature !== undefined
				? new ChatOpenAI({
						apiKey: this.config.apiKey,
						model: this.modelName,
						temperature: effectiveTemperature,
						maxRetries: 0, // Disable ChatOpenAI's built-in retry logic - we handle retries ourselves
						configuration: {
							baseURL: "https://openrouter.ai/api/v1",
							defaultHeaders: {
								"HTTP-Referer": "https://golden-nuggets-finder.com",
								"X-Title": "Golden Nuggets Finder",
							},
						},
					})
				: this.model;

		// Log the request
		debugLogger.logLLMRequest(
			`https://openrouter.ai/api/v1/chat/completions (${this.modelName})`,
			{
				model: this.modelName,
				messages: [
					{ role: "system", content: prompt },
					{ role: "user", content: `${content.substring(0, 500)}...` }, // Truncate for logging
				],
				provider: "openrouter",
				temperature: effectiveTemperature,
			},
		);

		try {
			const response = await this.executeWithRetry(async () => {
				const structuredModel = model.withStructuredOutput(
					GoldenNuggetsSchema,
					{
						name: "extract_golden_nuggets",
						method: "functionCalling",
					},
				);

				const result = await structuredModel.invoke([
					new SystemMessage(prompt),
					new HumanMessage(content),
				]);

				// Validate response for error objects (OpenRouter can return 200 with error content)
				this.validateOpenRouterResponse(result);

				return result;
			});

			// Response already validated by schema - no normalization needed

			// Log the response
			debugLogger.logLLMResponse({
				provider: "openrouter",
				model: this.modelName,
				success: true,
			});

			return response as GoldenNuggetsResponse;
		} catch (error) {
			const errorMessage = this.getErrorMessage(error);

			// Log the error
			debugLogger.logLLMResponse({
				provider: "openrouter",
				model: this.modelName,
				success: false,
				error: errorMessage,
			});

			debugLogger.log(`🔴 OpenRouter provider final error: ${errorMessage}`);

			// Re-throw rate limit retry exhausted errors as-is for UI to handle
			if (errorMessage.startsWith("RATE_LIMIT_RETRY_EXHAUSTED:")) {
				debugLogger.log(
					`🔄 Re-throwing rate limit retry exhausted error for UI handling`,
				);
				throw error;
			}

			// For other errors, wrap with provider context
			debugLogger.log(`❌ Wrapping non-retry error with provider context`);
			throw new Error(`OpenRouter API call failed: ${errorMessage}`);
		}
	}

	async validateApiKey(): Promise<boolean> {
		try {
			const response = await fetch("https://openrouter.ai/api/v1/models", {
				headers: {
					Authorization: `Bearer ${this.config.apiKey}`,
					"HTTP-Referer": "https://golden-nuggets-finder.com",
					"X-Title": "Golden Nuggets Finder",
				},
			});
			return response.ok; // 200 = valid, 401 = invalid key
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			console.warn(`OpenRouter API key validation failed:`, errorMessage);
			return false;
		}
	}

	async extractPhase1HighRecall(
		content: string,
		prompt: string,
		temperature = 0.7,
		_selectedTypes?: GoldenNuggetType[],
	): Promise<Phase1Response> {
		// Create Phase 1 schema for high recall extraction
		const Phase1Schema = z.object({
			golden_nuggets: z.array(
				z.object({
					type: z.enum(["tool", "media", "aha! moments", "analogy", "model"]),
					fullContent: z.string(),
					confidence: z.number().min(0).max(1),
				}),
			),
		});

		// Create model with Phase 1 temperature (high recall)
		const model = new ChatOpenAI({
			apiKey: this.config.apiKey,
			model: this.modelName,
			temperature: temperature,
			maxRetries: 0, // Disable ChatOpenAI's built-in retry logic - we handle retries ourselves
			configuration: {
				baseURL: "https://openrouter.ai/api/v1",
				defaultHeaders: {
					"HTTP-Referer": "https://golden-nuggets-finder.com",
					"X-Title": "Golden Nuggets Finder",
				},
			},
		});

		// Log the request
		debugLogger.logLLMRequest(
			`https://openrouter.ai/api/v1/chat/completions (${this.modelName}) - Phase 1`,
			{
				model: this.modelName,
				messages: [
					{ role: "system", content: prompt },
					{ role: "user", content: `${content.substring(0, 500)}...` },
				],
				provider: "openrouter",
				temperature: temperature,
				phase: "1-high-recall",
			},
		);

		try {
			const response = await this.executeWithRetry(async () => {
				const structuredModel = model.withStructuredOutput(Phase1Schema, {
					name: "extract_golden_nuggets_phase1",
					method: "functionCalling",
				});

				const result = await structuredModel.invoke([
					new SystemMessage(prompt),
					new HumanMessage(content),
				]);

				// Validate response for error objects
				this.validateOpenRouterResponse(result);
				return result;
			});

			// Response already validated by schema - no normalization needed

			// Log the response
			debugLogger.logLLMResponse({
				provider: "openrouter",
				model: this.modelName,
				phase: "1-high-recall",
				success: true,
			});

			return response as Phase1Response;
		} catch (error) {
			const errorMessage = this.getErrorMessage(error);

			// Log the error
			debugLogger.logLLMResponse({
				provider: "openrouter",
				model: this.modelName,
				phase: "1-high-recall",
				success: false,
				error: errorMessage,
			});

			// Re-throw rate limit retry exhausted errors as-is for UI to handle
			if (errorMessage.startsWith("RATE_LIMIT_RETRY_EXHAUSTED:")) {
				throw error;
			}

			// For other errors, wrap with provider context
			throw new Error(`OpenRouter Phase 1 API call failed: ${errorMessage}`);
		}
	}

	async extractPhase2HighPrecision(
		content: string,
		prompt: string,
		nuggets: Array<{
			type: GoldenNuggetType;
			fullContent: string;
			confidence: number;
		}>,
		temperature = 0.0,
	): Promise<Phase2Response> {
		// Create Phase 2 schema for boundary detection
		const Phase2Schema = z.object({
			golden_nuggets: z.array(
				z.object({
					type: z.enum(["tool", "media", "aha! moments", "analogy", "model"]),
					startContent: z.string(),
					endContent: z.string(),
					confidence: z.number().min(0).max(1),
				}),
			),
		});

		// Create model with Phase 2 temperature (high precision)
		const model = new ChatOpenAI({
			apiKey: this.config.apiKey,
			model: this.modelName,
			temperature: temperature,
			maxRetries: 0, // Disable ChatOpenAI's built-in retry logic - we handle retries ourselves
			configuration: {
				baseURL: "https://openrouter.ai/api/v1",
				defaultHeaders: {
					"HTTP-Referer": "https://golden-nuggets-finder.com",
					"X-Title": "Golden Nuggets Finder",
				},
			},
		});

		// Build the Phase 2 prompt with nuggets context
		const nuggetsList = nuggets
			.map(
				(nugget, index) =>
					`${index + 1}. Type: ${nugget.type}\n   Content: "${nugget.fullContent}"\n   Confidence: ${nugget.confidence}`,
			)
			.join("\n\n");

		const phase2PromptWithContext = `${prompt}\n\nNUGGETS TO PROCESS:\n${nuggetsList}\n\nORIGINAL CONTENT:\n${content}`;

		// Log the request
		debugLogger.logLLMRequest(
			`https://openrouter.ai/api/v1/chat/completions (${this.modelName}) - Phase 2`,
			{
				model: this.modelName,
				messages: [
					{ role: "system", content: phase2PromptWithContext },
					{ role: "user", content: `${content.substring(0, 500)}...` },
				],
				provider: "openrouter",
				temperature: temperature,
				phase: "2-high-precision",
				nuggetCount: nuggets.length,
			},
		);

		try {
			const response = await this.executeWithRetry(async () => {
				const structuredModel = model.withStructuredOutput(Phase2Schema, {
					name: "extract_golden_nuggets_phase2",
					method: "functionCalling",
				});

				const result = await structuredModel.invoke([
					new SystemMessage(phase2PromptWithContext),
					new HumanMessage(content),
				]);

				// Validate response for error objects
				this.validateOpenRouterResponse(result);
				return result;
			});

			// Response already validated by schema - no normalization needed

			// Log the response
			debugLogger.logLLMResponse({
				provider: "openrouter",
				model: this.modelName,
				phase: "2-high-precision",
				success: true,
			});

			return response as Phase2Response;
		} catch (error) {
			const errorMessage = this.getErrorMessage(error);

			// Log the error
			debugLogger.logLLMResponse({
				provider: "openrouter",
				model: this.modelName,
				phase: "2-high-precision",
				success: false,
				error: errorMessage,
			});

			// Re-throw rate limit retry exhausted errors as-is for UI to handle
			if (errorMessage.startsWith("RATE_LIMIT_RETRY_EXHAUSTED:")) {
				throw error;
			}

			// For other errors, wrap with provider context
			throw new Error(`OpenRouter Phase 2 API call failed: ${errorMessage}`);
		}
	}
}
