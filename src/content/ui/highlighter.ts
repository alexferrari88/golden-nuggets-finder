import { Readability } from '@mozilla/readability';
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
  private originalTextBackup: Map<HTMLElement, { originalNode: Text; parent: Element; nextSibling: Node | null }> = new Map();

  constructor() {
    this.injectStyles();
  }

  /**
   * Highlight a single golden nugget on the page
   * @param nugget - The golden nugget to highlight
   * @returns true if highlighting was successful, false otherwise
   */
  highlightNugget(nugget: GoldenNugget): boolean {
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
        // Post-validation: check for over-highlighting
        const highlightedElements = document.querySelectorAll('.golden-nugget-highlight');
        const totalHighlighted = Array.from(highlightedElements).reduce((sum, el) => 
          sum + (el.textContent?.length || 0), 0
        );
        
        console.log(`[Highlighter] Total highlighted: ${totalHighlighted} chars across ${highlightedElements.length} elements`);
        
        const expectedContentLength = nugget.startContent.length + nugget.endContent.length;
        const maxReasonableLength = expectedContentLength * 3 + 200;

        if (totalHighlighted > maxReasonableLength || highlightedElements.length > 15) {
          console.log(`[Highlighter] Over-highlighted (${totalHighlighted} chars, ${highlightedElements.length} elements), rolling back highlights. Max allowed: ${maxReasonableLength}`);
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
   * Find the main article container on the page to narrow down the search area.
   * @returns The article container element or document.body if not found.
   */
  private findArticleContainer(): HTMLElement {
    // Heuristics to find the main content container
    const selectors = [
      'article',
      '[role="main"]',
      '#main',
      '#content',
      '.post-content',
      '.entry-content',
      '[class*="article-body"]',
      '[class*="post-body"]',
      '[class*="article-content"]',
      '[class*="post-content"]',
      '[class*="main-content"]',
      '[class*="story-content"]',
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector) as HTMLElement;
      if (element && element.textContent && element.textContent.length > 500) { // Basic check for content
        console.log(`[Highlighter] Found article container with selector: ${selector}`);
        return element;
      }
    }

    console.log('[Highlighter] No specific article container found, using document.body.');
    return document.body;
  }

  /**
   * Find and highlight content between startContent and endContent
   * Prioritizes content reconstruction for cross-node reliability
   * Now includes multiple fallback strategies including Readability extraction
   * @param startContent - The starting text to find
   * @param endContent - The ending text to find
   * @returns true if content was found and highlighted, false otherwise
   */
  private findAndHighlightContent(startContent: string, endContent: string): boolean {
    console.log(`[Highlighter] Looking for content from "${startContent}" to "${endContent}"`);

    // Strategy 1: Try DOM-based text mapping (original approach)
    const articleContainer = this.findArticleContainer();
    const textNodes = this.getAllTextNodes(articleContainer);
    const domBasedResult = this.buildDOMBasedTextMapping(textNodes);

    if (domBasedResult.success) {
      const { fullText, nodePositions } = domBasedResult;
      console.log(`[Highlighter] Trying to match in DOM-based text (${fullText.length} chars from ${nodePositions.length} nodes)`);

      const matchResult = improvedStartEndMatching(startContent, endContent, fullText);

      if (matchResult.success && matchResult.startIndex !== undefined && matchResult.endIndex !== undefined) {
        console.log(`[Highlighter] DOM-based match found at ${matchResult.startIndex}-${matchResult.endIndex} (${matchResult.reason})`);

        const result = this.highlightByDOMBasedRange(matchResult.startIndex, matchResult.endIndex, nodePositions);
        if (result) {
          console.log(`[Highlighter] DOM-based highlighting succeeded`);
          return true;
        }
      } else {
        console.log(`[Highlighter] DOM-based matching failed: ${matchResult.reason}`);
      }
    } else {
      console.log(`[Highlighter] Failed to build DOM-based text mapping: ${domBasedResult.reason}`);
    }

    // Strategy 2: Try Readability-based extraction for cleaner content
    console.log(`[Highlighter] DOM-based approach failed, trying Readability extraction`);
    const readabilityResult = this.tryReadabilityBasedMatching(startContent, endContent);
    if (readabilityResult) {
      console.log(`[Highlighter] Readability-based highlighting succeeded`);
      return true;
    }

    // Strategy 3: Try broader text extraction from body
    console.log(`[Highlighter] Readability failed, trying broader body text extraction`);
    const bodyTextResult = this.tryBodyTextMatching(startContent, endContent);
    if (bodyTextResult) {
      console.log(`[Highlighter] Body text matching succeeded`);
      return true;
    }

    console.log(`[Highlighter] All highlighting strategies failed for "${startContent}"`);
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
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;

          // Ignore nodes in non-content elements
          const tagName = parent.tagName.toLowerCase();
          if (['script', 'style', 'noscript', 'svg', 'path', 'head', 'meta', 'link'].includes(tagName)) {
            return NodeFilter.FILTER_REJECT;
          }

          // Ignore nodes that are not visible
          const computedStyle = window.getComputedStyle(parent);
          if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden' || computedStyle.opacity === '0' || computedStyle.height === '0px' || computedStyle.width === '0px') {
            return NodeFilter.FILTER_REJECT;
          }

          // Ignore whitespace-only nodes
          const text = node.textContent || '';
          if (text.trim().length === 0) {
            return NodeFilter.FILTER_REJECT;
          }
          
          // Ignore nodes that look like JSON data
          if (text.trim().startsWith('{') && text.trim().endsWith('}')) {
            try {
              JSON.parse(text.trim());
              return NodeFilter.FILTER_REJECT; // It's valid JSON, reject it.
            } catch (e) {
              // Not valid JSON, so probably text.
            }
          }

          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let node: Node | null;
    while (node = walker.nextNode()) {
      textNodes.push(node as Text);
    }
    
    console.log(`[Highlighter] Found ${textNodes.length} relevant text nodes total`);
    return textNodes;
  }

  

  /**
   * Build text content and position mapping directly from DOM nodes
   * This eliminates DOM/textContent mismatch issues
   */
  private buildDOMBasedTextMapping(textNodes: Text[]): {
    success: boolean;
    reason?: string;
    fullText: string;
    nodePositions: Array<{ node: Text; parent: Element; startIndex: number; endIndex: number; }>;
  } {
    const nodePositions: Array<{ node: Text; parent: Element; startIndex: number; endIndex: number; }> = [];
    let fullText = '';

    for (const node of textNodes) {
      const parent = node.parentElement;
      if (!parent) continue;
      const rect = parent.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue; // Skip invisible elements

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
        reason: 'No valid, visible text nodes found',
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
        const { node, parent, nextSibling, replacementNodes, span } = operation;
        
        // Verify the node is still valid (hasn't been modified by previous operations)
        if (node.parentNode !== parent) {
          console.warn(`[Highlighter] Node parent changed, skipping operation`);
          continue;
        }
        
        // Create backup BEFORE making any changes
        this.originalTextBackup.set(span, {
          originalNode: node,
          parent,
          nextSibling
        });
        
        // Atomic replacement: remove original and insert replacements
        // parent.removeChild(node); // This is now incorrect, the node is replaced by the new nodes
        
        // Insert replacement nodes
        for (const newNode of replacementNodes) {
          parent.insertBefore(newNode, nextSibling);
        }
        // remove original node after inserting new nodes
        parent.removeChild(node);

        
        // Track successful operation
        this.highlightedElements.add(span);
        appliedOperations.push(operation);
        successCount++;
        
        console.log(`[Highlighter] Successfully applied operation for "${(node.textContent || '').substring(0, 30)}..."`);
        
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
   * Try matching using Readability.js for cleaner content extraction
   * This can help when the DOM structure is complex or has a lot of noise
   */
  private tryReadabilityBasedMatching(startContent: string, endContent: string): boolean {
    try {
      // Clone the document to avoid modifying the original
      const docClone = document.cloneNode(true) as Document;
      const reader = new Readability(docClone);
      const article = reader.parse();
      
      if (!article || !article.textContent) {
        console.log(`[Highlighter] Readability failed to extract article content`);
        return false;
      }
      
      console.log(`[Highlighter] Readability extracted ${article.textContent.length} chars`);
      
      // Try to find the content in the Readability-extracted text
      const matchResult = improvedStartEndMatching(startContent, endContent, article.textContent);
      
      if (!matchResult.success) {
        console.log(`[Highlighter] Readability text matching failed: ${matchResult.reason}`);
        return false;
      }
      
      // If we found it in Readability text, try to find it in the original DOM
      // by using a more aggressive search in the original text nodes
      return this.tryAggressiveDomSearch(startContent, endContent, matchResult.matchedContent || '');
      
    } catch (error) {
      console.log(`[Highlighter] Readability extraction error:`, error);
      return false;
    }
  }
  
  /**
   * Try matching using broader body text extraction
   * Uses a more inclusive approach to find text across the entire body
   */
  private tryBodyTextMatching(startContent: string, endContent: string): boolean {
    try {
      // Get all text from body, including from elements we might normally filter out
      const bodyText = document.body.textContent || '';
      
      if (bodyText.length === 0) {
        console.log(`[Highlighter] Body text is empty`);
        return false;
      }
      
      console.log(`[Highlighter] Body text has ${bodyText.length} chars`);
      
      // Try to find the content in the body text
      const matchResult = improvedStartEndMatching(startContent, endContent, bodyText);
      
      if (!matchResult.success) {
        console.log(`[Highlighter] Body text matching failed: ${matchResult.reason}`);
        return false;
      }
      
      // If we found it in body text, try to find it in DOM with more aggressive search
      return this.tryAggressiveDomSearch(startContent, endContent, matchResult.matchedContent || '');
      
    } catch (error) {
      console.log(`[Highlighter] Body text extraction error:`, error);
      return false;
    }
  }
  
  /**
   * Aggressive DOM search that tries to find and highlight content even when 
   * the text is heavily fragmented across nodes
   */
  private tryAggressiveDomSearch(startContent: string, endContent: string, referenceContent: string): boolean {
    try {
      console.log(`[Highlighter] Trying aggressive DOM search with reference content (${referenceContent.length} chars)`);
      
      // Get ALL text nodes, including ones we might normally filter out
      const allTextNodes = this.getAllTextNodesAggressive(document.body);
      console.log(`[Highlighter] Found ${allTextNodes.length} text nodes in aggressive search`);
      
      // Try to reconstruct text and find our content
      const aggressiveResult = this.buildDOMBasedTextMapping(allTextNodes);
      
      if (!aggressiveResult.success) {
        console.log(`[Highlighter] Aggressive DOM mapping failed: ${aggressiveResult.reason}`);
        return false;
      }
      
      const { fullText, nodePositions } = aggressiveResult;
      console.log(`[Highlighter] Aggressive search reconstructed ${fullText.length} chars from ${nodePositions.length} nodes`);
      
      // Try fuzzy matching with more lenient parameters
      const matchResult = improvedStartEndMatching(startContent, endContent, fullText);
      
      if (matchResult.success && matchResult.startIndex !== undefined && matchResult.endIndex !== undefined) {
        console.log(`[Highlighter] Aggressive search found match at ${matchResult.startIndex}-${matchResult.endIndex} (${matchResult.reason})`);
        
        const result = this.highlightByDOMBasedRange(matchResult.startIndex, matchResult.endIndex, nodePositions);
        if (result) {
          console.log(`[Highlighter] Aggressive search highlighting succeeded`);
          return true;
        }
      }
      
      console.log(`[Highlighter] Aggressive search failed to highlight`);
      return false;
      
    } catch (error) {
      console.log(`[Highlighter] Aggressive DOM search error:`, error);
      return false;
    }
  }
  
  /**
   * Get ALL text nodes with very minimal filtering - for aggressive search
   */
  private getAllTextNodesAggressive(element: Node): Text[] {
    const textNodes: Text[] = [];
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;

          // Only reject truly non-content elements
          const tagName = parent.tagName.toLowerCase();
          if (['script', 'style', 'noscript', 'head', 'meta', 'link'].includes(tagName)) {
            return NodeFilter.FILTER_REJECT;
          }

          // Accept all text nodes with any content, even whitespace-only ones
          const text = node.textContent || '';
          if (text.length === 0) {
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
    
    console.log(`[Highlighter] Aggressive search found ${textNodes.length} text nodes total`);
    return textNodes;
  }

  /**
   * Safely rollback highlights by restoring original text content
   * This prevents content deletion when highlights need to be removed
   */
  private rollbackHighlights(highlightElements: HTMLElement[]): void {
    console.log(`[Highlighter] Rolling back ${highlightElements.length} highlight elements`);
    
    // Sort elements by their position in the DOM to avoid conflicts during removal
    const sortedElements = Array.from(highlightElements).sort((a, b) => {
      const pos = a.compareDocumentPosition(b);
      if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
      if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
      return 0;
    });

    for (const element of sortedElements) {
      try {
        const backup = this.originalTextBackup.get(element);
        if (backup) {
          const { originalNode, parent } = backup;
          console.log(`[Highlighter] Restoring original text for: "${originalNode.textContent?.substring(0, 50)}..."`);
          
          // The parent of the highlight element should be the same as the backup parent.
          if (element.parentNode === parent) {
            // Replace the highlight element with its text content, then normalize the parent
            // to merge adjacent text nodes. This is a robust way to restore the text
            // without holding complex references to the transient text nodes.
            const text = document.createTextNode(element.textContent || '');
            parent.replaceChild(text, element);
            parent.normalize();
          } else {
            console.warn('[Highlighter] Rollback parent mismatch or element already removed.');
          }
          
          this.originalTextBackup.delete(element);
        } else {
          console.log(`[Highlighter] No backup found for element, replacing with text`);
          // Fallback for safety if no backup is found
          const parent = element.parentElement;
          if (parent && element.textContent) {
            const textNode = document.createTextNode(element.textContent);
            parent.insertBefore(textNode, element);
            parent.removeChild(element);
          }
        }
        
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