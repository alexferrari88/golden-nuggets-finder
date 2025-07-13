import { GoldenNugget } from '../../shared/types';
import { colors, generateInlineStyles, zIndex } from '../../shared/design-system';
import { SITE_SELECTORS } from 'threads-harvester';

export class Highlighter {
  private highlights: HTMLElement[] = [];
  private popups: HTMLElement[] = [];
  private textCache = new Map<string, string>();
  private searchCache = new Map<string, Element[]>();

  async highlightNugget(nugget: GoldenNugget): Promise<boolean> {
    const found = this.findAndHighlightText(nugget);
    return found;
  }

  getHighlightElement(nugget: GoldenNugget): HTMLElement | null {
    // Use the same matching strategy as highlighting to find the existing highlight
    return this.findExistingHighlight(nugget);
  }

  scrollToHighlight(nugget: GoldenNugget): void {
    const element = this.getHighlightElement(nugget);
    
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'nearest'
      });
      
      // Add temporary glow effect
      const originalBoxShadow = element.style.boxShadow;
      element.style.boxShadow = `0 0 0 3px ${colors.text.accent}30`;
      setTimeout(() => {
        element.style.boxShadow = originalBoxShadow;
      }, 1500);
    }
  }

  private findExistingHighlight(nugget: GoldenNugget): HTMLElement | null {
    // Get all existing highlight elements
    const existingHighlights = document.querySelectorAll('.nugget-highlight');
    
    if (existingHighlights.length === 0) {
      return null;
    }
    
    const normalizedContent = this.normalizeText(nugget.content);
    
    // Strategy 1: Try to find highlight by exact content match
    for (const highlight of existingHighlights) {
      const highlightText = highlight.textContent || '';
      const normalizedHighlight = this.normalizeText(highlightText);
      
      if (normalizedHighlight.includes(normalizedContent) || 
          normalizedContent.includes(normalizedHighlight) ||
          this.getOverlapScore(normalizedHighlight, normalizedContent) > 0.7) {
        return highlight as HTMLElement;
      }
    }
    
    // Strategy 2: Try to find by key phrases
    const keyPhrases = this.extractKeyPhrases(nugget.content);
    for (const phrase of keyPhrases) {
      const normalizedPhrase = this.normalizeText(phrase);
      if (normalizedPhrase.length > 8) {
        for (const highlight of existingHighlights) {
          const highlightText = highlight.textContent || '';
          const normalizedHighlight = this.normalizeText(highlightText);
          
          if (normalizedHighlight.includes(normalizedPhrase) || 
              normalizedPhrase.includes(normalizedHighlight) ||
              this.getOverlapScore(normalizedHighlight, normalizedPhrase) > 0.6) {
            return highlight as HTMLElement;
          }
        }
      }
    }
    
    // Strategy 3: Try fuzzy matching with overlap scoring
    for (const highlight of existingHighlights) {
      const highlightText = highlight.textContent || '';
      const normalizedHighlight = this.normalizeText(highlightText);
      
      if (this.fuzzyMatch(normalizedHighlight, normalizedContent) || 
          this.fuzzyMatch(normalizedContent, normalizedHighlight) ||
          this.getOverlapScore(normalizedHighlight, normalizedContent) > 0.5) {
        return highlight as HTMLElement;
      }
    }
    
    return null;
  }


  clearHighlights(): void {
    // Use DocumentFragment for batch DOM operations
    const fragment = document.createDocumentFragment();
    
    // Remove all highlights
    this.highlights.forEach(highlight => {
      const parent = highlight.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(highlight.textContent || ''), highlight);
        parent.normalize();
      }
    });
    this.highlights = [];

    // Remove all popups
    this.popups.forEach(popup => popup.remove());
    this.popups = [];
    
    // Clear caches
    this.textCache.clear();
    this.searchCache.clear();
  }

  private findAndHighlightText(nugget: GoldenNugget): boolean {
    const normalizedContent = this.normalizeText(nugget.content);
    
    // Early return if content is too short or empty
    if (normalizedContent.length < 5) {
      return false;
    }
    
    // Use more efficient search with caching
    const cacheKey = `highlight_${normalizedContent}`;
    let textNodes = this.searchCache.get(cacheKey);
    
    if (!textNodes) {
      textNodes = this.getTextNodesOptimized();
      this.searchCache.set(cacheKey, textNodes);
    }

    // Try multiple matching strategies in order of preference
    return this.tryMultipleMatchingStrategies(textNodes, nugget, normalizedContent);
  }





  private createClickableIndicator(nugget: GoldenNugget): HTMLElement {
    const isDiscussionSite = window.location.href.includes('reddit.com') || 
                           window.location.href.includes('news.ycombinator.com');
    
    const indicator = document.createElement('span');
    indicator.className = 'nugget-indicator';
    indicator.style.cssText = `
      cursor: pointer;
      margin-left: 4px;
      font-size: 12px;
      opacity: 0.7;
      user-select: none;
    `;
    
    if (isDiscussionSite) {
      // For discussion sites, show [type] tag
      indicator.textContent = `[${nugget.type}]`;
      indicator.style.cssText += `
        background: ${colors.background.overlay};
        padding: 2px 4px;
        border-radius: 2px;
        font-weight: bold;
      `;
    } else {
      // For generic pages, show sparkles icon
      indicator.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/></svg>';
      indicator.style.cssText += `
        font-size: 14px;
      `;
    }
    
    // Add click handler to show synthesis popup
    indicator.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showSynthesisPopup(nugget, indicator);
    });
    
    return indicator;
  }

  private showSynthesisPopup(nugget: GoldenNugget, targetElement: HTMLElement): void {
    // Remove any existing popups
    this.popups.forEach(popup => popup.remove());
    this.popups = [];
    
    const popup = document.createElement('div');
    popup.className = 'nugget-synthesis-popup';
    popup.style.cssText = `
      position: absolute;
      background: white;
      border: 1px solid ${colors.border.default};
      padding: 12px;
      border-radius: 4px;
      box-shadow: ${generateInlineStyles.notification()};
      max-width: 300px;
      z-index: ${zIndex.overlay};
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.4;
    `;
    
    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = `
      position: absolute;
      top: 4px;
      right: 8px;
      background: none;
      border: none;
      font-size: 18px;
      cursor: pointer;
      padding: 0;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    closeBtn.addEventListener('click', () => popup.remove());
    
    // Add content
    const content = document.createElement('div');
    content.style.paddingRight = '20px';
    content.textContent = nugget.synthesis;
    
    popup.appendChild(closeBtn);
    popup.appendChild(content);
    
    // Position popup near target element
    this.positionPopup(popup, targetElement);
    
    document.body.appendChild(popup);
    this.popups.push(popup);
    
    // Close on click outside
    setTimeout(() => {
      const closeHandler = (e: MouseEvent) => {
        if (!popup.contains(e.target as Node)) {
          popup.remove();
          document.removeEventListener('click', closeHandler);
        }
      };
      document.addEventListener('click', closeHandler);
    }, 0);
  }

  private positionPopup(popup: HTMLElement, targetElement: HTMLElement): void {
    const rect = targetElement.getBoundingClientRect();
    const popupRect = popup.getBoundingClientRect();
    
    let top = rect.bottom + window.scrollY + 5;
    let left = rect.left + window.scrollX;
    
    // Adjust if popup would go off-screen
    if (left + 300 > window.innerWidth) {
      left = window.innerWidth - 300 - 20;
    }
    
    if (top + 200 > window.innerHeight + window.scrollY) {
      top = rect.top + window.scrollY - 200 - 5;
    }
    
    popup.style.top = `${top}px`;
    popup.style.left = `${left}px`;
  }

  private normalizeText(text: string): string {
    if (this.textCache.has(text)) {
      return this.textCache.get(text)!;
    }
    
    const normalized = text
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '')
      .toLowerCase()
      .trim();
    
    // Cache with size limit
    if (this.textCache.size > 200) {
      this.textCache.clear();
    }
    this.textCache.set(text, normalized);
    
    return normalized;
  }
  
  private getTextNodesOptimized(): Element[] {
    const textNodes: Element[] = [];
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          
          // Skip already highlighted content and UI elements
          if (parent.classList.contains('nugget-highlight') || 
              parent.classList.contains('nugget-sidebar') ||
              parent.classList.contains('nugget-notification-banner')) {
            return NodeFilter.FILTER_REJECT;
          }
          
          // Skip elements that are unlikely to contain meaningful content
          const tagName = parent.tagName.toLowerCase();
          if (['script', 'style', 'noscript', 'svg', 'canvas'].includes(tagName)) {
            return NodeFilter.FILTER_REJECT;
          }
          
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let textNode: Node | null;
    while (textNode = walker.nextNode()) {
      const text = textNode.textContent || '';
      // Only include text nodes with meaningful content
      if (text.trim().length > 10) {
        textNodes.push(textNode as Element);
      }
    }
    
    return textNodes;
  }
  
  private tryMultipleMatchingStrategies(textNodes: Element[], nugget: GoldenNugget, normalizedContent: string): boolean {
    const originalContent = nugget.content;
    
    // Strategy 1: Exact substring match (most precise) - KEEP ORIGINAL SIMPLE LOGIC
    for (const textNode of textNodes) {
      const text = textNode.textContent || '';
      const normalizedText = this.normalizeText(text);
      
      if (normalizedText.includes(normalizedContent)) {
        this.highlightTextNodeSimple(textNode as Text, nugget, normalizedContent);
        return true;
      }
    }
    
    // Strategy 2: Key phrase matching (extract key phrases from content)
    const keyPhrases = this.extractKeyPhrases(originalContent);
    for (const phrase of keyPhrases) {
      const normalizedPhrase = this.normalizeText(phrase);
      if (normalizedPhrase.length > 8) { // Only try meaningful phrases
        for (const textNode of textNodes) {
          const text = textNode.textContent || '';
          const normalizedText = this.normalizeText(text);
          
          if (normalizedText.includes(normalizedPhrase)) {
            this.highlightTextNodeSimple(textNode as Text, nugget, normalizedPhrase);
            return true;
          }
        }
      }
    }
    
    // Strategy 3: Fuzzy word matching
    for (const textNode of textNodes) {
      const text = textNode.textContent || '';
      const normalizedText = this.normalizeText(text);
      
      if (this.fuzzyMatch(normalizedText, normalizedContent)) {
        this.highlightTextNodeSimple(textNode as Text, nugget, normalizedContent);
        return true;
      }
    }
    
    // Strategy 4: Container-based search for HTML fragmentation (NEW - only as last resort)
    return this.tryContainerBasedHighlighting(nugget);
  }

  private highlightTextNodeSimple(textNode: Text, nugget: GoldenNugget, searchTerm: string): void {
    // Back to the original simple logic that worked
    const text = textNode.textContent || '';
    const normalizedText = this.normalizeText(text);
    
    const startIndex = normalizedText.indexOf(searchTerm);
    if (startIndex === -1) return;
    
    // Calculate the actual positions in the original text (simplified)
    const beforeText = text.substring(0, startIndex);
    const highlightText = text.substring(startIndex, startIndex + searchTerm.length);
    const afterText = text.substring(startIndex + searchTerm.length);
    
    // Create the highlight element
    const highlightSpan = document.createElement('span');
    highlightSpan.className = 'nugget-highlight';
    highlightSpan.style.cssText = generateInlineStyles.highlightStyle();
    highlightSpan.dataset.nuggetType = nugget.type;
    highlightSpan.textContent = highlightText;
    
    // Create clickable indicator
    const indicator = this.createClickableIndicator(nugget);
    
    // Replace the text node with the highlighted version
    const parent = textNode.parentNode;
    if (parent) {
      if (beforeText) {
        parent.insertBefore(document.createTextNode(beforeText), textNode);
      }
      parent.insertBefore(highlightSpan, textNode);
      if (afterText) {
        parent.insertBefore(document.createTextNode(afterText), textNode);
      }
      parent.removeChild(textNode);
      
      // Place indicator at the end of the containing comment element
      this.placeIndicatorAtCommentEnd(indicator, parent as Element);
    }
    
    this.highlights.push(highlightSpan);
  }

  private placeIndicatorAtCommentEnd(indicator: HTMLElement, startElement: Element): void {
    // Find the containing comment element by traversing up the DOM tree
    let commentContainer = startElement;
    
    // Look for common comment container selectors
    const commentSelectors = [
      '.comment',     // HackerNews
      SITE_SELECTORS.HACKER_NEWS.COMMENTS,    // HackerNews comment text
      '.thing',       // Reddit
      '.Comment',     // Reddit modern
      '[class*="comment"]',  // Generic comment classes
      '[class*="Comment"]',  // Generic comment classes (capitalized)
      '[data-testid*="comment"]',  // Test ID patterns
      'article',      // Generic article elements
      'p',            // Paragraph elements as last resort
    ];
    
    // Traverse up the DOM tree to find a comment container
    while (commentContainer && commentContainer !== document.body) {
      for (const selector of commentSelectors) {
        if (commentContainer.matches && commentContainer.matches(selector)) {
          // Found a comment container, place indicator at the end
          this.appendIndicatorToContainer(indicator, commentContainer);
          return;
        }
      }
      commentContainer = commentContainer.parentElement!;
    }
    
    // Fallback: place indicator right after the start element
    if (startElement.parentElement) {
      startElement.parentElement.insertBefore(indicator, startElement.nextSibling);
    }
  }

  private appendIndicatorToContainer(indicator: HTMLElement, container: Element): void {
    // Try to find the best place to insert the indicator within the container
    const lastChild = container.lastChild;
    
    if (lastChild && lastChild.nodeType === Node.TEXT_NODE) {
      // If the last child is a text node, insert after it
      container.appendChild(indicator);
    } else if (lastChild && lastChild.nodeType === Node.ELEMENT_NODE) {
      // If the last child is an element, insert after it
      container.appendChild(indicator);
    } else {
      // Fallback: just append to the container
      container.appendChild(indicator);
    }
  }

  private tryContainerBasedHighlighting(nugget: GoldenNugget): boolean {
    // Only for HTML fragmentation cases - find containers with full content
    const normalizedContent = this.normalizeText(nugget.content);
    
    // Look for specific comment containers that might have fragmented content
    const containers = document.querySelectorAll(
      `${SITE_SELECTORS.HACKER_NEWS.COMMENTS}, .comment, .usertext-body, .md, [class*="comment"], [class*="text"]`
    );
    
    for (const container of containers) {
      // Skip our own UI elements
      if (container.classList.contains('nugget-sidebar') ||
          container.classList.contains('nugget-highlight')) {
        continue;
      }
      
      const containerText = container.textContent || '';
      const normalizedContainer = this.normalizeText(containerText);
      
      // If container has the full content, find a good text node within it
      if (normalizedContainer.includes(normalizedContent)) {
        const textNodes = this.getTextNodesInElement(container);
        
        // Find the best text node to highlight within this container
        for (const textNode of textNodes) {
          const text = textNode.textContent || '';
          if (text.trim().length > 10) {
            // Highlight this representative text node
            this.highlightTextNodeSimple(textNode as Text, nugget, this.normalizeText(text));
            return true;
          }
        }
      }
    }
    
    return false;
  }

  private extractKeyPhrases(content: string): string[] {
    const phrases: string[] = [];
    
    // Extract quoted text
    const quotedMatches = content.match(/["'`]([^"'`]+)["'`]/g);
    if (quotedMatches) {
      phrases.push(...quotedMatches.map(m => m.slice(1, -1)));
    }
    
    // Extract sentences or clauses
    const sentences = content.split(/[.!?;:]/).filter(s => s.trim().length > 10);
    phrases.push(...sentences);
    
    // Extract meaningful phrases (5+ words)
    const words = content.split(/\s+/);
    for (let i = 0; i < words.length - 4; i++) {
      const phrase = words.slice(i, i + 5).join(' ');
      if (phrase.length > 20) {
        phrases.push(phrase);
      }
    }
    
    // Sort by length descending to try longer phrases first
    return phrases.sort((a, b) => b.length - a.length);
  }

  private fuzzyMatch(text: string, pattern: string): boolean {
    // Improved fuzzy matching with multiple strategies
    const threshold = 0.7; // Relaxed threshold
    const words = pattern.split(' ').filter(w => w.length > 2);
    const textWords = text.split(' ');
    
    if (words.length === 0) {
      return false;
    }
    
    let matchCount = 0;
    for (const word of words) {
      // Check for exact word match, substring match, or similar words
      if (textWords.some(tw => 
        tw === word || 
        tw.includes(word) || 
        word.includes(tw) ||
        this.similarity(tw, word) > 0.8
      )) {
        matchCount++;
      }
    }
    
    return matchCount / words.length >= threshold;
  }



  private getTextNodesInElement(element: Element): Node[] {
    const textNodes: Node[] = [];
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          
          // Skip already highlighted content and UI elements
          if (parent.classList.contains('nugget-highlight') || 
              parent.classList.contains('nugget-sidebar') ||
              parent.classList.contains('nugget-notification-banner')) {
            return NodeFilter.FILTER_REJECT;
          }
          
          // Skip elements that are unlikely to contain meaningful content
          const tagName = parent.tagName.toLowerCase();
          if (['script', 'style', 'noscript', 'svg', 'canvas'].includes(tagName)) {
            return NodeFilter.FILTER_REJECT;
          }
          
          const text = node.textContent || '';
          // Only include text nodes with meaningful content
          if (text.trim().length > 5) {
            return NodeFilter.FILTER_ACCEPT;
          }
          
          return NodeFilter.FILTER_REJECT;
        }
      }
    );

    let textNode: Node | null;
    while (textNode = walker.nextNode()) {
      textNodes.push(textNode);
    }
    
    return textNodes;
  }

  private getOverlapScore(text1: string, text2: string): number {
    const words1 = text1.split(/\s+/).filter(w => w.length > 2);
    const words2 = text2.split(/\s+/).filter(w => w.length > 2);
    
    if (words1.length === 0 || words2.length === 0) return 0;
    
    let commonWords = 0;
    const set2 = new Set(words2);
    
    for (const word of words1) {
      if (set2.has(word)) {
        commonWords++;
      }
    }
    
    return commonWords / Math.max(words1.length, words2.length);
  }

  private similarity(a: string, b: string): number {
    // Simple similarity measure using Levenshtein distance
    const matrix = [];
    const n = a.length;
    const m = b.length;
    
    if (n === 0) return m === 0 ? 1 : 0;
    if (m === 0) return 0;
    
    for (let i = 0; i <= n; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= m; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        if (a[i - 1] === b[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j - 1] + 1
          );
        }
      }
    }
    
    const distance = matrix[n][m];
    return 1 - distance / Math.max(n, m);
  }
}