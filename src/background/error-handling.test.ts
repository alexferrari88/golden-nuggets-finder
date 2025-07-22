import { MessageHandler } from './message-handler';
import { GeminiClient } from './gemini-client';
import { MESSAGE_TYPES } from '../shared/types';

// Mock dependencies
vi.mock('./gemini-client');
vi.mock('../shared/storage');

// Mock Chrome APIs
global.chrome = {
  runtime: {
    sendMessage: vi.fn().mockResolvedValue({}),
  },
  tabs: {
    sendMessage: vi.fn().mockResolvedValue({}),
  },
  storage: {
    local: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue({}),
    }
  }
} as any;

// Mock global fetch
global.fetch = vi.fn();

describe('MessageHandler Error Handling', () => {
  let messageHandler: MessageHandler;
  let mockGeminiClient: any;
  let mockSendResponse: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGeminiClient = {
      analyzeContent: vi.fn().mockResolvedValue({ golden_nuggets: [] })
    };
    mockSendResponse = vi.fn();
    messageHandler = new MessageHandler(mockGeminiClient);
  });

  describe('enhanceBackendError', () => {
    it('should classify network/connection errors correctly', () => {
      const networkError = new Error('Failed to fetch');
      const result = (messageHandler as any).enhanceBackendError(networkError);
      
      expect(result).toEqual({
        message: "Backend service is unavailable. Your data has been saved locally and will sync when the backend is available.",
        showToUser: true,
        retryable: true
      });
    });

    it('should classify database errors correctly', () => {
      const dbError = new Error('Failed to store feedback: database is locked');
      const result = (messageHandler as any).enhanceBackendError(dbError);
      
      expect(result).toEqual({
        message: "Backend database is temporarily busy. Your data has been saved locally and will sync when available.",
        showToUser: true,
        retryable: true
      });
    });

    it('should classify DSPy configuration errors correctly', () => {
      const dspyError = new Error('DSPy not available. Install with: pip install dspy-ai');
      const result = (messageHandler as any).enhanceBackendError(dspyError);
      
      expect(result).toEqual({
        message: "Backend optimization system not configured. Using default prompts. Contact administrator to enable DSPy optimization.",
        showToUser: true,
        retryable: false
      });
    });

    it('should classify DSPy training data errors correctly', () => {
      const trainingError = new Error('Not enough training examples. Need at least 10 feedback items.');
      const result = (messageHandler as any).enhanceBackendError(trainingError);
      
      expect(result).toEqual({
        message: "More feedback needed for optimization (need at least 10 items). Keep using the extension to provide feedback.",
        showToUser: true,
        retryable: false
      });
    });

    it('should extract required count from training data errors', () => {
      const trainingError = new Error('Not enough training examples. Need at least 25 feedback items.');
      const result = (messageHandler as any).enhanceBackendError(trainingError);
      
      expect(result.message).toContain("need at least 25 items");
    });

    it('should classify API key/configuration errors correctly', () => {
      const apiKeyError = new Error('GEMINI_API_KEY environment variable is required');
      const result = (messageHandler as any).enhanceBackendError(apiKeyError);
      
      expect(result).toEqual({
        message: "Backend API configuration missing. Contact administrator to configure Gemini API key.",
        showToUser: true,
        retryable: false
      });
    });

    it('should classify server errors correctly', () => {
      const serverError = new Error('Optimization request failed: 500 Internal Server Error');
      const result = (messageHandler as any).enhanceBackendError(serverError);
      
      expect(result).toEqual({
        message: "Backend server error occurred. Your data has been saved locally. Please try again later.",
        showToUser: true,
        retryable: true
      });
    });

    it('should classify timeout errors correctly', () => {
      const timeoutError = new Error('Backend request timed out after 10 seconds');
      const result = (messageHandler as any).enhanceBackendError(timeoutError);
      
      expect(result).toEqual({
        message: "Backend request timed out. Your data has been saved locally. Please try again.",
        showToUser: true,
        retryable: true
      });
    });

    it('should handle generic errors with original message preservation', () => {
      const genericError = new Error('Some unexpected backend error occurred');
      const result = (messageHandler as any).enhanceBackendError(genericError);
      
      expect(result).toEqual({
        message: "Backend error: Some unexpected backend error occurred. Your data has been saved locally.",
        showToUser: true,
        retryable: true
      });
    });

    it('should clean up error message prefixes for generic errors', () => {
      const prefixedError = new Error('Failed to process request: Some unexpected error occurred');
      const result = (messageHandler as any).enhanceBackendError(prefixedError);
      
      expect(result.message).toContain("Some unexpected error occurred");
      expect(result.message).not.toContain("Failed to process request:");
    });

    it('should handle database errors specifically before generic cleanup', () => {
      const databaseError = new Error('Failed to store feedback: database is locked');
      const result = (messageHandler as any).enhanceBackendError(databaseError);
      
      // Database errors should be caught by specific handler, not generic cleanup
      expect(result.message).toBe("Backend database is temporarily busy. Your data has been saved locally and will sync when available.");
      expect(result.showToUser).toBe(true);
      expect(result.retryable).toBe(true);
    });
  });

  describe('notifyUserOfBackendError', () => {
    const mockTabId = 123;
    const mockSender = { tab: { id: mockTabId } } as chrome.runtime.MessageSender;

    it('should send error notification to content script when showToUser is true', async () => {
      const errorInfo = {
        message: "Test error message",
        showToUser: true,
        retryable: true
      };

      await (messageHandler as any).notifyUserOfBackendError(mockTabId, errorInfo);

      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(mockTabId, {
        type: MESSAGE_TYPES.SHOW_ERROR,
        message: "Test error message",
        retryable: true
      });
    });

    it('should not send notification when showToUser is false', async () => {
      const errorInfo = {
        message: "Internal error",
        showToUser: false,
        retryable: false
      };

      await (messageHandler as any).notifyUserOfBackendError(mockTabId, errorInfo);

      expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
    });

    it('should not send notification when tabId is undefined', async () => {
      const errorInfo = {
        message: "Test error message",
        showToUser: true,
        retryable: true
      };

      await (messageHandler as any).notifyUserOfBackendError(undefined, errorInfo);

      expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
    });

    it('should handle content script communication errors gracefully', async () => {
      const errorInfo = {
        message: "Test error message",
        showToUser: true,
        retryable: true
      };

      (chrome.tabs.sendMessage as any).mockRejectedValue(new Error('Content script not ready'));

      await expect((messageHandler as any).notifyUserOfBackendError(mockTabId, errorInfo))
        .resolves.not.toThrow();
    });
  });

  describe('Backend API Error Handling', () => {
    beforeEach(() => {
      // Mock chrome.storage for feedback storage
      (chrome.storage.local.get as any).mockResolvedValue({ nugget_feedback: [] });
      (chrome.storage.local.set as any).mockResolvedValue({});
    });

    describe('Feedback submission error handling', () => {
      it('should handle backend fetch failures gracefully for nugget feedback', async () => {
        const mockSender = { tab: { id: 123 } } as chrome.runtime.MessageSender;
        const request = {
          type: MESSAGE_TYPES.SUBMIT_NUGGET_FEEDBACK,
          feedback: {
            id: 'test-id',
            nuggetContent: 'Test content',
            originalType: 'tool',
            rating: 'positive',
            timestamp: Date.now(),
            url: 'https://example.com',
            context: 'Test context'
          }
        };

        // Mock fetch to fail
        (global.fetch as any).mockRejectedValue(new Error('Failed to fetch'));

        await messageHandler.handleMessage(request, mockSender, mockSendResponse);

        expect(mockSendResponse).toHaveBeenCalledWith({
          success: true,
          message: "Feedback saved locally (backend unavailable)",
          warning: "Backend service is unavailable. Your data has been saved locally and will sync when the backend is available."
        });

        expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(123, {
          type: MESSAGE_TYPES.SHOW_ERROR,
          message: "Backend service is unavailable. Your data has been saved locally and will sync when the backend is available.",
          retryable: true
        });
      });

      it('should handle backend database errors for missing content feedback', async () => {
        const mockSender = { tab: { id: 123 } } as chrome.runtime.MessageSender;
        const request = {
          type: MESSAGE_TYPES.SUBMIT_MISSING_CONTENT_FEEDBACK,
          missingContentFeedback: [{
            id: 'missing-test-id',
            content: 'Missing content',
            suggestedType: 'explanation',
            timestamp: Date.now(),
            url: 'https://example.com'
          }]
        };

        // Mock fetch to fail with database error
        (global.fetch as any).mockRejectedValue(new Error('Failed to store feedback: database is locked'));

        await messageHandler.handleMessage(request, mockSender, mockSendResponse);

        expect(mockSendResponse).toHaveBeenCalledWith({
          success: true,
          message: "1 feedback items saved locally (backend unavailable)",
          warning: "Backend database is temporarily busy. Your data has been saved locally and will sync when available."
        });
      });
    });

    describe('Optimization trigger error handling', () => {
      it('should return enhanced error messages for optimization failures', async () => {
        const request = {
          type: MESSAGE_TYPES.TRIGGER_OPTIMIZATION,
          mode: 'expensive'
        };

        // Mock fetch to fail with DSPy error
        (global.fetch as any).mockRejectedValue(new Error('DSPy not available. Install with: pip install dspy-ai'));

        await messageHandler.handleMessage(request, {} as any, mockSendResponse);

        expect(mockSendResponse).toHaveBeenCalledWith({
          success: false,
          error: "Backend optimization system not configured. Using default prompts. Contact administrator to enable DSPy optimization.",
          retryable: false
        });
      });

      it('should handle network errors for optimization requests', async () => {
        const request = {
          type: MESSAGE_TYPES.TRIGGER_OPTIMIZATION,
          mode: 'cheap'
        };

        (global.fetch as any).mockRejectedValue(new Error('NetworkError: Failed to fetch'));

        await messageHandler.handleMessage(request, {} as any, mockSendResponse);

        expect(mockSendResponse).toHaveBeenCalledWith({
          success: false,
          error: "Backend service is unavailable. Your data has been saved locally and will sync when the backend is available.",
          retryable: true
        });
      });
    });

    describe('Feedback stats error handling', () => {
      it('should provide fallback stats when backend is unavailable', async () => {
        const request = {
          type: MESSAGE_TYPES.GET_FEEDBACK_STATS
        };

        (global.fetch as any).mockRejectedValue(new Error('Failed to fetch'));

        await messageHandler.handleMessage(request, {} as any, mockSendResponse);

        expect(mockSendResponse).toHaveBeenCalledWith({
          success: true,
          data: {
            totalFeedback: 0,
            positiveCount: 0,
            negativeCount: 0,
            lastOptimizationDate: null,
            daysSinceLastOptimization: 0,
            recentNegativeRate: 0,
            shouldOptimize: false,
            nextOptimizationTrigger: "Backend not available - using local data"
          },
          warning: "Backend not available, using fallback stats"
        });
      });
    });
  });

  describe('End-to-end error flow', () => {
    it('should handle complete error flow from backend failure to user notification', async () => {
      const mockSender = { tab: { id: 456 } } as chrome.runtime.MessageSender;
      const request = {
        type: MESSAGE_TYPES.SUBMIT_NUGGET_FEEDBACK,
        feedback: {
          id: 'e2e-test-id',
          nuggetContent: 'E2E test content',
          originalType: 'tool',
          rating: 'positive',
          timestamp: Date.now(),
          url: 'https://example.com',
          context: 'E2E test context'
        }
      };

      // Simulate backend timeout
      (global.fetch as any).mockRejectedValue(new Error('Backend request timed out after 10 seconds'));

      await messageHandler.handleMessage(request, mockSender, mockSendResponse);

      // Verify local storage backup
      expect(chrome.storage.local.set).toHaveBeenCalled();

      // Verify user notification
      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(456, {
        type: MESSAGE_TYPES.SHOW_ERROR,
        message: "Backend request timed out. Your data has been saved locally. Please try again.",
        retryable: true
      });

      // Verify response indicates success with warning
      expect(mockSendResponse).toHaveBeenCalledWith({
        success: true,
        message: "Feedback saved locally (backend unavailable)",
        warning: "Backend request timed out. Your data has been saved locally. Please try again."
      });
    });
  });
});