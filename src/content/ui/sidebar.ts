import {
	getDisplayContent,
	reconstructFullContent,
} from "../../shared/content-reconstruction";
import {
	borderRadius,
	colors,
	generateInlineStyles,
	shadows,
	spacing,
	typography,
	ui,
	zIndex,
} from "../../shared/design-system";
import { ALL_NUGGET_TYPES, type GoldenNuggetType } from "../../shared/schemas";
import {
	type FeedbackRating,
	type GoldenNugget,
	MESSAGE_TYPES,
	type NuggetFeedback,
	type ProviderId,
	type SidebarNuggetItem,
} from "../../shared/types";
import type { Highlighter } from "./highlighter";

// Extended nugget interface for UI operations
interface EnhancedGoldenNugget extends GoldenNugget {
	_fullContent?: string; // Enhanced content from UIManager
	content?: string; // Legacy content field during transition
	// Ensemble properties (optional)
	confidence?: number;
	runsSupportingThis?: number;
	totalRuns?: number;
}

// Export data structure
interface ExportNuggetData {
	type: string;
	startContent: string;
	endContent: string;
}

interface ExportData {
	url: string;
	nuggets: ExportNuggetData[];
}

// REST endpoint payload structures
interface RestPayloadNugget {
	type?: string;
	startContent?: string;
	endContent?: string;
}

interface RestPayload {
	url?: string;
	timestamp?: string;
	nuggets?: RestPayloadNugget[];
}

export class Sidebar {
	private sidebar: HTMLElement | null = null;
	private collapsedTab: HTMLElement | null = null;
	private itemsPerPage = 20;
	private currentPage = 0;
	private allItems: SidebarNuggetItem[] = [];
	private isCollapsed = false;
	private highlighter: Highlighter | null = null;
	private selectedItems: Set<number> = new Set();
	private actionMenu: HTMLElement | null = null;
	private actionMenuVisible: boolean = false;
	private restEndpointPanel: HTMLElement | null = null;
	private restEndpointExpanded: boolean = false;
	private pageContent: string | null = null; // Store page content for reconstruction
	private providerMetadata: {
		providerId: ProviderId;
		modelName: string;
		responseTime: number;
	} | null = null; // Store provider metadata for display
	private restEndpointConfig = {
		url: "",
		method: "POST",
		contentType: "application/json",
		headers: [] as Array<{ key: string; value: string }>,
		includeUrl: true,
		includeTimestamp: true,
		includeNuggets: true,
		nuggetParts: {
			type: true,
			content: true,
		},
	};
	private keyboardHandler: ((e: KeyboardEvent) => void) | null = null;

	/**
	 * Get the emoji for a nugget type
	 */
	// Method removed - no longer needed as we don't use emojis in type badges

	/**
	 * Get display content for a nugget in the sidebar
	 * Uses the shared reconstruction utility to show full content when possible
	 */
	private getSidebarDisplayContent(nugget: EnhancedGoldenNugget): string {
		// Check if we have enhanced content from UIManager
		if (nugget._fullContent) {
			return nugget._fullContent;
		}

		// Try to reconstruct using shared utility if we have page content
		if (nugget.startContent && nugget.endContent) {
			return getDisplayContent(nugget, this.pageContent || undefined);
		}

		// Fallback for legacy content field (during transition)
		return nugget.content || "";
	}

	/**
	 * Get truncated display content with proper length checking
	 */
	private getTruncatedContent(
		nugget: EnhancedGoldenNugget,
		maxLength: number,
	): { content: string; isTruncated: boolean; fullContent: string } {
		const fullContent = this.getSidebarDisplayContent(nugget);
		const isTruncated = fullContent.length > maxLength;
		const truncatedContent = isTruncated
			? fullContent.substring(0, maxLength)
			: fullContent;

		return {
			content: truncatedContent,
			isTruncated,
			fullContent,
		};
	}

	/**
	 * Get content for feedback submission (full content)
	 * Prioritizes getting the absolute best/fullest content available for feedback storage
	 */
	private getFeedbackContent(nugget: EnhancedGoldenNugget): string {
		// Strategy 1: Check if we have enhanced full content from UIManager
		if (nugget._fullContent) {
			return nugget._fullContent;
		}

		// Strategy 2: Try to reconstruct using page content with more aggressive approach
		if (nugget.startContent && nugget.endContent && this.pageContent) {
			const reconstructed = getDisplayContent(nugget, this.pageContent);
			// For feedback, accept any reconstructed content that's longer than just start+end
			if (
				reconstructed &&
				reconstructed !== `${nugget.startContent}...${nugget.endContent}`
			) {
				return reconstructed;
			}

			// Try the full reconstruction method directly with more tolerance
			const fullReconstructed = reconstructFullContent(
				nugget,
				this.pageContent,
			);
			if (
				fullReconstructed &&
				fullReconstructed.length >
					nugget.startContent.length + nugget.endContent.length
			) {
				return fullReconstructed;
			}
		}

		// Strategy 3: Use legacy content field if available and longer
		if (
			nugget.content &&
			nugget.content.length >
				(nugget.startContent?.length || 0) + (nugget.endContent?.length || 0)
		) {
			return nugget.content;
		}

		// Strategy 4: Fallback to start...end (but this is what we want to avoid)
		return nugget.startContent && nugget.endContent
			? `${nugget.startContent}...${nugget.endContent}`
			: nugget.content || "";
	}

	show(
		nuggetItems: SidebarNuggetItem[],
		highlighter?: Highlighter,
		pageContent?: string,
		providerMetadata?: {
			providerId: ProviderId;
			modelName: string;
			responseTime: number;
		},
	): void {
		console.log("[Sidebar] show called with:", {
			nuggetItemsLength: nuggetItems.length,
			firstNuggetItem: nuggetItems[0] || "none",
			pageContentLength: pageContent?.length || 0,
			hasHighlighter: !!highlighter,
		});

		this.hide(); // Remove existing sidebar if any

		// Store page content for reconstruction
		this.pageContent = pageContent || null;

		// Store provider metadata for display
		this.providerMetadata = providerMetadata || null;

		// Initialize selection state for all nuggets
		this.allItems = nuggetItems.map((item) => ({
			...item,
			selected: false,
			highlightVisited: false, // Track if highlighted item was clicked
		}));

		console.log("[Sidebar] Initialized allItems:", {
			allItemsLength: this.allItems.length,
			firstAllItem: this.allItems[0] || "none",
		});

		this.selectedItems.clear();
		this.currentPage = 0;
		this.isCollapsed = false;
		this.highlighter = highlighter || null;
		this.sidebar = this.createSidebar();
		document.body.appendChild(this.sidebar);

		// Create collapsed tab (initially hidden)
		this.collapsedTab = this.createCollapsedTab();
		document.body.appendChild(this.collapsedTab);

		// Initialize panel state
		this.restEndpointExpanded = false;

		// Add keyboard event listener for Esc key
		this.keyboardHandler = (e: KeyboardEvent) => {
			if (e.key === "Escape" && !this.isCollapsed) {
				e.preventDefault();
				this.collapse();
			}
		};
		document.addEventListener("keydown", this.keyboardHandler);

		// Adjust page margin to account for sidebar
		this.adjustPageLayout(true);
	}

	hide(): void {
		if (this.sidebar) {
			this.sidebar.remove();
			this.sidebar = null;
			this.adjustPageLayout(false);
		}
		if (this.collapsedTab) {
			this.collapsedTab.remove();
			this.collapsedTab = null;
		}
		if (this.actionMenu) {
			this.actionMenu.remove();
			this.actionMenu = null;
		}
		// Remove keyboard event listener
		if (this.keyboardHandler) {
			document.removeEventListener("keydown", this.keyboardHandler);
			this.keyboardHandler = null;
		}
	}

	collapse(): void {
		if (this.sidebar && !this.isCollapsed) {
			this.isCollapsed = true;
			this.sidebar.style.width = "40px";
			this.sidebar.style.overflowY = "hidden";
			this.adjustPageLayout(true); // Still showing sidebar, just collapsed
			this.showCollapsedTab();
		}
	}

	expand(): void {
		if (this.sidebar && this.isCollapsed) {
			this.isCollapsed = false;
			this.sidebar.style.width = ui.sidebarWidth;
			this.sidebar.style.overflowY = "auto";
			this.adjustPageLayout(true); // Still showing sidebar, now expanded
			this.hideCollapsedTab();
		}
	}

	private showCollapsedTab(): void {
		if (this.collapsedTab) {
			this.collapsedTab.style.display = "flex";
			this.collapsedTab.style.opacity = "1";
		}
	}

	private hideCollapsedTab(): void {
		if (this.collapsedTab) {
			this.collapsedTab.style.display = "none";
			this.collapsedTab.style.opacity = "0";
		}
	}

