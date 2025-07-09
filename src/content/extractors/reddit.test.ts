import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RedditExtractor } from './reddit';
import { SITE_SELECTORS } from '../../shared/constants';

describe('RedditExtractor', () => {
  let extractor: RedditExtractor;

  beforeEach(() => {
    extractor = new RedditExtractor();
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
        <div slot="text-body" style="width: 100px; height: 100px;">
          This is a Reddit post content
        </div>
      `;

      const result = await extractor.extractContent();
      expect(result).toContain('[POST] This is a Reddit post content');
    });

    it('should extract multiple posts', async () => {
      document.body.innerHTML = `
        <div slot="text-body" style="width: 100px; height: 100px;">
          First post content
        </div>
        <div slot="text-body" style="width: 100px; height: 100px;">
          Second post content
        </div>
      `;

      const result = await extractor.extractContent();
      expect(result).toContain('[POST] First post content');
      expect(result).toContain('[POST] Second post content');
    });

    it('should extract comments', async () => {
      document.body.innerHTML = `
        <div slot="comment" style="width: 100px; height: 100px;">
          This is a comment with sufficient length to pass the filter
        </div>
      `;

      const result = await extractor.extractContent();
      expect(result).toContain('[COMMENT 1] This is a comment with sufficient length to pass the filter');
    });

    it('should filter out short comments', async () => {
      document.body.innerHTML = `
        <div slot="comment" style="width: 100px; height: 100px;">
          Short
        </div>
        <div slot="comment" style="width: 100px; height: 100px;">
          This is a longer comment that should be included
        </div>
      `;

      const result = await extractor.extractContent();
      expect(result).not.toContain('Short');
      expect(result).toContain('This is a longer comment that should be included');
    });

    it('should extract both posts and comments', async () => {
      document.body.innerHTML = `
        <div slot="text-body" style="width: 100px; height: 100px;">
          Reddit post content
        </div>
        <div slot="comment" style="width: 100px; height: 100px;">
          This is a comment with sufficient length
        </div>
        <div slot="comment" style="width: 100px; height: 100px;">
          Another comment with enough text
        </div>
      `;

      const result = await extractor.extractContent();
      expect(result).toContain('[POST] Reddit post content');
      expect(result).toContain('[COMMENT 1] This is a comment with sufficient length');
      expect(result).toContain('[COMMENT 2] Another comment with enough text');
    });

    it('should skip invisible elements', async () => {
      document.body.innerHTML = `
        <div slot="text-body" style="display: none;">
          Hidden post content
        </div>
        <div slot="text-body" style="width: 100px; height: 100px;">
          Visible post content
        </div>
        <div slot="comment" style="visibility: hidden;">
          Hidden comment content
        </div>
        <div slot="comment" style="width: 100px; height: 100px;">
          Visible comment with sufficient length
        </div>
      `;

      const result = await extractor.extractContent();
      expect(result).not.toContain('Hidden post content');
      expect(result).not.toContain('Hidden comment content');
      expect(result).toContain('[POST] Visible post content');
      expect(result).toContain('Visible comment with sufficient length');
    });

    it('should handle elements with no text content', async () => {
      document.body.innerHTML = `
        <div slot="text-body" style="width: 100px; height: 100px;"></div>
        <div slot="comment" style="width: 100px; height: 100px;"></div>
      `;

      const result = await extractor.extractContent();
      expect(result).toBe('');
    });

    it('should clean text content', async () => {
      document.body.innerHTML = `
        <div slot="text-body" style="width: 100px; height: 100px;">
          Post with    multiple   spaces
          and  line breaks
        </div>
      `;

      const result = await extractor.extractContent();
      expect(result).toContain('[POST] Post with multiple spaces and line breaks');
    });

    it('should handle mixed content with scripts and styles', async () => {
      document.body.innerHTML = `
        <div slot="text-body" style="width: 100px; height: 100px;">
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
      document.body.innerHTML = '<div>No Reddit content here</div>';

      const result = await extractor.extractContent();
      expect(result).toBe('');
    });

    it('should number comments correctly', async () => {
      document.body.innerHTML = `
        <div slot="comment" style="width: 100px; height: 100px;">
          First comment with enough text
        </div>
        <div slot="comment" style="width: 100px; height: 100px;">
          Second comment with enough text
        </div>
        <div slot="comment" style="width: 100px; height: 100px;">
          Third comment with enough text
        </div>
      `;

      const result = await extractor.extractContent();
      expect(result).toContain('[COMMENT 1] First comment with enough text');
      expect(result).toContain('[COMMENT 2] Second comment with enough text');
      expect(result).toContain('[COMMENT 3] Third comment with enough text');
    });
  });
});