/**
 * Chrome API Type Mock Utilities
 *
 * This file provides utility functions to create properly typed Chrome extension API objects
 * for testing purposes, ensuring all required properties are present.
 */

/**
 * Creates a mock Tab object with all required properties
 */
export function createMockTab(
	overrides: Partial<chrome.tabs.Tab> = {},
): chrome.tabs.Tab {
	return {
		id: 123,
		index: 0,
		pinned: false,
		highlighted: false,
		windowId: 1,
		active: true,
		incognito: false,
		selected: true,
		discarded: false,
		autoDiscardable: true,
		url: "https://example.com",
		title: "Example Page",
		frozen: false,
		groupId: -1,
		...overrides,
	} as chrome.tabs.Tab;
}

/**
 * Creates a mock OnClickData object with all required properties
 */
export function createMockOnClickData(
	overrides: Partial<chrome.contextMenus.OnClickData> = {},
): chrome.contextMenus.OnClickData {
	return {
		menuItemId: "test-menu-item",
		editable: false,
		mediaType: undefined,
		pageUrl: "https://example.com",
		selectionText: undefined,
		srcUrl: undefined,
		linkUrl: undefined,
		frameId: 0,
		frameUrl: undefined,
		checked: undefined,
		wasChecked: undefined,
		parentMenuItemId: undefined,
		...overrides,
	};
}

/**
 * Creates a mock MessageSender object with all required properties
 */
export function createMockMessageSender(
	overrides: Partial<chrome.runtime.MessageSender> = {},
): chrome.runtime.MessageSender {
	return {
		tab: createMockTab(),
		frameId: 0,
		id: "test-extension-id",
		url: "https://example.com",
		tlsChannelId: undefined,
		origin: "https://example.com",
		...overrides,
	};
}

/**
 * Creates a mock MessageSender with a custom tab
 */
export function createMockMessageSenderWithTab(
	tab: Partial<chrome.tabs.Tab> = {},
): chrome.runtime.MessageSender {
	return createMockMessageSender({
		tab: createMockTab(tab),
	});
}

/**
 * Type guard to check if an object has the required Tab properties
 */
export function isValidTab(obj: any): obj is chrome.tabs.Tab {
	return (
		obj &&
		typeof obj.id === "number" &&
		typeof obj.index === "number" &&
		typeof obj.pinned === "boolean" &&
		typeof obj.highlighted === "boolean" &&
		typeof obj.windowId === "number" &&
		typeof obj.active === "boolean" &&
		typeof obj.incognito === "boolean"
	);
}

/**
 * Type guard to check if an object has the required OnClickData properties
 */
export function isValidOnClickData(
	obj: any,
): obj is chrome.contextMenus.OnClickData {
	return (
		obj &&
		typeof obj.editable === "boolean" &&
		typeof obj.menuItemId !== "undefined"
	);
}

/**
 * Type guard to check if an object has the required MessageSender properties
 */
export function isValidMessageSender(
	obj: any,
): obj is chrome.runtime.MessageSender {
	return (
		obj &&
		(obj.tab === undefined || isValidTab(obj.tab)) &&
		typeof obj.frameId === "number"
	);
}
