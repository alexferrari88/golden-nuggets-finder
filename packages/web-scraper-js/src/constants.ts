/**
 * CSS selectors for extracting content from various websites.
 * These selectors are used by the extractors to identify content elements.
 */
export const SITE_SELECTORS = {
  REDDIT: {
    POST: '[slot="text-body"]',
    COMMENTS: '[slot="comment"]'
  },
  HACKER_NEWS: {
    POST: '.toptext',
    COMMENTS: '.commtext',
    COMMENT_TREE: '.comment-tree .comtr',
    STORY_ITEM: '.athing',
    TITLE_LINK: '.titleline > a'
  },
  TWITTER: {
    TWEET: '[data-testid="tweetText"]',
    TWEET_ARTICLE: 'article[data-testid="tweet"]',
    SHOW_MORE_BUTTON: 'button[data-testid="tweet-text-show-more-link"]',
    USER_NAME: 'div[data-testid="User-Name"] a[href^="/"]',
    SPAM_BUTTON: 'button:has(span:contains("Show probable spam"))'
  }
} as const;