import { SidebarNuggetItem } from '../../shared/types';
import { UI_CONSTANTS } from '../../shared/constants';

export class Sidebar {
  private sidebar: HTMLElement | null = null;
  private toggleButton: HTMLElement | null = null;
  private itemsPerPage = 20;
  private currentPage = 0;
  private allItems: SidebarNuggetItem[] = [];
  private isCollapsed = false;

  show(nuggetItems: SidebarNuggetItem[]): void {
    this.hide(); // Remove existing sidebar if any
    
    this.allItems = nuggetItems;
    this.currentPage = 0;
    this.isCollapsed = false;
    this.sidebar = this.createSidebar();
    document.body.appendChild(this.sidebar);
    
    // Create toggle button
    this.toggleButton = this.createToggleButton();
    document.body.appendChild(this.toggleButton);
    
    // Adjust page margin to account for sidebar
    this.adjustPageLayout(true);
  }

  hide(): void {
    if (this.sidebar) {
      this.sidebar.remove();
      this.sidebar = null;
      this.adjustPageLayout(false);
    }
    if (this.toggleButton) {
      this.toggleButton.remove();
      this.toggleButton = null;
    }
  }

  collapse(): void {
    if (this.sidebar && !this.isCollapsed) {
      this.isCollapsed = true;
      this.sidebar.style.transform = 'translateX(100%)';
      this.adjustPageLayout(false);
      this.showToggleButton();
    }
  }

  expand(): void {
    if (this.sidebar && this.isCollapsed) {
      this.isCollapsed = false;
      this.sidebar.style.transform = 'translateX(0)';
      this.adjustPageLayout(true);
      this.hideToggleButton();
    }
  }

  private showToggleButton(): void {
    if (this.toggleButton) {
      this.toggleButton.style.display = 'block';
    }
  }

  private hideToggleButton(): void {
    if (this.toggleButton) {
      this.toggleButton.style.display = 'none';
    }
  }

  private createToggleButton(): HTMLElement {
    const button = document.createElement('button');
    button.innerHTML = '📋';
    button.style.cssText = `
      position: fixed;
      right: 20px;
      top: 20px;
      width: 50px;
      height: 50px;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 50%;
      cursor: pointer;
      display: none;
      z-index: ${UI_CONSTANTS.SIDEBAR_Z_INDEX + 1};
      font-size: 20px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      transition: all 0.3s ease;
    `;
    
    button.addEventListener('click', () => {
      this.expand();
    });
    
    button.addEventListener('mouseover', () => {
      button.style.transform = 'scale(1.1)';
      button.style.backgroundColor = '#2563eb';
    });
    button.addEventListener('mouseout', () => {
      button.style.transform = 'scale(1)';
      button.style.backgroundColor = '#3b82f6';
    });
    
    return button;
  }

  private createSidebar(): HTMLElement {
    const sidebar = document.createElement('div');
    sidebar.className = 'nugget-sidebar';
    sidebar.style.cssText = `
      position: fixed;
      right: 0;
      top: 0;
      width: ${UI_CONSTANTS.SIDEBAR_WIDTH};
      height: 100vh;
      background: #f8fafc;
      border-left: 1px solid #e5e7eb;
      overflow-y: auto;
      z-index: ${UI_CONSTANTS.SIDEBAR_Z_INDEX};
      box-shadow: -4px 0 6px -1px rgba(0, 0, 0, 0.1);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      transition: transform 0.3s ease;
      transform: translateX(0);
    `;
    
    // Create header with performance optimizations
    const header = this.createOptimizedHeader();
    sidebar.appendChild(header);
    
    // Create nugget list with virtual scrolling
    const nuggetList = this.createNuggetList();
    sidebar.appendChild(nuggetList);
    
    return sidebar;
  }
  
