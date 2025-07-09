import { ContentExtractor } from './base';
import { Readability } from '@mozilla/readability';

export class GenericExtractor extends ContentExtractor {
  async extractContent(): Promise<string> {
    const content: string[] = [];
    
    try {
      // Clone the document to avoid modifying the original
      const documentClone = document.cloneNode(true) as Document;
      
      // Use Readability.js to extract the main content
      const reader = new Readability(documentClone);
      const article = reader.parse();
      
      if (article) {
        // Add title if available
        if (article.title) {
          content.push(`[TITLE] ${article.title}`);
        }
        
        // Add the main content
        if (article.textContent) {
          content.push(`[CONTENT] ${this.cleanText(article.textContent)}`);
        }
        
        // Add byline if available
        if (article.byline) {
          content.push(`[BYLINE] ${article.byline}`);
        }
      }
    } catch (error) {
      console.warn('Readability.js failed, falling back to simple extraction:', error);
      // Fallback to simple extraction if Readability.js fails
      return this.fallbackExtraction();
    }
    
    // If Readability.js didn't find content, try fallback
    if (content.length === 0) {
      return this.fallbackExtraction();
    }
    
    return content.join('\n\n');
  }
  
  private fallbackExtraction(): string {
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