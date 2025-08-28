import { GeminiClient } from "../../background/gemini-client";
import type { GoldenNuggetType } from "../schemas";
import type {
	GoldenNuggetsResponse,
	LLMProvider,
	Phase1Response,
	Phase2Response,
	ProviderConfig,
} from "../types/providers";

export class GeminiDirectProvider implements LLMProvider {
	readonly providerId = "gemini" as const;
	readonly modelName: string;
	private geminiClient: GeminiClient;

	constructor(private config: ProviderConfig) {
		this.modelName = config.modelName || "gemini-2.5-flash";
		this.geminiClient = new GeminiClient();
	}

	async extractGoldenNuggets(
		content: string,
		prompt: string,
		temperature?: number,
	): Promise<GoldenNuggetsResponse> {
		// Use existing GeminiClient implementation with the selected model
		const geminiResponse = await this.geminiClient.analyzeContent(
			content,
			prompt,
			undefined, // progressOptions
			temperature,
			this.modelName, // Pass the correct model name
		);

		// Pass through the correct GeminiResponse format without synthesis
		return {
			golden_nuggets: geminiResponse.golden_nuggets.map((nugget) => ({
				type: nugget.type,
				startContent: nugget.startContent,
				endContent: nugget.endContent,
			})),
		};
	}

	async validateApiKey(): Promise<boolean> {
		try {
			// Use existing GeminiClient validation method
			return await this.geminiClient.validateApiKey(this.config.apiKey);
		} catch (error) {
			console.warn(`Gemini API key validation failed:`, error.message);
			return false;
		}
	}

	async extractPhase1HighRecall(
		content: string,
		prompt: string,
		temperature = 0.7,
		selectedTypes?: GoldenNuggetType[],
	): Promise<Phase1Response> {
		// Use Phase 1 schema for high recall extraction
		const phase1Schema = await import("../schemas").then((m) =>
			m.generatePhase1HighRecallSchema(selectedTypes || []),
		);

		const geminiResponse = await this.geminiClient.analyzeContent(
			content,
			prompt,
			{ responseSchema: phase1Schema }, // Use Phase 1 schema
			temperature,
			this.modelName,
		);

		// Convert from Gemini format to Phase1Response format
		return {
			golden_nuggets: geminiResponse.golden_nuggets.map((nugget) => ({
				type: nugget.type as GoldenNuggetType,
				// For Phase 1, we need fullContent. Since Gemini returns startContent/endContent,
				// we reconstruct the full content. This is a temporary solution until we can
				// modify the Gemini client to support Phase 1 schema directly.
				fullContent: `${nugget.startContent} ... ${nugget.endContent}`,
				// Assign a default confidence score since current Gemini client doesn't return this
				// TODO: Modify GeminiClient to support confidence scores in responses
				confidence: 0.8,
			})),
		};
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
		// Use Phase 2 schema for boundary detection
		const phase2Schema = await import("../schemas").then((m) =>
			m.generatePhase2HighPrecisionSchema([]),
		);

		// Build the Phase 2 prompt with nuggets context
		const nuggetsList = nuggets
			.map(
				(nugget, index) =>
					`${index + 1}. Type: ${nugget.type}\n   Content: "${nugget.fullContent}"\n   Confidence: ${nugget.confidence}`,
			)
			.join("\n\n");

		const phase2PromptWithContext = `${prompt}\n\nNUGGETS TO PROCESS:\n${nuggetsList}\n\nORIGINAL CONTENT:\n${content}`;

		const geminiResponse = await this.geminiClient.analyzeContent(
			content,
			phase2PromptWithContext,
			{ responseSchema: phase2Schema }, // Use Phase 2 schema
			temperature,
			this.modelName,
		);

		// Convert from Gemini format to Phase2Response format
		return {
			golden_nuggets: geminiResponse.golden_nuggets.map((nugget) => ({
				type: nugget.type as GoldenNuggetType,
				startContent: nugget.startContent,
				endContent: nugget.endContent,
				// Assign confidence from original nugget or default
				confidence:
					nuggets.find((n) => n.type === nugget.type)?.confidence || 0.7,
			})),
		};
	}
}
