/**
 * Simplified Highlighter for Golden Nuggets - FullContent Direct Highlighting
 * Uses CSS Custom Highlight API with mark.js fallback
 * Eliminates complex boundary reconstruction by using fullContent directly
 */

import Mark from "mark.js";
import { colors } from "../../shared/design-system";
import type { GoldenNugget } from "../../shared/types";
import { TextMatcher } from "./text-matcher";

// Type declarations for CSS Custom Highlight API
declare global {
	interface Window {
		Highlight: typeof BrowserHighlight;
	}
	class BrowserHighlight {
		constructor(...ranges: Range[]);
		add(range: Range): void;
		clear(): void;
		delete(range: Range): boolean;
		readonly size: number;
	}
	interface CSS {
		highlights: Map<string, BrowserHighlight>;
	}
}

export class Highlighter {
	private highlightedElements: HTMLElement[] = [];
	private cssHighlights: Map<string, Range> = new Map();
	private cssHighlightSupported: boolean;
	private markInstance: Mark | null = null;
	private highlightClassName = "golden-nugget-highlight";
	private textMatcher: TextMatcher;

	constructor() {
		this.cssHighlightSupported = this.checkCSSHighlightSupport();
		this.setupCSSHighlightStyles();
		this.textMatcher = new TextMatcher(); // Add fuzzy matching

		// Initialize mark.js for fallback
		if (!this.cssHighlightSupported) {
			this.markInstance = new Mark(document.body);
		}
	}

	/**
	 * Highlight a golden nugget using direct fullContent search
	 * No boundary reconstruction needed - uses fullContent directly
	 */
	highlightNugget(nugget: GoldenNugget): boolean {
		try {
			// Direct text search using fullContent - no boundary reconstruction needed
			const fullContent = nugget.fullContent?.trim();
			console.log("fullContent:", JSON.stringify(fullContent));
			console.log("cssHighlightSupported:", this.cssHighlightSupported);

			if (!fullContent) {
				console.warn("No fullContent available for nugget:", nugget);
				return false;
			}

			if (this.cssHighlightSupported) {
				console.log("Using CSS Highlight API");
				return this.highlightWithCSSAPI(fullContent, nugget);
			} else {
				console.log("Using Mark.js fallback");
				return this.highlightWithMarkJS(fullContent, nugget);
			}
		} catch (error) {
			console.error("Failed to highlight nugget:", error);
			return false;
		}
	}

