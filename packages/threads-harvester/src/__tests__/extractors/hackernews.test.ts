import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HackerNewsExtractor } from '../../extractors/hackernews';
import { SITE_SELECTORS } from '../../constants';

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: 'https://news.ycombinator.com/item?id=123'
  },
  writable: true
});

describe('HackerNewsExtractor', () => {
  let extractor: HackerNewsExtractor;

  beforeEach(() => {
    extractor = new HackerNewsExtractor(false);
    // Reset DOM
    document.body.innerHTML = '';
    document.title = 'Test HN Page';
    
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
      const extractorWithHtml = new HackerNewsExtractor(true);
      const extractorWithoutHtml = new HackerNewsExtractor(false);
      
      expect(extractorWithHtml).toBeInstanceOf(HackerNewsExtractor);
      expect(extractorWithoutHtml).toBeInstanceOf(HackerNewsExtractor);
    });
  });

  describe('extract', () => {
    it('should extract basic page information', async () => {
      document.title = 'Hacker News Discussion';
      
      const result = await extractor.extract();
      
      expect(result.pageURL).toBe('https://news.ycombinator.com/item?id=123');
      expect(result.title).toBe('Hacker News Discussion');
      expect(result.items).toEqual([]);
    });

    it('should use fallback title when document.title is empty', async () => {
      document.title = '';
      
      const result = await extractor.extract();
      
      expect(result.title).toBe('Hacker News');
    });

    it('should extract comments from comment tree structure', async () => {
      document.body.innerHTML = `
        <div class="comment-tree">
          <div class="comtr">
            <div class="commtext">
              <span>This is a comment with enough content to be extracted.</span>
            </div>
          </div>
        </div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].type).toBe('comment');
      expect(result.items[0].textContent).toContain('This is a comment');
      expect(result.items[0].selected).toBe(false);
      expect(result.items[0].element.classList.contains('comtr')).toBe(true);
    });

    it('should extract multiple comments', async () => {
      document.body.innerHTML = `
        <div class="comment-tree">
          <div class="comtr">
            <div class="commtext">First comment content that is long enough.</div>
          </div>
          <div class="comtr">
            <div class="commtext">Second comment content that is also long enough.</div>
          </div>
        </div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(2);
      expect(result.items[0].textContent).toContain('First comment content');
      expect(result.items[1].textContent).toContain('Second comment content');
      expect(result.items[0].type).toBe('comment');
      expect(result.items[1].type).toBe('comment');
    });

    it('should ignore comments that are too short', async () => {
      document.body.innerHTML = `
        <div class="comment-tree">
          <div class="comtr">
            <div class="commtext">Short</div>
          </div>
          <div class="comtr">
            <div class="commtext">This comment is long enough to be extracted.</div>
          </div>
        </div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].textContent).toContain('This comment is long enough');
    });

    it('should ignore hidden comments', async () => {
      document.body.innerHTML = `
        <div class="comment-tree">
          <div class="comtr">
            <div class="commtext" style="display: none;">Hidden comment content that would be long enough.</div>
          </div>
          <div class="comtr">
            <div class="commtext">Visible comment content that is long enough.</div>
          </div>
        </div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].textContent).toContain('Visible comment content');
    });

    it('should extract stories when no comments are found', async () => {
      document.body.innerHTML = `
        <div class="athing">
          <div class="titleline">
            <a href="https://example.com/story">An Interesting Story Title</a>
          </div>
        </div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].type).toBe('post');
      expect(result.items[0].textContent).toBe('An Interesting Story Title');
      expect(result.items[0].URL).toBe('https://example.com/story');
      expect(result.items[0].element.classList.contains('athing')).toBe(true);
    });

    it('should extract multiple stories', async () => {
      document.body.innerHTML = `
        <div class="athing">
          <div class="titleline">
            <a href="https://example.com/story1">First Story Title</a>
          </div>
        </div>
        <div class="athing">
          <div class="titleline">
            <a href="https://example.com/story2">Second Story Title</a>
          </div>
        </div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(2);
      expect(result.items[0].textContent).toBe('First Story Title');
      expect(result.items[1].textContent).toBe('Second Story Title');
      expect(result.items[0].URL).toBe('https://example.com/story1');
      expect(result.items[1].URL).toBe('https://example.com/story2');
    });

    it('should ignore hidden stories', async () => {
      document.body.innerHTML = `
        <div class="athing">
          <div class="titleline">
            <a href="https://example.com/story1" style="display: none;">Hidden Story</a>
          </div>
        </div>
        <div class="athing">
          <div class="titleline">
            <a href="https://example.com/story2">Visible Story</a>
          </div>
        </div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].textContent).toBe('Visible Story');
    });

    it('should prioritize comments over stories', async () => {
      document.body.innerHTML = `
        <div class="comment-tree">
          <div class="comtr">
            <div class="commtext">Comment content that is long enough.</div>
          </div>
        </div>
        <div class="athing">
          <div class="titleline">
            <a href="https://example.com/story">Story Title</a>
          </div>
        </div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].type).toBe('comment');
      expect(result.items[0].textContent).toContain('Comment content');
    });

    it('should include HTML content when includeHtml is true', async () => {
      const extractorWithHtml = new HackerNewsExtractor(true);
      
      document.body.innerHTML = `
        <div class="comment-tree">
          <div class="comtr">
            <div class="commtext">
              <p>Comment with <a href="#">link</a> and formatting.</p>
            </div>
          </div>
        </div>
      `;
      
      const result = await extractorWithHtml.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].htmlContent).toContain('<p>Comment with <a href="#">link</a>');
    });

    it('should not include HTML content when includeHtml is false', async () => {
      document.body.innerHTML = `
        <div class="comment-tree">
          <div class="comtr">
            <div class="commtext">
              <p>Comment with <a href="#">link</a> and formatting.</p>
            </div>
          </div>
        </div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].htmlContent).toBeUndefined();
    });

    it('should generate unique IDs for different items', async () => {
      document.body.innerHTML = `
        <div class="comment-tree">
          <div class="comtr">
            <div class="commtext">First comment content that is long enough.</div>
          </div>
          <div class="comtr">
            <div class="commtext">Second comment content that is different and long enough.</div>
          </div>
        </div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(2);
      expect(result.items[0].id).not.toBe(result.items[1].id);
      expect(result.items[0].id).toBeTruthy();
      expect(result.items[1].id).toBeTruthy();
    });

    it('should handle nested comment structures', async () => {
      document.body.innerHTML = `
        <div class="comment-tree">
          <div class="comtr">
            <div class="commtext">
              <div>
                <span>Nested comment content with multiple elements that is long enough.</span>
                <div>Additional nested content</div>
              </div>
            </div>
          </div>
        </div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].textContent).toContain('Nested comment content');
      expect(result.items[0].textContent).toContain('Additional nested content');
    });

    it('should handle mixed comments and stories scenario (fallback)', async () => {
      // Comments exist but are too short, should fall back to stories
      document.body.innerHTML = `
        <div class="comment-tree">
          <div class="comtr">
            <div class="commtext">Short</div>
          </div>
        </div>
        <div class="athing">
          <div class="titleline">
            <a href="https://example.com/story">Story Title</a>
          </div>
        </div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].type).toBe('post');
      expect(result.items[0].textContent).toBe('Story Title');
    });
  });
});