import type { GoldenNugget } from '../../shared/types';
import { colors, generateInlineStyles } from '../../shared/design-system';

/**
 * Highlighter class responsible for highlighting golden nuggets on the page
 * Uses TDD approach - built incrementally to pass tests
 */
export class Highlighter {
  private highlightedElements: Set<HTMLElement> = new Set();
  private highlightClass = 'golden-nugget-highlight';

  constructor() {
    this.injectStyles();
  }

  /**
   * Highlight a single golden nugget on the page
   * @param nugget - The golden nugget to highlight
   * @param pageContent - Optional page content for reconstruction
   * @returns true if highlighting was successful, false otherwise
   */
  highlightNugget(nugget: GoldenNugget, pageContent?: string): boolean {
    try {
      console.log(`[Highlighter] Attempting to highlight nugget: "${nugget.startContent}" -> "${nugget.endContent}"`);
      
      // Find text nodes that contain our content
      const result = this.findAndHighlightContent(nugget.startContent, nugget.endContent);
      
      if (result) {
        console.log(`[Highlighter] Successfully highlighted nugget`);
        return true;
      } else {
        console.log(`[Highlighter] Failed to find content for nugget`);
        return false;
      }
    } catch (error) {
      console.error('Error highlighting nugget:', error);
      return false;
    }
  }

  /**
   * Find and highlight content between startContent and endContent
   * @param startContent - The starting text to find
   * @param endContent - The ending text to find
   * @returns true if content was found and highlighted, false otherwise
   */
  private findAndHighlightContent(startContent: string, endContent: string): boolean {
    console.log(`[Highlighter] Looking for content from "${startContent}" to "${endContent}"`);
    
    // Get all text nodes in the document
    const textNodes = this.getAllTextNodes(document.body);
    console.log(`[Highlighter] Found ${textNodes.length} text nodes to search`);
    
    // Find the start and end positions
    const startResult = this.findTextInNodes(textNodes, startContent);
    if (!startResult) {
      console.log(`[Highlighter] Could not find start content: "${startContent}"`);
      return false;
    }
    
    const endResult = this.findTextInNodes(textNodes, endContent, startResult.nodeIndex);
    if (!endResult) {
      console.log(`[Highlighter] Could not find end content: "${endContent}"`);
      return false;
    }
    
    console.log(`[Highlighter] Found start at node ${startResult.nodeIndex}, pos ${startResult.position}`);
    console.log(`[Highlighter] Found end at node ${endResult.nodeIndex}, pos ${endResult.position + endContent.length}`);
    
    // Highlight the content between start and end
    return this.highlightRange(textNodes, startResult, endResult, endContent.length);
  }

  /**
   * Get all text nodes in the document
   */
  private getAllTextNodes(element: Node): Text[] {
    const textNodes: Text[] = [];
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // Skip text nodes that are only whitespace or in script/style tags
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          
          const tagName = parent.tagName?.toLowerCase();
          if (tagName === 'script' || tagName === 'style' || tagName === 'noscript') {
            return NodeFilter.FILTER_REJECT;
          }
          
          const text = node.textContent?.trim();
          if (!text || text.length === 0) {
            return NodeFilter.FILTER_REJECT;
          }
          
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let node: Node | null;
    while (node = walker.nextNode()) {
      textNodes.push(node as Text);
    }
    
    return textNodes;
  }

  /**
   * Find text within text nodes - improved to handle cross-node text
   */
  private findTextInNodes(textNodes: Text[], searchText: string, startFromIndex: number = 0): {nodeIndex: number, position: number} | null {
    const normalizedSearch = this.normalizeText(searchText);
    
    // First try exact matches within single nodes
    for (let i = startFromIndex; i < textNodes.length; i++) {
      const node = textNodes[i];
      const nodeText = this.normalizeText(node.textContent || '');
      const position = nodeText.indexOf(normalizedSearch);
      
      if (position !== -1) {
        return { nodeIndex: i, position };
      }
    }
    
    // If not found, try cross-node matching
    return this.findCrossNodeText(textNodes, searchText, startFromIndex);
  }

