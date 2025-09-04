import type { LoggerInterface } from '@golden-nuggets/core';
import { debugLogger } from '../shared/debug';

export class ChromeLogger implements LoggerInterface {
  debug(message: string, data?: any): void {
    debugLogger.log(`[DEBUG] ${message}`, data);
  }

  info(message: string, data?: any): void {
    debugLogger.log(`[INFO] ${message}`, data);
  }

  warn(message: string, data?: any): void {
    debugLogger.warn(`[WARN] ${message}`, data);
  }

  error(message: string, error?: Error): void {
    if (error) {
      debugLogger.error(`[ERROR] ${message}`, error);
    } else {
      debugLogger.error(`[ERROR] ${message}`);
    }
  }
}