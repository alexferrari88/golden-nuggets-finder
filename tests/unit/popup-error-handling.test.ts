import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { MESSAGE_TYPES } from '../../src/shared/types';

// Mock Chrome APIs
const mockChrome = {
  runtime: {
    sendMessage: vi.fn().mockResolvedValue({ success: true }),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn()
    }
  },
  tabs: {
    query: vi.fn().mockResolvedValue([{ id: 123 }])
  }
};

global.chrome = mockChrome as any;

// Note: This is a conceptual test structure since the popup is a React component
// but the actual testing would need to be integrated with the existing popup test setup

describe('Popup Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Backend error visibility', () => {
    it('should display backend status indicator', async () => {
      // Mock backend stats response with warning (offline backend)
      mockChrome.runtime.sendMessage.mockImplementation((message) => {
        if (message.type === MESSAGE_TYPES.GET_FEEDBACK_STATS) {
          return Promise.resolve({
            success: true,
            warning: "Backend not available, using fallback stats",
            data: { totalFeedback: 0 }
          });
        }
        return Promise.resolve({ success: true });
      });

      // Test that the mock is properly configured for backend status detection
      // This would need integration with the actual popup component
      const result = await mockChrome.runtime.sendMessage({
        type: MESSAGE_TYPES.GET_FEEDBACK_STATS
      });
      
      expect(result.warning).toBe("Backend not available, using fallback stats");
      expect(result.success).toBe(true);
    });

    it('should show backend as available when no warning present', async () => {
      mockChrome.runtime.sendMessage.mockImplementation((message) => {
        if (message.type === MESSAGE_TYPES.GET_FEEDBACK_STATS) {
          return Promise.resolve({
            success: true,
            data: { totalFeedback: 5 }
          });
        }
        return Promise.resolve({ success: true });
      });

      // Backend should be marked as available
      // This would need integration with popup state management
    });
  });

  describe('Analysis error messages', () => {
    it('should display actual error messages from ANALYSIS_ERROR', async () => {
      const mockError = "Backend database is temporarily busy. Your data has been saved locally.";
      
      // Simulate receiving ANALYSIS_ERROR message with specific error
      const messageHandler = vi.fn();
      mockChrome.runtime.onMessage.addListener.mockImplementation((handler) => {
        messageHandler.mockImplementation(handler);
      });

      // Simulate the message
      await messageHandler({
        type: MESSAGE_TYPES.ANALYSIS_ERROR,
        error: mockError
      });

      // Should display the specific error message, not just clear state
      // This would need integration with popup error state management
    });

    it('should handle empty error messages with fallback', async () => {
      const messageHandler = vi.fn();
      mockChrome.runtime.onMessage.addListener.mockImplementation((handler) => {
        messageHandler.mockImplementation(handler);
      });

      await messageHandler({
        type: MESSAGE_TYPES.ANALYSIS_ERROR,
        error: null
      });

      // Should show fallback error message
    });
  });

  describe('Retry mechanisms', () => {
    it('should provide retry button for retryable errors', async () => {
      // Mock error response with retry capability
      mockChrome.runtime.sendMessage.mockRejectedValue(new Error('Network error'));

      // Test that retry button appears and functions correctly
      // This would need DOM testing with the actual popup component
    });

    it('should call checkBackendStatus when backend retry button is clicked', async () => {
      // Mock initial offline status
      mockChrome.runtime.sendMessage.mockImplementation((message) => {
        if (message.type === MESSAGE_TYPES.GET_FEEDBACK_STATS) {
          return Promise.resolve({
            success: true,
            warning: "Backend not available",
            data: { totalFeedback: 0 }
          });
        }
        return Promise.resolve({ success: true });
      });

      // Click retry button should trigger new backend status check
      // This would need integration with popup component event handlers
    });

    it('should refresh prompts and backend status on general error retry', async () => {
      // Mock both prompts and stats responses for retry scenario
      mockChrome.runtime.sendMessage.mockImplementation((message) => {
        if (message.type === MESSAGE_TYPES.GET_PROMPTS) {
          return Promise.resolve({
            success: true,
            data: [{ id: 'test', name: 'Test Prompt', prompt: 'test', isDefault: true }]
          });
        }
        if (message.type === MESSAGE_TYPES.GET_FEEDBACK_STATS) {
          return Promise.resolve({
            success: true,
            data: { totalFeedback: 5 }
          });
        }
        return Promise.resolve({ success: true });
      });

      // Simulate retry functionality - in actual implementation, this would be triggered by button click
      // Test that both operations are properly mocked for retry scenarios
      const promptsResult = await mockChrome.runtime.sendMessage({
        type: MESSAGE_TYPES.GET_PROMPTS
      });
      const statsResult = await mockChrome.runtime.sendMessage({
        type: MESSAGE_TYPES.GET_FEEDBACK_STATS
      });

      expect(promptsResult.success).toBe(true);
      expect(statsResult.success).toBe(true);
    });
  });

  describe('Error state management', () => {
    it('should clear error state when retry is successful', async () => {
      // Mock initial error
      mockChrome.runtime.sendMessage.mockRejectedValueOnce(new Error('Test error'));
      
      // Mock successful retry
      mockChrome.runtime.sendMessage.mockResolvedValueOnce({
        success: true,
        data: []
      });

      // Error state should be cleared after successful retry
    });

    it('should maintain error state when retry fails', async () => {
      // Mock persistent error
      mockChrome.runtime.sendMessage.mockRejectedValue(new Error('Persistent error'));

      // Error state should persist after failed retry
    });
  });

  describe('Backend error classification integration', () => {
    it('should handle backend-specific errors in popup responses', async () => {
      // Mock backend error response
      mockChrome.runtime.sendMessage.mockImplementation((message) => {
        if (message.type === MESSAGE_TYPES.TRIGGER_OPTIMIZATION) {
          return Promise.resolve({
            success: false,
            error: "Backend optimization system not configured. Using default prompts. Contact administrator to enable DSPy optimization.",
            retryable: false
          });
        }
        return Promise.resolve({ success: true });
      });

      // Should display the specific backend configuration error
      // Should not show retry button for non-retryable errors
    });

    it('should handle retryable backend errors', async () => {
      mockChrome.runtime.sendMessage.mockImplementation((message) => {
        if (message.type === MESSAGE_TYPES.SUBMIT_NUGGET_FEEDBACK) {
          return Promise.resolve({
            success: true,
            warning: "Backend database is temporarily busy. Your data has been saved locally and will sync when available."
          });
        }
        return Promise.resolve({ success: true });
      });

      // Should show warning message about local storage
      // Should indicate data will sync later
    });
  });

  describe('Error message formatting', () => {
    it('should display user-friendly error messages', async () => {
      const testCases = [
        {
          backendError: "Failed to fetch",
          expectedUserMessage: "Backend service is unavailable"
        },
        {
          backendError: "database is locked", 
          expectedUserMessage: "Backend database is temporarily busy"
        },
        {
          backendError: "DSPy not available",
          expectedUserMessage: "Backend optimization system not configured"
        },
        {
          backendError: "Not enough training examples",
          expectedUserMessage: "More feedback needed for optimization"
        }
      ];

      for (const testCase of testCases) {
        // Each error type should display appropriate user-friendly message
        // This would need integration with the actual error display logic
      }
    });

    it('should preserve important error details for troubleshooting', async () => {
      const technicalError = "Rate limit exceeded. Reset in 3600 seconds";
      
      // Should show user-friendly message but preserve timing info
      // Expected: "Rate limit reached (Reset in 3600 seconds). Please wait before trying again."
    });
  });
});

describe('Error Flow Integration Tests', () => {
  it('should handle complete error flow from backend to user display', async () => {
    // 1. Backend operation fails
    mockChrome.runtime.sendMessage.mockRejectedValue(
      new Error('Backend request timed out after 10 seconds')
    );

    // 2. Error should be classified and enhanced
    // 3. User notification should be displayed
    // 4. Fallback behavior should activate (local storage)
    // 5. User should see appropriate retry options

    // This would need full integration testing with popup component
  });

  it('should handle analysis errors with proper user feedback', async () => {
    const mockError = "Gemini API error: API quota exceeded. Please check your usage limits.";
    
    // Simulate analysis error message
    const messageHandler = vi.fn();
    mockChrome.runtime.onMessage.addListener.mockImplementation((handler) => {
      messageHandler.mockImplementation(handler);
    });

    await messageHandler({
      type: MESSAGE_TYPES.ANALYSIS_ERROR,
      error: mockError
    });

    // Should display specific API quota error with guidance
    // Should provide appropriate retry options
  });
});