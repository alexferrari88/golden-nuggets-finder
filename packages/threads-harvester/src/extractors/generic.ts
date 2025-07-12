import { BaseExtractor } from './base';
import { Content, ContentItem } from '../types';

export class GenericExtractor extends BaseExtractor {
  public async extract(): Promise<Content> {
    const content: Content = {
      pageURL: window.location.href,
      title: document.title || 'Untitled Page',
      items: []
    };

    // Basic implementation: extract main content areas
    const contentSelectors = [
      'article',
      'main',
      '[role="main"]',
      '.content',
      '#content',
      '.post',
      '.entry-content'
    ];

    let foundElements: HTMLElement[] = [];

    for (const selector of contentSelectors) {
      const elements = document.querySelectorAll(selector) as NodeListOf<HTMLElement>;
      if (elements.length > 0) {
        foundElements = Array.from(elements);
        break;
      }
    }

    // Fallback: use paragraphs if no main content found
    if (foundElements.length === 0) {
      const paragraphs = document.querySelectorAll('p') as NodeListOf<HTMLElement>;
      foundElements = Array.from(paragraphs).filter(p => 
        this.isElementVisible(p) && this.extractTextFromElement(p).length > 50
      );
    }

    foundElements.forEach((element, index) => {
      const textContent = this.extractTextFromElement(element);
      if (textContent && textContent.length > 20) { // Minimum content length
        const item: ContentItem = {
          id: this.generateId(textContent),
          element,
          textContent,
          htmlContent: this.includeHtml ? element.innerHTML : undefined,
          type: 'post',
          selected: false
        };
        content.items.push(item);
      }
    });

    return content;
  }
}