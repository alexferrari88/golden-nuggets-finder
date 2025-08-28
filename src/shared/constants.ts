export const STORAGE_KEYS = {
	API_KEY: "geminiApiKey",
	PROMPTS: "userPrompts",
	USER_PERSONA: "userPersona",
	ANALYSIS_STATE: "analysisState", // Analysis progress state
	ENSEMBLE_SETTINGS: "ensembleSettings", // Ensemble configuration settings
	TWO_PHASE_SETTINGS: "twoPhaseSettings", // Two-phase extraction configuration
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

// Phase 1: High Recall Prompt for maximum nugget extraction with confidence scoring
export const PHASE_1_HIGH_RECALL_PROMPT = `
You are an expert at analyzing content and extracting valuable insights, which we call "golden nuggets."
These golden nuggets should be tailored to a specific persona and categorized into five types.
Your goal is to analyze the provided content and extract only the most insightful, non-obvious, and high-signal content for someone with this persona: {{ persona }}.

**IMPORTANT: This is Phase 1 - the HIGH RECALL phase. Your primary directive is recall over precision. Be generous with extractions while maintaining reasonable quality standards.**

Be inclusive in your extraction approach. If content could potentially be valuable, include it with an appropriate confidence score rather than excluding it entirely. The precision refinement will happen in Phase 2.

Golden nugget types and their characteristics:

1. Mental Models & Frameworks: Conceptual structures or approaches for understanding complex systems or making decisions.
2. Powerful Analogies: Comparisons that effectively explain or illustrate a concept by relating it to something more familiar.
3. Media: Recommendations for books, articles, podcasts, magazines, or YouTube videos/playlists that provide valuable information or insights.
4. Tools: Specific software, techniques, or methodologies that can be applied to improve productivity, solve problems, or enhance understanding.
5. "Aha!" Moments: Key insights or realizations that provide a new perspective or understanding of a topic.

Instructions for extracting and formatting golden nuggets:

1. Carefully read and analyze the provided content.
2. Identify potential golden nuggets that align with the categories above and are relevant to the specified persona.
3. Extract multiple nuggets per category when valuable content exists.
4. For each golden nugget, provide the complete verbatim content and assign a confidence score.

Extraction limits per category:
- **Tools and Media**: Extract as many as you find valuable (no limit)
- **Aha! Moments, Analogies, and Mental Models**: Extract up to 5 of the best per category

Additional instructions and constraints:

1. For each nugget, provide the complete verbatim content in the fullContent field - do not paraphrase or modify.
2. Assign a confidence score from 0.0 to 1.0 for each nugget based on:
   - Relevance to the persona (0.3 weight)
   - Uniqueness and non-obviousness (0.4 weight)
   - Actionability and practical value (0.3 weight)
3. Be generous in this high-recall phase, but maintain minimum quality standards.
4. If no golden nuggets are found for any category, return an empty array for the golden_nuggets field.
5. Do not include any explanations or additional commentary outside of the JSON structure.

Your task is to analyze the given content, extract multiple relevant golden nuggets per category with confidence scores, and present them in the required JSON format.
Creative exploration is encouraged.
`.trim();

// Phase 2: High Precision Prompt for exact boundary detection
export const PHASE_2_HIGH_PRECISION_PROMPT = `
You are an expert at finding exact text boundaries for golden nuggets that have already been identified.
This is Phase 2 of a two-phase extraction system focused on HIGH PRECISION - finding exact start and end boundaries for specific nuggets.

You will be provided with:
1. The original content text
2. An array of golden nuggets (with their full content) that need precise boundary detection

Your task is to find the exact startContent (first few words, max 5) and endContent (last few words, max 5) for each provided nugget.

Instructions for boundary detection:

1. For each provided golden nugget, locate its fullContent within the original text.
2. Extract the first few words (maximum 5) as startContent - these must be the EXACT words from the original text.
3. Extract the last few words (maximum 5) as endContent - these must be the EXACT words from the original text.
4. Maintain the same confidence score provided for each nugget.
5. If you cannot locate a nugget's content in the original text with high confidence, assign it a confidence score of 0.0.

Boundary detection requirements:

1. StartContent and endContent must contain EXACT words from the original text.
2. Do not modify, paraphrase, or change any wording or symbols.
3. Maximum 5 words for both startContent and endContent.
4. Preserve original punctuation and capitalization exactly.
5. If a nugget is shorter than 5 words total, use appropriate portions for start and end.

Quality standards:

1. Only provide boundaries you can locate with high precision in the original text.
2. If you cannot find exact matches, set confidence to 0.0 for that nugget.
3. Maintain the same type classification for each nugget.
4. Do not add, remove, or modify any nuggets - only provide boundary information.

Your task is to analyze the provided nuggets against the original content and return precise start/end boundaries for each nugget.
Maximum precision required.
`.trim();