	private createCollapsedTab(): HTMLElement {
		const tab = document.createElement("div");
		tab.className = "nugget-collapsed-tab";
		tab.style.cssText = `
      position: fixed;
      right: 0;
      top: 0;
      width: 40px;
      height: 100vh;
      background: ${colors.background.primary};
      border-left: 1px solid ${colors.border.light};
      box-shadow: ${generateInlineStyles.sidebarShadow()};
      z-index: ${zIndex.sidebar};
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
      opacity: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

		// Create rotated text container
		const textContainer = document.createElement("div");
		textContainer.style.cssText = `
      transform: rotate(-90deg);
      white-space: nowrap;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 600;
      color: ${colors.text.primary};
    `;

		// Add title text
		const titleText = document.createElement("span");
		titleText.textContent = "Golden Nuggets";

		// Add count badge
		const countBadge = document.createElement("span");
		countBadge.textContent = this.allItems.length.toString();
		countBadge.style.cssText = `
      background: ${colors.text.accent};
      color: white;
      padding: 2px 6px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 500;
      min-width: 20px;
      text-align: center;
    `;

		textContainer.appendChild(titleText);
		textContainer.appendChild(countBadge);
		tab.appendChild(textContainer);

		// Event handlers
		tab.addEventListener("click", () => {
			this.expand();
		});

		tab.addEventListener("keydown", (e) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				this.expand();
			}
		});

		// Hover effects
		tab.addEventListener("mouseenter", () => {
			tab.style.background = colors.background.secondary;
			tab.style.boxShadow = generateInlineStyles.sidebarShadowHover();
			tab.style.borderLeftColor = colors.text.accent;
		});

		tab.addEventListener("mouseleave", () => {
			tab.style.background = colors.background.primary;
			tab.style.boxShadow = generateInlineStyles.sidebarShadow();
			tab.style.borderLeftColor = colors.border.light;
		});

		// Focus handling
		tab.setAttribute("tabindex", "0");
		tab.setAttribute("role", "button");
		tab.setAttribute("aria-label", "Expand Golden Nuggets sidebar");

		tab.addEventListener("focus", () => {
			tab.style.outline = `2px solid ${colors.text.accent}`;
			tab.style.outlineOffset = "-2px";
		});

		tab.addEventListener("blur", () => {
			tab.style.outline = "none";
		});

		return tab;
	}

	private createSidebar(): HTMLElement {
		const sidebar = document.createElement("div");
		sidebar.className = "nugget-sidebar";
		sidebar.style.cssText = `
      position: fixed;
      right: 0;
      top: 0;
      width: ${ui.sidebarWidth};
      height: 100vh;
      background: ${colors.background.primary};
      border-left: 1px solid ${colors.border.light};
      overflow-y: auto;
      z-index: ${zIndex.sidebar};
      box-shadow: ${generateInlineStyles.sidebarShadow()};
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      transition: width 0.3s ease, overflow-y 0.3s ease;
    `;

		// Create header with performance optimizations
		const header = this.createOptimizedHeader();
		sidebar.appendChild(header);

		// Create nugget list with virtual scrolling
		const nuggetList = this.createNuggetList();
		sidebar.appendChild(nuggetList);

		// Create floating action menu (initially hidden)
		this.actionMenu = this.createActionMenu();
		document.body.appendChild(this.actionMenu);

		// Create REST endpoint panel
		this.restEndpointPanel = this.createRestEndpointPanel();
		sidebar.appendChild(this.restEndpointPanel);

		return sidebar;
	}

	private createOptimizedHeader(): HTMLElement {
		const header = document.createElement("div");
		header.style.cssText = `
      padding: ${spacing["2xl"]} ${spacing["2xl"]} ${spacing.lg} ${spacing["2xl"]};
      border-bottom: 1px solid ${colors.border.light};
      background: ${colors.white};
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 2;
    `;

		const titleContainer = document.createElement("div");
		titleContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: ${spacing.xs};
    `;

		const title = document.createElement("h2");
		title.textContent = "Golden Nuggets";
		title.style.cssText = `
      margin: 0;
      font-size: ${typography.fontSize.lg};
      color: ${colors.text.primary};
      font-weight: ${typography.fontWeight.semibold};
      line-height: ${typography.lineHeight.tight};
    `;

		const count = document.createElement("span");
		count.textContent = `${this.allItems.length} ${this.allItems.length === 1 ? "nugget" : "nuggets"}`;
		count.style.cssText = `
      font-size: ${typography.fontSize.xs};
      color: ${colors.text.secondary};
      font-weight: ${typography.fontWeight.normal};
    `;

		titleContainer.appendChild(title);
		titleContainer.appendChild(count);

		// Add provider info if available
		if (this.providerMetadata) {
			const providerInfo = document.createElement("div");
			providerInfo.style.cssText = `
				font-size: ${typography.fontSize.xs};
				color: ${colors.text.tertiary};
				font-weight: ${typography.fontWeight.normal};
				margin-top: ${spacing.xs};
			`;

			// Format provider name for display (capitalize first letter)
			const providerName =
				this.providerMetadata.providerId.charAt(0).toUpperCase() +
				this.providerMetadata.providerId.slice(1);

			providerInfo.textContent = `${providerName} • ${this.providerMetadata.modelName}`;
			titleContainer.appendChild(providerInfo);
		}

		const actionsContainer = document.createElement("div");
		actionsContainer.style.cssText = `
      display: flex;
      align-items: center;
      gap: ${spacing.sm};
    `;

		// Action menu button
		const menuBtn = document.createElement("button");
		menuBtn.innerHTML =
			'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>';
		menuBtn.style.cssText = `
      background: none;
      border: none;
      padding: ${spacing.sm};
      border-radius: ${borderRadius.md};
      cursor: pointer;
      color: ${colors.text.secondary};
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

		menuBtn.addEventListener("click", (e) => {
			e.stopPropagation();
			this.toggleActionMenu();
		});

		menuBtn.addEventListener("mouseenter", () => {
			menuBtn.style.backgroundColor = colors.background.secondary;
			menuBtn.style.color = colors.text.primary;
		});

		menuBtn.addEventListener("mouseleave", () => {
			menuBtn.style.backgroundColor = "transparent";
			menuBtn.style.color = colors.text.secondary;
		});

		// Close button
		const closeBtn = document.createElement("button");
		closeBtn.innerHTML =
			'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>';
		closeBtn.style.cssText = `
      background: none;
      border: none;
      padding: ${spacing.sm};
      border-radius: ${borderRadius.md};
      cursor: pointer;
      color: ${colors.text.secondary};
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

		closeBtn.addEventListener("click", () => {
			this.collapse();
		});

		closeBtn.addEventListener("mouseenter", () => {
			closeBtn.style.backgroundColor = colors.background.secondary;
			closeBtn.style.color = colors.text.primary;
		});

		closeBtn.addEventListener("mouseleave", () => {
			closeBtn.style.backgroundColor = "transparent";
			closeBtn.style.color = colors.text.secondary;
		});

		actionsContainer.appendChild(menuBtn);
		actionsContainer.appendChild(closeBtn);

		header.appendChild(titleContainer);
		header.appendChild(actionsContainer);

		return header;
	}

	private createNuggetList(): HTMLElement {
		console.log(
			"[Sidebar] createNuggetList called with allItems.length:",
			this.allItems.length,
		);

		const nuggetList = document.createElement("div");
		nuggetList.id = "nugget-list-container";
		nuggetList.style.cssText = `
      padding: 0 ${spacing["2xl"]} ${spacing["2xl"]} ${spacing["2xl"]};
      flex: 1;
      overflow-y: auto;
    `;

		if (this.allItems.length === 0) {
			console.log(
				"[Sidebar] Showing empty state because allItems.length === 0",
			);
			const emptyState = this.createEmptyState();
			nuggetList.appendChild(emptyState);
		} else {
			console.log("[Sidebar] Rendering", this.allItems.length, "nuggets");
			this.renderCurrentPage(nuggetList);

			// Add pagination if needed
			if (this.allItems.length > this.itemsPerPage) {
				this.addPagination(nuggetList);
			}
		}

		return nuggetList;
	}

	private createEmptyState(): HTMLElement {
		const emptyState = document.createElement("div");
		emptyState.style.cssText = `
      text-align: center;
      padding: ${spacing["5xl"]} ${spacing["2xl"]};
      color: ${colors.text.secondary};
    `;

		const icon = document.createElement("div");
		icon.innerHTML =
			'<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>';
		icon.style.cssText = `
      margin-bottom: ${spacing.lg};
      opacity: 0.4;
      display: flex;
      justify-content: center;
    `;

		const title = document.createElement("h3");
		title.textContent = "No golden nuggets found";
		title.style.cssText = `
      margin: 0 0 ${spacing.sm} 0;
      font-size: ${typography.fontSize.base};
      font-weight: ${typography.fontWeight.medium};
      color: ${colors.text.primary};
    `;

		const description = document.createElement("p");
		description.textContent =
			"The AI didn't find any valuable insights on this page that match your interests.";
		description.style.cssText = `
      margin: 0 0 ${spacing.lg} 0;
      font-size: ${typography.fontSize.sm};
      line-height: ${typography.lineHeight.normal};
      color: ${colors.text.secondary};
      max-width: 280px;
      margin-left: auto;
      margin-right: auto;
    `;

		const suggestions = document.createElement("div");
		suggestions.innerHTML = `
      <div style="font-size: ${typography.fontSize.xs}; color: ${colors.text.tertiary}; line-height: ${typography.lineHeight.normal};">
        Try using a different prompt or analyzing different content
      </div>
    `;

		emptyState.appendChild(icon);
		emptyState.appendChild(title);
		emptyState.appendChild(description);
		emptyState.appendChild(suggestions);

		return emptyState;
	}

	private renderCurrentPage(container: HTMLElement): void {
		const start = this.currentPage * this.itemsPerPage;
		const end = Math.min(start + this.itemsPerPage, this.allItems.length);

		// Clear existing items
		const existingItems = container.querySelectorAll(".nugget-item");
		existingItems.forEach((item) => item.remove());

		// Use DocumentFragment for efficient DOM manipulation
		const fragment = document.createDocumentFragment();

		for (let i = start; i < end; i++) {
			const nuggetElement = this.createNuggetElement(
				this.allItems[i],
				i - start,
			);
			fragment.appendChild(nuggetElement);
		}

		container.appendChild(fragment);
	}

