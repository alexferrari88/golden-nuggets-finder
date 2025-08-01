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
	): Promise<GoldenNuggetsResponse> {
		// Use existing GeminiClient implementation
		// The existing client already returns the correct format via analyzeContent
		const geminiResponse = await this.geminiClient.analyzeContent(
			content,
			prompt,
		);

		// Pass through the correct GeminiResponse format
		// The GeminiResponse uses startContent/endContent format which is the expected format
		return {
			golden_nuggets: geminiResponse.golden_nuggets.map((nugget) => ({
				type: nugget.type,
				startContent: nugget.startContent,
				endContent: nugget.endContent,
				synthesis: nugget.synthesis,
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
