import {
	colors,
	components,
	generateInlineStyles,
	ui,
	zIndex,
} from "../../shared/design-system";

/**
 * Truncates long error messages for better UX while preserving important information
 * Also normalizes whitespace and line breaks for consistent notification display
 */
function truncateErrorMessage(
	message: string,
	maxLength: number = 250,
): string {
	// First, normalize the message by collapsing whitespace and removing line breaks
	// This prevents awkward multi-line layouts in notification banners
	const normalizedMessage = message
		.replace(/\s+/g, " ") // Replace all whitespace (including line breaks) with single spaces
		.trim(); // Remove leading/trailing whitespace

	if (normalizedMessage.length <= maxLength) return normalizedMessage;

	// Try to truncate at a sentence boundary first
	const truncated = normalizedMessage.substring(0, maxLength);
	const lastSentence = truncated.lastIndexOf(". ");
	const lastPeriod = truncated.lastIndexOf(".");

	if (lastSentence > maxLength * 0.6) {
		return `${truncated.substring(0, lastSentence + 1)} [...]`;
	} else if (lastPeriod > maxLength * 0.6) {
		return `${truncated.substring(0, lastPeriod + 1)} [...]`;
	}

	// Fallback to word boundary
	const lastSpace = truncated.lastIndexOf(" ");
	if (lastSpace > maxLength * 0.7) {
		return `${truncated.substring(0, lastSpace)}... [message truncated]`;
	}

	// Hard truncation as last resort
	return `${truncated}... [truncated]`;
}

export class NotificationManager {
	private currentBanner: HTMLElement | null = null;
	private autoHideTimeout: ReturnType<typeof setTimeout> | null = null;

	showProgress(message: string): void {
		this.hideBanner();
		this.currentBanner = this.createBanner(message, "progress");
		document.body.appendChild(this.currentBanner);
	}

	showError(message: string): void {
		this.hideBanner();
		const truncatedMessage = truncateErrorMessage(message);
		this.currentBanner = this.createBanner(truncatedMessage, "error");
		document.body.appendChild(this.currentBanner);

		// Auto-hide error after timeout (longer for longer messages)
		const timeout =
			truncatedMessage.length > 150
				? ui.notificationTimeout * 1.5
				: ui.notificationTimeout;
		this.autoHideTimeout = setTimeout(() => {
			this.hideBanner();
		}, timeout);
	}

	showSuccess(message: string): void {
		this.hideBanner();
		this.currentBanner = this.createBanner(message, "success");
		document.body.appendChild(this.currentBanner);

		// Auto-hide success after timeout
		this.autoHideTimeout = setTimeout(() => {
			this.hideBanner();
		}, ui.notificationTimeout);
	}

	showApiKeyError(): void {
		this.hideBanner();
		this.currentBanner = this.createApiKeyErrorBanner();
		document.body.appendChild(this.currentBanner);

		// Auto-hide error after timeout
		this.autoHideTimeout = setTimeout(() => {
			this.hideBanner();
		}, ui.notificationTimeout);
	}

	showInfo(
		message: string,
		options?: {
			showButton?: boolean;
			buttonText?: string;
			onButtonClick?: () => void;
		},
	): void {
		this.hideBanner();
		this.currentBanner = this.createBanner(message, "info", options);
		document.body.appendChild(this.currentBanner);

		// Don't auto-hide if there's a button (user needs to take action)
		if (!options?.showButton) {
			this.autoHideTimeout = setTimeout(() => {
				this.hideBanner();
			}, ui.notificationTimeout);
		}
	}

	hideProgress(): void {
		if (this.currentBanner) {
			this.hideBanner();
		}
	}

	showRateLimited(
		provider: string,
		waitTime: number,
		attempt: number,
		maxAttempts: number,
		analysisId: string,
	): void {
		this.hideBanner();
		this.currentBanner = this.createRateLimitedBanner(
			provider,
			waitTime,
			attempt,
			maxAttempts,
			analysisId,
		);
		document.body.appendChild(this.currentBanner);
	}

	showRetrying(provider: string, attempt: number, maxAttempts: number): void {
		this.hideBanner();
		this.currentBanner = this.createBanner(
			`🔄 Retrying with ${provider} (attempt ${attempt}/${maxAttempts})...`,
			"progress",
		);
		document.body.appendChild(this.currentBanner);
	}

	hide(): void {
		this.hideBanner();
	}

