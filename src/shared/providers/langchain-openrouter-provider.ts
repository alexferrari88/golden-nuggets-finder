import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { debugLogger } from "../debug";
import type {
	GoldenNuggetsResponse,
	LLMProvider,
	ProviderConfig,
} from "../types/providers";

// More flexible schema for OpenRouter that accepts common variations
const FlexibleGoldenNuggetsSchema = z.object({
	golden_nuggets: z.array(
		z.object({
			type: z.string(), // Accept any string, normalize later
			content: z.string(),
			synthesis: z.string(),
		}),
	),
});

export class LangChainOpenRouterProvider implements LLMProvider {
	readonly providerId = "openrouter" as const;
	readonly modelName: string;
	private model: ChatOpenAI;

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

			let response: any;
			
			// Try functionCalling first (most reliable when supported)
			try {
				const structuredModel = this.model.withStructuredOutput(
					FlexibleGoldenNuggetsSchema,
					{
						name: "extract_golden_nuggets",
						method: "functionCalling",
					},
				);

				response = await structuredModel.invoke([
					new SystemMessage(prompt),
					new HumanMessage(content),
				]);
				
				console.log("Function calling succeeded for OpenRouter");
			} catch (functionCallingError) {
				// Defensive error handling for potentially malformed error objects
				let errorMessage = "Unknown error occurred";
				try {
					if (functionCallingError && typeof functionCallingError === 'object') {
						if (functionCallingError instanceof Error) {
							errorMessage = functionCallingError.message || errorMessage;
						} else if (functionCallingError.message) {
							errorMessage = String(functionCallingError.message);
						} else if (functionCallingError.error) {
							errorMessage = String(functionCallingError.error);
						} else {
							errorMessage = JSON.stringify(functionCallingError);
						}
					} else if (functionCallingError) {
						errorMessage = String(functionCallingError);
					}
					
					// Check if this looks like a rate limiting error
					if (errorMessage.toLowerCase().includes('429') || 
						errorMessage.toLowerCase().includes('rate limit') ||
						errorMessage.toLowerCase().includes('too many requests')) {
						// Re-throw with clear rate limiting indicator
						throw new Error(`429 Provider returned error: ${errorMessage}`);
					}
				} catch (errorParsingError) {
					errorMessage = "Error parsing failed - potential rate limiting or provider issue";
					// Re-throw as potential rate limiting error
					throw new Error(`429 Provider returned error: ${errorMessage}`);
				}
				
				console.warn("Function calling failed, falling back to JSON mode:", errorMessage);
				
				// First fallback: Try jsonMode
				try {
					const jsonModeModel = this.model.withStructuredOutput(
						FlexibleGoldenNuggetsSchema,
						{
							name: "extract_golden_nuggets",
							method: "jsonMode",
						},
					);

					// Enhanced prompt for JSON mode with explicit JSON instructions
					const enhancedPrompt = `${prompt}

CRITICAL: You MUST respond with valid JSON only. Use this exact format:
{
  "golden_nuggets": [
    {
      "type": "tool|media|explanation|analogy|model",
      "content": "Original text verbatim",
      "synthesis": "Why this is relevant"
    }
  ]
}

Ensure your response is valid JSON with no additional text.`;

					response = await jsonModeModel.invoke([
						new SystemMessage(enhancedPrompt),
						new HumanMessage(content),
					]);
					
					console.log("JSON mode succeeded for OpenRouter");
				} catch (jsonModeError) {
					// Defensive error handling for potentially malformed error objects
					let errorMessage = "Unknown error occurred";
					try {
						if (jsonModeError && typeof jsonModeError === 'object') {
							if (jsonModeError instanceof Error) {
								errorMessage = jsonModeError.message || errorMessage;
							} else if (jsonModeError.message) {
								errorMessage = String(jsonModeError.message);
							} else if (jsonModeError.error) {
								errorMessage = String(jsonModeError.error);
							} else {
								errorMessage = JSON.stringify(jsonModeError);
							}
						} else if (jsonModeError) {
							errorMessage = String(jsonModeError);
						}
						
						// Check if this looks like a rate limiting error
						if (errorMessage.toLowerCase().includes('429') || 
							errorMessage.toLowerCase().includes('rate limit') ||
							errorMessage.toLowerCase().includes('too many requests')) {
							// Re-throw with clear rate limiting indicator
							throw new Error(`429 Provider returned error: ${errorMessage}`);
						}
					} catch (errorParsingError) {
						errorMessage = "Error parsing failed - potential rate limiting or provider issue";
						// Re-throw as potential rate limiting error
						throw new Error(`429 Provider returned error: ${errorMessage}`);
					}
					
					console.warn("JSON mode failed, falling back to prompt engineering:", errorMessage);
					
					// Last resort: Use regular model with strict JSON prompt instructions
					const jsonPrompt = `${prompt}

CRITICAL INSTRUCTION: You MUST respond with valid JSON only. No explanations, no additional text.

Required JSON format:
{
  "golden_nuggets": [
    {
      "type": "tool|media|explanation|analogy|model", 
      "content": "Original text verbatim",
      "synthesis": "Why this is relevant"
    }
  ]
}

Content to analyze: ${content}

JSON Response:`;

					const rawResponse = await this.model.invoke([
						new SystemMessage("You are a JSON-only response assistant. Return valid JSON without any additional formatting or text."),
						new HumanMessage(jsonPrompt),
					]);

					// Parse the raw response as JSON
					const responseText = rawResponse.content.toString().trim();
					
					// Clean up common JSON formatting issues
					let cleanedJson = responseText;
					if (cleanedJson.startsWith("```json")) {
						cleanedJson = cleanedJson.replace(/```json/g, "").replace(/```/g, "").trim();
					}
					if (cleanedJson.startsWith("```")) {
						cleanedJson = cleanedJson.replace(/```/g, "").trim();
					}

					try {
						response = JSON.parse(cleanedJson);
						console.log("Prompt engineering fallback succeeded for OpenRouter");
					} catch (parseError) {
						console.error("Failed to parse JSON response:", cleanedJson);
						throw new Error(`Failed to parse structured response: ${parseError.message}`);
					}
				}
			}

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
			// Defensive error handling for potentially malformed error objects
			let errorMessage = "Unknown error occurred";
			try {
				if (error && typeof error === 'object') {
					if (error instanceof Error) {
						errorMessage = error.message || errorMessage;
					} else if (error.message) {
						errorMessage = String(error.message);
					} else if (error.error) {
						errorMessage = String(error.error);
					} else {
						errorMessage = JSON.stringify(error);
					}
				} else if (error) {
					errorMessage = String(error);
				}
			} catch (errorParsingError) {
				errorMessage = "Error parsing failed - potential provider issue";
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
