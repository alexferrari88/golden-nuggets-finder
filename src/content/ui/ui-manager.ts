import type { Content, ContentScraper } from "threads-harvester";
import { getDisplayContent } from "../../shared/content-reconstruction";
import {
	borderRadius,
	colors,
	components,
	shadows,
	spacing,
	typography,
} from "../../shared/design-system";
import {
	measureDOMOperation,
	measureHighlighting,
	performanceMonitor,
} from "../../shared/performance";
import { ALL_NUGGET_TYPES, type GoldenNuggetType } from "../../shared/schemas";
import { storage } from "../../shared/storage";
import {
	type AnalysisProgressMessage,
	type GoldenNugget,
	MESSAGE_TYPES,
	type MissingContentFeedback,
	type ProviderId,
	type SavedPrompt,
	type SidebarNuggetItem,
	type TypeFilterOptions,
} from "../../shared/types";
import { Highlighter } from "./highlighter";
import { NotificationManager } from "./notifications";
import { Sidebar } from "./sidebar";

export class UIManager {
	private highlighter: Highlighter;
	private sidebar: Sidebar;
	private notifications: NotificationManager;
	private selectionScraper?: ContentScraper;
	private selectionModeActive = false;
	private currentPromptId?: string;
	private currentTypeFilter?: TypeFilterOptions;
	private controlPanel: HTMLElement | null = null;
	private originalPanelContent?: HTMLElement;
	private prompts: SavedPrompt[] = [];
	private keyboardListener?: (event: KeyboardEvent) => void;
	private analysisState = {
		currentStep: -1,
		completedSteps: [] as number[],
		visibleSteps: [] as number[],
		timers: [] as NodeJS.Timeout[],
	};
	private realTimeProgress = {
		isActive: false,
		analysisId: "",
		source: "",
		useRealTiming: true,
		fallbackTimeout: null as NodeJS.Timeout | null,
	};

	constructor() {
		this.highlighter = new Highlighter();
		this.sidebar = new Sidebar();
		this.notifications = new NotificationManager();
		this.loadPrompts();
	}

	private async loadPrompts(): Promise<void> {
		try {
			this.prompts = await storage.getPrompts();
		} catch (error) {
			console.error("Failed to load prompts:", error);
		}
	}

	showProgressBanner(): void {
		this.notifications.showProgress("Finding golden nuggets...");
	}

	hideProgressBanner(): void {
		this.notifications.hideProgress();
	}

	showErrorBanner(message: string): void {
		this.notifications.showError(message);
	}

	showInfoBanner(message: string): void {
		this.notifications.showInfo(message);
	}

	showApiKeyErrorBanner(
		errorType: "missing_key" | "rate_limited" = "missing_key",
	): void {
		this.notifications.showApiKeyError(errorType);
	}

	showNoResultsBanner(): void {
		this.notifications.showInfo(
			"✓ Analysis complete - Check the sidebar for details",
		);
	}

	showRateLimitedBanner(
		provider: string,
		waitTime: number,
		attempt: number,
		maxAttempts: number,
		analysisId: string,
	): void {
		this.notifications.showRateLimited(
			provider,
			waitTime,
			attempt,
			maxAttempts,
			analysisId,
		);
	}

	showRetryingBanner(
		provider: string,
		attempt: number,
		maxAttempts: number,
	): void {
		this.notifications.showRetrying(provider, attempt, maxAttempts);
	}

	async displayResults(
		nuggets: GoldenNugget[],
		pageContent?: string,
		providerMetadata?: {
			providerId: ProviderId;
			modelName: string;
			responseTime: number;
		},
	): Promise<void> {
		console.log("[UIManager] displayResults called with:", {
			nuggetsLength: nuggets.length,
			firstNugget: nuggets[0] || "none",
			pageContentLength: pageContent?.length || 0,
		});

		performanceMonitor.startTimer("display_results");

		// Clear any existing highlights and sidebar
		measureDOMOperation("clear_results", () => this.clearResults());

		// Enhance nuggets with reconstructed full content if page content is available
		const enhancedNuggets = nuggets.map((nugget) => {
			if (pageContent) {
				const fullContent = getDisplayContent(nugget, pageContent);
				// Create an enhanced nugget with full content for display
				return {
					...nugget,
					_fullContent: fullContent,
					_hasReconstructedContent:
						fullContent.length >
						nugget.startContent.length + nugget.endContent.length + 10,
				};
			}
			return nugget;
		});

		console.log("[UIManager] Enhanced nuggets:", {
			enhancedNuggetsLength: enhancedNuggets.length,
			firstEnhancedNugget: enhancedNuggets[0] || "none",
		});

		// Highlight nuggets on the page (pass page content for reconstruction)
		const sidebarItems: SidebarNuggetItem[] = [];

		performanceMonitor.startTimer("highlight_nuggets");
		try {
			for (let i = 0; i < enhancedNuggets.length; i++) {
				const nugget = enhancedNuggets[i];
				const originalNugget = nuggets[i];

				console.log(
					`[UIManager] Processing nugget ${i + 1}/${enhancedNuggets.length}:`,
					{
						type: nugget.type,
						startContent: `${nugget.startContent?.substring(0, 50)}...`,
						endContent: `${nugget.endContent?.substring(0, 50)}...`,
					},
				);

				const highlighted = await measureHighlighting("nugget_highlight", () =>
					this.highlighter.highlightNugget(originalNugget, pageContent),
				);
				sidebarItems.push({
					nugget: nugget, // Enhanced nugget already matches GoldenNugget type
					status: highlighted ? "highlighted" : "not-found",
					selected: false,
				});
			}
		} catch (error) {
			console.error("[UIManager] Error during nugget highlighting:", error);
		}

		console.log("[UIManager] Created sidebar items:", {
			sidebarItemsLength: sidebarItems.length,
			firstSidebarItem: sidebarItems[0] || "none",
		});

		performanceMonitor.logTimer(
			"highlight_nuggets",
			`Highlighted ${nuggets.length} nuggets`,
		);

		// Show sidebar with all nuggets (pass page content for reconstruction)
		console.log(
			"[UIManager] Calling sidebar.show with",
			sidebarItems.length,
			"items",
		);
		measureDOMOperation("show_sidebar", () =>
			this.sidebar.show(
				sidebarItems,
				this.highlighter,
				pageContent,
				providerMetadata,
			),
		);

		performanceMonitor.logTimer("display_results", "Complete results display");
	}

	clearResults(): void {
		this.highlighter.clearHighlights();
		this.sidebar.hide();
	}

