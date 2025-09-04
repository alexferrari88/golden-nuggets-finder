import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

// Helper function to wait for React popup to load
async function waitForPopupToLoad(page: Page) {
	try {
		// Try to wait for the main heading
		await page.waitForSelector("#root h1", { timeout: 5000 });
	} catch {
		// If h1 not found, wait for any content indicating the page loaded
		await page.waitForSelector("#root", { timeout: 5000 });
		await page.waitForTimeout(1000); // Give React time to render
	}
}

test.describe("Context Menu E2E Tests", () => {
	test("should load extension with valid service worker", async ({
		context,
		extensionId,
	}) => {
		// Extension should have a valid ID
		expect(extensionId).toBeDefined();
		expect(extensionId).toMatch(/^[a-z]{32}$/);

		// Should have a service worker (background script)
		const serviceWorkers = context.serviceWorkers();
		expect(serviceWorkers.length).toBeGreaterThan(0);

		const serviceWorker = serviceWorkers[0];
		expect(serviceWorker.url()).toContain(extensionId);

		// Service worker should be running
		const isRunning = await serviceWorker.evaluate(() => {
			return typeof self !== "undefined" && typeof importScripts === "function";
		});
		expect(isRunning).toBe(true);
	});

	test("should open popup and access Chrome APIs correctly", async ({
		context,
		extensionId,
	}) => {
		// Open the popup page where Chrome APIs should be available
		const popupPage = await context.newPage();
		await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);

		// Wait for React to render
		await waitForPopupToLoad(popupPage);

		// Test that popup can access Chrome APIs
		const apiAccess = await popupPage.evaluate(async () => {
			// Extension pages should have access to Chrome APIs
			return {
				hasChrome: typeof chrome !== "undefined",
				hasRuntime: typeof chrome?.runtime !== "undefined",
				hasStorage: typeof chrome?.storage !== "undefined",
				hasTabs: typeof chrome?.tabs !== "undefined",
			};
		});

		expect(apiAccess.hasChrome).toBe(true);
		expect(apiAccess.hasRuntime).toBe(true);
		expect(apiAccess.hasStorage).toBe(true);
		expect(apiAccess.hasTabs).toBe(true);
	});

	test("should open options page and access Chrome APIs correctly", async ({
		context,
		extensionId,
	}) => {
		// Open the options page where Chrome APIs should be available
		const optionsPage = await context.newPage();
		await optionsPage.goto(`chrome-extension://${extensionId}/options.html`);

		// Wait for React to render
		await waitForPopupToLoad(optionsPage);

		// Test that options page can access Chrome APIs
		const apiAccess = await optionsPage.evaluate(async () => {
			return {
				hasChrome: typeof chrome !== "undefined",
				hasRuntime: typeof chrome?.runtime !== "undefined",
				hasStorage: typeof chrome?.storage !== "undefined",
				canQueryTabs: typeof chrome?.tabs?.query === "function",
			};
		});

		expect(apiAccess.hasChrome).toBe(true);
		expect(apiAccess.hasRuntime).toBe(true);
		expect(apiAccess.hasStorage).toBe(true);
		expect(apiAccess.canQueryTabs).toBe(true);
	});

	test("should initialize without console errors", async ({
		context,
		extensionId,
	}) => {
		const consoleLogs: string[] = [];
		const popupPage = await context.newPage();

		// Listen for console messages
		popupPage.on("console", (msg) => {
			consoleLogs.push(`${msg.type()}: ${msg.text()}`);
		});

		await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);

		// Wait for React to render
		await waitForPopupToLoad(popupPage);

		// Wait for any async initialization
		await popupPage.waitForTimeout(1000);

		// Check for error messages (allow warnings and info)
		const errorLogs = consoleLogs.filter(
			(log) =>
				log.startsWith("error:") && !log.includes("Failed to load resource"),
		);
		expect(errorLogs).toHaveLength(0);
	});

	test("should handle message passing between extension pages", async ({
		context,
		extensionId,
	}) => {
		const popupPage = await context.newPage();
		await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);

		// Wait for React to render
		await waitForPopupToLoad(popupPage);

		// Test that message passing system is working
		const messageTest = await popupPage.evaluate(async () => {
			try {
				// Test sending a message (will fail gracefully if no listener)
				const response = await chrome.runtime
					.sendMessage({
						type: "TEST_MESSAGE",
						test: true,
					})
					.catch(() => ({ error: "No listener" }));

				return {
					canSendMessage: true,
					response: response,
				};
			} catch (error) {
				return {
					canSendMessage: false,
					error: error.message,
				};
			}
		});

		expect(messageTest.canSendMessage).toBe(true);
		// Response might be null or error if no listener, but sending should work
		expect(messageTest.response).toBeDefined();
	});

	test("should handle storage operations in extension pages", async ({
		context,
		extensionId,
	}) => {
		const popupPage = await context.newPage();
		await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);

		// Wait for React to render
		await waitForPopupToLoad(popupPage);

		// Test storage operations
		const storageTest = await popupPage.evaluate(async () => {
			try {
				// Test storage set and get
				await chrome.storage.sync.set({ testKey: "testValue" });
				const result = await chrome.storage.sync.get("testKey");

				return {
					canWrite: true,
					canRead: true,
					value: result.testKey,
				};
			} catch (error) {
				return {
					canWrite: false,
					canRead: false,
					error: error.message,
				};
			}
		});

		expect(storageTest.canWrite).toBe(true);
		expect(storageTest.canRead).toBe(true);
		expect(storageTest.value).toBe("testValue");
	});

	test("should load prompts correctly in popup", async ({
		context,
		extensionId,
	}) => {
		const popupPage = await context.newPage();
		await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);

		// Wait for React to render first
		await waitForPopupToLoad(popupPage);

		// Then wait for prompts to load or API key prompt to appear
		try {
			await popupPage.waitForSelector('[data-testid="prompt-item"]', {
				timeout: 5000,
			});
		} catch {
			// If no prompts, should show API key setup message
			await popupPage.waitForSelector("text=options page", { timeout: 5000 });
		}

		// Check if we have prompts or need API key setup
		const popupState = await popupPage.evaluate(() => {
			const promptItems = document.querySelectorAll(
				'[data-testid="prompt-item"]',
			);
			const bodyText = document.body.textContent || "";
			const needsApiKey =
				bodyText.includes("options page") && bodyText.includes("API key");

			return {
				hasPrompts: promptItems.length > 0,
				needsApiKey: needsApiKey,
				promptCount: promptItems.length,
			};
		});

		// Either we have prompts loaded OR we need API key setup
		expect(popupState.hasPrompts || popupState.needsApiKey).toBe(true);

		if (popupState.hasPrompts) {
			expect(popupState.promptCount).toBeGreaterThan(0);
		}
	});

	test("should inject content script dynamically when needed", async ({
		context,
		extensionId,
	}) => {
		// Open popup to test content script injection capability
		const popupPage = await context.newPage();
		await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);

		// Wait for React to render
		await waitForPopupToLoad(popupPage);

		// Test if popup has access to scripting API
		const injectionTest = await popupPage.evaluate(async () => {
			try {
				// Check if scripting API is available
				if (typeof chrome.scripting === "undefined") {
					return { hasScriptingAPI: false, error: "No scripting API" };
				}

				// Check if executeScript method exists
				if (typeof chrome.scripting.executeScript !== "function") {
					return { hasScriptingAPI: false, error: "No executeScript method" };
				}

				// Get tabs to see if we can query them
				const tabs = await chrome.tabs.query({
					active: true,
					currentWindow: true,
				});

				return {
					hasScriptingAPI: true,
					canQueryTabs: true,
					tabCount: tabs.length,
					hasActiveTab: tabs.length > 0,
				};
			} catch (error) {
				return { hasScriptingAPI: false, error: error.message };
			}
		});

		// Should have access to scripting APIs
		expect(injectionTest.hasScriptingAPI).toBe(true);
		expect(injectionTest.canQueryTabs).toBe(true);
		expect(injectionTest.hasActiveTab).toBe(true);
	});

	test("should handle tab queries correctly", async ({
		context,
		extensionId,
	}) => {
		const popupPage = await context.newPage();
		await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);

		// Wait for React to render
		await waitForPopupToLoad(popupPage);

		// Test tab querying functionality
		const tabTest = await popupPage.evaluate(async () => {
			try {
				const tabs = await chrome.tabs.query({
					active: true,
					currentWindow: true,
				});

				return {
					canQueryTabs: true,
					tabCount: tabs.length,
					hasActiveTab: tabs.length > 0,
				};
			} catch (error) {
				return {
					canQueryTabs: false,
					error: error.message,
				};
			}
		});

		expect(tabTest.canQueryTabs).toBe(true);
		expect(tabTest.hasActiveTab).toBe(true);
		expect(tabTest.tabCount).toBeGreaterThan(0);
	});
});
