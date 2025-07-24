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
      
      // Use Readability to get a clean version of the page content
      const documentClone = document.cloneNode(true) as Document;
      const article = new Readability(documentClone).parse();
      
      if (!article || !article.textContent) {
        console.log('[Highlighter] Readability could not parse the page content');
        return false;
      }

      // Find text nodes that contain our content
      const result = this.findAndHighlightContent(nugget.startContent, nugget.endContent, article.textContent);
      
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
   * Find and highlight content between startContent and endContent
   * Prioritizes content reconstruction for cross-node reliability
   * @param startContent - The starting text to find
   * @param endContent - The ending text to find
   * @returns true if content was found and highlighted, false otherwise
   */
  private findAndHighlightContent(startContent: string, endContent: string): boolean {
    console.log(`[Highlighter] Looking for content from "${startContent}" to "${endContent}"`);

    const textNodes = this.getAllTextNodes(document.body);
    const domBasedResult = this.buildDOMBasedTextMapping(textNodes);

    if (!domBasedResult.success) {
      console.log(`[Highlighter] Failed to build DOM-based text mapping: ${domBasedResult.reason}`);
      return false;
    }

    const { fullText, nodePositions } = domBasedResult;
    console.log(`[Highlighter] Trying to match in DOM-based text (${fullText.length} chars from ${nodePositions.length} nodes)`);

    const matchResult = improvedStartEndMatching(startContent, endContent, fullText);

    if (matchResult.success && matchResult.startIndex !== undefined && matchResult.endIndex !== undefined) {
      console.log(`[Highlighter] DOM-based match found at ${matchResult.startIndex}-${matchResult.endIndex}`);

      const result = this.highlightByDOMBasedRange(matchResult.startIndex, matchResult.endIndex, nodePositions);
      if (result) {
        console.log(`[Highlighter] DOM-based highlighting succeeded`);
        return true;
      }
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
          // Skip text nodes in script/style tags but be more permissive otherwise
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          
          const tagName = parent.tagName?.toLowerCase();
          if (tagName === 'script' || tagName === 'style' || tagName === 'noscript') {
            return NodeFilter.FILTER_REJECT;
          }
          
          const text = node.textContent || '';
          // Accept any node with text content, normalization will handle whitespace
          if (text.length > 0) {
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