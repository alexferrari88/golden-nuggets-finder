import { z } from "zod";
import type {
	GoldenNuggetsResponse,
	ProviderId,
} from "../../shared/types/providers";

// Types for raw API responses that need normalization
type RawGoldenNugget = {
	type: string;
	fullContent?: unknown;
	confidence?: unknown;
	validationScore?: unknown;
	extractionMethod?: unknown;
	[key: string]: unknown;
};

type RawApiResponse =
	| {
			golden_nuggets?: RawGoldenNugget[];
			[key: string]: unknown;
	  }
	| unknown;

const GoldenNuggetsSchema = z.object({
	golden_nuggets: z.array(
		z.object({
			type: z.enum(["tool", "media", "aha! moments", "analogy", "model"]),
			fullContent: z.string(),
			confidence: z.number().optional(),
			validationScore: z.number().optional(),
			extractionMethod: z.string().optional(),
		}),
	),
});

export function normalize(
	response: RawApiResponse,
	providerId: ProviderId,
): GoldenNuggetsResponse {
	try {
		// Pre-process response to convert non-string values before validation
		const preprocessed = preprocessResponse(response);

		// Validate response structure
		const validated = GoldenNuggetsSchema.parse(preprocessed);

		// Ensure fullContent is a string and non-empty
		const normalized: GoldenNuggetsResponse = {
			golden_nuggets: validated.golden_nuggets
				.map((nugget) => ({
					type: normalizeType(nugget.type),
					fullContent: String(nugget.fullContent || "").trim(),
					confidence: nugget.confidence || 0.0,
					validationScore: nugget.validationScore,
					extractionMethod: normalizeExtractionMethod(nugget.extractionMethod),
				}))
				.filter((nugget) => {
					// Strictly require non-empty fullContent
					return nugget.fullContent && nugget.fullContent.trim().length > 0;
				}),
		};

		return normalized;
	} catch (error) {
		console.error(`Response normalization failed for ${providerId}:`, error);
		console.error("Raw response:", response);

		// Return empty response rather than throwing
		return { golden_nuggets: [] };
	}
}

function preprocessResponse(response: RawApiResponse): {
	golden_nuggets: RawGoldenNugget[];
} {
	if (!response || typeof response !== "object" || response === null) {
		return { golden_nuggets: [] };
	}

	const responseObj = response as {
		golden_nuggets?: unknown;
		[key: string]: unknown;
	};
	if (!Array.isArray(responseObj.golden_nuggets)) {
		return { golden_nuggets: [] };
	}

	return {
		golden_nuggets: responseObj.golden_nuggets.map((nugget: unknown) => {
			const nuggetObj = nugget as RawGoldenNugget;

			// Enforce fullContent-only architecture - NO legacy fallbacks
			const fullContent = String(nuggetObj?.fullContent || "").trim();

			return {
				type: String(nuggetObj?.type || ""),
				fullContent,
				confidence:
					typeof nuggetObj?.confidence === "number"
						? nuggetObj.confidence
						: 0.0,
				validationScore:
					typeof nuggetObj?.validationScore === "number"
						? nuggetObj.validationScore
						: undefined,
				extractionMethod: nuggetObj?.extractionMethod
					? String(nuggetObj.extractionMethod)
					: "llm",
			};
		}),
	};
}

function normalizeType(
	type: string,
): "tool" | "media" | "aha! moments" | "analogy" | "model" {
	// Handle common variations that different models might return
	const typeMap: Record<
		string,
		"tool" | "media" | "aha! moments" | "analogy" | "model"
	> = {
		"mental model": "model",
		mental_model: "model",
		framework: "model",
		technique: "tool",
		method: "tool",
		resource: "media",
		book: "media",
		article: "media",
		concept: "aha! moments",
		comparison: "analogy",
		metaphor: "analogy",
	};

	const normalized = typeMap[type.toLowerCase()] || type;

	// Validate against allowed types
	const allowedTypes = ["tool", "media", "aha! moments", "analogy", "model"];
	return allowedTypes.includes(normalized)
		? (normalized as "tool" | "media" | "aha! moments" | "analogy" | "model")
		: "aha! moments";
}

function normalizeExtractionMethod(
	method: unknown,
): "validated" | "unverified" | "fuzzy" | "llm" | "ensemble" | undefined {
	if (!method || typeof method !== "string") {
		return undefined;
	}

	const normalized = method.toLowerCase();
	const allowedMethods = [
		"validated",
		"unverified",
		"fuzzy",
		"llm",
		"ensemble",
	];

	return allowedMethods.includes(normalized)
		? (normalized as "validated" | "unverified" | "fuzzy" | "llm" | "ensemble")
		: undefined;
}

export function validate(response: RawApiResponse): boolean {
	try {
		GoldenNuggetsSchema.parse(response);
		return true;
	} catch {
		return false;
	}
}
