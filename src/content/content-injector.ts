import { MESSAGE_TYPES, AnalysisRequest, AnalysisResponse } from '../shared/types';
import { ContentExtractor } from './extractors/base';
import { RedditExtractor } from './extractors/reddit';
import { HackerNewsExtractor } from './extractors/hackernews';
import { GenericExtractor } from './extractors/generic';
import { UIManager } from './ui/ui-manager';
import { performanceMonitor, measureContentExtraction, measureDOMOperation } from '../shared/performance';

// Content script functionality that can be dynamically injected
export class ContentInjector {
  private extractor: ContentExtractor | null = null;
  private uiManager: UIManager;
  private initialized = false;

  constructor() {
    this.uiManager = new UIManager();
  }

  private createExtractor(): ContentExtractor {
    const url = window.location.href;
    
    if (url.includes('reddit.com')) {
      return new RedditExtractor();
    } else if (url.includes('news.ycombinator.com')) {
      return new HackerNewsExtractor();
    } else {
      return new GenericExtractor();
    }
  }

  private getExtractor(): ContentExtractor {
    if (!this.extractor) {
      this.extractor = this.createExtractor();
    }
    return this.extractor;
  }

  public initialize(): void {
    if (this.initialized) return;
    
    this.initialized = true;
    
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep the message channel open for async responses
    });

    // Listen for analysis requests from popup
    document.addEventListener('nugget-analyze', (event: Event) => {
      const customEvent = event as CustomEvent;
      this.analyzeContent(customEvent.detail.promptId);
    });
  }

  private async handleMessage(
    request: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: any) => void
  ): Promise<void> {
    try {
      switch (request.type) {
        case MESSAGE_TYPES.ANALYZE_CONTENT:
          await this.analyzeContent(request.promptId);
          sendResponse({ success: true });
          break;

        case MESSAGE_TYPES.ENTER_SELECTION_MODE:
          await this.enterSelectionMode(request.promptId);
          sendResponse({ success: true });
          break;

        case MESSAGE_TYPES.ANALYZE_SELECTED_CONTENT:
          await this.analyzeSelectedContent(request);
          sendResponse({ success: true });
          break;

        case MESSAGE_TYPES.ANALYSIS_COMPLETE:
          if (request.data) {
            await measureDOMOperation('display_results', () => this.handleAnalysisResults(request.data));
          }
          sendResponse({ success: true });
          break;

        case MESSAGE_TYPES.ANALYSIS_ERROR:
          this.uiManager.showErrorBanner(request.error || 'Analysis failed. Please try again.');
          sendResponse({ success: true });
          break;

        case MESSAGE_TYPES.SHOW_ERROR:
          this.uiManager.showErrorBanner(request.message);
          sendResponse({ success: true });
          break;

        case MESSAGE_TYPES.SHOW_API_KEY_ERROR:
          this.uiManager.showApiKeyErrorBanner();
          sendResponse({ success: true });
          break;

        case 'PING':
          sendResponse({ success: true, pong: true });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: (error as Error).message });
    }
  }

  private async analyzeContent(promptId: string): Promise<void> {
    let totalTimerStarted = false;
    let apiTimerStarted = false;
    
    try {
      performanceMonitor.startTimer('total_analysis');
      totalTimerStarted = true;
      
      // Show progress banner
      this.uiManager.showProgressBanner();
      
      // Extract content from the page
      const content = await measureContentExtraction('page_content', () => this.getExtractor().extractContent());
      
      if (!content || content.trim().length === 0) {
        this.uiManager.showErrorBanner('No content found on this page.');
        return;
      }

      // Send analysis request to background script
      const analysisRequest: AnalysisRequest = {
        content: content,
        promptId: promptId,
        url: window.location.href
      };

      performanceMonitor.startTimer('api_request');
      apiTimerStarted = true;
      const response = await this.sendMessageToBackground(MESSAGE_TYPES.ANALYZE_CONTENT, analysisRequest);
      performanceMonitor.logTimer('api_request', 'Background API call');
      apiTimerStarted = false;
      
      if (response.success && response.data) {
        await measureDOMOperation('display_results', () => this.handleAnalysisResults(response.data));
        // Notify popup of successful completion
        chrome.runtime.sendMessage({ type: MESSAGE_TYPES.ANALYSIS_COMPLETE });
      } else {
        this.uiManager.showErrorBanner(response.error || 'Analysis failed. Please try again.');
        // Notify popup of error
        chrome.runtime.sendMessage({ type: MESSAGE_TYPES.ANALYSIS_ERROR });
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      this.uiManager.showErrorBanner('Analysis failed. Please try again.');
      // Notify popup of error
      chrome.runtime.sendMessage({ type: MESSAGE_TYPES.ANALYSIS_ERROR });
    } finally {
      // Only log timers if they were actually started
      if (apiTimerStarted) {
        performanceMonitor.logTimer('api_request', 'Background API call (cleanup)');
      }
      if (totalTimerStarted) {
        performanceMonitor.logTimer('total_analysis', 'Complete analysis workflow');
      }
      performanceMonitor.measureMemory();
    }
  }


  private async enterSelectionMode(promptId?: string): Promise<void> {
    try {
      // Enter selection mode through UI manager
      await this.uiManager.enterSelectionMode(promptId);
    } catch (error) {
      console.error('Failed to enter selection mode:', error);
      this.uiManager.showErrorBanner('Failed to enter selection mode. Please try again.');
    }
  }

  private async analyzeSelectedContent(request: any): Promise<void> {
    let totalTimerStarted = false;
    let apiTimerStarted = false;
    
    try {
      performanceMonitor.startTimer('total_analysis');
      totalTimerStarted = true;
      
      const content = request.content;
      const promptId = request.promptId;
      
      if (!content || content.trim().length === 0) {
        this.uiManager.showErrorBanner('No content selected for analysis.');
        // Exit selection mode on error
        this.uiManager.exitSelectionMode();
        return;
      }

      // Send analysis request to background script
      const analysisRequest: AnalysisRequest = {
        content: content,
        promptId: promptId,
        url: window.location.href
      };

      performanceMonitor.startTimer('api_request');
      apiTimerStarted = true;
      const response = await this.sendMessageToBackground(MESSAGE_TYPES.ANALYZE_CONTENT, analysisRequest);
      performanceMonitor.logTimer('api_request', 'Background API call');
      apiTimerStarted = false;
      
      if (response.success && response.data) {
        await measureDOMOperation('display_results', () => this.handleAnalysisResults(response.data));
        // Exit selection mode after results are displayed
        this.uiManager.exitSelectionMode();
        // Notify popup of successful completion
        chrome.runtime.sendMessage({ type: MESSAGE_TYPES.ANALYSIS_COMPLETE });
      } else {
        this.uiManager.showErrorBanner(response.error || 'Analysis failed. Please try again.');
        // Exit selection mode after error is shown
        this.uiManager.exitSelectionMode();
        // Notify popup of error
        chrome.runtime.sendMessage({ type: MESSAGE_TYPES.ANALYSIS_ERROR });
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      this.uiManager.showErrorBanner('Analysis failed. Please try again.');
      // Exit selection mode after error is shown
      this.uiManager.exitSelectionMode();
      // Notify popup of error
      chrome.runtime.sendMessage({ type: MESSAGE_TYPES.ANALYSIS_ERROR });
    } finally {
      // Only log timers if they were actually started
      if (apiTimerStarted) {
        performanceMonitor.logTimer('api_request', 'Background API call (cleanup)');
      }
      if (totalTimerStarted) {
        performanceMonitor.logTimer('total_analysis', 'Complete analysis workflow');
      }
      performanceMonitor.measureMemory();
    }
  }

  private async handleAnalysisResults(results: any): Promise<void> {
    const nuggets = results.golden_nuggets || [];
    
    if (nuggets.length === 0) {
      this.uiManager.showNoResultsBanner();
      // Still show sidebar with empty state for better UX
      await this.uiManager.displayResults([]);
      return;
    }

    // Highlight nuggets on the page and show sidebar
    await this.uiManager.displayResults(nuggets);
  }

  private sendMessageToBackground(type: string, data?: any): Promise<any> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type, ...data }, (response) => {
        resolve(response);
      });
    });
  }
}

// Global instance management moved to entrypoint