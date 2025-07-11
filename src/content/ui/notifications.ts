import { applyNotificationStyles, colors, zIndex } from './tailwind-utils';

export class NotificationManager {
  private currentBanner: HTMLElement | null = null;
  private autoHideTimeout: number | null = null;

  showProgress(message: string): void {
    this.hideBanner();
    this.currentBanner = this.createBanner(message, 'progress');
    document.body.appendChild(this.currentBanner);
  }

  showError(message: string): void {
    this.hideBanner();
    this.currentBanner = this.createBanner(message, 'error');
    document.body.appendChild(this.currentBanner);
    
    // Auto-hide error after timeout
    this.autoHideTimeout = setTimeout(() => {
      this.hideBanner();
    }, 5000); // 5 seconds timeout
  }

  showApiKeyError(): void {
    this.hideBanner();
    this.currentBanner = this.createApiKeyErrorBanner();
    document.body.appendChild(this.currentBanner);
    
    // Auto-hide error after timeout
    this.autoHideTimeout = setTimeout(() => {
      this.hideBanner();
    }, 5000); // 5 seconds timeout
  }

  showInfo(message: string): void {
    this.hideBanner();
    this.currentBanner = this.createBanner(message, 'info');
    document.body.appendChild(this.currentBanner);
    
    // Auto-hide info after timeout
    this.autoHideTimeout = setTimeout(() => {
      this.hideBanner();
    }, 5000); // 5 seconds timeout
  }

  hideProgress(): void {
    if (this.currentBanner) {
      this.hideBanner();
    }
  }

  hide(): void {
    this.hideBanner();
  }

  private createBanner(message: string, type: 'progress' | 'error' | 'info'): HTMLElement {
    const banner = document.createElement('div');
    banner.className = `nugget-notification-banner nugget-banner-${type}`;
    
    // Apply notification styles using the tailwind utility
    applyNotificationStyles(banner, { type: type, position: 'top' });
    
    // Add gap for content alignment
    banner.classList.add('gap-2');
    
    // Add dynamic content based on type
    if (type === 'progress') {
      this.addProgressAnimation(banner, message);
    } else {
      banner.textContent = message;
    }
    
    return banner;
  }

  private addProgressAnimation(banner: HTMLElement, message: string): void {
    // Add text element
    const textElement = document.createElement('span');
    textElement.textContent = message;
    banner.appendChild(textElement);
    
    // Add animated dots
    const dotsContainer = document.createElement('div');
    dotsContainer.classList.add('flex', 'gap-0.5', 'items-center');
    
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('div');
      dot.classList.add('w-1', 'h-1', 'rounded-full', 'bg-white');
      dot.style.cssText = `
        animation: nugget-pulse 1.5s ease-in-out infinite;
        animation-delay: ${i * 0.2}s;
      `;
      dotsContainer.appendChild(dot);
    }
    
    banner.appendChild(dotsContainer);
    
    // Add CSS animation styles
    if (!document.querySelector('#nugget-progress-styles')) {
      const style = document.createElement('style');
      style.id = 'nugget-progress-styles';
      style.textContent = `
        @keyframes nugget-pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `;
      document.head.appendChild(style);
    }
  }

  private createApiKeyErrorBanner(): HTMLElement {
    const banner = document.createElement('div');
    banner.className = 'nugget-notification-banner nugget-banner-api-key-error';
    
    // Apply notification styles using the tailwind utility
    applyNotificationStyles(banner, { type: 'error', position: 'top' });
    
    // Create text content with link
    const textSpan = document.createElement('span');
    textSpan.textContent = 'Gemini API key not configured. Please set it in the ';
    
    const link = document.createElement('a');
    link.textContent = 'options page';
    link.classList.add('text-white', 'underline', 'cursor-pointer', 'font-medium');
    
    link.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS_PAGE' });
    });
    
    const endSpan = document.createElement('span');
    endSpan.textContent = '.';
    
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
    const progressStyles = document.querySelector('#nugget-progress-styles');
    if (progressStyles) {
      progressStyles.remove();
    }
  }
}