	collapseSidebar(): void {
		this.sidebar.collapse();
	}

	expandSidebar(): void {
		this.sidebar.expand();
	}

	async enterSelectionMode(
		promptId?: string,
		contentScraper?: ContentScraper,
		typeFilter?: TypeFilterOptions,
	): Promise<void> {
		// Clear any existing results first
		this.clearResults();

		// Store the prompt ID and type filter for use when analyzing (but allow user to change it)
		this.currentPromptId = promptId;
		this.currentTypeFilter = typeFilter;

		if (contentScraper) {
			this.selectionScraper = contentScraper;
			this.selectionModeActive = true;

			// Listen for selection changes to update control panel
			this.selectionScraper.on("selectionChanged", () => {
				this.updateControlPanel();
			});
		}

		// Show simple info banner
		this.notifications.showInfo(
			"Select content to analyze using the checkboxes",
		);

		// Add keyboard listener for Esc key
		this.addKeyboardListener();

		// Show control panel (like original CommentSelector)
		this.showControlPanel();
	}

	exitSelectionMode(hideNotifications: boolean = true): void {
		if (this.selectionScraper) {
			this.selectionScraper.destroy();
			this.selectionScraper = undefined;
		}
		this.selectionModeActive = false;
		this.currentPromptId = undefined;
		if (hideNotifications) {
			this.notifications.hide();
		}

		// Remove keyboard listener
		this.removeKeyboardListener();

		// Remove control panel
		if (this.controlPanel) {
			this.controlPanel.style.transform = "translateY(100px)";
			this.controlPanel.style.opacity = "0";

			setTimeout(() => {
				if (this.controlPanel) {
					this.controlPanel.remove();
					this.controlPanel = null;
				}
			}, 300);
		}
	}

	private async analyzeSelectedContent(): Promise<void> {
		if (!this.currentPromptId) {
			this.notifications.showError("No prompt selected for analysis.");
			return;
		}

		// Get selected content
		const selectedContent = this.getSelectedContent();
		if (
			!selectedContent ||
			!selectedContent.items ||
			!Array.isArray(selectedContent.items) ||
			selectedContent.items.length === 0
		) {
			this.notifications.showError("No content selected for analysis.");
			return;
		}

		// Convert selected content to text (same logic as in original CommentSelector)
		const contentParts = [selectedContent.title];
		selectedContent.items.forEach((item) => {
			if (item.textContent) {
				contentParts.push(item.textContent);
			} else if (item.htmlContent) {
				// Strip HTML tags for text-only analysis
				const textContent = item.htmlContent.replace(/<[^>]*>/g, "").trim();
				if (textContent) {
					contentParts.push(textContent);
				}
			}
		});

		const content = contentParts.filter((part) => part?.trim()).join("\n\n");

		if (!content || content.trim().length === 0) {
			this.notifications.showError("Selected content is empty.");
			return;
		}

		// Show loading modal and hide the control panel during analysis
		this.showAnalysisInProgress();

		// Send message directly to background script (like original implementation)
		chrome.runtime.sendMessage({
			type: MESSAGE_TYPES.ANALYZE_SELECTED_CONTENT,
			content: content,
			promptId: this.currentPromptId,
			url: window.location.href,
			typeFilter: this.currentTypeFilter,
		});

		// Note: Selection mode will be exited when analysis completes/fails
		// via the message handlers in content.ts
	}

	isSelectionModeActive(): boolean {
		return this.selectionModeActive;
	}

	async enterMissingContentMode(
		contentScraper?: ContentScraper,
	): Promise<void> {
		// Clear any existing results first
		this.clearResults();

		if (contentScraper) {
			this.selectionScraper = contentScraper;
			this.selectionModeActive = true;

			// Listen for selection changes to update control panel
			this.selectionScraper.on("selectionChanged", () => {
				this.updateMissingContentPanel();
			});
		}

		// Show info banner for missing content mode
		this.notifications.showInfo(
			"Select content that should have been identified as golden nuggets",
		);

		// Add keyboard listener for Esc key
		this.addKeyboardListener();

		// Show missing content control panel
		this.showMissingContentPanel();
	}

	async enterDirectMissingContentMode(
		selectedText: string,
		url: string,
	): Promise<void> {
		// Clear any existing results first
		this.clearResults();

		// Set selection mode active so Esc key works
		this.selectionModeActive = true;

		console.log(
			`[UIManager] Entering direct missing content mode with text: "${selectedText.substring(0, 50)}..."`,
		);

		// Show info banner for direct missing content mode
		this.notifications.showInfo(
			`Select the type for the highlighted text: "${selectedText.length > 50 ? `${selectedText.substring(0, 47)}...` : selectedText}"`,
		);

		// Add keyboard listener for Esc key
		this.addKeyboardListener();

		// Show direct missing content selection panel
		this.showDirectMissingContentPanel(selectedText, url);
	}

