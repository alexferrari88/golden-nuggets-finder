import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TypeFilterService } from "../../src/background/type-filter-service";
import { StorageMigration, storage } from "../../src/shared/storage";
import { MESSAGE_TYPES } from "../../src/shared/types";

// Mock WXT global functions
global.defineBackground = vi.fn((callback) => callback());

// Mock dependencies
vi.mock("../../src/background/gemini-client");
vi.mock("../../src/background/message-handler");
vi.mock("../../src/background/type-filter-service");
vi.mock("../../src/shared/storage", () => ({
	storage: {
		getPrompts: vi.fn(),
		savePrompts: vi.fn(),
		getApiKey: vi.fn(),
		saveApiKey: vi.fn(),
		getConfig: vi.fn(),
		saveConfig: vi.fn(),
	},
	StorageMigration: {
		checkAndRunMigration: vi.fn(),
		validateMigration: vi.fn(),
	},
}));

// Mock Chrome APIs
const mockContextMenus = {
	create: vi.fn(),
	removeAll: vi.fn(),
	onClicked: {
		addListener: vi.fn(),
	},
};

const mockTabs = {
	query: vi.fn(),
	sendMessage: vi.fn(),
	onRemoved: {
		addListener: vi.fn(),
	},
	onUpdated: {
		addListener: vi.fn(),
	},
	onActivated: {
		addListener: vi.fn(),
	},
};

const mockRuntime = {
	onMessage: {
		addListener: vi.fn(),
	},
	onInstalled: {
		addListener: vi.fn(),
	},
	openOptionsPage: vi.fn(),
};

const mockStorage = {
	onChanged: {
		addListener: vi.fn(),
	},
	sync: {
		get: vi.fn(),
		set: vi.fn(),
		remove: vi.fn(),
		clear: vi.fn(),
	},
};

const mockScripting = {
	executeScript: vi.fn(),
};

global.chrome = {
	contextMenus: mockContextMenus,
	tabs: mockTabs,
	runtime: mockRuntime,
	storage: mockStorage,
	scripting: mockScripting,
} as any;

