import { describe, it, expect, beforeEach } from 'vitest';
import { HackerNewsExtractor } from './hackernews';

describe('HackerNewsExtractor', () => {
  let extractor: HackerNewsExtractor;

  beforeEach(() => {
    extractor = new HackerNewsExtractor();
    document.body.innerHTML = '';
    
    // Mock isElementVisible to return true for elements with content and proper styling
    extractor['isElementVisible'] = vi.fn().mockImplementation((element) => {
      const hasContent = element.textContent && element.textContent.trim().length > 0;
      const style = element.style || {};
      const isVisible = style.display !== 'none' && style.visibility !== 'hidden';
      return hasContent && isVisible;
    });
  });

  describe('extractContent', () => {
    it('should extract post content', async () => {
      document.body.innerHTML = `
        <div class="toptext" style="width: 100px; height: 100px;">
          This is a Hacker News post content
        </div>
      `;

      const result = await extractor.extractContent();
      expect(result).toContain('[POST] This is a Hacker News post content');
    });

    it('should extract multiple posts', async () => {
      document.body.innerHTML = `
        <div class="toptext" style="width: 100px; height: 100px;">
          First post content
        </div>
        <div class="toptext" style="width: 100px; height: 100px;">
          Second post content
        </div>
      `;

      const result = await extractor.extractContent();
      expect(result).toContain('[POST] First post content');
      expect(result).toContain('[POST] Second post content');
    });

    it('should extract comments', async () => {
      document.body.innerHTML = `
        <div class="comment" style="width: 100px; height: 100px;">
          This is a comment with sufficient length to pass the filter test
        </div>
      `;

      const result = await extractor.extractContent();
      expect(result).toContain('[COMMENT 1] This is a comment with sufficient length to pass the filter test');
    });

    it('should filter out short comments', async () => {
      document.body.innerHTML = `
        <div class="comment" style="width: 100px; height: 100px;">
          Short
        </div>
        <div class="comment" style="width: 100px; height: 100px;">
          This is a longer comment that should be included in the results
        </div>
      `;

      const result = await extractor.extractContent();
      expect(result).not.toContain('Short');
      expect(result).toContain('This is a longer comment that should be included in the results');
    });

    it('should extract both posts and comments', async () => {
      document.body.innerHTML = `
        <div class="toptext" style="width: 100px; height: 100px;">
          Hacker News post content
        </div>
        <div class="comment" style="width: 100px; height: 100px;">
          This is a comment with sufficient length for extraction
        </div>
        <div class="comment" style="width: 100px; height: 100px;">
          Another comment with enough text to be included
        </div>
      `;

      const result = await extractor.extractContent();
      expect(result).toContain('[POST] Hacker News post content');
      expect(result).toContain('[COMMENT 1] This is a comment with sufficient length for extraction');
      expect(result).toContain('[COMMENT 2] Another comment with enough text to be included');
    });

    it('should skip invisible elements', async () => {
      document.body.innerHTML = `
        <div class="toptext" style="display: none;">
          Hidden post content
        </div>
        <div class="toptext" style="width: 100px; height: 100px;">
          Visible post content
        </div>
        <div class="comment" style="visibility: hidden;">
          Hidden comment content that is long enough
        </div>
        <div class="comment" style="width: 100px; height: 100px;">
          Visible comment with sufficient length for extraction
        </div>
      `;

      const result = await extractor.extractContent();
      expect(result).not.toContain('Hidden post content');
      expect(result).not.toContain('Hidden comment content');
      expect(result).toContain('[POST] Visible post content');
      expect(result).toContain('Visible comment with sufficient length for extraction');
    });

    it('should add title and URL if no post content found', async () => {
      document.body.innerHTML = `
        <div class="titleline">
          <a href="https://example.com">Example Article Title</a>
        </div>
        <div class="comment" style="width: 100px; height: 100px;">
          This is a comment with sufficient length to be included
        </div>
      `;

      const result = await extractor.extractContent();
      expect(result).toContain('[POST] Example Article Title https://example.com');
      expect(result).toContain('[COMMENT 1] This is a comment with sufficient length to be included');
    });

    it('should not add title if post content already exists', async () => {
      document.body.innerHTML = `
        <div class="toptext" style="width: 100px; height: 100px;">
          Existing post content
        </div>
        <div class="titleline">
          <a href="https://example.com">Example Article Title</a>
        </div>
        <div class="comment" style="width: 100px; height: 100px;">
          This is a comment with sufficient length to be included
        </div>
      `;

      const result = await extractor.extractContent();
      expect(result).toContain('[POST] Existing post content');
      expect(result).not.toContain('Example Article Title');
    });

    it('should handle title extraction with missing href', async () => {
      document.body.innerHTML = `
        <div class="titleline">
          <a>Example Article Title</a>
        </div>
        <div class="comment" style="width: 100px; height: 100px;">
          This is a comment with sufficient length to be included
        </div>
      `;

      const result = await extractor.extractContent();
      expect(result).toContain('[POST] Example Article Title');
    });

    it('should handle elements with no text content', async () => {
      document.body.innerHTML = `
        <div class="toptext" style="width: 100px; height: 100px;"></div>
        <div class="comment" style="width: 100px; height: 100px;"></div>
      `;

      const result = await extractor.extractContent();
      expect(result).toBe('');
    });

    it('should clean text content', async () => {
      document.body.innerHTML = `
        <div class="toptext" style="width: 100px; height: 100px;">
          Post with    multiple   spaces
          and  line breaks
        </div>
      `;

      const result = await extractor.extractContent();
      expect(result).toContain('[POST] Post with multiple spaces and line breaks');
    });

    it('should handle mixed content with scripts and styles', async () => {
      document.body.innerHTML = `
        <div class="toptext" style="width: 100px; height: 100px;">
          Post content
          <script>console.log("test");</script>
          <style>.test { color: red; }</style>
          without scripts
        </div>
      `;

      const result = await extractor.extractContent();
      expect(result).toContain('[POST] Post content without scripts');
      expect(result).not.toContain('console.log');
      expect(result).not.toContain('.test');
    });

    it('should return empty string when no content found', async () => {
      document.body.innerHTML = '<div>No Hacker News content here</div>';

      const result = await extractor.extractContent();
      expect(result).toBe('');
    });

    it('should number comments correctly', async () => {
      document.body.innerHTML = `
        <div class="comment" style="width: 100px; height: 100px;">
          First comment with enough text to be included
        </div>
        <div class="comment" style="width: 100px; height: 100px;">
          Second comment with enough text to be included
        </div>
        <div class="comment" style="width: 100px; height: 100px;">
          Third comment with enough text to be included
        </div>
      `;

      const result = await extractor.extractContent();
      expect(result).toContain('[COMMENT 1] First comment with enough text to be included');
      expect(result).toContain('[COMMENT 2] Second comment with enough text to be included');
      expect(result).toContain('[COMMENT 3] Third comment with enough text to be included');
    });
  });
});