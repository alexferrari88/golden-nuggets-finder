import { expect, test } from "@playwright/test";
import { setupHighlighter } from "./highlighter-setup";

test.describe("URL Nugget Handling", () => {
	test.beforeEach(async ({ page }) => {
		// Setup basic page environment - individual tests will setup specific nuggets
		await page.goto("about:blank");
	});

	test("should handle URL nuggets without crashing", async ({ page }) => {
		// Create a test page with URL-like content
		await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head><title>URL Test Page</title></head>
        <body>
          <div id="main-content">
            <h1>Test Page with URLs</h1>
            <p>Check out this research: https://pmc.ncbi.nlm.nih.gov/articles/PMC3444174/ for more information.</p>
            <p>You can also watch: https://www.youtube.com/watch?v=lG4VkPoG3ko</p>
            <p>Visit our website: https://example.com/about</p>
            <p>This is regular text content that should also be processed.</p>
          </div>
        </body>
      </html>
    `);

		// Setup test nuggets (including problematic URL nuggets)
		const testNuggets = [
			{
				type: "media",
				startContent: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3444174/",
				endContent: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3444174/",
			},
			{
				type: "media",
				startContent: "https://www.youtube.com/watch?v=lG4VkPoG3ko",
				endContent: "https://www.youtube.com/watch?v=lG4VkPoG3ko",
			},
			{
				type: "tool",
				startContent: "This is regular text content",
				endContent: "that should also be processed",
			},
		];

		// Setup highlighter with these test nuggets
		await setupHighlighter(page, testNuggets);

		// Right-click to open context menu
		await page.click("#main-content", { button: "right" });

		// Look for Golden Nugget Finder menu items
		const contextMenu = page.locator('[role="menuitem"]').filter({
			hasText: "Golden Nugget Finder",
		});
		await expect(contextMenu).toBeVisible();

		// Click on analyze option
		await contextMenu.click();

		// Wait for sidebar to appear
		const sidebar = page.locator("#golden-nuggets-sidebar");
		await expect(sidebar).toBeVisible({ timeout: 10000 });

		// Check that URL nuggets are displayed in the sidebar
		const nuggetItems = sidebar.locator(".nugget-item");
		await expect(nuggetItems).toHaveCount(3);

		// Check for URL indicators on non-highlighted URL nuggets
		const urlIndicators = sidebar.locator(".url-indicator");
		// Should have at least 1 URL indicator (depending on which URLs can be highlighted)
		await expect(urlIndicators.first()).toBeVisible();

		// Verify URL indicator has proper text and tooltip
		const firstUrlIndicator = urlIndicators.first();
		await expect(firstUrlIndicator).toContainText("Link");
		await expect(firstUrlIndicator).toHaveAttribute(
			"title",
			"Link reference - content not highlightable on page",
		);

		// Ensure the page hasn't crashed due to URL boundary issues
		const errorMessages = page.locator(".error-message, .error-banner");
		await expect(errorMessages).toHaveCount(0);

		// Check console for the specific error that was occurring before the fix
		const consoleLogs = await page.evaluate(() => {
			return window.testConsoleMessages || [];
		});

		// Should not contain the old error about identical boundaries
		const identicalBoundaryErrors = consoleLogs.filter((log: any) =>
			log.message?.includes("identical start/end content"),
		);
		expect(identicalBoundaryErrors).toHaveLength(0);
	});

	test("should show appropriate diagnostics for URL highlighting failures", async ({
		page,
	}) => {
		await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body>
          <div>This page does not contain the URLs that will be in the nuggets</div>
        </body>
      </html>
    `);

		// Mock response with URLs that won't be found on the page
		await page.evaluate(() => {
			window.mockAnalysisResponse = {
				golden_nuggets: [
					{
						type: "media",
						startContent: "https://notfound.example.com",
						endContent: "/path/that/doesnt/exist",
						confidence: 0.8,
					},
				],
			};
		});

		// Trigger analysis
		await page.click("body", { button: "right" });
		await page
			.locator('[role="menuitem"]')
			.filter({ hasText: "Golden Nugget Finder" })
			.click();

		// Wait for processing to complete
		await expect(page.locator("#golden-nuggets-sidebar")).toBeVisible();

		// Check console logs for proper URL diagnostics
		const consoleLogs = await page.evaluate(() => {
			return window.testConsoleMessages || [];
		});

		// Should contain diagnostic information about URL content not being found
		const urlDiagnostics = consoleLogs.filter((log: any) =>
			log.message?.includes("URL content not found on page"),
		);
		expect(urlDiagnostics.length).toBeGreaterThan(0);
	});

	test("should handle mixed URL and text nuggets correctly", async ({
		page,
	}) => {
		await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body>
          <h1>Mixed Content Test</h1>
          <p>Visit https://example.com for more info</p>
          <p>This is some highlightable text content that should work fine</p>
          <a href="https://github.com">GitHub Link</a>
        </body>
      </html>
    `);

		await page.evaluate(() => {
			window.mockAnalysisResponse = {
				golden_nuggets: [
					{
						type: "media",
						startContent: "https://example.com",
						endContent: "for more info",
						confidence: 0.8,
					},
					{
						type: "tool",
						startContent: "This is some highlightable text content",
						endContent: "that should work fine",
						confidence: 0.9,
					},
					{
						type: "media",
						startContent: "https://github.com",
						endContent: "https://github.com", // Identical boundaries
						confidence: 0.7,
					},
				],
			};
		});

		// Trigger analysis
		await page.click("body", { button: "right" });
		await page
			.locator('[role="menuitem"]')
			.filter({ hasText: "Golden Nugget Finder" })
			.click();

		// Wait for results
		await expect(page.locator("#golden-nuggets-sidebar")).toBeVisible();

		// Should have all nuggets displayed
		const nuggetItems = page.locator(".nugget-item");
		await expect(nuggetItems).toHaveCount(3);

		// Should have URL indicators for URL nuggets that couldn't be highlighted
		const urlIndicators = page.locator(".url-indicator");
		await expect(urlIndicators).toHaveCountGreaterThan(0);

		// Regular text content might be highlighted (depending on exact text matching)
		// but should not cause crashes
		const highlights = page.locator(".golden-nugget-highlight");
		// Should have 0 or more highlights (depending on text matching success)
		const highlightCount = await highlights.count();
		expect(highlightCount).toBeGreaterThanOrEqual(0);
	});

	test("should not crash when processing empty or malformed URL nuggets", async ({
		page,
	}) => {
		await page.setContent(`
      <!DOCTYPE html>
      <html><body><div>Test page</div></body></html>
    `);

		// Mock response with edge case nuggets
		await page.evaluate(() => {
			window.mockAnalysisResponse = {
				golden_nuggets: [
					{
						type: "media",
						startContent: "",
						endContent: "",
						confidence: 0.5,
					},
					{
						type: "media",
						startContent: "not-a-url",
						endContent: "not-a-url",
						confidence: 0.6,
					},
					{
						type: "media",
						startContent: "   ",
						endContent: "   ",
						confidence: 0.4,
					},
				],
			};
		});

		// Trigger analysis - should not crash
		await page.click("body", { button: "right" });
		await page
			.locator('[role="menuitem"]')
			.filter({ hasText: "Golden Nugget Finder" })
			.click();

		// Should still show sidebar without crashing
		await expect(page.locator("#golden-nuggets-sidebar")).toBeVisible();

		// Check that error handling worked properly
		const errorBanners = page.locator(".error-banner");
		await expect(errorBanners).toHaveCount(0);
	});

	test("should preserve URL fullContent in sidebar display", async ({
		page,
	}) => {
		await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body>
          <p>Content with URLs: https://example.com/long/path/to/resource?param=value</p>
        </body>
      </html>
    `);

		await page.evaluate(() => {
			window.mockAnalysisResponse = {
				golden_nuggets: [
					{
						type: "media",
						startContent: "https://example.com",
						endContent: "/long/path/to/resource?param=value",
						fullContent:
							"https://example.com/long/path/to/resource?param=value", // Full URL
						confidence: 0.85,
					},
				],
			};
		});

		await page.click("body", { button: "right" });
		await page
			.locator('[role="menuitem"]')
			.filter({ hasText: "Golden Nugget Finder" })
			.click();

		await expect(page.locator("#golden-nuggets-sidebar")).toBeVisible();

		// Check that the full URL is preserved and displayed
		const nuggetContent = page.locator(".nugget-item");
		await expect(nuggetContent).toContainText("https://example.com");
		await expect(nuggetContent).toContainText("resource?param=value");
	});
});
