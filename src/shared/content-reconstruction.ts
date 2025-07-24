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
 * Enhanced fuzzy matching algorithm that handles content version mismatches.
 * Focuses on finding reasonable content spans between anchor points even when 
 * the middle content differs from expectations.
 * 
 * @param startContent - The start content to find
 * @param endContent - The end content to find
 * @param pageContent - The page content to search within
 * @returns MatchResult with success status and match details
 */
function fuzzyStartEndMatching(
  startContent: string,
  endContent: string,
  pageContent: string
): MatchResult {
  const normalizedText = advancedNormalize(pageContent);
  const normalizedStart = advancedNormalize(startContent);
  const normalizedEnd = advancedNormalize(endContent);
  
  console.log(`[FuzzyMatching] Looking for "${startContent}" -> "${endContent}" in ${normalizedText.length} chars`);
  
  // Strategy 1: Try to find exact start and end boundary phrases
  const startIndex = normalizedText.indexOf(normalizedStart);
  let endIndex = -1;
  
  if (startIndex !== -1) {
    // Look for end content after the start
    endIndex = normalizedText.indexOf(normalizedEnd, startIndex + normalizedStart.length);
    
    if (endIndex !== -1) {
      console.log(`[FuzzyMatching] Found exact boundaries at ${startIndex}-${endIndex}`);
      
      // Map back to original text
      const originalStartIndex = mapNormalizedPositionToOriginal(startIndex, pageContent, normalizedText);
      const originalEndIndex = mapNormalizedPositionToOriginal(endIndex + normalizedEnd.length, pageContent, normalizedText);
      
      if (originalStartIndex !== -1 && originalEndIndex !== -1) {
        const matchedContent = pageContent.substring(originalStartIndex, originalEndIndex);
        const span = originalEndIndex - originalStartIndex;
        
        // Accept reasonable spans even if content differs
        if (span > 0 && span < 2000) {
          console.log(`[FuzzyMatching] Exact boundary match: ${span} chars`);
          return {
            success: true,
            startIndex: originalStartIndex,
            endIndex: originalEndIndex,
            matchedContent,
            reason: `Fuzzy exact boundaries (${span} chars)`
          };
        }
      }
    }
  }
  
  // Strategy 2: Find partial start content and look for end content after it
  const startWords = normalizedStart.split(' ').filter(word => word.length > 2);
  const endWords = normalizedEnd.split(' ').filter(word => word.length > 2);
  
  if (startWords.length === 0 && endWords.length === 0) {
    return { success: false, reason: 'No significant words found in start or end content' };
  }
  
  // Strategy 2a: Look for start words using indexOf (more efficient)
  let bestStartPosition = -1;
  let bestStartScore = 0;
  
  // Find positions of start words
  const startWordPositions: Array<{word: string, positions: number[]}> = [];
  for (const word of startWords) {
    const positions: number[] = [];
    let searchFrom = 0;
    while (true) {
      const pos = normalizedText.indexOf(word, searchFrom);
      if (pos === -1) break;
      positions.push(pos);
      searchFrom = pos + 1;
      if (positions.length > 20) break; // Limit to prevent excessive computation
    }
    if (positions.length > 0) {
      startWordPositions.push({word, positions});
    }
  }
  
  // Find the position where most start words cluster together
  for (const {word, positions} of startWordPositions) {
    for (const pos of positions) {
      const windowStart = Math.max(0, pos - 30);
      const windowEnd = Math.min(normalizedText.length, pos + normalizedStart.length + 30);
      const window = normalizedText.substring(windowStart, windowEnd);
      
      const score = startWords.filter(w => window.includes(w)).length;
      if (score > bestStartScore && score >= Math.min(startWords.length, 2)) {
        bestStartScore = score;
        bestStartPosition = pos;
      }
    }
  }
  
  if (bestStartPosition === -1 || startWordPositions.length === 0) {
    console.log(`[FuzzyMatching] Could not find suitable start position`);
    return { success: false, reason: 'Could not find suitable start word sequence' };
  }
  
  // Strategy 2b: Look for end words using indexOf (more efficient)
  let bestEndPosition = -1;
  let bestEndScore = 0;
  const searchFromPos = bestStartPosition + 50; // Give some buffer after start
  const searchToPos = Math.min(normalizedText.length, bestStartPosition + 1500);
  
  // Find positions of end words
  const endWordPositions: Array<{word: string, positions: number[]}> = [];
  for (const word of endWords) {
    const positions: number[] = [];
    let searchFrom = searchFromPos;
    while (searchFrom < searchToPos) {
      const pos = normalizedText.indexOf(word, searchFrom);
      if (pos === -1 || pos >= searchToPos) break;
      positions.push(pos);
      searchFrom = pos + 1;
      if (positions.length > 20) break; // Limit to prevent excessive computation
    }
    if (positions.length > 0) {
      endWordPositions.push({word, positions});
    }
  }
  
  // Find the position where most end words cluster together
  for (const {word, positions} of endWordPositions) {
    for (const pos of positions) {
      const windowStart = Math.max(searchFromPos, pos - 30);
      const windowEnd = Math.min(searchToPos, pos + normalizedEnd.length + 30);
      const window = normalizedText.substring(windowStart, windowEnd);
      
      const score = endWords.filter(w => window.includes(w)).length;
      if (score > bestEndScore && score >= Math.min(endWords.length, 1)) {
        bestEndScore = score;
        bestEndPosition = pos;
      }
    }
  }
  
  if (bestEndPosition === -1) {
    console.log(`[FuzzyMatching] Could not find suitable end position after start at ${bestStartPosition}`);
    return { success: false, reason: 'Could not find suitable end word sequence after start' };
  }
  
  console.log(`[FuzzyMatching] Fuzzy boundaries found: start=${bestStartPosition} (score=${bestStartScore}), end=${bestEndPosition} (score=${bestEndScore})`);
  
  // Map positions back to original text
  const originalStartIndex = mapNormalizedPositionToOriginal(bestStartPosition, pageContent, normalizedText);
  const originalEndIndex = mapNormalizedPositionToOriginal(bestEndPosition + 50, pageContent, normalizedText); // Add buffer for end
  
  if (originalStartIndex === -1 || originalEndIndex === -1) {
    return { success: false, reason: 'Could not map fuzzy positions back to original text' };
  }
  
  const matchedContent = pageContent.substring(originalStartIndex, originalEndIndex);
  const span = originalEndIndex - originalStartIndex;
  
  // More lenient validation for fuzzy matches
  if (span <= 0 || span > 2000) {
    return { success: false, reason: `Fuzzy matched span invalid: ${span} chars` };
  }
  
  console.log(`[FuzzyMatching] Fuzzy match success: ${span} chars, start_score=${bestStartScore}, end_score=${bestEndScore}`);
  
  return {
    success: true,
    startIndex: originalStartIndex,
    endIndex: originalEndIndex,
    matchedContent,
    reason: `Fuzzy word matching (${span} chars, scores: ${bestStartScore}+${bestEndScore})`
  };
}

