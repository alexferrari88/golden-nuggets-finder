import { ContentExtractor } from './base';
import { SITE_SELECTORS } from '../../shared/constants';

export class RedditExtractor extends ContentExtractor {
  async extractContent(): Promise<string> {
    const content: string[] = [];
    
    // Extract main post content
    const postElements = document.querySelectorAll(SITE_SELECTORS.REDDIT.POST);
    for (const element of postElements) {
      if (this.isElementVisible(element)) {
        const text = this.extractTextFromElement(element);
        if (text) {
          content.push(`[POST] ${text}`);
        }
      }
    }
    
    // Extract comments with performance optimization
    const commentElements = document.querySelectorAll(SITE_SELECTORS.REDDIT.COMMENTS);
    const maxComments = 50; // Limit to prevent performance issues on large threads
    let commentCount = 0;
    
    for (const element of commentElements) {
      if (commentCount >= maxComments) break;
      
      if (this.isElementVisible(element)) {
        const text = this.extractTextFromElement(element);
        if (text && text.length > 10) { // Filter out very short comments
          content.push(`[COMMENT ${commentCount + 1}] ${text}`);
          commentCount++;
        }
      }
    }
    
    return content.join('\n\n');
  }
}