import { ContentExtractor } from './base';
import { SITE_SELECTORS } from '../../shared/constants';

export class HackerNewsExtractor extends ContentExtractor {
  async extractContent(): Promise<string> {
    const content: string[] = [];
    
    // Extract main post content (if exists)
    const postElements = document.querySelectorAll(SITE_SELECTORS.HACKER_NEWS.POST);
    postElements.forEach(element => {
      if (this.isElementVisible(element)) {
        const text = this.extractTextFromElement(element);
        if (text) {
          content.push(`[POST] ${text}`);
        }
      }
    });
    
    // Extract comments
    const commentElements = document.querySelectorAll(SITE_SELECTORS.HACKER_NEWS.COMMENTS);
    commentElements.forEach((element, index) => {
      if (this.isElementVisible(element)) {
        const text = this.extractTextFromElement(element);
        if (text && text.length > 20) { // Filter out very short comments
          content.push(`[COMMENT ${index + 1}] ${text}`);
        }
      }
    });
    
    // If no post content found, try to get title and URL
    if (content.length === 0 || !content[0].startsWith('[POST]')) {
      const titleElement = document.querySelector('.titleline > a');
      if (titleElement) {
        const title = titleElement.textContent || '';
        const url = titleElement.getAttribute('href') || '';
        content.unshift(`[POST] ${title} ${url}`);
      }
    }
    
    return content.join('\n\n');
  }
}