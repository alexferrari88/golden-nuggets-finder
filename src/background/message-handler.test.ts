import { MessageHandler } from './message-handler';
import { GeminiClient } from './gemini-client';
import { storage } from '../shared/storage';
import { MESSAGE_TYPES } from '../shared/types';

// Mock dependencies
vi.mock('./gemini-client');
vi.mock('../shared/storage');

describe('MessageHandler', () => {
  let messageHandler: MessageHandler;
  let mockGeminiClient: any;
  let mockSendResponse: any;

  beforeEach(() => {
    mockGeminiClient = {
      analyzeContent: vi.fn().mockResolvedValue({ golden_nuggets: [] })
    };
    mockSendResponse = vi.fn();
    messageHandler = new MessageHandler(mockGeminiClient);
  });

  describe('Source placeholder replacement', () => {
    beforeEach(() => {
      (storage.getPrompts as any).mockResolvedValue([
        {
          id: 'test-prompt',
          name: 'Test Prompt',
          prompt: 'Analyze this {{ source }} for insights.',
          isDefault: true
        }
      ]);
    });

    it('should replace {{ source }} with "HackerNews thread" for HackerNews URLs', async () => {
      const request = {
        type: MESSAGE_TYPES.ANALYZE_CONTENT,
        content: 'Test content',
        promptId: 'test-prompt',
        url: 'https://news.ycombinator.com/item?id=12345'
      };

      await messageHandler.handleMessage(request, {} as any, mockSendResponse);

      expect(mockGeminiClient.analyzeContent).toHaveBeenCalledWith(
        'Test content',
        'Analyze this HackerNews thread for insights.'
      );
    });

    it('should replace {{ source }} with "Reddit thread" for Reddit URLs', async () => {
      const request = {
        type: MESSAGE_TYPES.ANALYZE_CONTENT,
        content: 'Test content',
        promptId: 'test-prompt',
        url: 'https://www.reddit.com/r/programming/comments/abc123/test-post'
      };

      await messageHandler.handleMessage(request, {} as any, mockSendResponse);

      expect(mockGeminiClient.analyzeContent).toHaveBeenCalledWith(
        'Test content',
        'Analyze this Reddit thread for insights.'
      );
    });

    it('should replace {{ source }} with "Twitter thread" for Twitter URLs', async () => {
      const request = {
        type: MESSAGE_TYPES.ANALYZE_CONTENT,
        content: 'Test content',
        promptId: 'test-prompt',
        url: 'https://twitter.com/user/status/123456789'
      };

      await messageHandler.handleMessage(request, {} as any, mockSendResponse);

      expect(mockGeminiClient.analyzeContent).toHaveBeenCalledWith(
        'Test content',
        'Analyze this Twitter thread for insights.'
      );
    });

    it('should replace {{ source }} with "Twitter thread" for X.com URLs', async () => {
      const request = {
        type: MESSAGE_TYPES.ANALYZE_CONTENT,
        content: 'Test content',
        promptId: 'test-prompt',
        url: 'https://x.com/user/status/123456789'
      };

      await messageHandler.handleMessage(request, {} as any, mockSendResponse);

      expect(mockGeminiClient.analyzeContent).toHaveBeenCalledWith(
        'Test content',
        'Analyze this Twitter thread for insights.'
      );
    });

    it('should replace {{ source }} with "text" for other URLs', async () => {
      const request = {
        type: MESSAGE_TYPES.ANALYZE_CONTENT,
        content: 'Test content',
        promptId: 'test-prompt',
        url: 'https://example.com/some-article'
      };

      await messageHandler.handleMessage(request, {} as any, mockSendResponse);

      expect(mockGeminiClient.analyzeContent).toHaveBeenCalledWith(
        'Test content',
        'Analyze this text for insights.'
      );
    });

    it('should handle multiple {{ source }} placeholders in the same prompt', async () => {
      (storage.getPrompts as any).mockResolvedValue([
        {
          id: 'multi-source-prompt',
          name: 'Multi Source Prompt',
          prompt: 'First analyze this {{ source }} and then review the {{ source }} again.',
          isDefault: true
        }
      ]);

      const request = {
        type: MESSAGE_TYPES.ANALYZE_CONTENT,
        content: 'Test content',
        promptId: 'multi-source-prompt',
        url: 'https://news.ycombinator.com/item?id=12345'
      };

      await messageHandler.handleMessage(request, {} as any, mockSendResponse);

      expect(mockGeminiClient.analyzeContent).toHaveBeenCalledWith(
        'Test content',
        'First analyze this HackerNews thread and then review the HackerNews thread again.'
      );
    });

    it('should handle prompts without {{ source }} placeholder', async () => {
      (storage.getPrompts as any).mockResolvedValue([
        {
          id: 'no-placeholder-prompt',
          name: 'No Placeholder Prompt',
          prompt: 'Analyze this content for insights.',
          isDefault: true
        }
      ]);

      const request = {
        type: MESSAGE_TYPES.ANALYZE_CONTENT,
        content: 'Test content',
        promptId: 'no-placeholder-prompt',
        url: 'https://news.ycombinator.com/item?id=12345'
      };

      await messageHandler.handleMessage(request, {} as any, mockSendResponse);

      expect(mockGeminiClient.analyzeContent).toHaveBeenCalledWith(
        'Test content',
        'Analyze this content for insights.'
      );
    });

    it('should handle {{ source }} with different spacing', async () => {
      (storage.getPrompts as any).mockResolvedValue([
        {
          id: 'spaced-prompt',
          name: 'Spaced Prompt',
          prompt: 'Analyze this {{source}} and this {{  source  }} for insights.',
          isDefault: true
        }
      ]);

      const request = {
        type: MESSAGE_TYPES.ANALYZE_CONTENT,
        content: 'Test content',
        promptId: 'spaced-prompt',
        url: 'https://reddit.com/r/test'
      };

      await messageHandler.handleMessage(request, {} as any, mockSendResponse);

      expect(mockGeminiClient.analyzeContent).toHaveBeenCalledWith(
        'Test content',
        'Analyze this Reddit thread and this Reddit thread for insights.'
      );
    });
  });
});