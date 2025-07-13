export const STORAGE_KEYS = {
  API_KEY: 'geminiApiKey',
  PROMPTS: 'userPrompts'
} as const;

// Import site selectors from the web-scraper-js library to maintain single source of truth
export { SITE_SELECTORS } from 'threads-harvester';

export const GEMINI_CONFIG = {
  MODEL: 'gemini-2.5-flash',
  THINKING_BUDGET: -1
} as const;

export const DEFAULT_PROMPTS = [
  {
    id: 'default-insights',
    name: 'Find Key Insights',
    prompt: `## ROLE & GOAL:
You are an AI information filter. Your goal is to analyze the provided {{ source }} and extract content specifically interesting to a "Pragmatic Synthesizer" persona with ADHD. You must ignore generic, superficial, or low-signal comments.
**Crucially, do not force or invent extractions; only include content that is a clear and strong match for the 'Golden Nuggets' criteria. If no such content is found, the \`golden_nuggets\` array MUST be empty ([]).**
## PERSONA PROFILE:
*   **Cognitive Model:** INTP (logical systems), ADHD (novelty, structure), 5w6 (competence, reliable knowledge).
*   **Core Interests:** How things work (science/tech), how people think (cognition/philosophy), how we got here (history/evolution), meta-learning, and elegant principles.
*   **Intellectual Flavor:** Prioritize First Principles and their practical, Applied Synthesis.
*   **Heroes for Vibe Check:** Does this sound like something Tyler Cowen, Charlie Munger, or Nassim Taleb would find interesting?

## EXTRACTION TARGETS ("Golden Nuggets"):
Your primary task is to find comments containing one or more of the following:
1.  **Actionable Tools:** A specific tool/software with a concise explanation.
2.  **High-Signal Media:** A non-obvious book, article, or channel with context on its value.
3.  **Deep Explanations:** An insightful explanation of a technical, scientific, or philosophical concept.
4.  **Powerful Analogies:** An analogy that clarifies a complex idea.
5.  **Mental Models:** A well-articulated cognitive framework or productivity technique.`,
    isDefault: true
  }
] as const;