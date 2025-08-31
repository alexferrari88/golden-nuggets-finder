/**
 * DOMPositionMapper - Convert global text positions to DOM Ranges across multiple nodes
 * Enables highlighting of text that spans multiple DOM nodes by implementing
 * position-to-range mapping and enhanced range construction.
 */

export class DOMPositionMapper {
	/**
	 * Convert global text offsets to DOM Ranges that can span multiple nodes
	 * @param startOffset Global character offset where the text starts
	 * @param endOffset Global character offset where the text ends
	 * @returns Array of Range objects covering the specified text span
	 */
	static convertOffsetToRange(startOffset: number, endOffset: number): Range[] {
		if (startOffset < 0 || endOffset <= startOffset) {
			return [];
		}

		// Create a tree walker to traverse all text nodes
		const walker = document.createTreeWalker(
			document.body,
			NodeFilter.SHOW_TEXT,
			{ acceptNode: DOMPositionMapper.acceptTextNode },
		);

		// Build offset-to-node mapping
		const textNodes: Text[] = [];
		const nodeOffsets: number[] = [];
		DOMPositionMapper.buildTextNodeMapping(walker, textNodes, nodeOffsets);

		if (textNodes.length === 0) {
			return [];
		}

		return DOMPositionMapper.createRangesFromOffsets(
			textNodes,
			nodeOffsets,
			startOffset,
			endOffset,
		);
	}

	/**
	 * Filter function for text nodes - accepts visible text nodes while rejecting
	 * script, style, and other non-visible content
	 */
	private static acceptTextNode(node: Text): number {
		const parent = node.parentElement;
		if (!parent) {
			return NodeFilter.FILTER_REJECT;
		}

		// Reject script and style elements
		const tagName = parent.tagName?.toLowerCase();
		if (tagName === "script" || tagName === "style" || tagName === "noscript") {
			return NodeFilter.FILTER_REJECT;
		}

		// Reject empty or whitespace-only text nodes
		const textContent = node.textContent;
		if (!textContent || textContent.trim().length === 0) {
			return NodeFilter.FILTER_REJECT;
		}

		// Check if parent element is hidden
		const style = window.getComputedStyle(parent);
		if (
			style.display === "none" ||
			style.visibility === "hidden" ||
			style.opacity === "0"
		) {
			return NodeFilter.FILTER_REJECT;
		}

		return NodeFilter.FILTER_ACCEPT;
	}

	/**
	 * Build mapping of text nodes to their global text offsets
	 */
	private static buildTextNodeMapping(
		walker: TreeWalker,
		textNodes: Text[],
		nodeOffsets: number[],
	): void {
		let currentOffset = 0;
		let node: Text | null;

		while ((node = walker.nextNode() as Text | null)) {
			const text = node.textContent || "";
			textNodes.push(node);
			nodeOffsets.push(currentOffset);
			currentOffset += text.length;
		}
	}

	/**
	 * Create DOM Ranges from global offsets using the text node mapping
	 * Handles text that spans multiple nodes by creating multiple ranges
	 */
	private static createRangesFromOffsets(
		textNodes: Text[],
		nodeOffsets: number[],
		startOffset: number,
		endOffset: number,
	): Range[] {
		const ranges: Range[] = [];

		// Find all text nodes that overlap with our target range
		for (let i = 0; i < textNodes.length; i++) {
			const nodeStartOffset = nodeOffsets[i];
			const nodeText = textNodes[i].textContent || "";
			const nodeEndOffset = nodeStartOffset + nodeText.length;

			// Check if this node overlaps with our target range
			if (nodeStartOffset < endOffset && nodeEndOffset > startOffset) {
				// Calculate local positions within this text node
				const localStart = Math.max(0, startOffset - nodeStartOffset);
				const localEnd = Math.min(nodeText.length, endOffset - nodeStartOffset);

				// Create range if we have valid positions
				if (localStart < localEnd && localEnd <= nodeText.length) {
					try {
						const range = document.createRange();
						range.setStart(textNodes[i], localStart);
						range.setEnd(textNodes[i], localEnd);
						ranges.push(range);

						console.log("[DOMPositionMapper] Created range:", {
							nodeText: `${nodeText.substring(0, 30)}...`,
							localStart,
							localEnd,
							rangeText: nodeText.substring(localStart, localEnd),
							globalStart: nodeStartOffset + localStart,
							globalEnd: nodeStartOffset + localEnd,
						});
					} catch (error) {
						console.warn("[DOMPositionMapper] Failed to create range:", error, {
							nodeText: nodeText.substring(0, 30),
							localStart,
							localEnd,
							nodeLength: nodeText.length,
						});
					}
				}
			}
		}

		console.log(
			`[DOMPositionMapper] Created ${ranges.length} ranges for offset ${startOffset}-${endOffset}`,
		);
		return ranges;
	}

