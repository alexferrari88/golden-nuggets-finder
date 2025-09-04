export type GoldenNuggetType =
	| "tool"
	| "media"
	| "aha! moments"
	| "analogy"
	| "model";

export const ALL_NUGGET_TYPES: GoldenNuggetType[] = [
	"tool",
	"media",
	"aha! moments",
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
						enum: ["tool", "media", "aha! moments", "analogy", "model"],
					},
					fullContent: {
						type: "string",
						description:
							"Complete verbatim text of the golden nugget from the original content",
					},
					confidence: {
						type: "number",
						description: "Confidence score from 0.0 to 1.0 for this extraction",
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

export function generateFullContentSchema(selectedTypes: GoldenNuggetType[]) {
	const properties: Record<string, any> = {
		type: {
			type: "string",
			description: "The category of the extracted golden nugget.",
			enum: selectedTypes.length > 0 ? selectedTypes : ALL_NUGGET_TYPES,
		},
		fullContent: {
			type: "string",
			description:
				"Complete verbatim text of the golden nugget from the original content",
		},
		confidence: {
			type: "number",
			description: "Confidence score from 0.0 to 1.0 for this extraction",
			minimum: 0.0,
			maximum: 1.0,
		},
	};

	const required = ["type", "fullContent", "confidence"];
	const propertyOrdering = ["type", "fullContent", "confidence"];

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
	};
}

// Legacy function name for backward compatibility
export function generateGoldenNuggetSchema(selectedTypes: GoldenNuggetType[]) {
	return generateFullContentSchema(selectedTypes);
}
