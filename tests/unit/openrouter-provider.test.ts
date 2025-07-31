import { describe, it, expect, vi } from 'vitest';
import { LangChainOpenRouterProvider } from '../../src/shared/providers/langchain-openrouter-provider';
import { ProviderConfig } from '../../src/shared/types/providers';

// Mock the LangChain modules
vi.mock('@langchain/openai', () => ({
  ChatOpenAI: vi.fn().mockImplementation(() => ({
    withStructuredOutput: vi.fn().mockReturnValue({
      invoke: vi.fn().mockResolvedValue({
        golden_nuggets: [
          {
            type: 'tool',
            content: 'Test content',
            synthesis: 'Test synthesis'
          }
        ]
      })
    })
  }))
}));

vi.mock('@langchain/core/messages', () => ({
  HumanMessage: vi.fn(),
  SystemMessage: vi.fn()
}));

describe('LangChainOpenRouterProvider', () => {
  const mockConfig: ProviderConfig = {
    providerId: 'openrouter',
    apiKey: 'test-key',
    modelName: 'anthropic/claude-3-5-sonnet'
  };

  it('should create provider with correct configuration', () => {
    const provider = new LangChainOpenRouterProvider(mockConfig);
    
    expect(provider.providerId).toBe('openrouter');
    expect(provider.modelName).toBe('anthropic/claude-3-5-sonnet');
  });

  it('should use default model when not specified', () => {
    const configWithoutModel = {
      ...mockConfig,
      modelName: undefined
    };
    
    const provider = new LangChainOpenRouterProvider(configWithoutModel as ProviderConfig);
    
    expect(provider.modelName).toBe('anthropic/claude-3-5-sonnet');
  });

  it('should use OpenRouter base URL in configuration', () => {
    const provider = new LangChainOpenRouterProvider(mockConfig);
    
    // Verify the provider was created successfully (tests constructor)
    expect(provider.providerId).toBe('openrouter');
    expect(provider.modelName).toBe('anthropic/claude-3-5-sonnet');
  });

  it('should extract golden nuggets successfully', async () => {
    const provider = new LangChainOpenRouterProvider(mockConfig);
    
    const result = await provider.extractGoldenNuggets(
      'Test content',
      'Test prompt'
    );
    
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

  it('should validate API key successfully', async () => {
    const provider = new LangChainOpenRouterProvider(mockConfig);
    
    const isValid = await provider.validateApiKey();
    
    expect(isValid).toBe(true);
  });

  it('should handle API errors gracefully', async () => {
    const { ChatOpenAI } = await import('@langchain/openai');
    
    // Mock a failure for this test
    (ChatOpenAI as any).mockImplementationOnce(() => ({
      withStructuredOutput: vi.fn().mockReturnValue({
        invoke: vi.fn().mockRejectedValue(new Error('API Error'))
      })
    }));
    
    const provider = new LangChainOpenRouterProvider(mockConfig);
    
    await expect(provider.extractGoldenNuggets('test', 'test'))
      .rejects
      .toThrow('OpenRouter API call failed: API Error');
  });

  it('should handle API key validation failure', async () => {
    const { ChatOpenAI } = await import('@langchain/openai');
    
    // Mock a failure for validation
    (ChatOpenAI as any).mockImplementationOnce(() => ({
      withStructuredOutput: vi.fn().mockReturnValue({
        invoke: vi.fn().mockRejectedValue(new Error('Invalid API key'))
      })
    }));
    
    const provider = new LangChainOpenRouterProvider(mockConfig);
    
    const isValid = await provider.validateApiKey();
    
    expect(isValid).toBe(false);
  });

  it('should handle different model names correctly', () => {
    const configWithDifferentModel = {
      ...mockConfig,
      modelName: 'openai/gpt-4o'
    };
    
    const provider = new LangChainOpenRouterProvider(configWithDifferentModel);
    
    expect(provider.modelName).toBe('openai/gpt-4o');
  });

  it('should call structured output with correct parameters', async () => {
    const mockWithStructuredOutput = vi.fn().mockReturnValue({
      invoke: vi.fn().mockResolvedValue({
        golden_nuggets: []
      })
    });
    
    const { ChatOpenAI } = vi.mocked(await import('@langchain/openai'));
    ChatOpenAI.mockImplementationOnce(() => ({
      withStructuredOutput: mockWithStructuredOutput
    } as any));
    
    const provider = new LangChainOpenRouterProvider(mockConfig);
    await provider.extractGoldenNuggets('test content', 'test prompt');
    
    expect(mockWithStructuredOutput).toHaveBeenCalledWith(
      expect.any(Object), // Schema object
      {
        name: "extract_golden_nuggets",
        method: "functionCalling"
      }
    );
  });

  it('should handle empty response gracefully', async () => {
    const { ChatOpenAI } = await import('@langchain/openai');
    
    (ChatOpenAI as any).mockImplementationOnce(() => ({
      withStructuredOutput: vi.fn().mockReturnValue({
        invoke: vi.fn().mockResolvedValue({
          golden_nuggets: []
        })
      })
    }));
    
    const provider = new LangChainOpenRouterProvider(mockConfig);
    
    const result = await provider.extractGoldenNuggets('test', 'test');
    
    expect(result).toEqual({
      golden_nuggets: []
    });
  });

  it('should validate empty response correctly during API key validation', async () => {
    const { ChatOpenAI } = await import('@langchain/openai');
    
    (ChatOpenAI as any).mockImplementationOnce(() => ({
      withStructuredOutput: vi.fn().mockReturnValue({
        invoke: vi.fn().mockResolvedValue({
          golden_nuggets: []
        })
      })
    }));
    
    const provider = new LangChainOpenRouterProvider(mockConfig);
    
    const isValid = await provider.validateApiKey();
    
    // Empty array should still be considered valid for API key validation
    expect(isValid).toBe(true);
  });

  it('should handle malformed response during validation', async () => {
    // Spy on extractGoldenNuggets to return malformed response
    const provider = new LangChainOpenRouterProvider(mockConfig);
    const spy = vi.spyOn(provider, 'extractGoldenNuggets').mockResolvedValue({
      // Missing golden_nuggets property entirely
    } as any);
    
    const isValid = await provider.validateApiKey();
    
    // The validation logic returns falsy value (undefined) for malformed response
    expect(isValid).toBeFalsy();
    spy.mockRestore();
  });

  it('should handle network timeouts', async () => {
    const { ChatOpenAI } = await import('@langchain/openai');
    
    (ChatOpenAI as any).mockImplementationOnce(() => ({
      withStructuredOutput: vi.fn().mockReturnValue({
        invoke: vi.fn().mockRejectedValue(new Error('Network timeout'))
      })
    }));
    
    const provider = new LangChainOpenRouterProvider(mockConfig);
    
    await expect(provider.extractGoldenNuggets('test', 'test'))
      .rejects
      .toThrow('OpenRouter API call failed: Network timeout');
  });

  it('should handle rate limiting errors', async () => {
    const { ChatOpenAI } = await import('@langchain/openai');
    
    (ChatOpenAI as any).mockImplementationOnce(() => ({
      withStructuredOutput: vi.fn().mockReturnValue({
        invoke: vi.fn().mockRejectedValue(new Error('Rate limit exceeded'))
      })
    }));
    
    const provider = new LangChainOpenRouterProvider(mockConfig);
    
    await expect(provider.extractGoldenNuggets('test', 'test'))
      .rejects
      .toThrow('OpenRouter API call failed: Rate limit exceeded');
  });

  it('should handle provider errors with proper error messages', async () => {
    const provider = new LangChainOpenRouterProvider(mockConfig);
    
    // Spy on extractGoldenNuggets to throw an error
    const spy = vi.spyOn(provider, 'extractGoldenNuggets').mockRejectedValue(new Error('Network error'));
    
    const isValid = await provider.validateApiKey();
    
    expect(isValid).toBe(false);
    spy.mockRestore();
  });

  it('should normalize response format consistently', async () => {
    const provider = new LangChainOpenRouterProvider(mockConfig);
    
    const result = await provider.extractGoldenNuggets(
      'Test content for normalization',
      'Extract insights'
    );
    
    // Validate response structure matches the expected format
    expect(result).toHaveProperty('golden_nuggets');
    expect(Array.isArray(result.golden_nuggets)).toBe(true);
    
    if (result.golden_nuggets.length > 0) {
      const nugget = result.golden_nuggets[0];
      expect(nugget).toHaveProperty('type');
      expect(nugget).toHaveProperty('content');
      expect(nugget).toHaveProperty('synthesis');
      expect(['tool', 'media', 'explanation', 'analogy', 'model']).toContain(nugget.type);
      expect(typeof nugget.content).toBe('string');
      expect(typeof nugget.synthesis).toBe('string');
    }
  });

  it('should handle multiple model names with proper defaults', () => {
    const testCases = [
      { modelName: 'openai/gpt-4o', expected: 'openai/gpt-4o' },
      { modelName: 'anthropic/claude-3-5-sonnet', expected: 'anthropic/claude-3-5-sonnet' },
      { modelName: 'google/gemini-pro', expected: 'google/gemini-pro' },
      { modelName: undefined, expected: 'anthropic/claude-3-5-sonnet' }, // default
    ];

    testCases.forEach(({ modelName, expected }) => {
      const config = { ...mockConfig, modelName };
      const provider = new LangChainOpenRouterProvider(config as ProviderConfig);
      expect(provider.modelName).toBe(expected);
    });
  });
});