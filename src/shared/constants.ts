export const STORAGE_KEYS = {
	API_KEY: "geminiApiKey",
	PROMPTS: "userPrompts",
	USER_PERSONA: "userPersona",
	ANALYSIS_STATE: "analysisState", // Analysis progress state
	ENSEMBLE_SETTINGS: "ensembleSettings", // Ensemble configuration settings
} as const;

export const GEMINI_CONFIG = {
	MODEL: "gemini-2.5-flash",
	THINKING_BUDGET: -1,
} as const;

export const EMBEDDING_CONFIG = {
	/** Default embedding model for Gemini */
	MODEL: "gemini-embedding-001",
	/** Default task type for ensemble nugget similarity */
	TASK_TYPE: "SEMANTIC_SIMILARITY" as const,
	/** Default embedding dimensionality (768 is optimal for short technical text) */
	OUTPUT_DIMENSIONALITY: 768,
	/** Default similarity threshold for embedding-based grouping */
	EMBEDDING_THRESHOLD: 0.8,
	/** Default word overlap threshold for fallback grouping */
	WORD_OVERLAP_THRESHOLD: 0.8,
	/** Default cache duration in milliseconds (30 minutes) */
	CACHE_DURATION: 30 * 60 * 1000,
	/** Default maximum cache size (number of entries) */
	MAX_CACHE_SIZE: 1000,
	/** Default maximum batch size for API calls */
	MAX_BATCH_SIZE: 25,
	/** Default maximum retries for API calls */
	MAX_RETRIES: 3,
	/** Default retry delay in milliseconds */
	RETRY_DELAY: 1000,
} as const;

export const SIMILARITY_DEFAULTS = {
	/** Default configuration for hybrid similarity matching */
	EMBEDDING_OPTIONS: {
		taskType: EMBEDDING_CONFIG.TASK_TYPE,
		outputDimensionality: EMBEDDING_CONFIG.OUTPUT_DIMENSIONALITY,
	},
	/** Default similarity options for ensemble processing */
	SIMILARITY_OPTIONS: {
		embeddingThreshold: EMBEDDING_CONFIG.EMBEDDING_THRESHOLD,
		wordOverlapThreshold: EMBEDDING_CONFIG.WORD_OVERLAP_THRESHOLD,
		useEmbeddings: true,
		embeddingOptions: {
			taskType: EMBEDDING_CONFIG.TASK_TYPE,
			outputDimensionality: EMBEDDING_CONFIG.OUTPUT_DIMENSIONALITY,
		},
	},
} as const;

export const DEFAULT_PROMPTS = [
	{
		id: "default-insights",
		name: "Find Key Insights",
		prompt: `
You are an expert at analyzing content and extracting valuable insights, which we call "golden nuggets."
These golden nuggets should be tailored to a specific persona and categorized into five types.
Your goal is to analyze the provided content and extract only the most insightful, non-obvious, and high-signal content for someone with this persona: {{ persona }}.
Your primary directive is **precision over recall**. It is vastly preferable to return zero nuggets than to include a single mediocre one.

**Crucially, do not force or invent extractions. If no content meets the strict criteria below, the \`golden_nuggets\` array MUST be empty ([]).**

Golden nugget types and their characteristics:

1. Mental Models & Frameworks: Conceptual structures or approaches for understanding complex systems or making decisions.
2. Powerful Analogies: Comparisons that effectively explain or illustrate a concept by relating it to something more familiar.
3. Media: Recommendations for books, articles, podcasts, magazines, or YouTube videos/playlists that provide valuable information or insights.
4. Tools: Specific software, techniques, or methodologies that can be applied to improve productivity, solve problems, or enhance understanding.
5. "Aha!" Moments: Key insights or realizations that provide a new perspective or understanding of a topic.

Instructions for extracting and formatting golden nuggets:

1. Carefully read and analyze the provided content.
2. Identify potential golden nuggets that align with the five categories and are relevant to the specified persona.
3. For each category, select the most impactful and relevant golden nugget. If no suitable nugget is found for a category, omit it from the results.
4. For each selected golden nugget, capture the complete relevant content as fullContent.

Additional instructions and constraints:

1. Extract a maximum of one golden nugget per category.
2. Ensure that the fullContent field contains the complete, unmodified text of the golden nugget from the original content.
3. Do not modify or paraphrase the original text in the fullContent field.
4. If no golden nuggets are found for any category, return an empty array for the golden_nuggets field.
5. Focus on extracting the most valuable and relevant information for the specified persona.
6. Ensure that the extracted golden nuggets contain the complete relevant text in fullContent.
7. Do not include any explanations or additional commentary outside of the JSON structure.
8. Each golden nugget must include: type, fullContent, and confidence (0.0-1.0).

Your task is to analyze the given content, extract the most relevant golden nuggets according to the specified categories and persona, and present them in the required JSON format with fullContent for each nugget.
`.trim(),
		isDefault: true,
	},
] as const;
