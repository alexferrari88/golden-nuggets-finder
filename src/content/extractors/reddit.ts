import { ContentExtractor } from './base';
import { SITE_SELECTORS } from '../../shared/constants';

export class RedditExtractor extends ContentExtractor {
  async extractContent(): Promise<string> {
    const content: string[] = [];
    
    // Extract main post content
    const postElements = document.querySelectorAll(SITE_SELECTORS.REDDIT.POST);
    postElements.forEach(element => {
      if (this.isElementVisible(element)) {
        const text = this.extractTextFromElement(element);
        if (text) {
          content.push(`[POST] ${text}`);
        }
      }
    });
    
    // Extract comments
    const commentElements = document.querySelectorAll(SITE_SELECTORS.REDDIT.COMMENTS);
    commentElements.forEach((element, index) => {
      if (this.isElementVisible(element)) {
        const text = this.extractTextFromElement(element);
        if (text && text.length > 10) { // Filter out very short comments
          content.push(`[COMMENT ${index + 1}] ${text}`);
        }
      }
    });
    
    return content.join('\n\n');
  }
}