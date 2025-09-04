import type {
	GoldenNuggetsResponse,
	LLMProvider,
	ProviderConfig,
} from "../interfaces/providers";
import type { GoldenNuggetType } from "../schemas";

export class GeminiDirectProvider implements LLMProvider {
	readonly providerId = "gemini" as const;
	readonly modelName: string;
	private readonly API_BASE_URL =
		"https://generativelanguage.googleapis.com/v1beta/models";

	constructor(private config: ProviderConfig) {
		this.modelName = config.modelName || "gemini-2.5-flash-lite";
	}

	private generateSchema(selectedTypes?: GoldenNuggetType[]) {
		const allowedTypes =
			selectedTypes && selectedTypes.length > 0
				? selectedTypes
				: ["tool", "media", "aha! moments", "analogy", "model"];

		return {
			type: "object",
			properties: {
				golden_nuggets: {
					type: "array",
					description: "An array of extracted golden nuggets.",
					minItems: 0,
					items: {
						type: "object",
						properties: {
							type: {
								type: "string",
								description: "The category of the extracted golden nugget.",
								enum: allowedTypes,
							},
							fullContent: {
								type: "string",
								description:
									"Complete verbatim text of the golden nugget from the original content",
							},
							confidence: {
								type: "number",
								description:
									"Confidence score from 0.0 to 1.0 for this extraction",
								minimum: 0.0,
								maximum: 1.0,
							},
						},
						required: ["type", "fullContent", "confidence"],
						propertyOrdering: ["type", "fullContent", "confidence"],
					},
				},
			},
			required: ["golden_nuggets"],
			propertyOrdering: ["golden_nuggets"],
		};
	}

	async extractGoldenNuggets(
		content: string,
		prompt: string,
		temperature?: number,
		selectedTypes?: GoldenNuggetType[],
	): Promise<GoldenNuggetsResponse> {
		try {
			const effectiveTemperature = temperature ?? 0.7;
			const schema = this.generateSchema(selectedTypes);

			const requestBody = {
				contents: [
					{
						parts: [
							{
								text: `${prompt}\n\nContent to analyze:\n${content}`,
							},
						],
					},
				],
				generationConfig: {
					temperature: effectiveTemperature,
					topK: 64,
					topP: 0.95,
					maxOutputTokens: 8192,
					responseMimeType: "application/json",
					responseSchema: schema,
				},
				systemInstruction: {
					parts: [
						{
							text: "You are an AI assistant that extracts golden nuggets from content. Always respond with valid JSON matching the provided schema. Extract complete, verbatim text for each nugget and assign confidence scores based on how valuable and actionable the content is.",
						},
					],
				},
				safetySettings: [
					{
						category: "HARM_CATEGORY_HARASSMENT",
						threshold: "BLOCK_MEDIUM_AND_ABOVE",
					},
					{
						category: "HARM_CATEGORY_HATE_SPEECH",
						threshold: "BLOCK_MEDIUM_AND_ABOVE",
					},
					{
						category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
						threshold: "BLOCK_MEDIUM_AND_ABOVE",
					},
					{
						category: "HARM_CATEGORY_DANGEROUS_CONTENT",
						threshold: "BLOCK_MEDIUM_AND_ABOVE",
					},
				],
			};

			const url = `${this.API_BASE_URL}/${this.modelName}:generateContent?key=${this.config.apiKey}`;

			const response = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(requestBody),
			});

			if (!response.ok) {
				const errorData = await response.text();
				throw new Error(`Gemini API error (${response.status}): ${errorData}`);
			}

			const data = await response.json();

			// Extract content from Gemini's response structure
			if (!data.candidates || data.candidates.length === 0) {
				throw new Error("No candidates in Gemini response");
			}

			const candidate = data.candidates[0];
			if (
				!candidate.content ||
				!candidate.content.parts ||
				candidate.content.parts.length === 0
			) {
				throw new Error("No content in Gemini response");
			}

			const responseText = candidate.content.parts[0].text;
			let parsedResponse: any;

			try {
				parsedResponse = JSON.parse(responseText);
			} catch (_parseError) {
				throw new Error(
					`Failed to parse Gemini JSON response: ${responseText}`,
				);
			}

			// Normalize response to ensure canonical types
			const normalizedResponse: GoldenNuggetsResponse = {
				golden_nuggets: (parsedResponse.golden_nuggets || []).map(
					(nugget: any) => {
						let normalizedType: GoldenNuggetType;

						// Normalize type variations to canonical forms
						switch (nugget.type?.toLowerCase()) {
							case "mental model":
							case "mental_model":
							case "model":
							case "models":
							case "framework":
								normalizedType = "model";
								break;
							case "aha!_moments":
							case "aha! moments":
							case "insight":
							case "insights":
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
							fullContent: nugget.fullContent || "",
							confidence: Math.min(
								Math.max(nugget.confidence || 0.8, 0.0),
								1.0,
							), // Ensure 0.0-1.0 range
							extractionMethod: "llm" as const,
						};
					},
				),
			};

			return normalizedResponse;
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			throw new Error(`Gemini API call failed: ${message}`);
		}
	}

	async validateApiKey(): Promise<boolean> {
		try {
			const url = `${this.API_BASE_URL}?key=${this.config.apiKey}`;
			const response = await fetch(url);

			// A 200 response means the API key is valid
			return response.ok;
		} catch (_error) {
			return false;
		}
	}
}
