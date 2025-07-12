import { MESSAGE_TYPES, AnalysisRequest, AnalysisResponse, DebugLogMessage } from '../shared/types';
import { ContentScraper, Content, CheckboxStyling } from 'web-scraper-js';
import { UIManager } from '../content/ui/ui-manager';
import { performanceMonitor, measureContentExtraction, measureDOMOperation } from '../shared/performance';
import { isDevMode } from '../shared/debug';
import { generateCSSCustomProperties, colors, shadows, spacing, borderRadius, zIndex } from '../shared/design-system';

export default defineContentScript({
  matches: ['https://example.com/*'], // Restrictive match to prevent auto-injection
  runAt: 'document_idle',
  main() {
    // Only initialize when explicitly activated to avoid auto-running on all pages
    let isActivated = false;
    let contentScraper: ContentScraper;
    const uiManager = new UIManager();

    function createContentScraper(): ContentScraper {
      // Create design-system-compliant styling functions for the library
      const checkboxStyling: CheckboxStyling = {
        getDefaultStyles: () => `
          position: absolute;
          width: 18px;
          height: 18px;
          border: 1px solid ${colors.border.default};
          border-radius: ${borderRadius.sm};
          background: ${colors.background.primary};
          cursor: pointer;
          z-index: ${zIndex.toggle};
          box-shadow: ${shadows.sm};
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        `,
        getSelectedStyles: () => `
          position: absolute;
          width: 18px;
          height: 18px;
          border: 1px solid ${colors.text.accent};
          border-radius: ${borderRadius.sm};
          background: ${colors.text.accent};
          color: ${colors.white};
          cursor: pointer;
          z-index: ${zIndex.toggle};
          box-shadow: ${shadows.md};
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        `,
        getHoverStyles: () => `
          position: absolute;
          width: 18px;
          height: 18px;
          border: 1px solid ${colors.border.medium};
          border-radius: ${borderRadius.sm};
          background: ${colors.background.secondary};
          cursor: pointer;
          z-index: ${zIndex.toggle};
          box-shadow: ${shadows.md};
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        `,
        getPositioningStyles: (targetRect: DOMRect) => {
          const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
          const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
          return {
            top: `${targetRect.top + scrollTop - 5}px`,
            left: `${targetRect.left + scrollLeft - 25}px`
          };
        }
      };

      // The ContentScraper automatically detects the site type
      return new ContentScraper({
        includeHtml: true, // Include HTML content for better extraction
        checkboxStyling: checkboxStyling, // Provide design-system-compliant styling
        showCheckboxes: false // Don't show checkboxes automatically during regular analysis
      });
    }

    function convertContentToText(content: Content | null): string {
      if (!content || !content.items || content.items.length === 0) {
        return '';
      }
      
      // Combine all content items into a single text string
      const contentParts = [content.title];
      
      content.items.forEach(item => {
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
      
      return contentParts.filter(part => part && part.trim()).join('\n\n');
    }

    function injectDesignSystemVariables(): void {
      // Check if already injected
      if (document.getElementById('nugget-design-system-vars')) return;
      
      // Create and inject CSS custom properties
      const styleElement = document.createElement('style');
      styleElement.id = 'nugget-design-system-vars';
      styleElement.textContent = generateCSSCustomProperties();
      document.head.appendChild(styleElement);
    }

    function initialize(): void {
      if (!isActivated) {
        contentScraper = createContentScraper();
        injectDesignSystemVariables();
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


          case MESSAGE_TYPES.ANALYSIS_COMPLETE:
            initialize(); // Initialize when needed
            if (request.data) {
              await measureDOMOperation('display_results', () => handleAnalysisResults(request.data));
            }
            // Exit selection mode if it was active (for selected content analysis)
            if (uiManager.isSelectionModeActive()) {
              uiManager.exitSelectionMode();
            }
            sendResponse({ success: true });
            break;

          case MESSAGE_TYPES.ANALYSIS_ERROR:
            initialize(); // Initialize when needed
            uiManager.showErrorBanner(request.error || 'Analysis failed. Please try again.');
            // Exit selection mode if it was active (for selected content analysis)
            if (uiManager.isSelectionModeActive()) {
              uiManager.exitSelectionMode();
            }
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
        
        // Show progress banner
        uiManager.showProgressBanner();
        
        // Extract content from the page using the new library
        const structuredContent = await measureContentExtraction('page_content', async () => {
          await contentScraper.run();
          return contentScraper.getContent();
        });
        
        // Convert structured content to text for AI analysis
        const content = convertContentToText(structuredContent);
        
        if (!content || content.trim().length === 0) {
          uiManager.hideProgressBanner();
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
          uiManager.hideProgressBanner();
          uiManager.showErrorBanner(response.error || 'Analysis failed. Please try again.');
          // Notify popup of error
          chrome.runtime.sendMessage({ type: MESSAGE_TYPES.ANALYSIS_ERROR });
        }
      } catch (error) {
        console.error('Analysis failed:', error);
        uiManager.hideProgressBanner();
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
        // Create a separate ContentScraper instance for selection mode
        const selectionScraper = createContentScraper();
        
        // Extract content first
        await selectionScraper.run();
        
        // Then explicitly display checkboxes for selection
        selectionScraper.displayCheckboxes();
        
        // Enter selection mode through UI manager with the scraper
        await uiManager.enterSelectionMode(promptId, selectionScraper);
      } catch (error) {
        console.error('Failed to enter selection mode:', error);
        uiManager.showErrorBanner('Failed to enter selection mode. Please try again.');
      }
    }


    async function handleAnalysisResults(results: any): Promise<void> {
      const nuggets = results.golden_nuggets || [];
      
      // Hide the progress banner now that we have results
      uiManager.hideProgressBanner();
      
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