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
			const message = error instanceof Error ? error.message : String(error);
			console.warn(`Gemini API key validation failed:`, message);
			return false;
		}
	}

	async extractPhase1HighRecall(
		content: string,
		prompt: string,
		temperature = 0.7,
		selectedTypes?: GoldenNuggetType[],
	): Promise<Phase1Response> {
		// Directly call the new GeminiClient Phase 1 method
		return this.geminiClient.extractPhase1HighRecall(
			content,
			prompt,
			temperature,
			selectedTypes,
			this.modelName,
		);
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
		// Directly call the new GeminiClient Phase 2 method
		return this.geminiClient.extractPhase2HighPrecision(
			content,
			prompt,
			nuggets,
			temperature,
			this.modelName,
		);
	}
}
