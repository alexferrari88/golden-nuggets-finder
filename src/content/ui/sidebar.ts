import { SidebarNuggetItem } from '../../shared/types';
import { Highlighter } from './highlighter';
import { colors, shadows, generateInlineStyles, borderRadius, spacing, typography, zIndex, ui } from '../../shared/design-system';

export class Sidebar {
  private sidebar: HTMLElement | null = null;
  private collapsedTab: HTMLElement | null = null;
  private itemsPerPage = 20;
  private currentPage = 0;
  private allItems: SidebarNuggetItem[] = [];
  private isCollapsed = false;
  private highlighter: Highlighter | null = null;
  private selectedItems: Set<number> = new Set();
  private actionMenu: HTMLElement | null = null;
  private actionMenuVisible: boolean = false;
  private keyboardHandler: ((e: KeyboardEvent) => void) | null = null;

  show(nuggetItems: SidebarNuggetItem[], highlighter?: Highlighter): void {
    this.hide(); // Remove existing sidebar if any
    
    // Initialize selection state for all nuggets
    this.allItems = nuggetItems.map(item => ({
      ...item,
      selected: false
    }));
    this.selectedItems.clear();
    this.currentPage = 0;
    this.isCollapsed = false;
    this.highlighter = highlighter || null;
    this.sidebar = this.createSidebar();
    document.body.appendChild(this.sidebar);
    
    // Create collapsed tab (initially hidden)
    this.collapsedTab = this.createCollapsedTab();
    document.body.appendChild(this.collapsedTab);
    
    // Add keyboard event listener for Esc key
    this.keyboardHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !this.isCollapsed) {
        e.preventDefault();
        this.collapse();
      }
    };
    document.addEventListener('keydown', this.keyboardHandler);
    
    // Adjust page margin to account for sidebar
    this.adjustPageLayout(true);
  }

  hide(): void {
    if (this.sidebar) {
      this.sidebar.remove();
      this.sidebar = null;
      this.adjustPageLayout(false);
    }
    if (this.collapsedTab) {
      this.collapsedTab.remove();
      this.collapsedTab = null;
    }
    // Remove keyboard event listener
    if (this.keyboardHandler) {
      document.removeEventListener('keydown', this.keyboardHandler);
      this.keyboardHandler = null;
    }
  }

  collapse(): void {
    if (this.sidebar && !this.isCollapsed) {
      this.isCollapsed = true;
      this.sidebar.style.width = '40px';
      this.sidebar.style.overflowY = 'hidden';
      this.adjustPageLayout(true); // Still showing sidebar, just collapsed
      this.showCollapsedTab();
    }
  }

  expand(): void {
    if (this.sidebar && this.isCollapsed) {
      this.isCollapsed = false;
      this.sidebar.style.width = ui.sidebarWidth;
      this.sidebar.style.overflowY = 'auto';
      this.adjustPageLayout(true); // Still showing sidebar, now expanded
      this.hideCollapsedTab();
    }
  }

  private showCollapsedTab(): void {
    if (this.collapsedTab) {
      this.collapsedTab.style.display = 'flex';
      this.collapsedTab.style.opacity = '1';
    }
  }

  private hideCollapsedTab(): void {
    if (this.collapsedTab) {
      this.collapsedTab.style.display = 'none';
      this.collapsedTab.style.opacity = '0';
    }
  }

  private createCollapsedTab(): HTMLElement {
    const tab = document.createElement('div');
    tab.className = 'nugget-collapsed-tab';
    tab.style.cssText = `
      position: fixed;
      right: 0;
      top: 0;
      width: 40px;
      height: 100vh;
      background: ${colors.background.primary};
      border-left: 1px solid ${colors.border.light};
      box-shadow: ${generateInlineStyles.sidebarShadow()};
      z-index: ${zIndex.sidebar};
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
      opacity: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    // Create rotated text container
    const textContainer = document.createElement('div');
    textContainer.style.cssText = `
      transform: rotate(-90deg);
      white-space: nowrap;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 600;
      color: ${colors.text.primary};
    `;
    
    // Add title text
    const titleText = document.createElement('span');
    titleText.textContent = 'Golden Nuggets';
    
    // Add count badge
    const countBadge = document.createElement('span');
    countBadge.textContent = this.allItems.length.toString();
    countBadge.style.cssText = `
      background: ${colors.text.accent};
      color: white;
      padding: 2px 6px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 500;
      min-width: 20px;
      text-align: center;
    `;
    
    textContainer.appendChild(titleText);
    textContainer.appendChild(countBadge);
    tab.appendChild(textContainer);
    
    // Event handlers
    tab.addEventListener('click', () => {
      this.expand();
    });
    
    tab.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.expand();
      }
    });
    
    // Hover effects
    tab.addEventListener('mouseenter', () => {
      tab.style.background = colors.background.secondary;
      tab.style.boxShadow = generateInlineStyles.sidebarShadowHover();
      tab.style.borderLeftColor = colors.text.accent;
    });
    
    tab.addEventListener('mouseleave', () => {
      tab.style.background = colors.background.primary;
      tab.style.boxShadow = generateInlineStyles.sidebarShadow();
      tab.style.borderLeftColor = colors.border.light;
    });
    
    // Focus handling
    tab.setAttribute('tabindex', '0');
    tab.setAttribute('role', 'button');
    tab.setAttribute('aria-label', 'Expand Golden Nuggets sidebar');
    
    tab.addEventListener('focus', () => {
      tab.style.outline = `2px solid ${colors.text.accent}`;
      tab.style.outlineOffset = '-2px';
    });
    
    tab.addEventListener('blur', () => {
      tab.style.outline = 'none';
    });
    
    return tab;
  }

  private createSidebar(): HTMLElement {
    const sidebar = document.createElement('div');
    sidebar.className = 'nugget-sidebar';
    sidebar.style.cssText = `
      position: fixed;
      right: 0;
      top: 0;
      width: ${ui.sidebarWidth};
      height: 100vh;
      background: ${colors.background.primary};
      border-left: 1px solid ${colors.border.light};
      overflow-y: auto;
      z-index: ${zIndex.sidebar};
      box-shadow: ${generateInlineStyles.sidebarShadow()};
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      transition: width 0.3s ease, overflow-y 0.3s ease;
    `;
    
    // Create header with performance optimizations
    const header = this.createOptimizedHeader();
    sidebar.appendChild(header);
    
    // Create nugget list with virtual scrolling
    const nuggetList = this.createNuggetList();
    sidebar.appendChild(nuggetList);
    
    // Create floating action menu (initially hidden)
    this.actionMenu = this.createActionMenu();
    document.body.appendChild(this.actionMenu);
    
    return sidebar;
  }
  
  private createOptimizedHeader(): HTMLElement {
    const header = document.createElement('div');
    header.style.cssText = `
      padding: ${spacing['2xl']} ${spacing['2xl']} ${spacing.lg} ${spacing['2xl']};
      border-bottom: 1px solid ${colors.border.light};
      background: ${colors.white};
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 2;
    `;
    
    const titleContainer = document.createElement('div');
    titleContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: ${spacing.xs};
    `;
    
    const title = document.createElement('h2');
    title.textContent = 'Golden Nuggets';
    title.style.cssText = `
      margin: 0;
      font-size: ${typography.fontSize.lg};
      color: ${colors.text.primary};
      font-weight: ${typography.fontWeight.semibold};
      line-height: ${typography.lineHeight.tight};
    `;
    
    const count = document.createElement('span');
    count.textContent = `${this.allItems.length} ${this.allItems.length === 1 ? 'nugget' : 'nuggets'}`;
    count.style.cssText = `
      font-size: ${typography.fontSize.xs};
      color: ${colors.text.secondary};
      font-weight: ${typography.fontWeight.normal};
    `;
    
    titleContainer.appendChild(title);
    titleContainer.appendChild(count);
    
    const actionsContainer = document.createElement('div');
    actionsContainer.style.cssText = `
      display: flex;
      align-items: center;
      gap: ${spacing.sm};
    `;
    
    // Action menu button
    const menuBtn = document.createElement('button');
    menuBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>';
    menuBtn.style.cssText = `
      background: none;
      border: none;
      padding: ${spacing.sm};
      border-radius: ${borderRadius.md};
      cursor: pointer;
      color: ${colors.text.secondary};
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleActionMenu();
    });
    
    menuBtn.addEventListener('mouseenter', () => {
      menuBtn.style.backgroundColor = colors.background.secondary;
      menuBtn.style.color = colors.text.primary;
    });
    
    menuBtn.addEventListener('mouseleave', () => {
      menuBtn.style.backgroundColor = 'transparent';
      menuBtn.style.color = colors.text.secondary;
    });
    
    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>';
    closeBtn.style.cssText = `
      background: none;
      border: none;
      padding: ${spacing.sm};
      border-radius: ${borderRadius.md};
      cursor: pointer;
      color: ${colors.text.secondary};
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    closeBtn.addEventListener('click', () => {
      this.collapse();
    });
    
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.backgroundColor = colors.background.secondary;
      closeBtn.style.color = colors.text.primary;
    });
    
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.backgroundColor = 'transparent';
      closeBtn.style.color = colors.text.secondary;
    });
    
    actionsContainer.appendChild(menuBtn);
    actionsContainer.appendChild(closeBtn);
    
    header.appendChild(titleContainer);
    header.appendChild(actionsContainer);
    
    return header;
  }
  
  private createNuggetList(): HTMLElement {
    const nuggetList = document.createElement('div');
    nuggetList.id = 'nugget-list-container';
    nuggetList.style.cssText = `
      padding: 0 ${spacing['2xl']} ${spacing['2xl']} ${spacing['2xl']};
      flex: 1;
      overflow-y: auto;
    `;
    
    if (this.allItems.length === 0) {
      const emptyState = this.createEmptyState();
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
  
  private createEmptyState(): HTMLElement {
    const emptyState = document.createElement('div');
    emptyState.style.cssText = `
      text-align: center;
      padding: ${spacing['5xl']} ${spacing['2xl']};
      color: ${colors.text.secondary};
    `;
    
    const icon = document.createElement('div');
    icon.innerHTML = '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>';
    icon.style.cssText = `
      margin-bottom: ${spacing.lg};
      opacity: 0.4;
      display: flex;
      justify-content: center;
    `;
    
    const title = document.createElement('h3');
    title.textContent = 'No golden nuggets found';
    title.style.cssText = `
      margin: 0 0 ${spacing.sm} 0;
      font-size: ${typography.fontSize.base};
      font-weight: ${typography.fontWeight.medium};
      color: ${colors.text.primary};
    `;
    
    const description = document.createElement('p');
    description.textContent = 'The AI didn\'t find any valuable insights on this page that match your interests.';
    description.style.cssText = `
      margin: 0 0 ${spacing.lg} 0;
      font-size: ${typography.fontSize.sm};
      line-height: ${typography.lineHeight.normal};
      color: ${colors.text.secondary};
      max-width: 280px;
      margin-left: auto;
      margin-right: auto;
    `;
    
    const suggestions = document.createElement('div');
    suggestions.innerHTML = `
      <div style="font-size: ${typography.fontSize.xs}; color: ${colors.text.tertiary}; line-height: ${typography.lineHeight.normal};">
        Try using a different prompt or analyzing different content
      </div>
    `;
    
    emptyState.appendChild(icon);
    emptyState.appendChild(title);
    emptyState.appendChild(description);
    emptyState.appendChild(suggestions);
    
    return emptyState;
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
      color: ${colors.text.secondary};
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
      background: ${colors.text.accent};
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
      button.style.backgroundColor = '${colors.text.accent}';
    });
    button.addEventListener('mouseout', () => {
      button.style.backgroundColor = '${colors.text.accent}';
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
    const globalIndex = this.currentPage * this.itemsPerPage + index;
    const isSelected = item.selected;
    
    nuggetDiv.style.cssText = `
      margin-bottom: ${spacing.lg};
      padding: ${spacing.lg};
      border: 1px solid ${isSelected ? colors.border.medium : colors.border.light};
      border-radius: ${borderRadius.lg};
      background: ${isSelected ? colors.background.secondary : colors.white};
      transition: all 0.15s ease;
      cursor: pointer;
      position: relative;
    `;
    
    // Click handler for selection and highlighting
    nuggetDiv.addEventListener('click', (e) => {
      // Toggle selection
      this.toggleItemSelection(globalIndex);
      
      // If highlighted, also scroll to highlight
      if (item.status === 'highlighted' && this.highlighter) {
        this.highlighter.scrollToHighlight(item.nugget);
      }
    });
    
    // Hover effects
    nuggetDiv.addEventListener('mouseenter', () => {
      if (!isSelected) {
        nuggetDiv.style.backgroundColor = colors.background.secondary;
        nuggetDiv.style.borderColor = colors.border.default;
      }
    });
    
    nuggetDiv.addEventListener('mouseleave', () => {
      if (!isSelected) {
        nuggetDiv.style.backgroundColor = colors.white;
        nuggetDiv.style.borderColor = colors.border.light;
      }
    });
    
    // Content structure
    const contentContainer = document.createElement('div');
    contentContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: ${spacing.sm};
    `;
    
    // Header with type badge and selection indicator
    const headerDiv = document.createElement('div');
    headerDiv.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;
    
    // Type badge - more subtle
    const typeBadge = document.createElement('span');
    typeBadge.textContent = item.nugget.type;
    typeBadge.style.cssText = `
      background: ${colors.background.tertiary};
      color: ${colors.text.secondary};
      padding: ${spacing.xs} ${spacing.sm};
      border-radius: ${borderRadius.sm};
      font-size: ${typography.fontSize.xs};
      font-weight: ${typography.fontWeight.medium};
      text-transform: uppercase;
      letter-spacing: 0.5px;
    `;
    
    // Selection indicator and status
    const statusContainer = document.createElement('div');
    statusContainer.style.cssText = `
      display: flex;
      align-items: center;
      gap: ${spacing.xs};
    `;
    
    // Highlighted indicator
    if (item.status === 'highlighted') {
      const highlightIndicator = document.createElement('div');
      highlightIndicator.style.cssText = `
        width: 6px;
        height: 6px;
        background: ${colors.highlight.border};
        border-radius: 50%;
        opacity: 0.8;
      `;
      statusContainer.appendChild(highlightIndicator);
    }
    
    // Selection checkmark
    if (isSelected) {
      const checkmark = document.createElement('div');
      checkmark.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
      checkmark.style.cssText = `
        color: ${colors.text.accent};
        display: flex;
        align-items: center;
      `;
      statusContainer.appendChild(checkmark);
    }
    
    headerDiv.appendChild(typeBadge);
    headerDiv.appendChild(statusContainer);
    
    // Content preview - cleaner presentation
    const contentPreview = document.createElement('div');
    contentPreview.style.cssText = `
      font-size: ${typography.fontSize.sm};
      line-height: ${typography.lineHeight.normal};
      color: ${colors.text.primary};
    `;
    
    const maxLength = 200;
    const isTruncated = item.nugget.content.length > maxLength;
    
    if (isTruncated) {
      const truncatedContent = item.nugget.content.substring(0, maxLength);
      
      const textSpan = document.createElement('span');
      textSpan.textContent = truncatedContent + '…';
      
      const expandButton = document.createElement('button');
      expandButton.textContent = 'Show more';
      expandButton.style.cssText = `
        background: none;
        border: none;
        color: ${colors.text.accent};
        cursor: pointer;
        font-size: ${typography.fontSize.xs};
        font-weight: ${typography.fontWeight.medium};
        margin-left: ${spacing.xs};
        padding: 0;
        text-decoration: underline;
        text-underline-offset: 2px;
      `;
      
      let isExpanded = false;
      expandButton.addEventListener('click', (e) => {
        e.stopPropagation();
        isExpanded = !isExpanded;
        
        if (isExpanded) {
          textSpan.textContent = item.nugget.content;
          expandButton.textContent = 'Show less';
        } else {
          textSpan.textContent = truncatedContent + '…';
          expandButton.textContent = 'Show more';
        }
      });
      
      contentPreview.appendChild(textSpan);
      contentPreview.appendChild(expandButton);
    } else {
      contentPreview.textContent = item.nugget.content;
    }
    
    // Synthesis - more subtle presentation
    const synthesis = document.createElement('div');
    synthesis.style.cssText = `
      font-size: ${typography.fontSize.xs};
      line-height: ${typography.lineHeight.normal};
      color: ${colors.text.secondary};
      padding: ${spacing.sm};
      background: ${colors.background.tertiary};
      border-radius: ${borderRadius.sm};
      border-left: 2px solid ${colors.border.default};
    `;
    synthesis.textContent = item.nugget.synthesis;
    
    // Assemble the content
    contentContainer.appendChild(headerDiv);
    contentContainer.appendChild(contentPreview);
    contentContainer.appendChild(synthesis);
    
    nuggetDiv.appendChild(contentContainer);
    
    return nuggetDiv;
  }

  private adjustPageLayout(showSidebar: boolean): void {
    if (showSidebar) {
      // Add margin to prevent content from being hidden behind sidebar
      document.body.style.marginRight = this.isCollapsed ? '40px' : ui.sidebarWidth;
      document.body.style.transition = 'margin-right 0.3s ease';
    } else {
      // Remove margin completely when sidebar is hidden
      document.body.style.marginRight = '';
      document.body.style.transition = 'margin-right 0.3s ease';
    }
  }

  private toggleItemSelection(globalIndex: number): void {
    if (globalIndex >= 0 && globalIndex < this.allItems.length) {
      this.allItems[globalIndex].selected = !this.allItems[globalIndex].selected;
      
      if (this.allItems[globalIndex].selected) {
        this.selectedItems.add(globalIndex);
      } else {
        this.selectedItems.delete(globalIndex);
      }
      
      this.updateSelectedCount();
    }
  }

  private selectAllItems(): void {
    this.allItems.forEach((item, index) => {
      item.selected = true;
      this.selectedItems.add(index);
    });
    this.updateSelectedCount();
    this.refreshCurrentPage();
  }

  private clearAllSelections(): void {
    this.allItems.forEach((item, index) => {
      item.selected = false;
      this.selectedItems.delete(index);
    });
    this.updateSelectedCount();
    this.refreshCurrentPage();
  }

  private refreshCurrentPage(): void {
    if (this.sidebar) {
      const container = this.sidebar.querySelector('#nugget-list-container');
      if (container) {
        this.renderCurrentPage(container as HTMLElement);
      }
    }
  }

  private updateSelectedCount(): void {
    // Update any UI elements that show selected count
    // This is now much simpler without complex panels
  }

  private createActionMenu(): HTMLElement {
    const menu = document.createElement('div');
    menu.style.cssText = `
      position: fixed;
      top: 80px;
      right: 340px;
      background: ${colors.white};
      border: 1px solid ${colors.border.light};
      border-radius: ${borderRadius.lg};
      box-shadow: ${shadows.lg};
      padding: ${spacing.sm};
      z-index: ${zIndex.modal};
      display: none;
      flex-direction: column;
      gap: ${spacing.xs};
      min-width: 200px;
    `;
    
    // Create menu items
    const menuItems = [
      {
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
        label: 'Select All',
        action: () => this.selectAllItems()
      },
      {
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>',
        label: 'Clear Selection',
        action: () => this.clearAllSelections()
      },
      {
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
        label: 'Export as Markdown',
        action: () => this.exportNuggets(this.getExportItems(), 'markdown')
      },
      {
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
        label: 'Export as JSON',
        action: () => this.exportNuggets(this.getExportItems(), 'json')
      }
    ];
    
    menuItems.forEach(item => {
      const menuItem = document.createElement('button');
      menuItem.innerHTML = `${item.icon} <span>${item.label}</span>`;
      menuItem.style.cssText = `
        display: flex;
        align-items: center;
        gap: ${spacing.sm};
        padding: ${spacing.sm} ${spacing.md};
        border: none;
        background: none;
        border-radius: ${borderRadius.md};
        cursor: pointer;
        font-size: ${typography.fontSize.sm};
        color: ${colors.text.primary};
        text-align: left;
        transition: background-color 0.15s ease;
        width: 100%;
      `;
      
      menuItem.addEventListener('click', () => {
        item.action();
        this.hideActionMenu();
      });
      
      menuItem.addEventListener('mouseenter', () => {
        menuItem.style.backgroundColor = colors.background.secondary;
      });
      
      menuItem.addEventListener('mouseleave', () => {
        menuItem.style.backgroundColor = 'transparent';
      });
      
      menu.appendChild(menuItem);
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!menu.contains(e.target as Node) && this.actionMenuVisible) {
        this.hideActionMenu();
      }
    });
    
    return menu;
  }
  
  private toggleActionMenu(): void {
    if (this.actionMenuVisible) {
      this.hideActionMenu();
    } else {
      this.showActionMenu();
    }
  }
  
  private showActionMenu(): void {
    if (this.actionMenu) {
      this.actionMenu.style.display = 'flex';
      this.actionMenuVisible = true;
    }
  }
  
  private hideActionMenu(): void {
    if (this.actionMenu) {
      this.actionMenu.style.display = 'none';
      this.actionMenuVisible = false;
    }
  }
  
  private getExportItems(): SidebarNuggetItem[] {
    const selectedCount = this.selectedItems.size;
    if (selectedCount > 0) {
      return this.allItems.filter(item => item.selected);
    }
    return this.allItems;
  }

  private exportNuggets(nuggets: SidebarNuggetItem[], format: 'markdown' | 'json'): void {
    const url = window.location.href;
    
    const exportData = {
      url,
      nuggets: nuggets.map(item => ({
        type: item.nugget.type,
        content: item.nugget.content,
        synthesis: item.nugget.synthesis
      }))
    };
    
    let content: string;
    let filename: string;
    
    if (format === 'json') {
      content = JSON.stringify(exportData, null, 2);
      filename = `golden-nuggets-${this.getDomainFromUrl(url)}-${new Date().toISOString().split('T')[0]}.json`;
    } else {
      content = this.generateMarkdownContent(exportData);
      filename = `golden-nuggets-${this.getDomainFromUrl(url)}-${new Date().toISOString().split('T')[0]}.md`;
    }
    
    this.downloadFile(content, filename);
  }

  private generateMarkdownContent(data: any): string {
    return `# Golden Nuggets

**URL:** ${data.url}

${data.nuggets.map((nugget: any) => `
## ${nugget.type.toUpperCase()}

**Content:**
${nugget.content}

**Synthesis:**
${nugget.synthesis}

---
`).join('\n')}`;
  }

  private getDomainFromUrl(url: string): string {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return 'unknown-site';
    }
  }

  private downloadFile(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
