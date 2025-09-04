import { ChatAnthropic } from "@langchain/anthropic";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
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

			const structuredModel = model.withStructuredOutput(GoldenNuggetsSchema, {
				name: "extract_golden_nuggets",
				method: "functionCalling",
			});

			const response = await structuredModel.invoke([
				new SystemMessage(prompt),
				new HumanMessage(content),
			]);

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
			const message = error instanceof Error ? error.message : String(error);
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
		} catch (_error) {
			return false;
		}
	}
}
