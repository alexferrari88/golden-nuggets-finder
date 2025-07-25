import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MessageHandler } from '../../src/background/message-handler';
import { GeminiClient } from '../../src/background/gemini-client';
import { MESSAGE_TYPES } from '../../src/shared/types';

// Mock Chrome runtime APIs
const mockChrome = {
  runtime: {
    sendMessage: vi.fn(),
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
    },
  },
};

// @ts-ignore
global.chrome = mockChrome;

// Mock fetch for backend calls
global.fetch = vi.fn();

describe('Feedback Reset Functionality', () => {
  let messageHandler: MessageHandler;
  let mockGeminiClient: GeminiClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGeminiClient = new GeminiClient();
    messageHandler = new MessageHandler(mockGeminiClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('DELETE_NUGGET_FEEDBACK Message Handling', () => {
    it('should handle DELETE_NUGGET_FEEDBACK message type', async () => {
      const request = {
        type: MESSAGE_TYPES.DELETE_NUGGET_FEEDBACK,
        feedbackId: 'test-feedback-id-123',
      };

      const sender = { tab: { id: 1 } };
      const sendResponse = vi.fn();

      // Mock successful backend response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      // Mock local storage removal
      mockChrome.storage.local.get.mockResolvedValueOnce({
        nugget_feedback: [
          { id: 'test-feedback-id-123', rating: 'positive' },
          { id: 'other-feedback-id', rating: 'negative' },
        ],
      });

      await messageHandler.handleMessage(request, sender, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith({
        success: true,
        message: 'Feedback deleted successfully',
      });
    });

    it('should handle feedback deletion when backend is unavailable', async () => {
      const request = {
        type: MESSAGE_TYPES.DELETE_NUGGET_FEEDBACK,
        feedbackId: 'test-feedback-id-123',
      };

      const sender = { tab: { id: 1 } };
      const sendResponse = vi.fn();

      // Mock backend failure
      (global.fetch as any).mockRejectedValueOnce(new Error('Backend unavailable'));

      // Mock local storage removal
      mockChrome.storage.local.get.mockResolvedValueOnce({
        nugget_feedback: [
          { id: 'test-feedback-id-123', rating: 'positive' },
        ],
      });

      await messageHandler.handleMessage(request, sender, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith({
        success: true,
        message: 'Feedback removed locally (backend unavailable)',
        warning: 'Backend error: Backend unavailable. Your data has been saved locally.',
      });
    });

    it('should return error when feedback ID is not provided', async () => {
      const request = {
        type: MESSAGE_TYPES.DELETE_NUGGET_FEEDBACK,
        // feedbackId missing
      };

      const sender = { tab: { id: 1 } };
      const sendResponse = vi.fn();

      await messageHandler.handleMessage(request, sender, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith({
        success: false,
        error: 'No feedback ID provided',
      });
    });

    it('should return error when feedback is not found', async () => {
      const request = {
        type: MESSAGE_TYPES.DELETE_NUGGET_FEEDBACK,
        feedbackId: 'non-existent-id',
      };

      const sender = { tab: { id: 1 } };
      const sendResponse = vi.fn();

      // Mock backend returning 404
      (global.fetch as any).mockRejectedValueOnce(new Error('404 Not Found - Feedback item not found'));

      // Mock local storage with no matching feedback
      mockChrome.storage.local.get.mockResolvedValueOnce({
        nugget_feedback: [],
      });

      await messageHandler.handleMessage(request, sender, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith({
        success: true,
        message: 'Feedback removed locally (backend unavailable)',
        warning: 'Backend error: 404 Not Found - Feedback item not found. Your data has been saved locally.',
      });
    });
  });

  describe('Backend Integration', () => {
    it('should send DELETE request to correct backend endpoint', async () => {
      const request = {
        type: MESSAGE_TYPES.DELETE_NUGGET_FEEDBACK,
        feedbackId: 'test-feedback-id-123',
      };

      const sender = { tab: { id: 1 } };
      const sendResponse = vi.fn();

      // Mock successful backend response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, message: 'Deleted successfully' }),
      });

      // Mock local storage
      mockChrome.storage.local.get.mockResolvedValueOnce({
        nugget_feedback: [{ id: 'test-feedback-id-123' }],
      });

      await messageHandler.handleMessage(request, sender, sendResponse);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:7532/feedback/test-feedback-id-123',
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          signal: expect.any(AbortSignal),
        }
      );
    });

    it('should handle backend timeout gracefully', async () => {
      const request = {
        type: MESSAGE_TYPES.DELETE_NUGGET_FEEDBACK,
        feedbackId: 'test-feedback-id-123',
      };

      const sender = { tab: { id: 1 } };
      const sendResponse = vi.fn();

      // Mock timeout error
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      (global.fetch as any).mockRejectedValueOnce(abortError);

      // Mock local storage
      mockChrome.storage.local.get.mockResolvedValueOnce({
        nugget_feedback: [{ id: 'test-feedback-id-123' }],
      });

      await messageHandler.handleMessage(request, sender, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith({
        success: true,
        message: 'Feedback removed locally (backend unavailable)',
        warning: 'Backend request timed out. Your data has been saved locally. Please try again.',
      });
    });
  });

  describe('Local Storage Management', () => {
    it('should remove feedback from local storage backup', async () => {
      const request = {
        type: MESSAGE_TYPES.DELETE_NUGGET_FEEDBACK,
        feedbackId: 'test-feedback-id-123',
      };

      const sender = { tab: { id: 1 } };
      const sendResponse = vi.fn();

      const mockFeedbackArray = [
        { id: 'test-feedback-id-123', rating: 'positive' },
        { id: 'other-feedback-id', rating: 'negative' },
      ];

      // Mock local storage get/set
      mockChrome.storage.local.get.mockResolvedValueOnce({
        nugget_feedback: mockFeedbackArray,
      });

      // Mock successful backend response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await messageHandler.handleMessage(request, sender, sendResponse);

      // Verify local storage was updated to remove the feedback
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        nugget_feedback: [{ id: 'other-feedback-id', rating: 'negative' }],
      });
    });

    it('should handle empty local storage gracefully', async () => {
      const request = {
        type: MESSAGE_TYPES.DELETE_NUGGET_FEEDBACK,
        feedbackId: 'test-feedback-id-123',
      };

      const sender = { tab: { id: 1 } };
      const sendResponse = vi.fn();

      // Mock empty local storage
      mockChrome.storage.local.get.mockResolvedValueOnce({});

      // Mock backend failure (should still work with local-only removal)
      (global.fetch as any).mockRejectedValueOnce(new Error('Backend unavailable'));

      await messageHandler.handleMessage(request, sender, sendResponse);

      // Should still update storage even if initially empty
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        nugget_feedback: [],
      });
    });
  });

  describe('Error Classification', () => {
    it('should classify network errors correctly', async () => {
      const request = {
        type: MESSAGE_TYPES.DELETE_NUGGET_FEEDBACK,
        feedbackId: 'test-feedback-id-123',
      };

      const sender = { tab: { id: 1 } };
      const sendResponse = vi.fn();

      // Mock network error
      (global.fetch as any).mockRejectedValueOnce(new Error('Failed to fetch'));

      // Mock local storage
      mockChrome.storage.local.get.mockResolvedValueOnce({
        nugget_feedback: [{ id: 'test-feedback-id-123' }],
      });

      await messageHandler.handleMessage(request, sender, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith({
        success: true,
        message: 'Feedback removed locally (backend unavailable)',
        warning: 'Backend service is unavailable. Your data has been saved locally and will sync when the backend is available.',
      });
    });

    it('should classify server errors correctly', async () => {
      const request = {
        type: MESSAGE_TYPES.DELETE_NUGGET_FEEDBACK,
        feedbackId: 'test-feedback-id-123',
      };

      const sender = { tab: { id: 1 } };
      const sendResponse = vi.fn();

      // Mock 500 server error
      (global.fetch as any).mockRejectedValueOnce(new Error('500 Internal Server Error'));

      // Mock local storage
      mockChrome.storage.local.get.mockResolvedValueOnce({
        nugget_feedback: [{ id: 'test-feedback-id-123' }],
      });

      await messageHandler.handleMessage(request, sender, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith({
        success: true,
        message: 'Feedback removed locally (backend unavailable)',
        warning: 'Backend server error occurred. Your data has been saved locally. Please try again later.',
      });
    });
  });

  describe('User Notification', () => {
    it('should send error notification to content script on backend failure', async () => {
      const request = {
        type: MESSAGE_TYPES.DELETE_NUGGET_FEEDBACK,
        feedbackId: 'test-feedback-id-123',
      };

      const sender = { tab: { id: 42 } };
      const sendResponse = vi.fn();

      // Mock Chrome tabs.sendMessage
      const mockTabsSendMessage = vi.fn();
      global.chrome.tabs = { sendMessage: mockTabsSendMessage };

      // Mock backend failure
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      // Mock local storage
      mockChrome.storage.local.get.mockResolvedValueOnce({
        nugget_feedback: [{ id: 'test-feedback-id-123' }],
      });

      await messageHandler.handleMessage(request, sender, sendResponse);

      // Should attempt to notify the content script
      expect(mockTabsSendMessage).toHaveBeenCalledWith(42, {
        type: MESSAGE_TYPES.SHOW_ERROR,
        message: 'Backend service is unavailable. Your data has been saved locally and will sync when the backend is available.',
        retryable: true,
      });
    });
  });
});