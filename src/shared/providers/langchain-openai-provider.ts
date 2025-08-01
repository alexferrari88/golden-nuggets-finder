import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import type {
	GoldenNuggetsResponse,
	LLMProvider,
	ProviderConfig,
} from "../types/providers";

// Zod schema for golden nuggets (matches existing format)
const GoldenNuggetsSchema = z.object({
	golden_nuggets: z.array(
		z.object({
			type: z.enum(["tool", "media", "explanation", "analogy", "model"]),
			content: z.string(),
			synthesis: z.string(),
		}),
	),
});

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
	): Promise<GoldenNuggetsResponse> {
		try {
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

			return response as GoldenNuggetsResponse;
		} catch (error) {
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
