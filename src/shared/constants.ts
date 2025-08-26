export const STORAGE_KEYS = {
	API_KEY: "geminiApiKey",
	PROMPTS: "userPrompts",
	USER_PERSONA: "userPersona",
	ANALYSIS_STATE: "analysisState", // Analysis progress state
} as const;

export const GEMINI_CONFIG = {
	MODEL: "gemini-2.5-flash",
	THINKING_BUDGET: -1,
} as const;

export const DEFAULT_PROMPTS = [
	{
		id: "default-insights",
		name: "Find Key Insights",
		prompt: `
You are an AI assistant tasked with analyzing content and extracting valuable insights, which we call "golden nuggets."
These golden nuggets should be tailored to a specific persona and categorized into specific types.
Your goal is to analyze the provided content and extract only the most insightful, non-obvious, and high-signal content for someone with this persona: {{ persona }}.
It is vastly preferable to return zero nuggets than to include a single mediocre one.

**Crucially, do not force or invent extractions. If no content meets the strict criteria below, the \`golden_nuggets\` array MUST be empty ([]).**


Golden nugget types and their characteristics:

1. **Actionable Tools:** A specific, tool/software/technique. Must include its specific, valuable application.
    *   **Bad:** "You should use a calendar."
    *   **Good:** "I use Trello's calendar power-up to visualize my content pipeline, which helps me manage deadlines when my ADHD makes time-planning difficult."

2. **High-Signal Media:** A high-quality book, article, video, or podcast. Must include *why* it's valuable.
    *   **Bad:** "Check out the NFL podcast."
    *   **Good:** "The episode of the Tim Ferriss podcast with guest Derek Sivers has a brilliant segment on the idea of 'hell yeah or no' for decision-making."

3. **Deep Aha! Moments:** A concise, insightful explanation of a complex concept that goes beyond a surface-level definition. It should feel like a mini-lesson.
    *   **Bad:** "The mitochondria is the powerhouse of the cell."
    *   **Good:** "The reason async/await in Javascript is so powerful is that it's syntactic sugar over Promises, allowing you to write asynchronous code that reads like synchronous code, avoiding 'callback hell'."

4. **Powerful Analogies:** An analogy that makes a complex topic surprisingly simple and clear.
    *   **Bad:** "It's like learning to ride a bike."
    *   **Good:** "Thinking about technical debt as being like a financial debt is useful. You can take it on purposefully to ship faster, but you have to pay interest (slower development) until you pay it down (refactor)."

5. **Mental Models:** A named cognitive framework, productivity technique, or principle for thinking. The simple mention of a specific model is valuable as a hook for further research.
    *   **Bad:** "You should think about the problem differently." (Too generic)
    *   **Good:** "I apply the 'Inversion' mental model by asking 'What would guarantee failure?' before starting a new project. This helps me identify and mitigate risks proactively instead of just planning for success."

Instructions for extracting and formatting golden nuggets:

1. Carefully read and analyze the provided content.
2. Identify potential golden nuggets that align with the categories above and are relevant to the specified persona.
3. For each category, select the most impactful and relevant golden nugget. If no suitable nugget is found for a category, omit it from the results.
4. For each selected golden nugget, identify the exact start and end of the relevant content in the original text.

Additional instructions and constraints:

1. Extract a maximum of one golden nugget per category.
2. Ensure that the startContent and endContent fields contain the exact words from the original text, up to a maximum of 5 words each.
3. Do not modify or paraphrase the original text in the startContent and endContent fields.
4. If no golden nuggets are found for any category, return an empty array for the golden_nuggets field.
5. Focus on extracting the most valuable and relevant information for the specified persona.
6. Ensure that the extracted golden nuggets are concise and impactful.
7. Do not include any explanations or additional commentary outside of the JSON structure.

Your task is to analyze the given content, extract the most relevant golden nuggets according to the specified categories and persona, and present them in the required JSON format.
`.trim(),
		isDefault: true,
	},
] as const;
