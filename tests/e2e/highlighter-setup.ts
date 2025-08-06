import type { Page } from "@playwright/test";
import type { GoldenNugget } from "../../src/shared/types";

export async function setupHighlighter(
	page: Page,
	goldenNuggets: GoldenNugget[],
) {
	// Inject the fixed highlighter implementation
	await page.addScriptTag({
		content: `
// Fixed highlighter implementation for testing
console.log('Loading fixed highlighter...');

// Design system colors for highlighting
const colors = {
  highlight: {
    background: 'rgba(255, 215, 0, 0.3)',
    border: 'rgba(255, 193, 7, 0.6)',
    hover: 'rgba(255, 215, 0, 0.45)'
  }
};

const generateInlineStyles = {
  highlightStyle: function() {
    return \`background-color: \${colors.highlight.background} !important; padding: 2px 4px !important; border-radius: 3px !important; border: 1px solid \${colors.highlight.border} !important; box-shadow: 0 0 0 2px \${colors.highlight.border}40, 0 2px 4px rgba(0,0,0,0.1) !important; position: relative !important; z-index: 1100 !important; display: inline !important; font-weight: 500 !important; text-decoration: none !important; color: inherit !important;\`;
  }
};

// Fixed CSS polyfill setup
function setupCSS() {
  // Ensure CSS object exists
  if (typeof window.CSS === 'undefined') {
    window.CSS = {};
  }
  
  // Check if CSS Custom Highlight API is already supported
  if (typeof CSS !== 'undefined' && CSS.highlights && typeof Highlight !== 'undefined') {
    console.log('CSS Custom Highlight API is natively supported');
    return true;
  } else {
    console.log('Setting up CSS Custom Highlight API polyfill');
    
    // Type declarations for CSS Custom Highlight API
    class HighlightPolyfill {
      constructor(...ranges) {
        this.ranges = new Set(ranges);
        console.log('Highlight polyfill constructor called with', ranges.length, 'ranges');
      }
      
      add(range) {
        this.ranges.add(range);
      }
      
      clear() {
        this.ranges.clear();
      }
      
      delete(range) {
        return this.ranges.delete(range);
      }
      
      has(range) {
        return this.ranges.has(range);
      }
    }
    
    // Setup CSS.highlights if it doesn't exist
    if (!CSS.highlights) {
      CSS.highlights = new Map();
      console.log('Created CSS.highlights Map');
    }
    
    window.Highlight = HighlightPolyfill;
    return false; // Using polyfill
  }
}

// CSS Custom Highlight API implementation
class Highlighter {
  constructor() {
    this.highlightedElements = [];
    this.cssHighlights = new Map();
    this.globalHighlight = null;
    this.highlightClassName = 'golden-nugget-highlight';
    
    try {
      this.cssHighlightSupported = setupCSS();
      console.log('Highlighter constructor - CSS support:', this.cssHighlightSupported);
      this.setupCSSHighlightStyles();
    } catch (error) {
      console.error('Error in Highlighter constructor:', error);
      this.cssHighlightSupported = false;
    }
  }
  
  setupCSSHighlightStyles() {
    console.log('setupCSSHighlightStyles called, supported:', this.cssHighlightSupported);
    if (!this.cssHighlightSupported) return;
    
    if (document.querySelector('#golden-nugget-highlight-styles')) {
      console.log('Styles already exist');
      return;
    }
    
    try {
      const styleSheet = document.createElement('style');
      styleSheet.id = 'golden-nugget-highlight-styles';
      styleSheet.textContent = \`
        ::highlight(golden-nugget) {
          background-color: \${colors.highlight.background} !important;
          border-radius: 3px !important;
          box-shadow: 0 0 0 1px \${colors.highlight.border} !important;
          color: inherit !important;
        }
      \`;
      document.head.appendChild(styleSheet);
      console.log('Added CSS highlight styles');
    } catch (error) {
      console.error('Error setting up CSS styles:', error);
    }
  }
  
  getNuggetKey(nugget) {
    return \`nugget-\${nugget.startContent.toLowerCase()}-\${nugget.endContent.toLowerCase()}\`.replace(/[^a-zA-Z0-9-_]/g, '_');
  }

  highlightNugget(nugget, pageContent) {
    try {
      console.log('highlightNugget called for:', nugget.startContent);
      
      if (this.isAlreadyHighlighted(nugget)) {
        console.log('Already highlighted');
        return true;
      }

      const range = this.findTextInDOM(nugget.startContent, nugget.endContent);
      if (!range) {
        console.warn('Could not find text range for nugget:', nugget);
        return false;
      }

      const success = this.cssHighlightSupported 
        ? this.highlightWithCSS(range, nugget)
        : this.highlightWithDOM(range, nugget);
        
      if (!success) {
        console.warn('Could not create highlight for nugget:', nugget);
        return false;
      }

      console.log('Successfully highlighted nugget:', nugget.startContent);
      return true;
    } catch (error) {
      console.error('Error highlighting nugget:', error, nugget);
      return false;
    }
  }

  scrollToHighlight(nugget) {
    try {
      // For CSS highlights, find the range and scroll to it
      const cssHighlightKey = this.getNuggetKey(nugget);
      const cssHighlightInfo = this.cssHighlights.get(cssHighlightKey);
      
      if (cssHighlightInfo) {
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
        const elementText = (element.textContent || '').toLowerCase();
        return elementText.includes(nugget.startContent.toLowerCase()) && elementText.includes(nugget.endContent.toLowerCase());
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
    } catch (error) {
      console.error('Error scrolling to highlight:', error);
    }
  }

  clearHighlights() {
    try {
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
        try {
          if (element.parentNode) {
            const parent = element.parentNode;
            while (element.firstChild) {
              parent.insertBefore(element.firstChild, element);
            }
            parent.removeChild(element);
          }
        } catch (error) {
          console.warn('Error removing highlight element:', error);
        }
      });
      this.highlightedElements = [];
    } catch (error) {
      console.error('Error clearing highlights:', error);
    }
  }

  getHighlightCount() {
    return this.cssHighlights.size + this.highlightedElements.length;
  }

  isAlreadyHighlighted(nugget) {
    try {
      const nuggetKey = this.getNuggetKey(nugget);
      
      // Check CSS highlights first
      if (this.cssHighlights.has(nuggetKey)) {
        return true;
      }
      
      // Check DOM-based highlights (fallback)
      return this.highlightedElements.some(element => {
        const elementText = (element.textContent || '').toLowerCase();
        return elementText.includes(nugget.startContent.toLowerCase()) && 
               elementText.includes(nugget.endContent.toLowerCase()) &&
               element.hasAttribute('data-nugget-key') &&
               element.getAttribute('data-nugget-key') === nuggetKey;
      });
    } catch (error) {
      console.error('Error checking if already highlighted:', error);
      return false;
    }
  }

  createHighlightElement(nugget) {
    const span = document.createElement('span');
    span.className = this.highlightClassName;
    span.setAttribute('data-golden-nugget-highlight', 'true');
    
    const nuggetKey = this.getNuggetKey(nugget);
    span.setAttribute('data-nugget-key', nuggetKey);
    
    span.style.cssText = generateInlineStyles.highlightStyle();
    return span;
  }
  
  highlightWithCSS(range, nugget) {
    try {
      console.log('highlightWithCSS called');
      if (range.collapsed) {
        console.warn('Cannot highlight collapsed range');
        return false;
      }

      // Create global highlight object if it doesn't exist
      if (!this.globalHighlight) {
        console.log('Creating global highlight object');
        this.globalHighlight = new Highlight();
        CSS.highlights.set('golden-nugget', this.globalHighlight);
        console.log('Registered global highlight with name "golden-nugget"');
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
      console.log('CSS.highlights size:', CSS.highlights.size);
      return true;
    } catch (error) {
      console.error('Error creating CSS highlight:', error);
      console.error('Error details:', error.message);
      console.error('Falling back to DOM highlighting');
      return this.highlightWithDOM(range, nugget);
    }
  }
  
  highlightWithDOM(range, nugget) {
    try {
      console.log('highlightWithDOM called');
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
      
      const highlightElement = this.createHighlightElement(nugget);
      highlightElement.appendChild(contents);
      
      try {
        range.deleteContents();
        range.insertNode(highlightElement);
      } catch (insertError) {
        console.error('DOM insertion failed:', insertError);
        return false;
      }
      
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

  // Normalize text for flexible matching by removing common punctuation
  normalizeTextForMatching(text) {
    return text
      .replace(/[.!?;,:'"()\\[\\]{}]+$/g, '') // Remove trailing punctuation
      .replace(/\\s+/g, ' ') // Normalize whitespace
      .trim();
  }
  
  // Try to find text using multiple matching strategies
  findTextWithStrategies(fullTextLower, startContentLower, endContentLower, strategyName) {
    let startIndex = -1;
    let searchFrom = 0;
    const possibleRanges = [];

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
      console.log(\`Found text range using \${strategyName} strategy\`);
    }

    return possibleRanges;
  }

  findTextInDOM(startContent, endContent) {
    try {
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            const parent = node.parentElement;
            if (parent && (
              parent.tagName === 'SCRIPT' || 
              parent.tagName === 'STYLE' ||
              parent.tagName === 'NOSCRIPT'
            )) {
              return NodeFilter.FILTER_REJECT;
            }
            return node.textContent && node.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
          }
        }
      );

      let fullText = '';
      const textNodeMap = [];
      
      let currentNode = walker.nextNode();
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
        currentNode = walker.nextNode();
      }

      const fullTextLower = fullText.toLowerCase();
      let possibleRanges = [];

      // Debug logging to help understand what content is available
      console.log("DOM text analysis:", {
        searchingFor: { start: startContent, end: endContent },
        domTextLength: fullText.length,
        domTextSample: fullText.substring(0, 200),
        containsStart: fullTextLower.includes(startContent.toLowerCase()),
        containsEnd: fullTextLower.includes(endContent.toLowerCase())
      });

      // Strategy 1: Exact match (case-insensitive)
      const startContentLower = startContent.toLowerCase();
      const endContentLower = endContent.toLowerCase();
      possibleRanges = this.findTextWithStrategies(
        fullTextLower,
        startContentLower,
        endContentLower,
        "exact match"
      );

      // Strategy 2: Try with normalized punctuation if exact match fails
      if (possibleRanges.length === 0) {
        const normalizedStartContent = this.normalizeTextForMatching(startContent).toLowerCase();
        const normalizedEndContent = this.normalizeTextForMatching(endContent).toLowerCase();
        
        console.log("Trying normalized matching:", {
          originalStart: startContent,
          normalizedStart: normalizedStartContent,
          originalEnd: endContent,
          normalizedEnd: normalizedEndContent
        });
        
        // Only try normalized matching if it's actually different from the original
        if (normalizedStartContent !== startContentLower || normalizedEndContent !== endContentLower) {
          possibleRanges = this.findTextWithStrategies(
            fullTextLower,
            normalizedStartContent,
            normalizedEndContent,
            "normalized punctuation"
          );
        } else {
          console.log("Skipping normalized matching - no difference from original");
        }
      }

      // Strategy 3: Try with only end content normalized (common case where endContent has punctuation)
      if (possibleRanges.length === 0) {
        const normalizedEndContentOnly = this.normalizeTextForMatching(endContent).toLowerCase();
        
        if (normalizedEndContentOnly !== endContentLower) {
          possibleRanges = this.findTextWithStrategies(
            fullTextLower,
            startContentLower,
            normalizedEndContentOnly,
            "end content normalized"
          );
        }
      }

      if (possibleRanges.length === 0) {
        console.warn(
          "No valid range found for:",
          startContent,
          "→",
          endContent,
          "(tried exact, normalized, and end-normalized matching)"
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

      const range = document.createRange();
      const startOffset = bestRange.start - startNodeInfo.startIndex;
      range.setStart(startNodeInfo.node, startOffset);
      const endOffset = bestRange.end - endNodeInfo.startIndex;
      range.setEnd(endNodeInfo.node, endOffset);

      console.log('Found text range:', startContent, '→', endContent);
      return range;
    } catch (error) {
      console.error('Error finding text in DOM:', error);
      return null;
    }
  }
}

// Make available globally for tests
window.Highlighter = Highlighter;
console.log('Highlighter class assigned to window:', typeof window.Highlighter);
    `,
	});

	// Add the test golden nuggets data
	await page.addScriptTag({
		content: `window.testGoldenNuggets = ${JSON.stringify(goldenNuggets)};`,
	});
}