/**
 * Improved start/end matching algorithm with enhanced search logic.
 * Fixes algorithm bugs and handles Unicode character variants.
 * Enhanced to handle cross-paragraph/cross-section content spans.
 * Now includes fuzzy matching fallback for content variations.
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
  console.log(`[ContentReconstruction] Matching "${startContent}" -> "${endContent}" in ${pageContent.length} chars`);
  
  // CRITICAL FIX: Find positions in original text, not normalized text
  // The bug was that we were normalizing the text and finding positions there,
  // but then using those positions on the original text
  
  // Try exact match first
  const exactStartIndex = pageContent.indexOf(startContent);
  console.log(`[ContentReconstruction] Exact start search: ${exactStartIndex !== -1 ? 'FOUND at ' + exactStartIndex : 'NOT FOUND'}`);
  
  if (exactStartIndex !== -1) {
    const endSearchStart = exactStartIndex + startContent.length;
    const exactEndIndex = pageContent.indexOf(endContent, endSearchStart);
    console.log(`[ContentReconstruction] Exact end search: ${exactEndIndex !== -1 ? 'FOUND at ' + exactEndIndex : 'NOT FOUND'}`);
    
    if (exactEndIndex !== -1) {
      const matchedContent = pageContent.substring(exactStartIndex, exactEndIndex + endContent.length);
      console.log(`[ContentReconstruction] Exact match found, validating span (${matchedContent.length} chars)`);
      
      // Enhanced validation for cross-paragraph content
      if (isReasonableContentSpan(matchedContent, startContent, endContent)) {
        console.log(`[ContentReconstruction] Exact match validation PASSED`);
        return { 
          success: true, 
          startIndex: exactStartIndex, 
          endIndex: exactEndIndex + endContent.length,
          matchedContent,
          reason: 'Exact match'
        };
      } else {
        console.log(`[ContentReconstruction] Exact match validation FAILED`);
      }
    }
  }
  
  // Fallback to normalized matching with position mapping
  const normalizedText = advancedNormalize(pageContent);
  const normalizedStart = advancedNormalize(startContent);
  const normalizedEnd = advancedNormalize(endContent);
  
  console.log(`[ContentReconstruction] Normalized text: ${normalizedText.length} chars`);
  console.log(`[ContentReconstruction] Normalized start: "${normalizedStart}"`);
  console.log(`[ContentReconstruction] Normalized end: "${normalizedEnd}"`);
  
  const normalizedStartIndex = normalizedText.indexOf(normalizedStart);
  console.log(`[ContentReconstruction] Normalized start search: ${normalizedStartIndex !== -1 ? 'FOUND at ' + normalizedStartIndex : 'NOT FOUND'}`);
  
  if (normalizedStartIndex !== -1) {
    const endSearchStart = normalizedStartIndex + normalizedStart.length;
    const normalizedEndIndex = normalizedText.indexOf(normalizedEnd, endSearchStart);
    console.log(`[ContentReconstruction] Normalized end search: ${normalizedEndIndex !== -1 ? 'FOUND at ' + normalizedEndIndex : 'NOT FOUND'}`);
    
    if (normalizedEndIndex !== -1) {
      // Map positions from normalized text back to original text
      const originalStartIndex = mapNormalizedPositionToOriginal(normalizedStartIndex, pageContent, normalizedText);
      const originalEndIndex = mapNormalizedPositionToOriginal(normalizedEndIndex + normalizedEnd.length, pageContent, normalizedText);
      
      console.log(`[ContentReconstruction] Position mapping: ${originalStartIndex} -> ${originalEndIndex}`);
      
      if (originalStartIndex !== -1 && originalEndIndex !== -1) {
        const matchedContent = pageContent.substring(originalStartIndex, originalEndIndex);
        console.log(`[ContentReconstruction] Normalized match found, validating span (${matchedContent.length} chars)`);
        
        // Enhanced validation for cross-paragraph content  
        if (isReasonableContentSpan(matchedContent, startContent, endContent)) {
          console.log(`[ContentReconstruction] Normalized match validation PASSED`); 
          return { 
            success: true, 
            startIndex: originalStartIndex, 
            endIndex: originalEndIndex,
            matchedContent,
            reason: 'Normalized match'
          };
        } else {
          console.log(`[ContentReconstruction] Normalized match validation FAILED`);
        }
      } else {
        console.log(`[ContentReconstruction] Position mapping FAILED`);
      }
    }
  }
  
  // NEW: Fallback to fuzzy matching when exact and normalized matching fail
  console.log(`[ContentReconstruction] Exact and normalized matching failed, trying fuzzy matching for "${startContent}" -> "${endContent}"`);
  
  // TEMPORARILY DISABLED: Skip fuzzy matching to isolate stack overflow
  console.log(`[ContentReconstruction] Fuzzy matching temporarily disabled for debugging`);
  
  // If all matching strategies fail, return the most informative error
  return { 
    success: false, 
    reason: `All matching strategies failed. Exact: start not found. Normalized: ${normalizedStartIndex === -1 ? 'start not found' : 'end not found'}. Fuzzy: disabled` 
  };
}

/**
 * Validates if a matched content span is reasonable for highlighting.
 * Prevents over-highlighting while allowing legitimate cross-paragraph content.
 * 
 * @param matchedContent - The content that would be highlighted
 * @param startContent - The original start content
 * @param endContent - The original end content
 * @returns true if the span is reasonable to highlight
 */
