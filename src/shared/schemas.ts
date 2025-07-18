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
					content: {
						type: "string",
						description:
							"The original comment(s) verbatim, without any changes to wording or symbols.",
					},
					synthesis: {
						type: "string",
						description:
							"A concise explanation of why this is relevant to the persona, connecting it to their core interests or cognitive profile.",
					},
				},
				required: ["type", "content", "synthesis"],
				propertyOrdering: ["type", "content", "synthesis"],
			},
		},
	},
	required: ["golden_nuggets"],
	propertyOrdering: ["golden_nuggets"],
} as const;

export function generateGoldenNuggetSchema(selectedTypes: GoldenNuggetType[]) {
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
							enum: selectedTypes.length > 0 ? selectedTypes : ALL_NUGGET_TYPES,
						},
						content: {
							type: "string",
							description:
								"The original comment(s) verbatim, without any changes to wording or symbols.",
						},
						synthesis: {
							type: "string",
							description:
								"A concise explanation of why this is relevant to the persona, connecting it to their core interests or cognitive profile.",
						},
					},
					required: ["type", "content", "synthesis"],
					propertyOrdering: ["type", "content", "synthesis"],
				},
			},
		},
		required: ["golden_nuggets"],
		propertyOrdering: ["golden_nuggets"],
	} as const;
}
