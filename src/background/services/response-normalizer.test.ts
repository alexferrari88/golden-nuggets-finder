import { describe, it, expect, vi } from 'vitest';
import { ResponseNormalizer } from './response-normalizer';
import { ProviderId } from '../../shared/types/providers';

describe('ResponseNormalizer', () => {
  // Mock console.error to avoid cluttering test output
  const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  afterEach(() => {
    consoleSpy.mockClear();
  });

  describe('normalize', () => {
    it('should normalize valid response correctly', () => {
      const validResponse = {
        golden_nuggets: [
          {
            type: 'tool' as const,
            content: 'Test content 1',
            synthesis: 'Test synthesis 1'
          },
          {
            type: 'explanation' as const,
            content: 'Test content 2', 
            synthesis: 'Test synthesis 2'
          }
        ]
      };

      const result = ResponseNormalizer.normalize(validResponse, 'openai');

      expect(result).toEqual({
        golden_nuggets: [
          {
            type: 'tool',
            content: 'Test content 1',
            synthesis: 'Test synthesis 1'
          },
          {
            type: 'explanation',
            content: 'Test content 2',
            synthesis: 'Test synthesis 2'
          }
        ]
      });
    });

    it('should trim whitespace from content and synthesis', () => {
      const responseWithWhitespace = {
        golden_nuggets: [
          {
            type: 'tool' as const,
            content: '  Test content with spaces  ',
            synthesis: '\n  Test synthesis with newlines  \n'
          }
        ]
      };

      const result = ResponseNormalizer.normalize(responseWithWhitespace, 'anthropic');

      expect(result.golden_nuggets[0].content).toBe('Test content with spaces');
      expect(result.golden_nuggets[0].synthesis).toBe('Test synthesis with newlines');
    });

    it('should filter out nuggets with empty content or synthesis', () => {
      const responseWithEmpty = {
        golden_nuggets: [
          {
            type: 'tool' as const,
            content: 'Valid content',
            synthesis: 'Valid synthesis'
          },
          {
            type: 'explanation' as const,
            content: '',
            synthesis: 'Has synthesis but no content'
          },
          {
            type: 'analogy' as const,
            content: 'Has content but no synthesis',
            synthesis: ''
          },
          {
            type: 'media' as const,
            content: '   ',
            synthesis: 'Content is just whitespace'
          }
        ]
      };

      const result = ResponseNormalizer.normalize(responseWithEmpty, 'gemini');

      expect(result.golden_nuggets).toHaveLength(1);
      expect(result.golden_nuggets[0]).toEqual({
        type: 'tool',
        content: 'Valid content',
        synthesis: 'Valid synthesis'
      });
    });

    it('should convert non-string content and synthesis to strings', () => {
      const responseWithNonStrings = {
        golden_nuggets: [
          {
            type: 'model' as const,
            content: 123,
            synthesis: true
          }
        ]
      };

      const result = ResponseNormalizer.normalize(responseWithNonStrings, 'openrouter');

      expect(result.golden_nuggets[0].content).toBe('123');
      expect(result.golden_nuggets[0].synthesis).toBe('true');
    });

    it('should return empty array for invalid response structure', () => {
      const invalidResponse = {
        invalid_field: 'not golden_nuggets'
      };

      const result = ResponseNormalizer.normalize(invalidResponse, 'openai');

      expect(result).toEqual({ golden_nuggets: [] });
      expect(consoleSpy).toHaveBeenCalledWith(
        'Response normalization failed for openai:',
        expect.any(Error)
      );
    });

    it('should return empty array for response with invalid nugget types', () => {
      const responseWithInvalidType = {
        golden_nuggets: [
          {
            type: 'invalid_type',
            content: 'Test content',
            synthesis: 'Test synthesis'
          }
        ]
      };

      const result = ResponseNormalizer.normalize(responseWithInvalidType, 'anthropic');

      expect(result).toEqual({ golden_nuggets: [] });
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should handle null or undefined responses gracefully', () => {
      expect(ResponseNormalizer.normalize(null, 'gemini')).toEqual({ golden_nuggets: [] });
      expect(ResponseNormalizer.normalize(undefined, 'openai')).toEqual({ golden_nuggets: [] });
    });

    it('should handle responses with missing required fields', () => {
      const responseWithMissingFields = {
        golden_nuggets: [
          {
            type: 'tool' as const,
            content: 'Missing synthesis'
            // synthesis field missing
          },
          {
            type: 'explanation' as const,
            // content field missing
            synthesis: 'Missing content'
          }
        ]
      };

      const result = ResponseNormalizer.normalize(responseWithMissingFields, 'openrouter');

      // After preprocessing, missing fields become empty strings and get filtered out
      expect(result).toEqual({ golden_nuggets: [] });
      // Console should not be called since preprocessing handles this case gracefully
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should handle all valid nugget types', () => {
      const responseWithAllTypes = {
        golden_nuggets: [
          { type: 'tool' as const, content: 'Tool content', synthesis: 'Tool synthesis' },
          { type: 'media' as const, content: 'Media content', synthesis: 'Media synthesis' },
          { type: 'explanation' as const, content: 'Explanation content', synthesis: 'Explanation synthesis' },
          { type: 'analogy' as const, content: 'Analogy content', synthesis: 'Analogy synthesis' },
          { type: 'model' as const, content: 'Model content', synthesis: 'Model synthesis' }
        ]
      };

      const result = ResponseNormalizer.normalize(responseWithAllTypes, 'gemini');

      expect(result.golden_nuggets).toHaveLength(5);
      expect(result.golden_nuggets.map(n => n.type)).toEqual([
        'tool', 'media', 'explanation', 'analogy', 'model'
      ]);
    });
  });

  describe('validate', () => {
    it('should return true for valid response', () => {
      const validResponse = {
        golden_nuggets: [
          {
            type: 'tool' as const,
            content: 'Test content',
            synthesis: 'Test synthesis'
          }
        ]
      };

      expect(ResponseNormalizer.validate(validResponse)).toBe(true);
    });

    it('should return false for invalid response structure', () => {
      const invalidResponse = {
        invalid_field: 'not golden_nuggets'
      };

      expect(ResponseNormalizer.validate(invalidResponse)).toBe(false);
    });

    it('should return false for response with invalid nugget types', () => {
      const responseWithInvalidType = {
        golden_nuggets: [
          {
            type: 'invalid_type',
            content: 'Test content',
            synthesis: 'Test synthesis'
          }
        ]
      };

      expect(ResponseNormalizer.validate(responseWithInvalidType)).toBe(false);
    });

    it('should return false for response with missing fields', () => {
      const responseWithMissingFields = {
        golden_nuggets: [
          {
            type: 'tool' as const,
            content: 'Missing synthesis'
            // synthesis field missing
          }
        ]
      };

      expect(ResponseNormalizer.validate(responseWithMissingFields)).toBe(false);
    });

    it('should return false for null or undefined', () => {
      expect(ResponseNormalizer.validate(null)).toBe(false);
      expect(ResponseNormalizer.validate(undefined)).toBe(false);
    });

    it('should return true for empty golden_nuggets array', () => {
      const emptyResponse = {
        golden_nuggets: []
      };

      expect(ResponseNormalizer.validate(emptyResponse)).toBe(true);
    });
  });
});