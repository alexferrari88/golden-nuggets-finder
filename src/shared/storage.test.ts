import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockChrome } from "../../tests/setup";
import { DEFAULT_PROMPTS } from "./constants";
import { type AccessContext, securityManager } from "./security";
import { StorageManager } from "./storage";

// Type for accessing static properties in tests
interface StorageManagerWithStatic {
	instance: StorageManager | null;
}

describe("StorageManager", () => {
	let storageManager: StorageManager;

	beforeEach(() => {
		vi.clearAllMocks();
		storageManager = StorageManager.getInstance();
		// Clear cache before each test
		storageManager.clearAllCache();
		// Clear sensitive data to reset any cached security state
		storageManager.clearSensitiveData();
		// Reset singleton instance to ensure clean state
		(StorageManager as unknown as StorageManagerWithStatic).instance = null;
		storageManager = StorageManager.getInstance();
	});

	describe("Singleton Pattern", () => {
		it("should return the same instance", () => {
			const instance1 = StorageManager.getInstance();
			const instance2 = StorageManager.getInstance();
			expect(instance1).toBe(instance2);
		});
	});

	describe("API Key Management", () => {
		it("should get API key from storage (legacy plain text)", async () => {
			const testApiKey = "test-api-key";
			mockChrome.storage.sync.get.mockResolvedValueOnce({
				geminiApiKey: testApiKey,
			});
			mockChrome.storage.sync.set.mockResolvedValueOnce(undefined);

			const context: AccessContext = {
				source: "background",
				action: "read",
				timestamp: Date.now(),
			};
			const result = await storageManager.getApiKey(context);
			expect(result).toBe(testApiKey);
			expect(mockChrome.storage.sync.get).toHaveBeenCalledWith("geminiApiKey");
			// Should migrate to encrypted format
			expect(mockChrome.storage.sync.set).toHaveBeenCalled();
		});

		it("should get encrypted API key from storage", async () => {
			const encryptedData = {
				encrypted: "0102030405060708",
				iv: "010203040506070809101112",
				salt: "0102030405060708090a0b0c0d0e0f10",
				timestamp: Date.now(),
				version: "1.0",
			};
			mockChrome.storage.sync.get.mockResolvedValueOnce({
				geminiApiKey: encryptedData,
			});

			const context: AccessContext = {
				source: "background",
				action: "read",
				timestamp: Date.now(),
			};
			const result = await storageManager.getApiKey(context);
			expect(result).toBe("test-api-key"); // This comes from our mock decrypt
			expect(mockChrome.storage.sync.get).toHaveBeenCalledWith("geminiApiKey");
		});

		it("should return empty string if no API key exists", async () => {
			mockChrome.storage.sync.get.mockResolvedValueOnce({});

			const context: AccessContext = {
				source: "background",
				action: "read",
				timestamp: Date.now(),
			};
			const result = await storageManager.getApiKey(context);
			expect(result).toBe("");
		});

		it("should throw error for invalid access context", async () => {
			const invalidContext: AccessContext = {
				source: "content",
				action: "write",
				timestamp: Date.now(),
			};
			await expect(storageManager.getApiKey(invalidContext)).rejects.toThrow(
				"Content script cannot write API keys - security policy violation",
			);
		});

		it("should save API key to storage (encrypted)", async () => {
			const testApiKey = "test-api-key";
			mockChrome.storage.sync.set.mockResolvedValueOnce(undefined);

			const context: AccessContext = {
				source: "background",
				action: "write",
				timestamp: Date.now(),
			};
			await storageManager.saveApiKey(testApiKey, context);

			expect(mockChrome.storage.sync.set).toHaveBeenCalled();
			const setCall = mockChrome.storage.sync.set.mock.calls[0][0];
			expect(setCall).toHaveProperty("geminiApiKey");
			expect(setCall.geminiApiKey).toHaveProperty("encrypted");
			expect(setCall.geminiApiKey).toHaveProperty("iv");
			expect(setCall.geminiApiKey).toHaveProperty("salt");
			expect(setCall.geminiApiKey).toHaveProperty("timestamp");
			expect(setCall.geminiApiKey).toHaveProperty("version");
		});
	});

	describe("Prompt Management", () => {
		it("should get prompts from storage", async () => {
			const testPrompts = [
				{ id: "1", name: "Test", prompt: "Test prompt", isDefault: true },
			];
			mockChrome.storage.sync.get.mockResolvedValueOnce({
				userPrompts: testPrompts,
			});

			const result = await storageManager.getPrompts();
			expect(result).toEqual(testPrompts);
		});

		it("should return and save default prompts if none exist", async () => {
			mockChrome.storage.sync.get.mockResolvedValueOnce({});
			mockChrome.storage.sync.set.mockResolvedValueOnce(undefined);

			const result = await storageManager.getPrompts();
			expect(result).toEqual(DEFAULT_PROMPTS);
			expect(mockChrome.storage.sync.set).toHaveBeenCalledWith({
				userPrompts: DEFAULT_PROMPTS,
			});
		});

		it("should save prompts to storage", async () => {
			const testPrompts = [
				{ id: "1", name: "Test", prompt: "Test prompt", isDefault: true },
			];
			mockChrome.storage.sync.set.mockResolvedValueOnce(undefined);

			await storageManager.savePrompts(testPrompts);
			expect(mockChrome.storage.sync.set).toHaveBeenCalledWith({
				userPrompts: testPrompts,
			});
		});

		it("should throw error if prompts data is too large", async () => {
			const largePrompts = Array.from({ length: 100 }, (_, i) => ({
				id: `${i}`,
				name: `Test ${i}`,
				prompt: "A".repeat(200),
				isDefault: i === 0,
			}));

			await expect(storageManager.savePrompts(largePrompts)).rejects.toThrow(
				"Prompt data too large",
			);
		});

		it("should save individual prompt - update existing", async () => {
			const existingPrompts = [
				{ id: "1", name: "Test", prompt: "Test prompt", isDefault: true },
			];
			const updatedPrompt = {
				id: "1",
				name: "Updated Test",
				prompt: "Updated prompt",
				isDefault: true,
			};

			mockChrome.storage.sync.get.mockResolvedValueOnce({
				userPrompts: existingPrompts,
			});
			mockChrome.storage.sync.set.mockResolvedValueOnce(undefined);

			await storageManager.savePrompt(updatedPrompt);
			expect(mockChrome.storage.sync.set).toHaveBeenCalledWith({
				userPrompts: [updatedPrompt],
			});
		});

		it("should save individual prompt - add new", async () => {
			const existingPrompts = [
				{ id: "1", name: "Test", prompt: "Test prompt", isDefault: true },
			];
			const newPrompt = {
				id: "2",
				name: "New Test",
				prompt: "New prompt",
				isDefault: false,
			};

			mockChrome.storage.sync.get.mockResolvedValueOnce({
				userPrompts: existingPrompts,
			});
			mockChrome.storage.sync.set.mockResolvedValueOnce(undefined);

			await storageManager.savePrompt(newPrompt);

			// Check that the call was made with the correct structure
			const setCall = mockChrome.storage.sync.set.mock.calls[0][0];
			expect(setCall).toHaveProperty("userPrompts");
			expect(setCall.userPrompts).toHaveLength(2);
			expect(setCall.userPrompts[0]).toEqual(existingPrompts[0]);
			expect(setCall.userPrompts[1]).toEqual(newPrompt);
		});

		it("should delete prompt", async () => {
			const existingPrompts = [
				{ id: "1", name: "Test 1", prompt: "Test prompt 1", isDefault: true },
				{ id: "2", name: "Test 2", prompt: "Test prompt 2", isDefault: false },
			];

			mockChrome.storage.sync.get.mockResolvedValueOnce({
				userPrompts: existingPrompts,
			});
			mockChrome.storage.sync.set.mockResolvedValueOnce(undefined);

			await storageManager.deletePrompt("1");
			expect(mockChrome.storage.sync.set).toHaveBeenCalledWith({
				userPrompts: [existingPrompts[1]],
			});
		});

		it("should set default prompt", async () => {
			const existingPrompts = [
				{ id: "1", name: "Test 1", prompt: "Test prompt 1", isDefault: true },
				{ id: "2", name: "Test 2", prompt: "Test prompt 2", isDefault: false },
			];

			mockChrome.storage.sync.get.mockResolvedValueOnce({
				userPrompts: existingPrompts,
			});
			mockChrome.storage.sync.set.mockResolvedValueOnce(undefined);

			await storageManager.setDefaultPrompt("2");
			expect(mockChrome.storage.sync.set).toHaveBeenCalledWith({
				userPrompts: [
					{ ...existingPrompts[0], isDefault: false },
					{ ...existingPrompts[1], isDefault: true },
				],
			});
		});

		it("should get default prompt", async () => {
			const existingPrompts = [
				{ id: "1", name: "Test 1", prompt: "Test prompt 1", isDefault: false },
				{ id: "2", name: "Test 2", prompt: "Test prompt 2", isDefault: true },
			];

			mockChrome.storage.sync.get.mockResolvedValueOnce({
				userPrompts: existingPrompts,
			});

			const result = await storageManager.getDefaultPrompt();
			expect(result).toEqual(existingPrompts[1]);
		});

		it("should return first prompt if no default set", async () => {
			const existingPrompts = [
				{ id: "1", name: "Test 1", prompt: "Test prompt 1", isDefault: false },
				{ id: "2", name: "Test 2", prompt: "Test prompt 2", isDefault: false },
			];

			mockChrome.storage.sync.get.mockResolvedValueOnce({
				userPrompts: existingPrompts,
			});

			const result = await storageManager.getDefaultPrompt();
			expect(result).toEqual(existingPrompts[0]);
		});

		it("should return null if no prompts exist", async () => {
			mockChrome.storage.sync.get.mockResolvedValueOnce({});
			mockChrome.storage.sync.set.mockResolvedValueOnce(undefined);

			// Mock the getPrompts call to return empty array
			vi.spyOn(storageManager, "getPrompts").mockResolvedValueOnce([]);

			const result = await storageManager.getDefaultPrompt();
			expect(result).toBeNull();
		});
	});

	describe("Persona Management", () => {
		it("should get persona from storage", async () => {
			const testPersona =
				"I am a software engineer interested in AI and productivity";
			// Clear cache and reset mocks for this test
			storageManager.clearAllCache();
			mockChrome.storage.sync.get.mockReset();
			mockChrome.storage.sync.get.mockResolvedValue({
				userPersona: testPersona,
			});

			const result = await storageManager.getPersona();
			expect(result).toBe(testPersona);
			expect(mockChrome.storage.sync.get).toHaveBeenCalledWith("userPersona");
		});

		it("should return empty string if no persona exists", async () => {
			// Clear cache and reset mocks for this test
			storageManager.clearAllCache();
			mockChrome.storage.sync.get.mockReset();
			mockChrome.storage.sync.get.mockResolvedValue({});

			const result = await storageManager.getPersona();
			expect(result).toBe("");
		});

		it("should return cached persona when available", async () => {
			const testPersona = "Cached persona";
			// Clear cache and reset mocks for this test
			storageManager.clearAllCache();
			mockChrome.storage.sync.get.mockReset();

			// First call - should go to storage
			mockChrome.storage.sync.get.mockResolvedValue({
				userPersona: testPersona,
			});

			const result1 = await storageManager.getPersona();
			expect(result1).toBe(testPersona);
			expect(mockChrome.storage.sync.get).toHaveBeenCalledTimes(1);

			// Second call - should use cache
			const result2 = await storageManager.getPersona();
			expect(result2).toBe(testPersona);
			expect(mockChrome.storage.sync.get).toHaveBeenCalledTimes(1); // No additional calls
		});

		it("should save persona to storage", async () => {
			const testPersona = "New persona description";
			// Clear cache and reset mocks for this test
			storageManager.clearAllCache();
			mockChrome.storage.sync.set.mockReset();
			mockChrome.storage.sync.set.mockResolvedValue(undefined);

			await storageManager.savePersona(testPersona);
			expect(mockChrome.storage.sync.set).toHaveBeenCalledWith({
				userPersona: testPersona,
			});
		});

		it("should save persona and retrieve correctly", async () => {
			const testPersona = "Round trip test persona";
			// Clear cache and reset mocks for this test
			storageManager.clearAllCache();
			mockChrome.storage.sync.set.mockReset();
			mockChrome.storage.sync.get.mockReset();

			mockChrome.storage.sync.set.mockResolvedValue(undefined);
			mockChrome.storage.sync.get.mockResolvedValue({
				userPersona: testPersona,
			});

			// Save persona
			await storageManager.savePersona(testPersona);
			expect(mockChrome.storage.sync.set).toHaveBeenCalledWith({
				userPersona: testPersona,
			});

			// Clear cache to test retrieval from storage
			storageManager.clearAllCache();

			// Retrieve persona
			const result = await storageManager.getPersona();
			expect(result).toBe(testPersona);
		});
	});

	describe("Configuration Management", () => {
		it("should get complete configuration", async () => {
			const testApiKey = "test-api-key";
			const testPrompts = [
				{ id: "1", name: "Test", prompt: "Test prompt", isDefault: true },
			];
			const testPersona = "Configuration test persona";

			// Mock the individual methods
			vi.spyOn(storageManager, "getApiKey").mockResolvedValue(testApiKey);
			vi.spyOn(storageManager, "getPrompts").mockResolvedValue(testPrompts);
			vi.spyOn(storageManager, "getPersona").mockResolvedValue(testPersona);

			const context: AccessContext = {
				source: "background",
				action: "read",
				timestamp: Date.now(),
			};
			const result = await storageManager.getConfig(context);

			expect(result).toHaveProperty("geminiApiKey");
			expect(result).toHaveProperty("userPrompts");
			expect(result).toHaveProperty("userPersona");
			expect(result.geminiApiKey).toBe(testApiKey);
			expect(Array.isArray(result.userPrompts)).toBe(true);
			expect(result.userPrompts).toHaveLength(1);
			expect(result.userPrompts[0]).toEqual(testPrompts[0]);
			expect(result.userPersona).toBe(testPersona);

			// Verify getApiKey was called with context
			expect(storageManager.getApiKey).toHaveBeenCalledWith(context);
		});

		it("should save partial configuration", async () => {
			const config = {
				geminiApiKey: "new-api-key",
			};

			mockChrome.storage.sync.set.mockResolvedValueOnce(undefined);

			const context: AccessContext = {
				source: "background",
				action: "write",
				timestamp: Date.now(),
			};
			await storageManager.saveConfig(config, context);

			expect(mockChrome.storage.sync.set).toHaveBeenCalled();
			const setCall = mockChrome.storage.sync.set.mock.calls[0][0];
			expect(setCall).toHaveProperty("geminiApiKey");
			expect(setCall.geminiApiKey).toHaveProperty("encrypted");
		});

		it("should save complete configuration", async () => {
			const config = {
				geminiApiKey: "new-api-key",
				userPrompts: [
					{ id: "1", name: "Test", prompt: "Test prompt", isDefault: true },
				],
			};

			mockChrome.storage.sync.set.mockResolvedValue(undefined);

			const context: AccessContext = {
				source: "background",
				action: "write",
				timestamp: Date.now(),
			};
			await storageManager.saveConfig(config, context);

			expect(mockChrome.storage.sync.set).toHaveBeenCalledTimes(2); // Once for API key, once for prompts

			// Check that API key was saved encrypted
			const firstCall = mockChrome.storage.sync.set.mock.calls[0][0];
			expect(firstCall).toHaveProperty("geminiApiKey");
			expect(firstCall.geminiApiKey).toHaveProperty("encrypted");

			// Check that prompts were saved
			const secondCall = mockChrome.storage.sync.set.mock.calls[1][0];
			expect(secondCall).toHaveProperty("userPrompts");
			expect(secondCall.userPrompts).toEqual(config.userPrompts);
		});

		it("should save configuration with persona", async () => {
			const config = {
				userPersona: "I am a data scientist focused on machine learning",
			};

			mockChrome.storage.sync.set.mockResolvedValueOnce(undefined);

			const context: AccessContext = {
				source: "background",
				action: "write",
				timestamp: Date.now(),
			};
			await storageManager.saveConfig(config, context);

			expect(mockChrome.storage.sync.set).toHaveBeenCalledWith({
				userPersona: config.userPersona,
			});
		});

		it("should save complete configuration with persona", async () => {
			const config = {
				geminiApiKey: "new-api-key",
				userPrompts: [
					{ id: "1", name: "Test", prompt: "Test prompt", isDefault: true },
				],
				userPersona: "I am a full-stack developer interested in AI tools",
			};

			mockChrome.storage.sync.set.mockResolvedValue(undefined);

			const context: AccessContext = {
				source: "background",
				action: "write",
				timestamp: Date.now(),
			};
			await storageManager.saveConfig(config, context);

			expect(mockChrome.storage.sync.set).toHaveBeenCalledTimes(2); // Once for API key, once for prompts+persona

			// Check that API key was saved encrypted
			const firstCall = mockChrome.storage.sync.set.mock.calls[0][0];
			expect(firstCall).toHaveProperty("geminiApiKey");
			expect(firstCall.geminiApiKey).toHaveProperty("encrypted");

			// Check that prompts and persona were saved together
			const secondCall = mockChrome.storage.sync.set.mock.calls[1][0];
			expect(secondCall).toHaveProperty("userPrompts");
			expect(secondCall).toHaveProperty("userPersona");
			expect(secondCall.userPrompts).toEqual(config.userPrompts);
			expect(secondCall.userPersona).toEqual(config.userPersona);
		});

		it("should clear all storage", async () => {
			mockChrome.storage.sync.clear.mockResolvedValueOnce(undefined);

			await storageManager.clearAll();
			expect(mockChrome.storage.sync.clear).toHaveBeenCalled();
		});

		it.skip("should check if API key rotation is needed", async () => {
			const oldEncryptedData = {
				encrypted: "0102030405060708",
				iv: "010203040506070809101112",
				salt: "0102030405060708090a0b0c0d0e0f10",
				timestamp: Date.now() - 31 * 24 * 60 * 60 * 1000, // 31 days ago
				version: "1.0",
			};

			// Clear any existing mocks first
			mockChrome.storage.sync.get.mockClear();
			mockChrome.storage.sync.get.mockResolvedValue({
				geminiApiKey: oldEncryptedData,
			});

			// Mock the securityManager method directly to ensure it returns true for old data
			vi.spyOn(securityManager, "isKeyRotationNeeded").mockReturnValue(true);

			const result = await storageManager.isApiKeyRotationNeeded();
			expect(result).toBe(true);
		});

		it("should return false for key rotation if no encrypted data", async () => {
			// Clear any existing mocks first
			mockChrome.storage.sync.get.mockClear();
			mockChrome.storage.sync.get.mockResolvedValue({
				geminiApiKey: "plain-text-key", // legacy format
			});

			const result = await storageManager.isApiKeyRotationNeeded();
			expect(result).toBe(false);
		});

		it("should return false for key rotation if no API key", async () => {
			// Clear any existing mocks first
			mockChrome.storage.sync.get.mockClear();
			mockChrome.storage.sync.get.mockResolvedValue({});

			const result = await storageManager.isApiKeyRotationNeeded();
			expect(result).toBe(false);
		});

		it("should get security audit logs", () => {
			const logs = storageManager.getSecurityAuditLogs();
			expect(Array.isArray(logs)).toBe(true);
		});

		it("should clear sensitive data", () => {
			storageManager.clearSensitiveData();
			// No exception should be thrown
		});
	});

	describe("Analysis State Management", () => {
		it("should save analysis state to storage", async () => {
			const testState = {
				analysisId: "test-save-basic",
				promptName: "Save Test",
				startTime: Date.now(),
				source: "popup" as const,
				currentPhase: 1,
				completedPhases: [0],
				aiStartTime: Date.now() + 1000,
			};

			mockChrome.storage.local.set.mockResolvedValueOnce(undefined);

			await storageManager.setAnalysisState(testState);

			expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
				analysisState: testState,
			});
		});

		it("should clear analysis state from storage", async () => {
			mockChrome.storage.local.remove.mockResolvedValueOnce(undefined);

			await storageManager.clearAnalysisState();

			expect(mockChrome.storage.local.remove).toHaveBeenCalledWith(
				"analysisState",
			);
		});

		it("should propagate storage errors in setAnalysisState", async () => {
			const testState = {
				analysisId: "error-test",
				promptName: "Error Test",
				startTime: Date.now(),
				source: "popup" as const,
				currentPhase: 1,
				completedPhases: [0],
			};

			mockChrome.storage.local.set.mockRejectedValueOnce(
				new Error("Storage full"),
			);

			await expect(storageManager.setAnalysisState(testState)).rejects.toThrow(
				"Storage full",
			);
		});

		it("should propagate storage errors in clearAnalysisState", async () => {
			mockChrome.storage.local.remove.mockRejectedValueOnce(
				new Error("Permission denied"),
			);

			await expect(storageManager.clearAnalysisState()).rejects.toThrow(
				"Permission denied",
			);
		});

		it("should handle states with all required fields", async () => {
			const fullState = {
				analysisId: "full-test",
				promptName: "Full Test",
				startTime: Date.now(),
				source: "context-menu" as const,
				currentPhase: 2,
				completedPhases: [0, 1],
				aiStartTime: Date.now() + 1000,
			};

			mockChrome.storage.local.set.mockResolvedValueOnce(undefined);

			await storageManager.setAnalysisState(fullState);

			expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
				analysisState: fullState,
			});
		});

		it("should handle states with minimal required fields", async () => {
			const minimalState = {
				analysisId: "minimal-test",
				promptName: "Minimal",
				startTime: Date.now(),
				source: "popup" as const,
				currentPhase: 0,
				completedPhases: [],
				// aiStartTime is optional
			};

			mockChrome.storage.local.set.mockResolvedValueOnce(undefined);

			await storageManager.setAnalysisState(minimalState);

			expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
				analysisState: minimalState,
			});
		});
	});
});
