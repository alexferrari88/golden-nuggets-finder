import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import type {
	GoldenNuggetsResponse,
	LLMProvider,
	ProviderConfig,
} from "../interfaces/providers";
import type { GoldenNuggetType } from "../schemas";

// Schema definition for golden nuggets with fullContent approach
// Includes type variants that response-normalizer can handle to prevent validation failures
const GoldenNuggetsSchema = z.object({
	golden_nuggets: z.array(
		z.object({
			type: z.enum([
				// Canonical types
				"tool",
				"media",
				"aha! moments",
				"analogy",
				"model",
				// AI model variations that response-normalizer handles
				"mental model",
				"mental_model",
				"aha!_moments", // Underscore variation that some models return
				"framework",
				"technique",
				"method",
				"resource",
				"book",
				"article",
				"concept",
				"comparison",
				"metaphor",
				// Plural variations that some models return
				"tools",
				"analogies",
				"models",
			]),
			fullContent: z.string(),
			confidence: z.number().min(0).max(1),
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

		for (let attempt = 0; attempt <= maxRetries; attempt++) {
			try {
				const result = await operation();
				return result;
			} catch (error) {
				_lastError = error;
				const errorMessage = this.getErrorMessage(error);

				// Only retry on rate limiting errors
				if (!this.isRateLimitError(errorMessage)) {
					throw error;
				}

				// Don't retry on the last attempt
				if (attempt === maxRetries) {
					break;
				}

				// Exponential backoff: 1s, 2s, 4s
				const delayMs = 2 ** attempt * 1000;
				await this.sleep(delayMs);
			}
		}

		// All retries exhausted, throw with specific error for UI to handle
		const finalErrorMessage = `RATE_LIMIT_RETRY_EXHAUSTED: Rate limit exceeded after ${maxRetries + 1} attempts. The OpenRouter API is temporarily limiting requests. You can try again.`;
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
		_selectedTypes?: GoldenNuggetType[],
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

			// Normalize response types to canonical forms
			const normalizedResponse: GoldenNuggetsResponse = {
				golden_nuggets: response.golden_nuggets.map((nugget) => {
					let normalizedType: GoldenNuggetType;

					// Normalize type variations to canonical forms
					switch (nugget.type.toLowerCase()) {
						case "mental model":
						case "mental_model":
						case "model":
						case "models":
						case "framework":
							normalizedType = "model";
							break;
						case "aha!_moments":
						case "aha! moments":
							normalizedType = "aha! moments";
							break;
						case "tools":
						case "technique":
						case "method":
							normalizedType = "tool";
							break;
						case "analogies":
						case "comparison":
						case "metaphor":
							normalizedType = "analogy";
							break;
						case "book":
						case "article":
						case "resource":
							normalizedType = "media";
							break;
						default:
							// If it's already a canonical type, use as-is, otherwise default to "tool"
							normalizedType = [
								"tool",
								"media",
								"aha! moments",
								"analogy",
								"model",
							].includes(nugget.type as GoldenNuggetType)
								? (nugget.type as GoldenNuggetType)
								: "tool";
					}

					return {
						type: normalizedType,
						fullContent: nugget.fullContent,
						confidence: nugget.confidence,
						extractionMethod: "llm" as const,
					};
				}),
			};

			return normalizedResponse;
		} catch (error) {
			const errorMessage = this.getErrorMessage(error);

			// Re-throw rate limit retry exhausted errors as-is for UI to handle
			if (errorMessage.startsWith("RATE_LIMIT_RETRY_EXHAUSTED:")) {
				throw error;
			}

			// For other errors, wrap with provider context
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
		} catch (_error) {
			return false;
		}
	}
}
