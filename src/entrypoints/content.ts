import { MESSAGE_TYPES, AnalysisRequest, AnalysisResponse, DebugLogMessage } from '../shared/types';
import { ContentExtractor } from '../content/extractors/base';
import { RedditExtractor } from '../content/extractors/reddit';
import { HackerNewsExtractor } from '../content/extractors/hackernews';
import { TwitterExtractor } from '../content/extractors/twitter';
import { GenericExtractor } from '../content/extractors/generic';
import { UIManager } from '../content/ui/ui-manager';
import { performanceMonitor, measureContentExtraction, measureDOMOperation } from '../shared/performance';
import { isDevMode } from '../shared/debug';

export default defineContentScript({
  matches: ['https://example.com/*'], // Restrictive match to prevent auto-injection
  runAt: 'document_idle',
  main() {
    // Only initialize when explicitly activated to avoid auto-running on all pages
    let isActivated = false;
    let extractor: ContentExtractor;
    const uiManager = new UIManager();

    function createExtractor(): ContentExtractor {
      const url = window.location.href;
      
      if (url.includes('reddit.com')) {
        return new RedditExtractor();
      } else if (url.includes('news.ycombinator.com')) {
        return new HackerNewsExtractor();
      } else if (url.includes('twitter.com') || url.includes('x.com')) {
        return new TwitterExtractor();
      } else {
        return new GenericExtractor();
      }
    }

    function initialize(): void {
      if (!isActivated) {
        extractor = createExtractor();
        isActivated = true;
      }
    }

    function handleDebugLog(debugLog: DebugLogMessage): void {
      // Only log in development mode - double check for safety
      if (!isDevMode()) return;

      switch (debugLog.type) {
        case 'llm-request':
          if (debugLog.data) {
            console.log('[LLM Request] Gemini API - Endpoint:', debugLog.data.endpoint);
            console.log('[LLM Request] Request Body:', JSON.stringify(debugLog.data.requestBody, null, 2));
          }
          break;

        case 'llm-response':
          if (debugLog.data) {
            console.log('[LLM Response] Raw Response:', JSON.stringify(debugLog.data.responseData, null, 2));
            if (debugLog.data.parsedResponse) {
              console.log('[LLM Response] Parsed Response:', JSON.stringify(debugLog.data.parsedResponse, null, 2));
            }
          }
          break;

        case 'llm-validation':
          if (debugLog.data) {
            console.log('[LLM Request] API Key Validation - Endpoint:', debugLog.data.endpoint);
            console.log('[LLM Request] Test Request Body:', JSON.stringify(debugLog.data.requestBody, null, 2));
            console.log('[LLM Response] API Key Validation - Status:', debugLog.data.status, debugLog.data.statusText);
            console.log('[LLM Response] API Key Valid:', debugLog.data.valid);
          }
          break;

        case 'log':
          console.log(debugLog.message, ...(debugLog.data || []));
          break;

        case 'error':
          console.error(debugLog.message, ...(debugLog.data || []));
          break;

        case 'warn':
          console.warn(debugLog.message, ...(debugLog.data || []));
          break;

        default:
          console.log('[Debug]', debugLog.message, debugLog.data);
      }
    }

    // Always listen for messages from background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      handleMessage(request, sender, sendResponse);
      return true; // Keep the message channel open for async responses
    });

    // Listen for analysis requests from popup
    document.addEventListener('nugget-analyze', (event: Event) => {
      const customEvent = event as CustomEvent;
      analyzeContent(customEvent.detail.promptId);
    });

    async function handleMessage(
      request: any,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response: any) => void
    ): Promise<void> {
      try {
        switch (request.type) {
          case MESSAGE_TYPES.ANALYZE_CONTENT:
            initialize(); // Initialize when needed
            await analyzeContent(request.promptId);
            sendResponse({ success: true });
            break;

          case MESSAGE_TYPES.ENTER_SELECTION_MODE:
            initialize(); // Initialize when needed
            await enterSelectionMode(request.promptId);
            sendResponse({ success: true });
            break;

          case MESSAGE_TYPES.ANALYZE_SELECTED_CONTENT:
            initialize(); // Initialize when needed
            await analyzeSelectedContent(request);
            sendResponse({ success: true });
            break;

          case MESSAGE_TYPES.SHOW_ERROR:
            // No need to initialize for error display
            uiManager.showErrorBanner(request.message);
            sendResponse({ success: true });
            break;

          case MESSAGE_TYPES.SHOW_API_KEY_ERROR:
            // No need to initialize for error display
            uiManager.showApiKeyErrorBanner();
            sendResponse({ success: true });
            break;

          case MESSAGE_TYPES.DEBUG_LOG:
            // Handle debug log forwarding to page console (development mode only)
            if (isDevMode()) {
              handleDebugLog(request.data);
            }
            sendResponse({ success: true });
            break;

          case 'PING':
            // Respond to ping messages for injection detection
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
          // Notify popup of successful completion
          chrome.runtime.sendMessage({ type: MESSAGE_TYPES.ANALYSIS_COMPLETE });
        } else {
          uiManager.showErrorBanner(response.error || 'Analysis failed. Please try again.');
          // Notify popup of error
          chrome.runtime.sendMessage({ type: MESSAGE_TYPES.ANALYSIS_ERROR });
        }
      } catch (error) {
        console.error('Analysis failed:', error);
        uiManager.showErrorBanner('Analysis failed. Please try again.');
        // Notify popup of error
        chrome.runtime.sendMessage({ type: MESSAGE_TYPES.ANALYSIS_ERROR });
      } finally {
        performanceMonitor.logTimer('total_analysis', 'Complete analysis workflow');
        performanceMonitor.measureMemory();
      }
    }

    async function enterSelectionMode(promptId?: string): Promise<void> {
      try {
        // Enter selection mode through UI manager
        await uiManager.enterSelectionMode(promptId);
      } catch (error) {
        console.error('Failed to enter selection mode:', error);
        uiManager.showErrorBanner('Failed to enter selection mode. Please try again.');
      }
    }

    async function analyzeSelectedContent(request: any): Promise<void> {
      try {
        performanceMonitor.startTimer('total_analysis');
        
        const content = request.content;
        const promptId = request.promptId;
        
        if (!content || content.trim().length === 0) {
          uiManager.showErrorBanner('No content selected for analysis.');
          return;
        }

        // Exit selection mode
        uiManager.exitSelectionMode();

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
          // Notify popup of successful completion
          chrome.runtime.sendMessage({ type: MESSAGE_TYPES.ANALYSIS_COMPLETE });
        } else {
          uiManager.showErrorBanner(response.error || 'Analysis failed. Please try again.');
          // Notify popup of error
          chrome.runtime.sendMessage({ type: MESSAGE_TYPES.ANALYSIS_ERROR });
        }
      } catch (error) {
        console.error('Analysis failed:', error);
        uiManager.showErrorBanner('Analysis failed. Please try again.');
        // Notify popup of error
        chrome.runtime.sendMessage({ type: MESSAGE_TYPES.ANALYSIS_ERROR });
      } finally {
        performanceMonitor.logTimer('total_analysis', 'Complete analysis workflow');
        performanceMonitor.measureMemory();
      }
    }

    async function handleAnalysisResults(results: any): Promise<void> {
      const nuggets = results.golden_nuggets || [];
      
      if (nuggets.length === 0) {
        uiManager.showNoResultsBanner();
        // Still show sidebar with empty state for better UX
        await uiManager.displayResults([]);
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

    // Content script is ready for dynamic injection and message handling
    // Initialization happens on-demand when messages are received
  }
});