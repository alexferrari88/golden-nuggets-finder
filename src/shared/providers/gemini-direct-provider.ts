import { GeminiClient } from "../../background/gemini-client";
import type { GoldenNuggetType } from "../schemas";
import type {
	GoldenNuggetsResponse,
	LLMProvider,
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
		_selectedTypes?: GoldenNuggetType[],
	): Promise<GoldenNuggetsResponse> {
		// Use GeminiClient with fullContent approach
		const geminiResponse = await this.geminiClient.analyzeContent(
			content,
			prompt,
			undefined, // progressOptions
			temperature || 0.7,
			this.modelName,
		);

		// Return fullContent format with confidence scoring
		return {
			golden_nuggets: geminiResponse.golden_nuggets.map((nugget) => ({
				type: nugget.type,
				fullContent: nugget.fullContent,
				confidence: nugget.confidence || 0.8,
				validationScore: nugget.validationScore,
				extractionMethod: nugget.extractionMethod || "validated",
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
}
