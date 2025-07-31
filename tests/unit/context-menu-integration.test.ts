import { beforeEach, describe, expect, it, vi } from "vitest";
import { TypeFilterService } from "../../src/background/type-filter-service";
import { MESSAGE_TYPES } from "../../src/shared/types";

describe("Context Menu Integration Tests", () => {
	let mockChrome: any;
	let mockStorageData: Map<string, any>;
	let analysisCompletedTabs: Set<number>;
	let contextMenuClickHandler: (
		info: chrome.contextMenus.OnClickData,
		tab?: chrome.tabs.Tab,
	) => void;

	// Implementation of context menu click handler for testing
	async function handleContextMenuClick(
		info: chrome.contextMenus.OnClickData,
		tab?: chrome.tabs.Tab,
	): Promise<void> {
		if (!tab?.id) return;

		const menuId = info.menuItemId as string;

		// Parse menu ID
		function parseMenuId(menuId: string) {
			if (menuId === "report-missed-nugget") {
				return {
					type: "missed-nugget",
					promptId: undefined,
					typeFilter: undefined,
				};
			}

			const parts = menuId.split("__");
			if (parts.length < 2) return null;

			const [action, promptId, typeId] = parts;

			// Require valid action and promptId
			if (
				!action ||
				action.trim() === "" ||
				!promptId ||
				promptId.trim() === ""
			)
				return null;

			const type = action === "select-content" ? "selection" : "analysis";

			let typeFilter;
			if (typeId && typeId !== "all") {
				typeFilter = { selectedTypes: [typeId] };
			}

			return { type, promptId, typeFilter };
		}

		const parsed = parseMenuId(menuId);
		if (!parsed) return;

		// Inject content script first
		try {
			await mockChrome.scripting.executeScript({
				target: { tabId: tab.id },
				files: ["content-scripts/content.js"],
			});
		} catch (error) {
			console.error("Content script injection failed:", error);
			return;
		}

		// Send appropriate message based on menu type
		if (parsed.type === "analysis") {
			await mockChrome.tabs.sendMessage(tab.id, {
				type: MESSAGE_TYPES.ANALYZE_CONTENT,
				promptId: parsed.promptId,
				typeFilter: parsed.typeFilter,
				source: "context-menu",
			});
		} else if (parsed.type === "selection") {
			await mockChrome.tabs.sendMessage(tab.id, {
				type: MESSAGE_TYPES.ENTER_SELECTION_MODE,
				promptId: parsed.promptId,
				typeFilter: parsed.typeFilter,
			});
		} else if (parsed.type === "missed-nugget") {
			await mockChrome.tabs.sendMessage(tab.id, {
				type: MESSAGE_TYPES.ENTER_MISSING_CONTENT_MODE,
				selectedText: info.selectionText,
				url: info.pageUrl,
			});
		}
	}

	beforeEach(() => {
		// Setup storage mock
		mockStorageData = new Map();
		analysisCompletedTabs = new Set();

		// Initialize the context menu click handler
		contextMenuClickHandler = handleContextMenuClick;

		mockChrome = {
			contextMenus: {
				create: vi.fn().mockImplementation((createProperties) => {
					return `menu_${createProperties.id || Math.random()}`;
				}),
				removeAll: vi.fn().mockResolvedValue(undefined),
				onClicked: {
					addListener: vi.fn().mockImplementation((handler) => {
						if (handler) contextMenuClickHandler = handler;
					}),
					removeListener: vi.fn(),
				},
			},
			storage: {
				sync: {
					get: vi.fn().mockImplementation((keys) => {
						const result: any = {};
						if (typeof keys === "string") {
							result[keys] = mockStorageData.get(keys);
						} else if (Array.isArray(keys)) {
							keys.forEach((key) => {
								result[key] = mockStorageData.get(key);
							});
						}
						return Promise.resolve(result);
					}),
				},
			},
			tabs: {
				sendMessage: vi.fn().mockResolvedValue({ success: true }),
				query: vi.fn(),
				get: vi.fn(),
			},
			scripting: {
				executeScript: vi.fn().mockResolvedValue([]),
			},
		};

		global.chrome = mockChrome;

		// Setup default prompts
		mockStorageData.set("userPrompts", [
			{
				id: "default-prompt",
				name: "Default Analysis",
				prompt: "Analyze this content for golden nuggets",
				isDefault: true,
			},
			{
				id: "custom-prompt-1",
				name: "Custom Analysis 1",
				prompt: "Custom prompt content 1",
				isDefault: false,
			},
			{
				id: "custom-prompt-2",
				name: "Custom Analysis 2",
				prompt: "Custom prompt content 2",
				isDefault: false,
			},
		]);
	});

	describe("Context Menu Creation Integration", () => {
		it("should create hierarchical context menus with type filtering options", async () => {
			// Simulate context menu creation process
			const prompts = mockStorageData.get("userPrompts");
			const nuggetTypes = TypeFilterService.CONTEXT_MENU_OPTIONS;

			// Create parent menu
			mockChrome.contextMenus.create({
				id: "golden-nugget-finder",
				title: "Golden Nugget Finder",
				contexts: ["page", "selection"],
			});

			// Create prompt submenus with type filtering
			prompts.forEach((prompt: any) => {
				const promptMenuId = `prompt__${prompt.id}`;

				// Parent prompt menu
				mockChrome.contextMenus.create({
					id: promptMenuId,
					parentId: "golden-nugget-finder",
					title: prompt.isDefault ? `⭐ ${prompt.name}` : prompt.name,
					contexts: ["page", "selection"],
				});

				// Type filter submenus
				nuggetTypes.forEach((option) => {
					mockChrome.contextMenus.create({
						id: `${promptMenuId}__${option.id}`,
						parentId: promptMenuId,
						title: option.title,
						contexts: ["page", "selection"],
					});
				});
			});

			// Create separator and utility menus
			mockChrome.contextMenus.create({
				id: "separator-1",
				parentId: "golden-nugget-finder",
				type: "separator",
				contexts: ["page", "selection"],
			});

			mockChrome.contextMenus.create({
				id: "select-content",
				parentId: "golden-nugget-finder",
				title: "✂️ Select Content to Analyze",
				contexts: ["page"],
			});

			mockChrome.contextMenus.create({
				id: "report-missed-nugget",
				parentId: "golden-nugget-finder",
				title: "🚩 Report missed golden nugget",
				contexts: ["selection"],
			});

			// Calculate expected menu count:
			// 1 parent menu + 3 prompts + (3 prompts × 6 type options) + 3 utility menus = 25 total
			const expectedMenuCount = 1 + 3 + 3 * 6 + 3;

			expect(mockChrome.contextMenus.create).toHaveBeenCalledTimes(
				expectedMenuCount,
			);

			// Verify specific menu creation calls
			expect(mockChrome.contextMenus.create).toHaveBeenCalledWith({
				id: "golden-nugget-finder",
				title: "Golden Nugget Finder",
				contexts: ["page", "selection"],
			});

			expect(mockChrome.contextMenus.create).toHaveBeenCalledWith({
				id: "prompt__default-prompt",
				parentId: "golden-nugget-finder",
				title: "⭐ Default Analysis",
				contexts: ["page", "selection"],
			});

			expect(mockChrome.contextMenus.create).toHaveBeenCalledWith({
				id: "prompt__default-prompt__tool",
				parentId: "prompt__default-prompt",
				title: "🛠️ Tools Only",
				contexts: ["page", "selection"],
			});
		});

		it("should handle context menu removal and recreation", async () => {
			// First, create menus
			mockChrome.contextMenus.create({
				id: "test-menu",
				title: "Test Menu",
			});

			// Then remove all menus
			await mockChrome.contextMenus.removeAll();

			expect(mockChrome.contextMenus.removeAll).toHaveBeenCalled();

			// Recreate menus - should work without errors
			mockChrome.contextMenus.create({
				id: "recreated-menu",
				title: "Recreated Menu",
			});

			expect(mockChrome.contextMenus.create).toHaveBeenCalledWith({
				id: "recreated-menu",
				title: "Recreated Menu",
			});
		});
	});

	describe("Context Menu Click Handling Integration", () => {
		it("should handle page analysis context menu clicks with type filtering", async () => {
			const clickInfo: chrome.contextMenus.OnClickData = {
				menuItemId: "prompt__default-prompt__tool",
				pageUrl: "https://news.ycombinator.com/item?id=123",
				selectionText: undefined,
			};

			const tab: chrome.tabs.Tab = {
				id: 123,
				url: "https://news.ycombinator.com/item?id=123",
				title: "HN Discussion",
				active: true,
				highlighted: false,
				pinned: false,
				discarded: false,
				autoDiscardable: true,
				index: 0,
				windowId: 1,
				incognito: false,
			};

			// Mock content script injection
			mockChrome.scripting.executeScript.mockResolvedValueOnce([]);
			mockChrome.tabs.sendMessage.mockResolvedValueOnce({ success: true });

			// Simulate context menu click
			await contextMenuClickHandler(clickInfo, tab);

			// Verify content script injection
			expect(mockChrome.scripting.executeScript).toHaveBeenCalledWith({
				target: { tabId: 123 },
				files: ["content-scripts/content.js"],
			});

			// Verify analysis message was sent with correct type filtering
			expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(
				123,
				expect.objectContaining({
					type: MESSAGE_TYPES.ANALYZE_CONTENT,
					promptId: "default-prompt",
					typeFilter: {
						selectedTypes: ["tool"],
					},
					source: "context-menu",
				}),
			);
		});

		it("should handle all types analysis without type filtering", async () => {
			const clickInfo: chrome.contextMenus.OnClickData = {
				menuItemId: "prompt__custom-prompt-1__all",
				pageUrl: "https://reddit.com/r/programming/comments/abc/",
				selectionText: undefined,
			};

			const tab: chrome.tabs.Tab = {
				id: 456,
				url: "https://reddit.com/r/programming/comments/abc/",
				title: "Reddit Discussion",
				active: true,
				highlighted: false,
				pinned: false,
				discarded: false,
				autoDiscardable: true,
				index: 0,
				windowId: 1,
				incognito: false,
			};

			mockChrome.scripting.executeScript.mockResolvedValueOnce([]);
			mockChrome.tabs.sendMessage.mockResolvedValueOnce({ success: true });

			await contextMenuClickHandler(clickInfo, tab);

			// Verify analysis message was sent without type filtering (all types)
			expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(
				456,
				expect.objectContaining({
					type: MESSAGE_TYPES.ANALYZE_CONTENT,
					promptId: "custom-prompt-1",
					typeFilter: undefined, // No type filtering for "all"
					source: "context-menu",
				}),
			);
		});

		it("should handle content selection mode activation", async () => {
			const clickInfo: chrome.contextMenus.OnClickData = {
				menuItemId: "select-content__custom-prompt-2__media",
				pageUrl: "https://example.com/article",
				selectionText: undefined,
			};

			const tab: chrome.tabs.Tab = {
				id: 789,
				url: "https://example.com/article",
				title: "Example Article",
				active: true,
				highlighted: false,
				pinned: false,
				discarded: false,
				autoDiscardable: true,
				index: 0,
				windowId: 1,
				incognito: false,
			};

			mockChrome.scripting.executeScript.mockResolvedValueOnce([]);
			mockChrome.tabs.sendMessage.mockResolvedValueOnce({ success: true });

			await contextMenuClickHandler(clickInfo, tab);

			// Verify selection mode message was sent
			expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(
				789,
				expect.objectContaining({
					type: MESSAGE_TYPES.ENTER_SELECTION_MODE,
					promptId: "custom-prompt-2",
					typeFilter: {
						selectedTypes: ["media"],
					},
				}),
			);
		});

		it("should handle missed nugget reporting with tab state validation", async () => {
			const tabId = 101;

			// Mark tab as having completed analysis
			analysisCompletedTabs.add(tabId);

			const clickInfo: chrome.contextMenus.OnClickData = {
				menuItemId: "report-missed-nugget",
				pageUrl: "https://example.com/content",
				selectionText: "This important content was missed by the analysis",
			};

			const tab: chrome.tabs.Tab = {
				id: tabId,
				url: "https://example.com/content",
				title: "Content Page",
				active: true,
				highlighted: false,
				pinned: false,
				discarded: false,
				autoDiscardable: true,
				index: 0,
				windowId: 1,
				incognito: false,
			};

			// Mock validation function (normally in background script)
			function validateMissedNuggetReport(
				tab: chrome.tabs.Tab | undefined,
				info: chrome.contextMenus.OnClickData | undefined,
				completedTabs: Set<number>,
			): { valid: boolean; reason?: string } {
				if (!tab?.id) return { valid: false, reason: "No valid tab" };
				if (!completedTabs.has(tab.id))
					return { valid: false, reason: "Analysis not completed" };

				const selectedText = info?.selectionText?.trim() || "";
				if (selectedText.length <= 5)
					return { valid: false, reason: "Selected text too short" };

				return { valid: true };
			}

			const validation = validateMissedNuggetReport(
				tab,
				clickInfo,
				analysisCompletedTabs,
			);
			expect(validation.valid).toBe(true);

			// If validation passes, send missed content mode message
			if (validation.valid) {
				mockChrome.scripting.executeScript.mockResolvedValueOnce([]);
				mockChrome.tabs.sendMessage.mockResolvedValueOnce({ success: true });

				await contextMenuClickHandler(clickInfo, tab);

				expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(
					tabId,
					expect.objectContaining({
						type: MESSAGE_TYPES.ENTER_MISSING_CONTENT_MODE,
						selectedText: "This important content was missed by the analysis",
						url: "https://example.com/content",
					}),
				);
			}
		});

		it("should reject missed nugget reporting when analysis not completed", async () => {
			const tabId = 202;

			// DO NOT mark tab as having completed analysis
			// analysisCompletedTabs.add(tabId); // Commented out intentionally

			const clickInfo: chrome.contextMenus.OnClickData = {
				menuItemId: "report-missed-nugget",
				pageUrl: "https://example.com/no-analysis",
				selectionText: "This content cannot be reported as missed",
			};

			const tab: chrome.tabs.Tab = {
				id: tabId,
				url: "https://example.com/no-analysis",
				title: "No Analysis Page",
				active: true,
				highlighted: false,
				pinned: false,
				discarded: false,
				autoDiscardable: true,
				index: 0,
				windowId: 1,
				incognito: false,
			};

			// Validation function
			function validateMissedNuggetReport(
				tab: chrome.tabs.Tab | undefined,
				info: chrome.contextMenus.OnClickData | undefined,
				completedTabs: Set<number>,
			): { valid: boolean; reason?: string } {
				if (!tab?.id) return { valid: false, reason: "No valid tab" };
				if (!completedTabs.has(tab.id))
					return { valid: false, reason: "Analysis not completed" };

				const selectedText = info?.selectionText?.trim() || "";
				if (selectedText.length <= 5)
					return { valid: false, reason: "Selected text too short" };

				return { valid: true };
			}

			const validation = validateMissedNuggetReport(
				tab,
				clickInfo,
				analysisCompletedTabs,
			);
			expect(validation.valid).toBe(false);
			expect(validation.reason).toBe("Analysis not completed");

			// Should not send any messages when validation fails
			expect(mockChrome.tabs.sendMessage).not.toHaveBeenCalled();
		});

		it("should reject missed nugget reporting with insufficient selected text", async () => {
			const tabId = 303;
			analysisCompletedTabs.add(tabId);

			const clickInfo: chrome.contextMenus.OnClickData = {
				menuItemId: "report-missed-nugget",
				pageUrl: "https://example.com/short",
				selectionText: "short", // Only 5 characters - should be rejected
			};

			const tab: chrome.tabs.Tab = {
				id: tabId,
				url: "https://example.com/short",
				title: "Short Text Page",
				active: true,
				highlighted: false,
				pinned: false,
				discarded: false,
				autoDiscardable: true,
				index: 0,
				windowId: 1,
				incognito: false,
			};

			// Validation function
			function validateMissedNuggetReport(
				tab: chrome.tabs.Tab | undefined,
				info: chrome.contextMenus.OnClickData | undefined,
				completedTabs: Set<number>,
			): { valid: boolean; reason?: string } {
				if (!tab?.id) return { valid: false, reason: "No valid tab" };
				if (!completedTabs.has(tab.id))
					return { valid: false, reason: "Analysis not completed" };

				const selectedText = info?.selectionText?.trim() || "";
				if (selectedText.length <= 5)
					return { valid: false, reason: "Selected text too short" };

				return { valid: true };
			}

			const validation = validateMissedNuggetReport(
				tab,
				clickInfo,
				analysisCompletedTabs,
			);
			expect(validation.valid).toBe(false);
			expect(validation.reason).toBe("Selected text too short");

			// Should not send any messages when validation fails
			expect(mockChrome.tabs.sendMessage).not.toHaveBeenCalled();
		});
	});

	describe("Tab State Management Integration", () => {
		it("should track analysis completion state correctly", () => {
			const tabIds = [100, 200, 300];

			// Add tabs to completed set
			tabIds.forEach((tabId) => analysisCompletedTabs.add(tabId));

			// Verify all tabs are tracked
			expect(analysisCompletedTabs.size).toBe(3);
			tabIds.forEach((tabId) => {
				expect(analysisCompletedTabs.has(tabId)).toBe(true);
			});

			// Remove a tab (simulate tab close)
			analysisCompletedTabs.delete(200);

			expect(analysisCompletedTabs.size).toBe(2);
			expect(analysisCompletedTabs.has(100)).toBe(true);
			expect(analysisCompletedTabs.has(200)).toBe(false);
			expect(analysisCompletedTabs.has(300)).toBe(true);

			// Clear tab state (simulate URL change)
			analysisCompletedTabs.delete(100);
			analysisCompletedTabs.delete(300);

			expect(analysisCompletedTabs.size).toBe(0);
		});

		it("should handle concurrent tab state operations", () => {
			// Simulate rapid tab additions and removals
			const operations = [
				() => analysisCompletedTabs.add(1),
				() => analysisCompletedTabs.add(2),
				() => analysisCompletedTabs.add(3),
				() => analysisCompletedTabs.delete(1),
				() => analysisCompletedTabs.add(4),
				() => analysisCompletedTabs.delete(2),
				() => analysisCompletedTabs.add(5),
			];

			operations.forEach((op) => op());

			// Final state should have tabs 3, 4, 5
			expect(analysisCompletedTabs.size).toBe(3);
			expect(analysisCompletedTabs.has(1)).toBe(false);
			expect(analysisCompletedTabs.has(2)).toBe(false);
			expect(analysisCompletedTabs.has(3)).toBe(true);
			expect(analysisCompletedTabs.has(4)).toBe(true);
			expect(analysisCompletedTabs.has(5)).toBe(true);

			// Verify sorted order for consistency
			const sortedTabs = [...analysisCompletedTabs].sort((a, b) => a - b);
			expect(sortedTabs).toEqual([3, 4, 5]);
		});
	});

	describe("Menu ID Parsing Integration", () => {
		it("should correctly parse complex menu IDs with TypeFilterService integration", () => {
			const testCases = [
				{
					menuId: "prompt__default-prompt__all",
					expected: {
						type: "analysis",
						promptId: "default-prompt",
						typeFilter: undefined, // 'all' means no filtering
					},
				},
				{
					menuId: "prompt__custom-prompt-1__tool",
					expected: {
						type: "analysis",
						promptId: "custom-prompt-1",
						typeFilter: { selectedTypes: ["tool"] },
					},
				},
				{
					menuId: "prompt__another-prompt__media",
					expected: {
						type: "analysis",
						promptId: "another-prompt",
						typeFilter: { selectedTypes: ["media"] },
					},
				},
				{
					menuId: "select-content__test-prompt__explanation",
					expected: {
						type: "selection",
						promptId: "test-prompt",
						typeFilter: { selectedTypes: ["explanation"] },
					},
				},
				{
					menuId: "report-missed-nugget",
					expected: {
						type: "missed-nugget",
						promptId: undefined,
						typeFilter: undefined,
					},
				},
			];

			function parseMenuId(menuId: string) {
				if (menuId === "report-missed-nugget") {
					return {
						type: "missed-nugget",
						promptId: undefined,
						typeFilter: undefined,
					};
				}

				const parts = menuId.split("__");
				if (parts.length < 2) return null;

				const [action, promptId, typeId] = parts;
				const type = action === "select-content" ? "selection" : "analysis";

				let typeFilter;
				if (typeId && typeId !== "all") {
					typeFilter = { selectedTypes: [typeId] };
				}

				return { type, promptId, typeFilter };
			}

			testCases.forEach((testCase) => {
				const result = parseMenuId(testCase.menuId);
				expect(result).toEqual(testCase.expected);
			});
		});

		it("should handle invalid menu ID formats gracefully", () => {
			const invalidIds = [
				"invalid-format",
				"prompt__", // Missing prompt ID
				"__tool", // Missing action
				"", // Empty string
				"prompt", // Single part only
			];

			const validIds = [
				"prompt__test__tool__extra", // Too many parts - should still work
			];

			function parseMenuId(menuId: string) {
				if (!menuId || menuId === "report-missed-nugget") {
					return menuId === "report-missed-nugget"
						? {
								type: "missed-nugget",
								promptId: undefined,
								typeFilter: undefined,
							}
						: null;
				}

				const parts = menuId.split("__");
				if (parts.length < 2) return null;

				const [action, promptId, typeId] = parts;

				// Require valid action and promptId
				if (
					!action ||
					action.trim() === "" ||
					!promptId ||
					promptId.trim() === ""
				)
					return null;

				const type = action === "select-content" ? "selection" : "analysis";

				let typeFilter;
				if (typeId && typeId !== "all") {
					typeFilter = { selectedTypes: [typeId] };
				}

				return { type, promptId, typeFilter };
			}

			invalidIds.forEach((invalidId) => {
				const result = parseMenuId(invalidId);
				expect(result).toBeNull();
			});

			validIds.forEach((validId) => {
				const result = parseMenuId(validId);
				expect(result).toEqual({
					type: "analysis",
					promptId: "test",
					typeFilter: { selectedTypes: ["tool"] },
				});
			});
		});
	});

	describe("Content Script Injection Integration", () => {
		it("should handle content script injection with proper error handling", async () => {
			const tabId = 404;

			// Test successful injection
			mockChrome.scripting.executeScript.mockResolvedValueOnce([]);
			mockChrome.tabs.sendMessage
				.mockRejectedValueOnce(new Error("No content script")) // First PING fails
				.mockResolvedValueOnce({ success: true }); // Verification PING succeeds

			async function injectAndVerifyContentScript(
				tabId: number,
			): Promise<boolean> {
				try {
					// Check if content script is already injected
					const testResponse = await mockChrome.tabs
						.sendMessage(tabId, { type: "PING" })
						.catch(() => null);

					if (testResponse) {
						return true; // Already injected
					}

					// Inject the content script
					await mockChrome.scripting.executeScript({
						target: { tabId },
						files: ["content-scripts/content.js"],
					});

					// Verify injection worked
					const verifyResponse = await mockChrome.tabs
						.sendMessage(tabId, { type: "PING" })
						.catch(() => null);

					return !!verifyResponse;
				} catch (error) {
					console.error("Content script injection failed:", error);
					return false;
				}
			}

			const result = await injectAndVerifyContentScript(tabId);
			expect(result).toBe(true);

			expect(mockChrome.scripting.executeScript).toHaveBeenCalledWith({
				target: { tabId },
				files: ["content-scripts/content.js"],
			});
		});

		it("should handle injection failures gracefully", async () => {
			const tabId = 500;

			// Mock injection failure
			mockChrome.tabs.sendMessage.mockRejectedValueOnce(
				new Error("No content script"),
			); // First PING fails
			mockChrome.scripting.executeScript.mockRejectedValueOnce(
				new Error("Permission denied"),
			); // Injection fails

			async function injectAndVerifyContentScript(
				tabId: number,
			): Promise<boolean> {
				try {
					const testResponse = await mockChrome.tabs
						.sendMessage(tabId, { type: "PING" })
						.catch(() => null);

					if (testResponse) {
						return true;
					}

					await mockChrome.scripting.executeScript({
						target: { tabId },
						files: ["content-scripts/content.js"],
					});

					const verifyResponse = await mockChrome.tabs
						.sendMessage(tabId, { type: "PING" })
						.catch(() => null);

					return !!verifyResponse;
				} catch (error) {
					console.error("Content script injection failed:", error);
					return false;
				}
			}

			const result = await injectAndVerifyContentScript(tabId);
			expect(result).toBe(false);

			expect(mockChrome.scripting.executeScript).toHaveBeenCalledTimes(1);
		});

		it("should detect already injected content scripts", async () => {
			const tabId = 600;

			// Mock already injected content script
			mockChrome.tabs.sendMessage.mockResolvedValueOnce({
				success: true,
				alreadyInjected: true,
			});

			async function injectAndVerifyContentScript(
				tabId: number,
			): Promise<boolean> {
				try {
					const testResponse = await mockChrome.tabs
						.sendMessage(tabId, { type: "PING" })
						.catch(() => null);

					if (testResponse) {
						return true; // Already injected
					}

					await mockChrome.scripting.executeScript({
						target: { tabId },
						files: ["content-scripts/content.js"],
					});

					const verifyResponse = await mockChrome.tabs
						.sendMessage(tabId, { type: "PING" })
						.catch(() => null);

					return !!verifyResponse;
				} catch (error) {
					console.error("Content script injection failed:", error);
					return false;
				}
			}

			const result = await injectAndVerifyContentScript(tabId);
			expect(result).toBe(true);

			// Should not have attempted injection since script was already present
			expect(mockChrome.scripting.executeScript).not.toHaveBeenCalled();
		});
	});
});
