/**
 * Adapter Layer for Enhanced Text Matching
 *
 * Provides backward compatibility for existing code while enabling gradual migration
 * to the enhanced text matching system. This adapter preserves all existing function
 * signatures and return types while internally using the new robust matching system.
 */

import {
	advancedNormalize,
	getDisplayContent,
	getNormalizedContent,
	improvedStartEndMatching,
	improvedStartEndTextMatching,
	type MatchResult,
	reconstructFullContent,
	sanitizeEndContent,
} from "./content-reconstruction";
import {
	createRobustTextMatcher,
	type EnhancedMatchResult,
	enhancedTextMatching,
	type RobustTextMatcher,
} from "./enhanced-text-matching";
import { fuzzyMatch } from "./fuzzy-matching";
import type { GoldenNugget } from "./types";

/**
 * Configuration for the adapter layer
 */
export interface AdapterConfig {
	/** Enable the enhanced matching system (feature flag) */
	useEnhancedMatching: boolean;
	/** Fallback to original system on enhanced system failure */
	enableFallback: boolean;
	/** Log performance comparisons between old and new systems */
	enablePerformanceComparison: boolean;
	/** Threshold for deciding when enhanced system should be preferred */
	enhancedSystemThreshold: number;
}

/**
 * Default adapter configuration
 */
export const DEFAULT_ADAPTER_CONFIG: AdapterConfig = {
	useEnhancedMatching: true, // Enable by default - hobby project, let's use it!
	enableFallback: true, // Always enable fallback for safety
	enablePerformanceComparison: false, // Disable by default to avoid console noise in tests
	enhancedSystemThreshold: 0.7, // Standard threshold for production reliability
};

/**
 * Global adapter configuration
 */
let globalAdapterConfig: AdapterConfig = { ...DEFAULT_ADAPTER_CONFIG };

/**
 * Configure the adapter behavior globally
 */
export function configureAdapter(config: Partial<AdapterConfig>): void {
	globalAdapterConfig = { ...globalAdapterConfig, ...config };
}

/**
 * Get current adapter configuration
 */
export function getAdapterConfig(): AdapterConfig {
	return { ...globalAdapterConfig };
}

/**
 * Enhanced version of improvedStartEndMatching with adapter logic
 * Maintains exact same API as original function
 */
export async function enhancedImprovedStartEndMatching(
	startContent: string,
	endContent: string,
	pageContent: string,
	config?: Partial<AdapterConfig>,
): Promise<MatchResult> {
	const configToUse = config
		? { ...globalAdapterConfig, ...config }
		: globalAdapterConfig;

	// Always try original system first for comparison (if enabled)
	let originalResult: MatchResult | null = null;
	let originalTime = 0;

	if (configToUse.enablePerformanceComparison) {
		const originalStart = performance.now();
		originalResult = improvedStartEndMatching(
			startContent,
			endContent,
			pageContent,
		);
		originalTime = performance.now() - originalStart;
	}

	// Try enhanced system if enabled
	if (configToUse.useEnhancedMatching) {
		try {
			const enhancedStart = performance.now();
			const enhancedResult = await enhancedTextMatching(
				startContent,
				endContent,
				pageContent,
			);
			const enhancedTime = performance.now() - enhancedStart;

			// Convert enhanced result to original format
			const adaptedResult: MatchResult = {
				success: enhancedResult.success,
				found: enhancedResult.success,
				startIndex: enhancedResult.startIndex,
				endIndex: enhancedResult.endIndex,
				matchedContent: enhancedResult.matchedContent,
				reason: enhancedResult.reason,
			};

			// Use enhanced result if it meets confidence threshold
			if (
				enhancedResult.success &&
				enhancedResult.confidence >= configToUse.enhancedSystemThreshold
			) {
				if (configToUse.enablePerformanceComparison && originalResult) {
					console.log("Enhanced system performance:", {
						enhanced: {
							time: enhancedTime,
							strategy: enhancedResult.strategy,
							confidence: enhancedResult.confidence,
						},
						original: { time: originalTime, success: originalResult.success },
						improvement: originalTime - enhancedTime,
					});
				}

				return adaptedResult;
			}

			// Fall back to original system if enhanced system confidence is low
			if (configToUse.enableFallback) {
				const fallbackResult =
					originalResult ||
					improvedStartEndMatching(startContent, endContent, pageContent);

				if (configToUse.enablePerformanceComparison) {
					console.log("Falling back to original system:", {
						enhanced: {
							confidence: enhancedResult.confidence,
							reason: enhancedResult.reason,
						},
						fallback: { success: fallbackResult.success },
					});
				}

				return fallbackResult;
			}

			return adaptedResult;
		} catch (error) {
			console.warn(
				"Enhanced matching system error, falling back to original:",
				error,
			);

			// Always fall back on error
			return (
				originalResult ||
				improvedStartEndMatching(startContent, endContent, pageContent)
			);
		}
	}

	// Use original system only
	return (
		originalResult ||
		improvedStartEndMatching(startContent, endContent, pageContent)
	);
}

