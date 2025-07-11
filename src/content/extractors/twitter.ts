import { ContentExtractor } from './base';
import { SITE_SELECTORS } from '../../shared/constants';

export class TwitterExtractor extends ContentExtractor {
  private readonly MAX_TWEETS = 100; // Limit to prevent performance issues
  private readonly EXPANSION_DELAY = 500; // Delay between tweet expansions in ms
  private readonly ORIGINAL_AUTHOR_HREF: string | null = null;

  async extractContent(): Promise<string> {
    const content: string[] = [];
    
    // First, identify the original author of the thread
    const originalAuthorHref = await this.identifyOriginalAuthor();
    if (!originalAuthorHref) {
      console.warn('Could not identify original thread author');
      return this.fallbackExtraction();
    }

    // Expand truncated tweets from the original author
    await this.expandAuthorTweets(originalAuthorHref);

    // Extract tweet content from the thread
    const tweets = await this.extractThreadTweets(originalAuthorHref);
    
    if (tweets.length === 0) {
      console.warn('No tweets found in thread');
      return this.fallbackExtraction();
    }

    // Format tweets for analysis
    tweets.forEach((tweet, index) => {
      content.push(`[TWEET ${index + 1}] ${tweet}`);
    });

    return content.join('\n\n');
  }

  private async identifyOriginalAuthor(): Promise<string | null> {
    // Find the first tweet on the page to identify the Original Poster (OP)
    const firstTweet = document.querySelector(SITE_SELECTORS.TWITTER.TWEET_ARTICLE);
    if (!firstTweet) {
      console.error('No tweets found on the page');
      return null;
    }

    // Extract the author's unique profile link from the first tweet
    const authorElement = firstTweet.querySelector(SITE_SELECTORS.TWITTER.USER_NAME);
    if (!authorElement) {
      console.error('Could not identify the original author');
      return null;
    }

    const authorHref = authorElement.getAttribute('href');
    if (!authorHref) {
      console.error('Could not get author href');
      return null;
    }

    console.log(`Original author identified: ${authorHref}`);
    return authorHref;
  }

  private async expandAuthorTweets(originalAuthorHref: string): Promise<void> {
    let expandedCount = 0;
    
    // Get all tweets currently on the page
    const allTweets = document.querySelectorAll(SITE_SELECTORS.TWITTER.TWEET_ARTICLE);
    
    for (const tweet of allTweets) {
      // Check if this tweet is by the original author
      const authorElement = tweet.querySelector(SITE_SELECTORS.TWITTER.USER_NAME);
      if (!authorElement) continue;

      const currentAuthorHref = authorElement.getAttribute('href');
      if (currentAuthorHref !== originalAuthorHref) continue;

      // Look for "Show more" button in this tweet
      const showMoreButton = tweet.querySelector(SITE_SELECTORS.TWITTER.SHOW_MORE_BUTTON);
      if (showMoreButton && this.isElementVisible(showMoreButton)) {
        console.log(`Expanding tweet by ${originalAuthorHref}`);
        (showMoreButton as HTMLElement).click();
        expandedCount++;
        
        // Add delay to allow content to load
        await this.sleep(this.EXPANSION_DELAY);
      }
    }

    if (expandedCount > 0) {
      console.log(`Expanded ${expandedCount} tweets`);
    }
  }

  private async extractThreadTweets(originalAuthorHref: string): Promise<string[]> {
    const tweets: string[] = [];
    let tweetCount = 0;

    // Get all tweets currently on the page
    const allTweets = document.querySelectorAll(SITE_SELECTORS.TWITTER.TWEET_ARTICLE);
    
    for (const tweet of allTweets) {
      // Stop if we've reached the max tweet limit
      if (tweetCount >= this.MAX_TWEETS) {
        console.log(`Stopped at max tweet limit: ${this.MAX_TWEETS}`);
        break;
      }

      // Check for spam button - this indicates end of thread
      if (this.hasSpamButton(tweet)) {
        console.log('Found spam button, stopping extraction');
        break;
      }

      // Check if this tweet is by the original author
      const authorElement = tweet.querySelector(SITE_SELECTORS.TWITTER.USER_NAME);
      if (!authorElement) continue;

      const currentAuthorHref = authorElement.getAttribute('href');
      if (currentAuthorHref !== originalAuthorHref) continue;

      // Extract tweet text
      const tweetTextElements = tweet.querySelectorAll(SITE_SELECTORS.TWITTER.TWEET);
      for (const textElement of tweetTextElements) {
        if (this.isElementVisible(textElement)) {
          const tweetText = this.extractTextFromElement(textElement);
          if (tweetText && tweetText.length > 10) { // Filter out very short tweets
            tweets.push(tweetText);
            tweetCount++;
            break; // Only take the first text element per tweet
          }
        }
      }
    }

    console.log(`Extracted ${tweets.length} tweets from thread`);
    return tweets;
  }

  private hasSpamButton(tweetElement: Element): boolean {
    // Look for the spam button in the current tweet and its vicinity
    // We check both the tweet itself and nearby elements
    const spamButton = tweetElement.querySelector(SITE_SELECTORS.TWITTER.SPAM_BUTTON);
    if (spamButton) {
      return true;
    }

    // Also check for text-based detection as a fallback
    const textContent = tweetElement.textContent || '';
    return textContent.includes('Show probable spam');
  }

  private fallbackExtraction(): string {
    // Simple fallback: extract all visible tweet text
    const content: string[] = [];
    const tweetElements = document.querySelectorAll(SITE_SELECTORS.TWITTER.TWEET);
    
    let count = 0;
    for (const element of tweetElements) {
      if (count >= 20) break; // Limit fallback extraction
      
      if (this.isElementVisible(element)) {
        const text = this.extractTextFromElement(element);
        if (text && text.length > 10) {
          content.push(`[TWEET ${count + 1}] ${text}`);
          count++;
        }
      }
    }

    return content.join('\n\n');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}