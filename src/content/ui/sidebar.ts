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
  private exportPanel: HTMLElement | null = null;
  private exportPanelExpanded: boolean = false;
  private restEndpointPanel: HTMLElement | null = null;
  private restEndpointExpanded: boolean = false;
  private restEndpointConfig = {
    url: '',
    method: 'POST',
    contentType: 'application/json',
    headers: [] as Array<{ key: string; value: string }>,
    includeUrl: true,
    includeTimestamp: true,
    includeNuggets: true,
    nuggetParts: {
      type: true,
      content: true,
      synthesis: true
    }
  };

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
    this.exportPanelExpanded = false;
    this.restEndpointExpanded = false;
    this.highlighter = highlighter || null;
    this.sidebar = this.createSidebar();
    document.body.appendChild(this.sidebar);
    
    // Create collapsed tab (initially hidden)
    this.collapsedTab = this.createCollapsedTab();
    document.body.appendChild(this.collapsedTab);
    
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
    
    // Create export panel
    this.exportPanel = this.createExportPanel();
    sidebar.appendChild(this.exportPanel);
    
    // Create REST endpoint panel
    this.restEndpointPanel = this.createRestEndpointPanel();
    sidebar.appendChild(this.restEndpointPanel);
    
    return sidebar;
  }
  
  private createOptimizedHeader(): HTMLElement {
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 24px;
      border-bottom: 1px solid ${colors.border.light};
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
      color: ${colors.text.primary};
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
      color: ${colors.text.secondary};
    `;
    
    // Debounced collapse handler
    let collapseTimeout: NodeJS.Timeout;
    closeBtn.addEventListener('click', () => {
      clearTimeout(collapseTimeout);
      collapseTimeout = setTimeout(() => this.collapse(), 100);
    });
    
    closeBtn.addEventListener('mouseover', () => {
      closeBtn.style.backgroundColor = '${colors.background.secondary}';
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
        padding: 48px 24px;
        background: white;
        border-radius: 12px;
        border: 1px solid ${colors.border.light};
      `;
      
      // Create content with icon, heading, and helpful text
      emptyState.innerHTML = `
        <div style="margin-bottom: 16px; opacity: 0.6;"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg></div>
        <h3 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600; color: ${colors.text.primary};">
          No Golden Nuggets Found
        </h3>
        <p style="margin: 0 0 16px 0; color: ${colors.text.secondary}; font-size: 14px; line-height: 1.5;">
          The AI analyzed this page but didn't find any valuable insights, tools, or explanations that match your interests.
        </p>
        <div style="font-size: 13px; color: ${colors.text.secondary}; line-height: 1.4;">
          <strong>Try:</strong><br>
          • Using a different prompt or persona<br>
          • Analyzing a different section of the page<br>
          • Visiting content with more detailed information
        </div>
      `;
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
    nuggetDiv.style.cssText = `
      margin-bottom: 16px;
      padding: 20px;
      border: 1px solid ${item.status === 'highlighted' ? colors.text.accent : colors.border.light};
      border-radius: 12px;
      background: white;
      transition: all 0.2s;
      box-shadow: ${generateInlineStyles.cardShadow()};
      cursor: ${item.status === 'highlighted' ? 'pointer' : 'default'};
      position: relative;
      display: flex;
      gap: ${spacing.md};
    `;
    
    // Add click handler for highlighted nuggets
    if (item.status === 'highlighted' && this.highlighter) {
      // Add visual indicator for clickable items
      const clickIndicator = document.createElement('div');
      clickIndicator.style.cssText = `
        position: absolute;
        top: 16px;
        right: 16px;
        width: 8px;
        height: 8px;
        background: ${colors.text.accent};
        border-radius: 50%;
        opacity: 0.6;
      `;
      nuggetDiv.appendChild(clickIndicator);
      
      nuggetDiv.addEventListener('click', () => {
        this.highlighter?.scrollToHighlight(item.nugget);
        // Remove the dot indicator after clicking
        clickIndicator.remove();
      });
    }
    
    // Create checkbox container
    const checkboxContainer = document.createElement('div');
    checkboxContainer.style.cssText = `
      display: flex;
      align-items: flex-start;
      padding-top: 2px;
      flex-shrink: 0;
    `;
    
    // Create checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = item.selected;
    checkbox.style.cssText = `
      width: 16px;
      height: 16px;
      margin: 0;
      accent-color: ${colors.text.accent};
      border: 1px solid ${colors.border.medium};
      border-radius: ${borderRadius.sm};
      cursor: pointer;
    `;
    
    // Add checkbox change handler
    checkbox.addEventListener('change', (e) => {
      e.stopPropagation();
      const globalIndex = this.currentPage * this.itemsPerPage + index;
      this.toggleItemSelection(globalIndex);
    });
    
    checkboxContainer.appendChild(checkbox);
    
    // Create content container
    const contentContainer = document.createElement('div');
    contentContainer.style.cssText = `
      flex: 1;
      min-width: 0;
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
      background: ${colors.text.accent};
      color: white;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      text-transform: uppercase;
    `;
    
    headerDiv.appendChild(typeBadge);
    
    // Content preview with lazy loading
    const contentPreview = document.createElement('div');
    contentPreview.className = 'nugget-content';
    contentPreview.style.cssText = `
      margin-bottom: 12px;
      font-size: 14px;
      line-height: 1.5;
      color: ${colors.text.primary};
      max-height: 80px;
      overflow: hidden;
      position: relative;
    `;
    
    const maxLength = 150;
    const isTruncated = item.nugget.content.length > maxLength;
    
    if (isTruncated) {
      const truncatedContent = item.nugget.content.substring(0, maxLength);
      
      // Create text span with ellipsis
      const textSpan = document.createElement('span');
      textSpan.textContent = truncatedContent + '…';
      
      // Add expand button
      const expandButton = document.createElement('span');
      expandButton.textContent = ' show more';
      expandButton.style.cssText = `
        color: ${colors.text.accent};
        cursor: pointer;
        font-weight: 500;
        font-size: 13px;
        margin-left: 4px;
        padding: 2px 6px;
        border-radius: 4px;
        background: ${colors.highlight.background};
        border: 1px solid ${colors.highlight.border};
        transition: all 0.2s ease;
        display: inline-block;
      `;
      
      expandButton.addEventListener('mouseenter', () => {
        expandButton.style.background = '${colors.highlight.hover}';
        expandButton.style.borderColor = '${colors.border.default}';
      });
      
      expandButton.addEventListener('mouseleave', () => {
        expandButton.style.background = '${colors.highlight.background}';
        expandButton.style.borderColor = '${colors.highlight.border}';
      });
      
      let isExpanded = false;
      expandButton.addEventListener('click', (e) => {
        e.stopPropagation();
        isExpanded = !isExpanded;
        
        if (isExpanded) {
          textSpan.textContent = item.nugget.content;
          expandButton.textContent = ' show less';
          contentPreview.style.maxHeight = 'none';
          contentPreview.style.overflow = 'visible';
        } else {
          textSpan.textContent = truncatedContent + '…';
          expandButton.textContent = ' show more';
          contentPreview.style.maxHeight = '80px';
          contentPreview.style.overflow = 'hidden';
        }
      });
      
      contentPreview.appendChild(textSpan);
      contentPreview.appendChild(expandButton);
    } else {
      contentPreview.textContent = item.nugget.content;
    }
    
    // Synthesis
    const synthesis = document.createElement('div');
    synthesis.className = 'nugget-synthesis';
    synthesis.style.cssText = `
      font-size: 13px;
      line-height: 1.5;
      color: ${colors.text.secondary};
      font-style: italic;
      border-left: 3px solid ${colors.text.accent};
      padding-left: 12px;
      margin-top: 8px;
    `;
    synthesis.textContent = item.nugget.synthesis;
    
    // Debounced hover effects for better performance
    let hoverTimeout: NodeJS.Timeout;
    nuggetDiv.addEventListener('mouseover', () => {
      clearTimeout(hoverTimeout);
      hoverTimeout = setTimeout(() => {
        nuggetDiv.style.borderColor = colors.text.accent;
        nuggetDiv.style.boxShadow = generateInlineStyles.cardShadowHover();
        if (item.status === 'highlighted') {
          nuggetDiv.style.backgroundColor = colors.background.secondary;
        }
      }, 50);
    });
    
    nuggetDiv.addEventListener('mouseout', () => {
      clearTimeout(hoverTimeout);
      nuggetDiv.style.borderColor = item.status === 'highlighted' ? colors.text.accent : colors.border.light;
      nuggetDiv.style.boxShadow = generateInlineStyles.cardShadow();
      nuggetDiv.style.backgroundColor = colors.background.primary;
    });
    
    // Assemble the content container
    contentContainer.appendChild(headerDiv);
    contentContainer.appendChild(contentPreview);
    contentContainer.appendChild(synthesis);
    
    // Assemble the main element
    nuggetDiv.appendChild(checkboxContainer);
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
      
      this.updateExportPanel();
    }
  }

  private selectAllItems(): void {
    this.allItems.forEach((item, index) => {
      item.selected = true;
      this.selectedItems.add(index);
    });
    this.updateExportPanel();
    this.refreshCurrentPage();
  }

  private clearAllSelections(): void {
    this.allItems.forEach((item, index) => {
      item.selected = false;
      this.selectedItems.delete(index);
    });
    this.updateExportPanel();
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

  private updateExportPanel(): void {
    if (this.exportPanel) {
      const selectedCountSpan = this.exportPanel.querySelector('.selected-count');
      if (selectedCountSpan) {
        selectedCountSpan.textContent = this.selectedItems.size.toString();
      }
    }
    
    if (this.restEndpointPanel) {
      const selectedCountSpan = this.restEndpointPanel.querySelector('.selected-count');
      if (selectedCountSpan) {
        selectedCountSpan.textContent = this.selectedItems.size.toString();
      }
    }
  }

  private createExportPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.style.cssText = `
      border-top: 1px solid ${colors.border.light};
      background: ${colors.background.primary};
      position: sticky;
      bottom: 0;
      z-index: 1;
    `;

    // Export title (clickable header)
    const titleContainer = document.createElement('div');
    titleContainer.style.cssText = `
      padding: ${spacing.md} ${spacing.lg};
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: ${spacing.xs};
      user-select: none;
      transition: background-color 0.2s ease;
    `;

    const titleText = document.createElement('span');
    titleText.textContent = 'Export';
    titleText.style.cssText = `
      font-size: ${typography.fontSize.sm};
      font-weight: ${typography.fontWeight.medium};
      color: ${colors.text.primary};
    `;

    const toggleIcon = document.createElement('span');
    toggleIcon.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>';
    toggleIcon.style.cssText = `
      font-size: ${typography.fontSize.xs};
      color: ${colors.text.secondary};
      transition: transform 0.2s ease;
    `;

    titleContainer.appendChild(titleText);
    titleContainer.appendChild(toggleIcon);

    // Export options container (initially hidden)
    const optionsContainer = document.createElement('div');
    optionsContainer.style.cssText = `
      display: none;
      flex-direction: column;
      gap: ${spacing.sm};
      padding: 0 ${spacing.lg} ${spacing.lg} ${spacing.lg};
      transition: all 0.2s ease;
    `;

    // Add click handler for collapse/expand
    titleContainer.addEventListener('click', () => {
      this.toggleExportPanel(optionsContainer, toggleIcon);
    });

    // Hover effect for title
    titleContainer.addEventListener('mouseenter', () => {
      titleContainer.style.backgroundColor = colors.background.secondary;
    });

    titleContainer.addEventListener('mouseleave', () => {
      titleContainer.style.backgroundColor = 'transparent';
    });

    // Format selection
    const formatRow = document.createElement('div');
    formatRow.style.cssText = `
      display: flex;
      gap: ${spacing.sm};
      align-items: center;
    `;

    const formatLabel = document.createElement('span');
    formatLabel.textContent = 'Format:';
    formatLabel.style.cssText = `
      font-size: ${typography.fontSize.xs};
      color: ${colors.text.secondary};
      min-width: 50px;
    `;

    const markdownBtn = this.createFormatButton('markdown', '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>Markdown');
    const jsonBtn = this.createFormatButton('json', '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M4 12a1 1 0 0 0-1 1v1a1 1 0 0 1-1 1 1 1 0 0 1 1 1v1a1 1 0 0 0 1 1"/><path d="M8 18a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1 1 1 0 0 1-1-1v-1a1 1 0 0 0-1-1"/></svg>JSON');

    formatRow.appendChild(formatLabel);
    formatRow.appendChild(markdownBtn);
    formatRow.appendChild(jsonBtn);

    // Scope selection
    const scopeRow = document.createElement('div');
    scopeRow.style.cssText = `
      display: flex;
      gap: ${spacing.sm};
      align-items: center;
    `;

    const scopeLabel = document.createElement('span');
    scopeLabel.textContent = 'Scope:';
    scopeLabel.style.cssText = `
      font-size: ${typography.fontSize.xs};
      color: ${colors.text.secondary};
      min-width: 50px;
    `;

    const allBtn = this.createScopeButton('all', `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg> All (${this.allItems.length})`);
    const selectedBtn = this.createScopeButton('selected', `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Selected (<span class="selected-count">0</span>)`);

    scopeRow.appendChild(scopeLabel);
    scopeRow.appendChild(allBtn);
    scopeRow.appendChild(selectedBtn);

    // Action buttons
    const actionsRow = document.createElement('div');
    actionsRow.style.cssText = `
      display: flex;
      gap: ${spacing.sm};
      justify-content: center;
    `;

    const exportBtn = this.createActionButton('Export', () => this.handleExport());
    const selectAllBtn = this.createActionButton('Select All', () => this.selectAllItems());
    const clearBtn = this.createActionButton('Clear All', () => this.clearAllSelections());

    actionsRow.appendChild(exportBtn);
    actionsRow.appendChild(selectAllBtn);
    actionsRow.appendChild(clearBtn);

    optionsContainer.appendChild(formatRow);
    optionsContainer.appendChild(scopeRow);
    optionsContainer.appendChild(actionsRow);

    panel.appendChild(titleContainer);
    panel.appendChild(optionsContainer);

    return panel;
  }

  private toggleExportPanel(optionsContainer: HTMLElement, toggleIcon: HTMLElement): void {
    this.exportPanelExpanded = !this.exportPanelExpanded;
    
    if (this.exportPanelExpanded) {
      optionsContainer.style.display = 'flex';
      toggleIcon.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';
    } else {
      optionsContainer.style.display = 'none';
      toggleIcon.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>';
    }
  }

  private createFormatButton(format: string, label: string): HTMLElement {
    const button = document.createElement('button');
    button.innerHTML = label;
    button.dataset.format = format;
    button.style.cssText = `
      padding: ${spacing.xs} ${spacing.sm};
      border: 1px solid ${colors.border.default};
      border-radius: ${borderRadius.sm};
      background: ${colors.background.primary};
      color: ${colors.text.secondary};
      cursor: pointer;
      font-size: ${typography.fontSize.xs};
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0;
      ${format === 'markdown' ? `background: ${colors.background.secondary}; color: ${colors.text.primary};` : ''}
    `;

    button.addEventListener('click', () => {
      // Update active state
      const allFormatButtons = this.exportPanel?.querySelectorAll('[data-format]');
      allFormatButtons?.forEach(btn => {
        (btn as HTMLElement).style.background = colors.background.primary;
        (btn as HTMLElement).style.color = colors.text.secondary;
      });
      
      button.style.background = colors.background.secondary;
      button.style.color = colors.text.primary;
    });

    return button;
  }

  private createScopeButton(scope: string, label: string): HTMLElement {
    const button = document.createElement('button');
    button.innerHTML = label;
    button.dataset.scope = scope;
    button.style.cssText = `
      padding: ${spacing.xs} ${spacing.sm};
      border: 1px solid ${colors.border.default};
      border-radius: ${borderRadius.sm};
      background: ${colors.background.primary};
      color: ${colors.text.secondary};
      cursor: pointer;
      font-size: ${typography.fontSize.xs};
      transition: all 0.2s ease;
      ${scope === 'all' ? `background: ${colors.background.secondary}; color: ${colors.text.primary};` : ''}
    `;

    button.addEventListener('click', () => {
      // Update active state
      const allScopeButtons = this.exportPanel?.querySelectorAll('[data-scope]');
      allScopeButtons?.forEach(btn => {
        (btn as HTMLElement).style.background = colors.background.primary;
        (btn as HTMLElement).style.color = colors.text.secondary;
      });
      
      button.style.background = colors.background.secondary;
      button.style.color = colors.text.primary;
    });

    return button;
  }

  private createActionButton(label: string, onClick: () => void): HTMLElement {
    const button = document.createElement('button');
    button.textContent = label;
    button.style.cssText = `
      padding: ${spacing.xs} ${spacing.sm};
      border: 1px solid ${colors.border.default};
      border-radius: ${borderRadius.sm};
      background: ${colors.background.primary};
      color: ${colors.text.primary};
      cursor: pointer;
      font-size: ${typography.fontSize.xs};
      font-weight: ${typography.fontWeight.medium};
      transition: all 0.2s ease;
    `;

    button.addEventListener('click', onClick);

    button.addEventListener('mouseenter', () => {
      button.style.background = colors.background.secondary;
    });

    button.addEventListener('mouseleave', () => {
      button.style.background = colors.background.primary;
    });

    return button;
  }

  private handleExport(): void {
    const selectedFormat = this.exportPanel?.querySelector('[data-format][style*="background: rgb(252, 252, 252)"]') as HTMLElement;
    const selectedScope = this.exportPanel?.querySelector('[data-scope][style*="background: rgb(252, 252, 252)"]') as HTMLElement;
    
    const format = selectedFormat?.dataset.format || 'markdown';
    const scope = selectedScope?.dataset.scope || 'all';
    
    const nuggets = scope === 'all' ? this.allItems : this.allItems.filter(item => item.selected);
    
    if (scope === 'selected' && nuggets.length === 0) {
      alert('Please select at least one nugget to export.');
      return;
    }
    
    this.exportNuggets(nuggets, format as 'markdown' | 'json');
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

  private createRestEndpointPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.style.cssText = `
      border-top: 1px solid ${colors.border.light};
      background: ${colors.background.primary};
      position: sticky;
      bottom: 0;
      z-index: 1;
    `;

    // REST endpoint title (clickable header)
    const titleContainer = document.createElement('div');
    titleContainer.style.cssText = `
      padding: ${spacing.md} ${spacing.lg};
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: ${spacing.xs};
      user-select: none;
      transition: background-color 0.2s ease;
    `;

    const titleText = document.createElement('span');
    titleText.textContent = 'Send to Endpoint';
    titleText.style.cssText = `
      font-size: ${typography.fontSize.sm};
      font-weight: ${typography.fontWeight.medium};
      color: ${colors.text.primary};
    `;

    const toggleIcon = document.createElement('span');
    toggleIcon.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>';
    toggleIcon.style.cssText = `
      font-size: ${typography.fontSize.xs};
      color: ${colors.text.secondary};
      transition: transform 0.2s ease;
    `;

    titleContainer.appendChild(titleText);
    titleContainer.appendChild(toggleIcon);

    // REST endpoint options container (initially hidden)
    const optionsContainer = document.createElement('div');
    optionsContainer.style.cssText = `
      display: none;
      flex-direction: column;
      gap: ${spacing.sm};
      padding: 0 ${spacing.lg} ${spacing.lg} ${spacing.lg};
      transition: all 0.2s ease;
    `;

    // Add click handler for collapse/expand
    titleContainer.addEventListener('click', () => {
      this.toggleRestEndpointPanel(optionsContainer, toggleIcon);
    });

    // Hover effect for title
    titleContainer.addEventListener('mouseenter', () => {
      titleContainer.style.backgroundColor = colors.background.secondary;
    });

    titleContainer.addEventListener('mouseleave', () => {
      titleContainer.style.backgroundColor = 'transparent';
    });

    // URL input
    const urlRow = document.createElement('div');
    urlRow.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: ${spacing.xs};
    `;

    const urlLabel = document.createElement('label');
    urlLabel.textContent = 'URL:';
    urlLabel.style.cssText = `
      font-size: ${typography.fontSize.xs};
      color: ${colors.text.secondary};
      font-weight: ${typography.fontWeight.medium};
    `;

    const urlInput = document.createElement('input');
    urlInput.type = 'url';
    urlInput.placeholder = 'https://api.example.com/nuggets';
    urlInput.style.cssText = `
      padding: ${spacing.xs} ${spacing.sm};
      border: 1px solid ${colors.border.light};
      border-radius: ${borderRadius.sm};
      font-size: ${typography.fontSize.sm};
      background: ${colors.background.primary};
      color: ${colors.text.primary};
      outline: none;
      transition: border-color 0.2s ease;
    `;

    urlInput.addEventListener('focus', () => {
      urlInput.style.borderColor = colors.border.medium;
    });

    urlInput.addEventListener('blur', () => {
      urlInput.style.borderColor = colors.border.light;
    });

    urlInput.addEventListener('input', (e) => {
      this.restEndpointConfig.url = (e.target as HTMLInputElement).value;
    });

    urlRow.appendChild(urlLabel);
    urlRow.appendChild(urlInput);

    // Method and Content-Type row
    const methodContentRow = document.createElement('div');
    methodContentRow.style.cssText = `
      display: flex;
      gap: ${spacing.sm};
    `;

    const methodContainer = document.createElement('div');
    methodContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: ${spacing.xs};
      flex: 1;
    `;

    const methodLabel = document.createElement('label');
    methodLabel.textContent = 'Method:';
    methodLabel.style.cssText = `
      font-size: ${typography.fontSize.xs};
      color: ${colors.text.secondary};
      font-weight: ${typography.fontWeight.medium};
    `;

    const methodSelect = document.createElement('select');
    methodSelect.style.cssText = `
      padding: ${spacing.xs} ${spacing.sm};
      border: 1px solid ${colors.border.light};
      border-radius: ${borderRadius.sm};
      font-size: ${typography.fontSize.sm};
      background: ${colors.background.primary};
      color: ${colors.text.primary};
      outline: none;
      cursor: pointer;
    `;

    const methodOptions = ['POST', 'PUT', 'PATCH'];
    methodOptions.forEach(method => {
      const option = document.createElement('option');
      option.value = method;
      option.textContent = method;
      methodSelect.appendChild(option);
    });

    methodSelect.addEventListener('change', (e) => {
      this.restEndpointConfig.method = (e.target as HTMLSelectElement).value;
    });

    methodContainer.appendChild(methodLabel);
    methodContainer.appendChild(methodSelect);

    const contentTypeContainer = document.createElement('div');
    contentTypeContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: ${spacing.xs};
      flex: 1;
    `;

    const contentTypeLabel = document.createElement('label');
    contentTypeLabel.textContent = 'Content-Type:';
    contentTypeLabel.style.cssText = `
      font-size: ${typography.fontSize.xs};
      color: ${colors.text.secondary};
      font-weight: ${typography.fontWeight.medium};
    `;

    const contentTypeSelect = document.createElement('select');
    contentTypeSelect.style.cssText = `
      padding: ${spacing.xs} ${spacing.sm};
      border: 1px solid ${colors.border.light};
      border-radius: ${borderRadius.sm};
      font-size: ${typography.fontSize.sm};
      background: ${colors.background.primary};
      color: ${colors.text.primary};
      outline: none;
      cursor: pointer;
    `;

    const contentTypeOptions = ['application/json', 'application/xml', 'application/x-www-form-urlencoded'];
    contentTypeOptions.forEach(contentType => {
      const option = document.createElement('option');
      option.value = contentType;
      option.textContent = contentType;
      contentTypeSelect.appendChild(option);
    });

    contentTypeSelect.addEventListener('change', (e) => {
      this.restEndpointConfig.contentType = (e.target as HTMLSelectElement).value;
    });

    contentTypeContainer.appendChild(contentTypeLabel);
    contentTypeContainer.appendChild(contentTypeSelect);

    methodContentRow.appendChild(methodContainer);
    methodContentRow.appendChild(contentTypeContainer);

    // Headers section
    const headersRow = document.createElement('div');
    headersRow.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: ${spacing.xs};
    `;

    const headersLabel = document.createElement('label');
    headersLabel.textContent = 'Headers:';
    headersLabel.style.cssText = `
      font-size: ${typography.fontSize.xs};
      color: ${colors.text.secondary};
      font-weight: ${typography.fontWeight.medium};
    `;

    const headersContainer = document.createElement('div');
    headersContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: ${spacing.xs};
    `;

    const addHeaderBtn = document.createElement('button');
    addHeaderBtn.textContent = '+ Add Header';
    addHeaderBtn.style.cssText = `
      padding: ${spacing.xs} ${spacing.sm};
      border: 1px solid ${colors.border.light};
      border-radius: ${borderRadius.sm};
      background: ${colors.background.secondary};
      color: ${colors.text.primary};
      font-size: ${typography.fontSize.xs};
      cursor: pointer;
      transition: all 0.2s ease;
    `;

    addHeaderBtn.addEventListener('mouseenter', () => {
      addHeaderBtn.style.backgroundColor = colors.background.tertiary;
    });

    addHeaderBtn.addEventListener('mouseleave', () => {
      addHeaderBtn.style.backgroundColor = colors.background.secondary;
    });

    addHeaderBtn.addEventListener('click', () => {
      this.addHeaderRow(headersContainer);
    });

    headersRow.appendChild(headersLabel);
    headersRow.appendChild(headersContainer);
    headersRow.appendChild(addHeaderBtn);

    // Scope selection
    const scopeRow = document.createElement('div');
    scopeRow.style.cssText = `
      display: flex;
      gap: ${spacing.sm};
      align-items: center;
    `;

    const scopeLabel = document.createElement('span');
    scopeLabel.textContent = 'Scope:';
    scopeLabel.style.cssText = `
      font-size: ${typography.fontSize.xs};
      color: ${colors.text.secondary};
      min-width: 50px;
    `;

    const allBtn = this.createRestScopeButton('all', `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg> All (${this.allItems.length})`);
    const selectedBtn = this.createRestScopeButton('selected', `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Selected (<span class="selected-count">0</span>)`);

    scopeRow.appendChild(scopeLabel);
    scopeRow.appendChild(allBtn);
    scopeRow.appendChild(selectedBtn);

    // Include section
    const includeSection = document.createElement('div');
    includeSection.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: ${spacing.xs};
    `;

    const includeLabel = document.createElement('label');
    includeLabel.textContent = 'Include in Request Body:';
    includeLabel.style.cssText = `
      font-size: ${typography.fontSize.xs};
      color: ${colors.text.secondary};
      font-weight: ${typography.fontWeight.medium};
    `;

    const includeOptions = document.createElement('div');
    includeOptions.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: ${spacing.xs};
      padding-left: ${spacing.sm};
    `;

    // URL checkbox
    const urlCheckbox = this.createCheckbox('includeUrl', 'URL', this.restEndpointConfig.includeUrl);
    urlCheckbox.addEventListener('change', (e) => {
      this.restEndpointConfig.includeUrl = (e.target as HTMLInputElement).checked;
    });

    // Timestamp checkbox
    const timestampCheckbox = this.createCheckbox('includeTimestamp', 'Timestamp', this.restEndpointConfig.includeTimestamp);
    timestampCheckbox.addEventListener('change', (e) => {
      this.restEndpointConfig.includeTimestamp = (e.target as HTMLInputElement).checked;
    });

    // Nuggets checkbox with sub-options
    const nuggetContainer = document.createElement('div');
    nuggetContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: ${spacing.xs};
    `;

    const nuggetCheckbox = this.createCheckbox('includeNuggets', 'Nuggets:', this.restEndpointConfig.includeNuggets);
    nuggetCheckbox.addEventListener('change', (e) => {
      const checked = (e.target as HTMLInputElement).checked;
      this.restEndpointConfig.includeNuggets = checked;
      this.toggleNuggetSubOptions(nuggetSubOptions, checked);
    });

    const nuggetSubOptions = document.createElement('div');
    nuggetSubOptions.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: ${spacing.xs};
      padding-left: ${spacing.lg};
    `;

    const typeCheckbox = this.createCheckbox('nuggetType', 'Type (tool, media...)', this.restEndpointConfig.nuggetParts.type);
    typeCheckbox.addEventListener('change', (e) => {
      this.restEndpointConfig.nuggetParts.type = (e.target as HTMLInputElement).checked;
    });

    const contentCheckbox = this.createCheckbox('nuggetContent', 'Content (original text)', this.restEndpointConfig.nuggetParts.content);
    contentCheckbox.addEventListener('change', (e) => {
      this.restEndpointConfig.nuggetParts.content = (e.target as HTMLInputElement).checked;
    });

    const synthesisCheckbox = this.createCheckbox('nuggetSynthesis', 'Synthesis (relevance note)', this.restEndpointConfig.nuggetParts.synthesis);
    synthesisCheckbox.addEventListener('change', (e) => {
      this.restEndpointConfig.nuggetParts.synthesis = (e.target as HTMLInputElement).checked;
    });

    nuggetSubOptions.appendChild(typeCheckbox);
    nuggetSubOptions.appendChild(contentCheckbox);
    nuggetSubOptions.appendChild(synthesisCheckbox);

    nuggetContainer.appendChild(nuggetCheckbox);
    nuggetContainer.appendChild(nuggetSubOptions);

    includeOptions.appendChild(urlCheckbox);
    includeOptions.appendChild(timestampCheckbox);
    includeOptions.appendChild(nuggetContainer);

    includeSection.appendChild(includeLabel);
    includeSection.appendChild(includeOptions);

    // Action buttons
    const actionsRow = document.createElement('div');
    actionsRow.style.cssText = `
      display: flex;
      gap: ${spacing.sm};
      justify-content: center;
    `;

    const sendBtn = this.createActionButton('Send', () => this.handleRestEndpointSend());
    const testBtn = this.createActionButton('Test Connection', () => this.handleTestConnection());

    actionsRow.appendChild(sendBtn);
    actionsRow.appendChild(testBtn);

    optionsContainer.appendChild(urlRow);
    optionsContainer.appendChild(methodContentRow);
    optionsContainer.appendChild(headersRow);
    optionsContainer.appendChild(scopeRow);
    optionsContainer.appendChild(includeSection);
    optionsContainer.appendChild(actionsRow);

    panel.appendChild(titleContainer);
    panel.appendChild(optionsContainer);

    return panel;
  }

  private toggleRestEndpointPanel(optionsContainer: HTMLElement, toggleIcon: HTMLElement): void {
    this.restEndpointExpanded = !this.restEndpointExpanded;
    
    if (this.restEndpointExpanded) {
      optionsContainer.style.display = 'flex';
      toggleIcon.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';
    } else {
      optionsContainer.style.display = 'none';
      toggleIcon.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>';
    }
  }

  private createRestScopeButton(scope: string, label: string): HTMLElement {
    const button = document.createElement('button');
    button.dataset.scope = scope;
    button.innerHTML = label;
    button.style.cssText = `
      padding: ${spacing.xs} ${spacing.sm};
      border: 1px solid ${colors.border.light};
      border-radius: ${borderRadius.sm};
      background: ${colors.background.primary};
      color: ${colors.text.primary};
      font-size: ${typography.fontSize.xs};
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: ${spacing.xs};
    `;

    if (scope === 'all') {
      button.style.background = colors.background.secondary;
    }

    button.addEventListener('mouseenter', () => {
      button.style.backgroundColor = colors.background.secondary;
    });

    button.addEventListener('mouseleave', () => {
      if (scope === 'all') {
        button.style.backgroundColor = colors.background.secondary;
      } else {
        button.style.backgroundColor = colors.background.primary;
      }
    });

    button.addEventListener('click', () => {
      this.handleRestScopeSelection(scope);
    });

    return button;
  }

  private handleRestScopeSelection(scope: string): void {
    const allButtons = this.restEndpointPanel?.querySelectorAll('[data-scope]');
    allButtons?.forEach((btn) => {
      const button = btn as HTMLElement;
      if (button.dataset.scope === scope) {
        button.style.background = colors.background.secondary;
      } else {
        button.style.background = colors.background.primary;
      }
    });
  }

  private createCheckbox(id: string, label: string, checked: boolean): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = `
      display: flex;
      align-items: center;
      gap: ${spacing.xs};
    `;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = id;
    checkbox.checked = checked;
    checkbox.style.cssText = `
      width: 16px;
      height: 16px;
      cursor: pointer;
    `;

    const labelElement = document.createElement('label');
    labelElement.htmlFor = id;
    labelElement.textContent = label;
    labelElement.style.cssText = `
      font-size: ${typography.fontSize.xs};
      color: ${colors.text.primary};
      cursor: pointer;
    `;

    container.appendChild(checkbox);
    container.appendChild(labelElement);

    return container;
  }

  private toggleNuggetSubOptions(subOptions: HTMLElement, show: boolean): void {
    subOptions.style.display = show ? 'flex' : 'none';
    const checkboxes = subOptions.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      (checkbox as HTMLInputElement).disabled = !show;
    });
  }

  private addHeaderRow(container: HTMLElement): void {
    const headerRow = document.createElement('div');
    headerRow.style.cssText = `
      display: flex;
      gap: ${spacing.xs};
      align-items: center;
    `;

    const keyInput = document.createElement('input');
    keyInput.type = 'text';
    keyInput.placeholder = 'Header name';
    keyInput.style.cssText = `
      padding: ${spacing.xs} ${spacing.sm};
      border: 1px solid ${colors.border.light};
      border-radius: ${borderRadius.sm};
      font-size: ${typography.fontSize.xs};
      background: ${colors.background.primary};
      color: ${colors.text.primary};
      outline: none;
      flex: 1;
    `;

    const valueInput = document.createElement('input');
    valueInput.type = 'text';
    valueInput.placeholder = 'Header value';
    valueInput.style.cssText = `
      padding: ${spacing.xs} ${spacing.sm};
      border: 1px solid ${colors.border.light};
      border-radius: ${borderRadius.sm};
      font-size: ${typography.fontSize.xs};
      background: ${colors.background.primary};
      color: ${colors.text.primary};
      outline: none;
      flex: 2;
    `;

    const removeBtn = document.createElement('button');
    removeBtn.textContent = '×';
    removeBtn.style.cssText = `
      padding: ${spacing.xs};
      border: 1px solid ${colors.border.light};
      border-radius: ${borderRadius.sm};
      background: ${colors.background.primary};
      color: ${colors.text.secondary};
      font-size: ${typography.fontSize.sm};
      cursor: pointer;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    removeBtn.addEventListener('click', () => {
      container.removeChild(headerRow);
      this.updateRestEndpointHeaders();
    });

    const updateHeaders = () => {
      this.updateRestEndpointHeaders();
    };

    keyInput.addEventListener('input', updateHeaders);
    valueInput.addEventListener('input', updateHeaders);

    headerRow.appendChild(keyInput);
    headerRow.appendChild(valueInput);
    headerRow.appendChild(removeBtn);

    container.appendChild(headerRow);
    this.updateRestEndpointHeaders();
  }

  private updateRestEndpointHeaders(): void {
    const headerRows = this.restEndpointPanel?.querySelectorAll('div[style*="display: flex"][style*="gap"]');
    this.restEndpointConfig.headers = [];
    
    headerRows?.forEach(row => {
      const inputs = row.querySelectorAll('input[type="text"]');
      if (inputs.length === 2) {
        const key = (inputs[0] as HTMLInputElement).value.trim();
        const value = (inputs[1] as HTMLInputElement).value.trim();
        if (key && value) {
          this.restEndpointConfig.headers.push({ key, value });
        }
      }
    });
  }

  private async handleRestEndpointSend(): Promise<void> {
    if (!this.restEndpointConfig.url) {
      alert('Please enter a URL');
      return;
    }

    const selectedScope = this.restEndpointPanel?.querySelector('[data-scope][style*="background: rgb(252, 252, 252)"]') as HTMLElement;
    const scope = selectedScope?.dataset.scope || 'all';
    
    const nuggets = scope === 'all' ? this.allItems : this.allItems.filter(item => item.selected);
    
    if (scope === 'selected' && nuggets.length === 0) {
      alert('Please select at least one nugget to send.');
      return;
    }

    try {
      const payload = this.buildRestPayload(nuggets);
      const response = await this.sendToRestEndpoint(payload);
      
      if (response.ok) {
        alert(`Successfully sent to ${this.restEndpointConfig.url}`);
      } else {
        alert(`Failed to send: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('REST endpoint error:', error);
      alert(`Error sending to endpoint: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async handleTestConnection(): Promise<void> {
    if (!this.restEndpointConfig.url) {
      alert('Please enter a URL');
      return;
    }

    try {
      const response = await fetch(this.restEndpointConfig.url, {
        method: 'OPTIONS',
        headers: {
          'Content-Type': this.restEndpointConfig.contentType,
          ...this.restEndpointConfig.headers.reduce((acc, header) => ({
            ...acc,
            [header.key]: header.value
          }), {})
        }
      });

      if (response.ok) {
        alert('Connection test successful!');
      } else {
        alert(`Connection test failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Connection test error:', error);
      alert(`Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private buildRestPayload(nuggets: SidebarNuggetItem[]): any {
    const payload: any = {};

    if (this.restEndpointConfig.includeUrl) {
      payload.url = window.location.href;
    }

    if (this.restEndpointConfig.includeTimestamp) {
      payload.timestamp = new Date().toISOString();
    }

    if (this.restEndpointConfig.includeNuggets) {
      payload.nuggets = nuggets.map(item => {
        const nugget: any = {};
        
        if (this.restEndpointConfig.nuggetParts.type) {
          nugget.type = item.nugget.type;
        }
        
        if (this.restEndpointConfig.nuggetParts.content) {
          nugget.content = item.nugget.content;
        }
        
        if (this.restEndpointConfig.nuggetParts.synthesis) {
          nugget.synthesis = item.nugget.synthesis;
        }
        
        return nugget;
      });
    }

    return payload;
  }

  private async sendToRestEndpoint(payload: any): Promise<Response> {
    const headers: Record<string, string> = {
      'Content-Type': this.restEndpointConfig.contentType
    };

    this.restEndpointConfig.headers.forEach(header => {
      headers[header.key] = header.value;
    });

    let body: string;
    if (this.restEndpointConfig.contentType === 'application/json') {
      body = JSON.stringify(payload);
    } else if (this.restEndpointConfig.contentType === 'application/x-www-form-urlencoded') {
      body = new URLSearchParams(payload).toString();
    } else {
      body = JSON.stringify(payload);
    }

    return fetch(this.restEndpointConfig.url, {
      method: this.restEndpointConfig.method,
      headers,
      body
    });
  }
}