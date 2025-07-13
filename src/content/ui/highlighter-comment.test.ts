import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Highlighter } from './highlighter';
import { GoldenNugget } from '../../shared/types';

describe('Highlighter - Comment Highlighting', () => {
  let highlighter: Highlighter;

  const createMockNugget = (content: string, type: 'tool' | 'media' | 'explanation' | 'analogy' | 'model' = 'explanation'): GoldenNugget => ({
    type,
    content,
    synthesis: 'Test synthesis'
  });

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('Site Detection', () => {
    it('should detect Twitter as threaded site', () => {
      Object.defineProperty(window, 'location', {
        value: { href: 'https://twitter.com/user/status/123' },
        writable: true
      });
      const twitterHighlighter = new Highlighter();
      expect(twitterHighlighter['siteType']).toBe('twitter');
      expect(twitterHighlighter['isThreadedSite']()).toBe(true);
    });

    it('should detect Reddit as threaded site', () => {
      Object.defineProperty(window, 'location', {
        value: { href: 'https://reddit.com/r/programming' },
        writable: true
      });
      const redditHighlighter = new Highlighter();
      expect(redditHighlighter['siteType']).toBe('reddit');
      expect(redditHighlighter['isThreadedSite']()).toBe(true);
    });

    it('should detect Hacker News as threaded site', () => {
      Object.defineProperty(window, 'location', {
        value: { href: 'https://news.ycombinator.com/item?id=123' },
        writable: true
      });
      const hnHighlighter = new Highlighter();
      expect(hnHighlighter['siteType']).toBe('hackernews');
      expect(hnHighlighter['isThreadedSite']()).toBe(true);
    });

    it('should detect generic sites correctly', () => {
      Object.defineProperty(window, 'location', {
        value: { href: 'https://example.com/article' },
        writable: true
      });
      const genericHighlighter = new Highlighter();
      expect(genericHighlighter['siteType']).toBe('generic');
      expect(genericHighlighter['isThreadedSite']()).toBe(false);
    });

    it('should detect X.com as Twitter', () => {
      Object.defineProperty(window, 'location', {
        value: { href: 'https://x.com/user/status/123' },
        writable: true
      });
      const xHighlighter = new Highlighter();
      expect(xHighlighter['siteType']).toBe('twitter');
    });
  });

  describe('Comment Container Highlighting', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'location', {
        value: { href: 'https://reddit.com/r/test' },
        writable: true
      });
      highlighter = new Highlighter();
    });

    it('should highlight comment container on Reddit', async () => {
      const nugget = createMockNugget('test comment content', 'tool');
      document.body.innerHTML = `
        <div slot="comment">This is test comment content that should be highlighted</div>
        <div slot="comment">This is another comment</div>
      `;

      const result = await highlighter.highlightNugget(nugget);
      
      expect(result).toBe(true);
      const commentHighlight = document.querySelector('.nugget-comment-highlight');
      expect(commentHighlight).toBeTruthy();
      expect(commentHighlight?.dataset.nuggetType).toBe('tool');
    });

    it('should add corner indicator to highlighted comment', async () => {
      const nugget = createMockNugget('test comment content', 'analogy');
      document.body.innerHTML = `
        <div slot="comment">This is test comment content that should be highlighted</div>
      `;

      await highlighter.highlightNugget(nugget);
      
      const cornerIndicator = document.querySelector('.nugget-corner-indicator');
      expect(cornerIndicator).toBeTruthy();
      expect(cornerIndicator?.textContent).toBe('[analogy]');
    });

    it('should apply site-specific styling to Reddit comments', async () => {
      const nugget = createMockNugget('test comment content');
      document.body.innerHTML = `
        <div slot="comment">This is test comment content that should be highlighted</div>
      `;

      await highlighter.highlightNugget(nugget);
      
      const commentHighlight = document.querySelector('.nugget-comment-highlight') as HTMLElement;
      expect(commentHighlight.style.borderLeft).toContain('4px solid rgba(255, 215, 0, 0.8)');
      expect(commentHighlight.style.background).toContain('rgba(255, 215, 0, 0.02)');
      expect(commentHighlight.style.borderRadius).toContain('2px');
    });

    it('should apply hover effects to comment highlights', async () => {
      const nugget = createMockNugget('test comment content');
      document.body.innerHTML = `
        <div slot="comment">This is test comment content that should be highlighted</div>
      `;

      await highlighter.highlightNugget(nugget);
      
      const commentHighlight = document.querySelector('.nugget-comment-highlight') as HTMLElement;
      
      // Simulate mouseenter
      const mouseEnterEvent = new MouseEvent('mouseenter');
      commentHighlight.dispatchEvent(mouseEnterEvent);
      
      // Check hover styles are applied (consistent 4px width to prevent movement)
      expect(commentHighlight.style.borderLeft).toContain('4px solid rgba(255, 215, 0, 0.9)');
    });

    it('should fallback to text highlighting if comment detection fails', async () => {
      const nugget = createMockNugget('text not in any comment');
      document.body.innerHTML = `
        <div slot="comment">Some other content</div>
        <p>This paragraph contains text not in any comment</p>
      `;

      const result = await highlighter.highlightNugget(nugget);
      
      expect(result).toBe(true);
      const textHighlight = document.querySelector('.nugget-highlight');
      expect(textHighlight).toBeTruthy();
      expect(document.querySelector('.nugget-comment-highlight')).toBeFalsy();
    });

    it('should skip already highlighted comments', async () => {
      const nugget1 = createMockNugget('test comment content', 'tool');
      const nugget2 = createMockNugget('test comment content', 'explanation');
      
      document.body.innerHTML = `
        <div slot="comment">This is test comment content that should be highlighted</div>
      `;

      // Highlight first nugget
      await highlighter.highlightNugget(nugget1);
      expect(document.querySelectorAll('.nugget-comment-highlight')).toHaveLength(1);
      
      // Try to highlight the same comment again
      await highlighter.highlightNugget(nugget2);
      expect(document.querySelectorAll('.nugget-comment-highlight')).toHaveLength(1);
    });
  });

  describe('Comment Highlighting on Different Sites', () => {
    it('should use Twitter-specific selectors and styling', async () => {
      Object.defineProperty(window, 'location', {
        value: { href: 'https://twitter.com/user/status/123' },
        writable: true
      });
      highlighter = new Highlighter();

      const nugget = createMockNugget('tweet content here');
      document.body.innerHTML = `
        <article data-testid="tweet">
          <div data-testid="tweetText">This tweet contains tweet content here</div>
        </article>
      `;

      const result = await highlighter.highlightNugget(nugget);
      
      expect(result).toBe(true);
      const commentHighlight = document.querySelector('.nugget-comment-highlight') as HTMLElement;
      expect(commentHighlight.style.boxShadow).toContain('rgba(255, 215, 0, 0.1)');
    });

    it('should use Hacker News-specific selectors', async () => {
      Object.defineProperty(window, 'location', {
        value: { href: 'https://news.ycombinator.com/item?id=123' },
        writable: true
      });
      highlighter = new Highlighter();

      const nugget = createMockNugget('hacker news comment');
      document.body.innerHTML = `
        <div class="comment-tree">
          <div class="comtr">
            <div class="commtext">This is a hacker news comment that should be found</div>
          </div>
        </div>
      `;

      const result = await highlighter.highlightNugget(nugget);
      
      expect(result).toBe(true);
      const commentHighlight = document.querySelector('.nugget-comment-highlight') as HTMLElement;
      expect(commentHighlight.style.background).toContain('rgba(255, 215, 0, 0.015)');
      // Check that border is set (using setProperty with important)
      expect(commentHighlight.style.borderLeft).toContain('4px solid rgba(255, 215, 0, 0.8)');
      // Check that Hacker News specific styling was applied (border and background work)
      // Note: setProperty with 'important' may not be testable in jsdom the same way
      // The important thing is that the logic path worked and the element was found and styled
      expect(highlighter['siteType']).toBe('hackernews');
      expect(commentHighlight.classList.contains('comtr')).toBe(true);
    });
  });

  describe('Enhanced Scroll Behavior', () => {
    it('should add comment glow effect when scrolling to comment highlight', async () => {
      Object.defineProperty(window, 'location', {
        value: { href: 'https://reddit.com/r/test' },
        writable: true
      });
      highlighter = new Highlighter();

      const nugget = createMockNugget('test comment content');
      document.body.innerHTML = `
        <div slot="comment">This is test comment content that should be highlighted</div>
      `;

      await highlighter.highlightNugget(nugget);
      
      const commentHighlight = document.querySelector('.nugget-comment-highlight') as HTMLElement;
      
      // Mock scrollIntoView
      commentHighlight.scrollIntoView = vi.fn();
      
      highlighter.scrollToHighlight(nugget);
      
      // Check that glow effect is applied (still uses 6px for temporary glow)
      expect(commentHighlight.style.borderLeft).toContain('6px solid rgba(255, 215, 0, 1)');
      expect(commentHighlight.style.boxShadow).toContain('rgba(255, 215, 0, 0.3)');
    });

    it('should add text glow effect when scrolling to text highlight', async () => {
      Object.defineProperty(window, 'location', {
        value: { href: 'https://example.com' },
        writable: true
      });
      highlighter = new Highlighter();

      const nugget = createMockNugget('test content');
      document.body.innerHTML = '<p>This is test content for highlighting</p>';

      await highlighter.highlightNugget(nugget);
      
      const textHighlight = document.querySelector('.nugget-highlight') as HTMLElement;
      
      // Mock scrollIntoView
      textHighlight.scrollIntoView = vi.fn();
      
      highlighter.scrollToHighlight(nugget);
      
      // Check that text glow effect is applied
      expect(textHighlight.style.boxShadow).toContain('3px');
    });
  });

  describe('Clear Comment Highlights', () => {
    it('should remove comment highlighting styles and indicators', async () => {
      Object.defineProperty(window, 'location', {
        value: { href: 'https://reddit.com/r/test' },
        writable: true
      });
      highlighter = new Highlighter();

      const nugget = createMockNugget('test comment content');
      document.body.innerHTML = `
        <div slot="comment">This is test comment content that should be highlighted</div>
      `;

      await highlighter.highlightNugget(nugget);
      
      // Verify highlighting is applied
      expect(document.querySelector('.nugget-comment-highlight')).toBeTruthy();
      expect(document.querySelector('.nugget-corner-indicator')).toBeTruthy();
      
      highlighter.clearHighlights();
      
      // Verify highlighting is removed
      expect(document.querySelector('.nugget-comment-highlight')).toBeFalsy();
      expect(document.querySelector('.nugget-corner-indicator')).toBeFalsy();
      
      // Verify styles are reset
      const element = document.querySelector('[slot="comment"]') as HTMLElement;
      expect(element.style.borderLeft).toBeFalsy();
      expect(element.style.background).toBeFalsy();
    });

    it('should handle mixed text and comment highlights', async () => {
      Object.defineProperty(window, 'location', {
        value: { href: 'https://reddit.com/r/test' },
        writable: true
      });
      highlighter = new Highlighter();

      const commentNugget = createMockNugget('comment content');
      const textNugget = createMockNugget('text content');
      
      document.body.innerHTML = `
        <div slot="comment">This has comment content</div>
        <p>This has text content</p>
      `;

      // Add comment highlight
      await highlighter.highlightNugget(commentNugget);
      
      // Switch to generic site for text highlighting
      Object.defineProperty(window, 'location', {
        value: { href: 'https://example.com' },
        writable: true
      });
      const genericHighlighter = new Highlighter();
      await genericHighlighter.highlightNugget(textNugget);
      
      // Both highlights should exist
      expect(document.querySelector('.nugget-comment-highlight')).toBeTruthy();
      expect(document.querySelector('.nugget-highlight')).toBeTruthy();
      
      // Clear all highlights
      highlighter.clearHighlights();
      genericHighlighter.clearHighlights();
      
      // All highlights should be removed
      expect(document.querySelector('.nugget-comment-highlight')).toBeFalsy();
      expect(document.querySelector('.nugget-highlight')).toBeFalsy();
    });
  });

  describe('Corner Indicator Interactions', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'location', {
        value: { href: 'https://reddit.com/r/test' },
        writable: true
      });
      highlighter = new Highlighter();
    });

    it('should show synthesis popup when corner indicator is clicked', async () => {
      const nugget = createMockNugget('test comment content', 'tool');
      document.body.innerHTML = `
        <div slot="comment">This is test comment content that should be highlighted</div>
      `;

      await highlighter.highlightNugget(nugget);
      
      const indicator = document.querySelector('.nugget-corner-indicator') as HTMLElement;
      indicator.click();

      const popup = document.querySelector('.nugget-synthesis-popup');
      expect(popup).toBeTruthy();
      expect(popup?.textContent).toContain('Test synthesis');
    });

    it('should apply hover effects to corner indicator', async () => {
      const nugget = createMockNugget('test comment content');
      document.body.innerHTML = `
        <div slot="comment">This is test comment content that should be highlighted</div>
      `;

      await highlighter.highlightNugget(nugget);
      
      const indicator = document.querySelector('.nugget-corner-indicator') as HTMLElement;
      const originalBackground = indicator.style.background;
      
      // Trigger hover
      const mouseEnterEvent = new MouseEvent('mouseenter');
      indicator.dispatchEvent(mouseEnterEvent);
      
      // Check hover styles applied
      expect(indicator.style.background).not.toBe(originalBackground);
    });
  });
});