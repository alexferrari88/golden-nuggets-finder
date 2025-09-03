/**
 * Range Validation Utility for Golden Nugget Highlighting
 *
 * Provides utilities to validate DOM ranges and ensure they don't fall within
 * extension UI elements like sidebar, notifications, etc.
 */

/**
 * Check if a DOM range falls within excluded extension UI elements
 *
 * @param range The DOM range to validate
 * @returns true if the range is within excluded elements (should be rejected)
 */
export function isRangeInExcludedElement(range: Range): boolean {
	if (!range || !range.commonAncestorContainer) {
		return true; // Invalid range should be excluded
	}

	try {
		// Get the container element - handle both element and text nodes
		const container = range.commonAncestorContainer;
		const element =
			container.nodeType === Node.TEXT_NODE
				? container.parentElement
				: (container as Element);

		if (!element) {
			return true; // No element means we can't validate - exclude for safety
		}

		// Check if the element is detached from the document
		if (!document.contains(element)) {
			return true; // Exclude detached elements for safety
		}

		// Check if the element or any ancestor matches excluded selectors
		const excludedSelectors = [
			".nugget-sidebar", // Main sidebar
			".golden-nugget-notification", // Notification banners
			".golden-nugget-highlight", // Mark.js highlighted elements (avoid circular highlighting)
			"[data-golden-nugget-ui]", // Any element marked as extension UI
		];

		return excludedSelectors.some((selector) => {
			try {
				return element.closest(selector) !== null;
			} catch (error) {
				// If selector fails, err on side of caution
				console.warn(
					"[RangeValidation] Failed to check selector:",
					selector,
					error,
				);
				return false;
			}
		});
	} catch (error) {
		console.warn("[RangeValidation] Error validating range:", error);
		return true; // Exclude ranges that cause validation errors
	}
}

/**
 * Filter an array of ranges to exclude those within extension UI elements
 *
 * @param ranges Array of DOM ranges to filter
 * @returns Array of valid ranges (not in excluded elements)
 */
export function filterValidRanges(ranges: Range[]): Range[] {
	return ranges.filter((range) => !isRangeInExcludedElement(range));
}

/**
 * Validate that at least one range in an array is valid (not in excluded elements)
 *
 * @param ranges Array of DOM ranges to check
 * @returns true if at least one range is valid
 */
export function hasValidRanges(ranges: Range[]): boolean {
	return ranges.some((range) => !isRangeInExcludedElement(range));
}
