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
      .replace(/[ \t]+/g, ' ')  // Replace multiple spaces/tabs with single space, preserve line breaks
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
    
    // Fallback: custom text extraction for test environments that properly filters elements
    return this.extractTextRecursive(element);
  }

  private extractTextRecursive(element: Element): string {
    const textParts: string[] = [];
    
    for (const node of element.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim();
        if (text && text.length > 0) {
          textParts.push(text);
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element;
        const tagName = el.tagName.toLowerCase();
        
        // Skip script, style, and other non-content elements
        if (!['script', 'style', 'noscript', 'svg', 'canvas'].includes(tagName)) {
          const childText = this.extractTextRecursive(el);
          if (childText) {
            textParts.push(childText);
          }
        }
      }
    }
    
    const result = textParts.join(' ');
    return this.cleanText(result);
  }

  protected isElementVisible(element: Element): boolean {
    const htmlElement = element as HTMLElement;
    
    // First check if element is connected to DOM
    if (!element.isConnected) {
      return false;
    }
    
    // Check if element has offsetParent (null means not rendered)
    if (htmlElement.offsetParent === null) {
      // In test environments, offsetParent might not work correctly
      // So we also check inline styles for display:none
      if (htmlElement.style.display === 'none') {
        return false;
      }
    }
    
    // Check explicit inline styles first (more reliable in test environments)
    if (htmlElement.style.display === 'none' || htmlElement.style.visibility === 'hidden') {
      return false;
    }
    
    // Check dimensions
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return false;
    }
    
    // Check computed styles as final fallback
    try {
      const computedStyle = window.getComputedStyle(element);
      return computedStyle.display !== 'none' && 
             computedStyle.visibility !== 'hidden';
    } catch (error) {
      // If getComputedStyle fails (test environment), fall back to basic checks
      return true; // Assume visible if we can't determine otherwise
    }
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