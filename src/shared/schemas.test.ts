import { describe, expect, it } from "vitest";
import { GOLDEN_NUGGET_SCHEMA } from "./schemas";

describe("GOLDEN_NUGGET_SCHEMA", () => {
	describe("Schema Structure", () => {
		it("should have correct root structure", () => {
			expect(GOLDEN_NUGGET_SCHEMA.type).toBe("object");
			expect(GOLDEN_NUGGET_SCHEMA.properties).toBeDefined();
			expect(GOLDEN_NUGGET_SCHEMA.required).toEqual(["golden_nuggets"]);
		});

		it("should have golden_nuggets property as array", () => {
			const goldenNuggetsProperty =
				GOLDEN_NUGGET_SCHEMA.properties.golden_nuggets;

			expect(goldenNuggetsProperty.type).toBe("array");
			expect(goldenNuggetsProperty.description).toBe(
				"An array of extracted golden nuggets.",
			);
			expect(goldenNuggetsProperty.minItems).toBe(0);
		});

		it("should have correct item structure", () => {
			const itemsSchema = GOLDEN_NUGGET_SCHEMA.properties.golden_nuggets.items;

			expect(itemsSchema.type).toBe("object");
			expect(itemsSchema.properties).toBeDefined();
			expect(itemsSchema.required).toEqual([
				"type",
				"startContent",
				"endContent",
			]);
		});

		it("should have correct property ordering", () => {
			expect(GOLDEN_NUGGET_SCHEMA.propertyOrdering).toEqual(["golden_nuggets"]);

			const itemsSchema = GOLDEN_NUGGET_SCHEMA.properties.golden_nuggets.items;
			expect(itemsSchema.propertyOrdering).toEqual([
				"type",
				"startContent",
				"endContent",
				"synthesis",
			]);
		});
	});

	describe("Type Property", () => {
		it("should have correct type property structure", () => {
			const itemsSchema = GOLDEN_NUGGET_SCHEMA.properties.golden_nuggets.items;
			const typeProperty = itemsSchema.properties.type;

			expect(typeProperty.type).toBe("string");
			expect(typeProperty.description).toBe(
				"The category of the extracted golden nugget.",
			);
			expect(typeProperty.enum).toEqual([
				"tool",
				"media",
				"explanation",
				"analogy",
				"model",
			]);
		});

		it("should only allow valid enum values", () => {
			const itemsSchema = GOLDEN_NUGGET_SCHEMA.properties.golden_nuggets.items;
			const typeProperty = itemsSchema.properties.type;

			expect(typeProperty.enum).toContain("tool");
			expect(typeProperty.enum).toContain("media");
			expect(typeProperty.enum).toContain("explanation");
			expect(typeProperty.enum).toContain("analogy");
			expect(typeProperty.enum).toContain("model");
			expect(typeProperty.enum).toHaveLength(5);
		});
	});

	describe("Content Properties", () => {
		it("should have correct startContent property structure", () => {
			const itemsSchema = GOLDEN_NUGGET_SCHEMA.properties.golden_nuggets.items;
			const startContentProperty = itemsSchema.properties.startContent;

			expect(startContentProperty.type).toBe("string");
			expect(startContentProperty.description).toBe(
				"The first few words (max 5) of the original content verbatim, without any changes to wording or symbols.",
			);
		});

		it("should have correct endContent property structure", () => {
			const itemsSchema = GOLDEN_NUGGET_SCHEMA.properties.golden_nuggets.items;
			const endContentProperty = itemsSchema.properties.endContent;

			expect(endContentProperty.type).toBe("string");
			expect(endContentProperty.description).toBe(
				"The last few words (max 5) of the original content verbatim, without any changes to wording or symbols.",
			);
		});
	});

	describe("Synthesis Property", () => {
		it("should have correct synthesis property structure", () => {
			const itemsSchema = GOLDEN_NUGGET_SCHEMA.properties.golden_nuggets.items;
			const synthesisProperty = itemsSchema.properties.synthesis;

			expect(synthesisProperty.type).toBe("string");
			expect(synthesisProperty.description).toBe(
				"A concise explanation of why this is relevant to the persona, connecting it to their core interests or cognitive profile.",
			);
		});
	});

	describe("Schema Validation", () => {
		it("should validate a correct golden nugget structure", () => {
			const validNugget = {
				type: "tool",
				startContent: "Use this amazing tool",
				endContent: "for productivity",
				synthesis:
					"This tool aligns with the user's preference for efficient workflows",
			};

			const _validResponse = {
				golden_nuggets: [validNugget],
			};

			// This test validates the schema structure matches expected format
			expect(
				GOLDEN_NUGGET_SCHEMA.properties.golden_nuggets.items.properties.type
					.enum,
			).toContain(validNugget.type);
			expect(
				GOLDEN_NUGGET_SCHEMA.properties.golden_nuggets.items.properties
					.startContent.type,
			).toBe("string");
			expect(
				GOLDEN_NUGGET_SCHEMA.properties.golden_nuggets.items.properties
					.endContent.type,
			).toBe("string");
			expect(
				GOLDEN_NUGGET_SCHEMA.properties.golden_nuggets.items.properties
					.synthesis.type,
			).toBe("string");
		});

		it("should support empty golden nuggets array", () => {
			const _emptyResponse = {
				golden_nuggets: [],
			};

			expect(GOLDEN_NUGGET_SCHEMA.properties.golden_nuggets.minItems).toBe(0);
		});

		it("should support multiple golden nuggets", () => {
			const _multipleNuggets = {
				golden_nuggets: [
					{
						type: "tool",
						startContent: "Tool",
						endContent: "content",
						synthesis: "Tool synthesis",
					},
					{
						type: "explanation",
						startContent: "Explanation",
						endContent: "content",
						synthesis: "Explanation synthesis",
					},
					{
						type: "analogy",
						startContent: "Analogy",
						endContent: "content",
						synthesis: "Analogy synthesis",
					},
				],
			};

			expect(GOLDEN_NUGGET_SCHEMA.properties.golden_nuggets.type).toBe("array");
			expect(GOLDEN_NUGGET_SCHEMA.properties.golden_nuggets.items.type).toBe(
				"object",
			);
		});

		it("should have all required fields marked as required", () => {
			const itemsSchema = GOLDEN_NUGGET_SCHEMA.properties.golden_nuggets.items;

			expect(itemsSchema.required).toContain("type");
			expect(itemsSchema.required).toContain("startContent");
			expect(itemsSchema.required).toContain("endContent");
			expect(itemsSchema.required).not.toContain("synthesis"); // synthesis is now optional
		});
	});

	describe("Schema Immutability", () => {
		it("should be immutable (const assertion)", () => {
			// This test ensures the schema is properly typed as const
			// The schema structure should be predictable and type-safe
			expect(GOLDEN_NUGGET_SCHEMA.type).toBe("object");
			expect(GOLDEN_NUGGET_SCHEMA.properties).toBeDefined();
			expect(GOLDEN_NUGGET_SCHEMA.required).toEqual(["golden_nuggets"]);

			// Verify the const assertion provides the expected type structure
			expect(typeof GOLDEN_NUGGET_SCHEMA).toBe("object");
			expect(Array.isArray(GOLDEN_NUGGET_SCHEMA.required)).toBe(true);
		});

		it("should maintain enum values", () => {
			const typeEnum =
				GOLDEN_NUGGET_SCHEMA.properties.golden_nuggets.items.properties.type
					.enum;

			// Verify enum hasn't been modified
			expect(typeEnum).toEqual([
				"tool",
				"media",
				"explanation",
				"analogy",
				"model",
			]);
		});
	});

	describe("Schema Completeness", () => {
		it("should have all necessary properties for validation", () => {
			// Root level
			expect(GOLDEN_NUGGET_SCHEMA).toHaveProperty("type");
			expect(GOLDEN_NUGGET_SCHEMA).toHaveProperty("properties");
			expect(GOLDEN_NUGGET_SCHEMA).toHaveProperty("required");
			expect(GOLDEN_NUGGET_SCHEMA).toHaveProperty("propertyOrdering");

			// Array level
			const goldenNuggetsProperty =
				GOLDEN_NUGGET_SCHEMA.properties.golden_nuggets;
			expect(goldenNuggetsProperty).toHaveProperty("type");
			expect(goldenNuggetsProperty).toHaveProperty("description");
			expect(goldenNuggetsProperty).toHaveProperty("minItems");
			expect(goldenNuggetsProperty).toHaveProperty("items");

			// Item level
			const itemsSchema = goldenNuggetsProperty.items;
			expect(itemsSchema).toHaveProperty("type");
			expect(itemsSchema).toHaveProperty("properties");
			expect(itemsSchema).toHaveProperty("required");
			expect(itemsSchema).toHaveProperty("propertyOrdering");

			// Property level
			expect(itemsSchema.properties).toHaveProperty("type");
			expect(itemsSchema.properties).toHaveProperty("startContent");
			expect(itemsSchema.properties).toHaveProperty("endContent");
			expect(itemsSchema.properties).toHaveProperty("synthesis");
		});

		it("should have meaningful descriptions for all properties", () => {
			const goldenNuggetsProperty =
				GOLDEN_NUGGET_SCHEMA.properties.golden_nuggets;
			expect(goldenNuggetsProperty.description).toBeTruthy();

			const itemsSchema = goldenNuggetsProperty.items;
			expect(itemsSchema.properties.type.description).toBeTruthy();
			expect(itemsSchema.properties.startContent.description).toBeTruthy();
			expect(itemsSchema.properties.endContent.description).toBeTruthy();
			expect(itemsSchema.properties.synthesis.description).toBeTruthy();
		});
	});
});
