import { GoldenNugget } from '../../shared/types';
import { UI_CONSTANTS } from '../../shared/constants';

export class Highlighter {
  private highlights: HTMLElement[] = [];
  private popups: HTMLElement[] = [];
  private textCache = new Map<string, string>();
  private searchCache = new Map<string, Element[]>();
  private nuggetHighlightMap = new Map<string, HTMLElement>();

  async highlightNugget(nugget: GoldenNugget): Promise<boolean> {
    const found = this.findAndHighlightText(nugget);
    return found;
  }

  getHighlightElement(nugget: GoldenNugget): HTMLElement | null {
    const key = this.getNuggetKey(nugget);
    return this.nuggetHighlightMap.get(key) || null;
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
      element.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.5)';
      setTimeout(() => {
        element.style.boxShadow = originalBoxShadow;
      }, 1500);
    }
  }

  private getNuggetKey(nugget: GoldenNugget): string {
    // Create a more unique key using content hash and synthesis
    const contentHash = this.simpleHash(nugget.content);
    const synthesisHash = this.simpleHash(nugget.synthesis);
    return `${nugget.type}_${contentHash}_${synthesisHash}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
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
    this.nuggetHighlightMap.clear();
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

  private highlightTextNode(textNode: Text, nugget: GoldenNugget): void {
    const text = textNode.textContent || '';
    const normalizedText = this.normalizeText(text);
    const normalizedContent = this.normalizeText(nugget.content);
    
    const startIndex = normalizedText.indexOf(normalizedContent);
    if (startIndex === -1) return;
    
    // Calculate the actual positions in the original text
    const beforeText = text.substring(0, startIndex);
    const highlightText = text.substring(startIndex, startIndex + normalizedContent.length);
    const afterText = text.substring(startIndex + normalizedContent.length);
    
    // Create the highlight element
    const highlightSpan = document.createElement('span');
    highlightSpan.className = 'nugget-highlight';
    highlightSpan.style.cssText = UI_CONSTANTS.HIGHLIGHT_STYLE;
    highlightSpan.dataset.nuggetType = nugget.type;
    highlightSpan.textContent = highlightText;
    
    // Add clickable indicator
    const indicator = this.createClickableIndicator(nugget);
    highlightSpan.appendChild(indicator);
    
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
    }
    
    this.highlights.push(highlightSpan);
    
    // Store highlight reference for scrolling
    const key = this.getNuggetKey(nugget);
    this.nuggetHighlightMap.set(key, highlightSpan);
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
        background: rgba(0,0,0,0.1);
        padding: 2px 4px;
        border-radius: 2px;
        font-weight: bold;
      `;
    } else {
      // For generic pages, show ✨ icon
      indicator.textContent = '✨';
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
      border: 1px solid #ccc;
      padding: 12px;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      max-width: 300px;
      z-index: ${UI_CONSTANTS.POPUP_Z_INDEX};
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
    
    // Strategy 1: Exact substring match (most precise)
    for (const textNode of textNodes) {
      const text = textNode.textContent || '';
      const normalizedText = this.normalizeText(text);
      
      if (normalizedText.includes(normalizedContent)) {
        this.highlightTextNode(textNode as Text, nugget);
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
            this.highlightTextNode(textNode as Text, nugget);
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
        this.highlightTextNode(textNode as Text, nugget);
        return true;
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