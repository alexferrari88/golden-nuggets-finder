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
  private originalTextBackup: Map<HTMLElement, { originalText: string; parent: Element; nextSibling: Node | null }> = new Map();

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
      
      // Pre-validation: ensure content isn't unreasonably long
      const expectedLength = nugget.startContent.length + nugget.endContent.length;
      if (expectedLength > 500) {
        console.log(`[Highlighter] Nugget content too long (${expectedLength} chars), refusing to highlight`);
        return false;
      }
      
      // Find text nodes that contain our content
      const result = this.findAndHighlightContent(nugget.startContent, nugget.endContent);
      
      if (result) {
        // Post-validation: check if we highlighted too much (only for extreme cases)
        const highlightedElements = document.querySelectorAll('.golden-nugget-highlight');
        const totalHighlighted = Array.from(highlightedElements).reduce((sum, el) => 
          sum + (el.textContent?.length || 0), 0
        );
        
        console.log(`[Highlighter] Total highlighted: ${totalHighlighted} chars across ${highlightedElements.length} elements`);
        
        // Only reject if highlighting is EXTREMELY excessive (>1500 chars or >15 elements)
        if (totalHighlighted > 1500 || highlightedElements.length > 15) {
          console.log(`[Highlighter] Extremely over-highlighted (${totalHighlighted} chars, ${highlightedElements.length} elements), rolling back highlights`);
          this.rollbackHighlights(Array.from(highlightedElements));
          return false;
        }
        
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
   * Prioritizes content reconstruction for cross-node reliability
   * @param startContent - The starting text to find
   * @param endContent - The ending text to find
   * @returns true if content was found and highlighted, false otherwise
   */
  private findAndHighlightContent(startContent: string, endContent: string): boolean {
    console.log(`[Highlighter] Looking for content from "${startContent}" to "${endContent}"`);
    
    // STRATEGY 1: Content reconstruction (most robust for cross-node splits)
    console.log(`[Highlighter] Trying content reconstruction approach first`);
    const reconstructionResult = this.findWithContentReconstruction(startContent, endContent);
    if (reconstructionResult) {
      console.log(`[Highlighter] Success with content reconstruction approach`);
      return true;
    }
    console.log(`[Highlighter] Content reconstruction failed, trying text node approaches`);
    
    // STRATEGY 2: Text node based approaches (legacy fallbacks)
    const textNodes = this.getAllTextNodes(document.body);
    console.log(`[Highlighter] Found ${textNodes.length} text nodes to search`);
    
    // Try exact text node matching
    const startResult = this.findTextInNodes(textNodes, startContent);
    if (startResult) {
      const endResult = this.findTextInNodes(textNodes, endContent, startResult.nodeIndex);
      if (endResult) {
        console.log(`[Highlighter] Found via exact text node matching`);
        return this.highlightRange(textNodes, startResult, endResult, endContent.length);
      }
    }
    
    // Try fuzzy matching as final fallback
    console.log(`[Highlighter] Trying fuzzy matching as final fallback`);
    const fuzzyResult = this.findTextFuzzy(textNodes, startContent);
    if (fuzzyResult) {
      console.log(`[Highlighter] Found start content via fuzzy matching at node ${fuzzyResult.nodeIndex}`);
      return this.highlightFuzzyMatch(textNodes, fuzzyResult, startContent, endContent);
    }
    
    console.log(`[Highlighter] All highlighting strategies failed`);
    return false;
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
   * Hybrid approach: try precise DOM-based first, fall back to original method
   */
  private findWithContentReconstruction(startContent: string, endContent: string): boolean {
    console.log(`[Highlighter] Trying content reconstruction approach`);
    
    // STRATEGY 1: Try precise DOM-based approach first
    const textNodes = this.getAllTextNodes(document.body);
    const domBasedResult = this.buildDOMBasedTextMapping(textNodes);
    
    if (domBasedResult.success) {
      const { fullText, nodePositions } = domBasedResult;
      console.log(`[Highlighter] Trying DOM-based approach (${fullText.length} chars from ${nodePositions.length} nodes)`);
      
      const matchResult = improvedStartEndMatching(startContent, endContent, fullText);
      
      if (matchResult.success && matchResult.startIndex !== undefined && matchResult.endIndex !== undefined) {
        console.log(`[Highlighter] DOM-based match found at ${matchResult.startIndex}-${matchResult.endIndex}`);
        
        const result = this.highlightByDOMBasedRange(matchResult.startIndex, matchResult.endIndex, nodePositions);
        if (result) {
          console.log(`[Highlighter] DOM-based highlighting succeeded`);
          return true;
        }
      }
    }
    
    console.log(`[Highlighter] DOM-based approach failed, trying original method`);
    
    // STRATEGY 2: Fall back to original approach with safety validation
    const pageContent = document.body.textContent || '';
    console.log(`[Highlighter] Trying original content reconstruction (${pageContent.length} chars)`);
    
    const matchResult = improvedStartEndMatching(startContent, endContent, pageContent);
    console.log(`[Highlighter] Original matching result:`, matchResult);
    
    if (matchResult.success && matchResult.startIndex !== undefined && matchResult.endIndex !== undefined) {
      console.log(`[Highlighter] Original method found match at ${matchResult.startIndex}-${matchResult.endIndex}`);
      
      // Use original character range mapping but with safety checks
      return this.highlightByCharacterRange(matchResult.startIndex, matchResult.endIndex);
    }
    
    console.log(`[Highlighter] All content reconstruction strategies failed`);
    return false;
  }

  /**
   * Build text content and position mapping directly from DOM nodes
   * This eliminates DOM/textContent mismatch issues
   */
  private buildDOMBasedTextMapping(textNodes: Text[]): {
    success: boolean;
    reason?: string;
    fullText: string;
    nodePositions: Array<{
      node: Text;
      parent: Element;
      startIndex: number;
      endIndex: number;
    }>;
  } {
    const nodePositions: Array<{
      node: Text;
      parent: Element;
      startIndex: number;
      endIndex: number;
    }> = [];
    
    let fullText = '';
    
    for (const node of textNodes) {
      const parent = node.parentElement;
      if (!parent) continue;
      
      const nodeText = node.textContent || '';
      if (nodeText.length === 0) continue;
      
      const startIndex = fullText.length;
      const endIndex = startIndex + nodeText.length;
      
      nodePositions.push({
        node,
        parent,
        startIndex,
        endIndex
      });
      
      fullText += nodeText;
    }
    
    if (nodePositions.length === 0) {
      return {
        success: false,
        reason: 'No valid text nodes found',
        fullText: '',
        nodePositions: []
      };
    }
    
    return {
      success: true,
      fullText,
      nodePositions
    };
  }

  /**
   * Highlight content by character range using precise DOM-based mapping
   */
  private highlightByDOMBasedRange(
    startIndex: number, 
    endIndex: number, 
    nodePositions: Array<{
      node: Text;
      parent: Element;
      startIndex: number;
      endIndex: number;
    }>
  ): boolean {
    console.log(`[Highlighter] Highlighting DOM-based range ${startIndex}-${endIndex}`);
    
    const nodesToHighlight: Array<{
      node: Text,
      startPos: number,
      endPos: number,
      parent: Element
    }> = [];
    
    // Find nodes that intersect with our target range
    for (const nodePos of nodePositions) {
      if (nodePos.startIndex < endIndex && nodePos.endIndex > startIndex) {
        // Calculate precise intersection
        const highlightStart = Math.max(0, startIndex - nodePos.startIndex);
        const highlightEnd = Math.min(nodePos.node.textContent?.length || 0, endIndex - nodePos.startIndex);
        
        if (highlightStart < highlightEnd && highlightStart >= 0) {
          const highlightText = (nodePos.node.textContent || '').substring(highlightStart, highlightEnd);
          console.log(`[Highlighter] DOM node intersects: highlighting "${highlightText}"`);
          
          nodesToHighlight.push({
            node: nodePos.node,
            startPos: highlightStart,
            endPos: highlightEnd,
            parent: nodePos.parent
          });
        }
      }
    }
    
    if (nodesToHighlight.length === 0) {
      console.log(`[Highlighter] No DOM nodes intersect with range ${startIndex}-${endIndex}`);
      return false;
    }
    
    // Validate that we're not highlighting too much content
    const totalHighlightLength = nodesToHighlight.reduce((sum, item) => 
      sum + (item.endPos - item.startPos), 0
    );
    
    console.log(`[Highlighter] Will highlight ${nodesToHighlight.length} nodes, ${totalHighlightLength} chars total`);
    
    // Safety check: don't highlight excessively long content
    if (totalHighlightLength > 1000) {
      console.log(`[Highlighter] Refusing to highlight ${totalHighlightLength} chars (too long)`);
      return false;
    }
    
    return this.safeMultiNodeHighlight(nodesToHighlight);
  }

  /**
   * Highlight content by character range in the full page text
   * Enhanced to handle cross-node splits and fragmented text properly
   */
  private highlightByCharacterRange(startIndex: number, endIndex: number): boolean {
    console.log(`[Highlighter] Highlighting character range ${startIndex}-${endIndex}`);
    
    // First, let's verify what text we expect to find
    const pageContent = document.body.textContent || '';
    const expectedText = pageContent.substring(startIndex, endIndex);
    console.log(`[Highlighter] Expected text from range: "${expectedText.substring(0, 100)}..."`);
    
    // Use a more robust approach to find text nodes
    const result = this.findTextNodesForCharacterRange(startIndex, endIndex, pageContent);
    
    if (!result.success) {
      console.log(`[Highlighter] Failed to find text nodes: ${result.reason}`);
      return false;
    }
    
    console.log(`[Highlighter] Found ${result.nodesToHighlight.length} nodes to highlight`);
    
    // Highlight all nodes without DOM invalidation
    return this.safeMultiNodeHighlight(result.nodesToHighlight);
  }

  /**
   * Find text nodes that correspond to a character range in the full page text
   * Uses a more accurate approach that handles cross-node splits and fragmentation
   */
  private findTextNodesForCharacterRange(
    startIndex: number, 
    endIndex: number, 
    pageContent: string
  ): {
    success: boolean;
    reason?: string;
    nodesToHighlight: Array<{
      node: Text,
      startPos: number,
      endPos: number,
      parent: Element
    }>;
  } {
    const expectedText = pageContent.substring(startIndex, endIndex);
    console.log(`[Highlighter] Looking for text: "${expectedText.substring(0, 50)}..."`);
    
    const textNodes = this.getAllTextNodes(document.body);
    const nodesToHighlight: Array<{
      node: Text,
      startPos: number,
      endPos: number,
      parent: Element
    }> = [];
    
    // Try character-by-character mapping approach first
    const charMappingResult = this.mapCharacterRangeToNodes(startIndex, endIndex, textNodes, pageContent);
    if (charMappingResult.success) {
      return charMappingResult;
    }
    
    console.log(`[Highlighter] Character mapping failed: ${charMappingResult.reason}`);
    console.log(`[Highlighter] Trying content-based matching approach`);
    
    // Fallback: Find nodes that contain parts of our expected text
    return this.findNodesByContentMatching(expectedText, textNodes);
  }

  /**
   * Map character range to DOM nodes using precise character counting
   * Fixed to handle text content extraction more accurately
   */
  private mapCharacterRangeToNodes(
    startIndex: number,
    endIndex: number,
    textNodes: Text[],
    pageContent: string
  ): {
    success: boolean;
    reason?: string;
    nodesToHighlight: Array<{
      node: Text,
      startPos: number,
      endPos: number,
      parent: Element
    }>;
  } {
    const nodesToHighlight: Array<{
      node: Text,
      startPos: number,
      endPos: number,
      parent: Element
    }> = [];
    
    console.log(`[Highlighter] Mapping character range ${startIndex}-${endIndex} to DOM nodes`);
    
    // Build a more accurate mapping by reconstructing text from DOM
    let currentIndex = 0;
    const nodePositions: Array<{
      node: Text,
      startIndex: number,
      endIndex: number,
      parent: Element
    }> = [];
    
    // First pass: build accurate position mapping
    for (let i = 0; i < textNodes.length; i++) {
      const node = textNodes[i];
      const nodeText = node.textContent || '';
      const parent = node.parentElement;
      
      if (!parent || nodeText.length === 0) {
        continue;
      }
      
      nodePositions.push({
        node,
        startIndex: currentIndex,
        endIndex: currentIndex + nodeText.length,
        parent
      });
      
      currentIndex += nodeText.length;
    }
    
    console.log(`[Highlighter] Built position mapping: ${nodePositions.length} nodes, total length: ${currentIndex}`);
    console.log(`[Highlighter] Page content length: ${pageContent.length}`);
    
    // Verify the reconstructed text matches the expected page content structure
    const reconstructedText = nodePositions.map(pos => pos.node.textContent || '').join('');
    const similarity = this.calculateTextSimilarity(
      this.normalizeText(reconstructedText), 
      this.normalizeText(pageContent)
    );
    
    console.log(`[Highlighter] DOM text vs page content similarity: ${similarity.toFixed(2)}`);
    
    if (similarity < 0.8) {
      console.log(`[Highlighter] DOM text doesn't match page content well enough (${similarity.toFixed(2)})`);
      return {
        success: false,
        reason: `DOM reconstruction similarity too low: ${similarity.toFixed(2)}`,
        nodesToHighlight: []
      };
    }
    
    // Second pass: find nodes that intersect with our target range
    for (const nodePos of nodePositions) {
      // Check if this node intersects with our target range
      if (nodePos.startIndex < endIndex && nodePos.endIndex > startIndex) {
        // Calculate precise intersection boundaries
        const highlightStart = Math.max(0, startIndex - nodePos.startIndex);
        const highlightEnd = Math.min(nodePos.node.textContent?.length || 0, endIndex - nodePos.startIndex);
        
        // Validate the intersection
        if (highlightStart < highlightEnd && highlightStart >= 0) {
          const highlightText = (nodePos.node.textContent || '').substring(highlightStart, highlightEnd);
          console.log(`[Highlighter] Node intersects (${nodePos.startIndex}-${nodePos.endIndex}): highlighting "${highlightText}"`);
          
          nodesToHighlight.push({
            node: nodePos.node,
            startPos: highlightStart,
            endPos: highlightEnd,
            parent: nodePos.parent
          });
        }
      }
    }
    
    if (nodesToHighlight.length === 0) {
      return {
        success: false,
        reason: `No intersecting nodes found for range ${startIndex}-${endIndex}`,
        nodesToHighlight: []
      };
    }
    
    // Final validation: check if the accumulated highlighted text makes sense
    const accumulatedText = nodesToHighlight.map(item => 
      (item.node.textContent || '').substring(item.startPos, item.endPos)
    ).join('');
    
    const expectedText = pageContent.substring(startIndex, endIndex);
    const normalizedAccumulated = this.normalizeText(accumulatedText);
    const normalizedExpected = this.normalizeText(expectedText);
    
    const textSimilarity = this.calculateTextSimilarity(normalizedAccumulated, normalizedExpected);
    console.log(`[Highlighter] Final text similarity: ${textSimilarity.toFixed(2)}`);
    console.log(`[Highlighter] Accumulated: "${normalizedAccumulated.substring(0, 80)}..."`);
    console.log(`[Highlighter] Expected: "${normalizedExpected.substring(0, 80)}..."`);
    
    if (textSimilarity < 0.7) {
      return {
        success: false,
        reason: `Final text similarity too low: ${textSimilarity.toFixed(2)}`,
        nodesToHighlight: []
      };
    }
    
    return {
      success: true,
      nodesToHighlight
    };
  }

  /**
   * Fallback approach: find nodes by matching content directly
   * Fixed to be more precise and avoid highlighting entire nodes unnecessarily
   */
  private findNodesByContentMatching(
    expectedText: string,
    textNodes: Text[]
  ): {
    success: boolean;
    reason?: string;
    nodesToHighlight: Array<{
      node: Text,
      startPos: number,
      endPos: number,
      parent: Element
    }>;
  } {
    const normalizedExpected = this.normalizeText(expectedText);
    const expectedWords = normalizedExpected.split(' ').filter(word => word.length > 2);
    
    if (expectedWords.length === 0) {
      return {
        success: false,
        reason: 'No significant words in expected text',
        nodesToHighlight: []
      };
    }
    
    console.log(`[Highlighter] Content matching for words: [${expectedWords.slice(0, 5).join(', ')}]${expectedWords.length > 5 ? '...' : ''}`);
    console.log(`[Highlighter] Expected text: "${normalizedExpected.substring(0, 100)}..."`);
    
    // Strategy: Find nodes that contain a significant portion of our expected text
    // and try to extract just the relevant portions
    const nodesToHighlight: Array<{
      node: Text,
      startPos: number,
      endPos: number,
      parent: Element
    }> = [];
    
    // Look for the start of our expected text by finding nodes containing the first few words
    const firstFewWords = expectedWords.slice(0, Math.min(3, expectedWords.length)).join(' ');
    console.log(`[Highlighter] Looking for start pattern: "${firstFewWords}"`);
    
    let bestStartNode = -1;
    let bestStartPos = -1;
    let bestStartScore = 0;
    
    for (let i = 0; i < textNodes.length; i++) {
      const node = textNodes[i];
      const nodeText = this.normalizeText(node.textContent || '');
      
      // Check if this node contains the start pattern
      const startPos = nodeText.indexOf(firstFewWords);
      if (startPos !== -1) {
        // Calculate how much of our expected text this node covers
        const score = this.calculateTextSimilarity(nodeText, normalizedExpected);
        console.log(`[Highlighter] Node ${i} contains start pattern at pos ${startPos}, score: ${score.toFixed(2)}`);
        
        if (score > bestStartScore) {
          bestStartScore = score;
          bestStartNode = i;
          bestStartPos = startPos;
        }
      }
    }
    
    if (bestStartNode === -1 || bestStartScore < 0.3) {
      console.log(`[Highlighter] Could not find good start node (best score: ${bestStartScore.toFixed(2)})`);
      return {
        success: false,
        reason: `Could not find start pattern "${firstFewWords}" with sufficient similarity`,
        nodesToHighlight: []
      };
    }
    
    console.log(`[Highlighter] Best start node: ${bestStartNode} at position ${bestStartPos} with score ${bestStartScore.toFixed(2)}`);
    
    // From the best start node, try to find a reasonable span that covers our expected text
    let accumulatedText = '';
    let wordCount = 0;
    const targetWordCount = expectedWords.length;
    
    for (let i = bestStartNode; i < Math.min(bestStartNode + 10, textNodes.length); i++) {
      const node = textNodes[i];
      const parent = node.parentElement;
      if (!parent) continue;
      
      const nodeText = node.textContent || '';
      const normalizedNodeText = this.normalizeText(nodeText);
      
      // For the first node, start from the best position we found
      let nodeStartPos = (i === bestStartNode) ? bestStartPos : 0;
      let nodeEndPos = nodeText.length;
      
      // For start node, try to find more precise boundaries
      if (i === bestStartNode) {
        // Try to find where our expected text ends in this node
        const lastExpectedWords = expectedWords.slice(-Math.min(2, expectedWords.length)).join(' ');
        const endSearchPos = normalizedNodeText.indexOf(lastExpectedWords);
        
        if (endSearchPos !== -1 && endSearchPos > nodeStartPos) {
          nodeEndPos = Math.min(nodeEndPos, endSearchPos + lastExpectedWords.length + 10);
        } else {
          // Fallback: limit to reasonable length from start position
          const maxLength = Math.max(100, normalizedExpected.length * 1.5);
          nodeEndPos = Math.min(nodeEndPos, nodeStartPos + maxLength);
        }
      } else {
        // For subsequent nodes, be more conservative
        const maxLength = Math.max(50, normalizedExpected.length);
        nodeEndPos = Math.min(nodeEndPos, nodeStartPos + maxLength);
      }
      
      const nodeSlice = nodeText.substring(nodeStartPos, nodeEndPos);
      const normalizedSlice = this.normalizeText(nodeSlice);
      
      // Count relevant words in this slice
      const sliceWords = normalizedSlice.split(' ').filter(word => word.length > 2);
      const relevantWords = sliceWords.filter(word => expectedWords.includes(word));
      
      console.log(`[Highlighter] Node ${i}: ${relevantWords.length}/${sliceWords.length} relevant words`);
      console.log(`[Highlighter] Node slice (${nodeStartPos}-${nodeEndPos}): "${nodeSlice.substring(0, 80)}..."`);
      
      // Be more selective about what nodes to include
      const relevanceRatio = relevantWords.length / Math.max(sliceWords.length, 1);
      if ((relevantWords.length > 0 && relevanceRatio > 0.3) || i === bestStartNode) {
        // Additional check: don't add if the slice is too long without good relevance
        if (nodeSlice.length > 200 && relevanceRatio < 0.5) {
          console.log(`[Highlighter] Skipping node ${i}: too long (${nodeSlice.length}) with low relevance (${relevanceRatio.toFixed(2)})`);
          continue;
        }
        
        nodesToHighlight.push({
          node,
          startPos: nodeStartPos,
          endPos: nodeEndPos,
          parent
        });
        
        accumulatedText += ' ' + normalizedSlice;
        wordCount += sliceWords.length;
        
        console.log(`[Highlighter] Added node ${i} (${nodeStartPos}-${nodeEndPos}): "${nodeSlice.substring(0, 50)}..."`);
      } else {
        console.log(`[Highlighter] Skipping node ${i}: insufficient relevance (${relevanceRatio.toFixed(2)})`);
      }
      
      // Stop early if we have enough content and good similarity
      const currentSimilarity = this.calculateTextSimilarity(accumulatedText.trim(), normalizedExpected);
      if (currentSimilarity > 0.7 && wordCount >= targetWordCount * 0.8) {
        console.log(`[Highlighter] Early stop: similarity ${currentSimilarity.toFixed(2)}, words ${wordCount}/${targetWordCount}`);
        break;
      }
      
      // Hard stop if we've covered too much content
      if (wordCount >= targetWordCount * 2 || accumulatedText.length > normalizedExpected.length * 3) {
        console.log(`[Highlighter] Hard stop: too much content (${wordCount} words, ${accumulatedText.length} chars)`);
        break;
      }
    }
    
    if (nodesToHighlight.length === 0) {
      return {
        success: false,
        reason: 'No nodes with sufficient relevant content found',
        nodesToHighlight: []
      };
    }
    
    console.log(`[Highlighter] Content matching found ${nodesToHighlight.length} nodes to highlight`);
    return {
      success: true,
      nodesToHighlight
    };
  }

  /**
   * Calculate text similarity using simple word overlap
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = text1.split(' ').filter(word => word.length > 2);
    const words2 = text2.split(' ').filter(word => word.length > 2);
    
    if (words1.length === 0 || words2.length === 0) {
      return 0;
    }
    
    const commonWords = words1.filter(word => words2.includes(word));
    return commonWords.length / Math.max(words1.length, words2.length);
  }

  /**
   * Safely highlight multiple nodes without DOM invalidation
   * Uses atomic replacement with backup for rollback safety
   */
  private safeMultiNodeHighlight(nodesToHighlight: Array<{
    node: Text,
    startPos: number,
    endPos: number,
    parent: Element
  }>): boolean {
    console.log(`[Highlighter] Safely highlighting ${nodesToHighlight.length} nodes`);
    
    const highlightOperations: Array<{
      node: Text;
      parent: Element;
      nextSibling: Node | null;
      originalText: string;
      replacementNodes: Node[];
      span: HTMLElement;
    }> = [];
    
    // PHASE 1: Prepare all operations without modifying DOM
    for (let i = nodesToHighlight.length - 1; i >= 0; i--) {
      const { node, startPos, endPos, parent } = nodesToHighlight[i];
      
      try {
        const originalText = node.textContent || '';
        const beforeText = originalText.substring(0, startPos);
        const highlightText = originalText.substring(startPos, endPos);
        const afterText = originalText.substring(endPos);
        
        console.log(`[Highlighter] Preparing node ${i}: highlighting "${highlightText.substring(0, 50)}..."`);
        
        // Create highlight span
        const span = document.createElement('span');
        span.className = this.highlightClass;
        span.textContent = highlightText;
        
        // Build replacement content
        const replacementNodes: Node[] = [];
        if (beforeText) {
          replacementNodes.push(document.createTextNode(beforeText));
        }
        replacementNodes.push(span);
        if (afterText) {
          replacementNodes.push(document.createTextNode(afterText));
        }
        
        // Store operation details
        highlightOperations.push({
          node,
          parent,
          nextSibling: node.nextSibling,
          originalText,
          replacementNodes,
          span
        });
        
      } catch (error) {
        console.error(`[Highlighter] Error preparing node ${i}:`, error);
        // Clean up any prepared spans from failed operations
        highlightOperations.forEach(op => {
          if (op.span.parentNode) {
            op.span.parentNode.removeChild(op.span);
          }
        });
        return false;
      }
    }
    
    // PHASE 2: Execute all operations atomically
    let successCount = 0;
    const appliedOperations: typeof highlightOperations = [];
    
    for (const operation of highlightOperations) {
      try {
        const { node, parent, nextSibling, originalText, replacementNodes, span } = operation;
        
        // Verify the node is still valid (hasn't been modified by previous operations)
        if (node.parentNode !== parent) {
          console.warn(`[Highlighter] Node parent changed, skipping operation`);
          continue;
        }
        
        // Create backup BEFORE making any changes
        this.originalTextBackup.set(span, {
          originalText,
          parent,
          nextSibling
        });
        
        // Atomic replacement: remove original and insert replacements
        parent.removeChild(node);
        
        // Insert replacement nodes
        for (const newNode of replacementNodes) {
          parent.insertBefore(newNode, nextSibling);
        }
        
        // Track successful operation
        this.highlightedElements.add(span);
        appliedOperations.push(operation);
        successCount++;
        
        console.log(`[Highlighter] Successfully applied operation for "${originalText.substring(0, 30)}..."`);
        
      } catch (error) {
        console.error(`[Highlighter] Error applying operation:`, error);
        
        // ROLLBACK: If any operation fails, rollback all applied operations
        console.log(`[Highlighter] Rolling back ${appliedOperations.length} applied operations due to error`);
        this.rollbackHighlights(appliedOperations.map(op => op.span));
        return false;
      }
    }
    
    console.log(`[Highlighter] Successfully highlighted ${successCount}/${nodesToHighlight.length} nodes`);
    return successCount > 0;
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
   * Uses safe atomic replacement with backup for rollback
   */
  private highlightSingleNode(textNode: Text, startPos: number, endPos: number): boolean {
    try {
      const parent = textNode.parentElement;
      if (!parent) return false;

      const originalText = textNode.textContent || '';
      const beforeText = originalText.substring(0, startPos);
      const highlightText = originalText.substring(startPos, endPos);
      const afterText = originalText.substring(endPos);

      console.log(`[Highlighter] Highlighting single node: "${highlightText.substring(0, 50)}..."`);

      // Create highlight span
      const span = document.createElement('span');
      span.className = this.highlightClass;
      span.textContent = highlightText;
      
      // Prepare replacement nodes
      const replacementNodes: Node[] = [];
      if (beforeText) {
        replacementNodes.push(document.createTextNode(beforeText));
      }
      replacementNodes.push(span);
      if (afterText) {
        replacementNodes.push(document.createTextNode(afterText));
      }
      
      // Create backup BEFORE making any changes
      const nextSibling = textNode.nextSibling;
      this.originalTextBackup.set(span, {
        originalText,
        parent,
        nextSibling
      });
      
      // Atomic replacement
      parent.removeChild(textNode);
      
      // Insert replacement nodes
      for (const newNode of replacementNodes) {
        parent.insertBefore(newNode, nextSibling);
      }

      // Track successful operation
      this.highlightedElements.add(span);
      console.log(`[Highlighter] Successfully highlighted single node`);
      return true;
      
    } catch (error) {
      console.error('[Highlighter] Error highlighting single node:', error);
      
      // Attempt to rollback if span was created
      const span = error.span;
      if (span && this.originalTextBackup.has(span)) {
        console.log(`[Highlighter] Rolling back failed single node highlighting`);
        this.rollbackHighlights([span]);
      }
      
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
   * Safely rollback highlights by restoring original text content
   * This prevents content deletion when highlights need to be removed
   */
  private rollbackHighlights(highlightElements: HTMLElement[]): void {
    console.log(`[Highlighter] Rolling back ${highlightElements.length} highlight elements`);
    
    for (const element of highlightElements) {
      try {
        const backup = this.originalTextBackup.get(element);
        if (backup) {
          console.log(`[Highlighter] Restoring original text: "${backup.originalText}"`);
          
          // Create text node with original content
          const textNode = document.createTextNode(backup.originalText);
          
          // Replace the highlight element with original text
          backup.parent.insertBefore(textNode, backup.nextSibling);
          backup.parent.removeChild(element);
          
          // Clean up backup
          this.originalTextBackup.delete(element);
        } else {
          console.log(`[Highlighter] No backup found for element, using current text content`);
          // Fallback: replace with current text content
          const parent = element.parentElement;
          if (parent && element.textContent) {
            const textNode = document.createTextNode(element.textContent);
            parent.insertBefore(textNode, element);
            parent.removeChild(element);
          }
        }
        
        // Remove from tracked elements
        this.highlightedElements.delete(element);
        
      } catch (error) {
        console.error(`[Highlighter] Error rolling back highlight element:`, error);
      }
    }
  }

  /**
   * Clear all highlights from the page
   */
  clearHighlights(): void {
    // Use rollback to safely restore original content
    this.rollbackHighlights(Array.from(this.highlightedElements));
    
    // Clear any remaining elements and cleanup
    this.highlightedElements.clear();
    this.originalTextBackup.clear();
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