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
      checkbox.style.cssText = this.styling.getDefaultStyles();
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
    }

    // Update visual state
    this.updateCheckboxVisual(checkbox, item.selected);

    // Add hover effects if styling function provides them
    if (this.styling) {
      checkbox.addEventListener('mouseenter', () => {
        checkbox.style.cssText = this.styling!.getHoverStyles();
        this.updateCheckboxVisual(checkbox, item.selected);
      });
      
      checkbox.addEventListener('mouseleave', () => {
        checkbox.style.cssText = item.selected 
          ? this.styling!.getSelectedStyles()
          : this.styling!.getDefaultStyles();
        this.updateCheckboxVisual(checkbox, item.selected);
      });
    }

    return checkbox;
  }

  private positionCheckbox(checkbox: HTMLElement, targetElement: HTMLElement): void {
    // Position the checkbox relative to the target element
    const rect = targetElement.getBoundingClientRect();
    
    if (this.styling) {
      // Use positioning function from styling
      const position = this.styling.getPositioningStyles(rect);
      checkbox.style.top = position.top;
      checkbox.style.left = position.left;
    } else {
      // Fallback positioning
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      checkbox.style.top = `${rect.top + scrollTop - 5}px`;
      checkbox.style.left = `${rect.left + scrollLeft - 25}px`;
    }

    document.body.appendChild(checkbox);
  }

  private updateCheckboxVisual(checkbox: HTMLElement, selected: boolean): void {
    if (selected) {
      if (this.styling) {
        checkbox.style.cssText = this.styling.getSelectedStyles();
      }
      checkbox.innerHTML = '✓';
      checkbox.style.fontSize = '12px';
      checkbox.style.display = 'flex';
      checkbox.style.alignItems = 'center';
      checkbox.style.justifyContent = 'center';
    } else {
      if (this.styling) {
        checkbox.style.cssText = this.styling.getDefaultStyles();
      }
      checkbox.innerHTML = '';
    }
  }

  private toggleSelection(item: ContentItem): void {
    item.selected = !item.selected;
    
    // Update checkbox visual and styles
    const checkboxData = this.checkboxes.get(item.element);
    if (checkboxData) {
      if (this.styling) {
        checkboxData.checkboxEl.style.cssText = item.selected
          ? this.styling.getSelectedStyles()
          : this.styling.getDefaultStyles();
      }
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