	private createBanner(
		message: string,
		type: "progress" | "error" | "info" | "success",
		options?: {
			showButton?: boolean;
			buttonText?: string;
			onButtonClick?: () => void;
		},
	): HTMLElement {
		const banner = document.createElement("div");
		banner.className = `nugget-notification-banner nugget-banner-${type}`;

		const baseStyles = `
      position: fixed;
      top: 20px;
      left: 20px;
      right: 20px;
      max-width: 400px;
      margin: 0 auto;
      padding: 12px 24px;
      border-radius: 4px;
      z-index: ${zIndex.notification};
      box-shadow: ${generateInlineStyles.notification()};
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 500;
      text-align: left;
      word-wrap: break-word;
      overflow-wrap: break-word;
      word-break: break-word;
      hyphens: auto;
      line-height: 1.4;
      white-space: normal;
    `;

		let typeStyles = "";
		switch (type) {
			case "progress":
				typeStyles = `
          background: ${colors.success};
          color: white;
        `;
				break;
			case "error":
				typeStyles = `
          background: ${colors.error};
          color: white;
        `;
				break;
			case "info":
				typeStyles = `
          background: ${colors.text.accent};
          color: white;
        `;
				break;
			case "success":
				typeStyles = `
          background: ${colors.success};
          color: white;
        `;
				break;
		}

		banner.style.cssText = baseStyles + typeStyles;

		// Add dynamic content based on type
		if (type === "progress") {
			this.addProgressAnimation(banner, message);
		} else if (options?.showButton) {
			this.addTextWithButton(banner, message, options);
		} else {
			banner.textContent = message;
		}

		return banner;
	}

	private addProgressAnimation(banner: HTMLElement, message: string): void {
		// For progress notifications, we need flexbox layout
		banner.style.display = "flex";
		banner.style.alignItems = "center";
		banner.style.justifyContent = "center";
		banner.style.gap = "8px";

		// Add text element
		const textElement = document.createElement("span");
		textElement.textContent = message;
		banner.appendChild(textElement);

		// Add animated dots
		const dotsContainer = document.createElement("div");
		dotsContainer.style.cssText = `
      display: flex;
      gap: 2px;
      align-items: center;
    `;

		for (let i = 0; i < 3; i++) {
			const dot = document.createElement("div");
			dot.style.cssText = `
        width: 4px;
        height: 4px;
        border-radius: 50%;
        background: white;
        animation: nugget-pulse 1.5s ease-in-out infinite;
        animation-delay: ${i * 0.2}s;
      `;
			dotsContainer.appendChild(dot);
		}

		banner.appendChild(dotsContainer);

		// Add CSS animation styles
		if (!document.querySelector("#nugget-progress-styles")) {
			const style = document.createElement("style");
			style.id = "nugget-progress-styles";
			style.textContent = `
        @keyframes nugget-pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `;
			document.head.appendChild(style);
		}
	}

	private addTextWithButton(
		banner: HTMLElement,
		message: string,
		options: { buttonText?: string; onButtonClick?: () => void },
	): void {
		// Change banner layout to column for button underneath text
		banner.style.flexDirection = "column";
		banner.style.gap = "12px";

		// Add text element
		const textElement = document.createElement("span");
		textElement.textContent = message;
		banner.appendChild(textElement);

		// Add button if provided
		if (options.buttonText && options.onButtonClick) {
			const button = document.createElement("button");
			button.textContent = options.buttonText;

			// Apply design system secondary button styles for better contrast on dark background
			const buttonStyles = Object.entries(components.button.secondary)
				.map(
					([key, value]) =>
						`${key.replace(/([A-Z])/g, "-$1").toLowerCase()}: ${value}`,
				)
				.join("; ");

			button.style.cssText = `
        ${buttonStyles};
        white-space: nowrap;
        align-self: center;
      `;

			// Add hover effects
			button.addEventListener("mouseenter", () => {
				button.style.transform = "translateY(-1px)";
				button.style.boxShadow = generateInlineStyles.cardShadowHover();
			});

			button.addEventListener("mouseleave", () => {
				button.style.transform = "translateY(0)";
				button.style.boxShadow = components.button.secondary.boxShadow;
			});

			button.addEventListener("click", options.onButtonClick);
			banner.appendChild(button);
		}
	}