/**
 * Enhanced version of improvedStartEndTextMatching with adapter logic
 * Maintains exact same API as original function
 */
export async function enhancedImprovedStartEndTextMatching(
	textToFind: string,
	pageContent: string,
	config?: Partial<AdapterConfig>,
): Promise<boolean> {
	const configToUse = config
		? { ...globalAdapterConfig, ...config }
		: globalAdapterConfig;

	// Always try original system first for comparison (if enabled)
	let originalResult = false;
	let originalTime = 0;

	if (configToUse.enablePerformanceComparison) {
		const originalStart = performance.now();
		// Create synthetic nugget for compatibility
		const syntheticNugget: GoldenNugget = {
			type: "tool" as const,
			startContent: textToFind.split(" ").slice(0, 3).join(" "),
			endContent: textToFind.split(" ").slice(-3).join(" "),
		};
		originalResult = improvedStartEndTextMatching(syntheticNugget, pageContent);
		originalTime = performance.now() - originalStart;
	}

	// Try enhanced system if enabled
	if (configToUse.useEnhancedMatching) {
		try {
			const enhancedStart = performance.now();
			// For single text matching, we use the text as both start and end
			// This is a simplified approach for text content matching
			const enhancedResult = await enhancedTextMatching(
				textToFind,
				textToFind,
				pageContent,
			);
			const enhancedTime = performance.now() - enhancedStart;

			// Convert enhanced result to boolean
			const success =
				enhancedResult.success &&
				enhancedResult.confidence >= configToUse.enhancedSystemThreshold;

			if (configToUse.enablePerformanceComparison) {
				console.log("Enhanced text matching performance:", {
					enhanced: {
						time: enhancedTime,
						success,
						confidence: enhancedResult.confidence,
					},
					original: { time: originalTime, success: originalResult },
				});
			}

			// Use enhanced result if it meets threshold or original failed
			if (success || (!originalResult && configToUse.enableFallback)) {
				return success;
			}

			// Fall back to original system
			if (configToUse.enableFallback) {
				return originalResult;
			}

			return success;
		} catch (error) {
			console.warn(
				"Enhanced text matching error, falling back to original:",
				error,
			);

			// Always fall back on error - create synthetic nugget for fallback
			const syntheticNugget: GoldenNugget = {
				type: "tool" as const,
				startContent: textToFind.split(" ").slice(0, 3).join(" "),
				endContent: textToFind.split(" ").slice(-3).join(" "),
			};
			return (
				originalResult ||
				improvedStartEndTextMatching(syntheticNugget, pageContent)
			);
		}
	}

	// Use original system only - create synthetic nugget
	const syntheticNugget: GoldenNugget = {
		type: "tool" as const,
		startContent: textToFind.split(" ").slice(0, 3).join(" "),
		endContent: textToFind.split(" ").slice(-3).join(" "),
	};
	return (
		originalResult || improvedStartEndTextMatching(syntheticNugget, pageContent)
	);
}