	private addPagination(container: HTMLElement): void {
		const totalPages = Math.ceil(this.allItems.length / this.itemsPerPage);

		const paginationDiv = document.createElement("div");
		paginationDiv.className = "nugget-pagination";
		paginationDiv.style.cssText = `
      display: flex;
      justify-content: center;
      align-items: center;
      gap: ${spacing.md};
      margin-top: ${spacing.xl};
      padding: ${spacing.lg} ${spacing.md};
      background: ${colors.background.secondary};
      border: 1px solid ${colors.border.light};
      border-radius: ${borderRadius.lg};
      box-shadow: ${shadows.md};
    `;

		// Previous button
		if (this.currentPage > 0) {
			const prevBtn = this.createPageButton("Previous", () => {
				this.currentPage--;
				this.renderCurrentPage(container);
				this.updatePagination(container);
			});
			paginationDiv.appendChild(prevBtn);
		}

		// Page info
		const pageInfo = document.createElement("span");
		pageInfo.textContent = `Page ${this.currentPage + 1} of ${totalPages}`;
		pageInfo.style.cssText = `
      align-self: center;
      color: ${colors.text.primary};
      font-size: ${typography.fontSize.sm};
      font-weight: ${typography.fontWeight.semibold};
      min-width: 80px;
      text-align: center;
    `;
		paginationDiv.appendChild(pageInfo);

		// Next button
		if (this.currentPage < totalPages - 1) {
			const nextBtn = this.createPageButton("Next", () => {
				this.currentPage++;
				this.renderCurrentPage(container);
				this.updatePagination(container);
			});
			paginationDiv.appendChild(nextBtn);
		}

		container.appendChild(paginationDiv);
	}

	private createPageButton(text: string, onClick: () => void): HTMLElement {
		const button = document.createElement("button");
		button.textContent = text;
		button.className = "pagination-button";
		button.style.cssText = `
      background: ${colors.text.accent};
      color: ${colors.white};
      border: 1px solid ${colors.text.accent};
      padding: ${spacing.sm} ${spacing.lg};
      border-radius: ${borderRadius.md};
      cursor: pointer;
      font-size: ${typography.fontSize.sm};
      font-weight: ${typography.fontWeight.semibold};
      font-family: ${typography.fontFamily.sans};
      transition: all 0.2s ease;
      min-width: 80px;
      box-shadow: ${shadows.md};
    `;

		button.addEventListener("click", onClick);
		button.addEventListener("mouseenter", () => {
			button.style.backgroundColor = colors.text.primary;
			button.style.borderColor = colors.text.primary;
			button.style.transform = "translateY(-1px)";
			button.style.boxShadow = "0 6px 12px rgba(0, 0, 0, 0.15)";
		});
		button.addEventListener("mouseleave", () => {
			button.style.backgroundColor = colors.text.accent;
			button.style.borderColor = colors.text.accent;
			button.style.transform = "translateY(0)";
			button.style.boxShadow = shadows.md;
		});

		return button;
	}

	private updatePagination(container: HTMLElement): void {
		const existingPagination = container.querySelector(".nugget-pagination");
		if (existingPagination) {
			existingPagination.remove();
		}
		this.addPagination(container);
	}

	private createNuggetElement(
		item: SidebarNuggetItem,
		index: number,
	): HTMLElement {
		const nuggetDiv = document.createElement("div");
		nuggetDiv.className = "nugget-item";
		const globalIndex = this.currentPage * this.itemsPerPage + index;
		const isSelected = item.selected;

		// Debug logging for index calculations
		console.debug(
			`[Sidebar] createNuggetElement: currentPage=${this.currentPage}, localIndex=${index}, globalIndex=${globalIndex}, totalItems=${this.allItems.length}`,
		);

		nuggetDiv.style.cssText = `
      margin-bottom: ${spacing.lg};
      padding: ${spacing.lg};
      border: 2px solid ${isSelected ? colors.text.accent : colors.border.light};
      border-radius: ${borderRadius.lg};
      background: ${isSelected ? colors.background.secondary : colors.white};
      transition: all 0.15s ease;
      cursor: ${item.status === "highlighted" ? "pointer" : "default"};
      position: relative;
      ${isSelected ? `box-shadow: 0 0 0 3px ${colors.background.secondary};` : ""}
    `;

		// Add tooltip for highlighted items
		if (item.status === "highlighted") {
			nuggetDiv.title = "Click to scroll to this content on the page";
		}

		// Click handler for scrolling to highlight (not selection)
		nuggetDiv.addEventListener("click", (e) => {
			// Only handle highlighting if not clicking on checkbox
			if ((e.target as Element).tagName !== "INPUT") {
				// If highlighted, scroll to highlight and mark as visited
				if (item.status === "highlighted" && this.highlighter) {
					this.highlighter.scrollToHighlight(item.nugget);
					// Mark this highlighted item as visited
					this.allItems[globalIndex].highlightVisited = true;
					// Remove the highlight indicator immediately
					const highlightIndicator = nuggetDiv.querySelector(
						".highlight-indicator",
					);
					if (highlightIndicator) {
						highlightIndicator.remove();
					}
				}
			}
		});

		// Hover effects - show selection hint
		nuggetDiv.addEventListener("mouseenter", () => {
			if (!isSelected) {
				nuggetDiv.style.backgroundColor = colors.background.secondary;
				nuggetDiv.style.borderColor = colors.border.medium;
				nuggetDiv.style.boxShadow = `0 0 0 1px ${colors.border.default}`;
			}
		});

		nuggetDiv.addEventListener("mouseleave", () => {
			if (!isSelected) {
				nuggetDiv.style.backgroundColor = colors.white;
				nuggetDiv.style.borderColor = colors.border.light;
				nuggetDiv.style.boxShadow = "none";
			}
		});

		// Content structure
		const contentContainer = document.createElement("div");
		contentContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: ${spacing.sm};
      flex: 1;
      min-width: 0;
    `;

		// Header with checkbox, type badge and selection indicator
		const headerDiv = document.createElement("div");
		headerDiv.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;

		// Left side container for checkbox and type badge
		const leftContainer = document.createElement("div");
		leftContainer.style.cssText = `
      display: flex;
      align-items: center;
      gap: ${spacing.sm};
    `;

		// Checkbox for multi-selection
		const checkbox = document.createElement("input");
		checkbox.type = "checkbox";
		checkbox.checked = isSelected;
		checkbox.style.cssText = `
      width: 16px;
      height: 16px;
      margin: 0;
      accent-color: ${colors.text.accent};
      cursor: pointer;
      border-radius: ${borderRadius.sm};
      flex-shrink: 0;
    `;

		// Checkbox click handler
		checkbox.addEventListener("change", (e) => {
			e.stopPropagation();
			this.toggleItemSelection(globalIndex);
		});

		// Type badge - more subtle, no emoji
		const typeBadge = document.createElement("span");
		typeBadge.textContent = item.nugget.type;
		typeBadge.style.cssText = `
      background: ${colors.background.tertiary};
      color: ${colors.text.secondary};
      padding: ${spacing.xs} ${spacing.sm};
      border-radius: ${borderRadius.sm};
      font-size: ${typography.fontSize.xs};
      font-weight: ${typography.fontWeight.medium};
      text-transform: uppercase;
      letter-spacing: 0.5px;
    `;

		leftContainer.appendChild(checkbox);
		leftContainer.appendChild(typeBadge);

		// Consensus display for ensemble results - cleaner design
		const ensembleNugget = item.nugget as EnhancedGoldenNugget;
		if (
			ensembleNugget.confidence !== undefined &&
			ensembleNugget.runsSupportingThis !== undefined &&
			ensembleNugget.totalRuns !== undefined
		) {
			const consensusContainer = document.createElement("div");
			consensusContainer.style.cssText = `
        display: flex;
        align-items: center;
        gap: ${spacing.xs};
        margin-left: ${spacing.sm};
      `;

			// Calculate consensus percentage
			const consensusPercent = Math.round(
				(ensembleNugget.runsSupportingThis / ensembleNugget.totalRuns) * 100,
			);

			// Determine badge styling based on consensus level using neutral colors
			let badgeColor = colors.background.tertiary;
			let textColor = colors.text.secondary;

			if (consensusPercent >= 80) {
				// High consensus - darker background for emphasis
				badgeColor = colors.gray[100];
				textColor = colors.text.primary;
			} else if (consensusPercent >= 50) {
				// Medium consensus - medium background
				badgeColor = colors.background.tertiary;
				textColor = colors.text.secondary;
			} else {
				// Low consensus - lighter, more subtle
				badgeColor = colors.gray[50];
				textColor = colors.text.tertiary;
			}

			// Consensus badge with percentage
			const consensusBadge = document.createElement("div");
			consensusBadge.textContent = `${consensusPercent}%`;
			consensusBadge.style.cssText = `
        background: ${badgeColor};
        color: ${textColor};
        padding: ${spacing.xs} ${spacing.sm};
        border-radius: ${borderRadius.sm};
        font-size: ${typography.fontSize.xs};
        font-weight: ${typography.fontWeight.medium};
        min-width: 36px;
        text-align: center;
        border: 1px solid ${colors.border.light};
      `;

			// Agreement detail text - more concise
			const agreementText = document.createElement("div");
			agreementText.textContent = `${ensembleNugget.runsSupportingThis}/${ensembleNugget.totalRuns}`;
			agreementText.style.cssText = `
        font-size: ${typography.fontSize.xs};
        color: ${colors.text.secondary};
        font-weight: ${typography.fontWeight.medium};
      `;

			consensusContainer.appendChild(consensusBadge);
			consensusContainer.appendChild(agreementText);
			leftContainer.appendChild(consensusContainer);
		}

		// Selection indicator and status
		const statusContainer = document.createElement("div");
		statusContainer.style.cssText = `
      display: flex;
      align-items: center;
      gap: ${spacing.xs};
    `;

		// Highlighted indicator (yellow dot) - only show if not visited
		if (item.status === "highlighted" && !item.highlightVisited) {
			const highlightIndicator = document.createElement("div");
			highlightIndicator.className = "highlight-indicator";
			highlightIndicator.style.cssText = `
        width: 6px;
        height: 6px;
        background: ${colors.highlight.border};
        border-radius: 50%;
        opacity: 0.8;
      `;
			statusContainer.appendChild(highlightIndicator);
		}

		headerDiv.appendChild(leftContainer);
		headerDiv.appendChild(statusContainer);

		// Content preview - cleaner presentation
		const contentPreview = document.createElement("div");
		contentPreview.style.cssText = `
      font-size: ${typography.fontSize.sm};
      line-height: ${typography.lineHeight.normal};
      color: ${colors.text.primary};
    `;

		const maxLength = 200;
		const contentInfo = this.getTruncatedContent(item.nugget, maxLength);

		if (contentInfo.isTruncated) {
			const textSpan = document.createElement("span");
			textSpan.textContent = `${contentInfo.content}…`;

			const expandButton = document.createElement("button");
			expandButton.textContent = "Show more";
			expandButton.style.cssText = `
        background: none;
        border: none;
        color: ${colors.text.accent};
        cursor: pointer;
        font-size: ${typography.fontSize.xs};
        font-weight: ${typography.fontWeight.medium};
        margin-left: ${spacing.xs};
        padding: 0;
        text-decoration: underline;
        text-underline-offset: 2px;
      `;

			let isExpanded = false;
			expandButton.addEventListener("click", (e) => {
				e.stopPropagation();
				isExpanded = !isExpanded;

				if (isExpanded) {
					textSpan.textContent = contentInfo.fullContent;
					expandButton.textContent = "Show less";
				} else {
					textSpan.textContent = `${contentInfo.content}…`;
					expandButton.textContent = "Show more";
				}
			});

			contentPreview.appendChild(textSpan);
			contentPreview.appendChild(expandButton);
		} else {
			contentPreview.textContent = contentInfo.fullContent;
		}

		// Feedback Section
		const feedbackSection = this.createFeedbackSection(item, globalIndex);

		// Assemble the content
		contentContainer.appendChild(headerDiv);
		contentContainer.appendChild(contentPreview);

		contentContainer.appendChild(feedbackSection);

		nuggetDiv.appendChild(contentContainer);

		return nuggetDiv;
	}

	private createFeedbackSection(
		item: SidebarNuggetItem,
		globalIndex: number,
	): HTMLElement {
		const feedbackSection = document.createElement("div");
		feedbackSection.className = "nugget-feedback-section";
		feedbackSection.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: ${spacing.sm};
      padding-top: ${spacing.sm};
      border-top: 1px solid ${colors.border.light};
    `;

		// Feedback buttons row
		const feedbackButtons = document.createElement("div");
		feedbackButtons.style.cssText = `
      display: flex;
      align-items: center;
      gap: ${spacing.sm};
      justify-content: space-between;
    `;

		// Thumbs up/down buttons container
		const ratingContainer = document.createElement("div");
		ratingContainer.style.cssText = `
      display: flex;
      align-items: center;
      gap: ${spacing.xs};
    `;

		const thumbsUpBtn = this.createFeedbackButton(
			"thumbs-up",
			'<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-thumbs-up-icon lucide-thumbs-up"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/></svg>',
			item.feedback?.rating === "positive",
			async () => await this.handleFeedbackRating(globalIndex, "positive"),
		);

		const thumbsDownBtn = this.createFeedbackButton(
			"thumbs-down",
			'<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-thumbs-down-icon lucide-thumbs-down"><path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/></svg>',
			item.feedback?.rating === "negative",
			async () => await this.handleFeedbackRating(globalIndex, "negative"),
		);

		ratingContainer.appendChild(thumbsUpBtn);
		ratingContainer.appendChild(thumbsDownBtn);

		// Right side container for type correction and reset button
		const rightContainer = document.createElement("div");
		rightContainer.style.cssText = `
      display: flex;
      align-items: center;
      gap: ${spacing.xs};
    `;

		// Type correction dropdown
		const typeCorrection = this.createTypeCorrection(item, globalIndex);
		rightContainer.appendChild(typeCorrection);

		// Reset button (only show when feedback exists)
		if (item.feedback) {
			const resetBtn = this.createResetButton(globalIndex);
			rightContainer.appendChild(resetBtn);
		}

		feedbackButtons.appendChild(ratingContainer);
		feedbackButtons.appendChild(rightContainer);

		feedbackSection.appendChild(feedbackButtons);

		return feedbackSection;
	}

