import { GeminiClient } from "../background/gemini-client";
import { MessageHandler } from "../background/message-handler";
import { TypeFilterService } from "../background/type-filter-service";
import { storage } from "../shared/storage";
import { MESSAGE_TYPES } from "../shared/types";

export default defineBackground(() => {
	const geminiClient = new GeminiClient();
	const messageHandler = new MessageHandler(geminiClient);

	// Set up message listeners
	chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
		messageHandler.handleMessage(request, sender, sendResponse);
		return true; // Keep the message channel open for async responses
	});

	// Set up context menu
	chrome.runtime.onInstalled.addListener(() => {
		setupContextMenu();
	});

	// Update context menu when prompts change
	chrome.storage.onChanged.addListener((changes, namespace) => {
		if (namespace === "sync" && changes.userPrompts) {
			setupContextMenu();
		}
	});

	// Handle context menu clicks
	chrome.contextMenus.onClicked.addListener((info, tab) => {
		if (info.menuItemId && typeof info.menuItemId === "string") {
			if (info.menuItemId.includes("-")) {
				// Handle typed menu clicks (e.g., "promptId-typeId")
				const parts = info.menuItemId.split("-");
				if (parts.length >= 2) {
					const promptId = parts[0];
					const typeId = parts[1];
					handleTypedContextMenuClick(promptId, typeId, tab);
				}
			} else if (info.menuItemId === "select-comments") {
				handleCommentSelectionClick(tab);
			}
		}
	});

	async function setupContextMenu(): Promise<void> {
		try {
			// Clear existing menu items
			await chrome.contextMenus.removeAll();

			// Get current prompts
			const prompts = await storage.getPrompts();

			// Create parent menu item
			chrome.contextMenus.create({
				id: "golden-nuggets-finder",
				title: "Golden Nugget Finder",
				contexts: ["page", "selection"],
			});

			// Create sub-menu items for each prompt with type filtering
			prompts.forEach((prompt) => {
				const promptTitle = prompt.isDefault
					? `⭐ ${prompt.name}`
					: prompt.name;

				// Create main prompt menu item
				chrome.contextMenus.create({
					id: `prompt-${prompt.id}`,
					parentId: "golden-nuggets-finder",
					title: promptTitle,
					contexts: ["page", "selection"],
				});

				// Create type-specific submenus for each prompt
				TypeFilterService.CONTEXT_MENU_OPTIONS.forEach((option) => {
					chrome.contextMenus.create({
						id: `${prompt.id}-${option.id}`,
						parentId: `prompt-${prompt.id}`,
						title: option.title,
						contexts: ["page", "selection"],
					});
				});
			});

			// Add separator
			chrome.contextMenus.create({
				id: "separator",
				parentId: "golden-nuggets-finder",
				type: "separator",
				contexts: ["page", "selection"],
			});

			// Add "Select Comments to Analyze" option
			chrome.contextMenus.create({
				id: "select-comments",
				parentId: "golden-nuggets-finder",
				title: "✂️ Select Content to Analyze",
				contexts: ["page", "selection"],
			});
		} catch (error) {
			console.error("Failed to setup context menu:", error);
		}
	}

	async function handleTypedContextMenuClick(
		promptId: string,
		typeId: string,
		tab?: chrome.tabs.Tab,
	): Promise<void> {
		if (!tab?.id) return;

		try {
			// Inject content script dynamically first
			await injectContentScript(tab.id);

			// Check if API key is configured before proceeding
			let apiKey: string;
			try {
				apiKey = await storage.getApiKey({
					source: "background",
					action: "read",
					timestamp: Date.now(),
				});
			} catch (apiKeyError) {
				console.error("[Background] API key retrieval failed:", apiKeyError);
				// Show error message and return - don't proceed with analysis
				await new Promise((resolve) => setTimeout(resolve, 100));
				await chrome.tabs.sendMessage(tab.id, {
					type: MESSAGE_TYPES.SHOW_API_KEY_ERROR,
				});
				return;
			}

			if (!apiKey) {
				console.log("[Background] No API key found - showing error message");
				// Show API key error message with link to options page
				// Add a small delay to ensure content script is ready
				await new Promise((resolve) => setTimeout(resolve, 100));
				await chrome.tabs.sendMessage(tab.id, {
					type: MESSAGE_TYPES.SHOW_API_KEY_ERROR,
				});
				return;
			}

			console.log("[Background] API key found - starting typed analysis");

			// Get the type filter configuration
			const contextMenuOption = TypeFilterService.getContextMenuOption(typeId);
			if (!contextMenuOption) {
				console.error("[Background] Invalid type ID:", typeId);
				return;
			}

			// Create type filter based on the selected option
			let typeFilter;
			if (contextMenuOption.id === "all") {
				typeFilter = TypeFilterService.createDefaultTypeFilter();
			} else {
				typeFilter = TypeFilterService.createSingleTypeFilter(
					contextMenuOption.types[0],
				);
			}

			// Send message to content script to start analysis with type filter
			await chrome.tabs.sendMessage(tab.id, {
				type: MESSAGE_TYPES.ANALYZE_CONTENT,
				promptId: promptId,
				source: "context-menu",
				typeFilter: typeFilter,
			});
		} catch (error) {
			console.error(
				"[Background] Failed to handle typed context menu click:",
				error,
			);
		}
	}

	async function handleCommentSelectionClick(
		tab?: chrome.tabs.Tab,
	): Promise<void> {
		if (!tab?.id) return;

		try {
			// Inject content script dynamically first
			await injectContentScript(tab.id);

			// Check if API key is configured before proceeding
			let apiKey: string;
			try {
				apiKey = await storage.getApiKey({
					source: "background",
					action: "read",
					timestamp: Date.now(),
				});
			} catch (apiKeyError) {
				console.error("[Background] API key retrieval failed:", apiKeyError);
				await new Promise((resolve) => setTimeout(resolve, 100));
				await chrome.tabs.sendMessage(tab.id, {
					type: MESSAGE_TYPES.SHOW_API_KEY_ERROR,
				});
				return;
			}

			if (!apiKey) {
				console.log("[Background] No API key found - showing error message");
				await new Promise((resolve) => setTimeout(resolve, 100));
				await chrome.tabs.sendMessage(tab.id, {
					type: MESSAGE_TYPES.SHOW_API_KEY_ERROR,
				});
				return;
			}

			console.log("[Background] API key found - entering selection mode");
			// Send message to content script to enter selection mode
			await chrome.tabs.sendMessage(tab.id, {
				type: MESSAGE_TYPES.ENTER_SELECTION_MODE,
			});
		} catch (error) {
			console.error(
				"[Background] Failed to handle comment selection click:",
				error,
			);
		}
	}

	async function injectContentScript(tabId: number): Promise<void> {
		try {
			// Check if content script is already injected by trying to send a test message
			const testResponse = await chrome.tabs
				.sendMessage(tabId, { type: "PING" })
				.catch(() => null);

			if (testResponse) {
				// Content script already exists
				return;
			}

			// Inject the content script dynamically using the built file
			await chrome.scripting.executeScript({
				target: { tabId },
				files: ["content-scripts/content.js"],
			});

			// Give the content script a moment to initialize
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Verify injection worked
			const verifyResponse = await chrome.tabs
				.sendMessage(tabId, { type: "PING" })
				.catch(() => null);

			if (!verifyResponse) {
				throw new Error("Content script failed to inject properly");
			}
		} catch (error) {
			console.error("Failed to inject content script:", error);
			throw error;
		}
	}
});
