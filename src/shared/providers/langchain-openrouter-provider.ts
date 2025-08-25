import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { debugLogger } from "../debug";
import type {
	GoldenNuggetsResponse,
	LLMProvider,
	ProviderConfig,
} from "../types/providers";

// Schema definition for golden nuggets (synthesis removed)
const GoldenNuggetsSchema = z.object({
	golden_nuggets: z.array(
		z.object({
			type: z.string(), // Accept any string, normalize later
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
			temperature: 0,
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
	): Promise<GoldenNuggetsResponse> {
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
			},
		);

		try {
			const response = await this.executeWithRetry(async () => {
				const structuredModel = this.model.withStructuredOutput(
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

			// Normalize type values that OpenRouter models might return
			if (response?.golden_nuggets) {
				response.golden_nuggets = response.golden_nuggets.map((nugget) => ({
					...nugget,
					type: this.normalizeType(nugget.type),
				}));
			}

			// Log the response
			debugLogger.logLLMResponse(
				{
					provider: "openrouter",
					model: this.modelName,
					success: true,
				},
				response,
			);

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

	private normalizeType(
		type: string,
	): "tool" | "media" | "aha! moments" | "analogy" | "model" {
		// Handle common variations that OpenRouter models might return
		const typeMap: Record<
			string,
			"tool" | "media" | "aha! moments" | "analogy" | "model"
		> = {
			"mental model": "model",
			mental_model: "model",
			framework: "model",
			technique: "tool",
			method: "tool",
			resource: "media",
			book: "media",
			article: "media",
			concept: "aha! moments",
			comparison: "analogy",
			metaphor: "analogy",
		};

		const normalized = typeMap[type.toLowerCase()] || type;

		// Validate against allowed types
		const allowedTypes = ["tool", "media", "aha! moments", "analogy", "model"];
		return allowedTypes.includes(normalized)
			? (normalized as "tool" | "media" | "aha! moments" | "analogy" | "model")
			: "aha! moments";
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
}