describe("Background Script Context Menu", () => {
	let mockPrompts: any[];
	let mockTypeFilterOptions: any[];
	let onMessageListener: any;
	let onRemovedListener: any;
	let onUpdatedListener: any;
	let onActivatedListener: any;
	let onInstalledListener: any;
	let onStorageChangedListener: any;

	beforeEach(() => {
		// Reset all mocks
		vi.clearAllMocks();

		// Set up default mock data
		mockPrompts = [
			{
				id: "test-prompt-1",
				name: "Test Prompt 1",
				prompt: "Test prompt content",
				isDefault: true,
			},
			{
				id: "test-prompt-2",
				name: "Test Prompt 2",
				prompt: "Another test prompt",
				isDefault: false,
			},
		];

		mockTypeFilterOptions = [
			{
				id: "all",
				title: "🔍 All Types",
				types: ["tool", "media", "explanation", "analogy", "model"],
			},
			{ id: "tools", title: "🛠️ Tools Only", types: ["tool"] },
			{ id: "media", title: "📚 Media Only", types: ["media"] },
		];

		// Mock storage methods
		(storage.getPrompts as any).mockResolvedValue(mockPrompts);

		// Mock StorageMigration
		(StorageMigration.checkAndRunMigration as any).mockResolvedValue(undefined);

		// Mock TypeFilterService
		(TypeFilterService as any).CONTEXT_MENU_OPTIONS = mockTypeFilterOptions;
		(TypeFilterService.getContextMenuOption as any).mockImplementation(
			(id: string) => mockTypeFilterOptions.find((option) => option.id === id),
		);

		// Mock chrome.tabs.query to return a default active tab
		mockTabs.query.mockResolvedValue([{ id: 123, url: "https://example.com" }]);

		// Mock chrome.storage.sync to return empty data for migration
		mockStorage.sync.get.mockResolvedValue({});

		// Capture event listeners
		mockRuntime.onMessage.addListener.mockImplementation((listener: any) => {
			onMessageListener = listener;
		});
		mockTabs.onRemoved.addListener.mockImplementation((listener: any) => {
			onRemovedListener = listener;
		});
		mockTabs.onUpdated.addListener.mockImplementation((listener: any) => {
			onUpdatedListener = listener;
		});
		mockTabs.onActivated.addListener.mockImplementation((listener: any) => {
			onActivatedListener = listener;
		});
		mockRuntime.onInstalled.addListener.mockImplementation((listener: any) => {
			onInstalledListener = listener;
		});
		mockStorage.onChanged.addListener.mockImplementation((listener: any) => {
			onStorageChangedListener = listener;
		});
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe("Tab State Management", () => {
		beforeEach(async () => {
			// Import and initialize the background script
			await import("../../src/entrypoints/background");
		});

		it("should add tab to analysisCompletedTabs when ANALYSIS_COMPLETE message received", async () => {
			const tabId = 123;
			const sender = { tab: { id: tabId } };
			const request = { type: MESSAGE_TYPES.ANALYSIS_COMPLETE };

			// Simulate message with ANALYSIS_COMPLETE
			await onMessageListener(request, sender, vi.fn());

			// Verify that updateContextMenuForActiveTab is called (context menu should be updated)
			expect(mockTabs.query).toHaveBeenCalledWith({
				active: true,
				currentWindow: true,
			});
		});

		it("should remove tab from analysisCompletedTabs when tab is closed", async () => {
			const tabId = 123;

			// First add tab to completed analysis state
			const sender = { tab: { id: tabId } };
			const request = { type: MESSAGE_TYPES.ANALYSIS_COMPLETE };
			await onMessageListener(request, sender, vi.fn());

			// Reset mocks to track the removal behavior
			vi.clearAllMocks();
			mockTabs.query.mockResolvedValue([{ id: 456, url: "https://other.com" }]); // Different active tab

			// Simulate tab removal
			onRemovedListener(tabId);

			// Verify context menu update is triggered
			expect(mockTabs.query).toHaveBeenCalledWith({
				active: true,
				currentWindow: true,
			});
		});

		it("should remove tab from analysisCompletedTabs when URL changes", async () => {
			const tabId = 123;

			// First add tab to completed analysis state
			const sender = { tab: { id: tabId } };
			const request = { type: MESSAGE_TYPES.ANALYSIS_COMPLETE };
			await onMessageListener(request, sender, vi.fn());

			// Reset mocks
			vi.clearAllMocks();

			// Simulate URL change
			onUpdatedListener(tabId, { url: "https://newsite.com" });

			// Verify context menu update is triggered
			expect(mockTabs.query).toHaveBeenCalledWith({
				active: true,
				currentWindow: true,
			});
		});

		it("should update context menu when active tab changes", async () => {
			// Simulate tab activation
			const activationInfo = { tabId: 456, windowId: 1 };
			onActivatedListener(activationInfo);

			// Verify context menu update is triggered
			expect(mockTabs.query).toHaveBeenCalledWith({
				active: true,
				currentWindow: true,
			});
		});

		it("should not update context menu for onUpdated without URL change", async () => {
			// Simulate non-URL change update
			onUpdatedListener(123, { status: "complete" });

			// Verify context menu update is NOT triggered
			expect(mockTabs.query).not.toHaveBeenCalled();
		});
	});

	describe("Context Menu Creation", () => {
		beforeEach(async () => {
			await import("../../src/entrypoints/background");
		});

		it("should create basic menu structure without report option by default", async () => {
			// Simulate initial setup with no analysis completed
			mockTabs.query.mockResolvedValue([
				{ id: 123, url: "https://example.com" },
			]);

			// Trigger context menu setup by simulating installation
			await onInstalledListener({ reason: "install" });

			// Wait for async operations to complete
			await new Promise((resolve) => setTimeout(resolve, 0));

			// Verify menu structure creation
			expect(mockContextMenus.removeAll).toHaveBeenCalled();
			expect(mockContextMenus.create).toHaveBeenCalledWith({
				id: "golden-nuggets-finder",
				title: "Golden Nugget Finder",
				contexts: ["page", "selection"],
			});

			// Verify prompts are created with type filtering submenus
			expect(mockContextMenus.create).toHaveBeenCalledWith({
				id: "prompt-test-prompt-1",
				parentId: "golden-nuggets-finder",
				title: "⭐ Test Prompt 1",
				contexts: ["page", "selection"],
			});

			// Verify type filter submenus are created
			expect(mockContextMenus.create).toHaveBeenCalledWith({
				id: "test-prompt-1__all",
				parentId: "prompt-test-prompt-1",
				title: "🔍 All Types",
				contexts: ["page", "selection"],
			});

			// Verify separator is created
			expect(mockContextMenus.create).toHaveBeenCalledWith({
				id: "separator",
				parentId: "golden-nuggets-finder",
				type: "separator",
				contexts: ["page", "selection"],
			});

			// Verify "Select Content to Analyze" option is created
			expect(mockContextMenus.create).toHaveBeenCalledWith({
				id: "select-comments",
				parentId: "golden-nuggets-finder",
				title: "✂️ Select Content to Analyze",
				contexts: ["page", "selection"],
			});

			// Verify report missed nugget option is NOT created initially
			const reportCalls = mockContextMenus.create.mock.calls.filter(
				(call) => call[0].id === "report-missed-nugget",
			);
			expect(reportCalls).toHaveLength(0);
		});

		it("should include report missed nugget option when analysis completed on active tab", async () => {
			const tabId = 123;

			// First simulate analysis completion on tab
			const sender = { tab: { id: tabId } };
			const request = { type: MESSAGE_TYPES.ANALYSIS_COMPLETE };
			await onMessageListener(request, sender, vi.fn());

			// Now the active tab query should return the same tab that completed analysis
			mockTabs.query.mockResolvedValue([
				{ id: tabId, url: "https://example.com" },
			]);

			// Reset context menu creation mocks to see fresh calls
			mockContextMenus.create.mockClear();

			// Trigger another context menu update
			onActivatedListener({ tabId, windowId: 1 });

			// Wait for async operations
			await new Promise((resolve) => setTimeout(resolve, 0));

			// Verify report missed nugget option IS created
			expect(mockContextMenus.create).toHaveBeenCalledWith({
				id: "report-missed-nugget",
				parentId: "golden-nuggets-finder",
				title: "🚩 Report missed golden nugget",
				contexts: ["selection"],
			});
		});

		it("should handle prompts from storage correctly", async () => {
			// Trigger menu setup
			await onInstalledListener({ reason: "install" });

			// Wait for async operations
			await new Promise((resolve) => setTimeout(resolve, 0));

			// Verify both test prompts were processed
			expect(storage.getPrompts).toHaveBeenCalled();

			// Check first prompt (default - should have star)
			expect(mockContextMenus.create).toHaveBeenCalledWith({
				id: "prompt-test-prompt-1",
				parentId: "golden-nuggets-finder",
				title: "⭐ Test Prompt 1",
				contexts: ["page", "selection"],
			});

			// Check second prompt (not default - no star)
			expect(mockContextMenus.create).toHaveBeenCalledWith({
				id: "prompt-test-prompt-2",
				parentId: "golden-nuggets-finder",
				title: "Test Prompt 2",
				contexts: ["page", "selection"],
			});
		});

		it("should update menu when prompts change in storage", async () => {
			// Simulate storage change for prompts
			const changes = {
				userPrompts: {
					newValue: mockPrompts,
					oldValue: [],
				},
			};

			onStorageChangedListener(changes, "sync");

			// Verify context menu update is triggered
			expect(mockTabs.query).toHaveBeenCalledWith({
				active: true,
				currentWindow: true,
			});
		});

		it("should not update menu for non-prompt storage changes", async () => {
			// Simulate storage change for other data
			const changes = {
				someOtherData: {
					newValue: "test",
					oldValue: "old",
				},
			};

			onStorageChangedListener(changes, "sync");

			// Verify context menu update is NOT triggered
			expect(mockTabs.query).not.toHaveBeenCalled();
		});

		it("should open options page on first install", async () => {
			await onInstalledListener({ reason: "install" });

			expect(mockRuntime.openOptionsPage).toHaveBeenCalled();
		});

		it("should not open options page on extension update", async () => {
			await onInstalledListener({ reason: "update" });

			expect(mockRuntime.openOptionsPage).not.toHaveBeenCalled();
		});
	});

	describe("Dynamic Menu Updates", () => {
		beforeEach(async () => {
			await import("../../src/entrypoints/background");
		});

		it("should determine active tab analysis state correctly", async () => {
			const tabId = 123;

			// Set up mock for active tab query
			mockTabs.query.mockResolvedValue([
				{ id: tabId, url: "https://example.com" },
			]);

			// Simulate analysis completion on this tab
			const sender = { tab: { id: tabId } };
			const request = { type: MESSAGE_TYPES.ANALYSIS_COMPLETE };
			await onMessageListener(request, sender, vi.fn());

			// Clear mocks to see the next set of calls
			mockContextMenus.create.mockClear();
			mockContextMenus.removeAll.mockClear();

			// Trigger menu update
			onActivatedListener({ tabId, windowId: 1 });

			// Wait for async operations
			await new Promise((resolve) => setTimeout(resolve, 0));

			// Verify that the report option is included because analysis was completed on active tab
			expect(mockContextMenus.create).toHaveBeenCalledWith({
				id: "report-missed-nugget",
				parentId: "golden-nuggets-finder",
				title: "🚩 Report missed golden nugget",
				contexts: ["selection"],
			});
		});

		it("should handle chrome.tabs.query errors gracefully", async () => {
			// Mock chrome.tabs.query to reject
			mockTabs.query.mockRejectedValue(new Error("Tab query failed"));

			// Trigger menu update
			onActivatedListener({ tabId: 123, windowId: 1 });

			// Wait for async operation to complete
			await new Promise((resolve) => setTimeout(resolve, 0));

			// Verify menu is still created (fallback behavior)
			expect(mockContextMenus.removeAll).toHaveBeenCalled();
			expect(mockContextMenus.create).toHaveBeenCalled();

			// Verify report option is NOT created (fallback to false)
			const reportCalls = mockContextMenus.create.mock.calls.filter(
				(call) => call[0].id === "report-missed-nugget",
			);
			expect(reportCalls).toHaveLength(0);
		});

		it("should handle empty active tab query result", async () => {
			// Mock empty result from tabs query
			mockTabs.query.mockResolvedValue([]);

			// Trigger menu update
			onActivatedListener({ tabId: 123, windowId: 1 });

			// Wait for async operations
			await new Promise((resolve) => setTimeout(resolve, 0));

			// Verify menu is still created with fallback behavior
			expect(mockContextMenus.removeAll).toHaveBeenCalled();
			expect(mockContextMenus.create).toHaveBeenCalled();

			// Verify report option is NOT created (no active tab = false)
			const reportCalls = mockContextMenus.create.mock.calls.filter(
				(call) => call[0].id === "report-missed-nugget",
			);
			expect(reportCalls).toHaveLength(0);
		});
	});

	describe("Error Handling", () => {
		beforeEach(async () => {
			await import("../../src/entrypoints/background");
		});

		it("should handle setupContextMenu failures gracefully", async () => {
			// Mock context menu creation to throw error
			mockContextMenus.create.mockImplementation(() => {
				throw new Error("Context menu creation failed");
			});

			// Trigger menu setup - should not throw
			expect(() => onInstalledListener({ reason: "install" })).not.toThrow();

			// Wait for async operations
			await new Promise((resolve) => setTimeout(resolve, 0));

			// Verify removeAll was still called (setup was attempted)
			expect(mockContextMenus.removeAll).toHaveBeenCalled();
		});

		it("should handle storage.getPrompts failures gracefully", async () => {
			// Mock storage to reject
			(storage.getPrompts as any).mockRejectedValue(new Error("Storage error"));

			// Trigger menu setup - should not throw
			expect(() => onInstalledListener({ reason: "install" })).not.toThrow();

			// Wait for async operations
			await new Promise((resolve) => setTimeout(resolve, 0));

			// Verify removeAll was still called
			expect(mockContextMenus.removeAll).toHaveBeenCalled();
		});

		it("should handle contextMenus.removeAll failures gracefully", async () => {
			// Mock removeAll to throw error
			mockContextMenus.removeAll.mockImplementation(() => {
				throw new Error("Remove all failed");
			});

			// Trigger menu setup - should not throw
			expect(() => onInstalledListener({ reason: "install" })).not.toThrow();
		});
	});

	describe("Integration Tests", () => {
		beforeEach(async () => {
			await import("../../src/entrypoints/background");
		});

		it("should handle concurrent analysis completions on multiple tabs", async () => {
			const tab1 = 123;
			const tab2 = 456;

			// Simulate analysis completion on multiple tabs
			const sender1 = { tab: { id: tab1 } };
			const sender2 = { tab: { id: tab2 } };
			const request = { type: MESSAGE_TYPES.ANALYSIS_COMPLETE };

			await Promise.all([
				onMessageListener(request, sender1, vi.fn()),
				onMessageListener(request, sender2, vi.fn()),
			]);

			// Both should trigger context menu updates
			expect(mockTabs.query).toHaveBeenCalledTimes(2);
		});

		it("should properly initialize all event listeners", async () => {
			// Since we're importing the background script in beforeEach and the mocks are reset,
			// let's verify the listeners are set up by checking that our captured listeners exist
			expect(onMessageListener).toBeDefined();
			expect(onRemovedListener).toBeDefined();
			expect(onUpdatedListener).toBeDefined();
			expect(onActivatedListener).toBeDefined();
			expect(onInstalledListener).toBeDefined();
			expect(onStorageChangedListener).toBeDefined();

			// Also verify they're functions (can be called)
			expect(typeof onMessageListener).toBe("function");
			expect(typeof onRemovedListener).toBe("function");
			expect(typeof onUpdatedListener).toBe("function");
			expect(typeof onActivatedListener).toBe("function");
			expect(typeof onInstalledListener).toBe("function");
			expect(typeof onStorageChangedListener).toBe("function");
		});

		it("should handle message types other than ANALYSIS_COMPLETE", async () => {
			const sender = { tab: { id: 123 } };
			const request = { type: MESSAGE_TYPES.ANALYZE_CONTENT };

			// Clear previous calls
			mockTabs.query.mockClear();

			// Should not cause errors or unwanted side effects
			expect(() => onMessageListener(request, sender, vi.fn())).not.toThrow();

			// Should not trigger analysis completion behavior
			expect(mockTabs.query).not.toHaveBeenCalled();
		});
	});
});
