import { ContentItem, CheckboxStyling } from './types';

export class UIManager {
  private checkboxes = new Map<HTMLElement, { item: ContentItem, checkboxEl: HTMLElement }>();
  private eventEmitter = new EventTarget();
  private styling?: CheckboxStyling;

  constructor(styling?: CheckboxStyling) {
    this.styling = styling;
  }

  public displayCheckboxes(items: ContentItem[]): void {
    // Clean up existing checkboxes first
    this.destroy();

    items.forEach(item => {
      // Skip items with missing elements
      if (!item.element) return;
      
      const checkbox = this.createCheckbox(item);
      this.positionCheckbox(checkbox, item.element);
      this.checkboxes.set(item.element, { item, checkboxEl: checkbox });
      
      // Add click listener
      checkbox.addEventListener('click', () => {
        this.toggleSelection(item);
      });
    });
  }

  private createCheckbox(item: ContentItem): HTMLElement {
    const checkbox = document.createElement('div');
    
    // Apply styles from styling function or fallback to minimal defaults
    if (this.styling) {
      this.applyStylesPreservingLayout(checkbox, this.styling.getDefaultStyles());
    } else {
      // Minimal fallback styles (no hardcoded colors)
      checkbox.style.cssText = `
        position: absolute;
        width: 18px;
        height: 18px;
        border: 1px solid currentColor;
        border-radius: 3px;
        background: transparent;
        cursor: pointer;
        z-index: 9999;
        transition: all 0.2s ease;
        opacity: 0.5;
      `;
      // Force essential layout properties
      checkbox.style.setProperty('display', 'flex', 'important');
      checkbox.style.setProperty('align-items', 'center', 'important');
      checkbox.style.setProperty('justify-content', 'center', 'important');
    }

    // Update visual state
    this.updateCheckboxVisual(checkbox, item.selected);

    // Add hover effects if styling function provides them
    if (this.styling) {
      checkbox.addEventListener('mouseenter', () => {
        // Apply hover styles but preserve essential display properties
        this.applyStylesPreservingLayout(checkbox, this.styling!.getHoverStyles());
        this.updateCheckboxVisual(checkbox, item.selected);
      });
      
      checkbox.addEventListener('mouseleave', () => {
        // Apply appropriate styles but preserve essential display properties
        const styles = item.selected 
          ? this.styling!.getSelectedStyles()
          : this.styling!.getDefaultStyles();
        this.applyStylesPreservingLayout(checkbox, styles);
        this.updateCheckboxVisual(checkbox, item.selected);
      });
    }

    return checkbox;
  }

  private positionCheckbox(checkbox: HTMLElement, targetElement: HTMLElement): void {
    // Position the checkbox relative to the target element
    if (!targetElement) return;
    
    const rect = targetElement.getBoundingClientRect();
    
    if (this.styling) {
      // Use positioning function from styling
      const position = this.styling.getPositioningStyles(rect);
      checkbox.style.top = position.top;
      checkbox.style.left = position.left;
    } else {
      // Fallback positioning
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop || 0;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft || 0;
      checkbox.style.top = `${rect.top + scrollTop - 5}px`;
      checkbox.style.left = `${rect.left + scrollLeft - 25}px`;
    }

    document.body.appendChild(checkbox);
  }

  private applyStylesPreservingLayout(checkbox: HTMLElement, cssText: string): void {
    // Save positioning properties before applying new styles
    const savedTop = checkbox.style.top;
    const savedLeft = checkbox.style.left;
    const savedPosition = checkbox.style.position;
    
    // Apply the CSS styles from styling function
    checkbox.style.cssText = cssText;
    
    // Restore critical positioning properties
    if (savedTop) checkbox.style.top = savedTop;
    if (savedLeft) checkbox.style.left = savedLeft;
    if (savedPosition) checkbox.style.position = savedPosition;
    
    // Force essential layout properties with !important (can't be done via style.property)
    checkbox.style.setProperty('position', 'absolute', 'important');
    checkbox.style.setProperty('display', 'flex', 'important');
    checkbox.style.setProperty('align-items', 'center', 'important');
    checkbox.style.setProperty('justify-content', 'center', 'important');
    checkbox.style.setProperty('visibility', 'visible', 'important');
    checkbox.style.setProperty('opacity', '1', 'important');
  }

  private updateCheckboxVisual(checkbox: HTMLElement, selected: boolean): void {
    if (selected) {
      checkbox.innerHTML = '✓';
      checkbox.style.fontSize = '12px';
    } else {
      checkbox.innerHTML = '';
    }
  }

  private toggleSelection(item: ContentItem): void {
    item.selected = !item.selected;
    
    // Update checkbox visual and styles
    const checkboxData = this.checkboxes.get(item.element);
    if (checkboxData) {
      // Update styles based on selection state, preserving layout
      if (this.styling) {
        const styles = item.selected
          ? this.styling.getSelectedStyles()
          : this.styling.getDefaultStyles();
        this.applyStylesPreservingLayout(checkboxData.checkboxEl, styles);
      }
      // Update visual content (checkmark)
      this.updateCheckboxVisual(checkboxData.checkboxEl, item.selected);
    }

    // Dispatch selection changed event
    const selectedItems = this.getSelectedItems();
    this.eventEmitter.dispatchEvent(new CustomEvent('selectionChanged', {
      detail: selectedItems
    }));
  }

  private getSelectedItems(): ContentItem[] {
    const selectedItems: ContentItem[] = [];
    this.checkboxes.forEach(({ item }) => {
      if (item.selected) {
        selectedItems.push(item);
      }
    });
    return selectedItems;
  }

  public on(eventName: 'selectionChanged', callback: (selectedItems: ContentItem[]) => void): void {
    this.eventEmitter.addEventListener(eventName, (event: any) => {
      callback(event.detail);
    });
  }

  public destroy(): void {
    // Remove all checkboxes from DOM
    this.checkboxes.forEach(({ checkboxEl }) => {
      if (checkboxEl.parentNode) {
        checkboxEl.parentNode.removeChild(checkboxEl);
      }
    });
    
    // Clear the map
    this.checkboxes.clear();
  }
}