import { GoldenNugget, SidebarNuggetItem, MESSAGE_TYPES, SavedPrompt } from '../../shared/types';
import { Highlighter } from './highlighter';
import { Sidebar } from './sidebar';
import { NotificationManager } from './notifications';
import { performanceMonitor, measureHighlighting, measureDOMOperation } from '../../shared/performance';
import { ContentScraper, Content } from '../../../packages/web-scraper-js/dist/index';
import { storage } from '../../shared/storage';
import { colors, typography, spacing, borderRadius, shadows } from '../../shared/design-system';

export class UIManager {
  private highlighter: Highlighter;
  private sidebar: Sidebar;
  private notifications: NotificationManager;
  private selectionScraper?: ContentScraper;
  private selectionModeActive = false;
  private currentPromptId?: string;
  private controlPanel: HTMLElement | null = null;
  private prompts: SavedPrompt[] = [];
  private keyboardListener?: (event: KeyboardEvent) => void;

  constructor() {
    this.highlighter = new Highlighter();
    this.sidebar = new Sidebar();
    this.notifications = new NotificationManager();
    this.loadPrompts();
  }

  private async loadPrompts(): Promise<void> {
    try {
      this.prompts = await storage.getPrompts();
    } catch (error) {
      console.error('Failed to load prompts:', error);
    }
  }

  showProgressBanner(): void {
    this.notifications.showProgress('Finding golden nuggets...');
  }

  hideProgressBanner(): void {
    this.notifications.hideProgress();
  }

  showErrorBanner(message: string): void {
    this.notifications.showError(message);
  }

  showApiKeyErrorBanner(): void {
    this.notifications.showApiKeyError();
  }

  showNoResultsBanner(): void {
    this.notifications.showInfo('✓ Analysis complete - Check the sidebar for details');
  }

  async displayResults(nuggets: GoldenNugget[]): Promise<void> {
    performanceMonitor.startTimer('display_results');
    
    // Clear any existing highlights and sidebar
    measureDOMOperation('clear_results', () => this.clearResults());

    // Highlight nuggets on the page
    const sidebarItems: SidebarNuggetItem[] = [];
    
    performanceMonitor.startTimer('highlight_nuggets');
    for (const nugget of nuggets) {
      const highlighted = await measureHighlighting('nugget_highlight', () => this.highlighter.highlightNugget(nugget));
      sidebarItems.push({
        nugget,
        status: highlighted ? 'highlighted' : 'not-found'
      });
    }
    performanceMonitor.logTimer('highlight_nuggets', `Highlighted ${nuggets.length} nuggets`);

    // Show sidebar with all nuggets
    measureDOMOperation('show_sidebar', () => this.sidebar.show(sidebarItems, this.highlighter));
    
    performanceMonitor.logTimer('display_results', 'Complete results display');
  }

  clearResults(): void {
    this.highlighter.clearHighlights();
    this.sidebar.hide();
  }

  collapseSidebar(): void {
    this.sidebar.collapse();
  }

  expandSidebar(): void {
    this.sidebar.expand();
  }

  async enterSelectionMode(promptId?: string, contentScraper?: ContentScraper): Promise<void> {
    // Clear any existing results first
    this.clearResults();
    
    // Store the prompt ID for use when analyzing (but allow user to change it)
    this.currentPromptId = promptId;
    
    if (contentScraper) {
      this.selectionScraper = contentScraper;
      this.selectionModeActive = true;
      
      // Listen for selection changes to update control panel
      this.selectionScraper.on('selectionChanged', () => {
        this.updateControlPanel();
      });
    }
    
    // Show simple info banner
    this.notifications.showInfo('Select content to analyze using the checkboxes');
    
    // Add keyboard listener for Esc key
    this.addKeyboardListener();
    
    // Show control panel (like original CommentSelector)
    this.showControlPanel();
  }

  exitSelectionMode(): void {
    if (this.selectionScraper) {
      this.selectionScraper.destroy();
      this.selectionScraper = undefined;
    }
    this.selectionModeActive = false;
    this.currentPromptId = undefined;
    this.notifications.hide();
    
    // Remove keyboard listener
    this.removeKeyboardListener();
    
    // Remove control panel
    if (this.controlPanel) {
      this.controlPanel.style.transform = 'translateY(100px)';
      this.controlPanel.style.opacity = '0';
      
      setTimeout(() => {
        if (this.controlPanel) {
          this.controlPanel.remove();
          this.controlPanel = null;
        }
      }, 300);
    }
  }

