import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
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
				}),
			),
		});
	} else {
		return z.object({
			golden_nuggets: z.array(baseSchema),
		});
	}
};

export class LangChainOpenAIProvider implements LLMProvider {
	readonly providerId = "openai" as const;
	readonly modelName: string;
	private model: ChatOpenAI;

	constructor(private config: ProviderConfig) {
		this.modelName = config.modelName || "gpt-4.1-mini";
		this.model = new ChatOpenAI({
			apiKey: config.apiKey,
			model: this.modelName,
			temperature: 0, // Consistent output
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
				`https://api.openai.com/v1/chat/completions (${this.modelName})`,
				{
					model: this.modelName,
					messages: [
						{ role: "system", content: prompt },
						{ role: "user", content: `${content.substring(0, 500)}...` }, // Truncate for logging
					],
					provider: "openai",
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
					provider: "openai",
					model: this.modelName,
					success: true,
				},
				response,
			);

			return response as GoldenNuggetsResponse;
		} catch (error) {
			// Log the error
			debugLogger.logLLMResponse({
				provider: "openai",
				model: this.modelName,
				success: false,
				error: error.message,
			});

			console.error(`OpenAI provider error:`, error);
			throw new Error(`OpenAI API call failed: ${error.message}`);
		}
	}

	async validateApiKey(): Promise<boolean> {
		try {
			const response = await fetch("https://api.openai.com/v1/models", {
				headers: {
					Authorization: `Bearer ${this.config.apiKey}`,
				},
			});
			return response.ok; // 200 = valid, 401 = invalid key
		} catch (error) {
			console.warn(`OpenAI API key validation failed:`, error.message);
			return false;
		}
	}
}
