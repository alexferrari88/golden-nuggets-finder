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

// Phase 1: High Recall Schema with fullContent and confidence
export const PHASE_1_HIGH_RECALL_SCHEMA = {
	type: "object",
	properties: {
		golden_nuggets: {
			type: "array",
			description:
				"An array of extracted golden nuggets with full content and confidence scores.",
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
							"The complete verbatim content of the golden nugget, without any paraphrasing or modification.",
					},
					confidence: {
						type: "number",
						description:
							"Confidence score for this extraction, from 0.0 to 1.0.",
						minimum: 0,
						maximum: 1,
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

export function generatePhase1HighRecallSchema(
	selectedTypes: GoldenNuggetType[],
) {
	const properties: Record<string, any> = {
		type: {
			type: "string",
			description: "The category of the extracted golden nugget.",
			enum: selectedTypes.length > 0 ? selectedTypes : ALL_NUGGET_TYPES,
		},
		fullContent: {
			type: "string",
			description:
				"The complete verbatim content of the golden nugget, without any paraphrasing or modification.",
		},
		confidence: {
			type: "number",
			description: "Confidence score for this extraction, from 0.0 to 1.0.",
			minimum: 0,
			maximum: 1,
		},
	};

	const required = ["type", "fullContent", "confidence"];
	const propertyOrdering = ["type", "fullContent", "confidence"];

	return {
		type: "object",
		properties: {
			golden_nuggets: {
				type: "array",
				description:
					"An array of extracted golden nuggets with full content and confidence scores.",
				minItems: 0,
				items: {
					type: "object",
					properties,
					required: required,
					propertyOrdering: propertyOrdering,
				},
			},
		},
		required: ["golden_nuggets"],
		propertyOrdering: ["golden_nuggets"],
	};
}

// Gemini-specific schema functions using Gemini's uppercase type format

/**
 * Generate Gemini-specific Phase 1 schema for high recall extraction
 * Uses Gemini's structured output format with uppercase types (STRING, OBJECT, etc.)
 */
export function generateGeminiPhase1HighRecallSchema(
	selectedTypes: GoldenNuggetType[],
) {
	const properties: Record<string, any> = {
		type: {
			type: "STRING",
			description: "The category of the extracted golden nugget.",
			enum: selectedTypes.length > 0 ? selectedTypes : ALL_NUGGET_TYPES,
		},
		fullContent: {
			type: "STRING",
			description:
				"The complete verbatim content of the golden nugget, without any paraphrasing or modification.",
		},
		confidence: {
			type: "NUMBER",
			description: "Confidence score for this extraction, from 0.0 to 1.0.",
			minimum: 0,
			maximum: 1,
		},
	};

	const required = ["type", "fullContent", "confidence"];
	const propertyOrdering = ["type", "fullContent", "confidence"];

	return {
		type: "OBJECT",
		properties: {
			golden_nuggets: {
				type: "ARRAY",
				description:
					"An array of extracted golden nuggets with full content and confidence scores.",
				minItems: 0,
				items: {
					type: "OBJECT",
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
