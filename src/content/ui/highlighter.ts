/**
 * Simplified Highlighter for Golden Nuggets - FullContent Direct Highlighting
 * Uses CSS Custom Highlight API with mark.js fallback
 * Eliminates complex boundary reconstruction by using fullContent directly
 */

import Mark from "mark.js";
import { colors } from "../../shared/design-system";
import type { GoldenNugget } from "../../shared/types";

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

	constructor() {
		this.cssHighlightSupported = this.checkCSSHighlightSupport();
		this.setupCSSHighlightStyles();

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
			if (!fullContent) {
				console.warn("No fullContent available for nugget:", nugget);
				return false;
			}

			if (this.cssHighlightSupported) {
				return this.highlightWithCSSAPI(fullContent, nugget);
			} else {
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
				CSS.highlights.set(highlightId, highlight);

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
	 * Highlight using mark.js (fallback support)
	 */
	private highlightWithMarkJS(
		fullContent: string,
		_nugget: GoldenNugget,
	): boolean {
		if (this.markInstance) {
			try {
				this.markInstance.mark(fullContent, {
					className: this.highlightClassName,
					element: "span",
					separateWordSearch: false, // Exact phrase matching
					accuracy: "exactly",
					each: (element) => {
						// Apply design system styling
						element.style.cssText = `
							background: ${colors.background.highlight};
							color: ${colors.text.primary};
							border-radius: 2px;
							padding: 0 2px;
						`;

						// Add to tracked elements for cleanup
						this.highlightedElements.push(element as HTMLElement);
					},
				});

				console.log(`Mark.js highlighted "${fullContent.substring(0, 50)}..."`);
				return true;
			} catch (error) {
				console.error("Mark.js highlighting failed:", error);
				return false;
			}
		}
		return false;
	}

	/**
	 * Find text ranges for CSS Custom Highlight API
	 * Simple text search - no complex normalization strategies needed
	 */
	private findTextRanges(searchText: string): Range[] {
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

		let node: Text | null;
		while ((node = walker.nextNode() as Text | null)) {
			const text = node.textContent || "";
			const index = text.indexOf(searchText);
			if (index !== -1) {
				try {
					const range = document.createRange();
					range.setStart(node, index);
					range.setEnd(node, index + searchText.length);
					ranges.push(range);
				} catch (error) {
					console.warn("Failed to create range for text:", error);
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
				background-color: ${colors.background.highlight};
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
