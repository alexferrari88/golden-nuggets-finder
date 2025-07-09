import { MESSAGE_TYPES, AnalysisRequest, AnalysisResponse } from '../shared/types';
import { ContentExtractor } from '../content/extractors/base';
import { RedditExtractor } from '../content/extractors/reddit';
import { HackerNewsExtractor } from '../content/extractors/hackernews';
import { GenericExtractor } from '../content/extractors/generic';
import { UIManager } from '../content/ui/ui-manager';
import { performanceMonitor, measureContentExtraction, measureDOMOperation } from '../shared/performance';

export default defineContentScript({
  matches: ['https://example.com/*'], // Changed from <all_urls> to prevent auto-injection
  runAt: 'document_idle',
  main() {
    let extractor: ContentExtractor;
    const uiManager = new UIManager();

    function createExtractor(): ContentExtractor {
      const url = window.location.href;
      
      if (url.includes('reddit.com')) {
        return new RedditExtractor();
      } else if (url.includes('news.ycombinator.com')) {
        return new HackerNewsExtractor();
      } else {
        return new GenericExtractor();
      }
    }

    function initialize(): void {
      extractor = createExtractor();

      // Listen for messages from background script
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        handleMessage(request, sender, sendResponse);
        return true; // Keep the message channel open for async responses
      });

      // Listen for analysis requests from popup
      document.addEventListener('nugget-analyze', (event: Event) => {
        const customEvent = event as CustomEvent;
        analyzeContent(customEvent.detail.promptId);
      });
    }

    async function handleMessage(
      request: any,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response: any) => void
    ): Promise<void> {
      try {
        switch (request.type) {
          case MESSAGE_TYPES.ANALYZE_CONTENT:
            await analyzeContent(request.promptId);
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

    async function analyzeContent(promptId: string): Promise<void> {
      try {
        performanceMonitor.startTimer('total_analysis');
        
        // Show progress indicator
        uiManager.showProgressBanner();

        // Extract content from the page
        const content = await measureContentExtraction('page_content', () => extractor.extractContent());
        
        if (!content || content.trim().length === 0) {
          uiManager.showErrorBanner('No content found on this page.');
          return;
        }

        // Send analysis request to background script
        const analysisRequest: AnalysisRequest = {
          content: content,
          promptId: promptId,
          url: window.location.href
        };

        performanceMonitor.startTimer('api_request');
        const response = await sendMessageToBackground(MESSAGE_TYPES.ANALYZE_CONTENT, analysisRequest);
        performanceMonitor.logTimer('api_request', 'Background API call');
        
        if (response.success && response.data) {
          await measureDOMOperation('display_results', () => handleAnalysisResults(response.data));
        } else {
          uiManager.showErrorBanner(response.error || 'Analysis failed. Please try again.');
        }
      } catch (error) {
        console.error('Analysis failed:', error);
        uiManager.showErrorBanner('Analysis failed. Please try again.');
      } finally {
        uiManager.hideProgressBanner();
        performanceMonitor.logTimer('total_analysis', 'Complete analysis workflow');
        performanceMonitor.measureMemory();
      }
    }

    async function handleAnalysisResults(results: any): Promise<void> {
      const nuggets = results.golden_nuggets || [];
      
      if (nuggets.length === 0) {
        uiManager.showNoResultsBanner();
        return;
      }

      // Highlight nuggets on the page and show sidebar
      await uiManager.displayResults(nuggets);
    }

    function sendMessageToBackground(type: string, data?: any): Promise<any> {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type, ...data }, (response) => {
          resolve(response);
        });
      });
    }

    // Initialize the content script
    initialize();
  }
});