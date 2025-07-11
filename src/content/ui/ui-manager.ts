import { GoldenNugget, SidebarNuggetItem } from '../../shared/types';
import { UI_CONSTANTS } from '../../shared/constants';
import { Highlighter } from './highlighter';
import { Sidebar } from './sidebar';
import { NotificationManager } from './notifications';
import { CommentSelector } from './comment-selector';
import { performanceMonitor, measureHighlighting, measureDOMOperation } from '../../shared/performance';

export class UIManager {
  private highlighter: Highlighter;
  private sidebar: Sidebar;
  private notifications: NotificationManager;
  private commentSelector: CommentSelector;

  constructor() {
    this.highlighter = new Highlighter();
    this.sidebar = new Sidebar();
    this.notifications = new NotificationManager();
    this.commentSelector = new CommentSelector();
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

  async enterSelectionMode(promptId?: string): Promise<void> {
    // Clear any existing results first
    this.clearResults();
    
    // Enter comment selection mode
    await this.commentSelector.enterSelectionMode(promptId);
    
    // Show info banner
    this.notifications.showInfo('Select comments to analyze, then click "Analyze Selected Comments"');
  }

  exitSelectionMode(): void {
    this.commentSelector.exitSelectionMode();
    this.notifications.hide();
  }

  isSelectionModeActive(): boolean {
    return this.commentSelector.isSelectionModeActive();
  }

  getSelectedComments(): string[] {
    return this.commentSelector.getSelectedComments();
  }

  cleanup(): void {
    this.clearResults();
    this.notifications.cleanup();
    this.commentSelector.exitSelectionMode();
  }
}