  /**
   * Find text that might span across multiple text nodes
   */
  private findCrossNodeText(textNodes: Text[], searchText: string, startFromIndex: number = 0): {nodeIndex: number, position: number} | null {
    const normalizedSearch = this.normalizeText(searchText);
    const searchWords = normalizedSearch.split(' ').filter(word => word.length > 0);
    
    if (searchWords.length === 0) return null;
    
    // Look for the first word to establish a starting point
    const firstWord = searchWords[0];
    
    for (let i = startFromIndex; i < textNodes.length; i++) {
      const node = textNodes[i];
      const nodeText = this.normalizeText(node.textContent || '');
      const position = nodeText.indexOf(firstWord);
      
      if (position !== -1) {
        // Check if we can match the full search text starting from this position
        if (this.matchesFromPosition(textNodes, i, position, normalizedSearch)) {
          return { nodeIndex: i, position };
        }
      }
    }
    
    return null;
  }

  /**
   * Check if the search text matches starting from a specific position across nodes
   */
  private matchesFromPosition(textNodes: Text[], startNodeIndex: number, startPos: number, searchText: string): boolean {
    let searchIndex = 0;
    let currentNodeIndex = startNodeIndex;
    let currentPos = startPos;
    
    while (searchIndex < searchText.length && currentNodeIndex < textNodes.length) {
      const node = textNodes[currentNodeIndex];
      const nodeText = this.normalizeText(node.textContent || '');
      
      // Match characters from current position
      while (currentPos < nodeText.length && searchIndex < searchText.length) {
        if (nodeText[currentPos] === searchText[searchIndex]) {
          searchIndex++;
        } else if (searchText[searchIndex] === ' ' && /\s/.test(nodeText[currentPos])) {
          // Allow any whitespace to match space
          searchIndex++;
        } else {
          return false; // Mismatch
        }
        currentPos++;
      }
      
      // Move to next node
      currentNodeIndex++;
      currentPos = 0;
    }
    
    return searchIndex === searchText.length;
  }

  /**
   * Normalize text for matching (handle unicode variants, etc.)
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[''`´]/g, "'")
      .replace(/[""«»]/g, '"')
      .replace(/[–—−]/g, '-')
      .replace(/[…]/g, '...')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Highlight a range of text across potentially multiple text nodes
   */
  private highlightRange(
    textNodes: Text[], 
    startResult: {nodeIndex: number, position: number}, 
    endResult: {nodeIndex: number, position: number},
    endContentLength: number
  ): boolean {
    try {
      // For now, implement simple single-node highlighting
      if (startResult.nodeIndex === endResult.nodeIndex) {
        // Content is within a single text node
        return this.highlightSingleNode(
          textNodes[startResult.nodeIndex],
          startResult.position,
          endResult.position + endContentLength
        );
      } else {
        // Content spans multiple nodes - more complex case
        return this.highlightMultipleNodes(textNodes, startResult, endResult, endContentLength);
      }
    } catch (error) {
      console.error('[Highlighter] Error highlighting range:', error);
      return false;
    }
  }

  /**
   * Highlight content within a single text node
   */
  private highlightSingleNode(textNode: Text, startPos: number, endPos: number): boolean {
    try {
      const parent = textNode.parentElement;
      if (!parent) return false;

      const originalText = textNode.textContent || '';
      const beforeText = originalText.substring(0, startPos);
      const highlightText = originalText.substring(startPos, endPos);
      const afterText = originalText.substring(endPos);

      console.log(`[Highlighter] Highlighting single node: "${highlightText}"`);

      // Create highlight span
      const span = document.createElement('span');
      span.className = this.highlightClass;
      span.textContent = highlightText;
      
      // Replace the text node with highlighted content
      if (beforeText) {
        parent.insertBefore(document.createTextNode(beforeText), textNode);
      }
      parent.insertBefore(span, textNode);
      if (afterText) {
        parent.insertBefore(document.createTextNode(afterText), textNode);
      }
      parent.removeChild(textNode);

      this.highlightedElements.add(span);
      return true;
    } catch (error) {
      console.error('[Highlighter] Error highlighting single node:', error);
      return false;
    }
  }

