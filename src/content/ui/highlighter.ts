/**
 * Simplified Highlighter for Golden Nuggets - FullContent Direct Highlighting
 * Uses CSS Custom Highlight API with mark.js fallback
 * Eliminates complex boundary reconstruction by using fullContent directly
 */

import Mark from "mark.js";
import { colors } from "../../shared/design-system";
import type { GoldenNugget } from "../../shared/types";
import { AnchorTextMatcher } from "./anchor-text-matcher";
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
	private anchorTextMatcher: AnchorTextMatcher;

	constructor() {
		this.cssHighlightSupported = this.checkCSSHighlightSupport();
		this.setupCSSHighlightStyles();
		this.textMatcher = new TextMatcher(); // Add fuzzy matching
		this.anchorTextMatcher = new AnchorTextMatcher(); // Add anchor-based matching

		// Initialize mark.js for fallback
		if (!this.cssHighlightSupported) {
			this.markInstance = new Mark(document.body);
		}
	}

	/**
	 * Highlight a golden nugget using progressive matching strategy
	 * 1. Try anchor-based matching with context
	 * 2. Fallback to fuzzy matching
	 * 3. Fallback to exact matching
	 */
	async highlightNugget(nugget: GoldenNugget): Promise<boolean> {
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
				console.log("Using CSS Highlight API with progressive matching");
				return await this.highlightWithCSSAPI(fullContent, nugget);
			} else {
				console.log("Using Mark.js fallback with progressive matching");
				return await this.highlightWithMarkJS(fullContent, nugget);
			}
		} catch (error) {
			console.error("Failed to highlight nugget:", error);
			return false;
		}
	}

	/**
	 * Highlight using CSS Custom Highlight API (modern browsers) with progressive matching
	 */
	private async highlightWithCSSAPI(
		fullContent: string,
		_nugget: GoldenNugget,
	): Promise<boolean> {
		const ranges = await this.findTextRangesProgressive(fullContent);
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
	 * Highlight using mark.js (fallback support) with progressive matching strategy
	 */
	private async highlightWithMarkJS(
		fullContent: string,
		_nugget: GoldenNugget,
	): Promise<boolean> {
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
				// Use progressive matching strategy
				const matchResult =
					await this.anchorTextMatcher.findTextWithContext(fullContent);

				if (!this.anchorTextMatcher.isValidMatch(matchResult)) {
					console.log(
						"[Highlighter] No valid match found with progressive strategy for Mark.js:",
						fullContent.substring(0, 50),
					);
					return false;
				}

				console.log("[Highlighter] Progressive match found for Mark.js:", {
					matchType: matchResult.matchType,
					confidence: matchResult.confidence,
					matchedText: matchResult.matchedText?.substring(0, 50),
					rangeCount: matchResult.ranges.length,
				});

				// Use the actual matched text for mark.js highlighting
				const textToHighlight = matchResult.matchedText || fullContent;

				console.log(
					"[Highlighter] Initial highlightedElements count:",
					this.highlightedElements.length,
				);
				const initialElementCount = this.highlightedElements.length;

				// Highlight the fuzzy-matched text instead of the original fullContent
				this.markInstance.mark(textToHighlight, {
					className: this.highlightClassName,
					element: "span",
					acrossElements: true, // Enable cross-node highlighting
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
	 * Find text ranges using progressive matching strategy:
	 * 1. Try anchor-based matching with context (dom-anchor-text-quote)
	 * 2. Fallback to fuzzy matching (TextMatcher + DOMPositionMapper)
	 * 3. Fallback to exact matching (legacy)
	 */
	private async findTextRangesProgressive(
		searchText: string,
	): Promise<Range[]> {
		console.log(
			"[Highlighter] Finding ranges with progressive matching for:",
			JSON.stringify(searchText.substring(0, 100)),
		);

		// Use progressive matching strategy from AnchorTextMatcher
		const matchResult =
			await this.anchorTextMatcher.findTextWithContext(searchText);

		if (!this.anchorTextMatcher.isValidMatch(matchResult)) {
			console.log(
				"[Highlighter] No valid match found with progressive strategy:",
				searchText.substring(0, 50),
			);
			return [];
		}

		console.log("[Highlighter] Progressive match found:", {
			matchType: matchResult.matchType,
			confidence: matchResult.confidence,
			matchedText: matchResult.matchedText?.substring(0, 50),
			rangeCount: matchResult.ranges.length,
		});

		// Return the ranges from the progressive matching strategy
		return matchResult.ranges;
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
