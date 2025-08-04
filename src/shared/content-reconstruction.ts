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

	// Remove trailing punctuation and whitespace using regex
	// This matches any combination of punctuation (.,!;:?) and whitespace at the end
	const sanitized = endContent.replace(/[.,!;:?\s]+$/, "").trim();

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
	reason?: string;
	startIndex?: number;
	endIndex?: number;
	matchedContent?: string;
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
			reason: "End content is empty after sanitization",
		};
	}

	const normalizedText = advancedNormalize(pageContent);
	const normalizedStart = advancedNormalize(startContent);
	const normalizedEnd = advancedNormalize(sanitizedEndContent);

	const startIndex = normalizedText.indexOf(normalizedStart);
	if (startIndex === -1) {
		return { success: false, reason: "Start content not found" };
	}

	const endSearchStart = startIndex + normalizedStart.length;
	const endIndex = normalizedText.indexOf(normalizedEnd, endSearchStart);
	if (endIndex === -1) {
		return { success: false, reason: "End content not found after start" };
	}

	return {
		success: true,
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
