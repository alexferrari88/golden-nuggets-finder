import { Content } from '../types';

export abstract class BaseExtractor {
  // Cache for cleaned text to avoid repeated processing
  private textCache = new Map<string, string>();

  constructor(protected includeHtml: boolean) {}

  public abstract extract(): Promise<Content>;

  protected cleanText(text: string): string {
    if (this.textCache.has(text)) {
      return this.textCache.get(text)!;
    }
    
    const cleaned = text
      .replace(/\s+/g, ' ')  // Replace multiple whitespace with single space
      .replace(/\n\s*\n/g, '\n\n')  // Normalize line breaks
      .trim();
    
    // Cache the result, but limit cache size to prevent memory leaks
    if (this.textCache.size > 100) {
      this.textCache.clear();
    }
    this.textCache.set(text, cleaned);
    
    return cleaned;
  }

  protected extractTextFromElement(element: Element): string {
    // Try TreeWalker first, fallback to simple textContent if not available
    try {
      const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            
            // Skip script, style, and other non-content elements
            const tagName = parent.tagName.toLowerCase();
            if (['script', 'style', 'noscript', 'svg', 'canvas'].includes(tagName)) {
              return NodeFilter.FILTER_REJECT;
            }
            
            return NodeFilter.FILTER_ACCEPT;
          }
        }
      );
      
      const textParts: string[] = [];
      let node;
      
      while (node = walker.nextNode()) {
        const text = node.textContent?.trim();
        if (text && text.length > 0) {
          textParts.push(text);
        }
      }
      
      const result = textParts.join(' ');
      if (result.length > 0) {
        return this.cleanText(result);
      }
    } catch (error) {
      // TreeWalker not supported or failed, fall back to simple extraction
    }
    
    // Fallback: simple text extraction for test environments
    const text = element.textContent || '';
    return this.cleanText(text);
  }

  protected isElementVisible(element: Element): boolean {
    // Use IntersectionObserver for better performance if available
    if ((element as HTMLElement).offsetParent === null) {
      return false; // Element is not rendered
    }
    
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return false;
    }
    
    // Only check computed styles if basic checks pass
    const computedStyle = window.getComputedStyle(element);
    return computedStyle.display !== 'none' && 
           computedStyle.visibility !== 'hidden';
  }

  protected generateId(content: string): string {
    // Simple hash function for generating unique IDs
    let hash = 0;
    if (content.length === 0) return hash.toString();
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString();
  }
}