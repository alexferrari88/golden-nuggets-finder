import type { GoldenNugget } from './types';

/**
 * Utility functions for reconstructing full content from startContent and endContent
 * by finding matching text within the source page content.
 */

/**
 * Advanced text normalization for matching with comprehensive Unicode handling.
 * Handles all common Unicode character variants that can cause matching failures.
 */
export function advancedNormalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[''`´]/g, "'")        // All apostrophe variants
    .replace(/[""«»]/g, '"')       // All quote variants  
    .replace(/[–—−]/g, '-')        // All dash variants
    .replace(/[…]/g, '...')        // Ellipsis normalization
    .replace(/\s+/g, ' ')          // Normalize whitespace
    .trim();
}

/**
 * Map a character position from normalized text back to the original text
 * This is needed because normalization changes character positions
 */
function mapNormalizedPositionToOriginal(
  normalizedPosition: number, 
  originalText: string, 
  normalizedText: string
): number {
  // Simple approach: if normalization only changed whitespace and case,
  // we can find the corresponding position by counting non-whitespace characters
  
  let originalIndex = 0;
  let normalizedIndex = 0;
  let nonWhitespaceCount = 0;
  
  // Count non-whitespace characters to target position in normalized text
  while (normalizedIndex < normalizedPosition && normalizedIndex < normalizedText.length) {
    if (normalizedText[normalizedIndex] !== ' ') {
      nonWhitespaceCount++;
    }
    normalizedIndex++;
  }
  
  // Find the same number of non-whitespace characters in original text
  let foundNonWhitespace = 0;
  while (originalIndex < originalText.length && foundNonWhitespace < nonWhitespaceCount) {
    const char = originalText[originalIndex];
    // Count any non-whitespace character (including normalized variants)
    if (char !== ' ' && char !== '\t' && char !== '\n' && char !== '\r') {
      foundNonWhitespace++;
    }
    originalIndex++;
  }
  
  // Adjust for final position - we want to be AT the character, not after it
  if (foundNonWhitespace === nonWhitespaceCount && originalIndex > 0) {
    originalIndex--; // Back up to be at the character
  }
  
  return originalIndex < originalText.length ? originalIndex : -1;
}

/**
 * Legacy normalizeText function - kept for backward compatibility
 * @deprecated Use advancedNormalize instead
 */
function normalizeText(text: string): string {
  return advancedNormalize(text);
}

/**
 * Find text that starts with startContent and ends with endContent within searchText
 */
function findTextBetweenStartAndEnd(
  startContent: string, 
  endContent: string, 
  searchText: string
): string | null {
  const normalizedSearch = normalizeText(searchText);
  const normalizedStart = normalizeText(startContent);
  const normalizedEnd = normalizeText(endContent);

  // Find start position
  const startIndex = normalizedSearch.indexOf(normalizedStart);
  if (startIndex === -1) return null;

  // Find end position, searching from after the start
  const searchFromIndex = startIndex + normalizedStart.length;
  const endIndex = normalizedSearch.indexOf(normalizedEnd, searchFromIndex);
  if (endIndex === -1) return null;

  // Extract the text between start and end (inclusive)
  const endEndIndex = endIndex + normalizedEnd.length;
  return normalizedSearch.substring(startIndex, endEndIndex);
}

/**
 * Reconstructs the full content from startContent and endContent by finding 
 * the matching text in the provided page content.
 * 
 * @param nugget - The golden nugget with startContent and endContent
 * @param pageContent - The full page content to search within
 * @returns The reconstructed full content, or fallback to startContent...endContent
 */
export function reconstructFullContent(nugget: GoldenNugget, pageContent: string): string {
  const foundText = findTextBetweenStartAndEnd(nugget.startContent, nugget.endContent, pageContent);
  return foundText || `${nugget.startContent}...${nugget.endContent}`;
}

/**
 * Gets display content for a nugget, attempting to reconstruct the full content
 * if page content is available, otherwise falling back to the truncated version.
 * 
 * @param nugget - The golden nugget
 * @param pageContent - Optional page content for reconstruction
 * @returns Display-ready content string
 */
export function getDisplayContent(nugget: GoldenNugget, pageContent?: string): string {
  if (pageContent) {
    const reconstructed = reconstructFullContent(nugget, pageContent);
    // Only use reconstructed content if it's significantly longer than the truncated version
    if (reconstructed && reconstructed.length > nugget.startContent.length + nugget.endContent.length + 10) {
      return reconstructed;
    }
  }
  return `${nugget.startContent}...${nugget.endContent}`;
}

/**
 * Gets normalized content for a nugget, attempting to reconstruct and normalize
 * the full content for better matching.
 * 
 * @param nugget - The golden nugget
 * @param pageContent - Optional page content for reconstruction
 * @returns Normalized content string for matching purposes
 */
export function getNormalizedContent(nugget: GoldenNugget, pageContent?: string): string {
  if (pageContent) {
    const reconstructed = reconstructFullContent(nugget, pageContent);
    if (reconstructed && reconstructed.length > nugget.startContent.length + nugget.endContent.length + 10) {
      return normalizeText(reconstructed);
    }
  }
  // Fallback: normalize the start...end pattern
  return normalizeText(`${nugget.startContent} ${nugget.endContent}`);
}

/**
 * Match result interface for the improved search algorithm
 */
export interface MatchResult {
  success: boolean;
  reason?: string;
  startIndex?: number;
  endIndex?: number;
  matchedContent?: string;
}

/**
 * Improved start/end matching algorithm with enhanced search logic.
 * Fixes algorithm bugs and handles Unicode character variants.
 * 
 * @param startContent - The start content to find
 * @param endContent - The end content to find
 * @param pageContent - The page content to search within
 * @returns MatchResult with success status and match details
 */
export function improvedStartEndMatching(
  startContent: string, 
  endContent: string, 
  pageContent: string
): MatchResult {
  // CRITICAL FIX: Find positions in original text, not normalized text
  // The bug was that we were normalizing the text and finding positions there,
  // but then using those positions on the original text
  
  // Try exact match first
  const exactStartIndex = pageContent.indexOf(startContent);
  if (exactStartIndex !== -1) {
    const endSearchStart = exactStartIndex + startContent.length;
    const exactEndIndex = pageContent.indexOf(endContent, endSearchStart);
    if (exactEndIndex !== -1) {
      return { 
        success: true, 
        startIndex: exactStartIndex, 
        endIndex: exactEndIndex + endContent.length,
        matchedContent: pageContent.substring(exactStartIndex, exactEndIndex + endContent.length)
      };
    }
  }
  
  // Fallback to normalized matching with position mapping
  const normalizedText = advancedNormalize(pageContent);
  const normalizedStart = advancedNormalize(startContent);
  const normalizedEnd = advancedNormalize(endContent);
  
  const normalizedStartIndex = normalizedText.indexOf(normalizedStart);
  if (normalizedStartIndex === -1) {
    return { success: false, reason: 'Start content not found' };
  }
  
  const endSearchStart = normalizedStartIndex + normalizedStart.length;
  const normalizedEndIndex = normalizedText.indexOf(normalizedEnd, endSearchStart);
  if (normalizedEndIndex === -1) {
    return { success: false, reason: 'End content not found after start' };
  }
  
  // Map positions from normalized text back to original text
  const originalStartIndex = mapNormalizedPositionToOriginal(normalizedStartIndex, pageContent, normalizedText);
  const originalEndIndex = mapNormalizedPositionToOriginal(normalizedEndIndex + normalizedEnd.length, pageContent, normalizedText);
  
  if (originalStartIndex === -1 || originalEndIndex === -1) {
    return { success: false, reason: 'Could not map normalized positions back to original text' };
  }
  
  return { 
    success: true, 
    startIndex: originalStartIndex, 
    endIndex: originalEndIndex,
    matchedContent: pageContent.substring(originalStartIndex, originalEndIndex)
  };
}

/**
 * Enhanced text matching using start/end content approach with multiple strategies.
 * 
 * @param nugget - The golden nugget to match
 * @param searchText - The text to search within
 * @returns True if the nugget content matches the search text
 * @deprecated Use improvedStartEndMatching instead for better error reporting
 */
export function improvedStartEndTextMatching(nugget: GoldenNugget, searchText: string): boolean {
  const normalizedSearch = normalizeText(searchText);
  const normalizedStart = normalizeText(nugget.startContent);
  const normalizedEnd = normalizeText(nugget.endContent);

  // Strategy 1: Check if both start and end content exist in the text
  const hasStart = normalizedSearch.includes(normalizedStart);
  const hasEnd = normalizedSearch.includes(normalizedEnd);
  
  if (hasStart && hasEnd) {
    // Verify they appear in the correct order
    const startIndex = normalizedSearch.indexOf(normalizedStart);
    const endIndex = normalizedSearch.lastIndexOf(normalizedEnd);
    return startIndex < endIndex;
  }

  // Strategy 2: If we can't find both, try the full reconstructed content approach
  const reconstructed = findTextBetweenStartAndEnd(nugget.startContent, nugget.endContent, searchText);
  if (reconstructed) {
    return true;
  }

  // Strategy 3: Fallback to partial matching - at least 80% of start words and 80% of end words
  const startWords = normalizedStart.split(' ').filter(word => word.length > 2);
  const endWords = normalizedEnd.split(' ').filter(word => word.length > 2);
  const searchWords = normalizedSearch.split(' ');

  const startMatches = startWords.filter(word => searchWords.includes(word));
  const endMatches = endWords.filter(word => searchWords.includes(word));

  const startMatchRatio = startMatches.length / Math.max(startWords.length, 1);
  const endMatchRatio = endMatches.length / Math.max(endWords.length, 1);

  return startMatchRatio >= 0.8 && endMatchRatio >= 0.8;
}