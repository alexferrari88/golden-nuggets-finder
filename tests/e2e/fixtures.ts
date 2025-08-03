import path from "node:path";
import {
	type BrowserContext,
	test as base,
	chromium,
	type Page,
} from "@playwright/test";

// Enhanced fixtures with both extension context and clean browser context
export const test = base.extend<{
	context: BrowserContext;
	extensionId: string;
	cleanContext: BrowserContext;
	cleanPage: Page;
}>({
	context: async ({ }, use) => {
		const pathToExtension = path.join(__dirname, "../../dist/chrome-mv3-dev");
		const context = await chromium.launchPersistentContext("", {
			channel: "chromium",
			args: [
				`--disable-extensions-except=${pathToExtension}`,
				`--load-extension=${pathToExtension}`,
			],
		});
		await use(context);
		await context.close();
	},
	extensionId: async ({ context }, use) => {
		// for manifest v3:
		let [serviceWorker] = context.serviceWorkers();
		if (!serviceWorker)
			serviceWorker = await context.waitForEvent("serviceworker");

		const extensionId = serviceWorker.url().split("/")[2];
		await use(extensionId);
	},
	cleanContext: async ({ }, use) => {
		// Clean browser context with stealth capabilities for bypassing bot detection
		const browser = await chromium.launch({
			channel: "chromium",
			args: [
				"--disable-blink-features=AutomationControlled",
				"--disable-dev-shm-usage",
				"--disable-web-security",
				"--disable-features=VizDisplayCompositor",
				"--no-sandbox",
				"--disable-setuid-sandbox",
				"--disable-background-timer-throttling",
				"--disable-backgrounding-occluded-windows",
				"--disable-renderer-backgrounding",
			],
		});

		const context = await browser.newContext({
			userAgent:
				"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
			extraHTTPHeaders: {
				"Accept-Language": "en-US,en;q=0.9",
				"Accept-Encoding": "gzip, deflate, br",
				Accept:
					"text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
				"Upgrade-Insecure-Requests": "1",
				"Sec-Fetch-Site": "none",
				"Sec-Fetch-Mode": "navigate",
				"Sec-Fetch-User": "?1",
				"Sec-Fetch-Dest": "document",
			},
			viewport: { width: 1366, height: 768 },
			deviceScaleFactor: 1,
			hasTouch: false,
			isMobile: false,
			javaScriptEnabled: true,
		});

		// Add stealth scripts to bypass bot detection
		await context.addInitScript(() => {
			// Remove webdriver property
			Object.defineProperty(navigator, "webdriver", {
				get: () => undefined,
			});

			// Remove HeadlessChrome from user agent
			Object.defineProperty(navigator, "userAgent", {
				get: () => navigator.userAgent.replace("HeadlessChrome/", "Chrome/"),
			});

			// Add realistic navigator properties
			Object.defineProperty(navigator, "languages", {
				get: () => ["en-US", "en"],
			});

			Object.defineProperty(navigator, "plugins", {
				get: () => [1, 2, 3, 4, 5],
			});

			// Override permissions
			const originalQuery = window.navigator.permissions.query;
			window.navigator.permissions.query = (parameters) =>
				parameters.name === "notifications"
					? Promise.resolve({ state: Notification.permission })
					: originalQuery(parameters);

			// Hide automation indicators
			delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
			delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
			delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
		});

		await use(context);
		await browser.close();
	},
	cleanPage: async ({ cleanContext }, use) => {
		const page = await cleanContext.newPage();
		await use(page);
		await page.close();
	},
});

// Additional stealth test variant using playwright-extra
let stealthChromium: typeof import("playwright-extra").chromium | null = null;

export const stealthTest = base.extend<{
	stealthContext: BrowserContext;
	stealthPage: Page;
}>({
	stealthContext: async ({ }, use) => {
		// Lazy load stealth libraries to avoid import issues
		if (!stealthChromium) {
			try {
				const { chromium } = require("playwright-extra");
				const stealth = require("puppeteer-extra-plugin-stealth")();
				chromium.use(stealth);
				stealthChromium = chromium;
			} catch (_error) {
				console.warn(
					"Stealth libraries not available, falling back to basic browser",
				);
				stealthChromium = chromium;
			}
		}

		const browser = await stealthChromium.launch({
			channel: "chromium",
			headless: false, // Some sites detect headless mode
		});

		const context = await browser.newContext({
			userAgent:
				"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
			viewport: { width: 1366, height: 768 },
		});

		await use(context);
		await browser.close();
	},
	stealthPage: async ({ stealthContext }, use) => {
		const page = await stealthContext.newPage();
		await use(page);
		await page.close();
	},
});

export const expect = test.expect;
