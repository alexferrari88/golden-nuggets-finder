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
   */
  private findWithContentReconstruction(startContent: string, endContent: string): boolean {
    console.log(`[Highlighter] Trying content reconstruction approach`);
    
    // Get the full page text content
    const pageContent = document.body.textContent || '';
    console.log(`[Highlighter] Page content length: ${pageContent.length} chars`);
    
    // Debug: show context around expected content
    const startPos = pageContent.indexOf(startContent);
    const endPos = pageContent.indexOf(endContent);
    if (startPos !== -1 && endPos !== -1) {
      console.log(`[Highlighter] Found raw positions - start: ${startPos}, end: ${endPos + endContent.length}`);
      console.log(`[Highlighter] Raw content slice: "${pageContent.substring(startPos, endPos + endContent.length).substring(0, 100)}..."`);
    } else {
      console.log(`[Highlighter] Could not find raw positions - startPos: ${startPos}, endPos: ${endPos}`);
    }
    
    // Use the improved matching from content-reconstruction
    const matchResult = improvedStartEndMatching(startContent, endContent, pageContent);
    console.log(`[Highlighter] Content reconstruction result:`, matchResult);
    
    if (matchResult.success && matchResult.startIndex !== undefined && matchResult.endIndex !== undefined) {
      console.log(`[Highlighter] Content reconstruction found match at positions ${matchResult.startIndex}-${matchResult.endIndex}`);
      
      // Debug: show what text is at those positions
      const foundText = pageContent.substring(matchResult.startIndex, matchResult.endIndex);
      console.log(`[Highlighter] Text at found positions: "${foundText.substring(0, 100)}..."`);
      
      // Now we need to find these character positions in the DOM and highlight them
      return this.highlightByCharacterRange(matchResult.startIndex, matchResult.endIndex);
    }
    
    console.log(`[Highlighter] Content reconstruction failed: ${matchResult.reason}`);
    return false;
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
    
    let currentIndex = 0;
    let foundStart = false;
    let foundEnd = false;
    
    for (let i = 0; i < textNodes.length; i++) {
      const node = textNodes[i];
      const nodeText = node.textContent || '';
      const nodeLength = nodeText.length;
      const nodeStartIndex = currentIndex;
      const nodeEndIndex = currentIndex + nodeLength;
      
      // Skip empty nodes
      if (nodeLength === 0) {
        continue;
      }
      
      // Check if this node intersects with our target range
      if (nodeStartIndex < endIndex && nodeEndIndex > startIndex) {
        const parent = node.parentElement;
        if (!parent) {
          currentIndex += nodeLength;
          continue;
        }
        
        // Calculate intersection boundaries
        const highlightStart = Math.max(0, startIndex - nodeStartIndex);
        const highlightEnd = Math.min(nodeLength, endIndex - nodeStartIndex);
        
        // Validate the intersection makes sense
        if (highlightStart >= highlightEnd || highlightStart < 0 || highlightEnd > nodeLength) {
          console.log(`[Highlighter] Invalid intersection for node ${i}: start=${highlightStart}, end=${highlightEnd}, nodeLength=${nodeLength}`);
          currentIndex += nodeLength;
          continue;
        }
        
        const highlightText = nodeText.substring(highlightStart, highlightEnd);
        console.log(`[Highlighter] Node ${i} intersects (${nodeStartIndex}-${nodeEndIndex}): highlighting "${highlightText}"`);
        
        nodesToHighlight.push({
          node,
          startPos: highlightStart,
          endPos: highlightEnd,
          parent
        });
        
        if (!foundStart && nodeStartIndex <= startIndex && nodeEndIndex > startIndex) {
          foundStart = true;
        }
        if (!foundEnd && nodeStartIndex < endIndex && nodeEndIndex >= endIndex) {
          foundEnd = true;
        }
      }
      
      currentIndex += nodeLength;
    }
    
    // Verify we have reasonable coverage
    if (nodesToHighlight.length === 0) {
      return {
        success: false,
        reason: `No intersecting nodes found for range ${startIndex}-${endIndex}`,
        nodesToHighlight: []
      };
    }
    
    // Additional validation: check if the accumulated text makes sense
    const accumulatedText = nodesToHighlight.map(item => 
      item.node.textContent?.substring(item.startPos, item.endPos) || ''
    ).join('');
    
    const expectedText = pageContent.substring(startIndex, endIndex);
    const normalizedAccumulated = this.normalizeText(accumulatedText);
    const normalizedExpected = this.normalizeText(expectedText);
    
    // Allow some flexibility in matching
    const similarity = this.calculateTextSimilarity(normalizedAccumulated, normalizedExpected);
    console.log(`[Highlighter] Text similarity: ${similarity.toFixed(2)} (accumulated: "${normalizedAccumulated.substring(0, 50)}...", expected: "${normalizedExpected.substring(0, 50)}...")`);
    
    if (similarity < 0.7) {
      return {
        success: false,
        reason: `Text similarity too low: ${similarity.toFixed(2)}`,
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
    
    const nodesToHighlight: Array<{
      node: Text,
      startPos: number,
      endPos: number,
      parent: Element
    }> = [];
    
    // Find the first word to establish starting point
    const firstWord = expectedWords[0];
    let startNodeIndex = -1;
    
    for (let i = 0; i < textNodes.length; i++) {
      const node = textNodes[i];
      const nodeText = this.normalizeText(node.textContent || '');
      
      if (nodeText.includes(firstWord)) {
        startNodeIndex = i;
        console.log(`[Highlighter] Found first word "${firstWord}" in node ${i}`);
        break;
      }
    }
    
    if (startNodeIndex === -1) {
      return {
        success: false,
        reason: `First word "${firstWord}" not found in any node`,
        nodesToHighlight: []
      };
    }
    
    // Collect nodes that contain significant portions of our text
    const maxNodesToCheck = Math.min(20, textNodes.length - startNodeIndex);
    let collectedText = '';
    
    for (let offset = 0; offset < maxNodesToCheck; offset++) {
      const nodeIndex = startNodeIndex + offset;
      if (nodeIndex >= textNodes.length) break;
      
      const node = textNodes[nodeIndex];
      const parent = node.parentElement;
      if (!parent) continue;
      
      const nodeText = node.textContent || '';
      const normalizedNodeText = this.normalizeText(nodeText);
      
      // Check if this node contains relevant content
      const relevantWords = expectedWords.filter(word => normalizedNodeText.includes(word));
      if (relevantWords.length > 0 || offset === 0) {
        // For first node or nodes with relevant words, include the whole node
        nodesToHighlight.push({
          node,
          startPos: 0,
          endPos: nodeText.length,
          parent
        });
        
        collectedText += ' ' + normalizedNodeText;
        console.log(`[Highlighter] Including node ${nodeIndex} with ${relevantWords.length} relevant words`);
      }
      
      // Check if we have enough content
      const similarity = this.calculateTextSimilarity(collectedText.trim(), normalizedExpected);
      if (similarity > 0.8 && collectedText.length >= normalizedExpected.length * 0.8) {
        console.log(`[Highlighter] Content matching successful with similarity ${similarity.toFixed(2)}`);
        break;
      }
    }
    
    return {
      success: nodesToHighlight.length > 0,
      reason: nodesToHighlight.length === 0 ? 'No nodes with relevant content found' : undefined,
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
   */
  private safeMultiNodeHighlight(nodesToHighlight: Array<{
    node: Text,
    startPos: number,
    endPos: number,
    parent: Element
  }>): boolean {
    console.log(`[Highlighter] Safely highlighting ${nodesToHighlight.length} nodes`);
    
    let successCount = 0;
    
    // Process nodes in reverse order to avoid DOM invalidation
    // When we modify later nodes first, it doesn't affect the positions of earlier nodes
    for (let i = nodesToHighlight.length - 1; i >= 0; i--) {
      const { node, startPos, endPos, parent } = nodesToHighlight[i];
      
      try {
        const originalText = node.textContent || '';
        const beforeText = originalText.substring(0, startPos);
        const highlightText = originalText.substring(startPos, endPos);
        const afterText = originalText.substring(endPos);
        
        console.log(`[Highlighter] Processing node ${i}: highlighting "${highlightText}"`);
        
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
        
        // Replace the original node with the new content
        const nextSibling = node.nextSibling;
        parent.removeChild(node);
        
        for (const newNode of replacementNodes) {
          parent.insertBefore(newNode, nextSibling);
        }
        
        this.highlightedElements.add(span);
        successCount++;
        
      } catch (error) {
        console.error(`[Highlighter] Error highlighting node ${i}:`, error);
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