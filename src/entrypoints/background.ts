import { GeminiClient } from "../background/gemini-client";
import { MessageHandler } from "../background/message-handler";
import { TypeFilterService } from "../background/type-filter-service";
import { storage } from "../shared/storage";
import { MESSAGE_TYPES } from "../shared/types";

export default defineBackground(() => {
	const geminiClient = new GeminiClient();
	const messageHandler = new MessageHandler(geminiClient);

	// Track analysis completion state per tab
	const analysisCompletedTabs = new Set<number>();

	// Prevent concurrent context menu setup
	let isSettingUpContextMenu = false;

	// Set up message listeners
	chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
		// Handle ANALYSIS_COMPLETE message to track state
		if (request.type === MESSAGE_TYPES.ANALYSIS_COMPLETE && sender.tab?.id) {
			analysisCompletedTabs.add(sender.tab.id);
			console.log(
				`[Background] Analysis completed for tab ${sender.tab.id}, tracked tabs:`,
				Array.from(analysisCompletedTabs),
			);

			// Update context menu to show "Report missed golden nugget" option
			updateContextMenuForActiveTab();
		}

		messageHandler.handleMessage(request, sender, sendResponse);
		return true; // Keep the message channel open for async responses
	});

	// Clean up analysis state when tabs are closed or updated
	chrome.tabs.onRemoved.addListener((tabId) => {
		analysisCompletedTabs.delete(tabId);
		// Update context menu since the active tab might have changed
		updateContextMenuForActiveTab();
	});

	chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
		// Clear analysis state when user navigates to a new URL
		if (changeInfo.url) {
			analysisCompletedTabs.delete(tabId);
			// Update context menu since analysis state changed
			updateContextMenuForActiveTab();
		}
	});

	// Update context menu when user switches tabs
	chrome.tabs.onActivated.addListener(() => {
		updateContextMenuForActiveTab();
	});

	// Set up context menu and handle installation
	chrome.runtime.onInstalled.addListener((details) => {
		updateContextMenuForActiveTab();

		// Open options page on first install
		if (details.reason === "install") {
			chrome.runtime.openOptionsPage();
		}
	});

	// Update context menu when prompts change
	chrome.storage.onChanged.addListener((changes, namespace) => {
		if (namespace === "sync" && changes.userPrompts) {
			updateContextMenuForActiveTab();
		}
	});

	// Handle context menu clicks
	chrome.contextMenus.onClicked.addListener((info, tab) => {
		console.log("[Background] Context menu clicked:", {
			menuItemId: info.menuItemId,
			selectionText: `${info.selectionText?.substring(0, 50)}...`,
			contexts: info.contexts,
		});

		if (info.menuItemId && typeof info.menuItemId === "string") {
			if (info.menuItemId.includes("__")) {
				// Handle typed menu clicks (e.g., "promptId__typeId")
				// Use double underscore as delimiter to avoid conflicts with prompt IDs that may contain hyphens
				const parts = info.menuItemId.split("__");
				if (parts.length === 2) {
					const promptId = parts[0];
					const typeId = parts[1];
					handleTypedContextMenuClick(promptId, typeId, tab);
				}
			} else if (info.menuItemId === "select-comments") {
				console.log("[Background] Handling select-comments click");
				handleCommentSelectionClick(tab);
			} else if (info.menuItemId === "report-missed-nugget") {
				console.log("[Background] Handling report-missed-nugget click");
				handleReportMissedNugget(tab, info);
			}
		}
	});

	async function updateContextMenuForActiveTab(): Promise<void> {
		try {
			// Get the currently active tab
			const [activeTab] = await chrome.tabs.query({
				active: true,
				currentWindow: true,
			});
			const showReportMissedNugget = activeTab?.id
				? analysisCompletedTabs.has(activeTab.id)
				: false;

			await setupContextMenu(showReportMissedNugget);
		} catch (error) {
			console.error("Failed to update context menu for active tab:", error);
			// Fallback to default menu without report option
			await setupContextMenu(false);
		}
	}

	async function setupContextMenu(
		showReportMissedNugget: boolean = false,
	): Promise<void> {
		// Prevent concurrent executions to avoid duplicate ID errors
		if (isSettingUpContextMenu) {
			console.log(
				"[Background] Context menu setup already in progress, skipping",
			);
			return;
		}

		isSettingUpContextMenu = true;

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
				// Use double underscore as delimiter to avoid conflicts with prompt IDs that may contain hyphens
				TypeFilterService.CONTEXT_MENU_OPTIONS.forEach((option) => {
					chrome.contextMenus.create({
						id: `${prompt.id}__${option.id}`,
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

			// Add "Report missed golden nugget" option (only if analysis has been completed)
			if (showReportMissedNugget) {
				chrome.contextMenus.create({
					id: "report-missed-nugget",
					parentId: "golden-nuggets-finder",
					title: "🚩 Report missed golden nugget",
					contexts: ["selection"],
				});
				console.log("[Background] Context menu 'report-missed-nugget' created");
			} else {
				console.log(
					"[Background] Context menu 'report-missed-nugget' NOT created - analysis not completed on active tab",
				);
			}
		} catch (error) {
			console.error("Failed to setup context menu:", error);
		} finally {
			isSettingUpContextMenu = false;
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

	async function handleReportMissedNugget(
		tab?: chrome.tabs.Tab,
		info?: chrome.contextMenus.OnClickData,
	): Promise<void> {
		console.log("[Background] handleReportMissedNugget called", {
			tabId: tab?.id,
			selectedText: `${info?.selectionText?.substring(0, 50)}...`,
			trackedTabs: Array.from(analysisCompletedTabs),
		});

		if (!tab?.id) {
			console.log("[Background] No tab ID - returning");
			return;
		}

		try {
			// Check if analysis has been completed on this tab
			if (!analysisCompletedTabs.has(tab.id)) {
				console.log(
					`[Background] Analysis not completed on tab ${tab.id} - cannot report missed nugget. Tracked tabs:`,
					Array.from(analysisCompletedTabs),
				);
				return;
			}

			// Check if user has selected text and it's long enough
			const selectedText = info?.selectionText?.trim() || "";
			console.log(`[Background] Selected text length: ${selectedText.length}`);
			if (selectedText.length <= 5) {
				console.log(
					"[Background] Selected text too short or empty - cannot report missed nugget",
				);
				return;
			}

			// Inject content script dynamically first
			await injectContentScript(tab.id);

			console.log(
				`[Background] Reporting missed nugget for selected text: "${selectedText.substring(0, 50)}..."`,
			);

			// Send message to content script to show nugget type selection UI
			await chrome.tabs.sendMessage(tab.id, {
				type: MESSAGE_TYPES.ENTER_MISSING_CONTENT_MODE,
				selectedText: selectedText,
				url: tab.url,
			});
		} catch (error) {
			console.error(
				"[Background] Failed to handle missed nugget report:",
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
