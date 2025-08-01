import { describe, expect, it } from "vitest";
import type { GoldenNuggetType } from "../shared/schemas";
import {
	ALL_NUGGET_TYPES,
	generateGoldenNuggetSchema,
} from "../shared/schemas";
import {
	CONTEXT_MENU_OPTIONS,
	createCombinationTypeFilter,
	createDefaultTypeFilter,
	createSingleTypeFilter,
	generateDynamicSchema,
	generateFilteredPrompt,
	getContextMenuOption,
	getTypeConfiguration,
	TYPE_CONFIGURATIONS,
	validateSelectedTypes,
} from "./type-filter-service";

// For tests that need access to internal constants
const TYPE_DEFINITIONS = {
	tool: `1. **Actionable Tools:** A specific, tool/software/technique. Must include its specific, valuable application.
    *   **Bad:** "You should use a calendar."
    *   **Good:** "I use Trello's calendar power-up to visualize my content pipeline, which helps me manage deadlines when my ADHD makes time-planning difficult."`,

	media: `2. **High-Signal Media:** A high-quality book, article, video, or podcast. Must include *why* it's valuable.
    *   **Bad:** "Check out the NFL podcast."
    *   **Good:** "The episode of the Tim Ferriss podcast with guest Derek Sivers has a brilliant segment on the idea of 'hell yeah or no' for decision-making."`,

	explanation: `3. **Deep Explanations:** A concise, insightful explanation of a complex concept that goes beyond a surface-level definition. It should feel like a mini-lesson.
    *   **Bad:** "The mitochondria is the powerhouse of the cell."
    *   **Good:** "The reason async/await in Javascript is so powerful is that it's syntactic sugar over Promises, allowing you to write asynchronous code that reads like synchronous code, avoiding 'callback hell'."`,

	analogy: `4. **Powerful Analogies:** An analogy that makes a complex topic surprisingly simple and clear.
    *   **Bad:** "It's like learning to ride a bike."
    *   **Good:** "Thinking about technical debt as being like a financial debt is useful. You can take it on purposefully to ship faster, but you have to pay interest (slower development) until you pay it down (refactor)."`,

	model: `5. **Mental Models:** A named cognitive framework, productivity technique, or principle for thinking. The simple mention of a specific model is valuable as a hook for further research.
    *   **Bad:** "You should think about the problem differently." (Too generic)
    *   **Good:** "I apply the 'Inversion' mental model by asking 'What would guarantee failure?' before starting a new project. This helps me identify and mitigate risks proactively instead of just planning for success."`,
};

