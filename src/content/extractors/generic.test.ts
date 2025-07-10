import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GenericExtractor } from './generic';

// Mock Readability
const mockReadability = {
  parse: vi.fn()
};

// Mock the global Readability class
global.Readability = vi.fn().mockImplementation(() => mockReadability);

// Mock chrome.runtime.getURL
global.chrome = {
  runtime: {
    getURL: vi.fn().mockReturnValue('mocked-readability-url')
  }
} as any;

describe('GenericExtractor', () => {
  let extractor: GenericExtractor;

  beforeEach(() => {
    extractor = new GenericExtractor();
    document.body.innerHTML = '';
    vi.clearAllMocks();
    // Make sure window.Readability is available
    window.Readability = global.Readability;
  });

  describe('extractContent with Readability.js', () => {
    it('should extract content using Readability.js', async () => {
      const mockArticle = {
        title: 'Test Article',
        textContent: 'This is the main content of the article.',
        byline: 'By John Doe'
      };

      mockReadability.parse.mockReturnValue(mockArticle);

      const result = await extractor.extractContent();
      
      expect(result).toContain('[TITLE] Test Article');
      expect(result).toContain('[CONTENT] This is the main content of the article.');
      expect(result).toContain('[BYLINE] By John Doe');
    });

    it('should handle article with only title', async () => {
      const mockArticle = {
        title: 'Test Article',
        textContent: null,
        byline: null
      };

      mockReadability.parse.mockReturnValue(mockArticle);

      const result = await extractor.extractContent();
      
      expect(result).toContain('[TITLE] Test Article');
      expect(result).not.toContain('[CONTENT]');
      expect(result).not.toContain('[BYLINE]');
    });

    it('should handle article with only content', async () => {
      const mockArticle = {
        title: null,
        textContent: 'This is the main content of the article.',
        byline: null
      };

      mockReadability.parse.mockReturnValue(mockArticle);

      const result = await extractor.extractContent();
      
      expect(result).not.toContain('[TITLE]');
      expect(result).toContain('[CONTENT] This is the main content of the article.');
      expect(result).not.toContain('[BYLINE]');
    });

    it('should fall back when Readability.js fails', async () => {
      mockReadability.parse.mockImplementation(() => {
        throw new Error('Readability failed');
      });

      document.body.innerHTML = `
        <main style="width: 100px; height: 100px;">
          <h1>Fallback Title</h1>
          <p>Fallback content for testing.</p>
        </main>
      `;

      const result = await extractor.extractContent();
      
      expect(result).toContain('Fallback Title');
      expect(result).toContain('Fallback content for testing.');
    });

    it('should fall back when Readability.js returns null', async () => {
      mockReadability.parse.mockReturnValue(null);

      document.body.innerHTML = `
        <main style="width: 100px; height: 100px;">
          <h1>Fallback Title</h1>
          <p>Fallback content for testing.</p>
        </main>
      `;

      const result = await extractor.extractContent();
      
      expect(result).toContain('Fallback Title');
      expect(result).toContain('Fallback content for testing.');
    });

    it('should fall back when Readability.js returns empty content', async () => {
      mockReadability.parse.mockReturnValue({
        title: null,
        textContent: null,
        byline: null
      });

      document.body.innerHTML = `
        <main style="width: 100px; height: 100px;">
          <h1>Fallback Title</h1>
          <p>Fallback content for testing.</p>
        </main>
      `;

      const result = await extractor.extractContent();
      
      expect(result).toContain('Fallback Title');
      expect(result).toContain('Fallback content for testing.');
    });
  });

  describe('fallback extraction', () => {
    it('should extract content from main element', async () => {
      mockReadability.parse.mockReturnValue(null);

      document.body.innerHTML = `
        <main style="width: 100px; height: 100px;">
          <h1>Main Title</h1>
          <p>Main content for testing.</p>
        </main>
      `;

      const result = await extractor.extractContent();
      
      expect(result).toContain('Main Title');
      expect(result).toContain('Main content for testing.');
    });

    it('should extract content from article element', async () => {
      mockReadability.parse.mockReturnValue(null);

      document.body.innerHTML = `
        <article style="width: 100px; height: 100px;">
          <h1>Article Title</h1>
          <p>Article content for testing.</p>
        </article>
      `;

      const result = await extractor.extractContent();
      
      expect(result).toContain('Article Title');
      expect(result).toContain('Article content for testing.');
    });

    it('should try multiple selectors in order', async () => {
      mockReadability.parse.mockReturnValue(null);

      document.body.innerHTML = `
        <div class="content" style="width: 100px; height: 100px;">
          <h1>Content Title</h1>
          <p>Content for testing.</p>
        </div>
      `;

      const result = await extractor.extractContent();
      
      expect(result).toContain('Content Title');
      expect(result).toContain('Content for testing.');
    });

    it('should remove unwanted elements', async () => {
      mockReadability.parse.mockReturnValue(null);

      document.body.innerHTML = `
        <main style="width: 100px; height: 100px;">
          <h1>Main Title</h1>
          <header>Header content</header>
          <nav>Navigation content</nav>
          <p>Main content for testing.</p>
          <footer>Footer content</footer>
          <aside>Sidebar content</aside>
          <div class="advertisement">Ad content</div>
        </main>
      `;

      const result = await extractor.extractContent();
      
      expect(result).toContain('Main Title');
      expect(result).toContain('Main content for testing.');
      expect(result).not.toContain('Header content');
      expect(result).not.toContain('Navigation content');
      expect(result).not.toContain('Footer content');
      expect(result).not.toContain('Sidebar content');
      expect(result).not.toContain('Ad content');
    });

    it('should fall back to body if no main element found', async () => {
      mockReadability.parse.mockReturnValue(null);

      document.body.innerHTML = `
        <div>
          <h1>Body Title</h1>
          <p>Body content for testing.</p>
        </div>
      `;

      const result = await extractor.extractContent();
      
      expect(result).toContain('Body Title');
      expect(result).toContain('Body content for testing.');
    });

    it('should skip invisible elements', async () => {
      mockReadability.parse.mockReturnValue(null);

      document.body.innerHTML = `
        <main style="display: none;">
          <h1>Hidden Title</h1>
          <p>Hidden content.</p>
        </main>
        <div class="content" style="width: 100px; height: 100px;">
          <h1>Visible Title</h1>
          <p>Visible content for testing.</p>
        </div>
      `;

      // Mock isElementVisible to return false for display: none elements
      const originalIsElementVisible = extractor['isElementVisible'];
      extractor['isElementVisible'] = vi.fn().mockImplementation((element) => {
        const style = window.getComputedStyle(element);
        return style.display !== 'none';
      });

      const result = await extractor.extractContent();
      
      expect(result).not.toContain('Hidden Title');
      expect(result).not.toContain('Hidden content');
      expect(result).toContain('Visible Title');
      expect(result).toContain('Visible content for testing.');
      
      // Restore original method
      extractor['isElementVisible'] = originalIsElementVisible;
    });

    it('should use title and meta description as last resort', async () => {
      mockReadability.parse.mockReturnValue(null);

      // Clear document body to force fallback to title/meta
      document.body.innerHTML = '';
      
      // Set title and meta description
      Object.defineProperty(document, 'title', {
        value: 'Page Title',
        writable: true
      });
      
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Page description for testing';
      document.head.appendChild(meta);

      const result = await extractor.extractContent();
      
      expect(result).toContain('[TITLE] Page Title');
      expect(result).toContain('[DESCRIPTION] Page description for testing');
      
      // Cleanup
      document.head.removeChild(meta);
    });

    it('should handle missing meta description', async () => {
      mockReadability.parse.mockReturnValue(null);

      // Clear document body to force fallback to title/meta
      document.body.innerHTML = '';
      
      // Set title but no meta description
      Object.defineProperty(document, 'title', {
        value: 'Page Title',
        writable: true
      });

      const result = await extractor.extractContent();
      
      expect(result).toContain('[TITLE] Page Title');
      expect(result).toContain('[DESCRIPTION]');
    });

    it('should return empty string when no content found', async () => {
      mockReadability.parse.mockReturnValue(null);

      document.title = '';
      document.head.innerHTML = '';
      document.body.innerHTML = '';

      const result = await extractor.extractContent();
      
      expect(result).toBe('');
    });

    it('should clean text content', async () => {
      mockReadability.parse.mockReturnValue(null);

      document.body.innerHTML = `
        <main style="width: 100px; height: 100px;">
          <p>Content with    multiple   spaces
          and  line breaks</p>
        </main>
      `;

      const result = await extractor.extractContent();
      
      expect(result).toContain('Content with multiple spaces and line breaks');
    });

    it('should handle mixed content with scripts and styles', async () => {
      mockReadability.parse.mockReturnValue(null);

      document.body.innerHTML = `
        <main style="width: 100px; height: 100px;">
          <p>Content
          <script>console.log("test");</script>
          <style>.test { color: red; }</style>
          without scripts</p>
        </main>
      `;

      const result = await extractor.extractContent();
      
      expect(result).toContain('Content without scripts');
      expect(result).not.toContain('console.log');
      expect(result).not.toContain('.test');
    });
  });
});