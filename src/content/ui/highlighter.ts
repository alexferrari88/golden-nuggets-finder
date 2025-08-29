/**
 * Highlighter for Golden Nuggets - CSS Custom Highlight API Implementation
 * Uses modern CSS Custom Highlight API with DOM fallback for cross-browser compatibility
 */

import { colors, generateInlineStyles } from "../../shared/design-system";
import {
	EnhancedTextMatcherAdapter,
	FeatureFlags,
} from "../../shared/enhanced-text-matching-adapter";
import type { GoldenNugget } from "../../shared/types";
import { isUrl } from "../../shared/utils/url-detection";

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
		forEach(
			callbackfn: (value: Range, value2: Range, set: BrowserHighlight) => void,
			thisArg?: unknown,
		): void;
		has(range: Range): boolean;
		readonly size: number;
		readonly priority: number;
		readonly type: string;
		readonly [Symbol.toStringTag]: string;
		[Symbol.iterator](): IterableIterator<Range>;
		entries(): IterableIterator<[Range, Range]>;
		keys(): IterableIterator<Range>;
		values(): IterableIterator<Range>;
	}
	interface CSS {
		highlights: Map<string, BrowserHighlight>;
	}
}

export class Highlighter {
	private highlightedElements: HTMLElement[] = [];
	private cssHighlights: Map<string, { range: Range; nugget: GoldenNugget }> =
		new Map();
	private globalHighlight: BrowserHighlight | null = null;
	private highlightClassName = "golden-nugget-highlight";
	private cssHighlightSupported: boolean;
	private enhancedMatcher: EnhancedTextMatcherAdapter | null = null;
	private useEnhancedMatching: boolean = true; // Feature flag - enabled by default for hobby project

	constructor() {
		try {
			this.cssHighlightSupported = this.checkCSSHighlightSupport();
			console.log(
				"Highlighter constructor - CSS support:",
				this.cssHighlightSupported,
			);
			this.setupCSSHighlightStyles();

			// Initialize enhanced matcher if enabled
			if (
				this.useEnhancedMatching &&
				FeatureFlags.getStatus().useEnhancedMatching
			) {
				try {
					this.enhancedMatcher = new EnhancedTextMatcherAdapter();
					console.log("Enhanced text matching enabled");
				} catch (error) {
					console.warn("Failed to initialize enhanced matcher:", error);
					this.enhancedMatcher = null;
				}
			}
		} catch (error) {
			console.error("Error in Highlighter constructor:", error);
			this.cssHighlightSupported = false;
		}
	}

	/**
	 * Highlight a golden nugget on the page
	 * @param nugget The golden nugget to highlight
	 * @param pageContent Optional page content for context
	 * @returns true if highlighting was successful, false otherwise
	 */
	highlightNugget(
		nugget: GoldenNugget,
		pageContent?: string,
	): boolean | Promise<boolean> {
		try {
			console.log("highlightNugget called for:", nugget.startContent);

			// Enhanced error handling: Check for identical start/end content
			if (nugget.startContent === nugget.endContent) {
				const isUrlContent = isUrl(nugget.startContent.trim());
				console.warn(
					`Nugget has identical start/end content${isUrlContent ? " (URL detected)" : ""}:`,
					{
						type: nugget.type,
						content: nugget.startContent,
						isUrl: isUrlContent,
					},
				);

				// For URL nuggets, this indicates a boundary generation issue that should have been fixed
				if (isUrlContent) {
					console.error(
						"URL nugget still has identical boundaries after fixes. This suggests a problem in FuzzyBoundaryMatcher.",
						nugget,
					);
				}

				return false;
			}

			// Check if this nugget is already highlighted
			if (this.isAlreadyHighlighted(nugget)) {
				console.log("Already highlighted");
				return true;
			}

			// Enhanced logging for URL nuggets
			const isUrlNugget =
				isUrl(nugget.startContent.trim()) || isUrl(nugget.endContent.trim());
			if (isUrlNugget) {
				console.log("Attempting to highlight URL nugget:", {
					type: nugget.type,
					startContent: nugget.startContent,
					endContent: nugget.endContent,
				});
			}

			// Find the range for this nugget using enhanced or original system
			const rangeResult = this.findTextInDOMEnhanced(
				nugget.startContent,
				nugget.endContent,
				pageContent,
			);

			// Handle both sync and async results
			if (rangeResult instanceof Promise) {
				return rangeResult
					.then((range) => {
						if (!range) {
							const failureReason = this.diagnoseHighlightingFailure(nugget);
							console.warn(
								"Could not find text range for nugget:",
								nugget,
								failureReason,
							);
							return false;
						}
						return this.processHighlightingRange(range, nugget);
					})
					.catch((error) => {
						console.error("Error highlighting nugget:", error, nugget);
						return false;
					});
			} else {
				const range = rangeResult;
				if (!range) {
					const failureReason = this.diagnoseHighlightingFailure(nugget);
					console.warn(
						"Could not find text range for nugget:",
						nugget,
						failureReason,
					);
					return false;
				}
				return this.processHighlightingRange(range, nugget);
			}
		} catch (error) {
			console.error("Error highlighting nugget:", error, nugget);
			return false;
		}
	}

