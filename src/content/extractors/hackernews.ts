import { ContentExtractor } from './base';
import { SITE_SELECTORS } from '../../shared/constants';

export class HackerNewsExtractor extends ContentExtractor {
  async extractContent(): Promise<string> {
    const content: string[] = [];
    
    // Extract main post content (if exists)
    const postElements = document.querySelectorAll(SITE_SELECTORS.HACKER_NEWS.POST);
    for (const element of postElements) {
      if (this.isElementVisible(element)) {
        const text = this.extractTextFromElement(element);
        if (text) {
          content.push(`[POST] ${text}`);
        }
      }
    }
    
    // Extract comments with performance optimization
    const commentElements = document.querySelectorAll(SITE_SELECTORS.HACKER_NEWS.COMMENTS);
    const maxComments = 50; // Limit to prevent performance issues on large threads
    let commentCount = 0;
    
    for (const element of commentElements) {
      if (commentCount >= maxComments) break;
      
      if (this.isElementVisible(element)) {
        const text = this.extractTextFromElement(element);
        if (text && text.length > 20) { // Filter out very short comments
          content.push(`[COMMENT ${commentCount + 1}] ${text}`);
          commentCount++;
        }
      }
    }
    
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