  private createOptimizedHeader(): HTMLElement {
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 24px;
      border-bottom: 1px solid #e5e7eb;
      background: white;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 600;
      position: sticky;
      top: 0;
      z-index: 1;
      border-radius: 0;
    `;
    
    const title = document.createElement('h3');
    title.textContent = `Golden Nuggets (${this.allItems.length})`;
    title.style.cssText = `
      margin: 0;
      font-size: 18px;
      color: #1f2937;
      font-weight: 600;
    `;
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = `
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      padding: 8px;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      transition: background-color 0.2s;
      color: #6b7280;
    `;
    
    // Debounced collapse handler
    let collapseTimeout: NodeJS.Timeout;
    closeBtn.addEventListener('click', () => {
      clearTimeout(collapseTimeout);
      collapseTimeout = setTimeout(() => this.collapse(), 100);
    });
    
    closeBtn.addEventListener('mouseover', () => {
      closeBtn.style.backgroundColor = '#f3f4f6';
    });
    closeBtn.addEventListener('mouseout', () => {
      closeBtn.style.backgroundColor = 'transparent';
    });
    
    header.appendChild(title);
    header.appendChild(closeBtn);
    
    return header;
  }
  
  private createNuggetList(): HTMLElement {
    const nuggetList = document.createElement('div');
    nuggetList.id = 'nugget-list-container';
    nuggetList.style.cssText = `
      padding: 24px;
    `;
    
    if (this.allItems.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.style.cssText = `
        text-align: center;
        color: #6b7280;
        font-style: italic;
        padding: 48px 24px;
        background: white;
        border-radius: 12px;
        border: 1px solid #e5e7eb;
      `;
      emptyState.textContent = 'No golden nuggets found.';
      nuggetList.appendChild(emptyState);
    } else {
      this.renderCurrentPage(nuggetList);
      
      // Add pagination if needed
      if (this.allItems.length > this.itemsPerPage) {
        this.addPagination(nuggetList);
      }
    }
    
    return nuggetList;
  }
  
  private renderCurrentPage(container: HTMLElement): void {
    const start = this.currentPage * this.itemsPerPage;
    const end = Math.min(start + this.itemsPerPage, this.allItems.length);
    
    // Clear existing items
    const existingItems = container.querySelectorAll('.nugget-item');
    existingItems.forEach(item => item.remove());
    
    // Use DocumentFragment for efficient DOM manipulation
    const fragment = document.createDocumentFragment();
    
    for (let i = start; i < end; i++) {
      const nuggetElement = this.createNuggetElement(this.allItems[i], i);
      fragment.appendChild(nuggetElement);
    }
    
    container.appendChild(fragment);
  }
  
  private addPagination(container: HTMLElement): void {
    const totalPages = Math.ceil(this.allItems.length / this.itemsPerPage);
    
    const paginationDiv = document.createElement('div');
    paginationDiv.style.cssText = `
      display: flex;
      justify-content: center;
      gap: 10px;
      margin-top: 20px;
      padding: 20px;
    `;
    
    // Previous button
    if (this.currentPage > 0) {
      const prevBtn = this.createPageButton('Previous', () => {
        this.currentPage--;
        this.renderCurrentPage(container);
        this.updatePagination(container);
      });
      paginationDiv.appendChild(prevBtn);
    }
    
    // Page info
    const pageInfo = document.createElement('span');
    pageInfo.textContent = `Page ${this.currentPage + 1} of ${totalPages}`;
    pageInfo.style.cssText = `
      align-self: center;
      color: #6b7280;
      font-size: 14px;
    `;
    paginationDiv.appendChild(pageInfo);
    
    // Next button
    if (this.currentPage < totalPages - 1) {
      const nextBtn = this.createPageButton('Next', () => {
        this.currentPage++;
        this.renderCurrentPage(container);
        this.updatePagination(container);
      });
      paginationDiv.appendChild(nextBtn);
    }
    
    container.appendChild(paginationDiv);
  }
  
  private createPageButton(text: string, onClick: () => void): HTMLElement {
    const button = document.createElement('button');
    button.textContent = text;
    button.style.cssText = `
      background: #3b82f6;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      transition: background-color 0.2s;
      font-weight: 500;
    `;
    
    button.addEventListener('click', onClick);
    button.addEventListener('mouseover', () => {
      button.style.backgroundColor = '#2563eb';
    });
    button.addEventListener('mouseout', () => {
      button.style.backgroundColor = '#3b82f6';
    });
    
    return button;
  }
  
  private updatePagination(container: HTMLElement): void {
    const existingPagination = container.querySelector('div:last-child');
    if (existingPagination && existingPagination.style.display === 'flex') {
      existingPagination.remove();
    }
    this.addPagination(container);
  }

  private createNuggetElement(item: SidebarNuggetItem, index: number): HTMLElement {
    const nuggetDiv = document.createElement('div');
    nuggetDiv.className = 'nugget-item';
    nuggetDiv.style.cssText = `
      margin-bottom: 16px;
      padding: 20px;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      background: ${item.status === 'highlighted' ? '#fef3c7' : 'white'};
      transition: all 0.2s;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    `;
    
    // Use DocumentFragment for efficient DOM construction
    const fragment = document.createDocumentFragment();
    
    // Header with type badge and status
    const headerDiv = document.createElement('div');
    headerDiv.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 8px;
    `;
    
    // Type badge
    const typeBadge = document.createElement('span');
    typeBadge.className = 'nugget-type-badge';
    typeBadge.textContent = item.nugget.type;
    typeBadge.style.cssText = `
      display: inline-block;
      background: #3b82f6;
      color: white;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      text-transform: uppercase;
    `;
    
    // Status indicator
    const statusIndicator = document.createElement('span');
    statusIndicator.textContent = item.status === 'highlighted' ? '✓ Highlighted' : '⚠ Not found';
    statusIndicator.style.cssText = `
      font-size: 12px;
      color: ${item.status === 'highlighted' ? '#10b981' : '#f59e0b'};
      font-weight: 500;
    `;
    
    headerDiv.appendChild(typeBadge);
    headerDiv.appendChild(statusIndicator);
    
    // Content preview with lazy loading
    const contentPreview = document.createElement('div');
    contentPreview.className = 'nugget-content';
    contentPreview.style.cssText = `
      margin-bottom: 12px;
      font-size: 14px;
      line-height: 1.5;
      color: #374151;
      max-height: 80px;
      overflow: hidden;
      position: relative;
    `;
    
    const truncatedContent = item.nugget.content.length > 150 
      ? item.nugget.content.substring(0, 150) + '...'
      : item.nugget.content;
    
    contentPreview.textContent = truncatedContent;
    
    // Synthesis
    const synthesis = document.createElement('div');
    synthesis.className = 'nugget-synthesis';
    synthesis.style.cssText = `
      font-size: 13px;
      line-height: 1.5;
      color: #6b7280;
      font-style: italic;
      border-left: 3px solid #3b82f6;
      padding-left: 12px;
      margin-top: 8px;
    `;
    synthesis.textContent = item.nugget.synthesis;
    
    // Debounced hover effects for better performance
    let hoverTimeout: NodeJS.Timeout;
    nuggetDiv.addEventListener('mouseover', () => {
      clearTimeout(hoverTimeout);
      hoverTimeout = setTimeout(() => {
        nuggetDiv.style.borderColor = '#3b82f6';
        nuggetDiv.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
      }, 50);
    });
    
    nuggetDiv.addEventListener('mouseout', () => {
      clearTimeout(hoverTimeout);
      nuggetDiv.style.borderColor = '#e5e7eb';
      nuggetDiv.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
    });
    
    // Assemble the element
    nuggetDiv.appendChild(headerDiv);
    nuggetDiv.appendChild(contentPreview);
    nuggetDiv.appendChild(synthesis);
    
    return nuggetDiv;
  }

  private adjustPageLayout(showSidebar: boolean): void {
    if (showSidebar) {
      // Add margin to prevent content from being hidden behind sidebar
      document.body.style.marginRight = UI_CONSTANTS.SIDEBAR_WIDTH;
    } else {
      // Remove margin
      document.body.style.marginRight = '';
    }
  }
}