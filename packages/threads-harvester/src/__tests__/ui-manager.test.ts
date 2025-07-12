import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { UIManager } from '../ui-manager';
import { ContentItem, CheckboxStyling } from '../types';

describe('UIManager', () => {
  let uiManager: UIManager;
  let mockItems: ContentItem[];

  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '';
    
    // Create mock items
    const mockElement1 = document.createElement('div');
    mockElement1.style.width = '100px';
    mockElement1.style.height = '50px';
    mockElement1.textContent = 'First item';
    document.body.appendChild(mockElement1);

    const mockElement2 = document.createElement('div');
    mockElement2.style.width = '100px';
    mockElement2.style.height = '50px';
    mockElement2.textContent = 'Second item';
    document.body.appendChild(mockElement2);

    mockItems = [
      {
        id: 'item-1',
        element: mockElement1,
        textContent: 'First item content',
        type: 'post',
        selected: false
      },
      {
        id: 'item-2',
        element: mockElement2,
        textContent: 'Second item content',
        type: 'comment',
        selected: false
      }
    ];

    // Mock getBoundingClientRect for elements - use function that returns proper values
    const mockGetBoundingClientRect = vi.fn(() => ({
      width: 100,
      height: 50,
      top: 10,
      left: 20,
      right: 120,
      bottom: 60,
      x: 20,
      y: 10,
      toJSON: () => {}
    }));
    
    // Apply the mock to all elements
    Element.prototype.getBoundingClientRect = mockGetBoundingClientRect;

    // Mock scroll offsets
    Object.defineProperty(window, 'pageYOffset', { value: 0, writable: true });
    Object.defineProperty(window, 'pageXOffset', { value: 0, writable: true });
    Object.defineProperty(document.documentElement, 'scrollTop', { value: 0, writable: true });
    Object.defineProperty(document.documentElement, 'scrollLeft', { value: 0, writable: true });

    uiManager = new UIManager();
  });

  afterEach(() => {
    uiManager.destroy();
    document.body.innerHTML = '';
  });

  describe('constructor', () => {
    it('should initialize without styling', () => {
      const manager = new UIManager();
      expect(manager).toBeInstanceOf(UIManager);
    });

    it('should initialize with custom styling', () => {
      const mockStyling: CheckboxStyling = {
        getDefaultStyles: () => 'default',
        getSelectedStyles: () => 'selected',
        getHoverStyles: () => 'hover',
        getPositioningStyles: () => ({ top: '0px', left: '0px' })
      };

      const manager = new UIManager(mockStyling);
      expect(manager).toBeInstanceOf(UIManager);
    });
  });

  describe('displayCheckboxes', () => {
    it('should create checkboxes for all items', () => {
      uiManager.displayCheckboxes(mockItems);

      const checkboxes = document.querySelectorAll('div[style*="position: absolute"]');
      expect(checkboxes).toHaveLength(2);
    });

    it('should position checkboxes relative to target elements', () => {
      uiManager.displayCheckboxes(mockItems);

      const checkboxes = document.querySelectorAll('div[style*="position: absolute"]') as NodeListOf<HTMLElement>;
      expect(checkboxes).toHaveLength(2);

      // Check that checkboxes have positioning styles
      checkboxes.forEach(checkbox => {
        expect(checkbox.style.position).toBe('absolute');
        expect(checkbox.style.top).toBeTruthy();
        expect(checkbox.style.left).toBeTruthy();
      });
    });

    it('should apply default fallback styles when no custom styling provided', () => {
      uiManager.displayCheckboxes(mockItems);

      const checkboxes = document.querySelectorAll('div[style*="position: absolute"]') as NodeListOf<HTMLElement>;
      const checkbox = checkboxes[0];

      expect(checkbox.style.width).toBe('18px');
      expect(checkbox.style.height).toBe('18px');
      expect(checkbox.style.borderRadius).toBe('3px');
      expect(checkbox.style.cursor).toBe('pointer');
      expect(checkbox.style.zIndex).toBe('9999');
    });

    it('should apply custom styles when styling is provided', () => {
      const mockStyling: CheckboxStyling = {
        getDefaultStyles: () => 'width: 20px; height: 20px; background: red;',
        getSelectedStyles: () => 'background: green;',
        getHoverStyles: () => 'background: blue;',
        getPositioningStyles: (rect) => ({ top: `${rect.top + 10}px`, left: `${rect.left + 10}px` })
      };

      const styledManager = new UIManager(mockStyling);
      styledManager.displayCheckboxes(mockItems);

      const checkboxes = document.querySelectorAll('div[style*="position: absolute"]') as NodeListOf<HTMLElement>;
      expect(checkboxes.length).toBeGreaterThan(0);
      
      const checkbox = checkboxes[0];
      expect(checkbox).toBeDefined();

      expect(checkbox.style.width).toBe('20px');
      expect(checkbox.style.height).toBe('20px');

      styledManager.destroy();
    });

    it('should clean up existing checkboxes before creating new ones', () => {
      // First display
      uiManager.displayCheckboxes(mockItems);
      expect(document.querySelectorAll('div[style*="position: absolute"]')).toHaveLength(2);

      // Second display should clean up first
      uiManager.displayCheckboxes([mockItems[0]]);
      expect(document.querySelectorAll('div[style*="position: absolute"]')).toHaveLength(1);
    });

    it('should handle empty items array', () => {
      uiManager.displayCheckboxes([]);
      expect(document.querySelectorAll('div[style*="position: absolute"]')).toHaveLength(0);
    });
  });

  describe('checkbox interactions', () => {
    it('should toggle item selection when checkbox is clicked', () => {
      uiManager.displayCheckboxes(mockItems);

      const checkboxes = document.querySelectorAll('div[style*="position: absolute"]') as NodeListOf<HTMLElement>;
      const firstCheckbox = checkboxes[0];

      expect(mockItems[0].selected).toBe(false);

      // Click checkbox
      firstCheckbox.click();

      expect(mockItems[0].selected).toBe(true);
    });

    it('should update checkbox visual when selection changes', () => {
      uiManager.displayCheckboxes(mockItems);

      const checkboxes = document.querySelectorAll('div[style*="position: absolute"]') as NodeListOf<HTMLElement>;
      const firstCheckbox = checkboxes[0];

      expect(firstCheckbox.innerHTML).toBe('');

      // Click to select
      firstCheckbox.click();

      expect(firstCheckbox.innerHTML).toBe('✓');
      expect(firstCheckbox.style.fontSize).toBe('12px');
    });

    it('should toggle selection state on multiple clicks', () => {
      uiManager.displayCheckboxes(mockItems);

      const checkboxes = document.querySelectorAll('div[style*="position: absolute"]') as NodeListOf<HTMLElement>;
      const firstCheckbox = checkboxes[0];

      // First click - select
      firstCheckbox.click();
      expect(mockItems[0].selected).toBe(true);
      expect(firstCheckbox.innerHTML).toBe('✓');

      // Second click - deselect
      firstCheckbox.click();
      expect(mockItems[0].selected).toBe(false);
      expect(firstCheckbox.innerHTML).toBe('');
    });

    it('should emit selectionChanged event when item is toggled', () => {
      return new Promise<void>((resolve) => {
        uiManager.displayCheckboxes(mockItems);

        uiManager.on('selectionChanged', (selectedItems) => {
          expect(selectedItems).toHaveLength(1);
          expect(selectedItems[0].id).toBe('item-1');
          resolve();
        });

        const checkboxes = document.querySelectorAll('div[style*="position: absolute"]') as NodeListOf<HTMLElement>;
        const firstCheckbox = checkboxes[0];

        firstCheckbox.click();
      });
    });

    it('should emit correct selected items when multiple items are selected', () => {
      return new Promise<void>((resolve) => {
        let eventCount = 0;
        uiManager.displayCheckboxes(mockItems);

        uiManager.on('selectionChanged', (selectedItems) => {
          eventCount++;
          
          if (eventCount === 1) {
            expect(selectedItems).toHaveLength(1);
            expect(selectedItems[0].id).toBe('item-1');
          } else if (eventCount === 2) {
            expect(selectedItems).toHaveLength(2);
            expect(selectedItems.map(item => item.id)).toContain('item-1');
            expect(selectedItems.map(item => item.id)).toContain('item-2');
            resolve();
          }
        });

        const checkboxes = document.querySelectorAll('div[style*="position: absolute"]') as NodeListOf<HTMLElement>;
        
        checkboxes[0].click(); // Select first
        checkboxes[1].click(); // Select second
      });
    });
  });

  describe('custom styling behavior', () => {
    it('should apply hover styles when mouse enters checkbox', () => {
      const mockStyling: CheckboxStyling = {
        getDefaultStyles: () => 'background: white;',
        getSelectedStyles: () => 'background: green;',
        getHoverStyles: () => 'background: blue;',
        getPositioningStyles: (rect) => ({ top: '0px', left: '0px' })
      };

      const styledManager = new UIManager(mockStyling);
      styledManager.displayCheckboxes(mockItems);

      const checkboxes = document.querySelectorAll('div[style*="position: absolute"]') as NodeListOf<HTMLElement>;
      const checkbox = checkboxes[0];

      // Trigger mouse enter
      const mouseEnterEvent = new MouseEvent('mouseenter');
      checkbox.dispatchEvent(mouseEnterEvent);

      // Should have hover styles applied
      expect(checkbox.style.background).toBe('blue');

      styledManager.destroy();
    });

    it('should restore appropriate styles when mouse leaves checkbox', () => {
      const mockStyling: CheckboxStyling = {
        getDefaultStyles: () => 'background: white;',
        getSelectedStyles: () => 'background: green;',
        getHoverStyles: () => 'background: blue;',
        getPositioningStyles: (rect) => ({ top: '0px', left: '0px' })
      };

      const styledManager = new UIManager(mockStyling);
      styledManager.displayCheckboxes(mockItems);

      const checkboxes = document.querySelectorAll('div[style*="position: absolute"]') as NodeListOf<HTMLElement>;
      const checkbox = checkboxes[0];

      // Enter and leave without selection
      checkbox.dispatchEvent(new MouseEvent('mouseenter'));
      checkbox.dispatchEvent(new MouseEvent('mouseleave'));

      expect(checkbox.style.background).toBe('white');

      styledManager.destroy();
    });

    it('should restore selected styles when mouse leaves selected checkbox', () => {
      const mockStyling: CheckboxStyling = {
        getDefaultStyles: () => 'background: white;',
        getSelectedStyles: () => 'background: green;',
        getHoverStyles: () => 'background: blue;',
        getPositioningStyles: (rect) => ({ top: '0px', left: '0px' })
      };

      const styledManager = new UIManager(mockStyling);
      styledManager.displayCheckboxes(mockItems);

      const checkboxes = document.querySelectorAll('div[style*="position: absolute"]') as NodeListOf<HTMLElement>;
      const checkbox = checkboxes[0];

      // Select the item first
      checkbox.click();
      
      // Enter and leave
      checkbox.dispatchEvent(new MouseEvent('mouseenter'));
      checkbox.dispatchEvent(new MouseEvent('mouseleave'));

      expect(checkbox.style.background).toBe('green');

      styledManager.destroy();
    });

    it('should preserve positioning when applying styles', () => {
      const mockStyling: CheckboxStyling = {
        getDefaultStyles: () => 'background: white; top: 999px; left: 999px;',
        getSelectedStyles: () => 'background: green;',
        getHoverStyles: () => 'background: blue;',
        getPositioningStyles: (rect) => ({ top: '100px', left: '200px' })
      };

      const styledManager = new UIManager(mockStyling);
      styledManager.displayCheckboxes(mockItems);

      const checkboxes = document.querySelectorAll('div[style*="position: absolute"]') as NodeListOf<HTMLElement>;
      const checkbox = checkboxes[0];

      // Position should be from positioning function, not from styles
      expect(checkbox.style.top).toBe('100px');
      expect(checkbox.style.left).toBe('200px');

      styledManager.destroy();
    });
  });

  describe('destroy', () => {
    it('should remove all checkboxes from DOM', () => {
      uiManager.displayCheckboxes(mockItems);

      expect(document.querySelectorAll('div[style*="position: absolute"]')).toHaveLength(2);

      uiManager.destroy();

      expect(document.querySelectorAll('div[style*="position: absolute"]')).toHaveLength(0);
    });

    it('should clear internal checkbox map', () => {
      uiManager.displayCheckboxes(mockItems);

      // Click to trigger selection
      const checkboxes = document.querySelectorAll('div[style*="position: absolute"]') as NodeListOf<HTMLElement>;
      checkboxes[0].click();

      uiManager.destroy();

      // After destroy, displaying checkboxes again should work correctly
      uiManager.displayCheckboxes(mockItems);
      expect(document.querySelectorAll('div[style*="position: absolute"]')).toHaveLength(2);
    });

    it('should handle destroy when no checkboxes exist', () => {
      expect(() => {
        uiManager.destroy();
      }).not.toThrow();
    });

    it('should handle destroy called multiple times', () => {
      uiManager.displayCheckboxes(mockItems);
      
      expect(() => {
        uiManager.destroy();
        uiManager.destroy();
      }).not.toThrow();
    });
  });

  describe('event handling', () => {
    it('should allow multiple event listeners', () => {
      return new Promise<void>((resolve) => {
        let listener1Called = false;
        let listener2Called = false;

        uiManager.displayCheckboxes(mockItems);

        uiManager.on('selectionChanged', () => {
          listener1Called = true;
          checkCompletion();
        });

        uiManager.on('selectionChanged', () => {
          listener2Called = true;
          checkCompletion();
        });

        function checkCompletion() {
          if (listener1Called && listener2Called) {
            resolve();
          }
        }

        const checkboxes = document.querySelectorAll('div[style*="position: absolute"]') as NodeListOf<HTMLElement>;
        checkboxes[0].click();
      });
    });

    it('should provide correct event data', () => {
      return new Promise<void>((resolve) => {
        uiManager.displayCheckboxes(mockItems);

        uiManager.on('selectionChanged', (selectedItems) => {
          expect(Array.isArray(selectedItems)).toBe(true);
          expect(selectedItems[0]).toHaveProperty('id');
          expect(selectedItems[0]).toHaveProperty('element');
          expect(selectedItems[0]).toHaveProperty('textContent');
          expect(selectedItems[0]).toHaveProperty('type');
          expect(selectedItems[0]).toHaveProperty('selected');
          resolve();
        });

        const checkboxes = document.querySelectorAll('div[style*="position: absolute"]') as NodeListOf<HTMLElement>;
        checkboxes[0].click();
      });
    });
  });

  describe('edge cases', () => {
    it('should handle items with missing elements gracefully', () => {
      const itemWithoutElement = {
        id: 'missing-element',
        element: null as any,
        textContent: 'Test content',
        type: 'post' as const,
        selected: false
      };

      expect(() => {
        uiManager.displayCheckboxes([itemWithoutElement]);
      }).not.toThrow();
      
      // Should not create any checkboxes for null elements
      expect(document.querySelectorAll('div[style*="position: absolute"]')).toHaveLength(0);
    });

    it('should handle items with invalid positioning', () => {
      const mockStyling: CheckboxStyling = {
        getDefaultStyles: () => 'background: white;',
        getSelectedStyles: () => 'background: green;',
        getHoverStyles: () => 'background: blue;',
        getPositioningStyles: () => ({ top: 'invalid', left: 'invalid' })
      };

      const styledManager = new UIManager(mockStyling);

      expect(() => {
        styledManager.displayCheckboxes(mockItems);
      }).not.toThrow();

      styledManager.destroy();
    });

    it('should handle rapid successive display calls', () => {
      expect(() => {
        uiManager.displayCheckboxes(mockItems);
        uiManager.displayCheckboxes([]);
        uiManager.displayCheckboxes(mockItems);
        uiManager.displayCheckboxes([mockItems[0]]);
      }).not.toThrow();

      // Should end up with one checkbox
      expect(document.querySelectorAll('div[style*="position: absolute"]')).toHaveLength(1);
    });
  });

  describe('positioning', () => {
    it('should use getBoundingClientRect for positioning', () => {
      uiManager.displayCheckboxes(mockItems);

      const checkboxes = document.querySelectorAll('div[style*="position: absolute"]') as NodeListOf<HTMLElement>;
      const checkbox = checkboxes[0];

      // Should have positioning values based on mocked getBoundingClientRect
      // rect.top(10) + scrollTop(0) - 5 = 5, rect.left(20) + scrollLeft(0) - 25 = -5
      expect(parseFloat(checkbox.style.top)).toBe(5);
      expect(parseFloat(checkbox.style.left)).toBe(-5);
    });

    it('should account for scroll position in fallback positioning', () => {
      // Create a new UI manager instance for this test to avoid conflicts
      const testUIManager = new UIManager();
      
      // Set scroll position 
      Object.defineProperty(window, 'pageYOffset', { value: 100, writable: true });
      Object.defineProperty(window, 'pageXOffset', { value: 50, writable: true });

      testUIManager.displayCheckboxes(mockItems);

      const checkboxes = document.querySelectorAll('div[style*="position: absolute"]') as NodeListOf<HTMLElement>;
      const checkbox = checkboxes[0];

      // Position should account for scroll: rect.top(10) + scrollTop(100) - 5 = 105
      expect(parseFloat(checkbox.style.top)).toBe(105);
      // Position should account for scroll: rect.left(20) + scrollLeft(50) - 25 = 45  
      expect(parseFloat(checkbox.style.left)).toBe(45);
      
      testUIManager.destroy();
      
      // Reset scroll values
      Object.defineProperty(window, 'pageYOffset', { value: 0, writable: true });
      Object.defineProperty(window, 'pageXOffset', { value: 0, writable: true });
    });
  });
});