describe("TypeFilterService", () => {
	describe("generateFilteredPrompt", () => {
		const basePrompt = `# Base Prompt

## EXTRACTION TARGETS ("Golden Nuggets"):
1. **Actionable Tools:** Original tool definition
2. **High-Signal Media:** Original media definition  
3. **Deep Explanations:** Original explanation definition
4. **Powerful Analogies:** Original analogy definition
5. **Mental Models:** Original model definition

## ANALYSIS INSTRUCTIONS
Continue with analysis...`;

		it("should return base prompt unchanged when no types selected", () => {
			const result = generateFilteredPrompt(basePrompt, []);
			expect(result).toBe(basePrompt);
		});

		it("should filter prompt to only include selected single type", () => {
			const result = generateFilteredPrompt(basePrompt, ["tool"]);

			expect(result).toContain("## EXTRACTION TARGETS");
			expect(result).toContain("1. **Actionable Tools:**");
			expect(result).not.toContain("2. **High-Signal Media:**");
			expect(result).not.toContain("**Deep Explanations:**");
			expect(result).not.toContain("**Powerful Analogies:**");
			expect(result).not.toContain("**Mental Models:**");
		});

		it("should filter prompt to include multiple selected types with renumbering", () => {
			const result = generateFilteredPrompt(basePrompt, ["tool", "media"]);

			expect(result).toContain("## EXTRACTION TARGETS");
			expect(result).toContain("1. **Actionable Tools:**");
			expect(result).toContain("2. **High-Signal Media:**");
			expect(result).not.toContain("**Deep Explanations:**");
			expect(result).not.toContain("**Powerful Analogies:**");
			expect(result).not.toContain("**Mental Models:**");
		});

		it("should preserve analysis instructions section", () => {
			const result = generateFilteredPrompt(basePrompt, ["tool"]);

			expect(result).toContain("## ANALYSIS INSTRUCTIONS");
			expect(result).toContain("Continue with analysis...");
		});

		it("should include complete type definitions with examples", () => {
			const result = generateFilteredPrompt(basePrompt, ["tool"]);

			expect(result).toContain("A specific, tool/software/technique");
			expect(result).toContain('**Bad:** "You should use a calendar."');
			expect(result).toContain("**Good:** \"I use Trello's calendar power-up");
		});

		it("should handle all types selection (maintain original numbering)", () => {
			const allTypes: GoldenNuggetType[] = [
				"tool",
				"media",
				"explanation",
				"analogy",
				"model",
			];
			const result = generateFilteredPrompt(basePrompt, allTypes);

			expect(result).toContain("1. **Actionable Tools:**");
			expect(result).toContain("2. **High-Signal Media:**");
			expect(result).toContain("3. **Deep Explanations:**");
			expect(result).toContain("4. **Powerful Analogies:**");
			expect(result).toContain("5. **Mental Models:**");
		});

		it("should handle missing EXTRACTION TARGETS section gracefully", () => {
			const promptWithoutTargets =
				"# Simple prompt without extraction targets section";
			const result = generateFilteredPrompt(promptWithoutTargets, ["tool"]);

			// Should return original prompt since no EXTRACTION TARGETS section exists
			expect(result).toBe(promptWithoutTargets);
		});
	});

	describe("generateDynamicSchema", () => {
		it("should generate schema with selected types enum", () => {
			const selectedTypes: GoldenNuggetType[] = ["tool", "media"];
			const result = generateDynamicSchema(selectedTypes);

			expect(
				result.properties.golden_nuggets.items.properties.type.enum,
			).toEqual(["tool", "media"]);
		});

		it("should generate schema with all types when empty array provided", () => {
			const result = generateDynamicSchema([]);

			expect(
				result.properties.golden_nuggets.items.properties.type.enum,
			).toEqual(ALL_NUGGET_TYPES);
		});

		it("should generate schema with single type", () => {
			const result = generateDynamicSchema(["analogy"]);

			expect(
				result.properties.golden_nuggets.items.properties.type.enum,
			).toEqual(["analogy"]);
		});

		it("should maintain schema structure consistency with base schema", () => {
			const result = generateDynamicSchema(["tool"]);
			const _baseSchema = generateGoldenNuggetSchema(["tool"]);

			expect(result.type).toBe("object");
			expect(result.required).toEqual(["golden_nuggets"]);
			expect(result.properties.golden_nuggets.type).toBe("array");
			expect(result.properties.golden_nuggets.items.required).toEqual([
				"type",
				"startContent",
				"endContent",
				"synthesis",
			]);
		});
	});

	describe("validateSelectedTypes", () => {
		it("should return true for valid single type", () => {
			expect(validateSelectedTypes(["tool"])).toBe(true);
			expect(validateSelectedTypes(["media"])).toBe(true);
			expect(validateSelectedTypes(["explanation"])).toBe(true);
			expect(validateSelectedTypes(["analogy"])).toBe(true);
			expect(validateSelectedTypes(["model"])).toBe(true);
		});

		it("should return true for valid multiple types", () => {
			expect(validateSelectedTypes(["tool", "media"])).toBe(true);
			expect(validateSelectedTypes(["explanation", "analogy", "model"])).toBe(
				true,
			);
		});

		it("should return true for all valid types", () => {
			const allTypes: GoldenNuggetType[] = [
				"tool",
				"media",
				"explanation",
				"analogy",
				"model",
			];
			expect(validateSelectedTypes(allTypes)).toBe(true);
		});

		it("should return true for empty array", () => {
			expect(validateSelectedTypes([])).toBe(true);
		});

		it("should return false for invalid types", () => {
			// @ts-expect-error Testing invalid input
			expect(validateSelectedTypes(["invalid"])).toBe(false);
			// @ts-expect-error Testing invalid input
			expect(validateSelectedTypes(["tool", "invalid"])).toBe(false);
		});

		it("should return false for mixed valid and invalid types", () => {
			// @ts-expect-error Testing invalid input
			expect(validateSelectedTypes(["tool", "media", "fake"])).toBe(false);
		});
	});

	describe("getTypeConfiguration", () => {
		it("should return correct configuration for each type", () => {
			expect(getTypeConfiguration("tool")).toEqual({
				type: "tool",
				label: "Tools",
				emoji: "🛠️",
			});

			expect(getTypeConfiguration("media")).toEqual({
				type: "media",
				label: "Media",
				emoji: "📚",
			});

			expect(getTypeConfiguration("explanation")).toEqual({
				type: "explanation",
				label: "Explanations",
				emoji: "💡",
			});

			expect(getTypeConfiguration("analogy")).toEqual({
				type: "analogy",
				label: "Analogies",
				emoji: "🌉",
			});

			expect(getTypeConfiguration("model")).toEqual({
				type: "model",
				label: "Mental Models",
				emoji: "🧠",
			});
		});

		it("should return undefined for invalid type", () => {
			// @ts-expect-error Testing invalid input
			expect(getTypeConfiguration("invalid")).toBeUndefined();
		});
	});

	describe("getContextMenuOption", () => {
		it('should return correct option for "all" types', () => {
			const option = getContextMenuOption("all");

			expect(option).toEqual({
				id: "all",
				title: "🔍 All Types",
				types: ["tool", "media", "explanation", "analogy", "model"],
			});
		});

		it("should return correct option for single types", () => {
			expect(getContextMenuOption("tool")).toEqual({
				id: "tool",
				title: "🛠️ Tools Only",
				types: ["tool"],
			});

			expect(getContextMenuOption("media")).toEqual({
				id: "media",
				title: "📚 Media Only",
				types: ["media"],
			});
		});

		it("should return undefined for invalid option ID", () => {
			expect(getContextMenuOption("invalid")).toBeUndefined();
		});

		it("should return undefined for empty string", () => {
			expect(getContextMenuOption("")).toBeUndefined();
		});
	});

	describe("createDefaultTypeFilter", () => {
		it("should create filter with all types selected", () => {
			const filter = createDefaultTypeFilter();

			expect(filter).toEqual({
				selectedTypes: ["tool", "media", "explanation", "analogy", "model"],
				analysisMode: "combination",
			});
		});

		it("should create new instance each time", () => {
			const filter1 = createDefaultTypeFilter();
			const filter2 = createDefaultTypeFilter();

			expect(filter1).not.toBe(filter2); // Different instances
			expect(filter1).toEqual(filter2); // Same content
		});
	});

	describe("createSingleTypeFilter", () => {
		it("should create filter with single type", () => {
			const filter = createSingleTypeFilter("tool");

			expect(filter).toEqual({
				selectedTypes: ["tool"],
				analysisMode: "single",
			});
		});

		it("should work for all valid types", () => {
			const types: GoldenNuggetType[] = [
				"tool",
				"media",
				"explanation",
				"analogy",
				"model",
			];

			types.forEach((type) => {
				const filter = createSingleTypeFilter(type);
				expect(filter.selectedTypes).toEqual([type]);
				expect(filter.analysisMode).toBe("single");
			});
		});
	});

	describe("createCombinationTypeFilter", () => {
		it("should create filter with multiple types", () => {
			const types: GoldenNuggetType[] = ["tool", "media"];
			const filter = createCombinationTypeFilter(types);

			expect(filter).toEqual({
				selectedTypes: ["tool", "media"],
				analysisMode: "combination",
			});
		});

		it("should handle single type in combination mode", () => {
			const filter = createCombinationTypeFilter(["explanation"]);

			expect(filter).toEqual({
				selectedTypes: ["explanation"],
				analysisMode: "combination",
			});
		});

		it("should handle empty array", () => {
			const filter = createCombinationTypeFilter([]);

			expect(filter).toEqual({
				selectedTypes: [],
				analysisMode: "combination",
			});
		});

		it("should preserve type order", () => {
			const types: GoldenNuggetType[] = ["model", "tool", "analogy"];
			const filter = createCombinationTypeFilter(types);

			expect(filter.selectedTypes).toEqual(["model", "tool", "analogy"]);
		});
	});

	describe("TYPE_DEFINITIONS consistency", () => {
		it("should have definitions for all nugget types", () => {
			const types: GoldenNuggetType[] = [
				"tool",
				"media",
				"explanation",
				"analogy",
				"model",
			];

			types.forEach((type) => {
				expect(TYPE_DEFINITIONS[type]).toBeDefined();
				expect(TYPE_DEFINITIONS[type]).toContain("**Bad:**");
				expect(TYPE_DEFINITIONS[type]).toContain("**Good:**");
			});
		});
	});

	describe("CONTEXT_MENU_OPTIONS consistency", () => {
		it('should have options for all types plus "all"', () => {
			const expectedIds = [
				"all",
				"tool",
				"media",
				"explanation",
				"analogy",
				"model",
			];
			const actualIds = CONTEXT_MENU_OPTIONS.map((option) => option.id);

			expect(actualIds).toEqual(expectedIds);
		});

		it("should have consistent emoji usage with TYPE_CONFIGURATIONS", () => {
			TYPE_CONFIGURATIONS.forEach((config) => {
				const menuOption = getContextMenuOption(config.type);
				expect(menuOption?.title).toContain(config.emoji);
			});
		});
	});

	describe("Integration with schema generation", () => {
		it("should produce schemas compatible with generateGoldenNuggetSchema", () => {
			const types: GoldenNuggetType[] = ["tool", "media"];
			const filterServiceSchema = generateDynamicSchema(types);
			const directSchema = generateGoldenNuggetSchema(types);

			expect(filterServiceSchema).toEqual(directSchema);
		});
	});
});
