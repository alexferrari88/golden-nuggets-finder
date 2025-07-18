import { describe, it, expect } from 'vitest';

/**
 * Test cases for text matching issues found in production
 * These tests reproduce the exact text matching failures seen in HackerNews comments
 */

// Mock text normalization function from highlighter.ts
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim();
}

// Mock fuzzy matching function - current implementation that fails
function currentTextMatching(nuggetText: string, commentText: string): boolean {
  const normalizedNugget = normalizeText(nuggetText);
  const normalizedComment = normalizeText(commentText);
  
  // Current logic: exact match after normalization
  return normalizedComment.includes(normalizedNugget);
}

// Improved text matching function that should work better
function improvedTextMatching(nuggetText: string, commentText: string): boolean {
  // More aggressive normalization
  const normalizeAggressively = (text: string): string => {
    return text
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '')
      .replace(/\d+/g, '') // Remove reference numbers like [0]
      .trim();
  };
  
  const normalizedNugget = normalizeAggressively(nuggetText);
  const normalizedComment = normalizeAggressively(commentText);
  
  // Strategy 1: Try exact substring match first
  if (normalizedComment.includes(normalizedNugget)) {
    return true;
  }
  
  // Strategy 2: Try reverse - check if comment is contained in nugget (for truncated cases)
  if (normalizedNugget.includes(normalizedComment)) {
    return true;
  }
  
  // Strategy 3: Split into words and check if most words from nugget are in comment
  const nuggetWords = normalizedNugget.split(' ').filter(word => word.length > 2);
  const commentWords = normalizedComment.split(' ');
  
  // Check if at least 70% of significant words from nugget are in comment
  const matchingWords = nuggetWords.filter(word => commentWords.includes(word));
  const matchRatio = matchingWords.length / nuggetWords.length;
  
  if (matchRatio >= 0.7) {
    return true;
  }
  
  // Strategy 4: Check if the beginning of the texts match well (for cases where content diverges)
  const nuggetStart = normalizedNugget.split(' ').slice(0, 15).join(' ');
  const commentStart = normalizedComment.split(' ').slice(0, 15).join(' ');
  
  // Calculate similarity of first 15 words
  const startWords = nuggetStart.split(' ').filter(word => word.length > 2);
  const commentStartWords = commentStart.split(' ');
  const startMatches = startWords.filter(word => commentStartWords.includes(word));
  const startMatchRatio = startMatches.length / startWords.length;
  
  return startMatchRatio >= 0.8;
}

