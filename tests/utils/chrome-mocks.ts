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

/**
 * Generates a mock feedback session ID in the expected format
 */
export function generateMockSessionId(baseFeedbackId: string): string {
	const timestamp = Date.now();
	const random = Math.random().toString(36).substring(2, 8);
	return `session_${baseFeedbackId}_${timestamp}_${random}`;
}

/**
 * Creates mock nugget feedback data with the new multi-provider attribution structure
 */
export function createMockNuggetFeedback(overrides: any = {}): any {
	const baseFeedback = {
		id: "feedback_123_0",
		nuggetContent: "This is a great tool for productivity",
		originalType: "tool" as const,
		rating: "positive" as const,
		timestamp: Date.now(),
		url: "https://example.com/article",
		context: "The surrounding context of the nugget",
		modelProvider: "gemini" as const,
		modelName: "gemini-2.5-flash",
		feedbackSessionId: generateMockSessionId("feedback_123"),
		attributionSource: "nugget_metadata",
		nugget: {
			type: "tool" as const,
			fullContent: "This is a great tool for productivity",
			confidence: 0.9,
			sourceProvider: "gemini" as const,
			sourceModel: "gemini-2.5-flash"
		},
		prompt: {
			id: "test-prompt",
			version: "original",
			content: "Test prompt content",
			type: "default" as const,
			name: "Test Prompt",
		},
		...overrides,
	};
	return baseFeedback;
}

/**
 * Creates mock missing content feedback data with the new multi-provider structure
 */
export function createMockMissingContentFeedback(overrides: any = {}): any {
	const baseFeedback = {
		id: "missing_123_provider_0",
		fullContent: "This important concept was missed",
		suggestedType: "aha! moments" as const,
		url: "https://example.com/deep-article",
		timestamp: Date.now(),
		context: "Analysis failed to identify this key insight",
		modelProvider: "gemini" as const,
		modelName: "gemini-2.5-flash",
		feedbackSessionId: generateMockSessionId("missing_123"),
		attributionSource: "analysis_session",
		prompt: {
			id: "test-prompt",
			version: "original",
			content: "Test prompt content",
			type: "default" as const,
			name: "Test Prompt",
		},
		...overrides,
	};
	return baseFeedback;
}

/**
 * Creates multiple feedback records as would be generated by the new attribution system
 */
export function createMultipleFeedbackRecords(baseFeedbackId: string, providers: Array<{modelProvider: string, modelName: string}> = [{modelProvider: "gemini", modelName: "gemini-2.5-flash"}]): any[] {
	return providers.map((provider, index) => 
		createMockNuggetFeedback({
			id: `${baseFeedbackId}_${index}`,
			modelProvider: provider.modelProvider,
			modelName: provider.modelName,
			feedbackSessionId: generateMockSessionId(baseFeedbackId),
		})
	);
}

/**
 * Creates multiple missing content records as would be generated by the new attribution system  
 */
export function createMultipleMissingContentRecords(baseFeedbackId: string, providers: Array<{modelProvider: string, modelName: string}> = [{modelProvider: "gemini", modelName: "gemini-2.5-flash"}]): any[] {
	return providers.map((provider, index) => 
		createMockMissingContentFeedback({
			id: `${baseFeedbackId}_provider_${index}`,
			modelProvider: provider.modelProvider,
			modelName: provider.modelName,
			feedbackSessionId: generateMockSessionId(baseFeedbackId),
		})
	);
}