/**
 * Enhanced version of reconstructFullContent with adapter logic
 * Maintains exact same API as original function
 */
export async function enhancedReconstructFullContent(
	nugget: GoldenNugget,
	pageContent: string,
): Promise<string> {
	const configToUse = globalAdapterConfig;

	// Always try original system first for comparison (if enabled)
	let originalResult = "";
	let originalTime = 0;

	if (configToUse.enablePerformanceComparison) {
		const originalStart = performance.now();
		originalResult = reconstructFullContent(nugget, pageContent);
		originalTime = performance.now() - originalStart;
	}

	// Try enhanced system if enabled
	if (configToUse.useEnhancedMatching) {
		try {
			const enhancedStart = performance.now();
			const enhancedResult = await enhancedTextMatching(
				nugget.startContent,
				nugget.endContent,
				pageContent,
			);
			const enhancedTime = performance.now() - enhancedStart;

			// Use enhanced result if successful and confident
			if (
				enhancedResult.success &&
				enhancedResult.confidence >= configToUse.enhancedSystemThreshold
			) {
				const reconstructedContent = enhancedResult.matchedContent;

				if (configToUse.enablePerformanceComparison) {
					console.log("Enhanced reconstruction performance:", {
						enhanced: {
							time: enhancedTime,
							length: reconstructedContent.length,
							confidence: enhancedResult.confidence,
						},
						original: { time: originalTime, length: originalResult.length },
					});
				}

				// Only use if significantly longer than fallback
				const fallbackLength = `${nugget.startContent}...${nugget.endContent}`
					.length;
				if (reconstructedContent.length > fallbackLength + 10) {
					return reconstructedContent;
				}
			}

			// Fall back to original system
			if (configToUse.enableFallback) {
				return originalResult || reconstructFullContent(nugget, pageContent);
			}

			// Return enhanced result even if not confident
			return enhancedResult.success
				? enhancedResult.matchedContent
				: `${nugget.startContent}...${nugget.endContent}`;
		} catch (error) {
			console.warn(
				"Enhanced reconstruction error, falling back to original:",
				error,
			);

			// Always fall back on error
			return originalResult || reconstructFullContent(nugget, pageContent);
		}
	}

	// Use original system only
	return originalResult || reconstructFullContent(nugget, pageContent);
}

/**
 * Enhanced version of getDisplayContent with adapter logic
 * Maintains exact same API as original function
 */
export async function enhancedGetDisplayContent(
	nugget: GoldenNugget,
	pageContent?: string,
): Promise<string> {
	if (!pageContent) {
		// No enhancement possible without page content
		return getDisplayContent(nugget, pageContent);
	}

	try {
		const reconstructed = await enhancedReconstructFullContent(
			nugget,
			pageContent,
		);

		// Only use reconstructed content if significantly longer than truncated version
		if (
			reconstructed &&
			reconstructed.length >
				nugget.startContent.length + nugget.endContent.length + 10
		) {
			return reconstructed;
		}
	} catch (error) {
		console.warn("Enhanced display content error, using original:", error);
	}

	// Fall back to original implementation
	return getDisplayContent(nugget, pageContent);
}

/**
 * Enhanced version of getNormalizedContent with adapter logic
 * Maintains exact same API as original function
 */
export async function enhancedGetNormalizedContent(
	nugget: GoldenNugget,
	pageContent?: string,
): Promise<string> {
	if (!pageContent) {
		// No enhancement possible without page content
		return getNormalizedContent(nugget, pageContent);
	}

	try {
		const reconstructed = await enhancedReconstructFullContent(
			nugget,
			pageContent,
		);

		if (
			reconstructed &&
			reconstructed.length >
				nugget.startContent.length + nugget.endContent.length + 10
		) {
			return advancedNormalize(reconstructed);
		}
	} catch (error) {
		console.warn("Enhanced normalized content error, using original:", error);
	}

	// Fall back to original implementation
	return getNormalizedContent(nugget, pageContent);
}

