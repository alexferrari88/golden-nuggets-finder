import { BaseExtractor } from './base';
import { Content, ContentItem } from '../types';
import { SITE_SELECTORS } from '../constants';

export class HackerNewsExtractor extends BaseExtractor {
  public async extract(): Promise<Content> {
    const content: Content = {
      pageURL: window.location.href,
      title: document.title || 'Hacker News',
      items: []
    };

    // Extract comments using HN's comment structure
    const commentElements = document.querySelectorAll(SITE_SELECTORS.HACKER_NEWS.COMMENT_TREE) as NodeListOf<HTMLElement>;
    
    commentElements.forEach((commentEl) => {
      const commentContent = commentEl.querySelector(SITE_SELECTORS.HACKER_NEWS.COMMENTS);
      if (commentContent && this.isElementVisible(commentContent)) {
        const textContent = this.extractTextFromElement(commentContent);
        
        if (textContent && textContent.length > 10) {
          const item: ContentItem = {
            id: this.generateId(textContent),
            element: commentEl,
            textContent,
            htmlContent: this.includeHtml ? commentContent.innerHTML : undefined,
            type: 'comment',
            selected: false
          };
          content.items.push(item);
        }
      }
    });

    // If no comments found, try to extract the main story
    if (content.items.length === 0) {
      const storyElements = document.querySelectorAll(SITE_SELECTORS.HACKER_NEWS.STORY_ITEM) as NodeListOf<HTMLElement>;
      
      storyElements.forEach((storyEl) => {
        const titleEl = storyEl.querySelector(SITE_SELECTORS.HACKER_NEWS.TITLE_LINK);
        if (titleEl && this.isElementVisible(titleEl)) {
          const textContent = this.extractTextFromElement(titleEl);
          
          if (textContent) {
            const item: ContentItem = {
              id: this.generateId(textContent),
              element: storyEl,
              URL: (titleEl as HTMLAnchorElement).href,
              textContent,
              htmlContent: this.includeHtml ? storyEl.innerHTML : undefined,
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