describe('Text Matching Issues in Production', () => {
  describe('Current Implementation Failures', () => {
    it('should fail to match Percy Fawcett comment due to spacing issues', () => {
      const nuggetText = "Funny enough, I was just reading about Percy Fawcett's doomed expedition to find the lost city of Z in the Amazon and turns out he has been fully vindicated. He went against the general scientific consensus of the time that complex civilization was impossible and the area he is thought to have disappeared in the Xingu Park has since been found to hold a civilization of 20+ settlements and a peak populations of up to 50,000 inhabitants. Wild stuff.";
      const commentText = "Funny enough, I was just reading about Percy Fawcett's doomed expedition to find the lost city of Z in the Amazon and turns out he has been fully vindicated. He went against the general scientific consensus  of the time that complex civilization was impossible and the area he is thought to have disappeared in the Xingu Park has since been found to hold a civilization of 20+ settlements and a peak populations of up to 50,000 inhabitants.Wild stuff.";
      
      const result = currentTextMatching(nuggetText, commentText);
      expect(result).toBe(false); // Current implementation fails due to spacing
    });
    
    it('should fail to match Spolia comment due to reference markers', () => {
      const nuggetText = "To my understanding that was pretty standard throughout history. Why go chisel out new rocks to build your mill when there's an unused pile of them _right there_?";
      const commentText = "To my understanding that was pretty standard throughout history.[0]Why go chisel out new rocks to build your mill when there's an unused pile of them _right there_?[0] https://en.wikipedia.org/wiki/Spolia";
      
      const result = currentTextMatching(nuggetText, commentText);
      expect(result).toBe(false); // Current implementation fails due to [0] markers
    });
    
    it('should match Modern archaeology comment despite extra spaces', () => {
      const nuggetText = "Modern archaeology intentionally leaves some significant pristine area to preserve the site for the future, perhaps future methods, perhaps just to leave some stones unturned forever. It's a pretty easy conclusion to arrive at given glaring mistakes of archaeology past.";
      const commentText = "Modern archaeology intentionally leaves some significant pristine area to preserve the site for the future, perhaps future methods, perhaps just to leave some stones unturned forever.  It's a pretty easy conclusion to arrive at given glaring mistakes of archaeology past.";
      
      const result = currentTextMatching(nuggetText, commentText);
      expect(result).toBe(true); // Current implementation actually handles double spaces fine
    });
    
    it('should fail to match Charles Mann comment due to truncated nugget', () => {
      const nuggetText = "Shout-out again to Charles C. Mann's excellent book 1491 . One of my most eye-opening reads after 2000, in terms of information that I didn't possess yet, exceedingly well presented. Mind-blowing to me that archeologists thought that Ancient Americans were so primitive, and that it had to be such a battle to demonstrate that no these were complex peoples just like everywhere else. One of my favorite facts is that 3/5 of the worlds produce was domesticated in Meso-America. Wild. These civs were pros at developing foods.";
      const commentText = "Shout-out again to Charles C. Mann's excellent book 1491. One of my most eye-opening reads after 2000, in terms of information that I didn't possess yet, exceedingly well presented.";
      
      const result = currentTextMatching(nuggetText, commentText);
      expect(result).toBe(false); // Current implementation fails - comment is shorter than nugget
    });
    
    it('should fail to match Mesoamerica comment due to different continuation', () => {
      const nuggetText = "Mesoamerica had both wheels and bronze. They just weren't as widely used because the technologies weren't nearly as useful in the Mesoamerican social context. The wheel just wasn't that useful because there was no road infrastructure to make it viable. And so it was with virtually all of the Americas. Wheelbarrows are much less useful without shovels.";
      const commentText = "Mesoamerica had both wheels and bronze. They just weren't as widely used because the technologies weren't nearly as useful in the Mesoamerican social context.Human sacrifice occurred and had important religious connotations (in terms of very literally keeping the universe alive), but it's wildly over-stated as an everyday fact of life by chroniclers.";
      
      const result = currentTextMatching(nuggetText, commentText);
      expect(result).toBe(false); // Current implementation fails - different continuation
    });
  });
  
  describe('Improved Implementation Success', () => {
    it('should match Percy Fawcett comment despite spacing issues', () => {
      const nuggetText = "Funny enough, I was just reading about Percy Fawcett's doomed expedition to find the lost city of Z in the Amazon and turns out he has been fully vindicated. He went against the general scientific consensus of the time that complex civilization was impossible and the area he is thought to have disappeared in the Xingu Park has since been found to hold a civilization of 20+ settlements and a peak populations of up to 50,000 inhabitants. Wild stuff.";
      const commentText = "Funny enough, I was just reading about Percy Fawcett's doomed expedition to find the lost city of Z in the Amazon and turns out he has been fully vindicated. He went against the general scientific consensus  of the time that complex civilization was impossible and the area he is thought to have disappeared in the Xingu Park has since been found to hold a civilization of 20+ settlements and a peak populations of up to 50,000 inhabitants.Wild stuff.";
      
      const result = improvedTextMatching(nuggetText, commentText);
      expect(result).toBe(true); // Improved implementation succeeds
    });
    
    it('should match Spolia comment despite reference markers', () => {
      const nuggetText = "To my understanding that was pretty standard throughout history. Why go chisel out new rocks to build your mill when there's an unused pile of them _right there_?";
      const commentText = "To my understanding that was pretty standard throughout history.[0]Why go chisel out new rocks to build your mill when there's an unused pile of them _right there_?[0] https://en.wikipedia.org/wiki/Spolia";
      
      const result = improvedTextMatching(nuggetText, commentText);
      expect(result).toBe(true); // Improved implementation succeeds
    });
    
    it('should match Modern archaeology comment despite extra spaces', () => {
      const nuggetText = "Modern archaeology intentionally leaves some significant pristine area to preserve the site for the future, perhaps future methods, perhaps just to leave some stones unturned forever. It's a pretty easy conclusion to arrive at given glaring mistakes of archaeology past.";
      const commentText = "Modern archaeology intentionally leaves some significant pristine area to preserve the site for the future, perhaps future methods, perhaps just to leave some stones unturned forever.  It's a pretty easy conclusion to arrive at given glaring mistakes of archaeology past.";
      
      const result = improvedTextMatching(nuggetText, commentText);
      expect(result).toBe(true); // Improved implementation succeeds
    });
    
    it('should match Charles Mann comment despite truncated nugget', () => {
      const nuggetText = "Shout-out again to Charles C. Mann's excellent book 1491 . One of my most eye-opening reads after 2000, in terms of information that I didn't possess yet, exceedingly well presented. Mind-blowing to me that archeologists thought that Ancient Americans were so primitive, and that it had to be such a battle to demonstrate that no these were complex peoples just like everywhere else. One of my favorite facts is that 3/5 of the worlds produce was domesticated in Meso-America. Wild. These civs were pros at developing foods.";
      const commentText = "Shout-out again to Charles C. Mann's excellent book 1491. One of my most eye-opening reads after 2000, in terms of information that I didn't possess yet, exceedingly well presented.";
      
      const result = improvedTextMatching(nuggetText, commentText);
      expect(result).toBe(true); // Improved implementation succeeds
    });
    
    it('should match Mesoamerica comment despite different continuation', () => {
      const nuggetText = "Mesoamerica had both wheels and bronze. They just weren't as widely used because the technologies weren't nearly as useful in the Mesoamerican social context. The wheel just wasn't that useful because there was no road infrastructure to make it viable. And so it was with virtually all of the Americas. Wheelbarrows are much less useful without shovels.";
      const commentText = "Mesoamerica had both wheels and bronze. They just weren't as widely used because the technologies weren't nearly as useful in the Mesoamerican social context.Human sacrifice occurred and had important religious connotations (in terms of very literally keeping the universe alive), but it's wildly over-stated as an everyday fact of life by chroniclers.";
      
      const result = improvedTextMatching(nuggetText, commentText);
      expect(result).toBe(true); // Improved implementation succeeds
    });
  });
});