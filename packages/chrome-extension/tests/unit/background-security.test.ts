import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockOnClickData, createMockTab } from "../utils/chrome-mocks";

// Mock types for Chrome API
interface MockChrome {
	tabs: {
		sendMessage: ReturnType<typeof vi.fn>;
	};
	scripting: {
		executeScript: ReturnType<typeof vi.fn>;
	};
}

interface MockStorage {
	getApiKey: ReturnType<typeof vi.fn>;
}

// Simplified tests focusing on core security logic
describe("Background Script Security - Core Logic Tests", () => {
	let mockChrome: MockChrome;
	let mockStorage: MockStorage;

	beforeEach(() => {
		mockChrome = {
			tabs: {
				sendMessage: vi.fn(),
			},
			scripting: {
				executeScript: vi.fn(),
			},
		};

		mockStorage = {
			getApiKey: vi.fn(),
		};

		global.chrome = mockChrome as any;
	});

	describe("Dynamic Content Script Injection Security", () => {
		async function injectContentScript(tabId: number): Promise<void> {
			// Check if content script is already injected
			const testResponse = await chrome.tabs
				.sendMessage(tabId, { type: "PING" })
				.catch(() => null);

			if (testResponse) {
				return; // Already injected
			}

			// Inject the content script
			await chrome.scripting.executeScript({
				target: { tabId },
				files: ["content-scripts/content.js"],
			});

			// Verify injection worked
			const verifyResponse = await chrome.tabs
				.sendMessage(tabId, { type: "PING" })
				.catch(() => null);

			if (!verifyResponse) {
				throw new Error("Content script failed to inject properly");
			}
		}

		it("should not inject if content script already exists", async () => {
			const tabId = 123;
			mockChrome.tabs.sendMessage.mockResolvedValueOnce({ success: true }); // Already exists

			await injectContentScript(tabId);

			expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(tabId, {
				type: "PING",
			});
			expect(mockChrome.scripting.executeScript).not.toHaveBeenCalled();
		});

		it("should inject and verify when content script not present", async () => {
			const tabId = 123;
			mockChrome.tabs.sendMessage
				.mockRejectedValueOnce(new Error("Not found")) // Initial check fails
				.mockResolvedValueOnce({ success: true }); // Verification succeeds
			mockChrome.scripting.executeScript.mockResolvedValueOnce(undefined);

			await injectContentScript(tabId);

			expect(mockChrome.scripting.executeScript).toHaveBeenCalledWith({
				target: { tabId },
				files: ["content-scripts/content.js"],
			});
			expect(mockChrome.tabs.sendMessage).toHaveBeenCalledTimes(2);
		});

		it("should throw error if injection verification fails", async () => {
			const tabId = 123;
			mockChrome.tabs.sendMessage
				.mockRejectedValueOnce(new Error("Not found")) // Initial check fails
				.mockRejectedValueOnce(new Error("Still not found")); // Verification fails
			mockChrome.scripting.executeScript.mockResolvedValueOnce(undefined);

			await expect(injectContentScript(tabId)).rejects.toThrow(
				"Content script failed to inject properly",
			);
		});

		it("should handle injection API failures", async () => {
			const tabId = 123;
			mockChrome.tabs.sendMessage.mockRejectedValueOnce(new Error("Not found"));
			mockChrome.scripting.executeScript.mockRejectedValueOnce(
				new Error("Injection failed"),
			);

			await expect(injectContentScript(tabId)).rejects.toThrow(
				"Injection failed",
			);
		});
	});

	describe("API Key Security Validation", () => {
		async function validateApiKeyForAnalysis(tabId: number): Promise<boolean> {
			try {
				const apiKey = await mockStorage.getApiKey({
					source: "background",
					action: "read",
					timestamp: Date.now(),
				});

				if (!apiKey) {
					// Show API key error
					await chrome.tabs.sendMessage(tabId, {
						type: "SHOW_API_KEY_ERROR",
					});
					return false;
				}

				return true;
			} catch (_error) {
				// Show API key error on any retrieval failure
				await chrome.tabs.sendMessage(tabId, {
					type: "SHOW_API_KEY_ERROR",
				});
				return false;
			}
		}

		it("should return true when valid API key exists", async () => {
			const tabId = 123;
			mockStorage.getApiKey.mockResolvedValueOnce("valid-api-key");

			const result = await validateApiKeyForAnalysis(tabId);

			expect(result).toBe(true);
			expect(mockStorage.getApiKey).toHaveBeenCalledWith({
				source: "background",
				action: "read",
				timestamp: expect.any(Number),
			});
		});

		it("should return false and show error when no API key", async () => {
			const tabId = 123;
			mockStorage.getApiKey.mockResolvedValueOnce(""); // Empty API key
			mockChrome.tabs.sendMessage.mockResolvedValueOnce({ success: true });

			const result = await validateApiKeyForAnalysis(tabId);

			expect(result).toBe(false);
			expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(tabId, {
				type: "SHOW_API_KEY_ERROR",
			});
		});

		it("should return false and show error when API key retrieval fails", async () => {
			const tabId = 123;
			mockStorage.getApiKey.mockRejectedValueOnce(new Error("Storage error"));
			mockChrome.tabs.sendMessage.mockResolvedValueOnce({ success: true });

			const result = await validateApiKeyForAnalysis(tabId);

			expect(result).toBe(false);
			expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(tabId, {
				type: "SHOW_API_KEY_ERROR",
			});
		});
	});

	describe("Missed Nugget Security Validation", () => {
		function validateMissedNuggetReport(
			tab: chrome.tabs.Tab | undefined,
			info: chrome.contextMenus.OnClickData | undefined,
			analysisCompletedTabs: Set<number> | undefined,
		): { valid: boolean; reason?: string } {
			// Validate tab exists and has ID
			if (!tab?.id) {
				return { valid: false, reason: "No valid tab" };
			}

			// Validate analysis was completed on this tab
			if (!analysisCompletedTabs?.has(tab.id)) {
				return { valid: false, reason: "Analysis not completed" };
			}

			// Validate selected text exists and meets minimum length
			const selectedText = info?.selectionText?.trim() || "";
			if (selectedText.length <= 5) {
				return { valid: false, reason: "Selected text too short" };
			}

			return { valid: true };
		}

		it("should validate tab exists and has ID", () => {
			const analysisCompletedTabs = new Set([123]);
			const info = createMockOnClickData({
				selectionText: "Valid selected text",
			});

			// Test undefined tab
			expect(
				validateMissedNuggetReport(undefined, info, analysisCompletedTabs),
			).toEqual({ valid: false, reason: "No valid tab" });

			// Test tab without ID
			const tabWithoutId = { url: "https://example.com" } as chrome.tabs.Tab;
			expect(
				validateMissedNuggetReport(tabWithoutId, info, analysisCompletedTabs),
			).toEqual({ valid: false, reason: "No valid tab" });
		});

		it("should validate analysis completion state", () => {
			const tab = createMockTab({ id: 123, url: "https://example.com" });
			const info = createMockOnClickData({
				selectionText: "Valid selected text",
			});

			// Test without completed analysis
			const emptyTabs = new Set<number>();
			expect(validateMissedNuggetReport(tab, info, emptyTabs)).toEqual({
				valid: false,
				reason: "Analysis not completed",
			});

			// Test with different tab ID
			const wrongTabTabs = new Set([456]);
			expect(validateMissedNuggetReport(tab, info, wrongTabTabs)).toEqual({
				valid: false,
				reason: "Analysis not completed",
			});

			// Test undefined tracking set
			expect(validateMissedNuggetReport(tab, info, undefined)).toEqual({
				valid: false,
				reason: "Analysis not completed",
			});
		});

		it("should validate selected text length and content", () => {
			const tab = createMockTab({ id: 123, url: "https://example.com" });
			const analysisCompletedTabs = new Set([123]);

			// Test empty text
			expect(
				validateMissedNuggetReport(
					tab,
					createMockOnClickData({ selectionText: "" }),
					analysisCompletedTabs,
				),
			).toEqual({ valid: false, reason: "Selected text too short" });

			// Test short text (5 chars or less)
			expect(
				validateMissedNuggetReport(
					tab,
					createMockOnClickData({ selectionText: "short" }),
					analysisCompletedTabs,
				),
			).toEqual({ valid: false, reason: "Selected text too short" });

			// Test whitespace-only text
			expect(
				validateMissedNuggetReport(
					tab,
					createMockOnClickData({ selectionText: "   " }),
					analysisCompletedTabs,
				),
			).toEqual({ valid: false, reason: "Selected text too short" });

			// Test no selection text
			expect(
				validateMissedNuggetReport(
					tab,
					createMockOnClickData({}),
					analysisCompletedTabs,
				),
			).toEqual({ valid: false, reason: "Selected text too short" });

			// Test undefined info
			expect(
				validateMissedNuggetReport(tab, undefined, analysisCompletedTabs),
			).toEqual({ valid: false, reason: "Selected text too short" });
		});

		it("should pass validation with all valid inputs", () => {
			const tab = createMockTab({ id: 123, url: "https://example.com" });
			const info = createMockOnClickData({
				selectionText: "This is a valid selection text",
			});
			const analysisCompletedTabs = new Set([123]);

			expect(
				validateMissedNuggetReport(tab, info, analysisCompletedTabs),
			).toEqual({ valid: true });
		});

		it("should handle whitespace trimming correctly", () => {
			const tab = createMockTab({ id: 123, url: "https://example.com" });
			const analysisCompletedTabs = new Set([123]);

			// Text that's valid after trimming
			const infoWithWhitespace = createMockOnClickData({
				selectionText: "   Valid content after trimming   ",
			});
			expect(
				validateMissedNuggetReport(
					tab,
					infoWithWhitespace,
					analysisCompletedTabs,
				),
			).toEqual({ valid: true });

			// Text that's too short after trimming
			const infoShortAfterTrim = createMockOnClickData({
				selectionText: "   ab   ",
			});
			expect(
				validateMissedNuggetReport(
					tab,
					infoShortAfterTrim,
					analysisCompletedTabs,
				),
			).toEqual({ valid: false, reason: "Selected text too short" });
		});
	});

	describe("Tab State Management Security", () => {
		it("should properly manage analysis completion tracking", () => {
			const analysisCompletedTabs = new Set<number>();

			// Test adding tab
			analysisCompletedTabs.add(123);
			expect(analysisCompletedTabs.has(123)).toBe(true);
			expect(analysisCompletedTabs.has(456)).toBe(false);

			// Test adding multiple tabs
			analysisCompletedTabs.add(456);
			analysisCompletedTabs.add(789);
			expect(analysisCompletedTabs.size).toBe(3);

			// Test removing tab (on tab close)
			analysisCompletedTabs.delete(456);
			expect(analysisCompletedTabs.has(456)).toBe(false);
			expect(analysisCompletedTabs.has(123)).toBe(true);
			expect(analysisCompletedTabs.has(789)).toBe(true);

			// Test clearing tab state (on URL change)
			analysisCompletedTabs.delete(123);
			expect(analysisCompletedTabs.has(123)).toBe(false);
		});

		it("should handle concurrent tab operations safely", () => {
			const analysisCompletedTabs = new Set<number>();

			// Simulate rapid tab operations
			for (let i = 1; i <= 10; i++) {
				analysisCompletedTabs.add(i);
			}

			expect(analysisCompletedTabs.size).toBe(10);

			// Remove odd tabs
			for (let i = 1; i <= 10; i += 2) {
				analysisCompletedTabs.delete(i);
			}

			expect(analysisCompletedTabs.size).toBe(5);
			expect([...analysisCompletedTabs].sort((a, b) => a - b)).toEqual([
				2, 4, 6, 8, 10,
			]);
		});
	});

	describe("Input Validation Security", () => {
		function validateTabId(tabId: unknown): boolean {
			return typeof tabId === "number" && tabId > 0 && Number.isInteger(tabId);
		}

		function validatePromptId(promptId: unknown): boolean {
			return typeof promptId === "string" && promptId.trim().length > 0;
		}

		function validateTypeId(typeId: unknown): boolean {
			const validTypes = [
				"all",
				"tool",
				"media",
				"aha! moments",
				"analogy",
				"model",
			];
			return typeof typeId === "string" && validTypes.includes(typeId);
		}

		it("should validate tab IDs correctly", () => {
			// Valid tab IDs
			expect(validateTabId(123)).toBe(true);
			expect(validateTabId(1)).toBe(true);

			// Invalid tab IDs
			expect(validateTabId(0)).toBe(false);
			expect(validateTabId(-1)).toBe(false);
			expect(validateTabId(1.5)).toBe(false);
			expect(validateTabId("123")).toBe(false);
			expect(validateTabId(null)).toBe(false);
			expect(validateTabId(undefined)).toBe(false);
		});

		it("should validate prompt IDs correctly", () => {
			// Valid prompt IDs
			expect(validatePromptId("valid-prompt")).toBe(true);
			expect(validatePromptId("prompt-123")).toBe(true);

			// Invalid prompt IDs
			expect(validatePromptId("")).toBe(false);
			expect(validatePromptId("   ")).toBe(false);
			expect(validatePromptId(null)).toBe(false);
			expect(validatePromptId(undefined)).toBe(false);
			expect(validatePromptId(123)).toBe(false);
		});

		it("should validate type IDs correctly", () => {
			// Valid type IDs
			expect(validateTypeId("all")).toBe(true);
			expect(validateTypeId("tool")).toBe(true);
			expect(validateTypeId("media")).toBe(true);
			expect(validateTypeId("aha! moments")).toBe(true);
			expect(validateTypeId("analogy")).toBe(true);
			expect(validateTypeId("model")).toBe(true);

			// Invalid type IDs
			expect(validateTypeId("invalid")).toBe(false);
			expect(validateTypeId("")).toBe(false);
			expect(validateTypeId(null)).toBe(false);
			expect(validateTypeId(undefined)).toBe(false);
			expect(validateTypeId("TOOL")).toBe(false); // Case sensitive
		});
	});
});
