import { z } from "zod";
import type {
	GoldenNuggetsResponse,
	ProviderId,
} from "../../shared/types/providers";

// Types for raw API responses that need normalization
type RawGoldenNugget = {
	type: string;
	startContent?: unknown;
	endContent?: unknown;
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
			startContent: z.string(),
			endContent: z.string(),
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

		// Ensure startContent and endContent are strings and non-empty
		const normalized = {
			golden_nuggets: validated.golden_nuggets
				.map((nugget) => ({
					type: normalizeType(nugget.type),
					startContent: String(nugget.startContent).trim(),
					endContent: String(nugget.endContent).trim(),
				}))
				.filter((nugget) => {
					// Require startContent and endContent
					return nugget.startContent && nugget.endContent;
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

			// Handle both new format (startContent/endContent) and legacy format (content)
			let startContent = String(nuggetObj?.startContent || "");
			let endContent = String(nuggetObj?.endContent || "");

			// Handle legacy format fallback more intelligently
			if (nuggetObj?.content) {
				const contentStr = String(nuggetObj.content);

				// Only use content as fallback when BOTH startContent AND endContent are missing
				// This prevents losing precise boundary information when only one field is missing
				if (!startContent && !endContent) {
					// Legacy format: use full content for both boundaries (expected behavior)
					startContent = contentStr;
					endContent = contentStr;
					console.warn(
						`[ResponseNormalizer] Using legacy content format for nugget type: ${nuggetObj?.type}`,
					);
				} else if (!startContent && endContent) {
					// Only startContent is missing: try to extract it from the beginning of content
					startContent = contentStr.substring(
						0,
						Math.min(100, contentStr.length),
					);
					console.warn(
						`[ResponseNormalizer] Reconstructed startContent from legacy content for nugget type: ${nuggetObj?.type}`,
					);
				} else if (startContent && !endContent) {
					// Only endContent is missing: try to extract it from the end of content
					endContent = contentStr.substring(
						Math.max(0, contentStr.length - 100),
					);
					console.warn(
						`[ResponseNormalizer] Reconstructed endContent from legacy content for nugget type: ${nuggetObj?.type}`,
					);
				}
			}

			return {
				type: String(nuggetObj?.type || ""),
				startContent,
				endContent,
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

export function validate(response: RawApiResponse): boolean {
	try {
		GoldenNuggetsSchema.parse(response);
		return true;
	} catch {
		return false;
	}
}