	private createFeedbackButton(
		type: string,
		iconSvg: string,
		isActive: boolean,
		onClick: () => void,
	): HTMLElement {
		const button = document.createElement("button");
		button.className = `feedback-btn-${type}`;
		button.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border: 1px solid ${isActive ? colors.text.accent : colors.border.light};
      border-radius: ${borderRadius.sm};
      background: ${isActive ? colors.text.accent : colors.background.primary};
      color: ${isActive ? colors.white : colors.text.secondary};
      cursor: pointer;
      transition: all 0.2s ease;
      padding: 0;
    `;

		button.innerHTML = iconSvg;
		button.title =
			type === "thumbs-up"
				? "Mark as correctly identified golden nugget"
				: "Mark as incorrectly identified (not a golden nugget)";

		button.addEventListener("click", (e) => {
			e.stopPropagation();
			onClick();
		});

		button.addEventListener("mouseenter", () => {
			if (!isActive) {
				button.style.borderColor = colors.border.medium;
				button.style.backgroundColor = colors.background.secondary;
			}
		});

		button.addEventListener("mouseleave", () => {
			if (!isActive) {
				button.style.borderColor = colors.border.light;
				button.style.backgroundColor = colors.background.primary;
			}
		});

		return button;
	}

	private createResetButton(globalIndex: number): HTMLElement {
		const button = document.createElement("button");
		button.className = "feedback-reset-btn";
		button.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border: 1px solid ${colors.border.light};
      border-radius: ${borderRadius.sm};
      background: ${colors.background.primary};
      color: ${colors.text.secondary};
      cursor: pointer;
      transition: all 0.2s ease;
      padding: 0;
      font-size: ${typography.fontSize.sm};
      font-weight: ${typography.fontWeight.medium};
    `;

		button.innerHTML = "×";
		button.title = "Reset feedback - removes rating and type correction";

		button.addEventListener("click", (e) => {
			e.stopPropagation();
			this.handleFeedbackReset(globalIndex);
		});

		button.addEventListener("mouseenter", () => {
			button.style.borderColor = colors.border.medium;
			button.style.backgroundColor = colors.background.secondary;
			button.style.color = colors.text.primary;
		});

		button.addEventListener("mouseleave", () => {
			button.style.borderColor = colors.border.light;
			button.style.backgroundColor = colors.background.primary;
			button.style.color = colors.text.secondary;
		});

		return button;
	}

	private createTypeCorrection(
		item: SidebarNuggetItem,
		globalIndex: number,
	): HTMLElement {
		const container = document.createElement("div");
		container.style.cssText = `
      display: flex;
      align-items: center;
      gap: ${spacing.xs};
    `;

		const label = document.createElement("span");
		label.textContent = "Type:";
		label.style.cssText = `
      font-size: ${typography.fontSize.xs};
      color: ${colors.text.secondary};
      font-weight: ${typography.fontWeight.medium};
    `;

		const select = document.createElement("select");
		select.style.cssText = `
      padding: ${spacing.xs} ${spacing.sm};
      border: 1px solid ${colors.border.light};
      border-radius: ${borderRadius.sm};
      background: ${colors.background.primary};
      color: ${colors.text.primary};
      font-size: ${typography.fontSize.xs};
      cursor: pointer;
      outline: none;
    `;

		// Add options
		ALL_NUGGET_TYPES.forEach((type) => {
			const option = document.createElement("option");
			option.value = type;
			option.textContent = type;
			option.selected =
				(item.feedback?.correctedType || item.nugget.type) === type;
			select.appendChild(option);
		});

		// Handle type change
		select.addEventListener("change", async (e) => {
			const newType = (e.target as HTMLSelectElement).value as GoldenNuggetType;
			await this.handleTypeCorrection(globalIndex, newType);
		});

		select.addEventListener("focus", () => {
			select.style.borderColor = colors.border.medium;
		});

		select.addEventListener("blur", () => {
			select.style.borderColor = colors.border.light;
		});

		container.appendChild(label);
		container.appendChild(select);

		return container;
	}

