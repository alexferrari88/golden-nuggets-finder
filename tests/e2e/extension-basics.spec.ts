import { expect, test } from "./fixtures";

test.describe("Extension Basics", () => {
	test("extension loads and gets service worker", async ({
		context,
		extensionId,
	}) => {
		// Extension should have a valid ID
		expect(extensionId).toBeDefined();
		expect(extensionId).toMatch(/^[a-z]{32}$/);

		// Should have a service worker
		const serviceWorkers = context.serviceWorkers();
		expect(serviceWorkers.length).toBeGreaterThan(0);

		const serviceWorker = serviceWorkers[0];
		expect(serviceWorker.url()).toContain(extensionId);
	});

	test("extension pages are accessible", async ({ context, extensionId }) => {
		// Test popup page
		const popupPage = await context.newPage();
		await popupPage.goto(`chrome-extension://${extensionId}/popup.html`, {
			waitUntil: "domcontentloaded",
		});
		await popupPage.waitForLoadState("domcontentloaded");
		await expect(popupPage).toHaveURL(
			new RegExp(`chrome-extension://${extensionId}/popup.html`),
		);

		// Test options page - wait between pages to avoid navigation conflicts
		await popupPage.close();
		await context.pages().length; // Wait for page cleanup

		const optionsPage = await context.newPage();
		await optionsPage.goto(`chrome-extension://${extensionId}/options.html`, {
			waitUntil: "domcontentloaded",
		});
		await optionsPage.waitForLoadState("domcontentloaded");
		await expect(optionsPage).toHaveURL(
			new RegExp(`chrome-extension://${extensionId}/options.html`),
		);

		await optionsPage.close();
	});
});
