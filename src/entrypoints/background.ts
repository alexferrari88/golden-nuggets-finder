import { MessageHandler } from "../background/message-handler";
import {
	getCurrentProvider,
	isProviderConfigured,
} from "../background/services/provider-switcher";
import {
	CONTEXT_MENU_OPTIONS,
	createDefaultTypeFilter,
	createSingleTypeFilter,
	getContextMenuOption,
} from "../background/type-filter-service";
import { injectContentScript } from "../shared/chrome-extension-utils";
import { checkAndRunMigration, storage } from "../shared/storage";
import { type FeedbackSubmission, MESSAGE_TYPES } from "../shared/types";

export default defineBackground(() => {
	const messageHandler = new MessageHandler();

	// Track analysis completion state per tab
	const analysisCompletedTabs = new Set<number>();

	// Prevent concurrent context menu setup
	let isSettingUpContextMenu = false;

	// Run storage migration on startup
	checkAndRunMigration().catch((error) => {
		console.error("[Background] Migration failed on startup:", error);
	});

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
	chrome.runtime.onInstalled.addListener(async (details) => {
		// Run storage migration for updates
		if (details.reason === "update") {
			await checkAndRunMigration();
		}

		updateContextMenuForActiveTab();

		// Set up periodic sync alarm for backend feedback
		chrome.alarms.create("syncPendingFeedback", {
			delayInMinutes: 5,
			periodInMinutes: 5,
		});

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

	// Handle periodic sync alarm
	chrome.alarms.onAlarm.addListener((alarm) => {
		if (alarm.name === "syncPendingFeedback") {
			syncPendingFeedback().catch((error) => {
				console.error("[Background] Sync failed:", error);
			});
		}
	});

	// Handle context menu clicks
	chrome.contextMenus.onClicked.addListener((info, tab) => {
		console.log("[Background] Context menu clicked:", {
			menuItemId: info.menuItemId,
			selectionText: `${info.selectionText?.substring(0, 50)}...`,
			pageUrl: info.pageUrl,
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
			} else if (info.menuItemId === "ensemble_analysis") {
				console.log("[Background] Handling ensemble_analysis click");
				handleEnsembleAnalysisClick(tab);
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
				CONTEXT_MENU_OPTIONS.forEach((option) => {
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

			// Add "Ensemble Analysis" option
			chrome.contextMenus.create({
				id: "ensemble_analysis",
				parentId: "golden-nuggets-finder",
				title: "🎯 Ensemble Analysis (3 runs)",
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

			// Check if current provider is configured before proceeding
			const currentProvider = await getCurrentProvider();
			let isConfigured = false;
			let errorType = "missing_key"; // default assumption

			try {
				isConfigured = await isProviderConfigured(currentProvider);
			} catch (error) {
				// If isProviderConfigured throws, try to determine the error type
				const errorMessage = (error as Error).message;
				if (errorMessage.includes("Rate limit exceeded")) {
					errorType = "rate_limited";
				}
			}

			if (!isConfigured) {
				console.log(
					`[Background] Provider ${currentProvider} not configured - showing error message (${errorType})`,
				);
				// Show API key error message with link to options page
				// Add a small delay to ensure content script is ready
				await new Promise((resolve) => setTimeout(resolve, 100));
				await chrome.tabs.sendMessage(tab.id, {
					type: MESSAGE_TYPES.SHOW_API_KEY_ERROR,
					errorType: errorType,
				});
				return;
			}

			console.log(
				`[Background] Provider ${currentProvider} configured - starting typed analysis`,
			);

			// Get the type filter configuration
			const contextMenuOption = getContextMenuOption(typeId);
			if (!contextMenuOption) {
				console.error("[Background] Invalid type ID:", typeId);
				return;
			}

			// Create type filter based on the selected option
			let typeFilter: ReturnType<typeof createDefaultTypeFilter>;
			if (contextMenuOption.id === "all") {
				typeFilter = createDefaultTypeFilter();
			} else {
				typeFilter = createSingleTypeFilter(contextMenuOption.types[0]);
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

			// Check if current provider is configured before proceeding
			const currentProvider = await getCurrentProvider();
			let isConfigured = false;
			let errorType = "missing_key"; // default assumption

			try {
				isConfigured = await isProviderConfigured(currentProvider);
			} catch (error) {
				// If isProviderConfigured throws, try to determine the error type
				const errorMessage = (error as Error).message;
				if (errorMessage.includes("Rate limit exceeded")) {
					errorType = "rate_limited";
				}
			}

			if (!isConfigured) {
				console.log(
					`[Background] Provider ${currentProvider} not configured - showing error message (${errorType})`,
				);
				await new Promise((resolve) => setTimeout(resolve, 100));
				await chrome.tabs.sendMessage(tab.id, {
					type: MESSAGE_TYPES.SHOW_API_KEY_ERROR,
					errorType: errorType,
				});
				return;
			}

			console.log(
				`[Background] Provider ${currentProvider} configured - entering selection mode`,
			);
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

	async function handleEnsembleAnalysisClick(
		tab?: chrome.tabs.Tab,
	): Promise<void> {
		if (!tab?.id) return;

		try {
			// Inject content script dynamically first
			await injectContentScript(tab.id);

			// Check if current provider is configured before proceeding
			const currentProvider = await getCurrentProvider();
			let isConfigured = false;
			let errorType = "missing_key"; // default assumption

			try {
				isConfigured = await isProviderConfigured(currentProvider);
			} catch (error) {
				// If isProviderConfigured throws, try to determine the error type
				const errorMessage = (error as Error).message;
				if (errorMessage.includes("Rate limit exceeded")) {
					errorType = "rate_limited";
				}
			}

			if (!isConfigured) {
				console.log(
					`[Background] Provider ${currentProvider} not configured - showing error message (${errorType})`,
				);
				// Show API key error message with link to options page
				// Add a small delay to ensure content script is ready
				await new Promise((resolve) => setTimeout(resolve, 100));
				await chrome.tabs.sendMessage(tab.id, {
					type: MESSAGE_TYPES.SHOW_API_KEY_ERROR,
					errorType: errorType,
				});
				return;
			}

			console.log(
				`[Background] Provider ${currentProvider} configured - starting ensemble analysis`,
			);

			// Send message to content script to start ensemble analysis
			await chrome.tabs.sendMessage(tab.id, {
				type: MESSAGE_TYPES.ANALYZE_CONTENT_ENSEMBLE,
				promptId: "default",
				ensembleOptions: { runs: 3, mode: "balanced" },
			});
		} catch (error) {
			console.error(
				"[Background] Failed to handle ensemble analysis click:",
				error,
			);
		}
	}

	// Sync pending feedback to backend when available
	async function syncPendingFeedback(): Promise<void> {
		try {
			// Get pending feedback from local storage
			const pendingData = await chrome.storage.local.get([
				"nugget_feedback",
				"missing_feedback",
			]);

			const nuggetFeedback = pendingData.nugget_feedback || [];
			const missingFeedback = pendingData.missing_feedback || [];

			// If no pending feedback, return early
			if (nuggetFeedback.length === 0 && missingFeedback.length === 0) {
				return;
			}

			console.log(
				`[Background] Syncing ${nuggetFeedback.length} nugget feedback and ${missingFeedback.length} missing content feedback items`,
			);

			// Prepare feedback submission
			const feedbackSubmission: FeedbackSubmission = {};
			if (nuggetFeedback.length > 0) {
				feedbackSubmission.nuggetFeedback = nuggetFeedback;
			}
			if (missingFeedback.length > 0) {
				feedbackSubmission.missingContentFeedback = missingFeedback;
			}

			// Use messageHandler's private method through reflection
			const result = await (messageHandler as any).sendFeedbackToBackend(
				feedbackSubmission,
			);

			console.log("[Background] Successfully synced pending feedback:", result);

			// Clear successfully sent feedback from local storage
			const keysToRemove = [];
			if (nuggetFeedback.length > 0) keysToRemove.push("nugget_feedback");
			if (missingFeedback.length > 0) keysToRemove.push("missing_feedback");

			await chrome.storage.local.remove(keysToRemove);
			console.log("[Background] Cleared synced feedback from local storage");
		} catch (error) {
			console.log(
				"[Background] Sync failed, feedback will retry in 5 minutes:",
				error,
			);
		}
	}

	// Content script injection moved to injectContentScript
});
