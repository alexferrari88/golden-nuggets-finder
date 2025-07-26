import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationManager } from "./notifications";

// Mock design system imports
vi.mock("../../shared/design-system", () => ({
	colors: {
		success: "#28a745",
		error: "#dc3545",
		text: {
			accent: "#007bff",
		},
	},
	generateInlineStyles: {
		notification: () => "0 2px 4px rgba(0,0,0,0.1)",
	},
	zIndex: {
		notification: 10000,
	},
	ui: {
		notificationTimeout: 5000,
	},
}));

describe("NotificationManager", () => {
	let notificationManager: NotificationManager;

	beforeEach(() => {
		// Set up DOM
		document.body.innerHTML = "";
		notificationManager = new NotificationManager();
		vi.useFakeTimers();
	});

	afterEach(() => {
		notificationManager.cleanup();
		vi.useRealTimers();
	});

	describe("showProgress", () => {
		it("should create and display progress banner", () => {
			notificationManager.showProgress("Finding golden nuggets");

			const banner = document.querySelector(".nugget-notification-banner");
			expect(banner).toBeTruthy();
			expect(banner?.textContent).toContain("Finding golden nuggets");
			expect(banner?.classList.contains("nugget-banner-progress")).toBe(true);
		});

		it("should include animated dots in progress banner", () => {
			notificationManager.showProgress("Finding golden nuggets");

			const banner = document.querySelector(".nugget-notification-banner");
			const dots = banner?.querySelectorAll('div[style*="border-radius: 50%"]');
			expect(dots?.length).toBe(3);
		});

		it("should add CSS animation styles to document head", () => {
			notificationManager.showProgress("Finding golden nuggets");

			const styles = document.querySelector("#nugget-progress-styles");
			expect(styles).toBeTruthy();
			expect(styles?.textContent).toContain("@keyframes nugget-pulse");
		});

		it("should replace existing banner when called multiple times", () => {
			notificationManager.showProgress("First message");
			notificationManager.showProgress("Second message");

			const banners = document.querySelectorAll(".nugget-notification-banner");
			expect(banners.length).toBe(1);
			expect(banners[0].textContent).toContain("Second message");
		});
	});

	describe("showError", () => {
		it("should create and display error banner", () => {
			notificationManager.showError("Analysis failed");

			const banner = document.querySelector(".nugget-notification-banner");
			expect(banner).toBeTruthy();
			expect(banner?.textContent).toBe("Analysis failed");
			expect(banner?.classList.contains("nugget-banner-error")).toBe(true);
		});

		it("should auto-hide after timeout", () => {
			notificationManager.showError("Analysis failed");

			expect(
				document.querySelector(".nugget-notification-banner"),
			).toBeTruthy();

			vi.advanceTimersByTime(5000);

			expect(document.querySelector(".nugget-notification-banner")).toBeFalsy();
		});

		it("should clear previous timeout when showing new error", () => {
			notificationManager.showError("First error");

			// Advance time partway
			vi.advanceTimersByTime(2000);

			notificationManager.showError("Second error");

			// Advance past first timeout but not second
			vi.advanceTimersByTime(4000);

			expect(
				document.querySelector(".nugget-notification-banner"),
			).toBeTruthy();
			expect(
				document.querySelector(".nugget-notification-banner")?.textContent,
			).toBe("Second error");
		});
	});

	describe("showInfo", () => {
		it("should create and display info banner", () => {
			notificationManager.showInfo("Analysis complete");

			const banner = document.querySelector(".nugget-notification-banner");
			expect(banner).toBeTruthy();
			expect(banner?.textContent).toBe("Analysis complete");
			expect(banner?.classList.contains("nugget-banner-info")).toBe(true);
		});

		it("should auto-hide after timeout", () => {
			notificationManager.showInfo("Analysis complete");

			expect(
				document.querySelector(".nugget-notification-banner"),
			).toBeTruthy();

			vi.advanceTimersByTime(5000);

			expect(document.querySelector(".nugget-notification-banner")).toBeFalsy();
		});
	});

	describe("showApiKeyError", () => {
		// Mock chrome.runtime for this test
		beforeEach(() => {
			(global as any).chrome = {
				runtime: {
					sendMessage: vi.fn(),
				},
			};
		});

		it("should create API key error banner with link", () => {
			notificationManager.showApiKeyError();

			const banner = document.querySelector(".nugget-notification-banner");
			expect(banner).toBeTruthy();
			expect(banner?.textContent).toContain("Gemini API key not configured");

			const link = banner?.querySelector("a");
			expect(link).toBeTruthy();
			expect(link?.textContent).toBe("options page");
		});

		it("should send message to open options page when link is clicked", () => {
			notificationManager.showApiKeyError();

			const link = document.querySelector(".nugget-notification-banner a");
			expect(link).toBeTruthy();

			// Simulate click
			const clickEvent = new Event("click");
			link?.dispatchEvent(clickEvent);

			expect((global as any).chrome.runtime.sendMessage).toHaveBeenCalledWith({
				type: "OPEN_OPTIONS_PAGE",
			});
		});

		it("should auto-hide after timeout", () => {
			notificationManager.showApiKeyError();

			expect(
				document.querySelector(".nugget-notification-banner"),
			).toBeTruthy();

			vi.advanceTimersByTime(5000);

			expect(document.querySelector(".nugget-notification-banner")).toBeFalsy();
		});
	});

	describe("hideProgress", () => {
		it("should hide progress banner", () => {
			notificationManager.showProgress("Finding golden nuggets");
			expect(
				document.querySelector(".nugget-notification-banner"),
			).toBeTruthy();

			notificationManager.hideProgress();
			expect(document.querySelector(".nugget-notification-banner")).toBeFalsy();
		});

		it("should not throw when no banner exists", () => {
			expect(() => notificationManager.hideProgress()).not.toThrow();
		});
	});

	describe("hide", () => {
		it("should hide any banner", () => {
			notificationManager.showError("Test error");
			expect(
				document.querySelector(".nugget-notification-banner"),
			).toBeTruthy();

			notificationManager.hide();
			expect(document.querySelector(".nugget-notification-banner")).toBeFalsy();
		});

		it("should clear auto-hide timeout", () => {
			notificationManager.showError("Test error");

			notificationManager.hide();

			// Advance past timeout
			vi.advanceTimersByTime(6000);

			// Should still be hidden
			expect(document.querySelector(".nugget-notification-banner")).toBeFalsy();
		});
	});

	describe("cleanup", () => {
		it("should remove banner and cleanup styles", () => {
			notificationManager.showProgress("Finding golden nuggets");

			expect(
				document.querySelector(".nugget-notification-banner"),
			).toBeTruthy();
			expect(document.querySelector("#nugget-progress-styles")).toBeTruthy();

			notificationManager.cleanup();

			expect(document.querySelector(".nugget-notification-banner")).toBeFalsy();
			expect(document.querySelector("#nugget-progress-styles")).toBeFalsy();
		});

		it("should clear timeouts", () => {
			notificationManager.showError("Test error");

			notificationManager.cleanup();

			// Advance past timeout
			vi.advanceTimersByTime(6000);

			// Should still be hidden
			expect(document.querySelector(".nugget-notification-banner")).toBeFalsy();
		});
	});

	describe("banner styling", () => {
		it("should apply correct styles for progress banner", () => {
			notificationManager.showProgress("Finding golden nuggets");

			const banner = document.querySelector(
				".nugget-notification-banner",
			) as HTMLElement;
			expect(banner.style.position).toBe("fixed");
			expect(banner.style.top).toBe("20px");
			expect(banner.style.left).toBe("50%");
			expect(banner.style.transform).toBe("translateX(-50%)");
			expect(banner.style.zIndex).toBe("10000");
		});

		it("should apply error color for error banner", () => {
			notificationManager.showError("Test error");

			const banner = document.querySelector(
				".nugget-notification-banner",
			) as HTMLElement;
			expect(banner.style.background).toBe("#dc3545");
			expect(banner.style.color).toBe("white");
		});

		it("should apply success color for progress banner", () => {
			notificationManager.showProgress("Finding nuggets");

			const banner = document.querySelector(
				".nugget-notification-banner",
			) as HTMLElement;
			expect(banner.style.background).toBe("#28a745");
			expect(banner.style.color).toBe("white");
		});

		it("should apply info color for info banner", () => {
			notificationManager.showInfo("Analysis complete");

			const banner = document.querySelector(
				".nugget-notification-banner",
			) as HTMLElement;
			expect(banner.style.background).toBe("#007bff");
			expect(banner.style.color).toBe("white");
		});
	});
});