  /**
   * Highlight content that spans multiple text nodes
   */
  private highlightMultipleNodes(
    textNodes: Text[],
    startResult: {nodeIndex: number, position: number},
    endResult: {nodeIndex: number, position: number},
    endContentLength: number
  ): boolean {
    console.log(`[Highlighter] Highlighting across multiple nodes from ${startResult.nodeIndex} to ${endResult.nodeIndex}`);
    
    try {
      let highlightedCount = 0;
      
      for (let i = startResult.nodeIndex; i <= endResult.nodeIndex; i++) {
        const node = textNodes[i];
        const parent = node.parentElement;
        if (!parent) continue;
        
        let startPos = 0;
        let endPos = node.textContent?.length || 0;
        
        // Adjust start position for first node
        if (i === startResult.nodeIndex) {
          startPos = startResult.position;
        }
        
        // Adjust end position for last node
        if (i === endResult.nodeIndex) {
          endPos = endResult.position + endContentLength;
        }
        
        // Highlight this portion of the node
        if (this.highlightSingleNode(node, startPos, endPos)) {
          highlightedCount++;
        }
      }
      
      return highlightedCount > 0;
    } catch (error) {
      console.error('[Highlighter] Error in multi-node highlighting:', error);
      
      // Fallback to single node highlighting of just the start
      console.log(`[Highlighter] Falling back to start-only highlighting`);
      const startNode = textNodes[startResult.nodeIndex];
      const startText = startNode.textContent || '';
      const endPos = Math.min(startText.length, startResult.position + 50); // Highlight first 50 chars as fallback
      
      return this.highlightSingleNode(startNode, startResult.position, endPos);
    }
  }

  /**
   * Clear all highlights from the page
   */
  clearHighlights(): void {
    // Remove all highlighted elements
    this.highlightedElements.forEach(element => {
      element.classList.remove(this.highlightClass);
      element.style.removeProperty('background-color');
      element.style.removeProperty('border-radius');
      element.style.removeProperty('padding');
      element.style.removeProperty('border');
      element.style.removeProperty('box-shadow');
    });
    this.highlightedElements.clear();
  }

  /**
   * Inject CSS styles for highlighting
   */
  private injectStyles(): void {
    if (document.getElementById('golden-nuggets-highlighter-styles')) {
      return; // Already injected
    }

    const style = document.createElement('style');
    style.id = 'golden-nuggets-highlighter-styles';
    style.textContent = `
      .${this.highlightClass} {
        ${generateInlineStyles.highlightStyle()}
      }
      
      .${this.highlightClass}:hover {
        background-color: ${colors.highlight.hover} !important;
      }
    `;
    
    document.head.appendChild(style);
  }
}

// Expose functions globally for testing purposes
declare global {
  interface Window {
    highlightNuggets?: (nuggets: GoldenNugget[]) => { success: boolean; error?: string };
    highlightNugget?: (nugget: GoldenNugget) => { success: boolean; error?: string };
  }
}

// Global functions for testing
const globalHighlighter = new Highlighter();

window.highlightNuggets = (nuggets: GoldenNugget[]) => {
  try {
    let successCount = 0;
    
    for (const nugget of nuggets) {
      if (globalHighlighter.highlightNugget(nugget)) {
        successCount++;
      }
    }
    
    const success = successCount > 0;
    return { 
      success, 
      error: success ? undefined : 'No nuggets were successfully highlighted'
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

window.highlightNugget = (nugget: GoldenNugget) => {
  try {
    const success = globalHighlighter.highlightNugget(nugget);
    return { 
      success, 
      error: success ? undefined : 'Failed to highlight nugget'
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};