import { ContentExtractor } from './base';

export class GenericExtractor extends ContentExtractor {
  async extractContent(): Promise<string> {
    // For now, implement a simple version that gets the main content
    // In a full implementation, this would use Readability.js
    const content: string[] = [];
    
    // Try to find the main content area
    const mainSelectors = [
      'main',
      'article',
      '[role="main"]',
      '.content',
      '.main-content',
      '.article-content',
      '.post-content',
      '.entry-content',
      '#content',
      '#main'
    ];
    
    let mainElement: Element | null = null;
    
    for (const selector of mainSelectors) {
      const element = document.querySelector(selector);
      if (element && this.isElementVisible(element)) {
        mainElement = element;
        break;
      }
    }
    
    // If no main element found, use body but exclude header, nav, footer, sidebar
    if (!mainElement) {
      mainElement = document.body;
    }
    
    if (mainElement) {
      // Clone the element to avoid modifying the original
      const clone = mainElement.cloneNode(true) as Element;
      
      // Remove unwanted elements
      const unwantedSelectors = [
        'header', 'nav', 'footer', 'aside',
        '.header', '.nav', '.footer', '.sidebar',
        '.navigation', '.menu', '.breadcrumb',
        '.social-share', '.comments', '.comment',
        '.advertisement', '.ad', '.ads'
      ];
      
      unwantedSelectors.forEach(selector => {
        clone.querySelectorAll(selector).forEach(el => el.remove());
      });
      
      // Extract text content
      const text = this.extractTextFromElement(clone);
      if (text) {
        content.push(text);
      }
    }
    
    // If still no content, try to get title and meta description
    if (content.length === 0) {
      const title = document.title;
      const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
      
      if (title || metaDescription) {
        content.push(`[TITLE] ${title}\n[DESCRIPTION] ${metaDescription}`);
      }
    }
    
    return content.join('\n\n');
  }
}