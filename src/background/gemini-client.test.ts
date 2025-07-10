import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GeminiClient } from './gemini-client';
import { mockChrome } from '../../tests/setup';
import { storage } from '../shared/storage';

describe('GeminiClient', () => {
  let geminiClient: GeminiClient;

  beforeEach(() => {
    geminiClient = new GeminiClient();
    vi.clearAllMocks();
    global.fetch = vi.fn();
    // Clear storage cache to ensure fresh state for each test
    storage.clearAllCache();
  });

  describe('initializeClient', () => {
    it('should initialize with API key from storage', async () => {
      const testApiKey = 'test-api-key';
      vi.spyOn(storage, 'getApiKey').mockResolvedValue(testApiKey);

      await geminiClient['initializeClient']();
      
      expect(geminiClient['apiKey']).toBe(testApiKey);
    });

    it('should throw error if no API key found', async () => {
      vi.spyOn(storage, 'getApiKey').mockResolvedValue('');

      await expect(geminiClient['initializeClient']()).rejects.toThrow(
        'Gemini API key not configured. Please set it in the options page.'
      );
    });

    it('should not reinitialize if already initialized', async () => {
      const testApiKey = 'test-api-key';
      const getApiKeySpy = vi.spyOn(storage, 'getApiKey').mockResolvedValue(testApiKey);

      await geminiClient['initializeClient']();
      getApiKeySpy.mockClear();

      await geminiClient['initializeClient']();
      
      expect(getApiKeySpy).not.toHaveBeenCalled();
    });
  });

  describe('analyzeContent', () => {
    beforeEach(() => {
      vi.spyOn(storage, 'getApiKey').mockResolvedValue('test-api-key');
    });

    it('should analyze content successfully', async () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                golden_nuggets: [
                  {
                    type: 'tool',
                    content: 'Test content',
                    synthesis: 'Test synthesis'
                  }
                ]
              })
            }]
          }
        }]
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await geminiClient.analyzeContent('test content', 'test prompt');
      
      expect(result).toEqual({
        golden_nuggets: [
          {
            type: 'tool',
            content: 'Test content',
            synthesis: 'Test synthesis'
          }
        ]
      });
    });

    it('should construct proper request body', async () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({ golden_nuggets: [] })
            }]
          }
        }]
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await geminiClient.analyzeContent('test content', 'test prompt');
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('gemini-2.5-flash:generateContent'),
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': 'test-api-key'
          },
          body: expect.stringMatching(/"system_instruction":{"parts":\[{"text":"test prompt"}\]}.*"contents":\[{"parts":\[{"text":"test content"}\]}\]/)
        })
      );
    });

    it('should throw error if API key not initialized', async () => {
      vi.spyOn(storage, 'getApiKey').mockResolvedValue('');

      await expect(
        geminiClient.analyzeContent('test content', 'test prompt')
      ).rejects.toThrow('Gemini API key not configured. Please set it in the options page.');
    });

    it('should throw error on API error response', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: () => Promise.resolve('Error details')
      });

      await expect(
        geminiClient.analyzeContent('test content', 'test prompt')
      ).rejects.toThrow('Analysis failed. Please try again.');
    });

    it('should throw error if no response text', async () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{}]
          }
        }]
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await expect(
        geminiClient.analyzeContent('test content', 'test prompt')
      ).rejects.toThrow('Analysis failed. Please try again.');
    });

    it('should throw error on invalid response format', async () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({ invalid: 'format' })
            }]
          }
        }]
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await expect(
        geminiClient.analyzeContent('test content', 'test prompt')
      ).rejects.toThrow('Analysis failed. Please try again.');
    });

    it('should throw error on malformed JSON', async () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{
              text: 'invalid json'
            }]
          }
        }]
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await expect(
        geminiClient.analyzeContent('test content', 'test prompt')
      ).rejects.toThrow();
    });
  });

  describe('retryRequest', () => {
    beforeEach(() => {
      mockChrome.storage.sync.get.mockResolvedValue({
        geminiApiKey: 'test-api-key'
      });
    });

    it('should retry on network error', async () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({ golden_nuggets: [] })
            }]
          }
        }]
      };

      global.fetch = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse)
        });

      const result = await geminiClient.analyzeContent('test content', 'test prompt');
      
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ golden_nuggets: [] });
    });

    it('should not retry on API key error', async () => {
      vi.spyOn(storage, 'getApiKey').mockResolvedValue('test-api-key');
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('API key invalid'));

      await expect(
        geminiClient.analyzeContent('test content', 'test prompt')
      ).rejects.toThrow('Invalid API key');
      
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should exhaust retries and throw error', async () => {
      vi.spyOn(storage, 'getApiKey').mockResolvedValue('test-api-key');
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      await expect(
        geminiClient.analyzeContent('test content', 'test prompt')
      ).rejects.toThrow('Network error. Please check your internet connection.');
      
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should use exponential backoff', async () => {
      vi.spyOn(storage, 'getApiKey').mockResolvedValue('test-api-key');
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({ golden_nuggets: [] })
            }]
          }
        }]
      };

      global.fetch = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse)
        });

      const startTime = Date.now();
      await geminiClient.analyzeContent('test content', 'test prompt');
      const endTime = Date.now();

      // Should have waited at least 1000ms + 2000ms for retries
      expect(endTime - startTime).toBeGreaterThan(2000);
    });
  });

  describe('enhanceError', () => {
    it('should enhance API key error', () => {
      const error = new Error('API key invalid');
      const enhanced = geminiClient['enhanceError'](error);
      
      expect(enhanced.message).toBe('Invalid API key. Please check your settings.');
    });

    it('should enhance rate limit error', () => {
      const error = new Error('Rate limit exceeded');
      const enhanced = geminiClient['enhanceError'](error);
      
      expect(enhanced.message).toBe('Rate limit reached. Please try again later.');
    });

    it('should enhance timeout error', () => {
      const error = new Error('Request timeout');
      const enhanced = geminiClient['enhanceError'](error);
      
      expect(enhanced.message).toBe('Request timed out. Please try again.');
    });

    it('should enhance network error', () => {
      const error = new Error('Network connection failed');
      const enhanced = geminiClient['enhanceError'](error);
      
      expect(enhanced.message).toBe('Network error. Please check your internet connection.');
    });

    it('should provide generic error for unknown errors', () => {
      const error = new Error('Unknown error');
      const enhanced = geminiClient['enhanceError'](error);
      
      expect(enhanced.message).toBe('Analysis failed. Please try again.');
    });
  });

  describe('isNonRetryableError', () => {
    it('should identify API key errors as non-retryable', () => {
      const result = geminiClient['isNonRetryableError']('API key invalid');
      expect(result).toBe(true);
    });

    it('should identify authentication errors as non-retryable', () => {
      const result = geminiClient['isNonRetryableError']('Authentication failed');
      expect(result).toBe(true);
    });

    it('should identify bad request errors as non-retryable', () => {
      const result = geminiClient['isNonRetryableError']('Bad request format');
      expect(result).toBe(true);
    });

    it('should identify network errors as retryable', () => {
      const result = geminiClient['isNonRetryableError']('Network connection failed');
      expect(result).toBe(false);
    });

    it('should identify timeout errors as retryable', () => {
      const result = geminiClient['isNonRetryableError']('Request timed out');
      expect(result).toBe(false);
    });
  });

  describe('validateApiKey', () => {
    it('should validate API key successfully', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true
      });

      const result = await geminiClient.validateApiKey('valid-api-key');
      
      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://generativelanguage.googleapis.com/v1beta/models?key=valid-api-key',
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        })
      );
    });

    it('should reject invalid API key', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false
      });

      const result = await geminiClient.validateApiKey('invalid-api-key');
      
      expect(result).toBe(false);
    });

    it('should reject empty API key', async () => {
      const result = await geminiClient.validateApiKey('');
      
      expect(result).toBe(false);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should reject whitespace-only API key', async () => {
      const result = await geminiClient.validateApiKey('   ');
      
      expect(result).toBe(false);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should handle network error during validation', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

      const result = await geminiClient.validateApiKey('test-api-key');
      
      expect(result).toBe(false);
    });

    it('should use GET request with API key in URL', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true
      });

      await geminiClient.validateApiKey('test-api-key');
      
      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall[0]).toBe('https://generativelanguage.googleapis.com/v1beta/models?key=test-api-key');
      expect(fetchCall[1].method).toBe('GET');
      expect(fetchCall[1].body).toBeUndefined();
    });
  });
});