function isReasonableContentSpan(matchedContent: string, startContent: string, endContent: string): boolean {
  // Basic length checks
  const matchedLength = matchedContent.length;
  const expectedMinLength = startContent.length + endContent.length;
  
  // Allow reasonable expansion for cross-paragraph content
  const maxReasonableLength = Math.max(1000, expectedMinLength * 8); // Allow 8x expansion or 1000 chars minimum
  
  if (matchedLength > maxReasonableLength) {
    console.log(`[ContentReconstruction] Matched content too long: ${matchedLength} chars (max: ${maxReasonableLength})`);
    return false;
  }
  
  // Check for excessive repetition (might indicate matching across unrelated sections)
  const words = matchedContent.toLowerCase().split(/\s+/);
  const uniqueWords = new Set(words);
  const repetitionRatio = words.length / uniqueWords.size;
  
  if (repetitionRatio > 3 && matchedLength > 200) {
    console.log(`[ContentReconstruction] Excessive repetition detected: ratio ${repetitionRatio.toFixed(2)}`);
    return false;
  }
  
  // Check content coherence - ensure start and end content appear reasonably close to the boundaries
  const normalizedMatched = advancedNormalize(matchedContent);
  const normalizedStart = advancedNormalize(startContent);
  const normalizedEnd = advancedNormalize(endContent);
  
  const startPosInMatched = normalizedMatched.indexOf(normalizedStart);
  const endPosInMatched = normalizedMatched.lastIndexOf(normalizedEnd);
  
  // Start should be near the beginning (within first 20% or 100 chars)
  const startThreshold = Math.min(matchedLength * 0.2, 100);
  if (startPosInMatched > startThreshold) {
    console.log(`[ContentReconstruction] Start content not near beginning: pos ${startPosInMatched} (threshold: ${startThreshold})`);
    return false;
  }
  
  // End should be near the end (within last 20% or 100 chars)
  const endThreshold = matchedLength * 0.8;
  if (endPosInMatched < endThreshold && matchedLength > 200) {
    console.log(`[ContentReconstruction] End content not near end: pos ${endPosInMatched} (threshold: ${endThreshold})`);
    return false;
  }
  
  // Check for reasonable content density (not too much whitespace or markup)
  const nonWhitespaceChars = matchedContent.replace(/\s/g, '').length;
  const contentDensity = nonWhitespaceChars / matchedLength;
  
  if (contentDensity < 0.3 && matchedLength > 300) {
    console.log(`[ContentReconstruction] Content density too low: ${contentDensity.toFixed(2)} (min: 0.3 for length > 300)`);
    return false;
  }
  
  console.log(`[ContentReconstruction] Content span validated: ${matchedLength} chars, density: ${contentDensity.toFixed(2)}`);
  return true;
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