	/**
	 * Process highlighting with the found range
	 * Extracted to support both sync and async workflows
	 */
	private processHighlightingRange(
		range: Range,
		nugget: GoldenNugget,
	): boolean {
		try {
			// Use CSS Custom Highlight API if supported, otherwise fallback to DOM manipulation
			const success = this.cssHighlightSupported
				? this.highlightWithCSS(range, nugget)
				: this.highlightWithDOM(range, nugget);

			if (!success) {
				console.warn("Could not create highlight for nugget:", nugget);
				return false;
			}

			console.log("Successfully highlighted nugget:", nugget.startContent);
			return true;
		} catch (error) {
			console.error("Error processing highlighting range:", error);
			return false;
		}
	}

	/**
	 * Scroll to a highlighted nugget
	 * @param nugget The nugget to scroll to
	 */
	scrollToHighlight(nugget: GoldenNugget): void {
		// For CSS highlights, find the range and scroll to it
		const cssHighlightKey = this.getNuggetKey(nugget);
		const cssHighlightInfo = this.cssHighlights.get(cssHighlightKey);

		if (cssHighlightInfo) {
			// Create a temporary element at the range position for scrolling
			const range = cssHighlightInfo.range.cloneRange();
			const tempElement = document.createElement("span");
			tempElement.style.position = "absolute";
			tempElement.style.visibility = "hidden";
			tempElement.style.pointerEvents = "none";

			try {
				range.insertNode(tempElement);
				tempElement.scrollIntoView({
					behavior: "smooth",
					block: "center",
					inline: "nearest",
				});
				tempElement.remove();
			} catch (error) {
				console.warn("Could not scroll to CSS highlight:", error);
				tempElement.remove();
			}
			return;
		}

		// Fallback to DOM element-based scrolling
		const highlightElement = this.highlightedElements.find((element) => {
			const elementText = (element.textContent || "").toLowerCase();
			return (
				elementText.includes(nugget.startContent.toLowerCase()) &&
				elementText.includes(nugget.endContent.toLowerCase())
			);
		});

		if (highlightElement) {
			highlightElement.scrollIntoView({
				behavior: "smooth",
				block: "center",
				inline: "nearest",
			});
		} else {
			console.warn("No highlight found for nugget:", nugget);
		}
	}

	/**
	 * Clear all highlights from the page
	 */
	clearHighlights(): void {
		try {
			// Clear CSS highlights
			if (
				this.cssHighlightSupported &&
				typeof CSS !== "undefined" &&
				CSS.highlights
			) {
				if (this.globalHighlight) {
					this.globalHighlight.clear();
					CSS.highlights.delete("golden-nugget");
					this.globalHighlight = null;
				}
				this.cssHighlights.clear();
			}

			// Clear DOM-based highlights (fallback)
			this.highlightedElements.forEach((element) => {
				try {
					if (element.parentNode) {
						// Unwrap the highlighted element, preserving the text content
						const parent = element.parentNode;
						while (element.firstChild) {
							parent.insertBefore(element.firstChild, element);
						}
						parent.removeChild(element);
					}
				} catch (error) {
					console.warn("Error removing highlight element:", error);
				}
			});

			this.highlightedElements = [];
		} catch (error) {
			console.error("Error clearing highlights:", error);
		}
	}

	/**
	 * Get the number of currently highlighted elements
	 */
	getHighlightCount(): number {
		return this.cssHighlights.size + this.highlightedElements.length;
	}

