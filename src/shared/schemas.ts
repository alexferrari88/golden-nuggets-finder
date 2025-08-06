export type GoldenNuggetType =
	| "tool"
	| "media"
	| "explanation"
	| "analogy"
	| "model";

export const ALL_NUGGET_TYPES: GoldenNuggetType[] = [
	"tool",
	"media",
	"explanation",
	"analogy",
	"model",
];

export const GOLDEN_NUGGET_SCHEMA = {
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
						enum: ["tool", "media", "explanation", "analogy", "model"],
					},
					startContent: {
						type: "string",
						description:
							"The first few words (max 5) of the original content verbatim, without any changes to wording or symbols.",
					},
					endContent: {
						type: "string",
						description:
							"The last few words (max 5) of the original content verbatim, without any changes to wording or symbols.",
					},
					synthesis: {
						type: "string",
						description:
							"A concise explanation of why this is relevant to the persona, connecting it to their core interests or cognitive profile.",
					},
				},
				required: ["type", "startContent", "endContent"],
				propertyOrdering: ["type", "startContent", "endContent", "synthesis"],
			},
		},
	},
	required: ["golden_nuggets"],
	propertyOrdering: ["golden_nuggets"],
} as const;

export function generateGoldenNuggetSchema(
	selectedTypes: GoldenNuggetType[],
	includeSynthesis: boolean = true, // Default true for backwards compatibility
) {
	const properties: Record<string, any> = {
		type: {
			type: "string",
			description: "The category of the extracted golden nugget.",
			enum: selectedTypes.length > 0 ? selectedTypes : ALL_NUGGET_TYPES,
		},
		startContent: {
			type: "string",
			description:
				"The first few words (max 5) of the original content verbatim, without any changes to wording or symbols.",
		},
		endContent: {
			type: "string",
			description:
				"The last few words (max 5) of the original content verbatim, without any changes to wording or symbols.",
		},
	};

	const required = ["type", "startContent", "endContent"];
	const propertyOrdering = ["type", "startContent", "endContent"];

	if (includeSynthesis) {
		properties.synthesis = {
			type: "string",
			description:
				"A concise explanation of why this is relevant to the persona, connecting it to their core interests or cognitive profile.",
		};
		required.push("synthesis");
		propertyOrdering.push("synthesis");
	}

	return {
		type: "object",
		properties: {
			golden_nuggets: {
				type: "array",
				description: "An array of extracted golden nuggets.",
				minItems: 0,
				items: {
					type: "object",
					properties,
					required,
					propertyOrdering,
				},
			},
		},
		required: ["golden_nuggets"],
		propertyOrdering: ["golden_nuggets"],
	} as const;
}
