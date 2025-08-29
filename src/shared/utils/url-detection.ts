/**
 * URL detection and parsing utilities for golden nugget extraction
 */

/**
 * Comprehensive URL pattern that matches entire strings that are URLs
 * Supports http/https, with/without www, IP addresses, ports, paths, query params, fragments
 * Uses anchors (^ and $) to ensure the entire string is a URL, not just contains one
 */
export const URL_PATTERN =
	/^https?:\/\/(?:www\.)?(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})?(?::\d{1,5})?(?:[/?#][^\s]*)?$/i;

/**
 * More relaxed URL pattern for edge cases and partial URLs
 * Uses anchors (^ and $) to ensure the entire string is a URL, not just contains one
 */
export const RELAXED_URL_PATTERN =
	/^(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9][a-zA-Z0-9-]*(?:\.[a-zA-Z0-9][a-zA-Z0-9-]*)*\.[a-zA-Z]{2,}(?:[/?#][^\s]*)*$/i;

/**
 * URL pattern for extracting URLs from within text (without anchors)
 * Used by extractUrl() to find URLs embedded in text
 */
export const URL_EXTRACTION_PATTERN =
	/https?:\/\/(?:www\.)?(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})?(?::\d{1,5})?(?:[/?#][^\s]*)?/i;

/**
 * Interface for parsed URL components
 */
export interface ParsedUrl {
	protocol: string;
	domain: string;
	path: string;
	isValid: boolean;
	originalUrl: string;
}

/**
 * Detects if a string is entirely a URL (not text containing a URL)
 * @param text The text to check
 * @param strict Whether to use strict or relaxed pattern matching
 * @returns True if the entire text is a URL (not just contains one)
 */
export function isUrl(text: string, strict = true): boolean {
	const pattern = strict ? URL_PATTERN : RELAXED_URL_PATTERN;
	return pattern.test(text.trim());
}

/**
 * Extracts the first URL found in a string
 * @param text The text to search
 * @param strict Whether to use strict or relaxed pattern matching
 * @returns The first URL found, or null if none found
 */
export function extractUrl(text: string, strict = true): string | null {
	// Use extraction pattern (no anchors) to find URLs within text
	const pattern = strict
		? URL_EXTRACTION_PATTERN
		: RELAXED_URL_PATTERN.source.slice(1, -1); // Remove anchors
	const extractPattern = new RegExp(pattern, "i");
	const match = text.match(extractPattern);
	return match ? match[0] : null;
}

/**
 * Parses a URL into its meaningful components for boundary generation
 * @param url The URL to parse
 * @returns Parsed URL components
 */
export function parseUrl(url: string): ParsedUrl {
	try {
		// Ensure URL has protocol for proper parsing
		const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;
		const urlObj = new URL(normalizedUrl);

		const protocol = urlObj.protocol.replace(":", ""); // Remove trailing colon
		const domain = urlObj.hostname;
		const path = urlObj.pathname + urlObj.search + urlObj.hash;

		return {
			protocol,
			domain,
			path: path === "/" ? "" : path, // Simplify root path
			isValid: true,
			originalUrl: url,
		};
	} catch (_error) {
		// Fallback parsing for edge cases
		return {
			protocol: "",
			domain: url,
			path: "",
			isValid: false,
			originalUrl: url,
		};
	}
}

/**
 * Generates meaningful start and end boundaries for URL content
 * This ensures startContent !== endContent for highlighting purposes
 * @param url The URL to process
 * @returns Object with startContent and endContent boundaries
 */
export function generateUrlBoundaries(url: string): {
	startContent: string;
	endContent: string;
} {
	if (!isUrl(url)) {
		// Not a URL, return truncated versions to avoid identical boundaries
		const maxLength = 50;
		if (url.length <= maxLength && url.length > 10) {
			// For short text, use word-based splitting to ensure different boundaries
			const words = url.split(/\s+/);
			if (words.length > 1) {
				return {
					startContent: words.slice(0, Math.ceil(words.length / 2)).join(" "),
					endContent: words.slice(-Math.floor(words.length / 2)).join(" "),
				};
			}
			// Single word: use character-based split
			const mid = Math.floor(url.length / 2);
			return {
				startContent: url.slice(0, mid),
				endContent: url.slice(mid),
			};
		} else if (url.length <= 10) {
			// Very short content: force different boundaries
			return {
				startContent: url,
				endContent: url.length > 1 ? url.slice(1) : `${url}...`,
			};
		}
		return {
			startContent: url.slice(0, maxLength),
			endContent: url.slice(-20),
		};
	}

	const parsed = parseUrl(url);

	if (!parsed.isValid || !parsed.domain) {
		// Fallback for unparseable URLs
		return {
			startContent: url.slice(0, Math.min(30, url.length)),
			endContent: url.slice(-Math.min(20, url.length)),
		};
	}

	// Create meaningful boundaries using domain and path
	const domainPart = parsed.protocol
		? `${parsed.protocol}://${parsed.domain}`
		: parsed.domain;
	const pathPart = parsed.path || "/";

	// If path is just '/', use domain variations
	if (pathPart === "/" || pathPart === "") {
		return {
			startContent: domainPart,
			endContent: parsed.domain, // Just the domain without protocol
		};
	}

	// Use domain as start and path as end
	return {
		startContent: domainPart,
		endContent: pathPart,
	};
}

/**
 * Validates that start and end boundaries are different
 * @param startContent The start boundary
 * @param endContent The end boundary
 * @returns True if boundaries are different and valid for highlighting
 */
export function validateBoundaries(
	startContent: string,
	endContent: string,
): boolean {
	return (
		startContent !== endContent &&
		startContent.length > 0 &&
		endContent.length > 0
	);
}
