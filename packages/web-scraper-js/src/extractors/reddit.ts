import { BaseExtractor } from './base';
import { Content, ContentItem } from '../types';

export class RedditExtractor extends BaseExtractor {
  public async extract(): Promise<Content> {
    const content: Content = {
      pageURL: window.location.href,
      title: document.title || 'Reddit',
      items: []
    };

    // Try modern Reddit selectors first
    let commentElements = document.querySelectorAll('[data-testid="comment"]') as NodeListOf<HTMLElement>;
    
    // Fallback to old Reddit selectors
    if (commentElements.length === 0) {
      commentElements = document.querySelectorAll('.comment .usertext-body') as NodeListOf<HTMLElement>;
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
      let postElements = document.querySelectorAll('[data-testid="post-content"]') as NodeListOf<HTMLElement>;
      
      // Fallback to old Reddit post selectors
      if (postElements.length === 0) {
        postElements = document.querySelectorAll('.thing .usertext-body') as NodeListOf<HTMLElement>;
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