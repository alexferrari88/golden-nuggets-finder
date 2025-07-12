import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TwitterExtractor } from '../../extractors/twitter';
import { SITE_SELECTORS } from '../../constants';

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: 'https://twitter.com/user/status/123456789'
  },
  writable: true
});

describe('TwitterExtractor', () => {
  let extractor: TwitterExtractor;

  beforeEach(() => {
    extractor = new TwitterExtractor(false);
    // Reset DOM
    document.body.innerHTML = '';
    document.title = 'Test Twitter Page';
    
    // Mock DOM APIs for visibility checking
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      width: 100, height: 50, top: 0, left: 0, right: 100, bottom: 50, x: 0, y: 0, toJSON: () => {}
    }));
    Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
      get() { return document.body; }, configurable: true
    });
    window.getComputedStyle = vi.fn(() => ({
      display: 'block', visibility: 'visible'
    } as CSSStyleDeclaration));
  });

  describe('constructor', () => {
    it('should initialize with includeHtml option', () => {
      const extractorWithHtml = new TwitterExtractor(true);
      const extractorWithoutHtml = new TwitterExtractor(false);
      
      expect(extractorWithHtml).toBeInstanceOf(TwitterExtractor);
      expect(extractorWithoutHtml).toBeInstanceOf(TwitterExtractor);
    });
  });

  describe('extract', () => {
    it('should extract basic page information', async () => {
      document.title = 'Twitter Post';
      
      const result = await extractor.extract();
      
      expect(result.pageURL).toBe('https://twitter.com/user/status/123456789');
      expect(result.title).toBe('Twitter Post');
      expect(result.items).toEqual([]);
    });

    it('should use fallback title when document.title is empty', async () => {
      document.title = '';
      
      const result = await extractor.extract();
      
      expect(result.title).toBe('Twitter/X');
    });

    it('should extract tweets using article[data-testid="tweet"] selector', async () => {
      document.body.innerHTML = `
        <article data-testid="tweet">
          <div data-testid="tweetText">
            <span>This is a tweet with enough content to be extracted.</span>
          </div>
        </article>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].type).toBe('post');
      expect(result.items[0].textContent).toContain('This is a tweet');
      expect(result.items[0].selected).toBe(false);
    });

    it('should extract tweets using direct tweetText selector', async () => {
      document.body.innerHTML = `
        <div data-testid="tweetText">
          <span>Direct tweet text content that should be extracted.</span>
        </div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].textContent).toContain('Direct tweet text content');
    });

    it('should extract tweets using article[role="article"] selector', async () => {
      document.body.innerHTML = `
        <article role="article">
          <div>
            <span>Tweet content in role article that should be extracted.</span>
          </div>
        </article>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].textContent).toContain('Tweet content in role article');
    });

    it('should extract tweets using .tweet-text class selector', async () => {
      document.body.innerHTML = `
        <div class="tweet-text">
          <span>Tweet with class-based selector that should be extracted.</span>
        </div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].textContent).toContain('Tweet with class-based selector');
    });

    it('should extract tweets using .twitter-tweet class selector', async () => {
      document.body.innerHTML = `
        <div class="twitter-tweet">
          <span>Embedded tweet content that should be extracted properly.</span>
        </div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].textContent).toContain('Embedded tweet content');
    });

    it('should prioritize selectors in order', async () => {
      document.body.innerHTML = `
        <article data-testid="tweet">
          <div data-testid="tweetText">
            <span>Primary tweet article content</span>
          </div>
        </article>
        <div data-testid="tweetText">
          <span>Secondary direct tweet text</span>
        </div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].textContent).toContain('Primary tweet article content');
    });

    it('should find tweet text within article elements', async () => {
      document.body.innerHTML = `
        <article data-testid="tweet">
          <div class="tweet-header">User info</div>
          <div data-testid="tweetText">
            <span>Actual tweet content that should be extracted.</span>
          </div>
          <div class="tweet-actions">Actions</div>
        </article>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].textContent).toContain('Actual tweet content');
    });

    it('should ignore tweets that are too short', async () => {
      document.body.innerHTML = `
        <article data-testid="tweet">
          <div data-testid="tweetText">
            <span>Hi</span>
          </div>
        </article>
        <article data-testid="tweet">
          <div data-testid="tweetText">
            <span>This tweet is long enough to be extracted.</span>
          </div>
        </article>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].textContent).toContain('This tweet is long enough');
    });

    it('should ignore hidden tweets', async () => {
      document.body.innerHTML = `
        <article data-testid="tweet" style="display: none;">
          <div data-testid="tweetText">
            <span>Hidden tweet that should not be extracted.</span>
          </div>
        </article>
        <article data-testid="tweet">
          <div data-testid="tweetText">
            <span>Visible tweet that should be extracted.</span>
          </div>
        </article>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].textContent).toContain('Visible tweet');
    });

    it('should fall back to general article extraction when no specific tweets found', async () => {
      document.body.innerHTML = `
        <article>
          <div>
            <p>This is article content that should be extracted as fallback when no specific tweet selectors match.</p>
          </div>
        </article>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].textContent).toContain('This is article content');
    });

    it('should filter fallback articles by length (20-2000 chars)', async () => {
      document.body.innerHTML = `
        <article>
          <div>Short content</div>
        </article>
        <article>
          <div>${'Very long content that exceeds the maximum length limit. '.repeat(100)}</div>
        </article>
        <article>
          <div>This article has the right length to be extracted as fallback content.</div>
        </article>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].textContent).toContain('This article has the right length');
    });

    it('should extract multiple tweets', async () => {
      document.body.innerHTML = `
        <article data-testid="tweet">
          <div data-testid="tweetText">
            <span>First tweet content that should be extracted.</span>
          </div>
        </article>
        <article data-testid="tweet">
          <div data-testid="tweetText">
            <span>Second tweet content that should also be extracted.</span>
          </div>
        </article>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(2);
      expect(result.items[0].textContent).toContain('First tweet content');
      expect(result.items[1].textContent).toContain('Second tweet content');
    });

    it('should include HTML content when includeHtml is true', async () => {
      const extractorWithHtml = new TwitterExtractor(true);
      
      document.body.innerHTML = `
        <article data-testid="tweet">
          <div data-testid="tweetText">
            <span>Tweet with <a href="#">hashtags</a> and <strong>formatting</strong>.</span>
          </div>
        </article>
      `;
      
      const result = await extractorWithHtml.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].htmlContent).toContain('<a href="#">hashtags</a>');
      expect(result.items[0].htmlContent).toContain('<strong>formatting</strong>');
    });

    it('should not include HTML content when includeHtml is false', async () => {
      document.body.innerHTML = `
        <article data-testid="tweet">
          <div data-testid="tweetText">
            <span>Tweet with <a href="#">hashtags</a> and <strong>formatting</strong>.</span>
          </div>
        </article>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].htmlContent).toBeUndefined();
    });

    it('should generate unique IDs for different tweets', async () => {
      document.body.innerHTML = `
        <article data-testid="tweet">
          <div data-testid="tweetText">
            <span>First unique tweet content.</span>
          </div>
        </article>
        <article data-testid="tweet">
          <div data-testid="tweetText">
            <span>Second unique tweet content.</span>
          </div>
        </article>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(2);
      expect(result.items[0].id).not.toBe(result.items[1].id);
      expect(result.items[0].id).toBeTruthy();
      expect(result.items[1].id).toBeTruthy();
    });

    it('should handle complex nested Twitter structures', async () => {
      document.body.innerHTML = `
        <article data-testid="tweet">
          <div class="tweet-header">
            <div class="user-info">@username</div>
            <div class="timestamp">2h</div>
          </div>
          <div data-testid="tweetText">
            <span>Main tweet content with </span>
            <a href="#">@mentions</a>
            <span> and </span>
            <a href="#">#hashtags</a>
            <span> that should all be extracted.</span>
          </div>
          <div class="tweet-actions">
            <button>Reply</button>
            <button>Retweet</button>
            <button>Like</button>
          </div>
        </article>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].textContent).toContain('Main tweet content');
      expect(result.items[0].textContent).toContain('@mentions');
      expect(result.items[0].textContent).toContain('#hashtags');
    });

    it('should handle empty Twitter page gracefully', async () => {
      document.body.innerHTML = `
        <nav class="twitter-nav">Navigation</nav>
        <aside class="sidebar">Sidebar content</aside>
        <footer>Footer</footer>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(0);
      expect(result.pageURL).toBe('https://twitter.com/user/status/123456789');
      expect(result.title).toBe('Test Twitter Page');
    });

    it('should prefer specific tweet selectors over fallback', async () => {
      document.body.innerHTML = `
        <article data-testid="tweet">
          <div data-testid="tweetText">
            <span>Specific tweet content</span>
          </div>
        </article>
        <article>
          <div>Fallback article content that should not be extracted when specific tweets exist.</div>
        </article>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].textContent).toContain('Specific tweet content');
    });
  });
});