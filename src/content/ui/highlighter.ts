/**
 * Highlighter for Golden Nuggets - CSS Custom Highlight API Implementation
 * Uses modern CSS Custom Highlight API with DOM fallback for cross-browser compatibility
 */

import { generateInlineStyles, colors } from '../../shared/design-system';
import type { GoldenNugget } from '../../shared/types';

// Type declarations for CSS Custom Highlight API
declare global {
	interface Window {
		Highlight: typeof Highlight;
	}
	class Highlight {
		constructor(...ranges: Range[]);
	}
	interface CSS {
		highlights: Map<string, Highlight>;
	}
}

export class Highlighter {
	private highlightedElements: HTMLElement[] = [];
	private cssHighlights: Map<string, { range: Range; nugget: GoldenNugget }> = new Map();
	private globalHighlight: Highlight | null = null;
	private highlightClassName = 'golden-nugget-highlight';
	private cssHighlightSupported: boolean;
	private static highlightCounter = 0;

	constructor() {
		this.cssHighlightSupported = this.checkCSSHighlightSupport();
		this.setupCSSHighlightStyles();
	}

	/**
	 * Highlight a golden nugget on the page
	 * @param nugget The golden nugget to highlight
	 * @param pageContent Optional page content for context
	 * @returns true if highlighting was successful, false otherwise
	 */
	highlightNugget(nugget: GoldenNugget, pageContent?: string): boolean {
		try {
			// Check if this nugget is already highlighted
			if (this.isAlreadyHighlighted(nugget)) {
				return true;
			}

			// Find the range for this nugget
			const range = this.findTextInDOM(nugget.startContent, nugget.endContent);
			if (!range) {
				console.warn('Could not find text range for nugget:', nugget);
				return false;
			}

			// Use CSS Custom Highlight API if supported, otherwise fallback to DOM manipulation
			const success = this.cssHighlightSupported 
				? this.highlightWithCSS(range, nugget)
				: this.highlightWithDOM(range, nugget);
			
			if (!success) {
				console.warn('Could not create highlight for nugget:', nugget);
				return false;
			}

			console.log('Successfully highlighted nugget:', nugget);
			return true;
		} catch (error) {
			console.error('Error highlighting nugget:', error, nugget);
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
			const tempElement = document.createElement('span');
			tempElement.style.position = 'absolute';
			tempElement.style.visibility = 'hidden';
			tempElement.style.pointerEvents = 'none';
			
			try {
				range.insertNode(tempElement);
				tempElement.scrollIntoView({
					behavior: 'smooth',
					block: 'center',
					inline: 'nearest'
				});
				tempElement.remove();
			} catch (error) {
				console.warn('Could not scroll to CSS highlight:', error);
				tempElement.remove();
			}
			return;
		}
		
		// Fallback to DOM element-based scrolling
		const highlightElement = this.highlightedElements.find(element => {
			const elementText = element.textContent || '';
			return elementText.includes(nugget.startContent) && elementText.includes(nugget.endContent);
		});

		if (highlightElement) {
			highlightElement.scrollIntoView({
				behavior: 'smooth',
				block: 'center',
				inline: 'nearest'
			});
		} else {
			console.warn('No highlight found for nugget:', nugget);
		}
	}

	/**
	 * Clear all highlights from the page
	 */
	clearHighlights(): void {
		// Clear CSS highlights
		if (this.cssHighlightSupported && CSS.highlights) {
			if (this.globalHighlight) {
				this.globalHighlight.clear();
				CSS.highlights.delete('golden-nugget');
				this.globalHighlight = null;
			}
			this.cssHighlights.clear();
		}
		
		// Clear DOM-based highlights (fallback)
		this.highlightedElements.forEach(element => {
			if (element.parentNode) {
				// Unwrap the highlighted element, preserving the text content
				const parent = element.parentNode;
				while (element.firstChild) {
					parent.insertBefore(element.firstChild, element);
				}
				parent.removeChild(element);
			}
		});
		
		this.highlightedElements = [];
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
		return this.highlightedElements.some(element => {
			const elementText = element.textContent || '';
			return elementText.includes(nugget.startContent) && 
			       elementText.includes(nugget.endContent) &&
			       element.hasAttribute('data-nugget-key') &&
			       element.getAttribute('data-nugget-key') === nuggetKey;
		});
	}

	/**
	 * Create a highlight element with proper styling (for DOM fallback)
	 */
	private createHighlightElement(nugget: GoldenNugget): HTMLSpanElement {
		const span = document.createElement('span');
		span.className = this.highlightClassName;
		span.setAttribute('data-golden-nugget-highlight', 'true');
		
		// Add unique nugget key to prevent duplicates
		const nuggetKey = this.getNuggetKey(nugget);
		span.setAttribute('data-nugget-key', nuggetKey);
		
		// Apply highlighting styles from design system
		span.style.cssText = generateInlineStyles.highlightStyle();
		
		return span;
	}