	/**
	 * Enhanced version that attempts to merge adjacent ranges for better performance
	 * This is useful when text spans many small text nodes
	 */
	static convertOffsetToRangeOptimized(
		startOffset: number,
		endOffset: number,
	): Range[] {
		const basicRanges = DOMPositionMapper.convertOffsetToRange(
			startOffset,
			endOffset,
		);

		if (basicRanges.length <= 1) {
			return basicRanges;
		}

		return DOMPositionMapper.mergeAdjacentRanges(basicRanges);
	}

	/**
	 * Attempt to merge adjacent ranges that can be combined into a single range
	 * This reduces the number of highlight objects needed for cross-node text
	 */
	private static mergeAdjacentRanges(ranges: Range[]): Range[] {
		if (ranges.length <= 1) {
			return ranges;
		}

		const mergedRanges: Range[] = [];
		let currentRange = ranges[0];

		for (let i = 1; i < ranges.length; i++) {
			const nextRange = ranges[i];

			// Check if ranges can be merged (adjacent or overlapping)
			if (DOMPositionMapper.canMergeRanges(currentRange, nextRange)) {
				try {
					// Create a new range that spans both ranges
					const mergedRange = document.createRange();
					mergedRange.setStart(
						currentRange.startContainer,
						currentRange.startOffset,
					);
					mergedRange.setEnd(nextRange.endContainer, nextRange.endOffset);
					currentRange = mergedRange;
				} catch (error) {
					console.warn("[DOMPositionMapper] Failed to merge ranges:", error);
					// If merge fails, add the current range and start fresh
					mergedRanges.push(currentRange);
					currentRange = nextRange;
				}
			} else {
				// Ranges can't be merged, add current and move to next
				mergedRanges.push(currentRange);
				currentRange = nextRange;
			}
		}

		// Add the final range
		mergedRanges.push(currentRange);

		console.log(
			`[DOMPositionMapper] Merged ${ranges.length} ranges into ${mergedRanges.length} ranges`,
		);
		return mergedRanges;
	}

	/**
	 * Check if two ranges can be safely merged
	 * This is conservative - only merges truly adjacent ranges
	 */
	private static canMergeRanges(range1: Range, range2: Range): boolean {
		try {
			// Check if range1 end is adjacent to range2 start
			const range1End = range1.endContainer;
			const range2Start = range2.startContainer;

			// Simple case: same text node
			if (range1End === range2Start) {
				return range1.endOffset === range2.startOffset;
			}

			// More complex case: adjacent text nodes
			// For safety, we'll be conservative and only merge in the simple case
			// Cross-node merging can be added later if needed for performance
			return false;
		} catch (error) {
			console.warn(
				"[DOMPositionMapper] Error checking range merge compatibility:",
				error,
			);
			return false;
		}
	}

	/**
	 * Debug utility to visualize text node mapping
	 * Useful for troubleshooting cross-node highlighting issues
	 */
	static debugTextNodeMapping(): {
		totalNodes: number;
		totalTextLength: number;
		nodeDetails: Array<{
			index: number;
			offset: number;
			length: number;
			text: string;
			tagName: string;
		}>;
	} {
		const walker = document.createTreeWalker(
			document.body,
			NodeFilter.SHOW_TEXT,
			{ acceptNode: DOMPositionMapper.acceptTextNode },
		);

		const textNodes: Text[] = [];
		const nodeOffsets: number[] = [];
		DOMPositionMapper.buildTextNodeMapping(walker, textNodes, nodeOffsets);

		const nodeDetails = textNodes.map((node, index) => ({
			index,
			offset: nodeOffsets[index],
			length: node.textContent?.length || 0,
			text: `${(node.textContent || "").substring(0, 50)}...`,
			tagName: node.parentElement?.tagName || "unknown",
		}));

		const totalTextLength =
			nodeOffsets.length > 0
				? nodeOffsets[nodeOffsets.length - 1] +
					(textNodes[textNodes.length - 1].textContent?.length || 0)
				: 0;

		return {
			totalNodes: textNodes.length,
			totalTextLength,
			nodeDetails,
		};
	}
}
