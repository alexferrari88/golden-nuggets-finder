/**
 * AnchorTextMatcher - Wrapper for dom-anchor-text-quote with fallback to fuzzy matching
 *
 * Provides progressive text matching strategy:
 * 1. Try exact anchor matching with context (dom-anchor-text-quote)
 * 2. Fallback to fuzzy matching (TextMatcher + DOMPositionMapper)
 * 3. Fallback to exact matching (legacy)
 */

import {
	type TextQuoteOptions,
	type TextQuoteSelector,
	toRange,
} from "dom-anchor-text-quote";
import { DOMPositionMapper } from "./dom-position-mapper";
import { TextMatcher } from "./text-matcher";

export interface AnchorMatchOptions {
	/** Hint offset to prioritize matches closer to this position */
	hint?: number;
	/** Minimum confidence threshold for fuzzy matches */
	minConfidence?: number;
	/** Whether to use optimized range merging for cross-node text */
	optimizeRanges?: boolean;
}

export interface AnchorMatchResult {
	ranges: Range[];
	matchType: "anchor" | "fuzzy" | "exact" | "none";
	confidence: number;
	matchedText?: string;
	error?: string;
}

export class AnchorTextMatcher {
	private textMatcher: TextMatcher;

	constructor() {
		this.textMatcher = new TextMatcher();
	}

	/**
	 * Find text with context using progressive matching strategy
	 * @param searchText The exact text to find
	 * @param prefix Optional prefix context for disambiguation
	 * @param suffix Optional suffix context for disambiguation
	 * @param options Additional matching options
	 * @returns Promise resolving to match result with ranges and metadata
	 */
	async findTextWithContext(
		searchText: string,
		prefix?: string,
		suffix?: string,
		options: AnchorMatchOptions = {},
	): Promise<AnchorMatchResult> {
		if (!searchText || searchText.trim().length === 0) {
			return {
				ranges: [],
				matchType: "none",
				confidence: 0,
				error: "Empty search text",
			};
		}

		const { hint, minConfidence = 0.5, optimizeRanges = true } = options;

		// Step 1: Try anchor-based matching with context
		const anchorResult = await this.tryAnchorMatching(
			searchText,
			prefix,
			suffix,
			hint,
		);
		if (anchorResult.ranges.length > 0) {
			return anchorResult;
		}

		// Step 2: Try fuzzy matching with DOM position mapping
		const fuzzyResult = await this.tryFuzzyMatching(
			searchText,
			minConfidence,
			optimizeRanges,
		);
		if (fuzzyResult.ranges.length > 0) {
			return fuzzyResult;
		}

		// Step 3: Fallback to exact matching (legacy approach)
		const exactResult = await this.tryExactMatching(searchText);
		if (exactResult.ranges.length > 0) {
			return exactResult;
		}

		return {
			ranges: [],
			matchType: "none",
			confidence: 0,
			error: "No matches found with any strategy",
		};
	}

	/**
	 * Try anchor-based matching using dom-anchor-text-quote
	 */
	private async tryAnchorMatching(
		searchText: string,
		prefix?: string,
		suffix?: string,
		hint?: number,
	): Promise<AnchorMatchResult> {
		try {
			const selector: TextQuoteSelector = {
				exact: searchText,
				...(prefix && { prefix }),
				...(suffix && { suffix }),
			};

			const anchorOptions: TextQuoteOptions =
				hint !== undefined ? { hint } : {};

			// Use dom-anchor-text-quote to find the range
			const range = toRange(document.body, selector, anchorOptions);

			if (range) {
				console.log("[AnchorTextMatcher] Anchor match found:", {
					searchText: searchText.substring(0, 50),
					hasPrefix: !!prefix,
					hasSuffix: !!suffix,
					rangeText: range.toString().substring(0, 50),
				});

				return {
					ranges: [range],
					matchType: "anchor",
					confidence: 1.0, // Exact anchor matches get highest confidence
					matchedText: range.toString(),
				};
			}

			console.log("[AnchorTextMatcher] Anchor matching failed:", {
				searchText: searchText.substring(0, 50),
				hasPrefix: !!prefix,
				hasSuffix: !!suffix,
			});

			return {
				ranges: [],
				matchType: "none",
				confidence: 0,
				error: "Anchor matching failed",
			};
		} catch (error) {
			console.warn("[AnchorTextMatcher] Anchor matching error:", error);
			return {
				ranges: [],
				matchType: "none",
				confidence: 0,
				error: `Anchor matching error: ${error instanceof Error ? error.message : "Unknown error"}`,
			};
		}
	}