  private analyzeSelectedContent(): void {
    if (!this.currentPromptId) {
      this.notifications.showError('No prompt selected for analysis.');
      return;
    }

    // Get selected content
    const selectedContent = this.getSelectedContent();
    if (!selectedContent || !selectedContent.items || selectedContent.items.length === 0) {
      this.notifications.showError('No content selected for analysis.');
      return;
    }

    // Convert selected content to text (same logic as in original CommentSelector)
    const contentParts = [selectedContent.title];
    selectedContent.items.forEach(item => {
      if (item.textContent) {
        contentParts.push(item.textContent);
      } else if (item.htmlContent) {
        // Strip HTML tags for text-only analysis
        const textContent = item.htmlContent.replace(/<[^>]*>/g, '').trim();
        if (textContent) {
          contentParts.push(textContent);
        }
      }
    });
    
    const content = contentParts.filter(part => part && part.trim()).join('\n\n');
    
    if (!content || content.trim().length === 0) {
      this.notifications.showError('Selected content is empty.');
      return;
    }

    // Show loading screen and hide the control panel during analysis
    this.showAnalysisInProgress();

    // Send message directly to background script (like original implementation)
    chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.ANALYZE_SELECTED_CONTENT,
      content: content,
      promptId: this.currentPromptId,
      url: window.location.href
    });
    
    // Note: Selection mode will be exited when analysis completes/fails
    // via the message handlers in content.ts
  }

  isSelectionModeActive(): boolean {
    return this.selectionModeActive;
  }

  getSelectedContent(): Content | null {
    if (this.selectionScraper) {
      const allContent = this.selectionScraper.getContent();
      if (!allContent) return null;
      
      // Filter to only selected items
      const selectedItems = allContent.items.filter(item => item.selected);
      
      // Return content with only selected items
      return {
        ...allContent,
        items: selectedItems
      };
    }
    return null;
  }

  private showControlPanel(): void {
    if (this.controlPanel) {
      this.controlPanel.remove();
    }

    const selectedContent = this.getSelectedContent();
    const totalItems = selectedContent?.items?.length || 0;

    this.controlPanel = document.createElement('div');
    this.controlPanel.className = 'nugget-control-panel';
    this.controlPanel.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 320px;
      background: ${colors.background.primary};
      border: 1px solid ${colors.border.light};
      border-radius: ${borderRadius.lg};
      box-shadow: ${shadows.lg};
      z-index: 10001;
      font-family: ${typography.fontFamily.sans};
      padding: ${spacing.lg};
      transform: translateY(100px);
      opacity: 0;
      transition: all 0.3s ease;
    `;

    // Header with close button
    const headerContainer = document.createElement('div');
    headerContainer.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: ${spacing.md};
    `;

    const header = document.createElement('div');
    header.style.cssText = `
      font-size: ${typography.fontSize.sm};
      font-weight: ${typography.fontWeight.semibold};
      color: ${colors.text.primary};
    `;
    header.textContent = totalItems > 0 ? 'Select Content to Analyze' : 'No Content Found';

    // Close button
    const closeButton = document.createElement('button');
    closeButton.style.cssText = `
      background: none;
      border: none;
      cursor: pointer;
      color: ${colors.text.secondary};
      font-size: ${typography.fontSize.lg};
      padding: ${spacing.xs};
      border-radius: ${borderRadius.sm};
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
    `;
    closeButton.innerHTML = '×';
    closeButton.title = 'Close selection mode (Esc)';

    closeButton.addEventListener('click', () => {
      this.exitSelectionMode();
    });

    closeButton.addEventListener('mouseenter', () => {
      closeButton.style.backgroundColor = colors.background.secondary;
      closeButton.style.color = colors.text.primary;
    });

    closeButton.addEventListener('mouseleave', () => {
      closeButton.style.backgroundColor = 'transparent';
      closeButton.style.color = colors.text.secondary;
    });

    headerContainer.appendChild(header);
    headerContainer.appendChild(closeButton);

    // Counter
    const counter = document.createElement('div');
    counter.className = 'content-counter';
    counter.style.cssText = `
      font-size: ${typography.fontSize.sm};
      color: ${colors.text.secondary};
      margin-bottom: ${spacing.md};
    `;

    // Quick actions
    const quickActions = document.createElement('div');
    quickActions.style.cssText = `
      display: flex;
      gap: ${spacing.sm};
      margin-bottom: ${spacing.md};
    `;

    const selectAllBtn = this.createButton('Select All', () => {
      this.selectAllContent();
    });

    const clearAllBtn = this.createButton('Clear All', () => {
      this.clearAllContent();
    });

    quickActions.appendChild(selectAllBtn);
    quickActions.appendChild(clearAllBtn);

    // Prompt selection
    const promptSection = document.createElement('div');
    promptSection.style.cssText = `
      margin-bottom: ${spacing.md};
    `;

    const promptLabel = document.createElement('div');
    promptLabel.style.cssText = `
      font-size: ${typography.fontSize.sm};
      font-weight: ${typography.fontWeight.medium};
      color: ${colors.text.primary};
      margin-bottom: ${spacing.sm};
    `;
    promptLabel.textContent = 'Prompt:';

    const promptSelect = document.createElement('select');
    promptSelect.style.cssText = `
      width: 100%;
      padding: ${spacing.sm};
      border: 1px solid ${colors.border.light};
      border-radius: ${borderRadius.sm};
      background-color: ${colors.background.primary};
      color: ${colors.text.primary};
      font-size: ${typography.fontSize.sm};
    `;

    // Auto-select default prompt if none is selected (e.g., from right-click menu)
    if (!this.currentPromptId && this.prompts.length > 0) {
      const defaultPrompt = this.prompts.find(p => p.isDefault) || this.prompts[0];
      this.currentPromptId = defaultPrompt.id;
    }

    this.prompts.forEach(prompt => {
      const option = document.createElement('option');
      option.value = prompt.id;
      option.textContent = prompt.name;
      if (prompt.id === this.currentPromptId) {
        option.selected = true;
      }
      promptSelect.appendChild(option);
    });

    // Set initial value and add change listener
    promptSelect.value = this.currentPromptId || '';
    promptSelect.addEventListener('change', () => {
      this.currentPromptId = promptSelect.value;
    });

    promptSection.appendChild(promptLabel);
    promptSection.appendChild(promptSelect);

    // Analyze button
    const analyzeBtn = document.createElement('button');
    analyzeBtn.style.cssText = `
      width: 100%;
      padding: ${spacing.md};
      background-color: ${colors.text.accent};
      color: ${colors.background.primary};
      border: none;
      border-radius: ${borderRadius.md};
      font-size: ${typography.fontSize.sm};
      font-weight: ${typography.fontWeight.semibold};
      cursor: pointer;
      transition: all 0.2s ease;
    `;
    analyzeBtn.textContent = 'Analyze Selected Content';

    analyzeBtn.addEventListener('click', () => {
      this.analyzeSelectedContent();
    });

    analyzeBtn.addEventListener('mouseenter', () => {
      analyzeBtn.style.backgroundColor = colors.text.accent;
      analyzeBtn.style.boxShadow = shadows.md;
    });

    analyzeBtn.addEventListener('mouseleave', () => {
      analyzeBtn.style.backgroundColor = colors.text.accent;
      analyzeBtn.style.boxShadow = 'none';
    });

    // Assemble panel
    this.controlPanel.appendChild(headerContainer);
    this.controlPanel.appendChild(counter);
    this.controlPanel.appendChild(quickActions);
    this.controlPanel.appendChild(promptSection);
    this.controlPanel.appendChild(analyzeBtn);

    document.body.appendChild(this.controlPanel);

    // Animate in
    requestAnimationFrame(() => {
      this.controlPanel!.style.transform = 'translateY(0)';
      this.controlPanel!.style.opacity = '1';
    });

    this.updateControlPanel();
  }

  private createButton(text: string, onClick: () => void): HTMLElement {
    const button = document.createElement('button');
    button.style.cssText = `
      flex: 1;
      padding: ${spacing.sm};
      background-color: ${colors.background.secondary};
      color: ${colors.text.primary};
      border: 1px solid ${colors.border.light};
      border-radius: ${borderRadius.sm};
      font-size: ${typography.fontSize.xs};
      font-weight: ${typography.fontWeight.medium};
      cursor: pointer;
      transition: all 0.2s ease;
    `;
    button.textContent = text;

    button.addEventListener('click', onClick);
    button.addEventListener('mouseenter', () => {
      button.style.backgroundColor = colors.background.primary;
      button.style.borderColor = colors.border.default;
    });
    button.addEventListener('mouseleave', () => {
      button.style.backgroundColor = colors.background.secondary;
      button.style.borderColor = colors.border.light;
    });

    return button;
  }

  private updateControlPanel(): void {
    if (!this.controlPanel) return;

    const selectedContent = this.getSelectedContent();
    const allContent = this.selectionScraper?.getContent();
    const selectedCount = selectedContent?.items?.length || 0;
    const totalCount = allContent?.items?.length || 0;

    const counter = this.controlPanel.querySelector('.content-counter');
    if (counter) {
      if (totalCount === 0) {
        counter.textContent = 'No content detected on this page.';
      } else {
        counter.textContent = `${selectedCount} of ${totalCount} items selected`;
      }
    }
  }

  private selectAllContent(): void {
    if (this.selectionScraper) {
      const content = this.selectionScraper.getContent();
      if (content) {
        // Simulate clicking checkboxes for items that are not already selected
        content.items.forEach(item => {
          if (!item.selected) {
            this.simulateCheckboxClick(item.element);
          }
        });
      }
    }
  }

  private clearAllContent(): void {
    if (this.selectionScraper) {
      const content = this.selectionScraper.getContent();
      if (content) {
        // Simulate clicking checkboxes for items that are currently selected
        content.items.forEach(item => {
          if (item.selected) {
            this.simulateCheckboxClick(item.element);
          }
        });
      }
    }
  }

  private simulateCheckboxClick(element: HTMLElement): void {
    // Find the checkbox associated with this element
    // Checkboxes are positioned near the target elements
    const checkboxes = document.querySelectorAll('div[style*="position: absolute"][style*="width: 18px"][style*="height: 18px"]');
    
    for (const checkbox of checkboxes) {
      const checkboxEl = checkbox as HTMLElement;
      // Check if this checkbox is near the target element by comparing positions
      const elementRect = element.getBoundingClientRect();
      const checkboxRect = checkboxEl.getBoundingClientRect();
      
      // Allow some tolerance for positioning differences
      const tolerance = 50;
      if (Math.abs(checkboxRect.top - elementRect.top) < tolerance &&
          Math.abs(checkboxRect.left - (elementRect.left - 25)) < tolerance) {
        // Found the checkbox for this element, simulate click
        checkboxEl.click();
        break;
      }
    }
  }

  private addKeyboardListener(): void {
    // Create the keyboard listener function
    this.keyboardListener = (event: KeyboardEvent) => {
      // Only handle Esc key when selection mode is active
      if (event.key === 'Escape' && this.selectionModeActive) {
        event.preventDefault();
        event.stopPropagation();
        this.exitSelectionMode();
      }
    };
    
    // Add the listener to the document
    document.addEventListener('keydown', this.keyboardListener, { capture: true });
  }

  private removeKeyboardListener(): void {
    if (this.keyboardListener) {
      document.removeEventListener('keydown', this.keyboardListener, { capture: true });
      this.keyboardListener = undefined;
    }
  }

  private showAnalysisInProgress(): void {
    // Hide the control panel temporarily
    if (this.controlPanel) {
      this.controlPanel.style.opacity = '0.3';
      this.controlPanel.style.pointerEvents = 'none';
    }
    
    // Show loading notification
    this.notifications.showProgress('Analyzing selected content...');
  }

  // Method to restore control panel after analysis (called from content.ts)
  restoreSelectionMode(): void {
    if (this.controlPanel && this.selectionModeActive) {
      this.controlPanel.style.opacity = '1';
      this.controlPanel.style.pointerEvents = 'auto';
    }
    this.notifications.hideProgress();
  }

  cleanup(): void {
    this.clearResults();
    this.notifications.cleanup();
    this.exitSelectionMode();
  }
}