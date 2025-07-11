import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  createStyledElement, 
  applySidebarStyles, 
  applyNotificationStyles, 
  applyHighlightStyles,
  applyButtonStyles,
  TailwindColorMap,
  TailwindSpacingMap,
  TailwindShadowMap,
  generateClassString,
  createPrefixedClass
} from './tailwind-utils';

describe('TailwindUtils', () => {
  beforeEach(() => {
    // Mock DOM
    global.document = {
      createElement: vi.fn((tag: string) => {
        const element = {
          tagName: tag.toUpperCase(),
          classList: {
            add: vi.fn(),
            remove: vi.fn(),
            contains: vi.fn(),
            toggle: vi.fn()
          },
          setAttribute: vi.fn(),
          appendChild: vi.fn(),
          textContent: ''
        };
        return element as any;
      })
    } as any;
  });

  describe('createStyledElement', () => {
    it('should create element with correct classes', () => {
      const element = createStyledElement({
        tag: 'div',
        classes: ['test-class', 'another-class'],
        content: 'Test content'
      });

      expect(element.classList.add).toHaveBeenCalledTimes(3);
      expect(element.textContent).toBe('Test content');
    });

    it('should set attributes correctly', () => {
      const element = createStyledElement({
        tag: 'button',
        classes: ['btn'],
        attributes: {
          'data-test': 'value',
          'aria-label': 'Test button'
        }
      });

      expect(element.setAttribute).toHaveBeenCalledWith('data-test', 'value');
      expect(element.setAttribute).toHaveBeenCalledWith('aria-label', 'Test button');
    });
  });

  describe('applySidebarStyles', () => {
    it('should apply correct base sidebar classes', () => {
      const mockElement = {
        classList: {
          add: vi.fn()
        },
        style: {}
      } as any;

      applySidebarStyles(mockElement);

      expect(mockElement.classList.add).toHaveBeenCalledWith('gnf-sidebar');
      expect(mockElement.classList.add).toHaveBeenCalledWith('fixed');
      expect(mockElement.classList.add).toHaveBeenCalledWith('top-0');
      expect(mockElement.classList.add).toHaveBeenCalledWith('h-screen');
      expect(mockElement.classList.add).toHaveBeenCalledWith('bg-white');
      expect(mockElement.classList.add).toHaveBeenCalledWith('w-96'); // normal width
      expect(mockElement.classList.add).toHaveBeenCalledWith('right-0'); // right position
    });

    it('should apply custom width and position', () => {
      const mockElement = {
        classList: {
          add: vi.fn()
        },
        style: {}
      } as any;

      applySidebarStyles(mockElement, { width: 'wide', position: 'left' });

      expect(mockElement.classList.add).toHaveBeenCalledWith('w-[450px]');
      expect(mockElement.classList.add).toHaveBeenCalledWith('left-0');
    });
  });

  describe('applyNotificationStyles', () => {
    it('should apply correct notification classes', () => {
      const mockElement = {
        classList: {
          add: vi.fn()
        }
      } as any;

      applyNotificationStyles(mockElement, { type: 'success' });

      expect(mockElement.classList.add).toHaveBeenCalledTimes(21);
    });

    it('should apply different notification types', () => {
      const mockElement = {
        classList: {
          add: vi.fn()
        }
      } as any;

      applyNotificationStyles(mockElement, { type: 'error', position: 'bottom' });

      expect(mockElement.classList.add).toHaveBeenCalledTimes(21);
    });
  });

  describe('applyHighlightStyles', () => {
    it('should apply correct highlight classes', () => {
      const mockElement = {
        classList: {
          add: vi.fn()
        }
      } as any;

      applyHighlightStyles(mockElement);

      expect(mockElement.classList.add).toHaveBeenCalledTimes(12);
    });

    it('should apply different intensities', () => {
      const mockElement = {
        classList: {
          add: vi.fn()
        }
      } as any;

      applyHighlightStyles(mockElement, { intensity: 'strong' });

      expect(mockElement.classList.add).toHaveBeenCalledTimes(12);
    });
  });

  describe('applyButtonStyles', () => {
    it('should apply primary button styles', () => {
      const mockElement = {
        classList: {
          add: vi.fn()
        }
      } as any;

      applyButtonStyles(mockElement, 'primary');

      expect(mockElement.classList.add).toHaveBeenCalledWith('gnf-button');
      expect(mockElement.classList.add).toHaveBeenCalledWith('bg-black');
      expect(mockElement.classList.add).toHaveBeenCalledWith('text-white');
    });

    it('should apply secondary button styles', () => {
      const mockElement = {
        classList: {
          add: vi.fn()
        }
      } as any;

      applyButtonStyles(mockElement, 'secondary');

      expect(mockElement.classList.add).toHaveBeenCalledWith('bg-white');
      expect(mockElement.classList.add).toHaveBeenCalledWith('text-gray-800');
      expect(mockElement.classList.add).toHaveBeenCalledWith('border');
    });

    it('should apply ghost button styles', () => {
      const mockElement = {
        classList: {
          add: vi.fn()
        }
      } as any;

      applyButtonStyles(mockElement, 'ghost');

      expect(mockElement.classList.add).toHaveBeenCalledWith('bg-transparent');
      expect(mockElement.classList.add).toHaveBeenCalledWith('text-gray-500');
    });
  });

  describe('Design Token Maps', () => {
    it('should have consistent color mappings', () => {
      expect(TailwindColorMap.textPrimary).toBe('text-gray-800');
      expect(TailwindColorMap.bgPrimary).toBe('bg-white');
      expect(TailwindColorMap.borderLight).toBe('border-gray-100');
    });

    it('should have spacing mappings', () => {
      expect(TailwindSpacingMap.xs).toBe('p-1');
      expect(TailwindSpacingMap.md).toBe('p-3');
      expect(TailwindSpacingMap.lg).toBe('p-4');
    });

    it('should have shadow mappings', () => {
      expect(TailwindShadowMap.sm).toBe('shadow-sm');
      expect(TailwindShadowMap.md).toBe('shadow-md');
      expect(TailwindShadowMap.lg).toBe('shadow-lg');
    });
  });

  describe('Utility Functions', () => {
    it('should generate class strings correctly', () => {
      const result = generateClassString(['base', 'another'], ['modifier']);
      expect(result).toBe('base another modifier');
    });

    it('should create prefixed classes', () => {
      const result = createPrefixedClass('highlight');
      expect(result).toBe('gnf-highlight');
    });
  });
});