	/**
	 * Try fuzzy matching using TextMatcher + DOMPositionMapper
	 */
	private async tryFuzzyMatching(
		searchText: string,
		minConfidence: number,
		optimizeRanges: boolean,
	): Promise<AnchorMatchResult> {
		try {
			const bodyText = document.body.textContent || "";
			const fuzzyMatch = this.textMatcher.findBestMatch(searchText, bodyText);

			if (!fuzzyMatch || fuzzyMatch.confidence < minConfidence) {
				console.log("[AnchorTextMatcher] Fuzzy match failed:", {
					searchText: searchText.substring(0, 50),
					hasMatch: !!fuzzyMatch,
					confidence: fuzzyMatch?.confidence || 0,
					minConfidence,
				});

				return {
					ranges: [],
					matchType: "none",
					confidence: fuzzyMatch?.confidence || 0,
					error: "Fuzzy match below confidence threshold",
				};
			}

			// Convert fuzzy match positions to DOM ranges
			const ranges = optimizeRanges
				? DOMPositionMapper.convertOffsetToRangeOptimized(
						fuzzyMatch.startIndex,
						fuzzyMatch.endIndex,
					)
				: DOMPositionMapper.convertOffsetToRange(
						fuzzyMatch.startIndex,
						fuzzyMatch.endIndex,
					);

			if (ranges.length === 0) {
				console.warn(
					"[AnchorTextMatcher] Failed to convert fuzzy match to DOM ranges:",
					{
						startIndex: fuzzyMatch.startIndex,
						endIndex: fuzzyMatch.endIndex,
						searchText: searchText.substring(0, 50),
					},
				);

				return {
					ranges: [],
					matchType: "none",
					confidence: fuzzyMatch.confidence,
					error: "Failed to convert fuzzy match to DOM ranges",
				};
			}

			console.log("[AnchorTextMatcher] Fuzzy match found:", {
				searchText: searchText.substring(0, 50),
				confidence: fuzzyMatch.confidence,
				rangeCount: ranges.length,
				matchedText: fuzzyMatch.matchedText.substring(0, 50),
			});

			return {
				ranges,
				matchType: "fuzzy",
				confidence: fuzzyMatch.confidence,
				matchedText: fuzzyMatch.matchedText,
			};
		} catch (error) {
			console.warn("[AnchorTextMatcher] Fuzzy matching error:", error);
			return {
				ranges: [],
				matchType: "none",
				confidence: 0,
				error: `Fuzzy matching error: ${error instanceof Error ? error.message : "Unknown error"}`,
			};
		}
	}

	/**
	 * Try exact matching as final fallback
	 */
	private async tryExactMatching(
		searchText: string,
	): Promise<AnchorMatchResult> {
		try {
			const bodyText = document.body.textContent || "";
			const searchLower = searchText.toLowerCase();
			const bodyLower = bodyText.toLowerCase();
			const startIndex = bodyLower.indexOf(searchLower);

			if (startIndex === -1) {
				console.log("[AnchorTextMatcher] Exact match failed:", {
					searchText: searchText.substring(0, 50),
					bodyLength: bodyText.length,
				});

				return {
					ranges: [],
					matchType: "none",
					confidence: 0,
					error: "Exact match not found",
				};
			}

			const endIndex = startIndex + searchText.length;
			const ranges = DOMPositionMapper.convertOffsetToRange(
				startIndex,
				endIndex,
			);

			if (ranges.length === 0) {
				console.warn(
					"[AnchorTextMatcher] Failed to convert exact match to DOM ranges:",
					{
						startIndex,
						endIndex,
						searchText: searchText.substring(0, 50),
					},
				);

				return {
					ranges: [],
					matchType: "none",
					confidence: 0.8, // High confidence but failed range conversion
					error: "Failed to convert exact match to DOM ranges",
				};
			}

			console.log("[AnchorTextMatcher] Exact match found:", {
				searchText: searchText.substring(0, 50),
				startIndex,
				endIndex,
				rangeCount: ranges.length,
			});

			return {
				ranges,
				matchType: "exact",
				confidence: 0.9, // High confidence for exact matches
				matchedText: bodyText.substring(startIndex, endIndex),
			};
		} catch (error) {
			console.warn("[AnchorTextMatcher] Exact matching error:", error);
			return {
				ranges: [],
				matchType: "none",
				confidence: 0,
				error: `Exact matching error: ${error instanceof Error ? error.message : "Unknown error"}`,
			};
		}
	}

	/**
	 * Validate if a match result meets the minimum requirements
	 */
	isValidMatch(
		result: AnchorMatchResult,
		minConfidence: number = 0.5,
	): boolean {
		return (
			result.ranges.length > 0 &&
			result.confidence >= minConfidence &&
			result.matchType !== "none"
		);
	}

	/**
	 * Get detailed statistics about a match result
	 */
	getMatchStats(result: AnchorMatchResult): {
		hasMatch: boolean;
		matchType: string;
		confidence: number;
		rangeCount: number;
		matchedLength: number;
		error?: string;
	} {
		return {
			hasMatch: result.ranges.length > 0,
			matchType: result.matchType,
			confidence: result.confidence,
			rangeCount: result.ranges.length,
			matchedLength: result.matchedText?.length || 0,
			...(result.error && { error: result.error }),
		};
	}

	/**
	 * Extract context around a text match for future anchor-based matching
	 * This can be used to improve future matches by providing better context
	 */
	static extractContext(
		text: string,
		matchStart: number,
		matchEnd: number,
		contextLength: number = 32,
	): { prefix: string; suffix: string } {
		const prefixStart = Math.max(0, matchStart - contextLength);
		const suffixEnd = Math.min(text.length, matchEnd + contextLength);

		const prefix = text.substring(prefixStart, matchStart);
		const suffix = text.substring(matchEnd, suffixEnd);

		return { prefix, suffix };
	}

	/**
	 * Debug utility to test all matching strategies on a piece of text
	 */
	async debugAllStrategies(
		searchText: string,
		prefix?: string,
		suffix?: string,
	): Promise<{
		anchor: AnchorMatchResult;
		fuzzy: AnchorMatchResult;
		exact: AnchorMatchResult;
		bestMatch: AnchorMatchResult;
	}> {
		const [anchorResult, fuzzyResult, exactResult] = await Promise.all([
			this.tryAnchorMatching(searchText, prefix, suffix),
			this.tryFuzzyMatching(searchText, 0.3, true),
			this.tryExactMatching(searchText),
		]);

		// Determine best match based on confidence and match type priority
		let bestMatch = exactResult;
		if (fuzzyResult.confidence > bestMatch.confidence) {
			bestMatch = fuzzyResult;
		}
		if (anchorResult.ranges.length > 0) {
			bestMatch = anchorResult; // Anchor matches always win when available
		}

		return {
			anchor: anchorResult,
			fuzzy: fuzzyResult,
			exact: exactResult,
			bestMatch,
		};
	}
}
