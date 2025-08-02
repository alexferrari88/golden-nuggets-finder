import { ChatAnthropic } from "@langchain/anthropic";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import { debugLogger } from "../debug";
import type {
	GoldenNuggetsResponse,
	LLMProvider,
	ProviderConfig,
} from "../types/providers";

// Conditional schema generation function
const createGoldenNuggetsSchema = (synthesisEnabled: boolean) => {
	const baseSchema = z.object({
		type: z.enum(["tool", "media", "explanation", "analogy", "model"]),
		startContent: z.string(),
		endContent: z.string(),
	});

	if (synthesisEnabled) {
		return z.object({
			golden_nuggets: z.array(
				baseSchema.extend({
					synthesis: z.string(),
				})
			),
		});
	} else {
		return z.object({
			golden_nuggets: z.array(baseSchema),
		});
	}
};

export class LangChainAnthropicProvider implements LLMProvider {
	readonly providerId = "anthropic" as const;
	readonly modelName: string;
	private model: ChatAnthropic;

	constructor(private config: ProviderConfig) {
		this.modelName = config.modelName || "claude-3-5-haiku-latest";
		this.model = new ChatAnthropic({
			apiKey: config.apiKey,
			model: this.modelName,
			temperature: 0,
		});
	}

	async extractGoldenNuggets(
		content: string,
		prompt: string,
		synthesisEnabled: boolean = true, // Default true for backwards compatibility
	): Promise<GoldenNuggetsResponse> {
		try {
			// Log the request
			debugLogger.logLLMRequest(
				`https://api.anthropic.com/v1/messages (${this.modelName})`,
				{
					model: this.modelName,
					messages: [
						{ role: "system", content: prompt },
						{ role: "user", content: `${content.substring(0, 500)}...` }, // Truncate for logging
					],
					provider: "anthropic",
				},
			);

			const GoldenNuggetsSchema = createGoldenNuggetsSchema(synthesisEnabled);
			
			const structuredModel = this.model.withStructuredOutput(
				GoldenNuggetsSchema,
				{
					name: "extract_golden_nuggets",
					method: "functionCalling",
				},
			);

			const response = await structuredModel.invoke([
				new SystemMessage(prompt),
				new HumanMessage(content),
			]);

			// Log the response
			debugLogger.logLLMResponse(
				{
					provider: "anthropic",
					model: this.modelName,
					success: true,
				},
				response,
			);

			return response as GoldenNuggetsResponse;
		} catch (error) {
			// Log the error
			debugLogger.logLLMResponse({
				provider: "anthropic",
				model: this.modelName,
				success: false,
				error: error.message,
			});

			console.error(`Anthropic provider error:`, error);
			throw new Error(`Anthropic API call failed: ${error.message}`);
		}
	}

	async validateApiKey(): Promise<boolean> {
		try {
			const response = await fetch("https://api.anthropic.com/v1/models", {
				headers: {
					"x-api-key": this.config.apiKey,
					"anthropic-version": "2023-06-01",
				},
			});
			return response.ok; // 200 = valid, 401 = invalid key
		} catch (error) {
			console.warn(`Anthropic API key validation failed:`, error.message);
			return false;
		}
	}
}
