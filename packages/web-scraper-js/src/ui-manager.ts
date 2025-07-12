import { ContentItem } from './types';

export interface CheckboxStyles {
  selected?: string;
  deselected?: string;
}

export class UIManager {
  private checkboxes = new Map<HTMLElement, { item: ContentItem, checkboxEl: HTMLElement }>();
  private eventEmitter = new EventTarget();

  constructor(private styles: CheckboxStyles = {}) {}

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
    
    // Apply basic styles
    checkbox.style.cssText = `
      position: absolute;
      width: 18px;
      height: 18px;
      border: 2px solid #ccc;
      border-radius: 3px;
      background: white;
      cursor: pointer;
      z-index: 9999;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      transition: all 0.2s ease;
    `;

    // Apply custom styles if provided
    if (item.selected && this.styles.selected) {
      checkbox.classList.add(this.styles.selected);
    } else if (!item.selected && this.styles.deselected) {
      checkbox.classList.add(this.styles.deselected);
    }

    // Update visual state
    this.updateCheckboxVisual(checkbox, item.selected);

    return checkbox;
  }

  private positionCheckbox(checkbox: HTMLElement, targetElement: HTMLElement): void {
    // Position the checkbox relative to the target element
    const rect = targetElement.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    checkbox.style.top = `${rect.top + scrollTop - 5}px`;
    checkbox.style.left = `${rect.left + scrollLeft - 25}px`;

    document.body.appendChild(checkbox);
  }

  private updateCheckboxVisual(checkbox: HTMLElement, selected: boolean): void {
    if (selected) {
      checkbox.style.backgroundColor = '#007bff';
      checkbox.style.borderColor = '#007bff';
      checkbox.innerHTML = '✓';
      checkbox.style.color = 'white';
      checkbox.style.fontSize = '12px';
      checkbox.style.display = 'flex';
      checkbox.style.alignItems = 'center';
      checkbox.style.justifyContent = 'center';
    } else {
      checkbox.style.backgroundColor = 'white';
      checkbox.style.borderColor = '#ccc';
      checkbox.innerHTML = '';
    }
  }

  private toggleSelection(item: ContentItem): void {
    item.selected = !item.selected;
    
    // Update checkbox visual
    const checkboxData = this.checkboxes.get(item.element);
    if (checkboxData) {
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