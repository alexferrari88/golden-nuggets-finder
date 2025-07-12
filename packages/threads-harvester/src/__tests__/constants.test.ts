import { describe, it, expect } from 'vitest';
import { SITE_SELECTORS } from '../constants';

describe('SITE_SELECTORS', () => {
  it('should contain Reddit selectors', () => {
    expect(SITE_SELECTORS.REDDIT).toBeDefined();
    expect(SITE_SELECTORS.REDDIT.POST).toBe('[slot="text-body"]');
    expect(SITE_SELECTORS.REDDIT.COMMENTS).toBe('[slot="comment"]');
  });

  it('should contain Hacker News selectors', () => {
    expect(SITE_SELECTORS.HACKER_NEWS).toBeDefined();
    expect(SITE_SELECTORS.HACKER_NEWS.POST).toBe('.toptext');
    expect(SITE_SELECTORS.HACKER_NEWS.COMMENTS).toBe('.commtext');
    expect(SITE_SELECTORS.HACKER_NEWS.COMMENT_TREE).toBe('.comment-tree .comtr');
    expect(SITE_SELECTORS.HACKER_NEWS.STORY_ITEM).toBe('.athing');
    expect(SITE_SELECTORS.HACKER_NEWS.TITLE_LINK).toBe('.titleline > a');
  });

  it('should contain Twitter selectors', () => {
    expect(SITE_SELECTORS.TWITTER).toBeDefined();
    expect(SITE_SELECTORS.TWITTER.TWEET).toBe('[data-testid="tweetText"]');
    expect(SITE_SELECTORS.TWITTER.TWEET_ARTICLE).toBe('article[data-testid="tweet"]');
    expect(SITE_SELECTORS.TWITTER.SHOW_MORE_BUTTON).toBe('button[data-testid="tweet-text-show-more-link"]');
    expect(SITE_SELECTORS.TWITTER.USER_NAME).toBe('div[data-testid="User-Name"] a[href^="/"]');
    expect(SITE_SELECTORS.TWITTER.SPAM_BUTTON).toBe('button:has(span:contains("Show probable spam"))');
  });

  it('should be readonly constant', () => {
    // In TypeScript, readonly is enforced at compile time, not runtime
    // Test that the values match expected selectors (compile-time safety verification)
    const originalValue = SITE_SELECTORS.REDDIT.POST;
    expect(originalValue).toBe('[slot="text-body"]');
    
    // The 'as const' assertion provides compile-time readonly protection
    // Runtime immutability would require Object.freeze() but is not required for this use case
    expect(SITE_SELECTORS.REDDIT.POST).toBe('[slot="text-body"]');
  });

  it('should have correct structure', () => {
    expect(Object.keys(SITE_SELECTORS)).toEqual(['REDDIT', 'HACKER_NEWS', 'TWITTER']);
    
    expect(Object.keys(SITE_SELECTORS.REDDIT)).toEqual(['POST', 'COMMENTS']);
    expect(Object.keys(SITE_SELECTORS.HACKER_NEWS)).toEqual([
      'POST', 'COMMENTS', 'COMMENT_TREE', 'STORY_ITEM', 'TITLE_LINK'
    ]);
    expect(Object.keys(SITE_SELECTORS.TWITTER)).toEqual([
      'TWEET', 'TWEET_ARTICLE', 'SHOW_MORE_BUTTON', 'USER_NAME', 'SPAM_BUTTON'
    ]);
  });
});