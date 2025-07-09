import { SidebarNuggetItem } from '../../shared/types';
import { UI_CONSTANTS } from '../../shared/constants';

export class Sidebar {
  private sidebar: HTMLElement | null = null;

  show(nuggetItems: SidebarNuggetItem[]): void {
    this.hide(); // Remove existing sidebar if any
    
    this.sidebar = this.createSidebar(nuggetItems);
    document.body.appendChild(this.sidebar);
    
    // Adjust page margin to account for sidebar
    this.adjustPageLayout(true);
  }

  hide(): void {
    if (this.sidebar) {
      this.sidebar.remove();
      this.sidebar = null;
      this.adjustPageLayout(false);
    }
  }

  private createSidebar(nuggetItems: SidebarNuggetItem[]): HTMLElement {
    const sidebar = document.createElement('div');
    sidebar.className = 'nugget-sidebar';
    sidebar.style.cssText = `
      position: fixed;
      right: 0;
      top: 0;
      width: ${UI_CONSTANTS.SIDEBAR_WIDTH};
      height: 100vh;
      background: white;
      border-left: 1px solid #ddd;
      overflow-y: auto;
      z-index: ${UI_CONSTANTS.SIDEBAR_Z_INDEX};
      box-shadow: -2px 0 8px rgba(0,0,0,0.1);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    // Create header
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 20px;
      border-bottom: 1px solid #eee;
      background: #f8f9fa;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 600;
      position: sticky;
      top: 0;
      z-index: 1;
    `;
    
    const title = document.createElement('h3');
    title.textContent = 'Golden Nuggets';
    title.style.cssText = `
      margin: 0;
      font-size: 16px;
      color: #333;
    `;
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = `
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      padding: 4px;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: background-color 0.2s;
    `;
    
    closeBtn.addEventListener('click', () => this.hide());
    closeBtn.addEventListener('mouseover', () => {
      closeBtn.style.backgroundColor = '#e9ecef';
    });
    closeBtn.addEventListener('mouseout', () => {
      closeBtn.style.backgroundColor = 'transparent';
    });
    
    header.appendChild(title);
    header.appendChild(closeBtn);
    sidebar.appendChild(header);
    
    // Create nugget list
    const nuggetList = document.createElement('div');
    nuggetList.style.cssText = `
      padding: 20px;
    `;
    
    if (nuggetItems.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.style.cssText = `
        text-align: center;
        color: #666;
        font-style: italic;
        padding: 40px 20px;
      `;
      emptyState.textContent = 'No golden nuggets found.';
      nuggetList.appendChild(emptyState);
    } else {
      nuggetItems.forEach((item, index) => {
        const nuggetElement = this.createNuggetElement(item, index);
        nuggetList.appendChild(nuggetElement);
      });
    }
    
    sidebar.appendChild(nuggetList);
    return sidebar;
  }

  private createNuggetElement(item: SidebarNuggetItem, index: number): HTMLElement {
    const nuggetDiv = document.createElement('div');
    nuggetDiv.className = 'nugget-item';
    nuggetDiv.style.cssText = `
      margin-bottom: 20px;
      padding: 16px;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      background: ${item.status === 'highlighted' ? '#fff8dc' : '#f8f9fa'};
      transition: all 0.2s;
    `;
    
    // Type badge
    const typeBadge = document.createElement('span');
    typeBadge.className = 'nugget-type-badge';
    typeBadge.textContent = item.nugget.type;
    typeBadge.style.cssText = `
      display: inline-block;
      background: #007bff;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      text-transform: uppercase;
      margin-bottom: 8px;
    `;
    
    // Status indicator
    const statusIndicator = document.createElement('span');
    statusIndicator.textContent = item.status === 'highlighted' ? '✓ Highlighted' : '⚠ Not found';
    statusIndicator.style.cssText = `
      float: right;
      font-size: 12px;
      color: ${item.status === 'highlighted' ? '#28a745' : '#ffc107'};
      font-weight: 500;
      margin-top: 4px;
    `;
    
    // Content preview
    const contentPreview = document.createElement('div');
    contentPreview.className = 'nugget-content';
    contentPreview.style.cssText = `
      margin-bottom: 12px;
      font-size: 14px;
      line-height: 1.4;
      color: #495057;
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
      line-height: 1.4;
      color: #6c757d;
      font-style: italic;
      border-left: 3px solid #007bff;
      padding-left: 12px;
      margin-top: 8px;
    `;
    synthesis.textContent = item.nugget.synthesis;
    
    // Add hover effect
    nuggetDiv.addEventListener('mouseover', () => {
      nuggetDiv.style.borderColor = '#007bff';
      nuggetDiv.style.boxShadow = '0 2px 8px rgba(0,123,255,0.1)';
    });
    
    nuggetDiv.addEventListener('mouseout', () => {
      nuggetDiv.style.borderColor = '#e9ecef';
      nuggetDiv.style.boxShadow = 'none';
    });
    
    // Assemble the element
    const headerDiv = document.createElement('div');
    headerDiv.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 8px;
    `;
    
    headerDiv.appendChild(typeBadge);
    headerDiv.appendChild(statusIndicator);
    
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