	/**
	 * Check if a nugget is already highlighted
	 * Uses a more robust approach to prevent duplicates
	 */
	private isAlreadyHighlighted(nugget: GoldenNugget): boolean {
		const nuggetKey = this.getNuggetKey(nugget);

		// Check CSS highlights first
		if (this.cssHighlights.has(nuggetKey)) {
			return true;
		}

		// Check DOM-based highlights (fallback)
		return this.highlightedElements.some((element) => {
			const elementText = (element.textContent || "").toLowerCase();
			return (
				elementText.includes(nugget.startContent.toLowerCase()) &&
				elementText.includes(nugget.endContent.toLowerCase()) &&
				element.hasAttribute("data-nugget-key") &&
				element.getAttribute("data-nugget-key") === nuggetKey
			);
		});
	}

	/**
	 * Create a highlight element with proper styling (for DOM fallback)
	 */
	private createHighlightElement(nugget: GoldenNugget): HTMLSpanElement {
		const span = document.createElement("span");
		span.className = this.highlightClassName;
		span.setAttribute("data-golden-nugget-highlight", "true");

		// Add unique nugget key to prevent duplicates
		const nuggetKey = this.getNuggetKey(nugget);
		span.setAttribute("data-nugget-key", nuggetKey);

		// Apply highlighting styles from design system
		span.style.cssText = generateInlineStyles.highlightStyle();

		return span;
	}

