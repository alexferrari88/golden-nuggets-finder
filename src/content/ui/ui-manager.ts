import { GoldenNugget, SidebarNuggetItem, MESSAGE_TYPES } from '../../shared/types';
import { Highlighter } from './highlighter';
import { Sidebar } from './sidebar';
import { NotificationManager } from './notifications';
import { performanceMonitor, measureHighlighting, measureDOMOperation } from '../../shared/performance';
import { ContentScraper, Content } from '../../../packages/web-scraper-js/dist/index';

export class UIManager {
  private highlighter: Highlighter;
  private sidebar: Sidebar;
  private notifications: NotificationManager;
  private selectionScraper?: ContentScraper;
  private selectionModeActive = false;
  private currentPromptId?: string;

  constructor() {
    this.highlighter = new Highlighter();
    this.sidebar = new Sidebar();
    this.notifications = new NotificationManager();
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
    
    // Store the prompt ID for use when analyzing
    this.currentPromptId = promptId;
    
    if (contentScraper) {
      this.selectionScraper = contentScraper;
      this.selectionModeActive = true;
    }
    
    // Show info banner with action button
    this.notifications.showInfo('Select content to analyze using the checkboxes', {
      showButton: true,
      buttonText: 'Analyze Selected Content',
      onButtonClick: () => this.analyzeSelectedContent()
    });
  }

  exitSelectionMode(): void {
    if (this.selectionScraper) {
      this.selectionScraper.destroy();
      this.selectionScraper = undefined;
    }
    this.selectionModeActive = false;
    this.currentPromptId = undefined;
    this.notifications.hide();
  }

  private analyzeSelectedContent(): void {
    console.log('[Selection Debug] Analyze button clicked');
    
    if (!this.currentPromptId) {
      console.log('[Selection Debug] No prompt ID available');
      this.notifications.showError('No prompt selected for analysis.');
      return;
    }

    console.log(`[Selection Debug] Sending analysis message with promptId: ${this.currentPromptId}`);
    
    // Send message to trigger analysis
    chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.ANALYZE_SELECTED_CONTENT,
      promptId: this.currentPromptId
    });
  }

  isSelectionModeActive(): boolean {
    return this.selectionModeActive;
  }

  getSelectedContent(): Content | null {
    if (this.selectionScraper) {
      const allContent = this.selectionScraper.getContent();
      if (!allContent) {
        console.log('[Selection Debug] No content available from scraper');
        return null;
      }
      
      // Filter to only selected items
      const selectedItems = allContent.items.filter(item => item.selected);
      console.log(`[Selection Debug] Total items: ${allContent.items.length}, Selected items: ${selectedItems.length}`);
      
      // Log selection state for debugging
      allContent.items.forEach((item, index) => {
        console.log(`[Selection Debug] Item ${index}: selected=${item.selected}, text="${item.textContent?.substring(0, 50)}..."`);
      });
      
      // Return content with only selected items
      return {
        ...allContent,
        items: selectedItems
      };
    }
    console.log('[Selection Debug] No selection scraper available');
    return null;
  }

  cleanup(): void {
    this.clearResults();
    this.notifications.cleanup();
    this.exitSelectionMode();
  }
}