import { describe, it, expect } from 'vitest';
import type { ContentItem, Content, CheckboxStyling, ScraperOptions } from '../types';

describe('Types', () => {
  describe('ContentItem', () => {
    it('should create valid ContentItem object', () => {
      const mockElement = document.createElement('div');
      const item: ContentItem = {
        id: 'test-id',
        element: mockElement,
        URL: 'https://example.com',
        textContent: 'Test content',
        htmlContent: '<div>Test</div>',
        type: 'post',
        selected: false
      };

      expect(item.id).toBe('test-id');
      expect(item.element).toBe(mockElement);
      expect(item.URL).toBe('https://example.com');
      expect(item.textContent).toBe('Test content');
      expect(item.htmlContent).toBe('<div>Test</div>');
      expect(item.type).toBe('post');
      expect(item.selected).toBe(false);
    });

    it('should allow comment type', () => {
      const mockElement = document.createElement('div');
      const item: ContentItem = {
        id: 'comment-id',
        element: mockElement,
        type: 'comment',
        selected: true
      };

      expect(item.type).toBe('comment');
      expect(item.selected).toBe(true);
    });

    it('should work with minimal required properties', () => {
      const mockElement = document.createElement('div');
      const item: ContentItem = {
        id: 'minimal-id',
        element: mockElement,
        type: 'post',
        selected: false
      };

      expect(item.id).toBe('minimal-id');
      expect(item.element).toBe(mockElement);
      expect(item.type).toBe('post');
      expect(item.selected).toBe(false);
      expect(item.URL).toBeUndefined();
      expect(item.textContent).toBeUndefined();
      expect(item.htmlContent).toBeUndefined();
    });
  });

  describe('Content', () => {
    it('should create valid Content object', () => {
      const mockElement = document.createElement('div');
      const items: ContentItem[] = [
        {
          id: 'item-1',
          element: mockElement,
          type: 'post',
          selected: false
        }
      ];

      const content: Content = {
        pageURL: 'https://example.com/page',
        title: 'Test Page',
        items
      };

      expect(content.pageURL).toBe('https://example.com/page');
      expect(content.title).toBe('Test Page');
      expect(content.items).toHaveLength(1);
      expect(content.items[0]).toBe(items[0]);
    });

    it('should work with empty items array', () => {
      const content: Content = {
        pageURL: 'https://example.com',
        title: 'Empty Page',
        items: []
      };

      expect(content.items).toHaveLength(0);
    });
  });

  describe('CheckboxStyling', () => {
    it('should implement all required methods', () => {
      const styling: CheckboxStyling = {
        getDefaultStyles: () => 'default-styles',
        getSelectedStyles: () => 'selected-styles',
        getHoverStyles: () => 'hover-styles',
        getPositioningStyles: (rect: DOMRect) => ({
          top: `${rect.top}px`,
          left: `${rect.left}px`
        })
      };

      expect(styling.getDefaultStyles()).toBe('default-styles');
      expect(styling.getSelectedStyles()).toBe('selected-styles');
      expect(styling.getHoverStyles()).toBe('hover-styles');

      const mockRect = { top: 100, left: 200 } as DOMRect;
      const position = styling.getPositioningStyles(mockRect);
      expect(position.top).toBe('100px');
      expect(position.left).toBe('200px');
    });
  });

  describe('ScraperOptions', () => {
    it('should work with empty options', () => {
      const options: ScraperOptions = {};
      
      expect(options.includeHtml).toBeUndefined();
      expect(options.checkboxStyling).toBeUndefined();
      expect(options.showCheckboxes).toBeUndefined();
    });

    it('should work with all options specified', () => {
      const mockStyling: CheckboxStyling = {
        getDefaultStyles: () => '',
        getSelectedStyles: () => '',
        getHoverStyles: () => '',
        getPositioningStyles: () => ({ top: '0px', left: '0px' })
      };

      const options: ScraperOptions = {
        includeHtml: true,
        checkboxStyling: mockStyling,
        showCheckboxes: false
      };

      expect(options.includeHtml).toBe(true);
      expect(options.checkboxStyling).toBe(mockStyling);
      expect(options.showCheckboxes).toBe(false);
    });

    it('should work with partial options', () => {
      const options: ScraperOptions = {
        includeHtml: false
      };

      expect(options.includeHtml).toBe(false);
      expect(options.checkboxStyling).toBeUndefined();
      expect(options.showCheckboxes).toBeUndefined();
    });
  });
});