/**
 * Enhanced fuzzy matching with adapter logic
 * Maintains exact same API as original function but with enhanced algorithms
 */
export async function enhancedFuzzyMatch(
	text: string,
	target: string,
	tolerance = 0.8,
): Promise<boolean> {
	const configToUse = globalAdapterConfig;

	// Always try original for comparison
	let originalResult = false;
	if (configToUse.enablePerformanceComparison) {
		originalResult = fuzzyMatch(text, target, tolerance);
	}

	// Try enhanced system if enabled
	if (configToUse.useEnhancedMatching) {
		try {
			// Use enhanced text matching for fuzzy logic
			const enhancedResult = await enhancedTextMatching(target, target, text, {
				fuzzyThreshold: 1.0 - tolerance, // Convert tolerance to Fuse.js threshold
			});

			const success =
				enhancedResult.success && enhancedResult.confidence >= tolerance;

			if (configToUse.enablePerformanceComparison) {
				console.log("Enhanced fuzzy match performance:", {
					enhanced: { success, confidence: enhancedResult.confidence },
					original: originalResult,
					agreement: success === originalResult,
				});
			}

			return success;
		} catch (error) {
			console.warn(
				"Enhanced fuzzy match error, falling back to original:",
				error,
			);
		}
	}

	// Fall back to original
	return originalResult || fuzzyMatch(text, target, tolerance);
}

/**
 * Create an enhanced text matcher instance for DOM-based operations
 * This is a new API that provides access to the full enhanced system
 */
export function createEnhancedTextMatcher(): RobustTextMatcher {
	return createRobustTextMatcher();
}

/**
 * Adapter for DOM-based text matching with Range creation
 * This provides a bridge between the existing DOM-based approach and the new system
 */
export class EnhancedTextMatcherAdapter {
	private matcher: RobustTextMatcher;

	constructor() {
		this.matcher = createRobustTextMatcher();
	}

	/**
	 * Initialize with DOM content (compatible with existing highlighter)
	 */
	initializeWithDOM(): void {
		this.matcher.initializeContent();
	}

	/**
	 * Find text range in DOM and return a Range object
	 * Compatible with existing highlighter.findTextInDOM signature
	 */
	async findTextInDOM(
		startContent: string,
		endContent: string,
	): Promise<Range | null> {
		try {
			const result = await this.matcher.findTextRange(startContent, endContent);

			if (!result.success) {
				return null;
			}

			// Create Range from the enhanced result
			return this.matcher.createRangeFromMatch(result);
		} catch (error) {
			console.warn("Enhanced DOM text matching error:", error);
			return null;
		}
	}

	/**
	 * Get matching statistics for debugging
	 */
	getStats(): {
		textNodes: number;
		textLength: number;
		fuseInstance: boolean;
	} {
		return {
			textNodes: this.matcher.getTextNodes().length,
			textLength: this.matcher.getFullText().length,
			fuseInstance: !!this.matcher.getFuseInstance(),
		};
	}
}

/**
 * Feature flag functions for controlling adapter behavior
 */
export const FeatureFlags = {
	/**
	 * Enable enhanced matching system globally
	 */
	enableEnhancedMatching(): void {
		configureAdapter({ useEnhancedMatching: true });
	},

	/**
	 * Disable enhanced matching system globally (rollback)
	 */
	disableEnhancedMatching(): void {
		configureAdapter({ useEnhancedMatching: false });
	},

	/**
	 * Enable performance comparison logging
	 */
	enablePerformanceComparison(): void {
		configureAdapter({ enablePerformanceComparison: true });
	},

	/**
	 * Disable performance comparison logging
	 */
	disablePerformanceComparison(): void {
		configureAdapter({ enablePerformanceComparison: false });
	},

	/**
	 * Set confidence threshold for enhanced system
	 */
	setConfidenceThreshold(threshold: number): void {
		configureAdapter({
			enhancedSystemThreshold: Math.max(0, Math.min(1, threshold)),
		});
	},

	/**
	 * Get current feature flag status
	 */
	getStatus(): AdapterConfig & { version: string } {
		return {
			...getAdapterConfig(),
			version: "1.0.0",
		};
	},
};

