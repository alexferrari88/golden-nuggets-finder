import {
	type EnhancedMatchResult,
	enhancedTextMatching,
} from "./enhanced-text-matching";
import {
	enhancedGetDisplayContent,
	enhancedGetNormalizedContent,
	enhancedReconstructFullContent,
	FeatureFlags,
} from "./enhanced-text-matching-adapter";
import type { GoldenNugget } from "./types";

/**
 * Utility functions for reconstructing full content from startContent and endContent
 * by finding matching text within the source page content.
 */

/**
 * Sanitizes endContent by removing hallucinated trailing punctuation and whitespace
 * that LLMs sometimes add to the end of extracted content.
 *
 * @param endContent - The endContent string to sanitize
 * @returns Sanitized endContent without trailing punctuation/whitespace
 */
export function sanitizeEndContent(endContent: string): string {
	// Handle null/undefined input gracefully
	if (!endContent || typeof endContent !== "string") {
		return "";
	}

	// First check if this looks like a filename with space before extension
	// Pattern: "<filename>. <extension>" -> "<filename>.<extension>"
	// Use common file extensions to avoid false positives
	const commonExtensions =
		/^(.+)\.\s+(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|jpg|jpeg|png|gif|bmp|svg|mp4|avi|mov|mp3|wav|zip|rar|tar|gz|json|xml|csv|html|css|js|ts|py|java|cpp|c|h|r|sql|md|yaml|yml|log|cfg|ini|bak|tmp|backup|bak2)$/i;
	const filenameMatch = endContent.match(commonExtensions);

	if (filenameMatch) {
		// Fix filename by removing space between dot and extension
		const [, filename, extension] = filenameMatch;
		return `${filename}.${extension}`;
	}

	// Enhanced punctuation and quote normalization for better matching
	let sanitized = endContent;

	// Step 1: Normalize quote characters for consistent matching
	// Convert smart quotes and multiple quotes to standard quotes
	sanitized = sanitized
		.replace(/[\u201C\u201D]/g, '"') // Smart double quotes to standard (Unicode)
		.replace(/[\u2018\u2019]/g, "'") // Smart single quotes to standard (Unicode)
		.replace(/"{2,}/g, '"') // Multiple double quotes to single
		.replace(/'{2,}/g, "'") // Multiple single quotes to single
		.replace(/&quot;/g, '"') // HTML entities
		.replace(/&#39;/g, "'")
		.replace(/&apos;/g, "'");

	// Step 2: Aggressive punctuation and quote stripping for robust endContent matching
	//
	// RATIONALE: LLMs frequently hallucinate punctuation details (e.g., "observations."" vs "observations?")
	// For boundary matching, we ignore ALL trailing punctuation/quotes and focus on semantic content
	// This is more reliable than trying to normalize punctuation equivalencies
	//
	// Examples this handles:
	// "these observations.""  → "these observations"
	// "these observations?"   → "these observations"
	// "these observations!"   → "these observations"
	// "these observations.;:" → "these observations"

	// Strip ALL trailing punctuation, quotes, and whitespace aggressively
	// This regex matches any combination of punctuation and quotes at the end
	// Use escaped quotes to avoid parsing issues
	sanitized = sanitized.replace(/[.!?;:,"'\s]+$/, "").trim();

	// Handle edge case: if content becomes too short after stripping (e.g., "Mr." → "Mr")
	// keep minimal content but still strip problematic punctuation that causes matching issues
	if (sanitized.length > 0 && sanitized.length < 3) {
		// For very short content, only strip the most problematic punctuation that LLMs hallucinate
		// Keep structure-preserving punctuation like periods in abbreviations
		const originalLength = endContent.length;
		if (originalLength - sanitized.length > 3) {
			// If we stripped more than 3 characters, we probably over-stripped
			// Restore some content but still remove trailing quote/punctuation variations
			sanitized = endContent.replace(/[.!?]+['""]*\s*$/, "").trim();
		}
	}

	// If the entire string was just punctuation/whitespace, return empty string
	return sanitized;
}

/**
 * Advanced text normalization for matching with comprehensive Unicode handling.
 * Handles all common Unicode character variants that can cause matching failures.
 */
export function advancedNormalize(text: string): string {
	// Handle null/undefined input gracefully
	if (!text || typeof text !== "string") {
		return "";
	}

	return text
		.toLowerCase()
		.replace(/[''`´]/g, "'") // All apostrophe variants
		.replace(/[""«»]/g, '"') // All quote variants
		.replace(/[–—−]/g, "-") // All dash variants
		.replace(/[…]/g, "...") // Ellipsis normalization
		.replace(/\s+/g, " ") // Normalize whitespace
		.trim();
}

/**
 * Creates a case-insensitive regex pattern that handles Unicode character variants.
 * Similar to advancedNormalize but creates flexible regex patterns instead of normalizing.
 *
 * @param text - The text to convert to a flexible regex pattern
 * @returns RegExp that matches the text with Unicode variant flexibility
 */
function createUnicodeFlexibleRegex(text: string): RegExp {
	// Escape special regex characters first
	let pattern = text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

	// Replace Unicode variants with character classes (same as advancedNormalize)
	pattern = pattern
		.replace(/[''`´]/g, "[''`´]") // All apostrophe variants
		.replace(/[""«»]/g, '[""«»]') // All quote variants
		.replace(/[–—−]/g, "[–—−-]") // All dash variants (include regular hyphen)
		.replace(/[…]/g, "(\\.{3}|…)") // Ellipsis variants (three dots or Unicode ellipsis)
		.replace(/\s+/g, "\\s+"); // Flexible whitespace matching

	return new RegExp(pattern, "i"); // Case-insensitive flag
}

/**
 * Legacy normalizeText function - kept for backward compatibility
 * @deprecated Use advancedNormalize instead
 */
function normalizeText(text: string): string {
	return advancedNormalize(text);
}

/**
 * Find text that starts with startContent and ends with endContent within searchText.
 * Now uses case-preserving approach that maintains original text casing.
 */
function findTextBetweenStartAndEnd(
	startContent: string,
	endContent: string,
	searchText: string,
): string | null {
	// Use the new case-preserving function that handles Unicode variants
	// and maintains original casing from searchText
	return findTextWithOriginalCasing(startContent, endContent, searchText);
}

/**
 * Find text between startContent and endContent while preserving original casing.
 * Uses regex-based approach to maintain original text casing from searchText.
 *
 * @param startContent - The start content to find
 * @param endContent - The end content to find
 * @param searchText - The original text to search within
 * @returns The original text between boundaries, or null if not found
 */
function findTextWithOriginalCasing(
	startContent: string,
	endContent: string,
	searchText: string,
): string | null {
	// Validate inputs before processing
	if (
		!startContent ||
		!endContent ||
		!searchText ||
		typeof startContent !== "string" ||
		typeof endContent !== "string" ||
		typeof searchText !== "string"
	) {
		return null;
	}

	try {
		// Sanitize endContent to remove hallucinated punctuation/spaces
		const sanitizedEndContent = sanitizeEndContent(endContent);
		if (!sanitizedEndContent) {
			return null;
		}

		// Step 1: Validate using original normalization approach (ensures reliability)
		const normalizedSearch = normalizeText(searchText);
		const normalizedStart = normalizeText(startContent);
		const normalizedEnd = normalizeText(sanitizedEndContent);

		// Find start position in normalized text for validation
		const startIndex = normalizedSearch.indexOf(normalizedStart);
		if (startIndex === -1) return null;

		// Find end position in normalized text for validation
		const searchFromIndex = startIndex + normalizedStart.length;
		const endIndex = normalizedSearch.indexOf(normalizedEnd, searchFromIndex);
		if (endIndex === -1) return null;

		// Step 2: Create flexible regex patterns that handle Unicode variants
		const startPattern = createUnicodeFlexibleRegex(startContent);
		const endPattern = createUnicodeFlexibleRegex(sanitizedEndContent);

		// Step 3: Find start position in original text using case-insensitive regex
		const startMatch = searchText.match(startPattern);
		if (!startMatch || startMatch.index === undefined) {
			// Fallback to normalized result if regex search fails
			const endEndIndex = endIndex + normalizedEnd.length;
			return normalizedSearch.substring(startIndex, endEndIndex);
		}

		const originalStartIndex = startMatch.index;
		const searchFromOriginalIndex = originalStartIndex + startMatch[0].length;

		// Step 4: Find end position in remaining original text
		const remainingText = searchText.substring(searchFromOriginalIndex);
		const endMatch = remainingText.match(endPattern);
		if (!endMatch || endMatch.index === undefined) {
			// Fallback to normalized result if end pattern not found
			const endEndIndex = endIndex + normalizedEnd.length;
			return normalizedSearch.substring(startIndex, endEndIndex);
		}

		const originalEndIndex =
			searchFromOriginalIndex + endMatch.index + endMatch[0].length;

		// Step 5: Extract substring from original text preserving case
		return searchText.substring(originalStartIndex, originalEndIndex);
	} catch (error) {
		// Fallback to original normalization behavior on any error
		console.warn(
			"findTextWithOriginalCasing failed, falling back to normalized approach:",
			error,
		);
		const normalizedSearch = normalizeText(searchText);
		const normalizedStart = normalizeText(startContent);
		const normalizedEnd = normalizeText(endContent);

		const startIndex = normalizedSearch.indexOf(normalizedStart);
		if (startIndex === -1) return null;

		const searchFromIndex = startIndex + normalizedStart.length;
		const endIndex = normalizedSearch.indexOf(normalizedEnd, searchFromIndex);
		if (endIndex === -1) return null;

		const endEndIndex = endIndex + normalizedEnd.length;
		return normalizedSearch.substring(startIndex, endEndIndex);
	}
}

/**
 * Reconstructs the full content from startContent and endContent by finding
 * the matching text in the provided page content.
 *
 * @param nugget - The golden nugget with startContent and endContent
 * @param pageContent - The full page content to search within
 * @returns The reconstructed full content, or fallback to startContent...endContent
 */
export function reconstructFullContent(
	nugget: GoldenNugget,
	pageContent: string,
): string {
	// Validate inputs to prevent errors with malformed data
	if (!nugget || !nugget.startContent || !nugget.endContent || !pageContent) {
		return nugget?.startContent && nugget?.endContent
			? `${nugget.startContent}...${nugget.endContent}`
			: "";
	}

	const foundText = findTextBetweenStartAndEnd(
		nugget.startContent,
		nugget.endContent,
		pageContent,
	);
	return foundText || `${nugget.startContent}...${nugget.endContent}`;
}

/**
 * Gets display content for a nugget, attempting to reconstruct the full content
 * if page content is available, otherwise falling back to the truncated version.
 *
 * @param nugget - The golden nugget
 * @param pageContent - Optional page content for reconstruction
 * @returns Display-ready content string
 */
export function getDisplayContent(
	nugget: GoldenNugget,
	pageContent?: string,
): string {
	// Validate nugget data to prevent errors
	if (!nugget || !nugget.startContent || !nugget.endContent) {
		return "";
	}

	if (pageContent && typeof pageContent === "string") {
		const reconstructed = reconstructFullContent(nugget, pageContent);
		// Only use reconstructed content if it's significantly longer than the truncated version
		if (
			reconstructed &&
			reconstructed.length >
				nugget.startContent.length + nugget.endContent.length + 10
		) {
			return reconstructed;
		}
	}
	return `${nugget.startContent}...${nugget.endContent}`;
}

/**
 * Gets normalized content for a nugget, attempting to reconstruct and normalize
 * the full content for better matching.
 *
 * @param nugget - The golden nugget
 * @param pageContent - Optional page content for reconstruction
 * @returns Normalized content string for matching purposes
 */
export function getNormalizedContent(
	nugget: GoldenNugget,
	pageContent?: string,
): string {
	if (pageContent) {
		const reconstructed = reconstructFullContent(nugget, pageContent);
		if (
			reconstructed &&
			reconstructed.length >
				nugget.startContent.length + nugget.endContent.length + 10
		) {
			return normalizeText(reconstructed);
		}
	}
	// Fallback: normalize the start...end pattern
	return normalizeText(`${nugget.startContent} ${nugget.endContent}`);
}

/**
 * Match result interface for the improved search algorithm
 */
export interface MatchResult {
	success: boolean;
	found: boolean; // Added for compatibility with existing tests
	reason?: string;
	startIndex?: number;
	endIndex?: number;
	matchedContent?: string;
	performanceMs?: number; // Added for adapter compatibility
}

/**
 * Improved start/end matching algorithm with enhanced search logic.
 * Fixes algorithm bugs and handles Unicode character variants.
 *
 * @param startContent - The start content to find
 * @param endContent - The end content to find
 * @param pageContent - The page content to search within
 * @returns MatchResult with success status and match details
 */
export function improvedStartEndMatching(
	startContent: string,
	endContent: string,
	pageContent: string,
): MatchResult {
	// Sanitize endContent to remove hallucinated punctuation/spaces
	const sanitizedEndContent = sanitizeEndContent(endContent);
	if (!sanitizedEndContent) {
		return {
			success: false,
			found: false,
			reason: "End content is empty after sanitization",
		};
	}

	const normalizedText = advancedNormalize(pageContent);
	const normalizedStart = advancedNormalize(startContent);
	const normalizedEnd = advancedNormalize(sanitizedEndContent);

	const startIndex = normalizedText.indexOf(normalizedStart);
	if (startIndex === -1) {
		return { success: false, found: false, reason: "Start content not found" };
	}

	const endSearchStart = startIndex + normalizedStart.length;
	const endIndex = normalizedText.indexOf(normalizedEnd, endSearchStart);
	if (endIndex === -1) {
		return {
			success: false,
			found: false,
			reason: "End content not found after start",
		};
	}

	return {
		success: true,
		found: true,
		startIndex,
		endIndex: endIndex + normalizedEnd.length,
		matchedContent: normalizedText.substring(
			startIndex,
			endIndex + normalizedEnd.length,
		),
	};
}

/**
 * Enhanced text matching using start/end content approach with multiple strategies.
 *
 * @param nugget - The golden nugget to match
 * @param searchText - The text to search within
 * @returns True if the nugget content matches the search text
 * @deprecated Use improvedStartEndMatching instead for better error reporting
 */
export function improvedStartEndTextMatching(
	nugget: GoldenNugget,
	searchText: string,
): boolean {
	// Validate inputs to prevent errors
	if (!nugget || !nugget.startContent || !nugget.endContent || !searchText) {
		return false;
	}

	// Sanitize endContent to remove hallucinated punctuation/spaces
	const sanitizedEndContent = sanitizeEndContent(nugget.endContent);
	if (!sanitizedEndContent) {
		return false;
	}

	const normalizedSearch = normalizeText(searchText);
	const normalizedStart = normalizeText(nugget.startContent);
	const normalizedEnd = normalizeText(sanitizedEndContent);

	// Strategy 1: Check if both start and end content exist in the text
	const hasStart = normalizedSearch.includes(normalizedStart);
	const hasEnd = normalizedSearch.includes(normalizedEnd);

	if (hasStart && hasEnd) {
		// Verify they appear in the correct order
		const startIndex = normalizedSearch.indexOf(normalizedStart);
		const endIndex = normalizedSearch.lastIndexOf(normalizedEnd);
		return startIndex < endIndex;
	}

	// Strategy 2: If we can't find both, try the full reconstructed content approach
	const reconstructed = findTextBetweenStartAndEnd(
		nugget.startContent,
		sanitizedEndContent,
		searchText,
	);
	if (reconstructed) {
		return true;
	}

	// Strategy 3: Fallback to partial matching - at least 80% of start words and 80% of end words
	const startWords = normalizedStart
		.split(" ")
		.filter((word) => word.length > 2);
	const endWords = normalizedEnd.split(" ").filter((word) => word.length > 2);
	const searchWords = normalizedSearch.split(" ");

	const startMatches = startWords.filter((word) => searchWords.includes(word));
	const endMatches = endWords.filter((word) => searchWords.includes(word));

	const startMatchRatio = startMatches.length / Math.max(startWords.length, 1);
	const endMatchRatio = endMatches.length / Math.max(endWords.length, 1);

	return startMatchRatio >= 0.8 && endMatchRatio >= 0.8;
}

// =====================================================================
// ENHANCED TEXT MATCHING INTEGRATION
// =====================================================================

/**
 * Enhanced version of improvedStartEndMatching using the new robust system
 * Provides better handling of LLM hallucinations and Unicode variants
 *
 * @param startContent - The start content to find
 * @param endContent - The end content to find
 * @param pageContent - The page content to search within
 * @returns Enhanced match result with detailed information
 */
export async function improvedStartEndMatchingV2(
	startContent: string,
	endContent: string,
	pageContent: string,
): Promise<EnhancedMatchResult> {
	// Check if enhanced matching is enabled
	if (FeatureFlags.getStatus().useEnhancedMatching) {
		try {
			const result = await enhancedTextMatching(
				startContent,
				endContent,
				pageContent,
			);

			// Add performance comparison logging if enabled
			if (FeatureFlags.getStatus().enablePerformanceComparison) {
				const originalResult = improvedStartEndMatching(
					startContent,
					endContent,
					pageContent,
				);
				console.log("Enhanced vs Original matching comparison:", {
					enhanced: {
						success: result.success,
						strategy: result.strategy,
						confidence: result.confidence,
						performanceMs: result.performanceMs,
					},
					original: {
						success: originalResult.success,
						reason: originalResult.reason,
					},
				});
			}

			return result;
		} catch (error) {
			console.warn(
				"Enhanced matching failed, falling back to original:",
				error,
			);
		}
	}

	// Fallback to original implementation
	const originalResult = improvedStartEndMatching(
		startContent,
		endContent,
		pageContent,
	);

	// Convert to enhanced format for consistency
	return {
		success: originalResult.success,
		strategy: "exact" as const,
		confidence: originalResult.success ? 0.95 : 0,
		startIndex: originalResult.startIndex || -1,
		endIndex: originalResult.endIndex || -1,
		matchedContent: originalResult.matchedContent || "",
		reason: originalResult.reason,
	};
}

/**
 * Enhanced version of reconstructFullContent with better LLM hallucination handling
 * Uses the new robust text matching system for improved accuracy
 *
 * @param nugget - The golden nugget with startContent and endContent
 * @param pageContent - The full page content to search within
 * @returns The reconstructed full content with enhanced accuracy
 */
export async function reconstructFullContentV2(
	nugget: GoldenNugget,
	pageContent: string,
): Promise<string> {
	// Check if enhanced matching is enabled
	if (FeatureFlags.getStatus().useEnhancedMatching) {
		try {
			return await enhancedReconstructFullContent(nugget, pageContent);
		} catch (error) {
			console.warn(
				"Enhanced content reconstruction failed, falling back to original:",
				error,
			);
		}
	}

	// Fallback to original implementation
	return reconstructFullContent(nugget, pageContent);
}

/**
 * Enhanced version of getDisplayContent with improved content reconstruction
 * Provides better content display through enhanced matching algorithms
 *
 * @param nugget - The golden nugget
 * @param pageContent - Optional page content for reconstruction
 * @returns Enhanced display content
 */
export async function getDisplayContentV2(
	nugget: GoldenNugget,
	pageContent?: string,
): Promise<string> {
	// Check if enhanced matching is enabled
	if (FeatureFlags.getStatus().useEnhancedMatching) {
		try {
			return await enhancedGetDisplayContent(nugget, pageContent);
		} catch (error) {
			console.warn(
				"Enhanced display content failed, falling back to original:",
				error,
			);
		}
	}

	// Fallback to original implementation
	return getDisplayContent(nugget, pageContent);
}

/**
 * Enhanced version of getNormalizedContent with better text processing
 * Uses advanced normalization and reconstruction for improved matching
 *
 * @param nugget - The golden nugget
 * @param pageContent - Optional page content for reconstruction
 * @returns Enhanced normalized content
 */
export async function getNormalizedContentV2(
	nugget: GoldenNugget,
	pageContent?: string,
): Promise<string> {
	// Check if enhanced matching is enabled
	if (FeatureFlags.getStatus().useEnhancedMatching) {
		try {
			return await enhancedGetNormalizedContent(nugget, pageContent);
		} catch (error) {
			console.warn(
				"Enhanced normalized content failed, falling back to original:",
				error,
			);
		}
	}

	// Fallback to original implementation
	return getNormalizedContent(nugget, pageContent);
}

/**
 * Enhanced batch processing for multiple nuggets
 * Optimizes performance by batching enhanced matching operations
 *
 * @param nuggets - Array of golden nuggets to process
 * @param pageContent - The page content to search within
 * @returns Array of enhanced match results
 */
export async function batchEnhancedMatching(
	nuggets: GoldenNugget[],
	pageContent: string,
): Promise<EnhancedMatchResult[]> {
	const results: EnhancedMatchResult[] = [];

	// Process nuggets in batches for better performance
	const batchSize = 10;
	for (let i = 0; i < nuggets.length; i += batchSize) {
		const batch = nuggets.slice(i, i + batchSize);

		const batchPromises = batch.map((nugget) =>
			improvedStartEndMatchingV2(
				nugget.startContent,
				nugget.endContent,
				pageContent,
			),
		);

		const batchResults = await Promise.all(batchPromises);
		results.push(...batchResults);
	}

	return results;
}

/**
 * Migration utility to compare original vs enhanced results
 * Useful for testing and gradual rollout of enhanced system
 *
 * @param nugget - The golden nugget to test
 * @param pageContent - The page content to search within
 * @returns Comparison results for analysis
 */
export async function compareMatchingMethods(
	nugget: GoldenNugget,
	pageContent: string,
): Promise<{
	original: MatchResult;
	enhanced: EnhancedMatchResult;
	agreement: boolean;
	recommendation: "use_original" | "use_enhanced" | "equivalent";
}> {
	// Test original method
	const originalStart = performance.now();
	const original = improvedStartEndMatching(
		nugget.startContent,
		nugget.endContent,
		pageContent,
	);
	const originalTime = performance.now() - originalStart;

	// Test enhanced method
	const enhancedStart = performance.now();
	const enhanced = await improvedStartEndMatchingV2(
		nugget.startContent,
		nugget.endContent,
		pageContent,
	);
	const enhancedTime = performance.now() - enhancedStart;

	// Determine agreement
	const agreement = original.success === enhanced.success;

	// Make recommendation
	let recommendation: "use_original" | "use_enhanced" | "equivalent" =
		"equivalent";

	if (enhanced.success && !original.success) {
		recommendation = "use_enhanced";
	} else if (original.success && !enhanced.success) {
		recommendation = "use_original";
	} else if (enhanced.success && original.success) {
		// Both succeeded - prefer enhanced if confident and not significantly slower
		if (enhanced.confidence > 0.8 && enhancedTime < originalTime * 1.5) {
			recommendation = "use_enhanced";
		} else {
			recommendation = "use_original";
		}
	}

	return {
		original: { ...original, performanceMs: originalTime },
		enhanced: { ...enhanced, performanceMs: enhancedTime },
		agreement,
		recommendation,
	};
}

/**
 * Feature flag helpers for content reconstruction
 */
export const ContentReconstructionFeatures = {
	/**
	 * Enable enhanced content reconstruction globally
	 */
	enableEnhanced(): void {
		FeatureFlags.enableEnhancedMatching();
		console.log("Enhanced content reconstruction enabled");
	},

	/**
	 * Disable enhanced content reconstruction globally
	 */
	disableEnhanced(): void {
		FeatureFlags.disableEnhancedMatching();
		console.log("Enhanced content reconstruction disabled");
	},

	/**
	 * Get current feature status
	 */
	getStatus(): {
		enhanced: boolean;
		fallback: boolean;
		performanceComparison: boolean;
	} {
		const status = FeatureFlags.getStatus();
		return {
			enhanced: status.useEnhancedMatching,
			fallback: status.enableFallback,
			performanceComparison: status.enablePerformanceComparison,
		};
	},

	/**
	 * Test enhanced system with sample data
	 */
	async testEnhanced(
		startContent: string,
		endContent: string,
		pageContent: string,
	): Promise<{
		success: boolean;
		performance: number;
		details: EnhancedMatchResult;
	}> {
		const startTime = performance.now();
		const result = await improvedStartEndMatchingV2(
			startContent,
			endContent,
			pageContent,
		);
		const endTime = performance.now();

		return {
			success: result.success,
			performance: endTime - startTime,
			details: result,
		};
	},
};
