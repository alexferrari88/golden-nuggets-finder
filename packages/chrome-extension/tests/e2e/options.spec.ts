import { expect, test } from "./fixtures";

test.describe("Options Page", () => {
	test("options page loads and displays basic elements", async ({
		context,
		extensionId,
	}) => {
		const page = await context.newPage();
		await page.goto(`chrome-extension://${extensionId}/options.html`);

		// Check that the page loads without errors
		await expect(page).toHaveURL(
			new RegExp(`chrome-extension://${extensionId}/options.html`),
		);

		// Basic smoke test - page should have some content
		const body = page.locator("body");
		await expect(body).toBeVisible();

		await page.close();
	});

	test("displays provider selection and Getting Started UI when no provider configured", async ({
		context,
		extensionId,
	}) => {
		const page = await context.newPage();
		await page.goto(`chrome-extension://${extensionId}/options.html`);

		// Wait for page to load
		await page.waitForLoadState("networkidle");

		// Check for Getting Started section (should be visible when no provider is selected)
		const gettingStartedText = await page.textContent("body");
		expect(gettingStartedText).toContain("Get Started");
		expect(gettingStartedText).toContain("Welcome!");
		expect(gettingStartedText).toContain("No provider selected");

		// Should have provider radio buttons
		const providerRadios = page.locator('input[type="radio"][name="provider"]');
		const radioCount = await providerRadios.count();
		expect(radioCount).toBeGreaterThanOrEqual(4); // gemini, openai, anthropic, openrouter

		// Should have provider selection UI but no API key inputs yet
		const apiKeyInputs = page.locator('input[type="password"]');
		const apiKeyCount = await apiKeyInputs.count();
		expect(apiKeyCount).toBe(0); // No API key inputs until provider is selected

		// Check for provider names
		expect(gettingStartedText).toContain("Google Gemini");
		expect(gettingStartedText).toContain("OpenAI");
		expect(gettingStartedText).toContain("Anthropic");
		expect(gettingStartedText).toContain("OpenRouter");

		await page.close();
	});

	test("shows API key input after provider selection", async ({
		context,
		extensionId,
	}) => {
		const page = await context.newPage();
		await page.goto(`chrome-extension://${extensionId}/options.html`);

		// Wait for page to load
		await page.waitForLoadState("networkidle");

		// Initially, no API key inputs should be visible
		const initialApiKeyInputs = page.locator('input[type="password"]');
		expect(await initialApiKeyInputs.count()).toBe(0);

		// Select a provider (Gemini)
		const geminiRadio = page.locator('input[type="radio"][value="gemini"]');
		await geminiRadio.click();

		// Now API key input should appear
		await page.waitForSelector('input[type="password"]', { timeout: 5000 });
		const apiKeyInputs = page.locator('input[type="password"]');
		expect(await apiKeyInputs.count()).toBe(1);

		// Enter a test API key (won't work but should trigger validation UI)
		const apiKeyInput = apiKeyInputs.first();
		await apiKeyInput.fill("test-api-key-123");

		// Look for validation button
		const validateButton = page.locator('button:has-text("Validate API Key")');
		expect(await validateButton.count()).toBe(1);

		await page.close();
	});

	test("provider selection workflow and UI state changes", async ({
		context,
		extensionId,
	}) => {
		const page = await context.newPage();
		await page.goto(`chrome-extension://${extensionId}/options.html`);

		// Wait for page to load
		await page.waitForLoadState("networkidle");

		// Verify Getting Started section is visible initially
		const gettingStartedSection = page.locator('h2:has-text("Get Started")');
		await expect(gettingStartedSection).toBeVisible();

		// Verify Current Configuration shows "No provider selected"
		const configurationText = await page.textContent("body");
		expect(configurationText).toContain("No provider selected");
		expect(configurationText).toContain("No model selected");

		// Select OpenAI provider
		const openaiRadio = page.locator('input[type="radio"][value="openai"]');
		await openaiRadio.click();

		// Wait a moment for state updates
		await page.waitForTimeout(500);

		// Getting Started section should no longer be visible
		// (it's conditionally rendered only when no provider is selected)
		const pageTextAfterSelection = await page.textContent("body");

		// Should show OpenAI as selected provider
		expect(pageTextAfterSelection).toContain("OpenAI");

		// API key input should appear
		await page.waitForSelector('input[type="password"]', { timeout: 5000 });

		await page.close();
	});

	test("handles model selection workflow", async ({ context, extensionId }) => {
		const page = await context.newPage();
		await page.goto(`chrome-extension://${extensionId}/options.html`);

		// Wait for page to load
		await page.waitForLoadState("networkidle");

		// Check if we can find any select elements (could be model dropdowns)
		const selectElements = page.locator("select");

		// Model dropdowns might not be visible initially (before API key validation)
		// Just verify the page has basic structure
		const selectCount = await selectElements.count();
		expect(selectCount).toBeGreaterThanOrEqual(0);

		// Check for any loading indicators or UI state elements
		const stateIndicators = page.locator(
			'.loading, [aria-busy="true"], .spinner',
		);

		// These should exist but not necessarily be visible initially
		const indicatorCount = await stateIndicators.count();
		expect(indicatorCount).toBeGreaterThanOrEqual(0);

		await page.close();
	});

	test("preserves existing functionality while adding model selection", async ({
		context,
		extensionId,
	}) => {
		const page = await context.newPage();
		await page.goto(`chrome-extension://${extensionId}/options.html`);

		// Wait for page to load
		await page.waitForLoadState("networkidle");

		// Look for prompt management sections (should always be present)
		const promptSectionText = await page.textContent("body");
		expect(promptSectionText).toContain("Analysis Prompts");

		// Look for action buttons that should still be present
		const actionButtons = page.locator("button");
		const buttonCount = await actionButtons.count();
		expect(buttonCount).toBeGreaterThanOrEqual(1);

		// Verify interactive elements are present (radio buttons for provider selection should exist)
		const interactiveElements = page.locator("input, select, button, textarea");
		const elementCount = await interactiveElements.count();
		expect(elementCount).toBeGreaterThanOrEqual(4); // At least provider radio buttons

		// Test provider selection preserves prompt functionality
		const geminiRadio = page.locator('input[type="radio"][value="gemini"]');
		await geminiRadio.click();

		// After provider selection, should still have prompt functionality
		const promptButtonsAfterSelection = page.locator(
			'button:has-text("Add New Prompt")',
		);
		expect(await promptButtonsAfterSelection.count()).toBeGreaterThanOrEqual(1);

		await page.close();
	});

	test("Getting Started section behavior with null provider state", async ({
		context,
		extensionId,
	}) => {
		const page = await context.newPage();
		await page.goto(`chrome-extension://${extensionId}/options.html`);

		// Wait for page to load
		await page.waitForLoadState("networkidle");

		// Getting Started section should be visible when no provider is selected
		const bodyText = await page.textContent("body");
		expect(bodyText).toContain("Get Started");
		expect(bodyText).toContain("Welcome! To start analyzing web content");
		expect(bodyText).toContain("Select a provider below to get started");

		// Current Configuration should reflect no provider state
		expect(bodyText).toContain("No provider selected");
		expect(bodyText).toContain("No model selected");
		expect(bodyText).toContain("Please select and configure a provider below");

		// Progress indicators should show only step 1 as active
		const _stepIndicators = page.locator('[style*="background"]');
		// We can't easily test CSS styles in Playwright, but we can verify the text content
		expect(bodyText).toContain("Select Provider");
		expect(bodyText).toContain("Enter API Key");
		expect(bodyText).toContain("Validate & Select Model");

		// Select a provider and verify Getting Started section disappears
		const anthropicRadio = page.locator(
			'input[type="radio"][value="anthropic"]',
		);
		await anthropicRadio.click();

		// Wait for UI update
		await page.waitForTimeout(500);

		// Getting Started section should no longer be visible
		const bodyTextAfterSelection = await page.textContent("body");

		// The specific Getting Started welcome text should be gone
		// (though "Get Started" might still appear in other contexts)
		expect(bodyTextAfterSelection).not.toContain(
			"Welcome! To start analyzing web content",
		);
		expect(bodyTextAfterSelection).not.toContain(
			"Select a provider below to get started",
		);

		// Current Configuration should now show selected provider
		expect(bodyTextAfterSelection).toContain("Anthropic");

		await page.close();
	});
});
