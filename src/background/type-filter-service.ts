import {
	type GoldenNuggetType,
	generateGoldenNuggetSchema,
} from "../shared/schemas";
import type { TypeConfiguration, TypeFilterOptions } from "../shared/types";

const TYPE_DEFINITIONS: Record<GoldenNuggetType, string> = {
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

export const TYPE_CONFIGURATIONS: TypeConfiguration[] = [
	{ type: "tool", label: "Tools", emoji: "🛠️" },
	{ type: "media", label: "Media", emoji: "📚" },
	{ type: "explanation", label: "Explanations", emoji: "💡" },
	{ type: "analogy", label: "Analogies", emoji: "🌉" },
	{ type: "model", label: "Mental Models", emoji: "🧠" },
];

export const CONTEXT_MENU_OPTIONS = [
	{
		id: "all",
		title: "🔍 All Types",
		types: [
			"tool",
			"media",
			"explanation",
			"analogy",
			"model",
		] as GoldenNuggetType[],
	},
	{
		id: "tool",
		title: "🛠️ Tools Only",
		types: ["tool"] as GoldenNuggetType[],
	},
	{
		id: "media",
		title: "📚 Media Only",
		types: ["media"] as GoldenNuggetType[],
	},
	{
		id: "explanation",
		title: "💡 Explanations Only",
		types: ["explanation"] as GoldenNuggetType[],
	},
	{
		id: "analogy",
		title: "🌉 Analogies Only",
		types: ["analogy"] as GoldenNuggetType[],
	},
	{
		id: "model",
		title: "🧠 Mental Models Only",
		types: ["model"] as GoldenNuggetType[],
	},
];

/**
 * Generates a filtered prompt based on selected types
 */
export function generateFilteredPrompt(
	basePrompt: string,
	selectedTypes: GoldenNuggetType[],
): string {
	if (selectedTypes.length === 0) {
		return basePrompt;
	}

	// Build the filtered sections
	const filteredSections = selectedTypes
		.map((type, index) => {
			const definition = TYPE_DEFINITIONS[type];
			return definition.replace(/^\d+\./, `${index + 1}.`);
		})
		.join("\n\n");

	// Replace the EXTRACTION TARGETS section with filtered content
	const extractionTargetsRegex = /## EXTRACTION TARGETS[\s\S]*?(?=\n## |$)/;
	const filteredExtraction = `## EXTRACTION TARGETS ("Golden Nuggets"):
Your primary task is to find content matching one or more of the following categories. Each example provides a "Bad" (what to avoid) and "Good" (what to look for) case.

${filteredSections}`;

	return basePrompt.replace(extractionTargetsRegex, filteredExtraction);
}

/**
 * Generates a dynamic schema based on selected types
 */
export function generateDynamicSchema(selectedTypes: GoldenNuggetType[]) {
	return generateGoldenNuggetSchema(selectedTypes);
}

/**
 * Validates that selected types are valid
 */
export function validateSelectedTypes(
	selectedTypes: GoldenNuggetType[],
): boolean {
	const validTypes = ["tool", "media", "explanation", "analogy", "model"];
	return selectedTypes.every((type) => validTypes.includes(type));
}

/**
 * Gets the configuration for a specific type
 */
export function getTypeConfiguration(
	type: GoldenNuggetType,
): TypeConfiguration | undefined {
	return TYPE_CONFIGURATIONS.find((config) => config.type === type);
}

/**
 * Gets context menu option by ID
 */
export function getContextMenuOption(id: string) {
	return CONTEXT_MENU_OPTIONS.find((option) => option.id === id);
}

/**
 * Creates a default type filter with all types selected
 */
export function createDefaultTypeFilter(): TypeFilterOptions {
	return {
		selectedTypes: ["tool", "media", "explanation", "analogy", "model"],
		analysisMode: "combination",
	};
}

/**
 * Creates a single type filter for context menu usage
 */
export function createSingleTypeFilter(
	type: GoldenNuggetType,
): TypeFilterOptions {
	return {
		selectedTypes: [type],
		analysisMode: "single",
	};
}

/**
 * Creates a combination type filter for popup usage
 */
export function createCombinationTypeFilter(
	types: GoldenNuggetType[],
): TypeFilterOptions {
	return {
		selectedTypes: types,
		analysisMode: "combination",
	};
}

/**
 * TypeFilterService - Legacy class-like export for backward compatibility
 */
export const TypeFilterService = {
	// Export all constants
	TYPE_DEFINITIONS,
	TYPE_CONFIGURATIONS,
	CONTEXT_MENU_OPTIONS,

	// Export all functions
	generateFilteredPrompt,
	generateDynamicSchema,
	validateSelectedTypes,
	getTypeConfiguration,
	getContextMenuOption,
	createDefaultTypeFilter,
	createSingleTypeFilter,
	createCombinationTypeFilter,
};
