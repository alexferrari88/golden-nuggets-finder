/**
 * TypeScript type definitions for dom-anchor-text-quote library
 * 
 * This library provides functions for finding and describing text ranges
 * within DOM documents using text quotes and context.
 */

declare module 'dom-anchor-text-quote' {
  /**
   * Text quote selector with exact text and optional context
   */
  export interface TextQuoteSelector {
    /** The exact text content to be selected */
    exact: string;
    /** Optional prefix context (up to 32 characters before the exact text) */
    prefix?: string;
    /** Optional suffix context (up to 32 characters after the exact text) */
    suffix?: string;
  }

  /**
   * Text position selector with start and end offsets
   */
  export interface TextPositionSelector {
    /** Start offset in the text content */
    start: number;
    /** End offset in the text content */
    end: number;
  }

  /**
   * Options for text quote operations
   */
  export interface TextQuoteOptions {
    /** Hint offset to prioritize matches closer to this position */
    hint?: number;
  }

  /**
   * Creates a text quote selector from a DOM Range
   * @param root - The root node to search within
   * @param range - The DOM Range to describe
   * @returns Text quote selector with exact text and context
   */
  export function fromRange(root: Node, range: Range): TextQuoteSelector;

  /**
   * Creates a text quote selector from text positions
   * @param root - The root node to search within
   * @param selector - Text position selector with start/end offsets
   * @returns Text quote selector with exact text and context
   */
  export function fromTextPosition(root: Node, selector: TextPositionSelector): TextQuoteSelector;

  /**
   * Converts a text quote selector to a DOM Range
   * @param root - The root node to search within
   * @param selector - Text quote selector to locate
   * @param options - Optional search options
   * @returns DOM Range if found, null if not found
   */
  export function toRange(
    root: Node, 
    selector: TextQuoteSelector, 
    options?: TextQuoteOptions
  ): Range | null;

  /**
   * Converts a text quote selector to text positions
   * @param root - The root node to search within
   * @param selector - Text quote selector to locate
   * @param options - Optional search options
   * @returns Text position selector if found, null if not found
   */
  export function toTextPosition(
    root: Node, 
    selector: TextQuoteSelector, 
    options?: TextQuoteOptions
  ): TextPositionSelector | null;
}