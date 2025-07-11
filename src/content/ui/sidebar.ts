import { SidebarNuggetItem } from '../../shared/types';
import { Highlighter } from './highlighter';
import { 
  createStyledElement, 
  applySidebarStyles, 
  applyToggleButtonStyles, 
  applyButtonStyles, 
  applyCardStyles, 
  applyBadgeStyles,
  colors, 
  spacing, 
  shadows, 
  borderRadius, 
  typography, 
  zIndex 
} from './tailwind-utils';

export class Sidebar {
  private sidebar: HTMLElement | null = null;
  private toggleButton: HTMLElement | null = null;
  private itemsPerPage = 20;
  private currentPage = 0;
  private allItems: SidebarNuggetItem[] = [];
  private isCollapsed = false;
  private highlighter: Highlighter | null = null;
  private selectedItems: Set<number> = new Set();
  private exportPanel: HTMLElement | null = null;
  private exportPanelExpanded: boolean = false;

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
    this.highlighter = highlighter || null;
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
      this.toggleButton.style.display = 'flex';
      // Add slide-in animation class
      this.toggleButton.classList.add('slide-in');
      
      // Add pulse animation for discoverability after slide-in completes
      setTimeout(() => {
        if (this.toggleButton && this.toggleButton.parentElement) {
          this.toggleButton.classList.add('pulse');
          // Remove pulse after 3 cycles (9 seconds)
          setTimeout(() => {
            if (this.toggleButton) {
              this.toggleButton.classList.remove('pulse');
            }
          }, 9000);
        }
      }, 2000);
    }
  }

  private hideToggleButton(): void {
    if (this.toggleButton) {
      // Remove any animation classes first
      this.toggleButton.classList.remove('slide-in', 'pulse');
      
      // Slide out animation before hiding
      this.toggleButton.style.transform = 'translateY(-50%) translateX(120%)';
      setTimeout(() => {
        if (this.toggleButton) {
          this.toggleButton.style.display = 'none';
        }
      }, 200);
    }
  }

  private createToggleButton(): HTMLElement {
    const button = document.createElement('button');
    
    // Create SVG icon for sidebar expand
    const svgIcon = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="4" x2="20" y1="6" y2="6"/>
        <line x1="4" x2="20" y1="12" y2="12"/>
        <line x1="4" x2="20" y1="18" y2="18"/>
      </svg>
    `;
    
    button.innerHTML = svgIcon;
    button.className = 'nugget-toggle-button';
    button.setAttribute('aria-label', 'Expand Golden Nuggets sidebar');
    button.setAttribute('title', 'Show Golden Nuggets');
    button.setAttribute('role', 'button');
    button.setAttribute('tabindex', '0');
    
    // Apply toggle button styles using Tailwind utilities
    applyToggleButtonStyles(button);
    
    // Add custom styles that aren't covered by utility functions
    button.style.cssText += `
      writing-mode: vertical-lr;
      text-orientation: mixed;
      display: none;
    `;
    
    // Add text label
    const label = document.createElement('span');
    label.textContent = 'Nuggets';
    label.classList.add('text-xs', 'font-semibold', 'text-gray-500', 'mt-1', 'tracking-wide');
    label.style.cssText = `
      writing-mode: vertical-lr;
      text-orientation: mixed;
    `;
    
    button.appendChild(label);
    
    // Enhanced event handlers
    button.addEventListener('click', () => {
      this.expand();
    });
    
    button.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.expand();
      }
    });
    
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'translateY(-50%) translateX(0)';
      button.classList.remove('text-gray-500');
      button.classList.add('text-gray-800', 'shadow-lg', 'opacity-100');
      label.classList.remove('text-gray-500');
      label.classList.add('text-gray-800');
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.transform = 'translateY(-50%) translateX(100%)';
      button.classList.remove('text-gray-800', 'shadow-lg', 'opacity-100');
      button.classList.add('text-gray-500', 'opacity-80');
      label.classList.remove('text-gray-800');
      label.classList.add('text-gray-500');
    });
    
    button.addEventListener('focus', () => {
      button.classList.add('outline-none', 'ring-2', 'ring-gray-900', 'ring-offset-2');
    });
    
    button.addEventListener('blur', () => {
      button.classList.remove('outline-none', 'ring-2', 'ring-gray-900', 'ring-offset-2');
    });
    
    // Subtle slide-in animation when button becomes visible
    const slideIn = () => {
      button.style.transform = 'translateY(-50%) translateX(85%)';
      setTimeout(() => {
        button.style.transform = 'translateY(-50%) translateX(100%)';
      }, 100);
    };
    
    // Trigger slide-in animation after a brief delay
    setTimeout(slideIn, 300);
    
    // Add pulse animation for discoverability after button has been shown for a few seconds
    setTimeout(() => {
      if (button && button.parentElement) {
        button.classList.add('pulse');
        // Remove pulse after 3 cycles (9 seconds)
        setTimeout(() => {
          button.classList.remove('pulse');
        }, 9000);
      }
    }, 2000);
    
    return button;
  }

  private createSidebar(): HTMLElement {
    const sidebar = document.createElement('div');
    sidebar.className = 'nugget-sidebar';
    applySidebarStyles(sidebar, { width: 'normal', position: 'right' });
    
    // Add custom styles not covered by utility
    sidebar.style.cssText += `
      width: 384px;
      transform: translateX(0);
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
    
    return sidebar;
  }
  
  private createOptimizedHeader(): HTMLElement {
    const header = document.createElement('div');
    header.classList.add(
      'p-6', 'border-b', 'border-gray-100', 'bg-white', 
      'flex', 'justify-between', 'items-center', 'font-semibold',
      'sticky', 'top-0', 'z-10'
    );
    
    const title = document.createElement('h3');
    title.textContent = `Golden Nuggets (${this.allItems.length})`;
    title.classList.add('m-0', 'text-lg', 'text-gray-800', 'font-semibold');
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.classList.add(
      'bg-transparent', 'border-none', 'text-xl', 'cursor-pointer',
      'p-2', 'w-8', 'h-8', 'flex', 'items-center', 'justify-center',
      'rounded-lg', 'transition-colors', 'duration-200', 'text-gray-500'
    );
    
    // Debounced collapse handler
    let collapseTimeout: NodeJS.Timeout;
    closeBtn.addEventListener('click', () => {
      clearTimeout(collapseTimeout);
      collapseTimeout = setTimeout(() => this.collapse(), 100);
    });
    
    closeBtn.addEventListener('mouseover', () => {
      closeBtn.classList.add('bg-gray-25');
    });
    closeBtn.addEventListener('mouseout', () => {
      closeBtn.classList.remove('bg-gray-25');
    });
    
    header.appendChild(title);
    header.appendChild(closeBtn);
    
    return header;
  }
  
  private createNuggetList(): HTMLElement {
    const nuggetList = document.createElement('div');
    nuggetList.id = 'nugget-list-container';
    nuggetList.classList.add('p-6');
    
    if (this.allItems.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.classList.add(
        'text-center', 'py-12', 'px-6', 'bg-white', 
        'rounded-xl', 'border', 'border-gray-100'
      );
      
      // Create content with icon, heading, and helpful text
      emptyState.innerHTML = `
        <div style="margin-bottom: 16px; opacity: 0.6;"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg></div>
        <h3 class="m-0 mb-3 text-lg font-semibold text-gray-800">
          No Golden Nuggets Found
        </h3>
        <p class="m-0 mb-4 text-gray-500 text-sm leading-relaxed">
          The AI analyzed this page but didn't find any valuable insights, tools, or explanations that match your interests.
        </p>
        <div class="text-xs text-gray-500 leading-normal">
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
    paginationDiv.classList.add(
      'flex', 'justify-center', 'gap-3', 'mt-5', 'p-5'
    );
    
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
    pageInfo.classList.add('self-center', 'text-gray-500', 'text-sm');
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
    applyButtonStyles(button, 'primary');
    button.classList.add('px-4', 'py-2', 'text-sm');
    
    button.addEventListener('click', onClick);
    // Hover styles are handled by the utility function
    
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
    applyCardStyles(nuggetDiv, item.status === 'highlighted');
    nuggetDiv.classList.add('gap-3', 'relative');
    
    // Add conditional border color for highlighted items
    if (item.status === 'highlighted') {
      nuggetDiv.classList.add('border-gray-900', 'cursor-pointer');
    } else {
      nuggetDiv.classList.add('cursor-default');
    }
    
    // Add click handler for highlighted nuggets
    if (item.status === 'highlighted' && this.highlighter) {
      // Add visual indicator for clickable items
      const clickIndicator = document.createElement('div');
      clickIndicator.classList.add(
        'absolute', 'top-4', 'right-4', 'w-2', 'h-2', 
        'bg-gray-900', 'rounded-full', 'opacity-60'
      );
      nuggetDiv.appendChild(clickIndicator);
      
      nuggetDiv.addEventListener('click', () => {
        this.highlighter?.scrollToHighlight(item.nugget);
        // Remove the dot indicator after clicking
        clickIndicator.remove();
      });
    }
    
    // Create checkbox container
    const checkboxContainer = document.createElement('div');
    checkboxContainer.classList.add(
      'flex', 'items-start', 'pt-0.5', 'flex-shrink-0'
    );
    
    // Create checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = item.selected;
    checkbox.classList.add(
      'w-4', 'h-4', 'm-0', 'accent-gray-900', 'border', 
      'border-gray-300', 'rounded-sm', 'cursor-pointer'
    );
    
    // Add checkbox change handler
    checkbox.addEventListener('change', (e) => {
      e.stopPropagation();
      const globalIndex = this.currentPage * this.itemsPerPage + index;
      this.toggleItemSelection(globalIndex);
    });
    
    checkboxContainer.appendChild(checkbox);
    
    // Create content container
    const contentContainer = document.createElement('div');
    contentContainer.classList.add('flex-1', 'min-w-0');
    
    // Use DocumentFragment for efficient DOM construction
    const fragment = document.createDocumentFragment();
    
    // Header with type badge and status
    const headerDiv = document.createElement('div');
    headerDiv.classList.add(
      'flex', 'justify-between', 'items-start', 'mb-2'
    );
    
    // Type badge
    const typeBadge = document.createElement('span');
    typeBadge.className = 'nugget-type-badge';
    typeBadge.textContent = item.nugget.type;
    applyBadgeStyles(typeBadge, 'accent');
    typeBadge.classList.add('bg-gray-900', 'text-white', 'px-2', 'py-1', 'rounded-md');
    
    headerDiv.appendChild(typeBadge);
    
    // Content preview with lazy loading
    const contentPreview = document.createElement('div');
    contentPreview.className = 'nugget-content';
    contentPreview.classList.add(
      'mb-3', 'text-sm', 'leading-relaxed', 'text-gray-800',
      'max-h-20', 'overflow-hidden', 'relative'
    );
    
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
      expandButton.classList.add(
        'text-gray-900', 'cursor-pointer', 'font-medium', 'text-xs',
        'ml-1', 'px-1.5', 'py-0.5', 'rounded', 'bg-gray-900/[0.02]',
        'border', 'border-gray-900/[0.06]', 'transition-all', 'duration-200',
        'inline-block'
      );
      
      expandButton.addEventListener('mouseenter', () => {
        expandButton.classList.add('bg-gray-900/[0.04]', 'border-gray-200');
      });
      
      expandButton.addEventListener('mouseleave', () => {
        expandButton.classList.remove('bg-gray-900/[0.04]', 'border-gray-200');
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
    synthesis.classList.add(
      'text-xs', 'leading-relaxed', 'text-gray-500', 'italic',
      'border-l-2', 'border-gray-900', 'pl-3', 'mt-2'
    );
    synthesis.textContent = item.nugget.synthesis;
    
    // Debounced hover effects for better performance
    let hoverTimeout: NodeJS.Timeout;
    nuggetDiv.addEventListener('mouseover', () => {
      clearTimeout(hoverTimeout);
      hoverTimeout = setTimeout(() => {
        nuggetDiv.classList.add('border-gray-900', 'shadow-md');
        if (item.status === 'highlighted') {
          nuggetDiv.classList.add('bg-gray-25');
        }
      }, 50);
    });
    
    nuggetDiv.addEventListener('mouseout', () => {
      clearTimeout(hoverTimeout);
      nuggetDiv.classList.remove('border-gray-900', 'shadow-md', 'bg-gray-25');
      if (item.status === 'highlighted') {
        nuggetDiv.classList.add('border-gray-900');
      } else {
        nuggetDiv.classList.add('border-gray-100');
      }
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
      document.body.style.marginRight = '384px';
      document.body.style.transition = 'margin-right 0.3s ease';
    } else {
      // Remove margin
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
  }

  private createExportPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.classList.add(
      'border-t', 'border-gray-100', 'bg-white', 
      'sticky', 'bottom-0', 'z-10'
    );

    // Export title (clickable header)
    const titleContainer = document.createElement('div');
    titleContainer.classList.add(
      'p-3', 'px-4', 'cursor-pointer', 'flex', 'items-center',
      'gap-1', 'select-none', 'transition-colors', 'duration-200'
    );

    const titleText = document.createElement('span');
    titleText.textContent = 'Export';
    titleText.classList.add('text-sm', 'font-medium', 'text-gray-800');

    const toggleIcon = document.createElement('span');
    toggleIcon.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>';
    toggleIcon.classList.add('text-xs', 'text-gray-500', 'transition-transform', 'duration-200');

    titleContainer.appendChild(titleText);
    titleContainer.appendChild(toggleIcon);

    // Export options container (initially hidden)
    const optionsContainer = document.createElement('div');
    optionsContainer.classList.add(
      'hidden', 'flex-col', 'gap-2', 'px-4', 'pb-4', 
      'transition-all', 'duration-200'
    );

    // Add click handler for collapse/expand
    titleContainer.addEventListener('click', () => {
      this.toggleExportPanel(optionsContainer, toggleIcon);
    });

    // Hover effect for title
    titleContainer.addEventListener('mouseenter', () => {
      titleContainer.classList.add('bg-gray-25');
    });

    titleContainer.addEventListener('mouseleave', () => {
      titleContainer.classList.remove('bg-gray-25');
    });

    // Format selection
    const formatRow = document.createElement('div');
    formatRow.classList.add('flex', 'gap-2', 'items-center');

    const formatLabel = document.createElement('span');
    formatLabel.textContent = 'Format:';
    formatLabel.classList.add('text-xs', 'text-gray-500', 'min-w-12');

    const markdownBtn = this.createFormatButton('markdown', '□ Markdown');
    const jsonBtn = this.createFormatButton('json', '{ } JSON');

    formatRow.appendChild(formatLabel);
    formatRow.appendChild(markdownBtn);
    formatRow.appendChild(jsonBtn);

    // Scope selection
    const scopeRow = document.createElement('div');
    scopeRow.classList.add('flex', 'gap-2', 'items-center');

    const scopeLabel = document.createElement('span');
    scopeLabel.textContent = 'Scope:';
    scopeLabel.classList.add('text-xs', 'text-gray-500', 'min-w-12');

    const allBtn = this.createScopeButton('all', `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg> All (${this.allItems.length})`);
    const selectedBtn = this.createScopeButton('selected', `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Selected (<span class="selected-count">0</span>)`);

    scopeRow.appendChild(scopeLabel);
    scopeRow.appendChild(allBtn);
    scopeRow.appendChild(selectedBtn);

    // Action buttons
    const actionsRow = document.createElement('div');
    actionsRow.classList.add('flex', 'gap-2', 'justify-center');

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
      optionsContainer.classList.remove('hidden');
      optionsContainer.classList.add('flex');
      toggleIcon.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';
    } else {
      optionsContainer.classList.remove('flex');
      optionsContainer.classList.add('hidden');
      toggleIcon.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>';
    }
  }

  private createFormatButton(format: string, label: string): HTMLElement {
    const button = document.createElement('button');
    button.textContent = label;
    button.dataset.format = format;
    button.classList.add(
      'px-2', 'py-1', 'border', 'border-gray-200', 'rounded-sm',
      'bg-white', 'text-gray-500', 'cursor-pointer', 'text-xs',
      'transition-all', 'duration-200'
    );
    
    // Add active state for markdown by default
    if (format === 'markdown') {
      button.classList.add('bg-gray-25', 'text-gray-800');
    }

    button.addEventListener('click', () => {
      // Update active state
      const allFormatButtons = this.exportPanel?.querySelectorAll('[data-format]');
      allFormatButtons?.forEach(btn => {
        (btn as HTMLElement).classList.remove('bg-gray-25', 'text-gray-800');
        (btn as HTMLElement).classList.add('bg-white', 'text-gray-500');
      });
      
      button.classList.remove('bg-white', 'text-gray-500');
      button.classList.add('bg-gray-25', 'text-gray-800');
    });

    return button;
  }

  private createScopeButton(scope: string, label: string): HTMLElement {
    const button = document.createElement('button');
    button.innerHTML = label;
    button.dataset.scope = scope;
    button.classList.add(
      'px-2', 'py-1', 'border', 'border-gray-200', 'rounded-sm',
      'bg-white', 'text-gray-500', 'cursor-pointer', 'text-xs',
      'transition-all', 'duration-200'
    );
    
    // Add active state for "all" by default
    if (scope === 'all') {
      button.classList.add('bg-gray-25', 'text-gray-800');
    }

    button.addEventListener('click', () => {
      // Update active state
      const allScopeButtons = this.exportPanel?.querySelectorAll('[data-scope]');
      allScopeButtons?.forEach(btn => {
        (btn as HTMLElement).classList.remove('bg-gray-25', 'text-gray-800');
        (btn as HTMLElement).classList.add('bg-white', 'text-gray-500');
      });
      
      button.classList.remove('bg-white', 'text-gray-500');
      button.classList.add('bg-gray-25', 'text-gray-800');
    });

    return button;
  }

  private createActionButton(label: string, onClick: () => void): HTMLElement {
    const button = document.createElement('button');
    button.textContent = label;
    button.classList.add(
      'px-2', 'py-1', 'border', 'border-gray-200', 'rounded-sm',
      'bg-white', 'text-gray-800', 'cursor-pointer', 'text-xs',
      'font-medium', 'transition-all', 'duration-200'
    );

    button.addEventListener('click', onClick);

    button.addEventListener('mouseenter', () => {
      button.classList.add('bg-gray-25');
    });

    button.addEventListener('mouseleave', () => {
      button.classList.remove('bg-gray-25');
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
}