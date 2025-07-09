import { GoldenNugget, SidebarNuggetItem } from '../../shared/types';
import { UI_CONSTANTS } from '../../shared/constants';
import { Highlighter } from './highlighter';
import { Sidebar } from './sidebar';
import { NotificationManager } from './notifications';

export class UIManager {
  private highlighter: Highlighter;
  private sidebar: Sidebar;
  private notifications: NotificationManager;

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

  showNoResultsBanner(): void {
    this.notifications.showInfo('Analysis complete. No golden nuggets were found.');
  }

  async displayResults(nuggets: GoldenNugget[]): Promise<void> {
    // Clear any existing highlights and sidebar
    this.clearResults();

    // Highlight nuggets on the page
    const sidebarItems: SidebarNuggetItem[] = [];
    
    for (const nugget of nuggets) {
      const highlighted = await this.highlighter.highlightNugget(nugget);
      sidebarItems.push({
        nugget,
        status: highlighted ? 'highlighted' : 'not-found'
      });
    }

    // Show sidebar with all nuggets
    this.sidebar.show(sidebarItems);
  }

  clearResults(): void {
    this.highlighter.clearHighlights();
    this.sidebar.hide();
  }

  cleanup(): void {
    this.clearResults();
    this.notifications.cleanup();
  }
}