	private showDirectMissingContentPanel(
		selectedText: string,
		url: string,
	): void {
		if (this.controlPanel) {
			this.controlPanel.remove();
		}

		this.controlPanel = document.createElement("div");
		this.controlPanel.className = "nugget-direct-missing-content-panel";
		this.controlPanel.style.cssText = `
			position: fixed;
			bottom: 20px;
			right: 20px;
			width: 380px;
			background: ${colors.background.primary};
			border: 1px solid ${colors.border.light};
			border-radius: ${borderRadius.lg};
			box-shadow: ${shadows.lg};
			z-index: 10001;
			font-family: ${typography.fontFamily.sans};
			padding: ${spacing.lg};
			transform: translateY(100px);
			opacity: 0;
			transition: all 0.3s ease;
		`;

		// Header with close button
		const headerContainer = document.createElement("div");
		headerContainer.style.cssText = `
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-bottom: ${spacing.md};
		`;

		const header = document.createElement("div");
		header.style.cssText = `
			font-size: ${typography.fontSize.sm};
			font-weight: ${typography.fontWeight.semibold};
			color: ${colors.text.primary};
		`;
		header.textContent = "Report Missed Golden Nugget";

		// Close button
		const closeButton = document.createElement("button");
		closeButton.style.cssText = `
			background: none;
			border: none;
			cursor: pointer;
			color: ${colors.text.secondary};
			font-size: ${typography.fontSize.lg};
			padding: ${spacing.xs};
			border-radius: ${borderRadius.sm};
			transition: all 0.2s ease;
			display: flex;
			align-items: center;
			justify-content: center;
			width: 24px;
			height: 24px;
		`;
		closeButton.innerHTML = "×";
		closeButton.title = "Cancel (Esc)";

		closeButton.addEventListener("click", () => {
			this.exitSelectionMode();
		});

		closeButton.addEventListener("mouseenter", () => {
			closeButton.style.backgroundColor = colors.background.secondary;
			closeButton.style.color = colors.text.primary;
		});

		closeButton.addEventListener("mouseleave", () => {
			closeButton.style.backgroundColor = "transparent";
			closeButton.style.color = colors.text.secondary;
		});

		headerContainer.appendChild(header);
		headerContainer.appendChild(closeButton);

		// Show selected text
		const textPreview = document.createElement("div");
		textPreview.style.cssText = `
			font-size: ${typography.fontSize.xs};
			color: ${colors.text.secondary};
			background: ${colors.background.tertiary};
			border-radius: ${borderRadius.sm};
			padding: ${spacing.sm};
			margin-bottom: ${spacing.md};
			max-height: 80px;
			overflow-y: auto;
			line-height: ${typography.lineHeight.normal};
			border-left: 3px solid ${colors.border.medium};
		`;
		textPreview.textContent = selectedText;

		// Type selection
		const typeSelectionContainer = document.createElement("div");
		typeSelectionContainer.style.cssText = `
			margin-bottom: ${spacing.md};
		`;

		const typeLabel = document.createElement("div");
		typeLabel.style.cssText = `
			font-size: ${typography.fontSize.xs};
			color: ${colors.text.secondary};
			margin-bottom: ${spacing.sm};
		`;
		typeLabel.textContent = "What type of golden nugget is this?";

		const typeSelect = document.createElement("select");
		typeSelect.className = "nugget-type-select";
		typeSelect.style.cssText = `
			width: 100%;
			padding: ${spacing.sm};
			border: 1px solid ${colors.border.light};
			border-radius: ${borderRadius.sm};
			background: ${colors.background.primary};
			color: ${colors.text.primary};
			font-size: ${typography.fontSize.sm};
			font-family: ${typography.fontFamily.sans};
		`;

		const typeOptions = [
			{ value: "", label: "Select type..." },
			{ value: "tool", label: "🛠️ Tool" },
			{ value: "media", label: "📺 Media" },
			{ value: "aha! moments", label: "💡 Aha! Moments" },
			{ value: "analogy", label: "🔄 Analogy" },
			{ value: "model", label: "📊 Model" },
		];

		typeOptions.forEach((option) => {
			const optionElement = document.createElement("option");
			optionElement.value = option.value;
			optionElement.textContent = option.label;
			typeSelect.appendChild(optionElement);
		});

		typeSelectionContainer.appendChild(typeLabel);
		typeSelectionContainer.appendChild(typeSelect);

		// Submit button
		const submitButton = document.createElement("button");
		submitButton.className = "missing-content-submit-btn";
		submitButton.style.cssText = `
			width: 100%;
			padding: ${spacing.sm} ${spacing.md};
			background: ${components.button.primary.backgroundColor};
			color: ${components.button.primary.color};
			border: none;
			border-radius: ${borderRadius.sm};
			font-size: ${typography.fontSize.sm};
			font-weight: ${typography.fontWeight.medium};
			cursor: pointer;
			transition: all 0.2s ease;
			opacity: 0.5;
		`;
		submitButton.textContent = "Submit Missing Nugget";
		submitButton.disabled = true;

		// Enable submit button when type is selected
		typeSelect.addEventListener("change", () => {
			const hasSelection = typeSelect.value !== "";
			submitButton.disabled = !hasSelection;
			submitButton.style.opacity = hasSelection ? "1" : "0.5";
		});

		// Submit functionality
		submitButton.addEventListener("click", async () => {
			const selectedType = typeSelect.value as GoldenNuggetType;
			if (!selectedType) return;

			try {
				submitButton.textContent = "Submitting...";
				submitButton.disabled = true;

				// Create missing content feedback
				const feedback = {
					id: `missing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
					content: selectedText,
					suggestedType: selectedType,
					timestamp: Date.now(),
					url: url,
					context: selectedText, // For direct selection, content is the context
				};

				// Send to background script
				const response = await chrome.runtime.sendMessage({
					type: MESSAGE_TYPES.SUBMIT_MISSING_CONTENT_FEEDBACK,
					missingContentFeedback: [feedback],
				});

				if (response?.success === false) {
					throw new Error(
						response.error || "Background script reported failure",
					);
				}

				// Show success notification
				this.notifications.showSuccess(
					"Missing content reported successfully!",
				);

				// Exit selection mode without hiding notifications (success will auto-hide)
				setTimeout(() => {
					this.exitSelectionMode(false);
				}, 1500);
			} catch (error) {
				console.error("Failed to submit missing content feedback:", error);
				submitButton.textContent = "Submit Missing Nugget";
				submitButton.disabled = false;
				this.notifications.showError(
					"Failed to submit feedback. Please try again.",
				);
			}
		});

		// Hover effects for submit button
		submitButton.addEventListener("mouseenter", () => {
			if (!submitButton.disabled) {
				submitButton.style.backgroundColor = colors.gray[800]; // Darker hover state
			}
		});

		submitButton.addEventListener("mouseleave", () => {
			if (!submitButton.disabled) {
				submitButton.style.backgroundColor =
					components.button.primary.backgroundColor;
			}
		});

		// Assemble the panel
		this.controlPanel.appendChild(headerContainer);
		this.controlPanel.appendChild(textPreview);
		this.controlPanel.appendChild(typeSelectionContainer);
		this.controlPanel.appendChild(submitButton);

		document.body.appendChild(this.controlPanel);

		// Animate in
		requestAnimationFrame(() => {
			if (this.controlPanel) {
				this.controlPanel.style.transform = "translateY(0)";
				this.controlPanel.style.opacity = "1";
			}
		});
	}

	getSelectedContent(): Content | null {
		if (this.selectionScraper) {
			const allContent = this.selectionScraper.getContent();
			if (!allContent) return null;

			// Filter to only selected items
			const selectedItems = allContent.items.filter((item) => item.selected);

			// Return content with only selected items
			return {
				...allContent,
				items: selectedItems,
			};
		}
		return null;
	}

	private showControlPanel(): void {
		if (this.controlPanel) {
			this.controlPanel.remove();
		}

		const _selectedContent = this.getSelectedContent();
		const allContent = this.selectionScraper?.getContent();
		const totalItems = allContent?.items?.length || 0;

		this.controlPanel = document.createElement("div");
		this.controlPanel.className = "nugget-control-panel";
		this.controlPanel.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 320px;
      background: ${colors.background.primary};
      border: 1px solid ${colors.border.light};
      border-radius: ${borderRadius.lg};
      box-shadow: ${shadows.lg};
      z-index: 10001;
      font-family: ${typography.fontFamily.sans};
      padding: ${spacing.lg};
      transform: translateY(100px);
      opacity: 0;
      transition: all 0.3s ease;
    `;

		// Header with close button
		const headerContainer = document.createElement("div");
		headerContainer.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: ${spacing.md};
    `;

		const header = document.createElement("div");
		header.style.cssText = `
      font-size: ${typography.fontSize.sm};
      font-weight: ${typography.fontWeight.semibold};
      color: ${colors.text.primary};
    `;
		header.textContent =
			totalItems > 0 ? "Select Content to Analyze" : "No Content Found";

		// Close button
		const closeButton = document.createElement("button");
		closeButton.style.cssText = `
      background: none;
      border: none;
      cursor: pointer;
      color: ${colors.text.secondary};
      font-size: ${typography.fontSize.lg};
      padding: ${spacing.xs};
      border-radius: ${borderRadius.sm};
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
    `;
		closeButton.innerHTML = "×";
		closeButton.title = "Close selection mode (Esc)";

		closeButton.addEventListener("click", () => {
			this.exitSelectionMode();
		});

		closeButton.addEventListener("mouseenter", () => {
			closeButton.style.backgroundColor = colors.background.secondary;
			closeButton.style.color = colors.text.primary;
		});

		closeButton.addEventListener("mouseleave", () => {
			closeButton.style.backgroundColor = "transparent";
			closeButton.style.color = colors.text.secondary;
		});

		headerContainer.appendChild(header);
		headerContainer.appendChild(closeButton);

		// Counter
		const counter = document.createElement("div");
		counter.className = "content-counter";
		counter.style.cssText = `
      font-size: ${typography.fontSize.sm};
      color: ${colors.text.secondary};
      margin-bottom: ${spacing.md};
    `;

		// Quick actions
		const quickActions = document.createElement("div");
		quickActions.style.cssText = `
      display: flex;
      gap: ${spacing.sm};
      margin-bottom: ${spacing.md};
    `;

		const selectAllBtn = this.createButton("Select All", () => {
			this.selectAllContent();
		});

		const clearAllBtn = this.createButton("Clear All", () => {
			this.clearAllContent();
		});

		quickActions.appendChild(selectAllBtn);
		quickActions.appendChild(clearAllBtn);

		// Prompt selection
		const promptSection = document.createElement("div");
		promptSection.style.cssText = `
      margin-bottom: ${spacing.md};
    `;

		const promptLabel = document.createElement("div");
		promptLabel.style.cssText = `
      font-size: ${typography.fontSize.sm};
      font-weight: ${typography.fontWeight.medium};
      color: ${colors.text.primary};
      margin-bottom: ${spacing.sm};
    `;
		promptLabel.textContent = "Prompt:";

		const promptSelect = document.createElement("select");
		promptSelect.style.cssText = `
      width: 100%;
      padding: ${spacing.sm};
      border: 1px solid ${colors.border.light};
      border-radius: ${borderRadius.sm};
      background-color: ${colors.background.primary};
      color: ${colors.text.primary};
      font-size: ${typography.fontSize.sm};
    `;

		// Auto-select default prompt if none is selected (e.g., from right-click menu)
		if (!this.currentPromptId && this.prompts.length > 0) {
			const defaultPrompt =
				this.prompts.find((p) => p.isDefault) || this.prompts[0];
			this.currentPromptId = defaultPrompt.id;
		}

		this.prompts.forEach((prompt) => {
			const option = document.createElement("option");
			option.value = prompt.id;
			option.textContent = prompt.name;
			if (prompt.id === this.currentPromptId) {
				option.selected = true;
			}
			promptSelect.appendChild(option);
		});

		// Set initial value and add change listener
		promptSelect.value = this.currentPromptId || "";
		promptSelect.addEventListener("change", () => {
			this.currentPromptId = promptSelect.value;
		});

		promptSection.appendChild(promptLabel);
		promptSection.appendChild(promptSelect);

		// Analyze button
		const analyzeBtn = document.createElement("button");
		analyzeBtn.style.cssText = `
      width: 100%;
      padding: ${spacing.md};
      background-color: ${colors.text.accent};
      color: ${colors.background.primary};
      border: none;
      border-radius: ${borderRadius.md};
      font-size: ${typography.fontSize.sm};
      font-weight: ${typography.fontWeight.semibold};
      cursor: pointer;
      transition: all 0.2s ease;
    `;
		analyzeBtn.textContent = "Analyze Selected Content";

		analyzeBtn.addEventListener("click", async () => {
			await this.analyzeSelectedContent();
		});

		analyzeBtn.addEventListener("mouseenter", () => {
			analyzeBtn.style.backgroundColor = colors.text.accent;
			analyzeBtn.style.boxShadow = shadows.md;
		});

		analyzeBtn.addEventListener("mouseleave", () => {
			analyzeBtn.style.backgroundColor = colors.text.accent;
			analyzeBtn.style.boxShadow = "none";
		});

		// Assemble panel
		this.controlPanel.appendChild(headerContainer);
		this.controlPanel.appendChild(counter);
		this.controlPanel.appendChild(quickActions);
		this.controlPanel.appendChild(promptSection);
		this.controlPanel.appendChild(analyzeBtn);

		document.body.appendChild(this.controlPanel);

		// Animate in
		requestAnimationFrame(() => {
			if (this.controlPanel) {
				this.controlPanel.style.transform = "translateY(0)";
				this.controlPanel.style.opacity = "1";
			}
		});

		this.updateControlPanel();
	}

	private createButton(text: string, onClick: () => void): HTMLElement {
		const button = document.createElement("button");
		button.style.cssText = `
      flex: 1;
      padding: ${spacing.sm};
      background-color: ${colors.background.secondary};
      color: ${colors.text.primary};
      border: 1px solid ${colors.border.light};
      border-radius: ${borderRadius.sm};
      font-size: ${typography.fontSize.xs};
      font-weight: ${typography.fontWeight.medium};
      cursor: pointer;
      transition: all 0.2s ease;
    `;
		button.textContent = text;

		button.addEventListener("click", onClick);
		button.addEventListener("mouseenter", () => {
			button.style.backgroundColor = colors.background.primary;
			button.style.borderColor = colors.border.default;
		});
		button.addEventListener("mouseleave", () => {
			button.style.backgroundColor = colors.background.secondary;
			button.style.borderColor = colors.border.light;
		});

		return button;
	}

	private updateControlPanel(): void {
		if (!this.controlPanel) return;

		const selectedContent = this.getSelectedContent();
		const allContent = this.selectionScraper?.getContent();
		const selectedCount = selectedContent?.items?.length || 0;
		const totalCount = allContent?.items?.length || 0;

		const counter = this.controlPanel.querySelector(".content-counter");
		if (counter) {
			if (totalCount === 0) {
				counter.textContent = "No content detected on this page.";
			} else {
				counter.textContent = `${selectedCount} of ${totalCount} items selected`;
			}
		}
	}

	private selectAllContent(): void {
		if (this.selectionScraper) {
			const content = this.selectionScraper.getContent();
			if (content) {
				// Simulate clicking checkboxes for items that are not already selected
				content.items.forEach((item) => {
					if (!item.selected) {
						this.simulateCheckboxClick(item.element);
					}
				});
			}
		}
	}

	private clearAllContent(): void {
		if (this.selectionScraper) {
			const content = this.selectionScraper.getContent();
			if (content) {
				// Simulate clicking checkboxes for items that are currently selected
				content.items.forEach((item) => {
					if (item.selected) {
						this.simulateCheckboxClick(item.element);
					}
				});
			}
		}
	}

	private simulateCheckboxClick(element: HTMLElement): void {
		// Find the checkbox associated with this element
		// Checkboxes are positioned near the target elements
		const checkboxes = document.querySelectorAll(
			'div[style*="position: absolute"][style*="width: 18px"][style*="height: 18px"]',
		);

		for (const checkbox of checkboxes) {
			const checkboxEl = checkbox as HTMLElement;
			// Check if this checkbox is near the target element by comparing positions
			const elementRect = element.getBoundingClientRect();
			const checkboxRect = checkboxEl.getBoundingClientRect();

			// Allow some tolerance for positioning differences
			const tolerance = 50;
			if (
				Math.abs(checkboxRect.top - elementRect.top) < tolerance &&
				Math.abs(checkboxRect.left - (elementRect.left - 25)) < tolerance
			) {
				// Found the checkbox for this element, simulate click
				checkboxEl.click();
				break;
			}
		}
	}

	private addKeyboardListener(): void {
		// Create the keyboard listener function
		this.keyboardListener = (event: KeyboardEvent) => {
			// Only handle Esc key when selection mode is active
			if (event.key === "Escape" && this.selectionModeActive) {
				event.preventDefault();
				event.stopPropagation();
				this.exitSelectionMode();
			}
		};

		// Add the listener to the document
		document.addEventListener("keydown", this.keyboardListener, {
			capture: true,
		});
	}

	private removeKeyboardListener(): void {
		if (this.keyboardListener) {
			document.removeEventListener("keydown", this.keyboardListener, {
				capture: true,
			});
			this.keyboardListener = undefined;
		}
	}

	private showAnalysisInProgress(): void {
		if (!this.controlPanel) return;

		// Hide simple notification if it's showing
		this.notifications.hideProgress();

		// Store original content
		this.originalPanelContent = this.controlPanel.cloneNode(
			true,
		) as HTMLElement;

		// Find the current prompt name
		const currentPrompt = this.prompts.find(
			(p) => p.id === this.currentPromptId,
		);
		const promptName = currentPrompt?.name || "Unknown";

		// Replace control panel content with analysis UI
		this.replaceControlPanelWithAnalysis(promptName);
	}

	// Method to restore control panel after analysis (called from content.ts)
	restoreSelectionMode(): void {
		this.notifications.hideProgress();

		// Complete analysis and close the control panel
		if (this.controlPanel && this.isAnalysisInProgress()) {
			this.completeAnalysisInPanel();

			// Close the panel after showing completion briefly
			setTimeout(() => {
				this.exitSelectionMode();
			}, 1000);
		}
	}

	// Start real-time progress tracking for a new analysis
	startRealTimeProgress(analysisId: string, source?: string): void {
		this.realTimeProgress = {
			isActive: true,
			analysisId,
			source: source || "",
			useRealTiming: true,
			fallbackTimeout: null,
		};

		// Reset analysis state for new analysis
		this.analysisState = {
			currentStep: -1,
			completedSteps: [],
			visibleSteps: [],
			timers: [],
		};

		// Set up fallback timing in case real progress messages are lost
		this.setupFallbackTiming();
	}

	// Handle incoming real-time progress messages
	handleProgressUpdate(progressMessage: AnalysisProgressMessage): void {
		// Only process messages for the current analysis
		if (
			!this.realTimeProgress.isActive ||
			progressMessage.analysisId !== this.realTimeProgress.analysisId
		) {
			return;
		}

		// Cancel fallback timing since we're getting real messages
		if (this.realTimeProgress.fallbackTimeout) {
			clearTimeout(this.realTimeProgress.fallbackTimeout);
			this.realTimeProgress.fallbackTimeout = null;
		}

		// Update animation state based on real progress
		this.processRealTimeStep(progressMessage);
	}

	private setupFallbackTiming(): void {
		// If no real progress messages arrive within 2 seconds, fall back to fake timing
		this.realTimeProgress.fallbackTimeout = setTimeout(() => {
			if (
				this.realTimeProgress.isActive &&
				this.realTimeProgress.useRealTiming
			) {
				console.warn(
					"[UIManager] Falling back to fake timing - no real progress messages received",
				);
				this.realTimeProgress.useRealTiming = false;
				this.startFallbackAnimation();
			}
		}, 2000);
	}

	private processRealTimeStep(progressMessage: AnalysisProgressMessage): void {
		const stepIndex = progressMessage.step - 1; // Convert to 0-based index

		// Make sure step is visible first
		if (!this.analysisState.visibleSteps.includes(stepIndex)) {
			// Show all steps up to this one
			for (let i = 0; i <= stepIndex; i++) {
				if (!this.analysisState.visibleSteps.includes(i)) {
					this.analysisState.visibleSteps.push(i);
				}
			}
		}

		// Set current step
		this.analysisState.currentStep = stepIndex;

		// For step completion messages, mark as completed
		if (
			progressMessage.type === MESSAGE_TYPES.ANALYSIS_CONTENT_EXTRACTED ||
			progressMessage.type === MESSAGE_TYPES.ANALYSIS_API_RESPONSE_RECEIVED
		) {
			if (!this.analysisState.completedSteps.includes(stepIndex)) {
				this.analysisState.completedSteps.push(stepIndex);
			}
			if (stepIndex < 3) {
				this.analysisState.currentStep = -1;
			}
		}

		// Update the visual display
		this.updateStepsDisplay();
	}

	private startFallbackAnimation(): void {
		// Use the original fake timing as fallback
		this.startStepProgression();
	}

	cleanup(): void {
		this.clearResults();
		this.notifications.cleanup();
		this.exitSelectionMode();

		// Clean up analysis state and real-time progress
		this.cleanupAnalysisState();
		this.cleanupRealTimeProgress();
	}

	private cleanupRealTimeProgress(): void {
		if (this.realTimeProgress.fallbackTimeout) {
			clearTimeout(this.realTimeProgress.fallbackTimeout);
		}
		this.realTimeProgress = {
			isActive: false,
			analysisId: "",
			source: "",
			useRealTiming: true,
			fallbackTimeout: null,
		};
	}

	private replaceControlPanelWithAnalysis(promptName: string): void {
		if (!this.controlPanel) return;

		// Clear current content
		this.controlPanel.innerHTML = "";

		// Reset analysis state
		this.analysisState = {
			currentStep: -1,
			completedSteps: [],
			visibleSteps: [],
			timers: [],
		};

		const analysisSteps = [
			{ id: "extract", text: "Extracting key insights" },
			{ id: "patterns", text: "Identifying patterns" },
			{ id: "generate", text: "Generating golden nuggets" },
			{ id: "finalize", text: "Finalizing analysis" },
		];

		// Header with AI avatar and typing text
		const header = document.createElement("div");
		header.style.cssText = `
      display: flex;
      align-items: center;
      gap: ${spacing.xs};
      margin-bottom: ${spacing.md};
    `;

		// AI Avatar
		const avatar = document.createElement("div");
		avatar.style.cssText = `
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: ${colors.text.accent};
      box-shadow: 0 0 8px ${colors.text.accent}40;
      flex-shrink: 0;
    `;

		// Typing text container
		const typingContainer = document.createElement("div");
		typingContainer.className = "typing-text";
		typingContainer.style.cssText = `
      color: ${colors.text.primary};
      font-size: ${typography.fontSize.sm};
      font-weight: ${typography.fontWeight.medium};
      flex: 1;
      min-height: 20px;
    `;

		header.appendChild(avatar);
		header.appendChild(typingContainer);

		// Analysis steps container
		const stepsContainer = document.createElement("div");
		stepsContainer.className = "analysis-steps";
		stepsContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: ${spacing.xs};
      margin-bottom: ${spacing.md};
    `;

		// Create step elements
		analysisSteps.forEach((step, index) => {
			const stepElement = document.createElement("div");
			stepElement.className = `step-${index}`;
			stepElement.style.cssText = `
        display: flex;
        align-items: center;
        gap: ${spacing.sm};
        opacity: 0;
        transform: translateY(10px);
        transition: all 0.3s ease;
      `;

			const indicator = document.createElement("div");
			indicator.className = "step-indicator";
			indicator.style.cssText = `
        font-size: ${typography.fontSize.sm};
        font-weight: ${typography.fontWeight.medium};
        color: ${colors.text.tertiary};
        width: 16px;
        text-align: center;
        flex-shrink: 0;
      `;
			indicator.textContent = "○";

			const text = document.createElement("div");
			text.style.cssText = `
        font-size: ${typography.fontSize.sm};
        color: ${colors.text.tertiary};
        font-weight: ${typography.fontWeight.normal};
      `;
			text.textContent = step.text;

			stepElement.appendChild(indicator);
			stepElement.appendChild(text);
			stepsContainer.appendChild(stepElement);
		});

		// Prompt display
		const promptDisplay = document.createElement("div");
		promptDisplay.style.cssText = `
      text-align: center;
      padding-top: ${spacing.md};
      border-top: 1px solid ${colors.border.light};
    `;

		const promptLabel = document.createElement("div");
		promptLabel.style.cssText = `
      color: ${colors.text.tertiary};
      font-size: ${typography.fontSize.xs};
      font-weight: ${typography.fontWeight.normal};
      margin-bottom: ${spacing.xs};
    `;
		promptLabel.textContent = "Using:";

		const promptNameElement = document.createElement("div");
		promptNameElement.style.cssText = `
      color: ${colors.text.accent};
      font-size: ${typography.fontSize.sm};
      font-weight: ${typography.fontWeight.semibold};
    `;
		promptNameElement.textContent = promptName;

		promptDisplay.appendChild(promptLabel);
		promptDisplay.appendChild(promptNameElement);

		// Assemble content
		this.controlPanel.appendChild(header);
		this.controlPanel.appendChild(stepsContainer);
		this.controlPanel.appendChild(promptDisplay);

		// Add CSS for animations
		if (!document.getElementById("analysis-animations")) {
			const style = document.createElement("style");
			style.id = "analysis-animations";
			style.textContent = `
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        .step-indicator.pulsing {
          animation: pulse 1s ease-in-out infinite;
        }
      `;
			document.head.appendChild(style);
		}

		// Start animations
		setTimeout(() => {
			this.startTypingAnimation();
		}, 300);
	}

	private startTypingAnimation(): void {
		const typingContainer = this.controlPanel?.querySelector(
			".typing-text",
		) as HTMLElement;
		if (!typingContainer) return;

		const text = "Analyzing your content...";
		let index = 0;
		typingContainer.textContent = "";

		const typeChar = () => {
			if (index < text.length) {
				typingContainer.textContent = text.substring(0, index + 1);
				index++;
				const timer = setTimeout(typeChar, 80);
				this.analysisState.timers.push(timer);
			} else {
				// Show cursor briefly
				typingContainer.innerHTML = `${text}<span style="opacity: 0.7; margin-left: 2px;">|</span>`;

				const timer = setTimeout(() => {
					typingContainer.textContent = text;
					this.startStepProgression();
				}, 500);
				this.analysisState.timers.push(timer);
			}
		};

		typeChar();
	}

	private async startStepProgression(): Promise<void> {
		// First, make steps visible with staggered animation
		for (let i = 0; i < 4; i++) {
			await new Promise((resolve) => setTimeout(resolve, 300));
			this.analysisState.visibleSteps.push(i);
			this.updateStepsDisplay();
		}

		// Start step animations with staggered delays
		this.startStep(0, 0, 4000); // Extract: start immediately, run 4s
		this.startStep(1, 2000, 4000); // Patterns: start after 2s, run 4s
		this.startStep(2, 4000, 4000); // Generate: start after 4s, run 4s
		this.startStep(3, 6000, 8000); // Finalize: start after 6s, run 8s (will be interrupted)
	}

	private startStep(stepIndex: number, delay: number, duration: number): void {
		const timer = setTimeout(() => {
			this.analysisState.currentStep = stepIndex;
			this.updateStepsDisplay();

			const completeTimer = setTimeout(() => {
				if (!this.analysisState.completedSteps.includes(stepIndex)) {
					this.analysisState.completedSteps.push(stepIndex);
				}
				if (stepIndex < 3) {
					this.analysisState.currentStep = -1;
				}
				this.updateStepsDisplay();
			}, duration);
			this.analysisState.timers.push(completeTimer);
		}, delay);
		this.analysisState.timers.push(timer);
	}

	private updateStepsDisplay(): void {
		if (!this.controlPanel) return;

		const analysisSteps = [
			{ id: "extract", text: "Extracting key insights" },
			{ id: "patterns", text: "Identifying patterns" },
			{ id: "generate", text: "Generating golden nuggets" },
			{ id: "finalize", text: "Finalizing analysis" },
		];

		analysisSteps.forEach((_step, index) => {
			const stepElement = this.controlPanel?.querySelector(
				`.step-${index}`,
			) as HTMLElement;
			const indicator = stepElement?.querySelector(
				".step-indicator",
			) as HTMLElement;
			const text = stepElement?.querySelector("div:last-child") as HTMLElement;

			if (!stepElement || !indicator || !text) return;

			const isVisible = this.analysisState.visibleSteps.includes(index);
			const isInProgress = this.analysisState.currentStep === index;
			const isCompleted = this.analysisState.completedSteps.includes(index);

			// Update visibility
			if (isVisible) {
				stepElement.style.opacity = "1";
				stepElement.style.transform = "translateY(0)";
			}

			// Update indicator and colors
			if (isCompleted) {
				indicator.innerHTML = "✓";
				indicator.style.color = colors.text.accent;
				indicator.className = "step-indicator";
				text.style.color = colors.text.primary;
			} else if (isInProgress) {
				indicator.textContent = "●";
				indicator.style.color = colors.text.accent;
				indicator.className = "step-indicator pulsing";
				text.style.color = colors.text.secondary;
			} else {
				indicator.textContent = "○";
				indicator.style.color = colors.text.tertiary;
				indicator.className = "step-indicator";
				text.style.color = colors.text.tertiary;
			}
		});
	}

	private completeAnalysisInPanel(): void {
		// Complete all remaining steps immediately
		this.cleanupAnalysisState();

		// Complete all steps immediately
		this.analysisState.completedSteps = [0, 1, 2, 3];
		this.analysisState.currentStep = -1;
		this.updateStepsDisplay();
	}

	private cleanupAnalysisState(): void {
		// Clear all timers
		this.analysisState.timers.forEach((timer) => clearTimeout(timer));
		this.analysisState.timers = [];
	}

	private isAnalysisInProgress(): boolean {
		return this.controlPanel?.querySelector(".analysis-steps") !== null;
	}

	private showMissingContentPanel(): void {
		if (this.controlPanel) {
			this.controlPanel.remove();
		}

		const _selectedContent = this.getSelectedContent();
		const allContent = this.selectionScraper?.getContent();
		const _totalItems = allContent?.items?.length || 0;

		this.controlPanel = document.createElement("div");
		this.controlPanel.className = "nugget-missing-content-panel";
		this.controlPanel.style.cssText = `
			position: fixed;
			bottom: 20px;
			right: 20px;
			width: 360px;
			background: ${colors.background.primary};
			border: 1px solid ${colors.border.light};
			border-radius: ${borderRadius.lg};
			box-shadow: ${shadows.lg};
			z-index: 10001;
			font-family: ${typography.fontFamily.sans};
			padding: ${spacing.lg};
			transform: translateY(100px);
			opacity: 0;
			transition: all 0.3s ease;
		`;

		// Header with close button
		const headerContainer = document.createElement("div");
		headerContainer.style.cssText = `
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-bottom: ${spacing.md};
		`;

		const header = document.createElement("div");
		header.style.cssText = `
			font-size: ${typography.fontSize.sm};
			font-weight: ${typography.fontWeight.semibold};
			color: ${colors.text.primary};
		`;
		header.textContent = "Mark Missing Golden Nuggets";

		// Close button
		const closeButton = document.createElement("button");
		closeButton.style.cssText = `
			background: none;
			border: none;
			cursor: pointer;
			color: ${colors.text.secondary};
			font-size: ${typography.fontSize.lg};
			padding: ${spacing.xs};
			border-radius: ${borderRadius.sm};
			transition: all 0.2s ease;
			display: flex;
			align-items: center;
			justify-content: center;
			width: 24px;
			height: 24px;
		`;
		closeButton.innerHTML = "×";
		closeButton.title = "Close missing content mode (Esc)";

		closeButton.addEventListener("click", () => {
			this.exitSelectionMode();
		});

		closeButton.addEventListener("mouseenter", () => {
			closeButton.style.backgroundColor = colors.background.secondary;
			closeButton.style.color = colors.text.primary;
		});

		closeButton.addEventListener("mouseleave", () => {
			closeButton.style.backgroundColor = "transparent";
			closeButton.style.color = colors.text.secondary;
		});

		headerContainer.appendChild(header);
		headerContainer.appendChild(closeButton);

		// Instructions
		const instructions = document.createElement("div");
		instructions.style.cssText = `
			font-size: ${typography.fontSize.xs};
			color: ${colors.text.secondary};
			margin-bottom: ${spacing.md};
			padding: ${spacing.sm};
			background: ${colors.background.tertiary};
			border-radius: ${borderRadius.sm};
			line-height: ${typography.lineHeight.normal};
		`;
		instructions.textContent =
			"Select content that should have been identified as golden nuggets, then choose its type and submit.";

		// Counter
		const counter = document.createElement("div");
		counter.className = "missing-content-counter";
		counter.style.cssText = `
			font-size: ${typography.fontSize.sm};
			color: ${colors.text.secondary};
			margin-bottom: ${spacing.md};
		`;

		// Quick actions
		const quickActions = document.createElement("div");
		quickActions.style.cssText = `
			display: flex;
			gap: ${spacing.sm};
			margin-bottom: ${spacing.md};
		`;

		const selectAllBtn = this.createButton("Select All", () => {
			this.selectAllContent();
		});

		const clearAllBtn = this.createButton("Clear All", () => {
			this.clearAllContent();
		});

		quickActions.appendChild(selectAllBtn);
		quickActions.appendChild(clearAllBtn);

		// Nugget Type Selection
		const typeSection = document.createElement("div");
		typeSection.style.cssText = `
			margin-bottom: ${spacing.md};
		`;

		const typeLabel = document.createElement("div");
		typeLabel.style.cssText = `
			font-size: ${typography.fontSize.sm};
			font-weight: ${typography.fontWeight.medium};
			color: ${colors.text.primary};
			margin-bottom: ${spacing.sm};
		`;
		typeLabel.textContent = "Nugget Type:";

		const typeSelect = document.createElement("select");
		typeSelect.id = "missing-content-type-select";
		typeSelect.style.cssText = `
			width: 100%;
			padding: ${spacing.sm};
			border: 1px solid ${colors.border.light};
			border-radius: ${borderRadius.sm};
			background-color: ${colors.background.primary};
			color: ${colors.text.primary};
			font-size: ${typography.fontSize.sm};
		`;

		// Add all nugget types as options
		ALL_NUGGET_TYPES.forEach((type) => {
			const option = document.createElement("option");
			option.value = type;
			option.textContent = type.charAt(0).toUpperCase() + type.slice(1);
			typeSelect.appendChild(option);
		});

		// Default to 'aha! moments' as it's most common
		typeSelect.value = "aha! moments";

		typeSection.appendChild(typeLabel);
		typeSection.appendChild(typeSelect);

		// Submit button
		const submitBtn = document.createElement("button");
		submitBtn.style.cssText = `
			width: 100%;
			padding: ${spacing.md};
			background-color: ${colors.text.accent};
			color: ${colors.background.primary};
			border: none;
			border-radius: ${borderRadius.md};
			font-size: ${typography.fontSize.sm};
			font-weight: ${typography.fontWeight.semibold};
			cursor: pointer;
			transition: all 0.2s ease;
		`;
		submitBtn.textContent = "Submit Missing Content";

		submitBtn.addEventListener("click", async () => {
			await this.submitMissingContentFeedback();
		});

		submitBtn.addEventListener("mouseenter", () => {
			submitBtn.style.backgroundColor = colors.text.primary;
			submitBtn.style.boxShadow = shadows.md;
		});

		submitBtn.addEventListener("mouseleave", () => {
			submitBtn.style.backgroundColor = colors.text.accent;
			submitBtn.style.boxShadow = "none";
		});

		// Assemble panel
		this.controlPanel.appendChild(headerContainer);
		this.controlPanel.appendChild(instructions);
		this.controlPanel.appendChild(counter);
		this.controlPanel.appendChild(quickActions);
		this.controlPanel.appendChild(typeSection);
		this.controlPanel.appendChild(submitBtn);

		document.body.appendChild(this.controlPanel);

		// Animate in
		requestAnimationFrame(() => {
			if (this.controlPanel) {
				this.controlPanel.style.transform = "translateY(0)";
				this.controlPanel.style.opacity = "1";
			}
		});

		this.updateMissingContentPanel();
	}

	private updateMissingContentPanel(): void {
		if (!this.controlPanel) return;

		const selectedContent = this.getSelectedContent();
		const allContent = this.selectionScraper?.getContent();
		const selectedCount = selectedContent?.items?.length || 0;
		const totalCount = allContent?.items?.length || 0;

		const counter = this.controlPanel.querySelector(".missing-content-counter");
		if (counter) {
			if (totalCount === 0) {
				counter.textContent = "No content detected on this page.";
			} else {
				counter.textContent = `${selectedCount} of ${totalCount} items selected for marking as missing golden nuggets`;
			}
		}
	}

	private async submitMissingContentFeedback(): Promise<void> {
		const selectedContent = this.getSelectedContent();
		if (
			!selectedContent ||
			!selectedContent.items ||
			!Array.isArray(selectedContent.items) ||
			selectedContent.items.length === 0
		) {
			this.notifications.showError(
				"Please select content to mark as missing golden nuggets.",
			);
			return;
		}

		const typeSelect = this.controlPanel?.querySelector(
			"#missing-content-type-select",
		) as HTMLSelectElement;
		if (!typeSelect) {
			this.notifications.showError(
				"Unable to determine nugget type selection.",
			);
			return;
		}

		const selectedType = typeSelect.value as GoldenNuggetType;

		// Get the provider info that was used for the analysis
		const result = await chrome.storage.local.get(["lastUsedProvider"]);
		const lastUsedProvider = result.lastUsedProvider;

		// Create feedback for each selected item
		const missingContentFeedback: MissingContentFeedback[] = [];
		const context = `${document.title} - ${window.location.href}`;

		selectedContent.items.forEach((item) => {
			const feedbackId = `missing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
			const content = item.textContent || item.htmlContent || "";

			if (content.trim()) {
				missingContentFeedback.push({
					id: feedbackId,
					startContent: content.substring(0, 100), // First 100 chars
					endContent: content.length > 100 ? content.substring(content.length - 100) : content, // Last 100 chars
					suggestedType: selectedType,
					timestamp: Date.now(),
					url: window.location.href,
					context: context.substring(0, 200),
					// Add provider/model data from the analysis that generated the original results
					modelProvider: lastUsedProvider?.providerId || "gemini",
					modelName: lastUsedProvider?.modelName || "gemini-2.5-flash",
					// TODO: Prompt metadata should come from the analysis that generated the original results
					prompt: {
						id: "unknown",
						content: "",
						type: "default",
						name: "Unknown Prompt",
					},
				});
			}
		});

		if (missingContentFeedback.length === 0) {
			this.notifications.showError("No valid content found in selection.");
			return;
		}

		// Send to background script for processing
		chrome.runtime.sendMessage({
			type: MESSAGE_TYPES.SUBMIT_MISSING_CONTENT_FEEDBACK,
			missingContentFeedback: missingContentFeedback,
		});

		// Show success message and exit
		this.notifications.showInfo(
			`Successfully submitted ${missingContentFeedback.length} missing golden nugget${missingContentFeedback.length > 1 ? "s" : ""}`,
		);

		// Exit selection mode after a brief delay
		setTimeout(() => {
			this.exitSelectionMode();
		}, 1500);
	}
}
