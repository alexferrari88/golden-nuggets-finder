/**
 * Highlighter for Golden Nuggets - TDD Implementation
 * This implementation will be built incrementally using TDD
 */

import { generateInlineStyles, colors } from '../../shared/design-system';
import type { GoldenNugget } from '../../shared/types';

export class Highlighter {
	private highlightedElements: HTMLElement[] = [];
	private highlightClassName = 'golden-nugget-highlight';

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

			// Highlight the range
			const highlightElement = this.highlightRange(range, nugget);
			if (!highlightElement) {
				console.warn('Could not create highlight for nugget:', nugget);
				return false;
			}

			// Store the highlighted element
			this.highlightedElements.push(highlightElement);
			
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
		// Find the highlight element for this nugget
		const highlightElement = this.highlightedElements.find(element => {
			const elementText = element.textContent || '';
			return elementText.includes(nugget.startContent) && elementText.includes(nugget.endContent);
		});

		if (highlightElement) {
			// Scroll to the element with some padding
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
		// Remove all highlighted elements
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
		return this.highlightedElements.length;
	}

	/**
	 * Check if a nugget is already highlighted
	 * Uses a more robust approach to prevent duplicates
	 */
	private isAlreadyHighlighted(nugget: GoldenNugget): boolean {
		// Create a unique key for this nugget based on start and end content
		const nuggetKey = `${nugget.startContent}→${nugget.endContent}`;
		
		// Check if we've already highlighted this exact nugget
		return this.highlightedElements.some(element => {
			const elementText = element.textContent || '';
			// Check if the highlighted element contains exactly this nugget's text span
			const elementKey = `${nugget.startContent}→${nugget.endContent}`;
			return elementText.includes(nugget.startContent) && 
			       elementText.includes(nugget.endContent) &&
			       element.hasAttribute('data-nugget-key') &&
			       element.getAttribute('data-nugget-key') === nuggetKey;
		});
	}

	/**
	 * Create a highlight element with proper styling
	 */
	private createHighlightElement(nugget?: GoldenNugget): HTMLSpanElement {
		const span = document.createElement('span');
		span.className = this.highlightClassName;
		span.setAttribute('data-golden-nugget-highlight', 'true');
		
		// Add unique nugget key to prevent duplicates
		if (nugget) {
			const nuggetKey = `${nugget.startContent}→${nugget.endContent}`;
			span.setAttribute('data-nugget-key', nuggetKey);
		}
		
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
	 * Wrap a range with a highlight element
	 * Handles ranges that span multiple DOM nodes with robust insertion
	 */
	private highlightRange(range: Range, nugget?: GoldenNugget): HTMLElement | null {
		try {
			// Check if range is collapsed (start and end are the same)
			if (range.collapsed) {
				console.warn('Cannot highlight collapsed range');
				return null;
			}

			// Store insertion context before extracting (range will collapse after extraction)
			const startContainer = range.startContainer;
			const startOffset = range.startOffset;
			const endContainer = range.endContainer;
			const endOffset = range.endOffset;
			
			console.log('Highlighting range:', {
				startContainer: startContainer.nodeName,
				startOffset,
				endContainer: endContainer.nodeName, 
				endOffset,
				nugget: nugget ? `${nugget.startContent}...${nugget.endContent}` : 'unknown'
			});

			// Extract the contents of the range
			const contents = range.extractContents();
			
			if (!contents || contents.childNodes.length === 0) {
				console.warn('No contents extracted from range');
				return null;
			}
			
			// Create a highlight element with nugget key for duplicate prevention
			const highlightElement = this.createHighlightElement(nugget);
			
			// Put the extracted contents inside the highlight element
			highlightElement.appendChild(contents);
			
			// Use robust insertion instead of relying on collapsed range
			// The range is now collapsed to the start position after extraction
			try {
				// First try the standard approach with the collapsed range
				range.insertNode(highlightElement);
				console.log('Successfully inserted highlight using range.insertNode');
			} catch (insertError) {
				console.warn('Range insertion failed, using fallback method:', insertError);
				
				// Fallback: Insert using DOM methods at the original start position
				if (startContainer.nodeType === Node.TEXT_NODE) {
					// Insert at text node position
					const parent = startContainer.parentNode;
					if (parent) {
						parent.insertBefore(highlightElement, startContainer.nextSibling);
						console.log('Successfully inserted highlight using DOM fallback at text node');
					} else {
						throw new Error('Cannot find parent node for insertion');
					}
				} else {
					// Insert at element position
					startContainer.insertBefore(highlightElement, startContainer.childNodes[startOffset] || null);
					console.log('Successfully inserted highlight using DOM fallback at element');
				}
			}
			
			// Verify the highlight element is in the DOM
			if (!highlightElement.parentNode) {
				console.error('Highlight element was not properly inserted into DOM');
				return null;
			}
			
			console.log('Successfully highlighted content, element in DOM:', highlightElement.textContent?.substring(0, 50) + '...');
			return highlightElement;
		} catch (error) {
			console.error('Error highlighting range:', error);
			return null;
		}
	}
}