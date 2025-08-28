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
				},
				required: ["type", "startContent", "endContent"],
				propertyOrdering: ["type", "startContent", "endContent"],
			},
		},
	},
	required: ["golden_nuggets"],
	propertyOrdering: ["golden_nuggets"],
} as const;

export function generateGoldenNuggetSchema(selectedTypes: GoldenNuggetType[]) {
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
} as const;

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
					required,
					propertyOrdering,
				},
			},
		},
		required: ["golden_nuggets"],
		propertyOrdering: ["golden_nuggets"],
	} as const;
}

// Phase 2: High Precision Schema for boundary detection
export const PHASE_2_HIGH_PRECISION_SCHEMA = {
	type: "object",
	properties: {
		golden_nuggets: {
			type: "array",
			description:
				"An array of golden nuggets with precise start and end boundaries.",
			minItems: 0,
			items: {
				type: "object",
				properties: {
					type: {
						type: "string",
						description: "The category of the extracted golden nugget.",
						enum: ["tool", "media", "aha! moments", "analogy", "model"],
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
					confidence: {
						type: "number",
						description:
							"Confidence score for this boundary detection, from 0.0 to 1.0.",
						minimum: 0,
						maximum: 1,
					},
				},
				required: ["type", "startContent", "endContent", "confidence"],
				propertyOrdering: ["type", "startContent", "endContent", "confidence"],
			},
		},
	},
	required: ["golden_nuggets"],
	propertyOrdering: ["golden_nuggets"],
} as const;

export function generatePhase2HighPrecisionSchema(
	selectedTypes: GoldenNuggetType[],
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
		confidence: {
			type: "number",
			description:
				"Confidence score for this boundary detection, from 0.0 to 1.0.",
			minimum: 0,
			maximum: 1,
		},
	};

	const required = ["type", "startContent", "endContent", "confidence"];
	const propertyOrdering = ["type", "startContent", "endContent", "confidence"];

	return {
		type: "object",
		properties: {
			golden_nuggets: {
				type: "array",
				description:
					"An array of golden nuggets with precise start and end boundaries.",
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
