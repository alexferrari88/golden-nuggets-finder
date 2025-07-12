import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RedditExtractor } from '../../extractors/reddit';
import { SITE_SELECTORS } from '../../constants';

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: 'https://www.reddit.com/r/programming/comments/abc123/test_post/'
  },
  writable: true
});

describe('RedditExtractor', () => {
  let extractor: RedditExtractor;

  beforeEach(() => {
    extractor = new RedditExtractor(false);
    // Reset DOM
    document.body.innerHTML = '';
    document.title = 'Test Reddit Page';
    
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
      const extractorWithHtml = new RedditExtractor(true);
      const extractorWithoutHtml = new RedditExtractor(false);
      
      expect(extractorWithHtml).toBeInstanceOf(RedditExtractor);
      expect(extractorWithoutHtml).toBeInstanceOf(RedditExtractor);
    });
  });

  describe('extract', () => {
    it('should extract basic page information', async () => {
      document.title = 'Reddit Post Discussion';
      
      const result = await extractor.extract();
      
      expect(result.pageURL).toBe('https://www.reddit.com/r/programming/comments/abc123/test_post/');
      expect(result.title).toBe('Reddit Post Discussion');
      expect(result.items).toEqual([]);
    });

    it('should use fallback title when document.title is empty', async () => {
      document.title = '';
      
      const result = await extractor.extract();
      
      expect(result.title).toBe('Reddit');
    });

    it('should extract comments using slot="comment" selector', async () => {
      document.body.innerHTML = `
        <div slot="comment">
          <p>This is a Reddit comment with enough content to be extracted successfully.</p>
        </div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].type).toBe('comment');
      expect(result.items[0].textContent).toContain('This is a Reddit comment');
      expect(result.items[0].selected).toBe(false);
    });

    it('should extract posts using slot="text-body" selector', async () => {
      document.body.innerHTML = `
        <div slot="text-body">
          <p>This is a Reddit post content that should be extracted as a post type.</p>
        </div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].type).toBe('post');
      expect(result.items[0].textContent).toContain('This is a Reddit post content');
    });

    it('should extract both comments and posts', async () => {
      document.body.innerHTML = `
        <div slot="comment">
          <p>This is a comment that should be extracted with enough content.</p>
        </div>
        <div slot="text-body">
          <p>This is a post body that should also be extracted with enough content.</p>
        </div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(2);
      
      const commentItem = result.items.find(item => item.type === 'comment');
      const postItem = result.items.find(item => item.type === 'post');
      
      expect(commentItem).toBeDefined();
      expect(postItem).toBeDefined();
      expect(commentItem!.textContent).toContain('This is a comment');
      expect(postItem!.textContent).toContain('This is a post body');
    });

    it('should extract multiple comments', async () => {
      document.body.innerHTML = `
        <div slot="comment">
          <p>First comment with sufficient content for extraction.</p>
        </div>
        <div slot="comment">
          <p>Second comment with different content but also long enough.</p>
        </div>
        <div slot="comment">
          <p>Third comment with unique content that meets the length requirement.</p>
        </div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(3);
      expect(result.items[0].textContent).toContain('First comment');
      expect(result.items[1].textContent).toContain('Second comment');
      expect(result.items[2].textContent).toContain('Third comment');
      expect(result.items.every(item => item.type === 'comment')).toBe(true);
    });

    it('should extract multiple posts', async () => {
      document.body.innerHTML = `
        <div slot="text-body">
          <p>First post content with enough text to be extracted.</p>
        </div>
        <div slot="text-body">
          <p>Second post content with different but sufficient text.</p>
        </div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(2);
      expect(result.items[0].textContent).toContain('First post content');
      expect(result.items[1].textContent).toContain('Second post content');
      expect(result.items.every(item => item.type === 'post')).toBe(true);
    });

    it('should ignore content that is too short', async () => {
      document.body.innerHTML = `
        <div slot="comment">Short</div>
        <div slot="text-body">Also short</div>
        <div slot="comment">
          <p>This comment has enough content to be extracted successfully.</p>
        </div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].textContent).toContain('This comment has enough content');
    });

    it('should ignore hidden elements', async () => {
      document.body.innerHTML = `
        <div slot="comment" style="display: none;">
          <p>Hidden comment that should not be extracted even with enough content.</p>
        </div>
        <div slot="comment">
          <p>Visible comment that should be extracted with sufficient content.</p>
        </div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].textContent).toContain('Visible comment');
    });

    it('should include HTML content when includeHtml is true', async () => {
      const extractorWithHtml = new RedditExtractor(true);
      
      document.body.innerHTML = `
        <div slot="comment">
          <p>Comment with <strong>bold</strong> and <em>italic</em> formatting.</p>
        </div>
      `;
      
      const result = await extractorWithHtml.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].htmlContent).toContain('<strong>bold</strong>');
      expect(result.items[0].htmlContent).toContain('<em>italic</em>');
    });

    it('should not include HTML content when includeHtml is false', async () => {
      document.body.innerHTML = `
        <div slot="comment">
          <p>Comment with <strong>bold</strong> and <em>italic</em> formatting.</p>
        </div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].htmlContent).toBeUndefined();
    });

    it('should generate unique IDs for different items', async () => {
      document.body.innerHTML = `
        <div slot="comment">
          <p>First unique comment content that is long enough.</p>
        </div>
        <div slot="comment">
          <p>Second unique comment content that is also long enough.</p>
        </div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(2);
      expect(result.items[0].id).not.toBe(result.items[1].id);
      expect(result.items[0].id).toBeTruthy();
      expect(result.items[1].id).toBeTruthy();
    });

    it('should handle complex nested Reddit structures', async () => {
      document.body.innerHTML = `
        <div slot="comment">
          <div class="comment-content">
            <div class="user-info">
              <span class="username">user123</span>
              <span class="score">42 points</span>
            </div>
            <div class="comment-body">
              <p>This is the actual comment text that should be extracted properly.</p>
              <blockquote>Quoted text within the comment</blockquote>
            </div>
          </div>
        </div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].textContent).toContain('user123');
      expect(result.items[0].textContent).toContain('42 points');
      expect(result.items[0].textContent).toContain('This is the actual comment text');
      expect(result.items[0].textContent).toContain('Quoted text within the comment');
    });

    it('should handle mixed content order correctly', async () => {
      document.body.innerHTML = `
        <div slot="text-body">
          <p>Post content that appears first in the DOM structure.</p>
        </div>
        <div slot="comment">
          <p>Comment content that appears second in the DOM structure.</p>
        </div>
        <div slot="text-body">
          <p>Another post that appears third in the DOM structure.</p>
        </div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(3);
      
      // Verify the order is preserved and types are correct
      expect(result.items[0].type).toBe('comment'); // Comments are processed first
      expect(result.items[1].type).toBe('post');    // Then posts are processed
      expect(result.items[2].type).toBe('post');
      
      expect(result.items[0].textContent).toContain('Comment content');
      expect(result.items[1].textContent).toContain('Post content that appears first');
      expect(result.items[2].textContent).toContain('Another post that appears third');
    });

    it('should handle empty Reddit page gracefully', async () => {
      document.body.innerHTML = `
        <div class="reddit-header">
          <h1>Reddit</h1>
        </div>
        <div class="sidebar">
          <p>Sidebar content</p>
        </div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(0);
      expect(result.pageURL).toBe('https://www.reddit.com/r/programming/comments/abc123/test_post/');
      expect(result.title).toBe('Test Reddit Page');
    });
  });
});