	/**
	 * Highlight using CSS Custom Highlight API (modern browsers)
	 */
	private highlightWithCSSAPI(
		fullContent: string,
		_nugget: GoldenNugget,
	): boolean {
		const ranges = this.findTextRanges(fullContent);
		if (ranges.length > 0) {
			const highlightId = `nugget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
			const highlight = new window.Highlight(...ranges);

			if (CSS?.highlights) {
				CSS.highlights.set(highlightId, highlight as any);

				// Store for cleanup
				ranges.forEach((range) => {
					this.cssHighlights.set(highlightId, range);
				});

				console.log(
					`CSS Highlighted "${fullContent.substring(0, 50)}..." with ${ranges.length} ranges`,
				);
				return true;
			}
		}
		return false;
	}

	/**
	 * Highlight using mark.js (fallback support) with enhanced fuzzy matching
	 */
	private highlightWithMarkJS(
		fullContent: string,
		_nugget: GoldenNugget,
	): boolean {
		console.log(
			"[Highlighter] Mark.js searching for:",
			JSON.stringify(fullContent.substring(0, 100)),
		);
		console.log(
			"[Highlighter] DOM text content:",
			JSON.stringify(document.body.textContent?.substring(0, 200) || ""),
		);

		if (this.markInstance) {
			try {
				// Use fuzzy matching first to find the best match
				const bodyText = document.body.textContent || "";
				const match = this.textMatcher.findBestMatch(fullContent, bodyText);

				if (!match || !this.textMatcher.isValidMatch(match)) {
					console.log(
						"[Highlighter] No valid fuzzy match found for Mark.js:",
						fullContent.substring(0, 50),
					);
					return false;
				}

				console.log("[Highlighter] Fuzzy match found for Mark.js:", {
					confidence: match.confidence,
					matchedText: match.matchedText.substring(0, 50),
				});

				// Use the actual matched text for mark.js highlighting
				const textToHighlight = match.matchedText;

				console.log(
					"[Highlighter] Initial highlightedElements count:",
					this.highlightedElements.length,
				);
				const initialElementCount = this.highlightedElements.length;

				// Highlight the fuzzy-matched text instead of the original fullContent
				this.markInstance.mark(textToHighlight, {
					className: this.highlightClassName,
					element: "span",
					separateWordSearch: false, // Exact phrase matching
					accuracy: "complementary", // More flexible matching than "exactly"
					caseSensitive: false, // Enable case-insensitive matching
					each: (element) => {
						console.log("Mark.js each callback called for element:", element);
						// Apply design system styling
						(element as HTMLElement).style.cssText = `
							background: ${colors.highlight.background};
							color: ${colors.text.primary};
							border-radius: 2px;
							padding: 0 2px;
						`;

						// Add to tracked elements for cleanup
						this.highlightedElements.push(element as HTMLElement);
						console.log(
							"Added element to tracking, new total:",
							this.highlightedElements.length,
							"Array contents:",
							this.highlightedElements.map((el) => el.tagName).join(", "),
						);
					},
					done: (totalMarks) => {
						console.log(
							"[Highlighter] Mark.js completed with",
							totalMarks,
							"marks",
						);
						console.log(
							"[Highlighter] Final highlightedElements count after mark:",
							this.highlightedElements.length,
						);
						if (totalMarks === 0) {
							console.log(
								"[Highlighter] Mark.js found no matches for:",
								textToHighlight,
							);
						}
					},
				});

				console.log(
					"[Highlighter] Immediately after mark call, highlightedElements count:",
					this.highlightedElements.length,
				);
				const newElementsAdded =
					this.highlightedElements.length - initialElementCount;
				console.log(
					`[Highlighter] Mark.js highlighted "${textToHighlight.substring(0, 50)}..." with ${newElementsAdded} new elements`,
				);

				// Also check by querying the DOM
				const domElements = document.querySelectorAll(
					`.${this.highlightClassName}`,
				);
				console.log(
					"[Highlighter] DOM elements with highlight class:",
					domElements.length,
				);

				return newElementsAdded > 0; // Return success based on elements added
			} catch (error) {
				console.error("[Highlighter] Mark.js highlighting failed:", error);
				console.error("[Highlighter] Error details:", error);
				return false;
			}
		}
		return false;
	}

	/**
	 * Find text ranges for CSS Custom Highlight API using enhanced fuzzy matching
	 * Uses TextMatcher for improved LLM text variation handling
	 */
	private findTextRanges(searchText: string): Range[] {
		const ranges: Range[] = [];
		const bodyText = document.body.textContent || "";

		console.log(
			"[Highlighter] Finding ranges for:",
			JSON.stringify(searchText.substring(0, 100)),
		);

		// Use fuzzy matching instead of simple indexOf
		const match = this.textMatcher.findBestMatch(searchText, bodyText);
		if (!match) {
			console.log(
				"[Highlighter] No fuzzy match found for:",
				searchText.substring(0, 50),
			);
			return ranges;
		}

		console.log("[Highlighter] Fuzzy match found:", {
			confidence: match.confidence,
			matchedText: match.matchedText.substring(0, 50),
			startIndex: match.startIndex,
			endIndex: match.endIndex,
		});

		// Convert fuzzy match position to DOM Range(s)
		const domRanges = this.convertPositionToRanges(
			match.startIndex,
			match.endIndex,
		);
		ranges.push(...domRanges);

		return ranges;
	}

	/**
	 * Convert global text positions to DOM Ranges
	 * Phase 1: Basic implementation for single-node text
	 * Phase 2 will enhance this for cross-node text spanning
	 */
	private convertPositionToRanges(
		startIndex: number,
		endIndex: number,
	): Range[] {
		const ranges: Range[] = [];

		const walker = document.createTreeWalker(
			document.body,
			NodeFilter.SHOW_TEXT,
			{
				acceptNode: (node: Text) => {
					// Skip script and style elements
					const parent = node.parentElement;
					if (
						parent &&
						(parent.tagName === "SCRIPT" || parent.tagName === "STYLE")
					) {
						return NodeFilter.FILTER_REJECT;
					}
					return NodeFilter.FILTER_ACCEPT;
				},
			},
		);

		// Build text node mapping with offsets
		const textNodes: Text[] = [];
		const textOffsets: number[] = [];
		let currentOffset = 0;

		let node: Text | null;
		while ((node = walker.nextNode() as Text | null)) {
			const text = node.textContent || "";
			textNodes.push(node);
			textOffsets.push(currentOffset);
			currentOffset += text.length;
		}

		// Find which text node(s) contain our target range
		for (let i = 0; i < textNodes.length; i++) {
			const nodeStartOffset = textOffsets[i];
			const nodeEndOffset =
				nodeStartOffset + (textNodes[i].textContent?.length || 0);

			// Check if this node overlaps with our target range
			if (nodeStartOffset < endIndex && nodeEndOffset > startIndex) {
				const localStart = Math.max(0, startIndex - nodeStartOffset);
				const localEnd = Math.min(
					textNodes[i].textContent?.length || 0,
					endIndex - nodeStartOffset,
				);

				// Only create range if we have valid positions within this node
				if (
					localStart < localEnd &&
					localEnd <= (textNodes[i].textContent?.length || 0)
				) {
					try {
						const range = document.createRange();
						range.setStart(textNodes[i], localStart);
						range.setEnd(textNodes[i], localEnd);
						ranges.push(range);

						console.log("[Highlighter] Created range in node:", {
							nodeText: textNodes[i].textContent?.substring(0, 30),
							localStart,
							localEnd,
							rangeText: textNodes[i].textContent?.substring(
								localStart,
								localEnd,
							),
						});
					} catch (error) {
						console.warn("[Highlighter] Failed to create range:", error);
					}
				}
			}
		}

		return ranges;
	}

	/**
	 * Clear all highlights
	 */
	clearHighlights(): void {
		// Clear CSS Custom Highlights
		if (this.cssHighlightSupported && CSS && CSS.highlights) {
			CSS.highlights.clear();
		}
		this.cssHighlights.clear();

		// Clear mark.js highlights
		if (this.markInstance) {
			this.markInstance.unmark({
				className: this.highlightClassName,
			});
		}

		// Clear tracked DOM elements
		this.highlightedElements.forEach((element) => {
			try {
				element.remove();
			} catch (error) {
				console.warn("Failed to remove highlighted element:", error);
			}
		});
		this.highlightedElements = [];

		console.log("All highlights cleared");
	}

	/**
	 * Check if CSS Custom Highlight API is supported
	 */
	private checkCSSHighlightSupport(): boolean {
		return (
			typeof window !== "undefined" &&
			"CSS" in window &&
			"highlights" in CSS &&
			"Highlight" in window
		);
	}

	/**
	 * Setup CSS styles for Custom Highlight API
	 */
	private setupCSSHighlightStyles(): void {
		if (!this.cssHighlightSupported) return;

		// Create or update the style element for custom highlights
		const styleId = "golden-nugget-highlight-styles";
		let styleElement = document.getElementById(styleId);

		if (!styleElement) {
			styleElement = document.createElement("style");
			styleElement.id = styleId;
			document.head.appendChild(styleElement);
		}

		// Use design system colors for consistent styling
		styleElement.textContent = `
			::highlight(golden-nugget) {
				background-color: ${colors.highlight.background};
				color: ${colors.text.primary};
			}
		`;
	}

	/**
	 * Get highlight statistics
	 */
	getHighlightStats(): {
		cssHighlights: number;
		domHighlights: number;
		supported: boolean;
	} {
		console.log("Highlight stats:", {
			cssHighlights: this.cssHighlights.size,
			domHighlights: this.highlightedElements.length,
			supported: this.cssHighlightSupported,
		});
		return {
			cssHighlights: this.cssHighlights.size,
			domHighlights: this.highlightedElements.length,
			supported: this.cssHighlightSupported,
		};
	}

	/**
	 * Cleanup resources
	 */
	destroy(): void {
		this.clearHighlights();

		// Cleanup mark.js instance
		if (this.markInstance) {
			this.markInstance = null;
		}

		// Remove CSS highlight styles
		const styleElement = document.getElementById(
			"golden-nugget-highlight-styles",
		);
		if (styleElement) {
			styleElement.remove();
		}

		console.log("Highlighter destroyed and cleaned up");
	}
}