	/**
	 * Find text content in the DOM tree
	 * Creates a Range that spans from startContent to endContent
	 * Uses more intelligent matching to avoid duplicates
	 */
	private findTextInDOM(startContent: string, endContent: string): Range | null {
		try {
			// Get all text content and create a mapping to DOM nodes
			const walker = document.createTreeWalker(
				document.body,
				NodeFilter.SHOW_TEXT,
				{
					acceptNode: (node) => {
						// Skip script and style elements
						const parent = node.parentElement;
						if (parent && (
							parent.tagName === 'SCRIPT' || 
							parent.tagName === 'STYLE' ||
							parent.tagName === 'NOSCRIPT'
						)) {
							return NodeFilter.FILTER_REJECT;
						}
						// Only accept text nodes with meaningful content
						return node.textContent?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
					}
				}
			);

			// Build a map of text positions to DOM nodes
			let fullText = '';
			const textNodeMap: Array<{ node: Text; startIndex: number; endIndex: number }> = [];
			
			let currentNode = walker.nextNode() as Text;
			while (currentNode) {
				const nodeText = currentNode.textContent || '';
				const startIndex = fullText.length;
				const endIndex = startIndex + nodeText.length;
				
				textNodeMap.push({
					node: currentNode,
					startIndex,
					endIndex
				});
				
				fullText += nodeText;
				currentNode = walker.nextNode() as Text;
			}

			// Find all possible start positions
			let startIndex = -1;
			let searchFrom = 0;
			const possibleRanges: Array<{ start: number; end: number }> = [];

			// Look for all combinations of startContent -> endContent
			while ((startIndex = fullText.indexOf(startContent, searchFrom)) !== -1) {
				const endContentIndex = fullText.indexOf(endContent, startIndex + startContent.length);
				if (endContentIndex !== -1) {
					const endIndex = endContentIndex + endContent.length;
					possibleRanges.push({ start: startIndex, end: endIndex });
				}
				searchFrom = startIndex + 1;
			}

			if (possibleRanges.length === 0) {
				console.warn('No valid range found for:', startContent, '→', endContent);
				return null;
			}

			// If multiple ranges found, prefer the shortest one (most specific)
			const bestRange = possibleRanges.reduce((shortest, current) => {
				const currentLength = current.end - current.start;
				const shortestLength = shortest.end - shortest.start;
				return currentLength < shortestLength ? current : shortest;
			});

			// Find the DOM nodes that contain the start and end positions
			const startNodeInfo = textNodeMap.find(info => 
				bestRange.start >= info.startIndex && bestRange.start < info.endIndex
			);
			const endNodeInfo = textNodeMap.find(info => 
				bestRange.end > info.startIndex && bestRange.end <= info.endIndex
			);

			if (!startNodeInfo || !endNodeInfo) {
				console.warn('Could not find DOM nodes for text positions');
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

			return range;
		} catch (error) {
			console.error('Error finding text in DOM:', error);
			return null;
		}
	}

	/**
	 * Check if CSS Custom Highlight API is supported
	 */
	private checkCSSHighlightSupport(): boolean {
		return typeof CSS !== 'undefined' && 
		       CSS.highlights !== undefined && 
		       typeof Highlight !== 'undefined';
	}

	/**
	 * Setup CSS styles for highlights
	 */
	private setupCSSHighlightStyles(): void {
		if (!this.cssHighlightSupported) return;
		
		// Check if styles are already added
		if (document.querySelector('#golden-nugget-highlight-styles')) return;
		
		const styleSheet = document.createElement('style');
		styleSheet.id = 'golden-nugget-highlight-styles';
		styleSheet.textContent = `
			::highlight(golden-nugget) {
				background-color: ${colors.highlight.background} !important;
				border-radius: 3px !important;
				box-shadow: 0 0 0 1px ${colors.highlight.border} !important;
				color: inherit !important;
			}
		`;
		document.head.appendChild(styleSheet);
	}

	/**
	 * Generate a unique key for a nugget
	 */
	private getNuggetKey(nugget: GoldenNugget): string {
		return `nugget-${nugget.startContent}-${nugget.endContent}`.replace(/[^a-zA-Z0-9-_]/g, '_');
	}

	/**
	 * Highlight using CSS Custom Highlight API (preferred method)
	 */
	private highlightWithCSS(range: Range, nugget: GoldenNugget): boolean {
		try {
			if (range.collapsed) {
				console.warn('Cannot highlight collapsed range');
				return false;
			}

			// Create global highlight object if it doesn't exist
			if (!this.globalHighlight) {
				this.globalHighlight = new Highlight();
				CSS.highlights.set('golden-nugget', this.globalHighlight);
			}

			// Add this range to the global highlight
			const clonedRange = range.cloneRange();
			this.globalHighlight.add(clonedRange);
			
			// Store the range info for management
			const highlightKey = this.getNuggetKey(nugget);
			this.cssHighlights.set(highlightKey, {
				range: clonedRange,
				nugget
			});
			
			console.log('Successfully added CSS highlight:', highlightKey);
			return true;
		} catch (error) {
			console.error('Error creating CSS highlight:', error);
			return false;
		}
	}

	/**
	 * Highlight using DOM manipulation (fallback method)
	 * Uses cloneContents instead of extractContents to avoid data loss
	 */
	private highlightWithDOM(range: Range, nugget: GoldenNugget): boolean {
		try {
			if (range.collapsed) {
				console.warn('Cannot highlight collapsed range');
				return false;
			}

			// Use cloneContents instead of extractContents to preserve original content
			const contents = range.cloneContents();
			
			if (!contents || contents.childNodes.length === 0) {
				console.warn('No contents cloned from range');
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
				console.error('DOM insertion failed:', insertError);
				return false;
			}
			
			// Verify the highlight element is in the DOM
			if (!highlightElement.parentNode) {
				console.error('Highlight element was not properly inserted into DOM');
				return false;
			}
			
			this.highlightedElements.push(highlightElement);
			console.log('Successfully created DOM highlight');
			return true;
		} catch (error) {
			console.error('Error highlighting with DOM:', error);
			return false;
		}
	}
}