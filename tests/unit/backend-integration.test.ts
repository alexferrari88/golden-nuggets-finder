import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MessageHandler } from '../../src/background/message-handler';
import { GeminiClient } from '../../src/background/gemini-client';
import { MESSAGE_TYPES } from '../../src/shared/types';

describe('Backend Integration Tests', () => {
  let mockFetch: any;
  let mockChrome: any;
  let messageHandler: MessageHandler;
  let mockGeminiClient: any;

  beforeEach(() => {
    // Setup fetch mock
    mockFetch = vi.fn();
    global.fetch = mockFetch;

    // Setup Chrome API mocks
    mockChrome = {
      tabs: {
        sendMessage: vi.fn().mockResolvedValue({ success: true })
      },
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({}),
          set: vi.fn().mockResolvedValue(undefined)
        }
      }
    };
    global.chrome = mockChrome;

    // Create mock Gemini client
    mockGeminiClient = {
      analyzeContent: vi.fn()
    };

    // Create message handler
    messageHandler = new MessageHandler(mockGeminiClient as GeminiClient);
  });

  describe('Feedback Submission Integration', () => {
    it('should handle successful nugget feedback submission with backend response', async () => {
      const feedbackData = {
        id: 'feedback_123',
        nuggetId: 'nugget_456',
        isHelpful: true,
        reason: 'Very useful tool recommendation',
        timestamp: Date.now(),
        url: 'https://example.com/article',
        nuggetType: 'tool'
      };

      const backendResponse = {
        success: true,
        id: 'feedback_123',
        message: 'Feedback received successfully',
        deduplication: {
          isDuplicate: false,
          user_message: null
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(backendResponse)
      });

      const request = {
        type: MESSAGE_TYPES.SUBMIT_NUGGET_FEEDBACK,
        feedback: feedbackData
      };

      const sender = { tab: { id: 123 } };
      const sendResponse = vi.fn();

      await messageHandler.handleMessage(request, sender, sendResponse);

      // Verify backend API was called
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:7532/feedback',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nuggetFeedback: [feedbackData] }),
          signal: expect.any(AbortSignal)
        })
      );

      // Verify local storage backup
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          nugget_feedback: expect.arrayContaining([
            expect.objectContaining({
              ...feedbackData,
              storedAt: expect.any(Number)
            })
          ])
        })
      );

      // Verify response
      expect(sendResponse).toHaveBeenCalledWith({
        success: true,
        message: 'Feedback submitted successfully',
        deduplication: backendResponse.deduplication
      });
    });

    it('should handle feedback submission with deduplication notification', async () => {
      const feedbackData = {
        id: 'duplicate_feedback_789',
        nuggetId: 'nugget_456',
        isHelpful: false,
        reason: 'Already saw this recommendation',
        timestamp: Date.now(),
        url: 'https://example.com/article',
        nuggetType: 'tool'
      };

      const backendResponse = {
        success: true,
        id: 'duplicate_feedback_789',
        message: 'Feedback received',
        deduplication: {
          isDuplicate: true,
          user_message: 'Thanks! We already have similar feedback for this nugget.'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(backendResponse)
      });

      const request = {
        type: MESSAGE_TYPES.SUBMIT_NUGGET_FEEDBACK,
        feedback: feedbackData
      };

      const sender = { tab: { id: 456 } };
      const sendResponse = vi.fn();

      await messageHandler.handleMessage(request, sender, sendResponse);

      // Verify deduplication notification was sent to content script
      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(
        456,
        {
          type: MESSAGE_TYPES.SHOW_INFO,
          message: 'Thanks! We already have similar feedback for this nugget.'
        }
      );

      expect(sendResponse).toHaveBeenCalledWith({
        success: true,
        message: 'Feedback submitted successfully',
        deduplication: backendResponse.deduplication
      });
    });

    it('should handle feedback submission with backend failure and local fallback', async () => {
      const feedbackData = {
        id: 'fallback_feedback_101',
        nuggetId: 'nugget_789',
        isHelpful: true,
        reason: 'Excellent explanation',
        timestamp: Date.now(),
        url: 'https://reddit.com/r/test',
        nuggetType: 'explanation'
      };

      // Mock backend failure
      mockFetch.mockRejectedValueOnce(new Error('Backend service unavailable'));

      const request = {
        type: MESSAGE_TYPES.SUBMIT_NUGGET_FEEDBACK,
        feedback: feedbackData
      };

      const sender = { tab: { id: 789 } };
      const sendResponse = vi.fn();

      await messageHandler.handleMessage(request, sender, sendResponse);

      // Verify backend was attempted
      expect(mockFetch).toHaveBeenCalled();

      // Verify local storage backup still occurred
      expect(mockChrome.storage.local.set).toHaveBeenCalled();

      // Verify user notification about fallback
      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(
        789,
        expect.objectContaining({
          type: MESSAGE_TYPES.SHOW_ERROR,
          message: 'Backend error: Backend service unavailable. Your data has been saved locally.',
          retryable: true
        })
      );

      // Verify response indicates local fallback
      expect(sendResponse).toHaveBeenCalledWith({
        success: true,
        message: 'Feedback saved locally (backend unavailable)',
        warning: 'Backend error: Backend service unavailable. Your data has been saved locally.'
      });
    });

    it('should handle missing content feedback submission', async () => {
      const missingContentFeedback = [
        {
          id: 'missing_123',
          selectedText: 'This important concept was missed',
          suggestedType: 'explanation',
          url: 'https://example.com/deep-article',
          timestamp: Date.now(),
          context: 'Analysis failed to identify this key insight'
        },
        {
          id: 'missing_456',
          selectedText: 'Useful tool reference overlooked',
          suggestedType: 'tool',
          url: 'https://example.com/deep-article',
          timestamp: Date.now(),
          context: 'Tool was mentioned but not extracted'
        }
      ];

      const backendResponse = {
        success: true,
        processed: 2,
        message: 'Missing content feedback processed',
        deduplication: {
          isDuplicate: false,
          user_message: null
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(backendResponse)
      });

      const request = {
        type: MESSAGE_TYPES.SUBMIT_MISSING_CONTENT_FEEDBACK,
        missingContentFeedback
      };

      const sender = { tab: { id: 202 } };
      const sendResponse = vi.fn();

      await messageHandler.handleMessage(request, sender, sendResponse);

      // Verify backend API was called with multiple feedback items
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:7532/feedback',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ missingContentFeedback }),
          signal: expect.any(AbortSignal)
        })
      );

      // Verify local storage backup for both items
      expect(mockChrome.storage.local.set).toHaveBeenCalledTimes(2);

      expect(sendResponse).toHaveBeenCalledWith({
        success: true,
        message: '2 missing content feedback items submitted successfully',
        deduplication: backendResponse.deduplication
      });
    });
  });

  describe('Feedback Deletion Integration', () => {
    it('should handle feedback deletion with backend confirmation', async () => {
      const feedbackId = 'feedback_to_delete_123';

      const backendResponse = {
        success: true,
        deleted: true,
        id: feedbackId
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(backendResponse)
      });

      // Mock existing local feedback
      mockChrome.storage.local.get.mockResolvedValueOnce({
        nugget_feedback: [
          { id: feedbackId, nuggetId: 'test', isHelpful: true },
          { id: 'keep_this', nuggetId: 'other', isHelpful: false }
        ]
      });

      const request = {
        type: MESSAGE_TYPES.DELETE_NUGGET_FEEDBACK,
        feedbackId
      };

      const sender = { tab: { id: 303 } };
      const sendResponse = vi.fn();

      await messageHandler.handleMessage(request, sender, sendResponse);

      // Verify backend deletion API was called
      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:7532/feedback/${feedbackId}`,
        expect.objectContaining({
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          signal: expect.any(AbortSignal)
        })
      );

      // Verify local storage cleanup
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        nugget_feedback: [
          { id: 'keep_this', nuggetId: 'other', isHelpful: false }
        ]
      });

      expect(sendResponse).toHaveBeenCalledWith({
        success: true,
        message: 'Feedback deleted successfully'
      });
    });

    it('should handle feedback deletion with backend failure', async () => {
      const feedbackId = 'backend_fail_delete_456';

      // Mock backend failure
      mockFetch.mockRejectedValueOnce(new Error('Database is locked'));

      mockChrome.storage.local.get.mockResolvedValueOnce({
        nugget_feedback: [
          { id: feedbackId, nuggetId: 'test', isHelpful: true }
        ]
      });

      const request = {
        type: MESSAGE_TYPES.DELETE_NUGGET_FEEDBACK,
        feedbackId
      };

      const sender = { tab: { id: 404 } };
      const sendResponse = vi.fn();

      await messageHandler.handleMessage(request, sender, sendResponse);

      // Verify backend was attempted
      expect(mockFetch).toHaveBeenCalled();

      // Verify local removal still occurred
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        nugget_feedback: []
      });

      // Verify user notification about backend issue
      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(
        404,
        expect.objectContaining({
          type: MESSAGE_TYPES.SHOW_ERROR,
          message: expect.stringContaining('Backend database is temporarily busy')
        })
      );

      expect(sendResponse).toHaveBeenCalledWith({
        success: true,
        message: 'Feedback removed locally (backend unavailable)',
        warning: expect.stringContaining('Backend database is temporarily busy')
      });
    });
  });

  describe('DSPy Optimization Integration', () => {
    it('should handle optimization trigger with successful backend response', async () => {
      const optimizationResponse = {
        success: true,
        runId: 'opt_run_789',
        message: 'Optimization started successfully',
        mode: 'cheap',
        estimatedDuration: '2-3 minutes',
        status: 'running'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(optimizationResponse)
      });

      const request = {
        type: MESSAGE_TYPES.TRIGGER_OPTIMIZATION,
        mode: 'cheap'
      };

      const sendResponse = vi.fn();

      await messageHandler.handleMessage(request, { tab: { id: 1 } }, sendResponse);

      // Verify optimization API was called
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:7532/optimize',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'cheap',
            manualTrigger: true
          })
        })
      );

      expect(sendResponse).toHaveBeenCalledWith({
        success: true,
        data: optimizationResponse
      });
    });

    it('should handle optimization trigger with backend errors', async () => {
      // Mock backend error response 
      mockFetch.mockRejectedValueOnce(new Error('DSPy not available - install with: pip install dspy-ai'));

      const request = {
        type: MESSAGE_TYPES.TRIGGER_OPTIMIZATION,
        mode: 'thorough'
      };

      const sendResponse = vi.fn();

      await messageHandler.handleMessage(request, { tab: { id: 1 } }, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith({
        success: false,
        error: 'Backend optimization system not configured. Using default prompts. Contact administrator to enable DSPy optimization.',
        retryable: false
      });
    });

    it('should handle optimization trigger with network timeout', async () => {
      // Mock network timeout
      mockFetch.mockRejectedValueOnce(new Error('Backend request timed out after 10 seconds'));

      const request = {
        type: MESSAGE_TYPES.TRIGGER_OPTIMIZATION,
        mode: 'cheap'
      };

      const sendResponse = vi.fn();

      await messageHandler.handleMessage(request, { tab: { id: 1 } }, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith({
        success: false,
        error: expect.stringContaining('Backend request timed out'),
        retryable: true
      });
    });

    it('should handle current optimized prompt retrieval', async () => {
      const optimizedPromptResponse = {
        prompt: 'Current optimized prompt from DSPy',
        version: 4,
        performance: {
          accuracy: 0.94,
          precision: 0.91,
          recall: 0.88
        },
        optimizationDate: '2024-01-15T10:30:00Z',
        trainingExamples: 150
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(optimizedPromptResponse)
      });

      const request = {
        type: MESSAGE_TYPES.GET_CURRENT_OPTIMIZED_PROMPT
      };

      const sendResponse = vi.fn();

      await messageHandler.handleMessage(request, { tab: { id: 1 } }, sendResponse);

      // Verify API was called
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:7532/optimize/current',
        expect.objectContaining({
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        })
      );

      expect(sendResponse).toHaveBeenCalledWith({
        success: true,
        data: optimizedPromptResponse
      });
    });

    it('should handle optimized prompt retrieval when none available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      const request = {
        type: MESSAGE_TYPES.GET_CURRENT_OPTIMIZED_PROMPT
      };

      const sendResponse = vi.fn();

      await messageHandler.handleMessage(request, { tab: { id: 1 } }, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith({
        success: false,
        error: 'Get optimized prompt failed: 404 Not Found',
        fallback: 'Using default prompt - no optimized prompt available'
      });
    });
  });

  describe('Feedback Statistics Integration', () => {
    it('should handle feedback stats retrieval with backend data', async () => {
      const statsResponse = {
        totalFeedback: 245,
        positiveCount: 189,
        negativeCount: 56,
        lastOptimizationDate: '2024-01-10T08:00:00Z',
        daysSinceLastOptimization: 5,
        recentNegativeRate: 0.15,
        shouldOptimize: true,
        nextOptimizationTrigger: 'High negative feedback rate detected (>10%)',
        nuggetTypeBreakdown: {
          tool: { positive: 78, negative: 12 },
          media: { positive: 45, negative: 18 },
          explanation: { positive: 34, negative: 15 },
          analogy: { positive: 20, negative: 7 },
          model: { positive: 12, negative: 4 }
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(statsResponse)
      });

      const request = {
        type: MESSAGE_TYPES.GET_FEEDBACK_STATS
      };

      const sendResponse = vi.fn();

      await messageHandler.handleMessage(request, { tab: { id: 1 } }, sendResponse);

      // Verify stats API was called
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:7532/feedback/stats',
        expect.objectContaining({
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        })
      );

      expect(sendResponse).toHaveBeenCalledWith({
        success: true,
        data: statsResponse
      });
    });

    it('should handle feedback stats with backend unavailable fallback', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Backend stats request failed: 503 Service Unavailable'));

      const request = {
        type: MESSAGE_TYPES.GET_FEEDBACK_STATS
      };

      const sendResponse = vi.fn();

      await messageHandler.handleMessage(request, { tab: { id: 1 } }, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith({
        success: true,
        data: {
          totalFeedback: 0,
          positiveCount: 0,
          negativeCount: 0,
          lastOptimizationDate: null,
          daysSinceLastOptimization: 0,
          recentNegativeRate: 0,
          shouldOptimize: false,
          nextOptimizationTrigger: 'Backend not available - using local data'
        },
        warning: 'Backend not available, using fallback stats'
      });
    });
  });

  describe('Backend Error Classification Integration', () => {
    it('should classify different backend error types correctly', async () => {
      const errorTestCases = [
        {
          error: new Error('Failed to fetch'),
          expectedClassification: {
            message: expect.stringContaining('Backend service is unavailable'),
            showToUser: true,
            retryable: true
          }
        },
        {
          error: new Error('Database is locked'),
          expectedClassification: {
            message: expect.stringContaining('Backend database is temporarily busy'),
            showToUser: true,
            retryable: true
          }
        },
        {
          error: new Error('DSPy not available - install with: pip install dspy-ai'),
          expectedClassification: {
            message: expect.stringContaining('Backend optimization system not configured'),
            showToUser: true,
            retryable: false
          }
        },
        {
          error: new Error('Need at least 50 training examples for optimization'),
          expectedClassification: {
            message: expect.stringContaining('More feedback needed for optimization (need at least 50 items)'),
            showToUser: true,
            retryable: false
          }
        },
        {
          error: new Error('Backend request timed out after 10 seconds'),
          expectedClassification: {
            message: expect.stringContaining('Backend request timed out'),
            showToUser: true,
            retryable: true
          }
        }
      ];

      // Test each error classification through feedback submission
      for (const testCase of errorTestCases) {
        mockFetch.mockClear();
        mockChrome.tabs.sendMessage.mockClear();

        mockFetch.mockRejectedValueOnce(testCase.error);

        const request = {
          type: MESSAGE_TYPES.SUBMIT_NUGGET_FEEDBACK,
          feedback: {
            id: 'error_test',
            nuggetId: 'test',
            isHelpful: true,
            timestamp: Date.now()
          }
        };

        const sender = { tab: { id: 123 } };
        const sendResponse = vi.fn();

        await messageHandler.handleMessage(request, sender, sendResponse);

        // Verify error classification was applied
        if (testCase.expectedClassification.showToUser) {
          expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(
            123,
            expect.objectContaining({
              type: MESSAGE_TYPES.SHOW_ERROR,
              message: testCase.expectedClassification.message,
              retryable: testCase.expectedClassification.retryable
            })
          );
        }

        expect(sendResponse).toHaveBeenCalledWith({
          success: true,
          message: 'Feedback saved locally (backend unavailable)',
          warning: testCase.expectedClassification.message
        });
      }
    });
  });

  describe('Request Timeout and Retry Integration', () => {
    it('should handle request timeouts with proper cleanup', async () => {
      // Mock timeout scenario
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          const error = new Error('Request timeout');
          error.name = 'AbortError';
          reject(error);
        }, 100);
      });

      mockFetch.mockReturnValueOnce(timeoutPromise);

      const request = {
        type: MESSAGE_TYPES.SUBMIT_NUGGET_FEEDBACK,
        feedback: {
          id: 'timeout_test',
          nuggetId: 'test',
          isHelpful: true,
          timestamp: Date.now()
        }
      };

      const sender = { tab: { id: 123 } };
      const sendResponse = vi.fn();

      await messageHandler.handleMessage(request, sender, sendResponse);

      // Verify timeout error was handled
      expect(sendResponse).toHaveBeenCalledWith({
        success: true,
        message: 'Feedback saved locally (backend unavailable)',
        warning: expect.stringContaining('Backend request timed out')
      });
    });

    it('should handle concurrent backend requests without interference', async () => {
      // Mock multiple concurrent requests
      const responses = [
        { success: true, id: 'concurrent_1' },
        { success: true, id: 'concurrent_2' },
        { success: true, id: 'concurrent_3' }
      ];

      responses.forEach((response, index) => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(response)
        });
      });

      const requests = responses.map((_, index) => ({
        type: MESSAGE_TYPES.SUBMIT_NUGGET_FEEDBACK,
        feedback: {
          id: `concurrent_${index + 1}`,
          nuggetId: `test_${index + 1}`,
          isHelpful: true,
          timestamp: Date.now()
        }
      }));

      const promises = requests.map(request => {
        const sendResponse = vi.fn();
        return messageHandler.handleMessage(request, { tab: { id: 123 } }, sendResponse)
          .then(() => sendResponse);
      });

      const sendResponseFunctions = await Promise.all(promises);

      // Verify all requests completed successfully
      sendResponseFunctions.forEach((sendResponse, index) => {
        expect(sendResponse).toHaveBeenCalledWith({
          success: true,
          message: 'Feedback submitted successfully',
          deduplication: undefined
        });
      });

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });
});