	private async handleFeedbackRating(
		globalIndex: number,
		rating: FeedbackRating,
	): Promise<void> {
		// Defensive bounds checking
		if (globalIndex < 0 || globalIndex >= this.allItems.length) {
			console.error(
				`[Sidebar] handleFeedbackRating: Invalid globalIndex ${globalIndex}. Array length: ${this.allItems.length}, currentPage: ${this.currentPage}, itemsPerPage: ${this.itemsPerPage}`,
			);
			return;
		}

		const item = this.allItems[globalIndex];
		if (!item) {
			console.error(
				`[Sidebar] handleFeedbackRating: Item at globalIndex ${globalIndex} is undefined`,
			);
			return;
		}

		// Get the provider info that was used for the analysis
		const result = await chrome.storage.local.get(["lastUsedProvider"]);
		const lastUsedProvider = result.lastUsedProvider;

		// Create or update feedback
		const feedbackId = `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
		const nuggetContent = this.getFeedbackContent(item.nugget);
		const context = `${document.title} - ${window.location.href}`;

		const feedback: NuggetFeedback = {
			id: feedbackId,
			nuggetContent: nuggetContent,
			originalType: item.nugget.type,
			correctedType: item.feedback?.correctedType || item.nugget.type,
			rating: rating,
			timestamp: Date.now(),
			url: window.location.href,
			context: context.substring(0, 200),
			// Add provider/model data from the analysis that generated this nugget
			modelProvider: lastUsedProvider?.providerId || "gemini",
			modelName: lastUsedProvider?.modelName || "gemini-2.5-flash",
			// TODO: Prompt metadata should come from the analysis that generated this nugget
			// For now, using placeholder values to satisfy type requirements
			prompt: {
				id: "unknown",
				content: "",
				type: "default",
				name: "Unknown Prompt",
			},
		};

		// Update the item
		this.allItems[globalIndex].feedback = feedback;

		// Send to background script for processing
		chrome.runtime.sendMessage({
			type: MESSAGE_TYPES.SUBMIT_NUGGET_FEEDBACK,
			feedback: feedback,
		});

		// Refresh the UI to show the new state
		this.refreshCurrentPage();
	}

	private async handleTypeCorrection(
		globalIndex: number,
		newType: GoldenNuggetType,
	): Promise<void> {
		// Defensive bounds checking
		if (globalIndex < 0 || globalIndex >= this.allItems.length) {
			console.error(
				`[Sidebar] handleTypeCorrection: Invalid globalIndex ${globalIndex}. Array length: ${this.allItems.length}, currentPage: ${this.currentPage}, itemsPerPage: ${this.itemsPerPage}`,
			);
			return;
		}

		const item = this.allItems[globalIndex];
		if (!item) {
			console.error(
				`[Sidebar] handleTypeCorrection: Item at globalIndex ${globalIndex} is undefined`,
			);
			return;
		}

		// Get the provider info that was used for the analysis
		const result = await chrome.storage.local.get(["lastUsedProvider"]);
		const lastUsedProvider = result.lastUsedProvider;

		// Create feedback if it doesn't exist, or update existing
		if (!item.feedback) {
			const feedbackId = `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
			const nuggetContent = this.getFeedbackContent(item.nugget);
			const context = `${document.title} - ${window.location.href}`;

			item.feedback = {
				id: feedbackId,
				nuggetContent: nuggetContent,
				originalType: item.nugget.type,
				rating: "positive", // Default to positive since they're correcting the type
				timestamp: Date.now(),
				url: window.location.href,
				context: context.substring(0, 200),
				// Add provider/model data from the analysis that generated this nugget
				modelProvider: lastUsedProvider?.providerId || "gemini",
				modelName: lastUsedProvider?.modelName || "gemini-2.5-flash",
				// TODO: Prompt metadata should come from the analysis that generated this nugget
				prompt: {
					id: "unknown",
					content: "",
					type: "default",
					name: "Unknown Prompt",
				},
			};
		}

		// Update the corrected type
		item.feedback.correctedType = newType;

