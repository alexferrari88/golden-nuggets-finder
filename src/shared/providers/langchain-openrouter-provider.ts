import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { debugLogger, isDevMode } from "../debug";
import type {
	GoldenNuggetsResponse,
	LLMProvider,
	ProviderConfig,
} from "../types/providers";

// Schema that matches the main extension's GoldenNugget interface
const FlexibleGoldenNuggetsSchema = z.object({
	golden_nuggets: z.array(
		z.object({
			type: z.string(), // Accept any string, normalize later
			startContent: z.string(),
			endContent: z.string(),
			synthesis: z.string(),
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
		} else if (error && typeof error === 'object') {
			// Handle OpenRouter API error format
			if ('error' in error && typeof (error as any).error === 'object' && (error as any).error !== null) {
				const apiError = (error as any).error;
				if ('message' in apiError) {
					return String(apiError.message);
				}
			}
			// Handle other object-type errors
			else if ('message' in error) {
				return String((error as any).message);
			}
		}
		return String(error);
	}

	constructor(private config: ProviderConfig) {
		this.modelName = config.modelName || "z-ai/glm-4.5-air:free";
		this.model = new ChatOpenAI({
			apiKey: config.apiKey,
			model: this.modelName,
			temperature: 0,
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
		try {
			// Log the request
			debugLogger.logLLMRequest(`https://openrouter.ai/api/v1/chat/completions (${this.modelName})`, {
				model: this.modelName,
				messages: [
					{ role: "system", content: prompt },
					{ role: "user", content: content.substring(0, 500) + "..." }, // Truncate for logging
				],
				provider: "openrouter"
			});

			const structuredModel = this.model.withStructuredOutput(
				FlexibleGoldenNuggetsSchema,
				{
					name: "extract_golden_nuggets",
					method: "functionCalling",
					includeRaw: isDevMode() || debugLogger.isEnabled(),
				},
			);

			const response = await structuredModel.invoke([
				new SystemMessage(prompt),
				new HumanMessage(content),
			]);

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
					success: true 
				}, 
				response
			);

			return response as GoldenNuggetsResponse;
		} catch (error) {
			const errorMessage = this.getErrorMessage(error);
			
			// Handle rate limiting errors with user-friendly message
			if (errorMessage.toLowerCase().includes('429') || 
				errorMessage.toLowerCase().includes('rate limit') ||
				errorMessage.toLowerCase().includes('too many requests')) {
				
				// Log the error
				debugLogger.logLLMResponse(
					{ 
						provider: "openrouter",
						model: this.modelName,
						success: false,
						error: errorMessage 
					}
				);

				throw new Error(`Rate limit exceeded. Please wait a moment and try again. The OpenRouter API is temporarily limiting requests.`);
			}
			
			// Log the error
			debugLogger.logLLMResponse(
				{ 
					provider: "openrouter",
					model: this.modelName,
					success: false,
					error: errorMessage 
				}
			);

			console.error(`OpenRouter provider error:`, error);
			throw new Error(`OpenRouter API call failed: ${errorMessage}`);
		}
	}

	private normalizeType(
		type: string,
	): "tool" | "media" | "explanation" | "analogy" | "model" {
		// Handle common variations that OpenRouter models might return
		const typeMap: Record<
			string,
			"tool" | "media" | "explanation" | "analogy" | "model"
		> = {
			"mental model": "model",
			mental_model: "model",
			framework: "model",
			technique: "tool",
			method: "tool",
			resource: "media",
			book: "media",
			article: "media",
			concept: "explanation",
			comparison: "analogy",
			metaphor: "analogy",
		};

		const normalized = typeMap[type.toLowerCase()] || type;

		// Validate against allowed types
		const allowedTypes = ["tool", "media", "explanation", "analogy", "model"];
		return allowedTypes.includes(normalized)
			? (normalized as "tool" | "media" | "explanation" | "analogy" | "model")
			: "explanation";
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
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.warn(`OpenRouter API key validation failed:`, errorMessage);
			return false;
		}
	}
}
