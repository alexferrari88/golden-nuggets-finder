import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { debugLogger } from "../debug";
import type { GoldenNuggetType } from "../schemas";
import type {
	GoldenNuggetsResponse,
	LLMProvider,
	Phase1Response,
	Phase2Response,
	ProviderConfig,
} from "../types/providers";

// Schema definition for golden nuggets (synthesis removed)
const GoldenNuggetsSchema = z.object({
	golden_nuggets: z.array(
		z.object({
			type: z.enum(["tool", "media", "aha! moments", "analogy", "model"]),
			startContent: z.string(),
			endContent: z.string(),
		}),
	),
});

export class LangChainOpenAIProvider implements LLMProvider {
	readonly providerId = "openai" as const;
	readonly modelName: string;
	private model: ChatOpenAI;

	constructor(private config: ProviderConfig) {
		this.modelName = config.modelName || "gpt-5-mini";
		this.model = new ChatOpenAI({
			apiKey: config.apiKey,
			model: this.modelName,
			temperature: 0.2, // Consistent output
		});
	}

	async extractGoldenNuggets(
		content: string,
		prompt: string,
		temperature?: number,
	): Promise<GoldenNuggetsResponse> {
		try {
			// Use provided temperature or fallback to default (0.2)
			const effectiveTemperature = temperature ?? 0.2;

			// Create model with specified temperature
			const model =
				temperature !== undefined
					? new ChatOpenAI({
							apiKey: this.config.apiKey,
							model: this.modelName,
							temperature: effectiveTemperature,
						})
					: this.model;

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
				error: error instanceof Error ? error.message : String(error),
			});

			const message = error instanceof Error ? error.message : String(error);
			console.error(`OpenAI provider error:`, error);
			throw new Error(`OpenAI API call failed: ${message}`);
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
			console.warn(`OpenAI API key validation failed:`, error instanceof Error ? error.message : String(error));
			return false;
		}
	}

	async extractPhase1HighRecall(
		content: string,
		prompt: string,
		temperature = 0.7,
		_selectedTypes?: GoldenNuggetType[],
	): Promise<Phase1Response> {
		try {
			// Create Phase 1 schema for high recall extraction
			const Phase1Schema = z.object({
				golden_nuggets: z.array(
					z.object({
						type: z.enum(["tool", "media", "aha! moments", "analogy", "model"]),
						fullContent: z.string(),
						confidence: z.number().min(0).max(1),
					}),
				),
			});

			// Create model with Phase 1 temperature (high recall)
			const model = new ChatOpenAI({
				apiKey: this.config.apiKey,
				model: this.modelName,
				temperature: temperature,
			});

			// Log the request
			debugLogger.logLLMRequest(
				`https://api.openai.com/v1/chat/completions (${this.modelName}) - Phase 1`,
				{
					model: this.modelName,
					messages: [
						{ role: "system", content: prompt },
						{ role: "user", content: `${content.substring(0, 500)}...` },
					],
					provider: "openai",
					temperature: temperature,
					phase: "1-high-recall",
				},
			);

			const structuredModel = model.withStructuredOutput(Phase1Schema, {
				name: "extract_golden_nuggets_phase1",
				method: "functionCalling",
			});

			const response = await structuredModel.invoke([
				new SystemMessage(prompt),
				new HumanMessage(content),
			]);

			// Log the response
			debugLogger.logLLMResponse({
				provider: "openai",
				model: this.modelName,
				phase: "1-high-recall",
				success: true,
			});

			return response as Phase1Response;
		} catch (error) {
			// Log the error
			debugLogger.logLLMResponse({
				provider: "openai",
				model: this.modelName,
				phase: "1-high-recall",
				success: false,
				error: error instanceof Error ? error.message : String(error),
			});

			console.error(`OpenAI Phase 1 provider error:`, error);
			const message = error instanceof Error ? error.message : String(error);
			throw new Error(`OpenAI Phase 1 API call failed: ${message}`);
		}
	}

	async extractPhase2HighPrecision(
		content: string,
		prompt: string,
		nuggets: Array<{
			type: GoldenNuggetType;
			fullContent: string;
			confidence: number;
		}>,
		temperature = 0.0,
	): Promise<Phase2Response> {
		try {
			// Create Phase 2 schema for boundary detection
			const Phase2Schema = z.object({
				golden_nuggets: z.array(
					z.object({
						type: z.enum(["tool", "media", "aha! moments", "analogy", "model"]),
						startContent: z.string(),
						endContent: z.string(),
						confidence: z.number().min(0).max(1),
					}),
				),
			});

			// Create model with Phase 2 temperature (high precision)
			const model = new ChatOpenAI({
				apiKey: this.config.apiKey,
				model: this.modelName,
				temperature: temperature,
			});

			// Build the Phase 2 prompt with nuggets context
			const nuggetsList = nuggets
				.map(
					(nugget, index) =>
						`${index + 1}. Type: ${nugget.type}\n   Content: "${nugget.fullContent}"\n   Confidence: ${nugget.confidence}`,
				)
				.join("\n\n");

			const phase2PromptWithContext = `${prompt}\n\nNUGGETS TO PROCESS:\n${nuggetsList}\n\nORIGINAL CONTENT:\n${content}`;

			// Log the request
			debugLogger.logLLMRequest(
				`https://api.openai.com/v1/chat/completions (${this.modelName}) - Phase 2`,
				{
					model: this.modelName,
					messages: [
						{ role: "system", content: phase2PromptWithContext },
						{ role: "user", content: `${content.substring(0, 500)}...` },
					],
					provider: "openai",
					temperature: temperature,
					phase: "2-high-precision",
					nuggetCount: nuggets.length,
				},
			);

			const structuredModel = model.withStructuredOutput(Phase2Schema, {
				name: "extract_golden_nuggets_phase2",
				method: "functionCalling",
			});

			const response = await structuredModel.invoke([
				new SystemMessage(phase2PromptWithContext),
				new HumanMessage(content),
			]);

			// Log the response
			debugLogger.logLLMResponse({
				provider: "openai",
				model: this.modelName,
				phase: "2-high-precision",
				success: true,
			});

			return response as Phase2Response;
		} catch (error) {
			// Log the error
			debugLogger.logLLMResponse({
				provider: "openai",
				model: this.modelName,
				phase: "2-high-precision",
				success: false,
				error: error instanceof Error ? error.message : String(error),
			});

			console.error(`OpenAI Phase 2 provider error:`, error);
			const message = error instanceof Error ? error.message : String(error);
			throw new Error(`OpenAI Phase 2 API call failed: ${message}`);
		}
	}
}