	/**
	 * Normalize text for flexible matching by removing common punctuation
	 * that might be stripped during display processing
	 */
	private normalizeTextForMatching(text: string): string {
		return text
			.replace(/[.!?;,:'"()[\]{}]+$/g, "") // Remove trailing punctuation
			.replace(/\s+/g, " ") // Normalize whitespace
			.trim();
	}

	/**
	 * Conservative quote normalization - only normalizes quote characters
	 * Converts all quote types (straight, curly, smart) to standard straight quotes
	 * for matching purposes, but preserves all other content exactly
	 */
	private normalizeQuotes(text: string): string {
		return (
			text
				// Convert opening smart/curly quotes to straight quotes
				.replace(/[""]/g, '"') // " and " to "
				.replace(/['']/g, "'") // ' and ' to '
				// Convert any remaining quote entities
				.replace(/&quot;/g, '"')
				.replace(/&#39;/g, "'")
				.replace(/&apos;/g, "'")
		);
	}

	/**
	 * URL spacing normalization - removes spaces around dots in URLs
	 * Conservative: only applies to patterns that look like URLs or domain names
	 */
	private normalizeUrlSpacing(text: string): string {
		return (
			text
				// Remove spaces around dots in URL-like patterns
				// Matches patterns like "pmc. ncbi. nlm. nih. gov" -> "pmc.ncbi.nlm.nih.gov"
				.replace(/([a-zA-Z0-9])\s*\.\s*([a-zA-Z0-9])/g, "$1.$2")
				// Handle multiple consecutive replacements for patterns like "a. b. c. d"
				.replace(/([a-zA-Z0-9])\s*\.\s*([a-zA-Z0-9])/g, "$1.$2")
		);
	}

	/**
	 * Try to find text using multiple matching strategies
	 */
	private findTextWithStrategies(
		fullTextLower: string,
		startContentLower: string,
		endContentLower: string,
		strategyName: string,
	): Array<{ start: number; end: number }> {
		let startIndex = -1;
		let searchFrom = 0;
		const possibleRanges: Array<{ start: number; end: number }> = [];

		// Look for all combinations of startContent -> endContent
		startIndex = fullTextLower.indexOf(startContentLower, searchFrom);
		while (startIndex !== -1) {
			const endContentIndex = fullTextLower.indexOf(
				endContentLower,
				startIndex + startContentLower.length,
			);
			if (endContentIndex !== -1) {
				const endIndex = endContentIndex + endContentLower.length;
				possibleRanges.push({ start: startIndex, end: endIndex });
			}
			searchFrom = startIndex + 1;
			startIndex = fullTextLower.indexOf(startContentLower, searchFrom);
		}

		if (possibleRanges.length > 0) {
			console.log(`Found text range using ${strategyName} strategy`);
		}

		return possibleRanges;
	}

	/**
	 * Find text content in the DOM tree
	 * Creates a Range that spans from startContent to endContent
	 * Uses more intelligent matching to avoid duplicates and handle punctuation mismatches
	 */
	private findTextInDOM(
		startContent: string,
		endContent: string,
	): Range | null {
		try {
			// Get all text content and create a mapping to DOM nodes
			const walker = document.createTreeWalker(
				document.body,
				NodeFilter.SHOW_TEXT,
				{
					acceptNode: (node) => {
						// Skip script and style elements
						const parent = node.parentElement;
						if (
							parent &&
							(parent.tagName === "SCRIPT" ||
								parent.tagName === "STYLE" ||
								parent.tagName === "NOSCRIPT")
						) {
							return NodeFilter.FILTER_REJECT;
						}
						// Only accept text nodes with meaningful content
						return node.textContent?.trim()
							? NodeFilter.FILTER_ACCEPT
							: NodeFilter.FILTER_REJECT;
					},
				},
			);

			// Build a map of text positions to DOM nodes
			let fullText = "";
			const textNodeMap: Array<{
				node: Text;
				startIndex: number;
				endIndex: number;
			}> = [];

			let currentNode = walker.nextNode() as Text;
			while (currentNode) {
				const nodeText = currentNode.textContent || "";
				const startIndex = fullText.length;
				const endIndex = startIndex + nodeText.length;

				textNodeMap.push({
					node: currentNode,
					startIndex,
					endIndex,
				});

				fullText += nodeText;
				currentNode = walker.nextNode() as Text;
			}

			const fullTextLower = fullText.toLowerCase();
			let possibleRanges: Array<{ start: number; end: number }> = [];

			// Debug logging to help understand what content is available
			console.log("DOM text analysis:", {
				searchingFor: { start: startContent, end: endContent },
				domTextLength: fullText.length,
				domTextSample: fullText.substring(0, 200),
				containsStart: fullTextLower.includes(startContent.toLowerCase()),
				containsEnd: fullTextLower.includes(endContent.toLowerCase()),
			});

			// Strategy 1: Exact match (case-insensitive)
			const startContentLower = startContent.toLowerCase();
			const endContentLower = endContent.toLowerCase();
			possibleRanges = this.findTextWithStrategies(
				fullTextLower,
				startContentLower,
				endContentLower,
				"exact match",
			);

			// Strategy 2: Try with normalized punctuation if exact match fails
			if (possibleRanges.length === 0) {
				const normalizedStartContent =
					this.normalizeTextForMatching(startContent).toLowerCase();
				const normalizedEndContent =
					this.normalizeTextForMatching(endContent).toLowerCase();

				console.log("Trying normalized matching:", {
					originalStart: startContent,
					normalizedStart: normalizedStartContent,
					originalEnd: endContent,
					normalizedEnd: normalizedEndContent,
				});

				// Only try normalized matching if it's actually different from the original
				if (
					normalizedStartContent !== startContentLower ||
					normalizedEndContent !== endContentLower
				) {
					possibleRanges = this.findTextWithStrategies(
						fullTextLower,
						normalizedStartContent,
						normalizedEndContent,
						"normalized punctuation",
					);
				} else {
					console.log(
						"Skipping normalized matching - no difference from original",
					);
				}
			}

			// Strategy 3: Try with only end content normalized (common case where endContent has punctuation)
			if (possibleRanges.length === 0) {
				const normalizedEndContentOnly =
					this.normalizeTextForMatching(endContent).toLowerCase();

				if (normalizedEndContentOnly !== endContentLower) {
					possibleRanges = this.findTextWithStrategies(
						fullTextLower,
						startContentLower,
						normalizedEndContentOnly,
						"end content normalized",
					);
				}
			}

			// Strategy 4: Try with normalized DOM text (for cases where search text has more punctuation than DOM)
			if (possibleRanges.length === 0) {
				// Create a normalized version of the DOM text for comparison
				const normalizedFullText =
					this.normalizeTextForMatching(fullText).toLowerCase();

				// If the normalized version is different from original, try matching against it
				if (normalizedFullText !== fullTextLower) {
					const normalizedStartContent =
						this.normalizeTextForMatching(startContent).toLowerCase();
					const normalizedEndContent =
						this.normalizeTextForMatching(endContent).toLowerCase();

					possibleRanges = this.findTextWithStrategies(
						normalizedFullText,
						normalizedStartContent,
						normalizedEndContent,
						"both DOM and search text normalized",
					);
				}
			}

			// Strategy 5: Try with quote character normalization (conservative fallback)
			if (possibleRanges.length === 0) {
				const quoteNormalizedStartContent =
					this.normalizeQuotes(startContent).toLowerCase();
				const quoteNormalizedEndContent =
					this.normalizeQuotes(endContent).toLowerCase();

				// Only try quote normalization if it actually changes something
				if (
					quoteNormalizedStartContent !== startContentLower ||
					quoteNormalizedEndContent !== endContentLower
				) {
					possibleRanges = this.findTextWithStrategies(
						fullTextLower,
						quoteNormalizedStartContent,
						quoteNormalizedEndContent,
						"quote character normalization",
					);

					// If still no match, try normalizing the DOM text quotes too
					if (possibleRanges.length === 0) {
						const quoteNormalizedFullText =
							this.normalizeQuotes(fullText).toLowerCase();
						if (quoteNormalizedFullText !== fullTextLower) {
							possibleRanges = this.findTextWithStrategies(
								quoteNormalizedFullText,
								quoteNormalizedStartContent,
								quoteNormalizedEndContent,
								"both DOM and search quote normalization",
							);
						}
					}
				}
			}

			// Strategy 6: Try with URL spacing normalization (conservative fallback)
			if (possibleRanges.length === 0) {
				const urlNormalizedStartContent =
					this.normalizeUrlSpacing(startContent).toLowerCase();
				const urlNormalizedEndContent =
					this.normalizeUrlSpacing(endContent).toLowerCase();

				// Only try URL spacing normalization if it actually changes something
				if (
					urlNormalizedStartContent !== startContentLower ||
					urlNormalizedEndContent !== endContentLower
				) {
					possibleRanges = this.findTextWithStrategies(
						fullTextLower,
						urlNormalizedStartContent,
						urlNormalizedEndContent,
						"URL spacing normalization",
					);

					// If still no match, try normalizing the DOM text URLs too
					if (possibleRanges.length === 0) {
						const urlNormalizedFullText =
							this.normalizeUrlSpacing(fullText).toLowerCase();
						if (urlNormalizedFullText !== fullTextLower) {
							possibleRanges = this.findTextWithStrategies(
								urlNormalizedFullText,
								urlNormalizedStartContent,
								urlNormalizedEndContent,
								"both DOM and search URL normalization",
							);
						}
					}
				}
			}

			if (possibleRanges.length === 0) {
				console.warn(
					"No valid range found for:",
					startContent,
					"→",
					endContent,
					"(tried exact, normalized, quote, and URL spacing matching)",
				);
				return null;
			}

			// If multiple ranges found, prefer the shortest one (most specific)
			const bestRange = possibleRanges.reduce((shortest, current) => {
				const currentLength = current.end - current.start;
				const shortestLength = shortest.end - shortest.start;
				return currentLength < shortestLength ? current : shortest;
			});

			// Find the DOM nodes that contain the start and end positions
			const startNodeInfo = textNodeMap.find(
				(info) =>
					bestRange.start >= info.startIndex && bestRange.start < info.endIndex,
			);
			const endNodeInfo = textNodeMap.find(
				(info) =>
					bestRange.end > info.startIndex && bestRange.end <= info.endIndex,
			);

			if (!startNodeInfo || !endNodeInfo) {
				console.warn("Could not find DOM nodes for text positions");
				return null;
			}

			// Create a range
			const range = document.createRange();

			// Set start position
			const startOffset = bestRange.start - startNodeInfo.startIndex;
			range.setStart(startNodeInfo.node, startOffset);

			// Set end position
			const endOffset = bestRange.end - endNodeInfo.startIndex;
			range.setEnd(endNodeInfo.node, endOffset);

			console.log("Found text range:", startContent, "→", endContent);
			return range;
		} catch (error) {
			console.error("Error finding text in DOM:", error);
			return null;
		}
	}

	/**
	 * Check if CSS Custom Highlight API is supported
	 */
	private checkCSSHighlightSupport(): boolean {
		// Ensure CSS object exists first
		if (typeof CSS === "undefined") {
			// CSS object doesn't exist, polyfill not available
			return false;
		}

		return (
			CSS.highlights !== undefined && typeof window.Highlight !== "undefined"
		);
	}

	/**
	 * Setup CSS styles for highlights
	 */
	private setupCSSHighlightStyles(): void {
		console.log(
			"setupCSSHighlightStyles called, supported:",
			this.cssHighlightSupported,
		);
		if (!this.cssHighlightSupported) return;

		// Check if styles are already added
		if (document.querySelector("#golden-nugget-highlight-styles")) {
			console.log("Styles already exist");
			return;
		}

		try {
			const styleSheet = document.createElement("style");
			styleSheet.id = "golden-nugget-highlight-styles";
			styleSheet.textContent = `
				::highlight(golden-nugget) {
					background-color: ${colors.highlight.background} !important;
					border-radius: 3px !important;
					box-shadow: 0 0 0 1px ${colors.highlight.border} !important;
					color: inherit !important;
				}
			`;
			document.head.appendChild(styleSheet);
			console.log("Added CSS highlight styles");
		} catch (error) {
			console.error("Error setting up CSS styles:", error);
		}
	}

	/**
	 * Generate a unique key for a nugget (case-insensitive)
	 */
	private getNuggetKey(nugget: GoldenNugget): string {
		return `nugget-${nugget.startContent.toLowerCase()}-${nugget.endContent.toLowerCase()}`.replace(
			/[^a-zA-Z0-9-_]/g,
			"_",
		);
	}

	/**
	 * Highlight using CSS Custom Highlight API (preferred method)
	 */
	private highlightWithCSS(range: Range, nugget: GoldenNugget): boolean {
		try {
			console.log("highlightWithCSS called");
			if (range.collapsed) {
				console.warn("Cannot highlight collapsed range");
				return false;
			}

			// Create global highlight object if it doesn't exist
			if (!this.globalHighlight) {
				console.log("Creating global highlight object");
				this.globalHighlight = new window.Highlight();
				CSS.highlights.set("golden-nugget", this.globalHighlight as any);
				console.log("Registered global highlight with name 'golden-nugget'");
			}

			// Add this range to the global highlight
			const clonedRange = range.cloneRange();
			this.globalHighlight.add(clonedRange);

			// Store the range info for management
			const highlightKey = this.getNuggetKey(nugget);
			this.cssHighlights.set(highlightKey, {
				range: clonedRange,
				nugget,
			});

			console.log("Successfully added CSS highlight:", highlightKey);
			console.log("CSS.highlights size:", CSS.highlights.size);
			return true;
		} catch (error) {
			console.error("Error creating CSS highlight:", error);
			console.error("Error details:", (error as Error).message);
			console.error("Falling back to DOM highlighting");
			return this.highlightWithDOM(range, nugget);
		}
	}

	/**
	 * Highlight using DOM manipulation (fallback method)
	 * Uses cloneContents instead of extractContents to avoid data loss
	 */
	private highlightWithDOM(range: Range, nugget: GoldenNugget): boolean {
		try {
			console.log("highlightWithDOM called");
			if (range.collapsed) {
				console.warn("Cannot highlight collapsed range");
				return false;
			}

			// Use cloneContents instead of extractContents to preserve original content
			const contents = range.cloneContents();

			if (!contents || contents.childNodes.length === 0) {
				console.warn("No contents cloned from range");
				return false;
			}

			// Create a highlight element
			const highlightElement = this.createHighlightElement(nugget);
			highlightElement.appendChild(contents);

			// Now safely extract and replace with highlighted version
			try {
				range.deleteContents();
				range.insertNode(highlightElement);
			} catch (insertError) {
				console.error("DOM insertion failed:", insertError);
				return false;
			}

			// Verify the highlight element is in the DOM
			if (!highlightElement.parentNode) {
				console.error("Highlight element was not properly inserted into DOM");
				return false;
			}

			this.highlightedElements.push(highlightElement);
			console.log("Successfully created DOM highlight");
			return true;
		} catch (error) {
			console.error("Error highlighting with DOM:", error);
			return false;
		}
	}

	/**
	 * Enhanced text finding using RobustTextMatcher or fallback to original method
	 * Maintains backward compatibility while providing improved matching
	 */
	private findTextInDOMEnhanced(
		startContent: string,
		endContent: string,
		_pageContent?: string,
	): Range | null | Promise<Range | null> {
		// Try enhanced matcher first if available and enabled
		if (this.enhancedMatcher && this.useEnhancedMatching) {
			try {
				const startTime = performance.now();

				// Initialize enhanced matcher with current DOM
				this.enhancedMatcher.initializeWithDOM();

				// Find text using enhanced system (returns Promise)
				return this.enhancedMatcher
					.findTextInDOM(startContent, endContent)
					.then((range) => {
						const endTime = performance.now();

						if (range) {
							console.log("Enhanced text matching succeeded:", {
								strategy: "enhanced",
								timeMs: endTime - startTime,
								stats: this.enhancedMatcher!.getStats(),
							});
							return range;
						} else {
							console.log(
								"Enhanced text matching failed, falling back to original",
							);

							// Fallback to original implementation
							const fallbackStartTime = performance.now();
							const fallbackRange = this.findTextInDOM(
								startContent,
								endContent,
							);
							const fallbackEndTime = performance.now();

							if (fallbackRange) {
								console.log("Original text matching succeeded:", {
									strategy: "original",
									timeMs: fallbackEndTime - fallbackStartTime,
								});
							} else {
								console.log("Original text matching failed");
							}

							return fallbackRange;
						}
					})
					.catch((error) => {
						console.warn(
							"Enhanced text matching error, falling back to original:",
							error,
						);

						// Fallback to original implementation
						const fallbackStartTime = performance.now();
						const range = this.findTextInDOM(startContent, endContent);
						const fallbackEndTime = performance.now();

						if (range) {
							console.log("Original text matching succeeded:", {
								strategy: "original",
								timeMs: fallbackEndTime - fallbackStartTime,
							});
						} else {
							console.log("Original text matching failed");
						}

						return range;
					});
			} catch (error) {
				console.warn(
					"Enhanced text matching setup error, falling back to original:",
					error,
				);
			}
		}

		// Fallback to original implementation (synchronous)
		const startTime = performance.now();
		const range = this.findTextInDOM(startContent, endContent);
		const endTime = performance.now();

		if (range) {
			console.log("Original text matching succeeded:", {
				strategy: "original",
				timeMs: endTime - startTime,
			});
		} else {
			console.log("Original text matching failed");
		}

		return range;
	}

	/**
	 * Enable or disable enhanced text matching
	 * Provides runtime control over the enhanced system
	 */
	public setEnhancedMatching(enabled: boolean): void {
		this.useEnhancedMatching = enabled;

		if (enabled && !this.enhancedMatcher) {
			// Initialize enhanced matcher if not already done
			try {
				this.enhancedMatcher = new EnhancedTextMatcherAdapter();
				console.log("Enhanced text matching enabled");
			} catch (error) {
				console.warn("Failed to initialize enhanced matcher:", error);
				this.enhancedMatcher = null;
			}
		}

		console.log("Enhanced text matching", enabled ? "enabled" : "disabled");
	}

	/**
	 * Get enhanced matching statistics for debugging
	 */
	public getEnhancedMatchingStats(): {
		enabled: boolean;
		available: boolean;
		stats?: any;
	} {
		return {
			enabled: this.useEnhancedMatching,
			available: !!this.enhancedMatcher,
			stats: this.enhancedMatcher?.getStats(),
		};
	}

	/**
	 * Diagnose why highlighting failed for a nugget
	 * Provides detailed information to help troubleshoot highlighting issues
	 */
	private diagnoseHighlightingFailure(nugget: GoldenNugget): {
		reason: string;
		details: {
			isUrl: boolean;
			identicalBoundaries: boolean;
			emptyBoundaries: boolean;
			contentLength: number;
			startLength: number;
			endLength: number;
		};
	} {
		const startTrimmed = nugget.startContent.trim();
		const endTrimmed = nugget.endContent.trim();
		const isUrlContent = isUrl(startTrimmed) || isUrl(endTrimmed);
		const identicalBoundaries = nugget.startContent === nugget.endContent;
		const emptyBoundaries = !startTrimmed || !endTrimmed;

		let reason = "Unknown highlighting failure";

		if (identicalBoundaries) {
			reason = isUrlContent
				? "URL nugget has identical start/end boundaries (boundary generation issue)"
				: "Nugget has identical start/end content (content processing issue)";
		} else if (emptyBoundaries) {
			reason = "Nugget has empty start or end content";
		} else if (isUrlContent) {
			reason =
				"URL content not found on page (may be in href attributes or hidden)";
		} else {
			reason = "Content not found on page (text matching failed)";
		}

		return {
			reason,
			details: {
				isUrl: isUrlContent,
				identicalBoundaries,
				emptyBoundaries,
				contentLength: nugget.startContent.length + nugget.endContent.length,
				startLength: nugget.startContent.length,
				endLength: nugget.endContent.length,
			},
		};
	}
}