	private createRateLimitedBanner(
		provider: string,
		waitTime: number,
		attempt: number,
		maxAttempts: number,
		analysisId: string,
	): HTMLElement {
		const banner = document.createElement("div");
		banner.className = "nugget-notification-banner nugget-banner-rate-limited";

		const baseStyles = `
			position: fixed;
			top: 20px;
			left: 20px;
			right: 20px;
			max-width: 450px;
			margin: 0 auto;
			padding: 16px 24px;
			border-radius: 6px;
			z-index: ${zIndex.notification};
			box-shadow: ${generateInlineStyles.notification()};
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
			font-size: 14px;
			text-align: left;
			line-height: 1.5;
			background: ${colors.background.secondary};
			border: 1px solid ${colors.border.medium};
			color: ${colors.text.primary};
		`;

		banner.style.cssText = baseStyles;

		const countdown = document.createElement("span");
		countdown.id = `countdown-${analysisId}`;
		countdown.style.cssText = `
			font-weight: 600;
			color: ${colors.text.accent};
		`;

		const cancelButton = document.createElement("button");
		cancelButton.textContent = "Cancel";
		cancelButton.style.cssText = `
			${components.button.secondary};
			margin-left: 12px;
			padding: 6px 12px;
			font-size: 13px;
			cursor: pointer;
		`;

		// Handle cancel button click
		cancelButton.addEventListener("click", () => {
			chrome.runtime.sendMessage({
				type: "ABORT_ANALYSIS",
				analysisId: analysisId,
			});
			this.hideBanner();
		});

		banner.innerHTML = `
			<div style="display: flex; align-items: center; justify-content: space-between;">
				<div>
					⏳ <strong>${provider}</strong> rate limited (attempt ${attempt}/${maxAttempts})<br>
					<span style="font-size: 13px; color: ${colors.text.secondary};">
						Waiting <span id="countdown-${analysisId}">${waitTime}</span>s before retry...
					</span>
				</div>
			</div>
		`;

		banner.appendChild(cancelButton);

		// Start countdown timer
		let remainingTime = waitTime;
		const timer = setInterval(() => {
			remainingTime--;
			const countdownElement = document.getElementById(
				`countdown-${analysisId}`,
			);
			if (countdownElement) {
				countdownElement.textContent = remainingTime.toString();
			}
			if (remainingTime <= 0) {
				clearInterval(timer);
			}
		}, 1000);

		return banner;
	}

	private createApiKeyErrorBanner(): HTMLElement {
		const banner = document.createElement("div");
		banner.className = "nugget-notification-banner nugget-banner-api-key-error";

		const baseStyles = `
      position: fixed;
      top: 20px;
      left: 20px;
      right: 20px;
      max-width: 400px;
      margin: 0 auto;
      padding: 12px 24px;
      border-radius: 4px;
      z-index: ${zIndex.notification};
      box-shadow: ${generateInlineStyles.notification()};
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 500;
      text-align: left;
      background: ${colors.error};
      color: white;
      word-wrap: break-word;
      overflow-wrap: break-word;
      word-break: break-word;
      hyphens: auto;
      line-height: 1.4;
      white-space: normal;
    `;

		banner.style.cssText = baseStyles;

		// Create text content with link
		const textSpan = document.createElement("span");
		textSpan.textContent =
			"Gemini API key not configured. Please set it in the ";

		const link = document.createElement("a");
		link.textContent = "options page";
		link.style.cssText = `
      color: white;
      text-decoration: underline;
      cursor: pointer;
      font-weight: 500;
    `;

		link.addEventListener("click", (e) => {
			e.preventDefault();
			chrome.runtime.sendMessage({ type: "OPEN_OPTIONS_PAGE" });
		});

		const endSpan = document.createElement("span");
		endSpan.textContent = ".";

		banner.appendChild(textSpan);
		banner.appendChild(link);
		banner.appendChild(endSpan);

		return banner;
	}

	private hideBanner(): void {
		// Clear auto-hide timeout
		if (this.autoHideTimeout) {
			clearTimeout(this.autoHideTimeout);
			this.autoHideTimeout = null;
		}

		if (this.currentBanner) {
			this.currentBanner.remove();
			this.currentBanner = null;
		}
	}

	cleanup(): void {
		this.hideBanner();
		// Clean up injected styles
		const progressStyles = document.querySelector("#nugget-progress-styles");
		if (progressStyles) {
			progressStyles.remove();
		}
	}
}
