import { GeminiClient } from "../../background/gemini-client";
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
	): Promise<GoldenNuggetsResponse> {
		// Use existing GeminiClient implementation
		const geminiResponse = await this.geminiClient.analyzeContent(
			content,
			prompt,
			undefined, // progressOptions
			temperature,
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
}
