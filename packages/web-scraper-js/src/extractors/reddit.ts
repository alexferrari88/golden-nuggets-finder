import { BaseExtractor } from './base';
import { Content, ContentItem } from '../types';
import { SITE_SELECTORS } from '../constants';

export class RedditExtractor extends BaseExtractor {
  public async extract(): Promise<Content> {
    const content: Content = {
      pageURL: window.location.href,
      title: document.title || 'Reddit',
      items: []
    };

    // Try modern Reddit selectors first
    let commentElements = document.querySelectorAll(SITE_SELECTORS.REDDIT.COMMENT_DATA_TESTID) as NodeListOf<HTMLElement>;
    
    // Fallback to old Reddit selectors
    if (commentElements.length === 0) {
      commentElements = document.querySelectorAll(SITE_SELECTORS.REDDIT.COMMENT_TEXT) as NodeListOf<HTMLElement>;
    }

    commentElements.forEach((commentEl) => {
      if (this.isElementVisible(commentEl)) {
        const textContent = this.extractTextFromElement(commentEl);
        
        if (textContent && textContent.length > 10) {
          const item: ContentItem = {
            id: this.generateId(textContent),
            element: commentEl,
            textContent,
            htmlContent: this.includeHtml ? commentEl.innerHTML : undefined,
            type: 'comment',
            selected: false
          };
          content.items.push(item);
        }
      }
    });

    // If no comments, try to extract posts
    if (content.items.length === 0) {
      let postElements = document.querySelectorAll(SITE_SELECTORS.REDDIT.POST_CONTENT) as NodeListOf<HTMLElement>;
      
      // Fallback to old Reddit post selectors
      if (postElements.length === 0) {
        postElements = document.querySelectorAll(SITE_SELECTORS.REDDIT.THING_TEXT) as NodeListOf<HTMLElement>;
      }

      postElements.forEach((postEl) => {
        if (this.isElementVisible(postEl)) {
          const textContent = this.extractTextFromElement(postEl);
          
          if (textContent && textContent.length > 10) {
            const item: ContentItem = {
              id: this.generateId(textContent),
              element: postEl,
              textContent,
              htmlContent: this.includeHtml ? postEl.innerHTML : undefined,
              type: 'post',
              selected: false
            };
            content.items.push(item);
          }
        }
      });
    }

    return content;
  }
}