import { ChatAnthropic } from "@langchain/anthropic";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import { debugLogger } from "../debug";
import type { GoldenNuggetType } from "../schemas";
import type {
	GoldenNuggetsResponse,
	LLMProvider,
	ProviderConfig,
} from "../types/providers";

// Schema definition for golden nuggets with fullContent approach
const GoldenNuggetsSchema = z.object({
	golden_nuggets: z.array(
		z.object({
			type: z.enum(["tool", "media", "aha! moments", "analogy", "model"]),
			fullContent: z.string(),
			confidence: z.number().min(0).max(1),
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
			temperature: 0.2,
		});
	}

	async extractGoldenNuggets(
		content: string,
		prompt: string,
		temperature?: number,
		_selectedTypes?: GoldenNuggetType[],
	): Promise<GoldenNuggetsResponse> {
		try {
			// Use provided temperature or fallback to default (0.2)
			const effectiveTemperature = temperature ?? 0.2;

			// Create model with specified temperature
			const model =
				temperature !== undefined
					? new ChatAnthropic({
							apiKey: this.config.apiKey,
							model: this.modelName,
							temperature: effectiveTemperature,
						})
					: this.model;

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
					temperature: effectiveTemperature,
				},
			);

			const structuredModel = model.withStructuredOutput(GoldenNuggetsSchema, {
				name: "extract_golden_nuggets",
				method: "functionCalling",
			});

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

			// Transform response to include required fields
			return {
				golden_nuggets: response.golden_nuggets.map((nugget) => ({
					type: nugget.type,
					fullContent: nugget.fullContent,
					confidence: nugget.confidence,
					validationScore: nugget.confidence, // Use confidence as validation score
					extractionMethod: "validated" as const,
				})),
			};
		} catch (error) {
			// Log the error
			const message = error instanceof Error ? error.message : String(error);
			debugLogger.logLLMResponse({
				provider: "anthropic",
				model: this.modelName,
				success: false,
				error: message,
			});

			console.error(`Anthropic provider error:`, error);
			throw new Error(`Anthropic API call failed: ${message}`);
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
			console.warn(
				`Anthropic API key validation failed:`,
				error instanceof Error ? error.message : String(error),
			);
			return false;
		}
	}
}
