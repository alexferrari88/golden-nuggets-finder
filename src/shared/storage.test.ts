import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StorageManager } from './storage';
import { DEFAULT_PROMPTS } from './constants';
import { mockChrome } from '../../tests/setup';

describe('StorageManager', () => {
  let storageManager: StorageManager;

  beforeEach(() => {
    vi.clearAllMocks();
    storageManager = StorageManager.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = StorageManager.getInstance();
      const instance2 = StorageManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('API Key Management', () => {
    it('should get API key from storage', async () => {
      const testApiKey = 'test-api-key';
      mockChrome.storage.sync.get.mockResolvedValueOnce({
        geminiApiKey: testApiKey
      });

      const result = await storageManager.getApiKey();
      expect(result).toBe(testApiKey);
      expect(mockChrome.storage.sync.get).toHaveBeenCalledWith('geminiApiKey');
    });

    it('should return empty string if no API key exists', async () => {
      mockChrome.storage.sync.get.mockResolvedValueOnce({});

      const result = await storageManager.getApiKey();
      expect(result).toBe('');
    });

    it('should save API key to storage', async () => {
      const testApiKey = 'test-api-key';
      mockChrome.storage.sync.set.mockResolvedValueOnce(undefined);

      await storageManager.saveApiKey(testApiKey);
      expect(mockChrome.storage.sync.set).toHaveBeenCalledWith({
        geminiApiKey: testApiKey
      });
    });
  });

  describe('Prompt Management', () => {
    it('should get prompts from storage', async () => {
      const testPrompts = [
        { id: '1', name: 'Test', prompt: 'Test prompt', isDefault: true }
      ];
      mockChrome.storage.sync.get.mockResolvedValueOnce({
        userPrompts: testPrompts
      });

      const result = await storageManager.getPrompts();
      expect(result).toEqual(testPrompts);
    });

    it('should return and save default prompts if none exist', async () => {
      mockChrome.storage.sync.get.mockResolvedValueOnce({});
      mockChrome.storage.sync.set.mockResolvedValueOnce(undefined);

      const result = await storageManager.getPrompts();
      expect(result).toEqual(DEFAULT_PROMPTS);
      expect(mockChrome.storage.sync.set).toHaveBeenCalledWith({
        userPrompts: DEFAULT_PROMPTS
      });
    });

    it('should save prompts to storage', async () => {
      const testPrompts = [
        { id: '1', name: 'Test', prompt: 'Test prompt', isDefault: true }
      ];
      mockChrome.storage.sync.set.mockResolvedValueOnce(undefined);

      await storageManager.savePrompts(testPrompts);
      expect(mockChrome.storage.sync.set).toHaveBeenCalledWith({
        userPrompts: testPrompts
      });
    });

    it('should throw error if prompts data is too large', async () => {
      const largePrompts = Array.from({ length: 100 }, (_, i) => ({
        id: `${i}`,
        name: `Test ${i}`,
        prompt: 'A'.repeat(200),
        isDefault: i === 0
      }));

      await expect(storageManager.savePrompts(largePrompts)).rejects.toThrow(
        'Prompt data too large'
      );
    });

    it('should save individual prompt - update existing', async () => {
      const existingPrompts = [
        { id: '1', name: 'Test', prompt: 'Test prompt', isDefault: true }
      ];
      const updatedPrompt = {
        id: '1',
        name: 'Updated Test',
        prompt: 'Updated prompt',
        isDefault: true
      };

      mockChrome.storage.sync.get.mockResolvedValueOnce({
        userPrompts: existingPrompts
      });
      mockChrome.storage.sync.set.mockResolvedValueOnce(undefined);

      await storageManager.savePrompt(updatedPrompt);
      expect(mockChrome.storage.sync.set).toHaveBeenCalledWith({
        userPrompts: [updatedPrompt]
      });
    });

    it('should save individual prompt - add new', async () => {
      const existingPrompts = [
        { id: '1', name: 'Test', prompt: 'Test prompt', isDefault: true }
      ];
      const newPrompt = {
        id: '2',
        name: 'New Test',
        prompt: 'New prompt',
        isDefault: false
      };

      mockChrome.storage.sync.get.mockResolvedValueOnce({
        userPrompts: existingPrompts
      });
      mockChrome.storage.sync.set.mockResolvedValueOnce(undefined);

      await storageManager.savePrompt(newPrompt);
      
      // Check that the call was made with the correct structure
      const setCall = mockChrome.storage.sync.set.mock.calls[0][0];
      expect(setCall).toHaveProperty('userPrompts');
      expect(setCall.userPrompts).toHaveLength(2);
      expect(setCall.userPrompts[0]).toEqual(existingPrompts[0]);
      expect(setCall.userPrompts[1]).toEqual(newPrompt);
    });

    it('should delete prompt', async () => {
      const existingPrompts = [
        { id: '1', name: 'Test 1', prompt: 'Test prompt 1', isDefault: true },
        { id: '2', name: 'Test 2', prompt: 'Test prompt 2', isDefault: false }
      ];

      mockChrome.storage.sync.get.mockResolvedValueOnce({
        userPrompts: existingPrompts
      });
      mockChrome.storage.sync.set.mockResolvedValueOnce(undefined);

      await storageManager.deletePrompt('1');
      expect(mockChrome.storage.sync.set).toHaveBeenCalledWith({
        userPrompts: [existingPrompts[1]]
      });
    });

    it('should set default prompt', async () => {
      const existingPrompts = [
        { id: '1', name: 'Test 1', prompt: 'Test prompt 1', isDefault: true },
        { id: '2', name: 'Test 2', prompt: 'Test prompt 2', isDefault: false }
      ];

      mockChrome.storage.sync.get.mockResolvedValueOnce({
        userPrompts: existingPrompts
      });
      mockChrome.storage.sync.set.mockResolvedValueOnce(undefined);

      await storageManager.setDefaultPrompt('2');
      expect(mockChrome.storage.sync.set).toHaveBeenCalledWith({
        userPrompts: [
          { ...existingPrompts[0], isDefault: false },
          { ...existingPrompts[1], isDefault: true }
        ]
      });
    });

    it('should get default prompt', async () => {
      const existingPrompts = [
        { id: '1', name: 'Test 1', prompt: 'Test prompt 1', isDefault: false },
        { id: '2', name: 'Test 2', prompt: 'Test prompt 2', isDefault: true }
      ];

      mockChrome.storage.sync.get.mockResolvedValueOnce({
        userPrompts: existingPrompts
      });

      const result = await storageManager.getDefaultPrompt();
      expect(result).toEqual(existingPrompts[1]);
    });

    it('should return first prompt if no default set', async () => {
      const existingPrompts = [
        { id: '1', name: 'Test 1', prompt: 'Test prompt 1', isDefault: false },
        { id: '2', name: 'Test 2', prompt: 'Test prompt 2', isDefault: false }
      ];

      mockChrome.storage.sync.get.mockResolvedValueOnce({
        userPrompts: existingPrompts
      });

      const result = await storageManager.getDefaultPrompt();
      expect(result).toEqual(existingPrompts[0]);
    });

    it('should return null if no prompts exist', async () => {
      mockChrome.storage.sync.get.mockResolvedValueOnce({});
      mockChrome.storage.sync.set.mockResolvedValueOnce(undefined);

      // Mock the getPrompts call to return empty array
      vi.spyOn(storageManager, 'getPrompts').mockResolvedValueOnce([]);

      const result = await storageManager.getDefaultPrompt();
      expect(result).toBeNull();
    });
  });

  describe('Configuration Management', () => {
    it('should get complete configuration', async () => {
      const testApiKey = 'test-api-key';
      const testPrompts = [
        { id: '1', name: 'Test', prompt: 'Test prompt', isDefault: true }
      ];

      // Mock the individual methods
      vi.spyOn(storageManager, 'getApiKey').mockResolvedValue(testApiKey);
      vi.spyOn(storageManager, 'getPrompts').mockResolvedValue(testPrompts);

      const result = await storageManager.getConfig();
      
      expect(result).toHaveProperty('geminiApiKey');
      expect(result).toHaveProperty('userPrompts');
      expect(result.geminiApiKey).toBe(testApiKey);
      expect(Array.isArray(result.userPrompts)).toBe(true);
      expect(result.userPrompts).toHaveLength(1);
      expect(result.userPrompts[0]).toEqual(testPrompts[0]);
    });

    it('should save partial configuration', async () => {
      const config = {
        geminiApiKey: 'new-api-key'
      };

      mockChrome.storage.sync.set.mockResolvedValueOnce(undefined);

      await storageManager.saveConfig(config);
      expect(mockChrome.storage.sync.set).toHaveBeenCalledWith({
        geminiApiKey: 'new-api-key'
      });
    });

    it('should save complete configuration', async () => {
      const config = {
        geminiApiKey: 'new-api-key',
        userPrompts: [
          { id: '1', name: 'Test', prompt: 'Test prompt', isDefault: true }
        ]
      };

      mockChrome.storage.sync.set.mockResolvedValueOnce(undefined);

      await storageManager.saveConfig(config);
      expect(mockChrome.storage.sync.set).toHaveBeenCalledWith({
        geminiApiKey: 'new-api-key',
        userPrompts: config.userPrompts
      });
    });

    it('should clear all storage', async () => {
      mockChrome.storage.sync.clear.mockResolvedValueOnce(undefined);

      await storageManager.clearAll();
      expect(mockChrome.storage.sync.clear).toHaveBeenCalled();
    });
  });
});