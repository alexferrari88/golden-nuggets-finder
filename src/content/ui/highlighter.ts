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
	 * Highlight using mark.js (fallback support)
	 */
	private highlightWithMarkJS(
		fullContent: string,
		_nugget: GoldenNugget,
	): boolean {
		console.log(
			"Searching for:",
			JSON.stringify(fullContent.substring(0, 100)),
		);
		console.log(
			"DOM text content:",
			JSON.stringify(document.body.textContent?.substring(0, 200) || ""),
		);

		if (this.markInstance) {
			try {
				// Check if text exists in DOM first
				const bodyText = document.body.textContent || "";
				const found = bodyText
					.toLowerCase()
					.includes(fullContent.toLowerCase());

				if (!found) {
					console.log("Text not found in DOM for Mark.js:", fullContent);
					return false;
				}

				console.log("Text found in DOM, proceeding with Mark.js highlighting");

				console.log(
					"Initial highlightedElements count:",
					this.highlightedElements.length,
				);
				const initialElementCount = this.highlightedElements.length;

				this.markInstance.mark(fullContent, {
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
						console.log("Mark.js completed with", totalMarks, "marks");
						console.log(
							"Final highlightedElements count after mark:",
							this.highlightedElements.length,
						);
						if (totalMarks === 0) {
							console.log("Mark.js found no matches for:", fullContent);
						}
					},
				});

				console.log(
					"Immediately after mark call, highlightedElements count:",
					this.highlightedElements.length,
				);
				const newElementsAdded =
					this.highlightedElements.length - initialElementCount;
				console.log(
					`Mark.js highlighted "${fullContent.substring(0, 50)}..." with ${newElementsAdded} new elements`,
				);

				// Also check by querying the DOM
				const domElements = document.querySelectorAll(
					`.${this.highlightClassName}`,
				);
				console.log("DOM elements with highlight class:", domElements.length);

				return newElementsAdded > 0; // Return success based on elements added
			} catch (error) {
				console.error("Mark.js highlighting failed:", error);
				console.error("Error details:", error);
				return false;
			}
		}
		return false;
	}

	/**
	 * Find text ranges for CSS Custom Highlight API
	 * Handles case-insensitive partial matching within text nodes
	 */
	private findTextRanges(searchText: string): Range[] {
		const ranges: Range[] = [];
		const searchTextLower = searchText.toLowerCase();

		// Get all text content and search for the phrase
		const bodyText = document.body.textContent || "";
		const bodyTextLower = bodyText.toLowerCase();
		const startIndex = bodyTextLower.indexOf(searchTextLower);

		if (startIndex === -1) {
			console.log("Text not found in body:", searchText);
			return ranges;
		}

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

		// Create a combined text from all text nodes to find accurate positions
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

		// Find all occurrences in the combined text
		const allText = textNodes.map((n) => n.textContent || "").join("");
		const allTextLower = allText.toLowerCase();

		let searchIndex = 0;
		while (
			(searchIndex = allTextLower.indexOf(searchTextLower, searchIndex)) !== -1
		) {
			// Find which text node contains this position
			let nodeIndex = 0;
			let nodeStartOffset = textOffsets[0];

			for (let i = 1; i < textOffsets.length; i++) {
				if (textOffsets[i] <= searchIndex) {
					nodeIndex = i;
					nodeStartOffset = textOffsets[i];
				} else {
					break;
				}
			}

			const textNode = textNodes[nodeIndex];
			const localStart = searchIndex - nodeStartOffset;
			const localEnd = localStart + searchText.length;

			// Check if the match spans multiple text nodes
			if (localEnd <= (textNode.textContent?.length || 0)) {
				try {
					const range = document.createRange();
					range.setStart(textNode, localStart);
					range.setEnd(textNode, localEnd);
					ranges.push(range);
				} catch (error) {
					console.warn("Failed to create range for text:", error);
				}
			}

			searchIndex++;
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
