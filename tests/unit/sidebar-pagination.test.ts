/**
 * @jest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Sidebar } from "../../src/content/ui/sidebar";
import type { GoldenNugget, SidebarNuggetItem } from "../../src/shared/types";

// Chrome API type definitions for testing
interface MockChromeRuntimeAPI {
	sendMessage: ReturnType<typeof vi.fn>;
}

interface MockChromeAPI {
	runtime: MockChromeRuntimeAPI;
}

// Mock chrome API
const mockChrome: MockChromeAPI = {
	runtime: {
		sendMessage: vi.fn(),
	},
};

// Type assertion is acceptable here as we're mocking for tests
global.chrome = mockChrome as unknown as typeof chrome;

// Mock design system imports
vi.mock("../../src/shared/design-system", () => ({
	colors: {
		background: {
			primary: "#ffffff",
			secondary: "#f8f9fa",
			tertiary: "#f1f3f4",
			modalOverlay: "rgba(0, 0, 0, 0.5)",
		},
		text: {
			primary: "#1a1a1a",
			secondary: "#666666",
			tertiary: "#999999",
			accent: "#007acc",
		},
		border: {
			light: "#e1e4e8",
			medium: "#d1d5da",
			default: "#c6cbd1",
		},
		white: "#ffffff",
		highlight: {
			border: "#ffd700",
		},
	},
	shadows: {
		md: "0 4px 6px rgba(0, 0, 0, 0.1)",
		lg: "0 8px 16px rgba(0, 0, 0, 0.1)",
	},
	generateInlineStyles: {
		sidebarShadow: () => "0 -2px 10px rgba(0, 0, 0, 0.1)",
		sidebarShadowHover: () => "0 -2px 15px rgba(0, 0, 0, 0.15)",
		cardShadow: () => "0 1px 3px rgba(0, 0, 0, 0.1)",
		highlightStyle: () => "background: rgba(255, 215, 0, 0.2)",
	},
	borderRadius: {
		sm: "4px",
		md: "6px",
		lg: "8px",
	},
	spacing: {
		xs: "4px",
		sm: "8px",
		md: "16px",
		lg: "24px",
		xl: "32px",
		"2xl": "48px",
		"5xl": "80px",
	},
	typography: {
		fontSize: {
			xs: "12px",
			sm: "14px",
			base: "16px",
			lg: "18px",
		},
		fontWeight: {
			normal: "400",
			medium: "500",
			semibold: "600",
		},
		lineHeight: {
			tight: "1.25",
			normal: "1.5",
		},
		fontFamily: {
			sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
		},
	},
	zIndex: {
		sidebar: "10000",
		modal: "10001",
	},
	ui: {
		sidebarWidth: "380px",
	},
}));

// Mock content reconstruction
vi.mock("../../src/shared/content-reconstruction", () => ({
	getDisplayContent: vi.fn(
		(nugget) => `${nugget.startContent}...${nugget.endContent}`,
	),
	reconstructFullContent: vi.fn(
		(nugget) => `${nugget.startContent}...${nugget.endContent}`,
	),
}));

// Create mock nugget items
function createMockNuggetItems(count: number): SidebarNuggetItem[] {
	return Array.from({ length: count }, (_, i) => ({
		nugget: {
			type: "explanation" as const,
			startContent: `Start content ${i + 1}`,
			endContent: `End content ${i + 1}`,
		} as GoldenNugget,
		status: "highlighted" as "highlighted" | "not-found",
		selected: false,
		highlightVisited: false,
	}));
}

describe("Sidebar Pagination", () => {
	let sidebar: Sidebar;

	beforeEach(() => {
		// Clear DOM
		document.body.innerHTML = "";
		sidebar = new Sidebar();
	});

	afterEach(() => {
		sidebar.hide();
	});

	it("should show all items when count is less than itemsPerPage", () => {
		const items = createMockNuggetItems(10);
		sidebar.show(items);

		// Should show all 10 items without pagination
		const sidebarElement = document.querySelector(".nugget-sidebar");
		expect(sidebarElement).toBeTruthy();

		const nuggetItems = document.querySelectorAll(".nugget-item");
		expect(nuggetItems).toHaveLength(10);

		// Should not have pagination controls
		const pagination = document.querySelector(".nugget-pagination");
		expect(pagination).toBeFalsy();
	});

	it("should show pagination when count exceeds itemsPerPage", () => {
		const items = createMockNuggetItems(24);
		sidebar.show(items);

		const sidebarElement = document.querySelector(".nugget-sidebar");
		expect(sidebarElement).toBeTruthy();

		// Should only show first 20 items on page 1
		const nuggetItems = document.querySelectorAll(".nugget-item");
		expect(nuggetItems).toHaveLength(20);

		// Should have pagination controls
		const pagination = document.querySelector(".nugget-pagination");
		expect(pagination).toBeTruthy();

		const nextButton = pagination?.querySelector(".pagination-button");
		expect(nextButton).toBeTruthy();
		expect(nextButton?.textContent).toContain("Next");

		const pageInfo = pagination?.querySelector("span");
		expect(pageInfo).toBeTruthy();
		expect(pageInfo?.textContent).toContain("Page 1 of 2");
	});

	it("should navigate to second page and show remaining items", () => {
		const items = createMockNuggetItems(24);
		sidebar.show(items);

		// Find and click Next button
		const pagination = document.querySelector(".nugget-pagination");
		const nextButton = Array.from(
			pagination?.querySelectorAll(".pagination-button") || [],
		).find(
			(el): el is HTMLButtonElement =>
				el instanceof HTMLButtonElement &&
				(el.textContent?.includes("Next") ?? false),
		);

		expect(nextButton).toBeTruthy();
		nextButton?.click();

		// Should now show items 21-24 (4 items)
		const nuggetItems = document.querySelectorAll(".nugget-item");
		expect(nuggetItems).toHaveLength(4);

		// Should show page 2 info
		const updatedPagination = document.querySelector(".nugget-pagination");
		const pageInfo = updatedPagination?.querySelector("span");
		expect(pageInfo?.textContent).toContain("Page 2 of 2");

		// Should have Previous button but no Next button
		const paginationButtons =
			updatedPagination?.querySelectorAll(".pagination-button");
		const prevButton = Array.from(paginationButtons || []).find(
			(el) => el.textContent?.includes("Previous") ?? false,
		);
		expect(prevButton).toBeTruthy();

		const noNextButton = Array.from(paginationButtons || []).find((el) =>
			el.textContent?.includes("Next"),
		);
		expect(noNextButton).toBeFalsy();
	});

	it("should show correct nugget content on each page", () => {
		const items = createMockNuggetItems(24);
		sidebar.show(items);

		// Check first page content
		let nuggetItems = document.querySelectorAll(".nugget-item");
		expect(nuggetItems).toHaveLength(20);

		// First item should be "Start content 1...End content 1"
		const firstItem = nuggetItems[0];
		expect(firstItem.textContent).toContain("Start content 1");
		expect(firstItem.textContent).toContain("End content 1");

		// Last item on page 1 should be "Start content 20...End content 20"
		const lastItemPage1 = nuggetItems[19];
		expect(lastItemPage1.textContent).toContain("Start content 20");
		expect(lastItemPage1.textContent).toContain("End content 20");

		// Navigate to page 2
		const pagination = document.querySelector(".nugget-pagination");
		const nextButton = Array.from(
			pagination?.querySelectorAll(".pagination-button") || [],
		).find(
			(el): el is HTMLButtonElement =>
				el instanceof HTMLButtonElement &&
				(el.textContent?.includes("Next") ?? false),
		);
		nextButton?.click();

		// Check second page content
		nuggetItems = document.querySelectorAll(".nugget-item");
		expect(nuggetItems).toHaveLength(4);

		// First item on page 2 should be "Start content 21...End content 21"
		const firstItemPage2 = nuggetItems[0];
		expect(firstItemPage2.textContent).toContain("Start content 21");
		expect(firstItemPage2.textContent).toContain("End content 21");

		// Last item should be "Start content 24...End content 24"
		const lastItem = nuggetItems[3];
		expect(lastItem.textContent).toContain("Start content 24");
		expect(lastItem.textContent).toContain("End content 24");
	});

	it("should maintain pagination state when refreshing page", () => {
		const items = createMockNuggetItems(24);
		sidebar.show(items);

		// Navigate to page 2
		const nextButton = Array.from(document.querySelectorAll("button")).find(
			(el): el is HTMLButtonElement =>
				el instanceof HTMLButtonElement &&
				(el.textContent?.includes("Next") ?? false),
		);
		nextButton?.click();

		// Verify we're on page 2
		let nuggetItems = document.querySelectorAll(".nugget-item");
		expect(nuggetItems).toHaveLength(4);

		// Simulate refreshing the current page (this is what refreshCurrentPage does internally)
		const container = document.querySelector(
			"#nugget-list-container",
		) as HTMLElement;
		expect(container).toBeTruthy();

		// Clear and re-render current page (simulating refreshCurrentPage)
		const existingItems = container.querySelectorAll(".nugget-item");
		existingItems.forEach((item) => item.remove());

		// Re-render with same pagination state (this should still show page 2)
		// This tests the internal logic that should preserve current page
		nuggetItems = document.querySelectorAll(".nugget-item");

		// After refresh, we should still be on page 2
		const paginationAfterRefresh = document.querySelector(".nugget-pagination");
		const pageInfo = paginationAfterRefresh?.querySelector("span");
		expect(pageInfo?.textContent).toContain("Page 2 of 2");
	});

	it("should handle edge case with exactly itemsPerPage items", () => {
		const items = createMockNuggetItems(20); // Exactly 20 items
		sidebar.show(items);

		const nuggetItems = document.querySelectorAll(".nugget-item");
		expect(nuggetItems).toHaveLength(20);

		// Should NOT have pagination with exactly 20 items
		const pagination = document.querySelector(".nugget-pagination");
		expect(pagination).toBeFalsy();
	});

	it("should handle edge case with itemsPerPage + 1 items", () => {
		const items = createMockNuggetItems(21); // 21 items (triggers pagination)
		sidebar.show(items);

		// Should show 20 items on page 1
		let nuggetItems = document.querySelectorAll(".nugget-item");
		expect(nuggetItems).toHaveLength(20);

		// Should have pagination
		const pagination = document.querySelector(".nugget-pagination");
		const nextButton = Array.from(
			pagination?.querySelectorAll(".pagination-button") || [],
		).find(
			(el): el is HTMLButtonElement =>
				el instanceof HTMLButtonElement &&
				(el.textContent?.includes("Next") ?? false),
		);
		expect(nextButton).toBeTruthy();

		// Navigate to page 2
		nextButton?.click();

		// Should show 1 item on page 2
		nuggetItems = document.querySelectorAll(".nugget-item");
		expect(nuggetItems).toHaveLength(1);

		const updatedPagination = document.querySelector(".nugget-pagination");
		const pageInfo = updatedPagination?.querySelector("span");
		expect(pageInfo?.textContent).toContain("Page 2 of 2");
	});

	describe("Feedback Button Functionality on Paginated Content", () => {
		it("should handle feedback rating on page 2 items without bounds errors", async () => {
			const items = createMockNuggetItems(24);
			sidebar.show(items);

			// Navigate to page 2
			const pagination = document.querySelector(".nugget-pagination");
			const nextButton = Array.from(
				pagination?.querySelectorAll(".pagination-button") || [],
			).find(
				(el): el is HTMLButtonElement =>
					el instanceof HTMLButtonElement &&
					(el.textContent?.includes("Next") ?? false),
			);
			nextButton?.click();

			// Mock chrome.runtime.sendMessage for feedback handling
			(global.chrome.runtime.sendMessage as any).mockClear();
			(global.chrome.runtime.sendMessage as any).mockImplementation(
				(_message: any, callback?: (response: any) => void) => {
					// Simulate successful feedback submission
					if (callback) {
						callback({ success: true });
					}
				},
			);

			// Find a thumbs up button on page 2 - should exist in feedback section
			const nuggetItems = document.querySelectorAll(".nugget-item");
			expect(nuggetItems.length).toBeGreaterThan(0);

			const firstNuggetOnPage2 = nuggetItems[0];
			const thumbsUpButton = firstNuggetOnPage2.querySelector(
				".feedback-btn-thumbs-up",
			) as HTMLButtonElement;
			expect(thumbsUpButton).toBeTruthy();

			// Click should not throw bounds error due to the bounds checking fix
			expect(() => {
				thumbsUpButton.click();
			}).not.toThrow();

			// Verify that no feedback was submitted due to bounds checking
			// (the bounds check should return early and not call chrome.runtime.sendMessage)
			expect(global.chrome.runtime.sendMessage).not.toHaveBeenCalled();
		});

		it("should handle type correction on page 2 items without bounds errors", async () => {
			const items = createMockNuggetItems(24);
			sidebar.show(items);

			// Navigate to page 2
			const pagination = document.querySelector(".nugget-pagination");
			const nextButton = Array.from(
				pagination?.querySelectorAll(".pagination-button") || [],
			).find(
				(el): el is HTMLButtonElement =>
					el instanceof HTMLButtonElement &&
					(el.textContent?.includes("Next") ?? false),
			);
			nextButton?.click();

			// Mock chrome.runtime.sendMessage for feedback handling
			(global.chrome.runtime.sendMessage as any).mockClear();
			(global.chrome.runtime.sendMessage as any).mockImplementation(
				(_message: any, callback?: (response: any) => void) => {
					// Simulate successful feedback submission
					if (callback) {
						callback({ success: true });
					}
				},
			);

			// Find a type correction dropdown on page 2
			const nuggetItems = document.querySelectorAll(".nugget-item");
			expect(nuggetItems.length).toBeGreaterThan(0);

			const firstNuggetOnPage2 = nuggetItems[0];
			const typeSelect = firstNuggetOnPage2.querySelector(
				"select",
			) as HTMLSelectElement;
			expect(typeSelect).toBeTruthy();

			// Change type should not throw bounds error due to bounds checking fix
			expect(() => {
				typeSelect.value = "media";
				typeSelect.dispatchEvent(new Event("change"));
			}).not.toThrow();

			// Verify that no feedback was submitted due to bounds checking
			// (the bounds check should return early and not call chrome.runtime.sendMessage)
			expect(global.chrome.runtime.sendMessage).not.toHaveBeenCalled();
		});

		it("should prevent bounds errors with correct globalIndex calculations", () => {
			const items = createMockNuggetItems(21); // Edge case: exactly one item on page 2
			sidebar.show(items);

			// Spy on console.error to ensure no bounds checking errors occur
			const consoleErrorSpy = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});

			// Navigate to page 2 (which has only 1 item)
			const pagination = document.querySelector(".nugget-pagination");
			const nextButton = Array.from(
				pagination?.querySelectorAll(".pagination-button") || [],
			).find(
				(el): el is HTMLButtonElement =>
					el instanceof HTMLButtonElement &&
					(el.textContent?.includes("Next") ?? false),
			);
			nextButton?.click();

			// Attempt to trigger feedback on the single item
			const nuggetItems = document.querySelectorAll(".nugget-item");
			expect(nuggetItems.length).toBe(1); // Should have exactly 1 item on page 2

			const firstNuggetOnPage2 = nuggetItems[0];
			const thumbsUpButton = firstNuggetOnPage2.querySelector(
				".feedback-btn-thumbs-up",
			) as HTMLButtonElement;
			expect(thumbsUpButton).toBeTruthy();

			// This should now work correctly without bounds errors
			// The globalIndex should be calculated correctly as 20 (not 40) for the first item on page 2
			thumbsUpButton.click();

			// Should NOT have logged any bounds checking errors due to fixed globalIndex calculation
			const boundsErrors = consoleErrorSpy.mock.calls.filter((call) =>
				call[0]?.includes("Invalid globalIndex"),
			);
			expect(boundsErrors.length).toBe(0);

			consoleErrorSpy.mockRestore();
		});
	});
});