/**
 * Migration utilities for gradual rollout
 */
export const MigrationUtils = {
	/**
	 * Test enhanced system against original with given inputs
	 */
	async testComparison(
		startContent: string,
		endContent: string,
		pageContent: string,
	): Promise<{
		original: MatchResult;
		enhanced: EnhancedMatchResult;
		recommendation: "use_enhanced" | "use_original" | "equivalent";
	}> {
		// Test original system
		const originalStart = performance.now();
		const original = improvedStartEndMatching(
			startContent,
			endContent,
			pageContent,
		);
		const originalTime = performance.now() - originalStart;

		// Test enhanced system
		const enhancedStart = performance.now();
		const enhanced = await enhancedTextMatching(
			startContent,
			endContent,
			pageContent,
		);
		const enhancedTime = performance.now() - enhancedStart;

		// Determine recommendation
		let recommendation: "use_enhanced" | "use_original" | "equivalent" =
			"equivalent";

		if (enhanced.success && !original.success) {
			recommendation = "use_enhanced";
		} else if (original.success && !enhanced.success) {
			recommendation = "use_original";
		} else if (enhanced.success && original.success) {
			// Both succeeded, compare confidence and performance
			if (enhanced.confidence > 0.8 && enhancedTime < originalTime * 1.2) {
				recommendation = "use_enhanced";
			} else if (originalTime < enhancedTime * 1.2) {
				recommendation = "use_original";
			}
		}

		return {
			original: {
				...original,
				performanceMs: originalTime,
			},
			enhanced,
			recommendation,
		};
	},

	/**
	 * Batch test multiple examples
	 */
	async batchTest(
		examples: Array<{
			startContent: string;
			endContent: string;
			pageContent: string;
			name?: string;
		}>,
	): Promise<{
		summary: {
			total: number;
			enhanced_better: number;
			original_better: number;
			equivalent: number;
		};
		details: Array<any>;
	}> {
		const results = [];
		const summary = {
			total: 0,
			enhanced_better: 0,
			original_better: 0,
			equivalent: 0,
		};

		for (const [index, example] of examples.entries()) {
			const result = await this.testComparison(
				example.startContent,
				example.endContent,
				example.pageContent,
			);

			results.push({
				name: example.name || `Test ${index + 1}`,
				...result,
			});

			summary.total++;
			if (result.recommendation === "use_enhanced") {
				summary.enhanced_better++;
			} else if (result.recommendation === "use_original") {
				summary.original_better++;
			} else {
				summary.equivalent++;
			}
		}

		return { summary, details: results };
	},
};

/**
 * Export enhanced versions as default for gradual migration
 */
export {
	// Re-export original functions for compatibility
	advancedNormalize,
	sanitizeEndContent,
	improvedStartEndMatching,
	reconstructFullContent,
	getDisplayContent,
	getNormalizedContent,
	improvedStartEndTextMatching,
	fuzzyMatch,
	// Export enhanced versions with different names for opt-in migration
	enhancedImprovedStartEndMatching as improvedStartEndMatchingV2,
	enhancedImprovedStartEndTextMatching as improvedStartEndTextMatchingV2,
	enhancedReconstructFullContent as reconstructFullContentV2,
	enhancedGetDisplayContent as getDisplayContentV2,
	enhancedGetNormalizedContent as getNormalizedContentV2,
	enhancedFuzzyMatch as fuzzyMatchV2,
};
