import { UI_CONSTANTS } from '../../shared/constants';

export class NotificationManager {
  private currentBanner: HTMLElement | null = null;

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
    setTimeout(() => {
      this.hideBanner();
    }, UI_CONSTANTS.NOTIFICATION_TIMEOUT);
  }

  showApiKeyError(): void {
    this.hideBanner();
    this.currentBanner = this.createApiKeyErrorBanner();
    document.body.appendChild(this.currentBanner);
    
    // Auto-hide error after timeout
    setTimeout(() => {
      this.hideBanner();
    }, UI_CONSTANTS.NOTIFICATION_TIMEOUT);
  }

  showInfo(message: string): void {
    this.hideBanner();
    this.currentBanner = this.createBanner(message, 'info');
    document.body.appendChild(this.currentBanner);
    
    // Auto-hide info after timeout
    setTimeout(() => {
      this.hideBanner();
    }, UI_CONSTANTS.NOTIFICATION_TIMEOUT);
  }

  hideProgress(): void {
    if (this.currentBanner) {
      this.hideBanner();
    }
  }

  private createBanner(message: string, type: 'progress' | 'error' | 'info'): HTMLElement {
    const banner = document.createElement('div');
    banner.className = `nugget-notification-banner nugget-banner-${type}`;
    banner.textContent = message;
    
    const baseStyles = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      padding: 12px 24px;
      border-radius: 4px;
      z-index: ${UI_CONSTANTS.BANNER_Z_INDEX};
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 500;
      max-width: 400px;
      text-align: center;
    `;
    
    let typeStyles = '';
    switch (type) {
      case 'progress':
        typeStyles = `
          background: #4CAF50;
          color: white;
        `;
        break;
      case 'error':
        typeStyles = `
          background: #f44336;
          color: white;
        `;
        break;
      case 'info':
        typeStyles = `
          background: #2196F3;
          color: white;
        `;
        break;
    }
    
    banner.style.cssText = baseStyles + typeStyles;
    return banner;
  }

  private createApiKeyErrorBanner(): HTMLElement {
    const banner = document.createElement('div');
    banner.className = 'nugget-notification-banner nugget-banner-api-key-error';
    
    const baseStyles = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      padding: 12px 24px;
      border-radius: 4px;
      z-index: ${UI_CONSTANTS.BANNER_Z_INDEX};
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 500;
      max-width: 400px;
      text-align: center;
      background: #f44336;
      color: white;
    `;
    
    banner.style.cssText = baseStyles;
    
    // Create text content with link
    const textSpan = document.createElement('span');
    textSpan.textContent = 'Gemini API key not configured. Please set it in the ';
    
    const link = document.createElement('a');
    link.textContent = 'options page';
    link.style.cssText = `
      color: white;
      text-decoration: underline;
      cursor: pointer;
      font-weight: 500;
    `;
    
    link.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.runtime.openOptionsPage();
    });
    
    const endSpan = document.createElement('span');
    endSpan.textContent = '.';
    
    banner.appendChild(textSpan);
    banner.appendChild(link);
    banner.appendChild(endSpan);
    
    return banner;
  }

  private hideBanner(): void {
    if (this.currentBanner) {
      this.currentBanner.remove();
      this.currentBanner = null;
    }
  }

  cleanup(): void {
    this.hideBanner();
  }
}