		// Send to background script
		chrome.runtime.sendMessage({
			type: MESSAGE_TYPES.SUBMIT_NUGGET_FEEDBACK,
			feedback: item.feedback,
		});
	}

	private handleFeedbackReset(globalIndex: number): void {
		// Defensive bounds checking
		if (globalIndex < 0 || globalIndex >= this.allItems.length) {
			console.error(
				`[Sidebar] handleFeedbackReset: Invalid globalIndex ${globalIndex}. Array length: ${this.allItems.length}, currentPage: ${this.currentPage}, itemsPerPage: ${this.itemsPerPage}`,
			);
			return;
		}

		const item = this.allItems[globalIndex];
		if (!item?.feedback) {
			if (!item) {
				console.error(
					`[Sidebar] handleFeedbackReset: Item at globalIndex ${globalIndex} is undefined`,
				);
			}
			return;
		}

		this.showResetConfirmation(() => {
			// Send deletion message to backend
			chrome.runtime.sendMessage({
				type: MESSAGE_TYPES.DELETE_NUGGET_FEEDBACK,
				feedbackId: item.feedback?.id,
			});

			// Clear local feedback
			delete this.allItems[globalIndex].feedback;
			this.refreshCurrentPage();
		});
	}

	private showResetConfirmation(onConfirm: () => void): void {
		// Create modal overlay
		const overlay = document.createElement("div");
		overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: ${colors.background.modalOverlay};
      z-index: ${zIndex.modal + 1};
      display: flex;
      align-items: center;
      justify-content: center;
    `;

		// Create modal content
		const modal = document.createElement("div");
		modal.style.cssText = `
      background: ${colors.white};
      border-radius: ${borderRadius.lg};
      box-shadow: ${shadows.lg};
      padding: ${spacing["2xl"]};
      max-width: 400px;
      width: 90%;
      margin: ${spacing.md};
    `;

		// Modal title
		const title = document.createElement("h3");
		title.textContent = "Reset Feedback";
		title.style.cssText = `
      margin: 0 0 ${spacing.md} 0;
      font-size: ${typography.fontSize.lg};
      font-weight: ${typography.fontWeight.semibold};
      color: ${colors.text.primary};
    `;

		// Modal description
		const description = document.createElement("p");
		description.textContent =
			"Are you sure you want to reset your feedback for this nugget? This will delete your rating and type correction from the system.";
		description.style.cssText = `
      margin: 0 0 ${spacing.lg} 0;
      font-size: ${typography.fontSize.sm};
      line-height: ${typography.lineHeight.normal};
      color: ${colors.text.secondary};
    `;

		// Button container
		const buttonContainer = document.createElement("div");
		buttonContainer.style.cssText = `
      display: flex;
      gap: ${spacing.sm};
      justify-content: flex-end;
    `;

		// Cancel button
		const cancelBtn = document.createElement("button");
		cancelBtn.textContent = "Cancel";
		cancelBtn.style.cssText = `
      padding: ${spacing.xs} ${spacing.md};
      border: 1px solid ${colors.border.light};
      border-radius: ${borderRadius.sm};
      background: ${colors.background.primary};
      color: ${colors.text.primary};
      font-size: ${typography.fontSize.sm};
      font-weight: ${typography.fontWeight.medium};
      cursor: pointer;
      transition: all 0.2s ease;
    `;

		// Reset button
		const resetBtn = document.createElement("button");
		resetBtn.textContent = "Reset Feedback";
		resetBtn.style.cssText = `
      padding: ${spacing.xs} ${spacing.md};
      border: 1px solid ${colors.text.accent};
      border-radius: ${borderRadius.sm};
      background: ${colors.text.accent};
      color: ${colors.white};
      font-size: ${typography.fontSize.sm};
      font-weight: ${typography.fontWeight.medium};
      cursor: pointer;
      transition: all 0.2s ease;
    `;

		// Event handlers
		const closeModal = () => {
			overlay.remove();
		};

		cancelBtn.addEventListener("click", closeModal);
		overlay.addEventListener("click", (e) => {
			if (e.target === overlay) closeModal();
		});

		resetBtn.addEventListener("click", () => {
			onConfirm();
			closeModal();
		});

		// Hover effects
		cancelBtn.addEventListener("mouseenter", () => {
			cancelBtn.style.backgroundColor = colors.background.secondary;
		});
		cancelBtn.addEventListener("mouseleave", () => {
			cancelBtn.style.backgroundColor = colors.background.primary;
		});

		resetBtn.addEventListener("mouseenter", () => {
			resetBtn.style.backgroundColor = colors.text.primary;
		});
		resetBtn.addEventListener("mouseleave", () => {
			resetBtn.style.backgroundColor = colors.text.accent;
		});

		// Assemble modal
		buttonContainer.appendChild(cancelBtn);
		buttonContainer.appendChild(resetBtn);

		modal.appendChild(title);
		modal.appendChild(description);
		modal.appendChild(buttonContainer);

		overlay.appendChild(modal);
		document.body.appendChild(overlay);

		// Focus reset button for accessibility
		resetBtn.focus();
	}

	private enterMissingContentMode(): void {
		// Hide the action menu first
		this.hideActionMenu();

		// Send message to content script to enter missing content selection mode
		chrome.runtime.sendMessage({
			type: MESSAGE_TYPES.ENTER_MISSING_CONTENT_MODE,
		});
	}

	private adjustPageLayout(showSidebar: boolean): void {
		if (showSidebar) {
			// Add margin to prevent content from being hidden behind sidebar
			document.body.style.marginRight = this.isCollapsed
				? "40px"
				: ui.sidebarWidth;
			document.body.style.transition = "margin-right 0.3s ease";
		} else {
			// Remove margin completely when sidebar is hidden
			document.body.style.marginRight = "";
			document.body.style.transition = "margin-right 0.3s ease";
		}
	}

	private toggleItemSelection(globalIndex: number): void {
		if (globalIndex >= 0 && globalIndex < this.allItems.length) {
			this.allItems[globalIndex].selected =
				!this.allItems[globalIndex].selected;

			if (this.allItems[globalIndex].selected) {
				this.selectedItems.add(globalIndex);
			} else {
				this.selectedItems.delete(globalIndex);
			}

			this.updateSelectedCount();
			this.refreshCurrentPage(); // Re-render to show visual changes
		}
	}

	private selectAllItems(): void {
		this.allItems.forEach((item, index) => {
			item.selected = true;
			this.selectedItems.add(index);
		});
		this.updateSelectedCount();
		this.refreshCurrentPage();
	}

	private clearAllSelections(): void {
		this.allItems.forEach((item, index) => {
			item.selected = false;
			this.selectedItems.delete(index);
		});
		this.updateSelectedCount();
		this.refreshCurrentPage();
	}

	private refreshCurrentPage(): void {
		if (this.sidebar) {
			const container = this.sidebar.querySelector("#nugget-list-container");
			if (container) {
				// Store the current scroll position
				const scrollTop = this.sidebar.scrollTop;

				this.renderCurrentPage(container as HTMLElement);

				// Restore the scroll position after rendering
				this.sidebar.scrollTop = scrollTop;
			}
		}
	}

	private updateSelectedCount(): void {
		// Update selected count in REST endpoint panel
		if (this.restEndpointPanel) {
			const selectedCountSpan =
				this.restEndpointPanel.querySelector(".selected-count");
			if (selectedCountSpan) {
				selectedCountSpan.textContent = this.selectedItems.size.toString();
			}
		}
	}

	private createActionMenu(): HTMLElement {
		const menu = document.createElement("div");
		menu.style.cssText = `
      position: fixed;
      top: 80px;
      right: 340px;
      background: ${colors.white};
      border: 1px solid ${colors.border.light};
      border-radius: ${borderRadius.lg};
      box-shadow: ${shadows.lg};
      padding: ${spacing.sm};
      z-index: ${zIndex.modal};
      display: none;
      flex-direction: column;
      gap: ${spacing.xs};
      min-width: 200px;
    `;

		// Create menu items
		const menuItems = [
			{
				icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
				label: "Select All",
				action: () => this.selectAllItems(),
			},
			{
				icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>',
				label: "Clear Selection",
				action: () => this.clearAllSelections(),
			},
			{
				icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>',
				label: "Mark Missing Content",
				action: () => this.enterMissingContentMode(),
			},
			{
				icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
				label: "Export as Markdown",
				action: () => this.exportNuggets(this.getExportItems(), "markdown"),
			},
			{
				icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
				label: "Export as JSON",
				action: () => this.exportNuggets(this.getExportItems(), "json"),
			},
		];

		menuItems.forEach((item) => {
			const menuItem = document.createElement("button");
			menuItem.innerHTML = `${item.icon} <span>${item.label}</span>`;
			menuItem.style.cssText = `
        display: flex;
        align-items: center;
        gap: ${spacing.sm};
        padding: ${spacing.sm} ${spacing.md};
        border: none;
        background: none;
        border-radius: ${borderRadius.md};
        cursor: pointer;
        font-size: ${typography.fontSize.sm};
        color: ${colors.text.primary};
        text-align: left;
        transition: background-color 0.15s ease;
        width: 100%;
      `;

			menuItem.addEventListener("click", () => {
				item.action();
				this.hideActionMenu();
			});

			menuItem.addEventListener("mouseenter", () => {
				menuItem.style.backgroundColor = colors.background.secondary;
			});

			menuItem.addEventListener("mouseleave", () => {
				menuItem.style.backgroundColor = "transparent";
			});

			menu.appendChild(menuItem);
		});

		// Close menu when clicking outside
		document.addEventListener("click", (e) => {
			if (!menu.contains(e.target as Node) && this.actionMenuVisible) {
				this.hideActionMenu();
			}
		});

		return menu;
	}

	private toggleActionMenu(): void {
		if (this.actionMenuVisible) {
			this.hideActionMenu();
		} else {
			this.showActionMenu();
		}
	}

	private showActionMenu(): void {
		if (this.actionMenu) {
			this.actionMenu.style.display = "flex";
			this.actionMenuVisible = true;
		}
	}

	private hideActionMenu(): void {
		if (this.actionMenu) {
			this.actionMenu.style.display = "none";
			this.actionMenuVisible = false;
		}
	}

	private getExportItems(): SidebarNuggetItem[] {
		const selectedCount = this.selectedItems.size;
		if (selectedCount > 0) {
			return this.allItems.filter((item) => item.selected);
		}
		return this.allItems;
	}

	private async exportNuggets(
		nuggets: SidebarNuggetItem[],
		format: "markdown" | "json",
	): Promise<void> {
		const url = window.location.href;

		const exportData = {
			url,
			nuggets: nuggets.map((item) => {
				const nugget: ExportNuggetData = {
					type: item.nugget.type,
					startContent: item.nugget.startContent,
					endContent: item.nugget.endContent,
				};

				return nugget;
			}),
		};

		let content: string;
		let filename: string;

		if (format === "json") {
			content = JSON.stringify(exportData, null, 2);
			filename = `golden-nuggets-${this.getDomainFromUrl(url)}-${new Date().toISOString().split("T")[0]}.json`;
		} else {
			content = this.generateMarkdownContent(exportData);
			filename = `golden-nuggets-${this.getDomainFromUrl(url)}-${new Date().toISOString().split("T")[0]}.md`;
		}

		this.downloadFile(content, filename);
	}

	private generateMarkdownContent(data: ExportData): string {
		return `# Golden Nuggets

**URL:** ${data.url}

${data.nuggets
	.map(
		(nugget: ExportNuggetData) => `
## ${nugget.type.toUpperCase()}

**Content:**
${nugget.startContent}...${nugget.endContent}

---
`,
	)
	.join("\n")}`;
	}

	private getDomainFromUrl(url: string): string {
		try {
			return new URL(url).hostname.replace("www.", "");
		} catch {
			return "unknown-site";
		}
	}

	private downloadFile(content: string, filename: string): void {
		const blob = new Blob([content], { type: "text/plain" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	private createRestEndpointPanel(): HTMLElement {
		const panel = document.createElement("div");
		panel.style.cssText = `
      border-top: 1px solid ${colors.border.light};
      background: ${colors.background.primary};
      position: sticky;
      bottom: 0;
      z-index: 1;
    `;

		// REST endpoint title (clickable header)
		const titleContainer = document.createElement("div");
		titleContainer.style.cssText = `
      padding: ${spacing.md} ${spacing.lg};
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: ${spacing.xs};
      user-select: none;
      transition: background-color 0.2s ease;
    `;

		const titleText = document.createElement("span");
		titleText.textContent = "Send to Endpoint";
		titleText.style.cssText = `
      font-size: ${typography.fontSize.sm};
      font-weight: ${typography.fontWeight.medium};
      color: ${colors.text.primary};
    `;

		const toggleIcon = document.createElement("span");
		toggleIcon.innerHTML =
			'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>';
		toggleIcon.style.cssText = `
      font-size: ${typography.fontSize.xs};
      color: ${colors.text.secondary};
      transition: transform 0.2s ease;
    `;

		titleContainer.appendChild(titleText);
		titleContainer.appendChild(toggleIcon);

		// REST endpoint options container (initially hidden)
		const optionsContainer = document.createElement("div");
		optionsContainer.style.cssText = `
      display: none;
      flex-direction: column;
      gap: ${spacing.sm};
      padding: 0 ${spacing.lg} ${spacing.lg} ${spacing.lg};
      transition: all 0.2s ease;
    `;

		// Add click handler for collapse/expand
		titleContainer.addEventListener("click", () => {
			this.toggleRestEndpointPanel(optionsContainer, toggleIcon);
		});

		// Hover effect for title
		titleContainer.addEventListener("mouseenter", () => {
			titleContainer.style.backgroundColor = colors.background.secondary;
		});

		titleContainer.addEventListener("mouseleave", () => {
			titleContainer.style.backgroundColor = "transparent";
		});

		// URL input
		const urlRow = document.createElement("div");
		urlRow.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: ${spacing.xs};
    `;

		const urlLabel = document.createElement("label");
		urlLabel.textContent = "URL:";
		urlLabel.style.cssText = `
      font-size: ${typography.fontSize.xs};
      color: ${colors.text.secondary};
      font-weight: ${typography.fontWeight.medium};
    `;

		const urlInput = document.createElement("input");
		urlInput.type = "url";
		urlInput.placeholder = "https://api.example.com/nuggets";
		urlInput.value = this.restEndpointConfig.url;
		urlInput.style.cssText = `
      padding: ${spacing.xs} ${spacing.sm};
      border: 1px solid ${colors.border.light};
      border-radius: ${borderRadius.sm};
      font-size: ${typography.fontSize.sm};
      background: ${colors.background.primary};
      color: ${colors.text.primary};
      outline: none;
      transition: border-color 0.2s ease;
    `;

		urlInput.addEventListener("focus", () => {
			urlInput.style.borderColor = colors.border.medium;
		});

		urlInput.addEventListener("blur", () => {
			urlInput.style.borderColor = colors.border.light;
		});

		urlInput.addEventListener("input", (e) => {
			this.restEndpointConfig.url = (e.target as HTMLInputElement).value;
		});

		urlRow.appendChild(urlLabel);
		urlRow.appendChild(urlInput);

		// Method and Content-Type row
		const methodContentRow = document.createElement("div");
		methodContentRow.style.cssText = `
      display: flex;
      gap: ${spacing.sm};
    `;

		const methodContainer = document.createElement("div");
		methodContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: ${spacing.xs};
      flex: 1;
    `;

		const methodLabel = document.createElement("label");
		methodLabel.textContent = "Method:";
		methodLabel.style.cssText = `
      font-size: ${typography.fontSize.xs};
      color: ${colors.text.secondary};
      font-weight: ${typography.fontWeight.medium};
    `;

		const methodSelect = document.createElement("select");
		methodSelect.style.cssText = `
      padding: ${spacing.xs} ${spacing.sm};
      border: 1px solid ${colors.border.light};
      border-radius: ${borderRadius.sm};
      font-size: ${typography.fontSize.sm};
      background: ${colors.background.primary};
      color: ${colors.text.primary};
      outline: none;
      cursor: pointer;
    `;

		const methodOptions = ["POST", "PUT", "PATCH"];
		methodOptions.forEach((method) => {
			const option = document.createElement("option");
			option.value = method;
			option.textContent = method;
			option.selected = method === this.restEndpointConfig.method;
			methodSelect.appendChild(option);
		});

		methodSelect.addEventListener("change", (e) => {
			this.restEndpointConfig.method = (e.target as HTMLSelectElement).value;
		});

		methodContainer.appendChild(methodLabel);
		methodContainer.appendChild(methodSelect);

		const contentTypeContainer = document.createElement("div");
		contentTypeContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: ${spacing.xs};
      flex: 1;
    `;

		const contentTypeLabel = document.createElement("label");
		contentTypeLabel.textContent = "Content-Type:";
		contentTypeLabel.style.cssText = `
      font-size: ${typography.fontSize.xs};
      color: ${colors.text.secondary};
      font-weight: ${typography.fontWeight.medium};
    `;

		const contentTypeSelect = document.createElement("select");
		contentTypeSelect.style.cssText = `
      padding: ${spacing.xs} ${spacing.sm};
      border: 1px solid ${colors.border.light};
      border-radius: ${borderRadius.sm};
      font-size: ${typography.fontSize.sm};
      background: ${colors.background.primary};
      color: ${colors.text.primary};
      outline: none;
      cursor: pointer;
    `;

		const contentTypeOptions = [
			"application/json",
			"application/xml",
			"application/x-www-form-urlencoded",
		];
		contentTypeOptions.forEach((contentType) => {
			const option = document.createElement("option");
			option.value = contentType;
			option.textContent = contentType;
			option.selected = contentType === this.restEndpointConfig.contentType;
			contentTypeSelect.appendChild(option);
		});

		contentTypeSelect.addEventListener("change", (e) => {
			this.restEndpointConfig.contentType = (
				e.target as HTMLSelectElement
			).value;
		});

		contentTypeContainer.appendChild(contentTypeLabel);
		contentTypeContainer.appendChild(contentTypeSelect);

		methodContentRow.appendChild(methodContainer);
		methodContentRow.appendChild(contentTypeContainer);

		// Headers section
		const headersRow = document.createElement("div");
		headersRow.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: ${spacing.xs};
    `;

		const headersLabel = document.createElement("label");
		headersLabel.textContent = "Headers:";
		headersLabel.style.cssText = `
      font-size: ${typography.fontSize.xs};
      color: ${colors.text.secondary};
      font-weight: ${typography.fontWeight.medium};
    `;

		const headersContainer = document.createElement("div");
		headersContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: ${spacing.xs};
    `;

		const addHeaderBtn = document.createElement("button");
		addHeaderBtn.textContent = "+ Add Header";
		addHeaderBtn.style.cssText = `
      padding: ${spacing.xs} ${spacing.sm};
      border: 1px solid ${colors.border.light};
      border-radius: ${borderRadius.sm};
      background: ${colors.background.secondary};
      color: ${colors.text.primary};
      font-size: ${typography.fontSize.xs};
      cursor: pointer;
      transition: all 0.2s ease;
    `;

		addHeaderBtn.addEventListener("mouseenter", () => {
			addHeaderBtn.style.backgroundColor = colors.background.tertiary;
		});

		addHeaderBtn.addEventListener("mouseleave", () => {
			addHeaderBtn.style.backgroundColor = colors.background.secondary;
		});

		addHeaderBtn.addEventListener("click", () => {
			this.addHeaderRow(headersContainer);
		});

		headersRow.appendChild(headersLabel);
		headersRow.appendChild(headersContainer);
		headersRow.appendChild(addHeaderBtn);

		// Scope selection
		const scopeRow = document.createElement("div");
		scopeRow.style.cssText = `
      display: flex;
      gap: ${spacing.sm};
      align-items: center;
    `;

		const scopeLabel = document.createElement("span");
		scopeLabel.textContent = "Scope:";
		scopeLabel.style.cssText = `
      font-size: ${typography.fontSize.xs};
      color: ${colors.text.secondary};
      min-width: 50px;
    `;

		const allBtn = this.createRestScopeButton(
			"all",
			`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg> All (${this.allItems.length})`,
		);
		const selectedBtn = this.createRestScopeButton(
			"selected",
			`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Selected (<span class="selected-count">0</span>)`,
		);

		scopeRow.appendChild(scopeLabel);
		scopeRow.appendChild(allBtn);
		scopeRow.appendChild(selectedBtn);

		// Include section
		const includeSection = document.createElement("div");
		includeSection.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: ${spacing.xs};
    `;

		const includeLabel = document.createElement("label");
		includeLabel.textContent = "Include in Request Body:";
		includeLabel.style.cssText = `
      font-size: ${typography.fontSize.xs};
      color: ${colors.text.secondary};
      font-weight: ${typography.fontWeight.medium};
    `;

		const includeOptions = document.createElement("div");
		includeOptions.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: ${spacing.xs};
      padding-left: ${spacing.sm};
    `;

		// URL checkbox
		const urlCheckbox = this.createCheckbox(
			"includeUrl",
			"URL",
			this.restEndpointConfig.includeUrl,
		);
		const urlCheckboxInput = urlCheckbox.querySelector(
			"input",
		) as HTMLInputElement;
		urlCheckboxInput.addEventListener("change", (e) => {
			this.restEndpointConfig.includeUrl = (
				e.target as HTMLInputElement
			).checked;
		});

		// Timestamp checkbox
		const timestampCheckbox = this.createCheckbox(
			"includeTimestamp",
			"Timestamp",
			this.restEndpointConfig.includeTimestamp,
		);
		const timestampCheckboxInput = timestampCheckbox.querySelector(
			"input",
		) as HTMLInputElement;
		timestampCheckboxInput.addEventListener("change", (e) => {
			this.restEndpointConfig.includeTimestamp = (
				e.target as HTMLInputElement
			).checked;
		});

		// Nuggets checkbox with sub-options
		const nuggetContainer = document.createElement("div");
		nuggetContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: ${spacing.xs};
    `;

		const nuggetCheckbox = this.createCheckbox(
			"includeNuggets",
			"Nuggets:",
			this.restEndpointConfig.includeNuggets,
		);
		const nuggetCheckboxInput = nuggetCheckbox.querySelector(
			"input",
		) as HTMLInputElement;
		nuggetCheckboxInput.addEventListener("change", (e) => {
			const checked = (e.target as HTMLInputElement).checked;
			this.restEndpointConfig.includeNuggets = checked;
			this.toggleNuggetSubOptions(nuggetSubOptions, checked);
		});

		const nuggetSubOptions = document.createElement("div");
		nuggetSubOptions.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: ${spacing.xs};
      padding-left: ${spacing.lg};
    `;

		const typeCheckbox = this.createCheckbox(
			"nuggetType",
			"Type (tool, media...)",
			this.restEndpointConfig.nuggetParts.type,
		);
		const typeCheckboxInput = typeCheckbox.querySelector(
			"input",
		) as HTMLInputElement;
		typeCheckboxInput.addEventListener("change", (e) => {
			this.restEndpointConfig.nuggetParts.type = (
				e.target as HTMLInputElement
			).checked;
		});

		const contentCheckbox = this.createCheckbox(
			"nuggetContent",
			"Content (original text)",
			this.restEndpointConfig.nuggetParts.content,
		);
		const contentCheckboxInput = contentCheckbox.querySelector(
			"input",
		) as HTMLInputElement;
		contentCheckboxInput.addEventListener("change", (e) => {
			this.restEndpointConfig.nuggetParts.content = (
				e.target as HTMLInputElement
			).checked;
		});

		nuggetSubOptions.appendChild(typeCheckbox);
		nuggetSubOptions.appendChild(contentCheckbox);

		nuggetContainer.appendChild(nuggetCheckbox);
		nuggetContainer.appendChild(nuggetSubOptions);

		includeOptions.appendChild(urlCheckbox);
		includeOptions.appendChild(timestampCheckbox);
		includeOptions.appendChild(nuggetContainer);

		includeSection.appendChild(includeLabel);
		includeSection.appendChild(includeOptions);

		// Action buttons
		const actionsRow = document.createElement("div");
		actionsRow.style.cssText = `
      display: flex;
      gap: ${spacing.sm};
      justify-content: center;
    `;

		const sendBtn = this.createActionButton("Send", () =>
			this.handleRestEndpointSend(),
		);
		const testBtn = this.createActionButton("Test Connection", () =>
			this.handleTestConnection(),
		);

		actionsRow.appendChild(sendBtn);
		actionsRow.appendChild(testBtn);

		optionsContainer.appendChild(urlRow);
		optionsContainer.appendChild(methodContentRow);
		optionsContainer.appendChild(headersRow);
		optionsContainer.appendChild(scopeRow);
		optionsContainer.appendChild(includeSection);
		optionsContainer.appendChild(actionsRow);

		panel.appendChild(titleContainer);
		panel.appendChild(optionsContainer);

		return panel;
	}

	private toggleRestEndpointPanel(
		optionsContainer: HTMLElement,
		toggleIcon: HTMLElement,
	): void {
		this.restEndpointExpanded = !this.restEndpointExpanded;

		if (this.restEndpointExpanded) {
			optionsContainer.style.display = "flex";
			toggleIcon.innerHTML =
				'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';
		} else {
			optionsContainer.style.display = "none";
			toggleIcon.innerHTML =
				'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>';
		}
	}

	private async handleRestEndpointSend(): Promise<void> {
		if (!this.restEndpointConfig.url) {
			alert("Please enter a URL");
			return;
		}

		const selectedScope = this.restEndpointPanel?.querySelector(
			'[data-scope][style*="background: rgb(252, 252, 252)"]',
		) as HTMLElement;
		const scope = selectedScope?.dataset.scope || "all";

		const nuggets =
			scope === "all"
				? this.allItems
				: this.allItems.filter((item) => item.selected);

		if (scope === "selected" && nuggets.length === 0) {
			alert("Please select at least one nugget to send.");
			return;
		}

		try {
			const payload = this.buildRestPayload(nuggets);
			const response = await this.sendToRestEndpoint(payload);

			if (response.ok) {
				alert(
					`Successfully sent ${nuggets.length} nuggets to ${this.restEndpointConfig.url}`,
				);
			} else {
				alert(`Failed to send: ${response.status} ${response.statusText}`);
			}
		} catch (error) {
			console.error("REST endpoint error:", error);
			alert(
				`Error sending to endpoint: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	private buildRestPayload(nuggets: SidebarNuggetItem[]): RestPayload {
		const payload: RestPayload = {};

		if (this.restEndpointConfig.includeUrl) {
			payload.url = window.location.href;
		}

		if (this.restEndpointConfig.includeTimestamp) {
			payload.timestamp = new Date().toISOString();
		}

		if (this.restEndpointConfig.includeNuggets) {
			payload.nuggets = nuggets.map((item) => {
				const nugget: RestPayloadNugget = {};

				if (this.restEndpointConfig.nuggetParts.type) {
					nugget.type = item.nugget.type;
				}

				if (this.restEndpointConfig.nuggetParts.content) {
					nugget.startContent = item.nugget.startContent;
					nugget.endContent = item.nugget.endContent;
				}

				return nugget;
			});
		}

		return payload;
	}

	private async sendToRestEndpoint(payload: RestPayload): Promise<Response> {
		const headers: Record<string, string> = {
			"Content-Type": this.restEndpointConfig.contentType,
		};

		this.restEndpointConfig.headers.forEach((header) => {
			headers[header.key] = header.value;
		});

		let body: string;
		if (this.restEndpointConfig.contentType === "application/json") {
			body = JSON.stringify(payload);
		} else if (
			this.restEndpointConfig.contentType ===
			"application/x-www-form-urlencoded"
		) {
			// Convert RestPayload to URLSearchParams-compatible format
			const formData: Record<string, string> = {};
			if (payload.url) formData.url = payload.url;
			if (payload.timestamp) formData.timestamp = payload.timestamp;
			if (payload.nuggets) formData.nuggets = JSON.stringify(payload.nuggets);
			body = new URLSearchParams(formData).toString();
		} else {
			body = JSON.stringify(payload);
		}

		return fetch(this.restEndpointConfig.url, {
			method: this.restEndpointConfig.method,
			headers,
			body,
		});
	}

	private createRestScopeButton(scope: string, label: string): HTMLElement {
		const button = document.createElement("button");
		button.dataset.scope = scope;
		button.innerHTML = label;
		button.style.cssText = `
      padding: ${spacing.xs} ${spacing.sm};
      border: 1px solid ${colors.border.light};
      border-radius: ${borderRadius.sm};
      background: ${colors.background.primary};
      color: ${colors.text.primary};
      font-size: ${typography.fontSize.xs};
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: ${spacing.xs};
    `;

		if (scope === "all") {
			button.style.background = colors.background.secondary;
		}

		button.addEventListener("mouseenter", () => {
			button.style.backgroundColor = colors.background.secondary;
		});

		button.addEventListener("mouseleave", () => {
			if (scope === "all") {
				button.style.backgroundColor = colors.background.secondary;
			} else {
				button.style.backgroundColor = colors.background.primary;
			}
		});

		button.addEventListener("click", () => {
			this.handleRestScopeSelection(scope);
		});

		return button;
	}

	private handleRestScopeSelection(scope: string): void {
		const allButtons = this.restEndpointPanel?.querySelectorAll("[data-scope]");
		allButtons?.forEach((btn) => {
			const button = btn as HTMLElement;
			if (button.dataset.scope === scope) {
				button.style.background = colors.background.secondary;
			} else {
				button.style.background = colors.background.primary;
			}
		});
	}

	private createCheckbox(
		id: string,
		label: string,
		checked: boolean,
	): HTMLElement {
		const container = document.createElement("div");
		container.style.cssText = `
      display: flex;
      align-items: center;
      gap: ${spacing.xs};
    `;

		const checkbox = document.createElement("input");
		checkbox.type = "checkbox";
		checkbox.id = id;
		checkbox.checked = checked;
		checkbox.style.cssText = `
      width: 16px;
      height: 16px;
      cursor: pointer;
    `;

		const labelElement = document.createElement("label");
		labelElement.htmlFor = id;
		labelElement.textContent = label;
		labelElement.style.cssText = `
      font-size: ${typography.fontSize.xs};
      color: ${colors.text.primary};
      cursor: pointer;
    `;

		container.appendChild(checkbox);
		container.appendChild(labelElement);

		return container;
	}

	private toggleNuggetSubOptions(subOptions: HTMLElement, show: boolean): void {
		subOptions.style.display = show ? "flex" : "none";
		const checkboxes = subOptions.querySelectorAll('input[type="checkbox"]');
		checkboxes.forEach((checkbox) => {
			(checkbox as HTMLInputElement).disabled = !show;
		});
	}

	private createActionButton(text: string, onClick: () => void): HTMLElement {
		const button = document.createElement("button");
		button.textContent = text;
		button.style.cssText = `
      padding: ${spacing.xs} ${spacing.md};
      border: 1px solid ${colors.border.light};
      border-radius: ${borderRadius.sm};
      background: ${colors.text.accent};
      color: ${colors.white};
      font-size: ${typography.fontSize.xs};
      font-weight: ${typography.fontWeight.medium};
      cursor: pointer;
      transition: all 0.2s ease;
    `;

		button.addEventListener("click", onClick);

		button.addEventListener("mouseenter", () => {
			button.style.backgroundColor = colors.text.primary;
		});

		button.addEventListener("mouseleave", () => {
			button.style.backgroundColor = colors.text.accent;
		});

		return button;
	}

	private addHeaderRow(container: HTMLElement): void {
		const headerRow = document.createElement("div");
		headerRow.style.cssText = `
      display: flex;
      gap: ${spacing.xs};
      align-items: center;
    `;

		const keyInput = document.createElement("input");
		keyInput.type = "text";
		keyInput.placeholder = "Header name";
		keyInput.style.cssText = `
      padding: ${spacing.xs} ${spacing.sm};
      border: 1px solid ${colors.border.light};
      border-radius: ${borderRadius.sm};
      font-size: ${typography.fontSize.xs};
      background: ${colors.background.primary};
      color: ${colors.text.primary};
      outline: none;
      flex: 1;
    `;

		const valueInput = document.createElement("input");
		valueInput.type = "text";
		valueInput.placeholder = "Header value";
		valueInput.style.cssText = `
      padding: ${spacing.xs} ${spacing.sm};
      border: 1px solid ${colors.border.light};
      border-radius: ${borderRadius.sm};
      font-size: ${typography.fontSize.xs};
      background: ${colors.background.primary};
      color: ${colors.text.primary};
      outline: none;
      flex: 2;
    `;

		const removeBtn = document.createElement("button");
		removeBtn.textContent = "×";
		removeBtn.style.cssText = `
      padding: ${spacing.xs};
      border: 1px solid ${colors.border.light};
      border-radius: ${borderRadius.sm};
      background: ${colors.background.primary};
      color: ${colors.text.secondary};
      font-size: ${typography.fontSize.sm};
      cursor: pointer;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

		removeBtn.addEventListener("click", () => {
			container.removeChild(headerRow);
			this.updateRestEndpointHeaders();
		});

		const updateHeaders = () => {
			this.updateRestEndpointHeaders();
		};

		keyInput.addEventListener("input", updateHeaders);
		valueInput.addEventListener("input", updateHeaders);

		headerRow.appendChild(keyInput);
		headerRow.appendChild(valueInput);
		headerRow.appendChild(removeBtn);

		container.appendChild(headerRow);
		this.updateRestEndpointHeaders();
	}

	private updateRestEndpointHeaders(): void {
		const headerRows = this.restEndpointPanel?.querySelectorAll(
			'div[style*="display: flex"][style*="gap"]',
		);
		this.restEndpointConfig.headers = [];

		headerRows?.forEach((row) => {
			const inputs = row.querySelectorAll('input[type="text"]');
			if (inputs.length === 2) {
				const key = (inputs[0] as HTMLInputElement).value.trim();
				const value = (inputs[1] as HTMLInputElement).value.trim();
				if (key && value) {
					this.restEndpointConfig.headers.push({ key, value });
				}
			}
		});
	}

	private async handleTestConnection(): Promise<void> {
		if (!this.restEndpointConfig.url) {
			alert("Please enter a URL");
			return;
		}

		try {
			const response = await fetch(this.restEndpointConfig.url, {
				method: "OPTIONS",
				headers: {
					"Content-Type": this.restEndpointConfig.contentType,
					...Object.fromEntries(
						this.restEndpointConfig.headers.map((header) => [
							header.key,
							header.value,
						]),
					),
				},
			});

			if (response.ok) {
				alert("Connection test successful!");
			} else {
				alert(
					`Connection test failed: ${response.status} ${response.statusText}`,
				);
			}
		} catch (error) {
			console.error("Connection test error:", error);
			alert(
				`Connection test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}
}
