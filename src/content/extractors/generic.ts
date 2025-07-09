import { ContentExtractor } from './base';

// Declare the global Readability class
declare global {
  var Readability: any;
}

export class GenericExtractor extends ContentExtractor {
  private async loadReadabilityScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('Readability.js');
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Readability.js'));
      document.head.appendChild(script);
    });
  }

  async extractContent(): Promise<string> {
    const content: string[] = [];
    
    try {
      // Load Readability.js script if not already loaded
      if (!window.Readability) {
        await this.loadReadabilityScript();
      }
      
      // Use Readability.js to extract the main content
      const documentClone = this.createOptimizedDocumentClone();
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
  
  private createOptimizedDocumentClone(): Document {
    // Create a lighter document clone by removing heavy elements first
    const clone = document.cloneNode(true) as Document;
    
    // Remove elements that slow down processing
    const heavySelectors = [
      'script', 'style', 'noscript', 'svg', 'canvas', 'video', 'audio',
      'iframe', 'embed', 'object', '.advertisement', '.ad', '.ads'
    ];
    
    heavySelectors.forEach(selector => {
      clone.querySelectorAll(selector).forEach(el => el.remove());
    });
    
    return clone;
  }
  
  private fallbackExtraction(): string {
    const content: string[] = [];
    
    // Optimized main content detection using priority order
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
    
    // Use querySelectorAll with combined selector for better performance
    const combinedSelector = mainSelectors.join(', ');
    const candidates = document.querySelectorAll(combinedSelector);
    
    for (const candidate of candidates) {
      if (this.isElementVisible(candidate)) {
        mainElement = candidate;
        break;
      }
    }
    
    // If no main element found, use body but exclude header, nav, footer, sidebar
    if (!mainElement) {
      mainElement = document.body;
    }
    
    if (mainElement) {
      // Clone and clean the element for content extraction
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