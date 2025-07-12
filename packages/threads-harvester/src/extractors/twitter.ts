import { BaseExtractor } from './base';
import { Content, ContentItem } from '../types';
import { SITE_SELECTORS } from '../constants';

export class TwitterExtractor extends BaseExtractor {
  public async extract(): Promise<Content> {
    const content: Content = {
      pageURL: window.location.href,
      title: document.title || 'Twitter/X',
      items: []
    };

    // Twitter/X uses dynamic selectors, try common patterns
    const tweetSelectors = [
      SITE_SELECTORS.TWITTER.TWEET_ARTICLE,
      SITE_SELECTORS.TWITTER.TWEET,
      'article[role="article"]',
      '.tweet-text',
      '.twitter-tweet'
    ];

    let tweetElements: HTMLElement[] = [];

    for (const selector of tweetSelectors) {
      const elements = document.querySelectorAll(selector) as NodeListOf<HTMLElement>;
      if (elements.length > 0) {
        tweetElements = Array.from(elements);
        break;
      }
    }

    tweetElements.forEach((tweetEl) => {
      if (this.isElementVisible(tweetEl)) {
        // Try to find the text content within the tweet
        let textElement = tweetEl.querySelector(SITE_SELECTORS.TWITTER.TWEET) || 
                         tweetEl.querySelector('.tweet-text') ||
                         tweetEl;

        const textContent = this.extractTextFromElement(textElement);
        
        if (textContent && textContent.length > 5) {
          const item: ContentItem = {
            id: this.generateId(textContent),
            element: tweetEl,
            textContent,
            htmlContent: this.includeHtml ? tweetEl.innerHTML : undefined,
            type: 'post',
            selected: false
          };
          content.items.push(item);
        }
      }
    });

    // If no tweets found with specific selectors, try a more general approach
    if (content.items.length === 0) {
      const articleElements = document.querySelectorAll('article') as NodeListOf<HTMLElement>;
      
      articleElements.forEach((articleEl) => {
        if (this.isElementVisible(articleEl)) {
          const textContent = this.extractTextFromElement(articleEl);
          
          if (textContent && textContent.length > 20 && textContent.length < 2000) {
            const item: ContentItem = {
              id: this.generateId(textContent),
              element: articleEl,
              textContent,
              htmlContent: this.includeHtml ? articleEl.innerHTML : undefined,
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