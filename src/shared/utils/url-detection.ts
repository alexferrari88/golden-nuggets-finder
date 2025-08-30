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
