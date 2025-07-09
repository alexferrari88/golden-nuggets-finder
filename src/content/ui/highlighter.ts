import { GoldenNugget } from '../../shared/types';
import { UI_CONSTANTS } from '../../shared/constants';

export class Highlighter {
  private highlights: HTMLElement[] = [];
  private popups: HTMLElement[] = [];
  private textCache = new Map<string, string>();
  private searchCache = new Map<string, Element[]>();

  async highlightNugget(nugget: GoldenNugget): Promise<boolean> {
    const found = this.findAndHighlightText(nugget);
    return found;
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

    // Use more efficient text search
    for (const textNode of textNodes) {
      const text = textNode.textContent || '';
      const normalizedText = this.normalizeText(text);
      
      // Use exact matching only for more precision
      if (normalizedText.includes(normalizedContent)) {
        this.highlightTextNode(textNode as Text, nugget);
        return true; // Only highlight the first occurrence
      }
    }

    return false;
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
  
  private fuzzyMatch(text: string, pattern: string): boolean {
    // Try exact substring match first
    if (text.includes(pattern)) {
      return true;
    }
    
    // For fuzzy matching, require higher similarity
    const threshold = 0.9; // 90% similarity threshold
    const words = pattern.split(' ').filter(w => w.length > 2);
    const textWords = text.split(' ');
    
    if (words.length === 0) {
      return false;
    }
    
    let matchCount = 0;
    for (const word of words) {
      if (textWords.some(tw => tw.includes(word) || word.includes(tw))) {
        matchCount++;
      }
    }
    
    return matchCount / words.length >= threshold;
  }
}