import { ChatAnthropic } from "@langchain/anthropic";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import type {
	GoldenNuggetsResponse,
	LLMProvider,
	ProviderConfig,
} from "../types/providers";

const GoldenNuggetsSchema = z.object({
	golden_nuggets: z.array(
		z.object({
			type: z.enum(["tool", "media", "explanation", "analogy", "model"]),
			content: z.string(),
			synthesis: z.string(),
		}),
	),
});

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
