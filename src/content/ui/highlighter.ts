import type { GoldenNugget } from '../../shared/types';
import { colors, generateInlineStyles } from '../../shared/design-system';
import { improvedStartEndMatching, advancedNormalize } from '../../shared/content-reconstruction';

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
    
    // Debug: Show some sample text nodes
    console.log(`[Highlighter] Sample text nodes:`);
    textNodes.slice(0, 10).forEach((node, i) => {
      const text = (node.textContent || '').substring(0, 100);
      console.log(`  [${i}]: "${text}"`);
    });
    
    // Find the start and end positions
    const startResult = this.findTextInNodes(textNodes, startContent);
    if (!startResult) {
      console.log(`[Highlighter] Could not find start content: "${startContent}"`);
      console.log(`[Highlighter] Normalized search: "${this.normalizeText(startContent)}"`);
      
      // Try fuzzy matching as fallback
      const fuzzyResult = this.findTextFuzzy(textNodes, startContent);
      if (fuzzyResult) {
        console.log(`[Highlighter] Found start content via fuzzy matching at node ${fuzzyResult.nodeIndex}`);
        return this.highlightFuzzyMatch(textNodes, fuzzyResult, startContent, endContent);
      }
      
      // Try content reconstruction approach
      const reconstructionResult = this.findWithContentReconstruction(startContent, endContent);
      if (reconstructionResult) {
        console.log(`[Highlighter] Found content via reconstruction approach`);
        return reconstructionResult;
      }
      
      return false;
    }
    
    const endResult = this.findTextInNodes(textNodes, endContent, startResult.nodeIndex);
    if (!endResult) {
      console.log(`[Highlighter] Could not find end content: "${endContent}"`);
      console.log(`[Highlighter] Normalized search: "${this.normalizeText(endContent)}"`);
      
      // Try fuzzy matching for end content
      const fuzzyEndResult = this.findTextFuzzy(textNodes, endContent, startResult.nodeIndex);
      if (fuzzyEndResult) {
        console.log(`[Highlighter] Found end content via fuzzy matching at node ${fuzzyEndResult.nodeIndex}`);
        return this.highlightRange(textNodes, startResult, fuzzyEndResult, endContent.length);
      }
      
      return false;
    }
    
    console.log(`[Highlighter] Found start at node ${startResult.nodeIndex}, pos ${startResult.position}`);
    console.log(`[Highlighter] Found end at node ${endResult.nodeIndex}, pos ${endResult.position + endContent.length}`);
    
    // Highlight the content between start and end
    return this.highlightRange(textNodes, startResult, endResult, endContent.length);
  }

  /**
   * Get all text nodes in the document - improved to be more inclusive
   */
  private getAllTextNodes(element: Node): Text[] {
    const textNodes: Text[] = [];
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // Skip text nodes in script/style tags but be more permissive otherwise
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          
          const tagName = parent.tagName?.toLowerCase();
          if (tagName === 'script' || tagName === 'style' || tagName === 'noscript') {
            return NodeFilter.FILTER_REJECT;
          }
          
          const text = node.textContent || '';
          // Accept nodes with any text content, even if it's just whitespace
          // We'll handle whitespace normalization later
          if (text.length === 0) {
            return NodeFilter.FILTER_REJECT;
          }
          
          // Accept if it has any non-whitespace characters OR if it has significant whitespace
          if (text.trim().length > 0 || text.length > 1) {
            return NodeFilter.FILTER_ACCEPT;
          }
          
          return NodeFilter.FILTER_REJECT;
        }
      }
    );

    let node: Node | null;
    while (node = walker.nextNode()) {
      textNodes.push(node as Text);
    }
    
    console.log(`[Highlighter] Found ${textNodes.length} text nodes total`);
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
   * Fuzzy text matching - finds partial matches and word-based matches
   */
  private findTextFuzzy(textNodes: Text[], searchText: string, startFromIndex: number = 0): {nodeIndex: number, position: number} | null {
    const normalizedSearch = this.normalizeText(searchText);
    const searchWords = normalizedSearch.split(' ').filter(word => word.length > 2); // Only significant words
    
    console.log(`[Highlighter] Fuzzy search for: "${normalizedSearch}", words: [${searchWords.join(', ')}]`);
    
    // Strategy 1: Look for the first few words
    if (searchWords.length >= 2) {
      const firstTwoWords = searchWords.slice(0, 2).join(' ');
      for (let i = startFromIndex; i < textNodes.length; i++) {
        const node = textNodes[i];
        const nodeText = this.normalizeText(node.textContent || '');
        const position = nodeText.indexOf(firstTwoWords);
        
        if (position !== -1) {
          console.log(`[Highlighter] Found first two words "${firstTwoWords}" at node ${i}, pos ${position}`);
          return { nodeIndex: i, position };
        }
      }
    }
    
    // Strategy 2: Look for just the first word
    if (searchWords.length >= 1) {
      const firstWord = searchWords[0];
      for (let i = startFromIndex; i < textNodes.length; i++) {
        const node = textNodes[i];
        const nodeText = this.normalizeText(node.textContent || '');
        const position = nodeText.indexOf(firstWord);
        
        if (position !== -1) {
          console.log(`[Highlighter] Found first word "${firstWord}" at node ${i}, pos ${position}`);
          return { nodeIndex: i, position };
        }
      }
    }
    
    // Strategy 3: Case-sensitive partial match
    for (let i = startFromIndex; i < textNodes.length; i++) {
      const node = textNodes[i];
      const nodeText = node.textContent || '';
      const position = nodeText.indexOf(searchText);
      
      if (position !== -1) {
        console.log(`[Highlighter] Found case-sensitive match at node ${i}, pos ${position}`);
        return { nodeIndex: i, position };
      }
    }
    
    return null;
  }

  /**
   * Highlight a fuzzy match
   */
  private highlightFuzzyMatch(
    textNodes: Text[],
    startResult: {nodeIndex: number, position: number},
    startContent: string,
    endContent: string
  ): boolean {
    console.log(`[Highlighter] Attempting fuzzy match highlighting`);
    
    // For fuzzy matches, try to find end content near the start
    const maxSearchNodes = Math.min(20, textNodes.length - startResult.nodeIndex);
    
    for (let offset = 0; offset < maxSearchNodes; offset++) {
      const nodeIndex = startResult.nodeIndex + offset;
      if (nodeIndex >= textNodes.length) break;
      
      const endResult = this.findTextFuzzy(textNodes, endContent, nodeIndex);
      if (endResult) {
        console.log(`[Highlighter] Found end content via fuzzy matching`);
        return this.highlightRange(textNodes, startResult, endResult, endContent.length);
      }
    }
    
    // If we can't find end content, highlight just a reasonable portion from start
    console.log(`[Highlighter] Could not find end content, highlighting start portion`);
    const startNode = textNodes[startResult.nodeIndex];
    const startText = startNode.textContent || '';
    const endPos = Math.min(startText.length, startResult.position + Math.max(50, startContent.length * 2));
    
    return this.highlightSingleNode(startNode, startResult.position, endPos);
  }

  /**
   * Use content reconstruction approach to find and highlight content
   */
  private findWithContentReconstruction(startContent: string, endContent: string): boolean {
    console.log(`[Highlighter] Trying content reconstruction approach`);
    
    // Get the full page text content
    const pageContent = document.body.textContent || '';
    console.log(`[Highlighter] Page content length: ${pageContent.length} chars`);
    
    // Use the improved matching from content-reconstruction
    const matchResult = improvedStartEndMatching(startContent, endContent, pageContent);
    
    if (matchResult.success && matchResult.startIndex !== undefined && matchResult.endIndex !== undefined) {
      console.log(`[Highlighter] Content reconstruction found match at positions ${matchResult.startIndex}-${matchResult.endIndex}`);
      
      // Now we need to find these character positions in the DOM and highlight them
      return this.highlightByCharacterRange(matchResult.startIndex, matchResult.endIndex);
    }
    
    console.log(`[Highlighter] Content reconstruction failed: ${matchResult.reason}`);
    return false;
  }

  /**
   * Highlight content by character range in the full page text
   */
  private highlightByCharacterRange(startIndex: number, endIndex: number): boolean {
    console.log(`[Highlighter] Highlighting character range ${startIndex}-${endIndex}`);
    
    const textNodes = this.getAllTextNodes(document.body);
    let currentIndex = 0;
    let startNode: Text | null = null;
    let startPos = 0;
    let endNode: Text | null = null;
    let endPos = 0;
    
    // Find the text nodes that contain our start and end positions
    for (const node of textNodes) {
      const nodeText = node.textContent || '';
      const nodeLength = nodeText.length;
      
      // Check if start position is in this node
      if (startNode === null && currentIndex + nodeLength > startIndex) {
        startNode = node;
        startPos = startIndex - currentIndex;
        console.log(`[Highlighter] Found start position in node, pos: ${startPos}`);
      }
      
      // Check if end position is in this node
      if (currentIndex + nodeLength >= endIndex) {
        endNode = node;
        endPos = endIndex - currentIndex;
        console.log(`[Highlighter] Found end position in node, pos: ${endPos}`);
        break;
      }
      
      currentIndex += nodeLength;
    }
    
    if (startNode && endNode) {
      if (startNode === endNode) {
        // Single node highlighting
        return this.highlightSingleNode(startNode, startPos, endPos);
      } else {
        // Multi-node highlighting
        const startNodeIndex = textNodes.indexOf(startNode);
        const endNodeIndex = textNodes.indexOf(endNode);
        
        if (startNodeIndex !== -1 && endNodeIndex !== -1) {
          return this.highlightMultipleNodes(
            textNodes,
            { nodeIndex: startNodeIndex, position: startPos },
            { nodeIndex: endNodeIndex, position: endPos }, // End position in end node
            0 // endContentLength not needed for character range
          );
        }
      }
    }
    
    console.log(`[Highlighter] Could not map character range to DOM nodes`);
    return false;
  }

  /**
   * Normalize text for matching (handle unicode variants, etc.)
   * Uses advanced normalization from content-reconstruction module
   */
  private normalizeText(text: string): string {
    return advancedNormalize(text);
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