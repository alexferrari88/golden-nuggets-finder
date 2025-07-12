import { GoldenNugget, SidebarNuggetItem } from '../../shared/types';
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
    
    if (contentScraper) {
      this.selectionScraper = contentScraper;
      // Run the content scraper to display checkboxes for selection
      await this.selectionScraper.run();
      this.selectionModeActive = true;
    }
    
    // Show info banner
    this.notifications.showInfo('Select content to analyze using the checkboxes, then click "Analyze Selected Content"');
  }

  exitSelectionMode(): void {
    if (this.selectionScraper) {
      this.selectionScraper.destroy();
      this.selectionScraper = undefined;
    }
    this.selectionModeActive = false;
    this.notifications.hide();
  }

  isSelectionModeActive(): boolean {
    return this.selectionModeActive;
  }

  getSelectedContent(): Content | null {
    if (this.selectionScraper) {
      return this.selectionScraper.getContent();
    }
    return null;
  }

  cleanup(): void {
    this.clearResults();
    this.notifications.cleanup();
    this.exitSelectionMode();
  }
}