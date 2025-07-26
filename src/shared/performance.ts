/**
 * Performance monitoring utilities for the Golden Nugget Finder extension
 */
import { isDevMode } from "./debug";

export class PerformanceMonitor {
	private static instance: PerformanceMonitor;
	private metrics: Map<string, number[]> = new Map();
	private timers: Map<string, number> = new Map();
	private enabled: boolean = false;

	static getInstance(): PerformanceMonitor {
		if (!PerformanceMonitor.instance) {
			PerformanceMonitor.instance = new PerformanceMonitor();
		}
		return PerformanceMonitor.instance;
	}

	enable(): void {
		this.enabled = true;
		console.log("Performance monitoring enabled");
	}

	disable(): void {
		this.enabled = false;
		console.log("Performance monitoring disabled");
	}

	startTimer(name: string): void {
		if (!this.enabled) return;
		this.timers.set(name, performance.now());
	}

	endTimer(name: string): number {
		if (!this.enabled) return 0;

		const startTime = this.timers.get(name);
		if (!startTime) {
			console.warn(`Timer '${name}' was not started`);
			return 0;
		}

		const duration = performance.now() - startTime;
		this.timers.delete(name);

		// Store metric
		if (!this.metrics.has(name)) {
			this.metrics.set(name, []);
		}
		this.metrics.get(name)?.push(duration);

		// Keep only last 100 measurements
		const measurements = this.metrics.get(name)!;
		if (measurements.length > 100) {
			measurements.shift();
		}

		return duration;
	}

	logTimer(name: string, context?: string): number {
		const duration = this.endTimer(name);
		if (this.enabled && duration > 0) {
			console.log(
				`[Performance] ${name}: ${duration.toFixed(2)}ms${context ? ` (${context})` : ""}`,
			);
		}
		return duration;
	}

	getMetrics(
		name: string,
	): { avg: number; min: number; max: number; count: number } | null {
		if (!this.enabled) return null;

		const measurements = this.metrics.get(name);
		if (!measurements || measurements.length === 0) {
			return null;
		}

		const sum = measurements.reduce((a, b) => a + b, 0);
		const avg = sum / measurements.length;
		const min = Math.min(...measurements);
		const max = Math.max(...measurements);

		return { avg, min, max, count: measurements.length };
	}

	getAllMetrics(): Record<
		string,
		{ avg: number; min: number; max: number; count: number }
	> {
		if (!this.enabled) return {};

		const result: Record<
			string,
			{ avg: number; min: number; max: number; count: number }
		> = {};

		for (const [name] of this.metrics) {
			const metrics = this.getMetrics(name);
			if (metrics) {
				result[name] = metrics;
			}
		}

		return result;
	}

	logAllMetrics(): void {
		if (!this.enabled) return;

		console.log("[Performance] Metrics Summary:");
		const allMetrics = this.getAllMetrics();

		for (const [name, metrics] of Object.entries(allMetrics)) {
			console.log(
				`[Performance] ${name}: avg=${metrics.avg.toFixed(2)}ms, min=${metrics.min.toFixed(2)}ms, max=${metrics.max.toFixed(2)}ms, count=${metrics.count}`,
			);
		}
	}

	measureMemory(): void {
		if (!this.enabled) return;

		// @ts-ignore - performance.memory is available in Chrome
		if (performance.memory) {
			// @ts-ignore
			const { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit } =
				performance.memory;
			console.log(
				`[Memory] Used: ${(usedJSHeapSize / 1024 / 1024).toFixed(2)}MB, Total: ${(totalJSHeapSize / 1024 / 1024).toFixed(2)}MB, Limit: ${(jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB`,
			);
		}
	}

	clearMetrics(): void {
		this.metrics.clear();
		this.timers.clear();
	}
}

// Global performance monitor instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Helper functions for common performance monitoring patterns
export function withPerformanceMonitoring<T>(
	name: string,
	fn: () => T | Promise<T>,
	context?: string,
): T | Promise<T> {
	performanceMonitor.startTimer(name);

	try {
		const result = fn();

		if (result instanceof Promise) {
			return result.finally(() => {
				performanceMonitor.logTimer(name, context);
			});
		} else {
			performanceMonitor.logTimer(name, context);
			return result;
		}
	} catch (error) {
		performanceMonitor.logTimer(name, context);
		throw error;
	}
}

export function measureDOMOperation<T>(name: string, fn: () => T): T {
	return withPerformanceMonitoring(`DOM:${name}`, fn, "DOM operation");
}

export function measureAPICall<T>(
	name: string,
	fn: () => Promise<T>,
): Promise<T> {
	return withPerformanceMonitoring(`API:${name}`, fn, "API call") as Promise<T>;
}

export function measureContentExtraction<T>(
	name: string,
	fn: () => T | Promise<T>,
): T | Promise<T> {
	return withPerformanceMonitoring(`Extract:${name}`, fn, "Content extraction");
}

export function measureHighlighting<T>(name: string, fn: () => T): T {
	return withPerformanceMonitoring(
		`Highlight:${name}`,
		fn,
		"Text highlighting",
	);
}

// Auto-enable performance monitoring in development (only if chrome APIs are available)
try {
	if (typeof chrome !== "undefined" && chrome.runtime && isDevMode()) {
		performanceMonitor.enable();
	}
} catch {
	// Ignore errors during build time
}
