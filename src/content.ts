import { MESSAGE_TYPES, AnalysisRequest, AnalysisResponse } from './shared/types';
import { ContentExtractor } from './content/extractors/base';
import { RedditExtractor } from './content/extractors/reddit';
import { HackerNewsExtractor } from './content/extractors/hackernews';
import { GenericExtractor } from './content/extractors/generic';
import { UIManager } from './content/ui/ui-manager';

class ContentScript {
  private extractor: ContentExtractor;
  private uiManager: UIManager;

  constructor() {
    this.extractor = this.createExtractor();
    this.uiManager = new UIManager();
    this.initialize();
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

  private initialize(): void {
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

        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: (error as Error).message });
    }
  }

  private async analyzeContent(promptId: string): Promise<void> {
    try {
      // Show progress indicator
      this.uiManager.showProgressBanner();

      // Extract content from the page
      const content = await this.extractor.extractContent();
      
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

      const response = await this.sendMessageToBackground(MESSAGE_TYPES.ANALYZE_CONTENT, analysisRequest);
      
      if (response.success && response.data) {
        await this.handleAnalysisResults(response.data);
      } else {
        this.uiManager.showErrorBanner(response.error || 'Analysis failed. Please try again.');
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      this.uiManager.showErrorBanner('Analysis failed. Please try again.');
    } finally {
      this.uiManager.hideProgressBanner();
    }
  }

  private async handleAnalysisResults(results: any): Promise<void> {
    const nuggets = results.golden_nuggets || [];
    
    if (nuggets.length === 0) {
      this.uiManager.showNoResultsBanner();
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

// Initialize the content script
new ContentScript();