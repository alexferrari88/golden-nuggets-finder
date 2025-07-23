import { GoldenNugget } from '../../shared/types';
import { colors, generateInlineStyles, zIndex } from '../../shared/design-system';
import { SITE_SELECTORS } from 'threads-harvester';
import { 
  getDisplayContent, 
  getNormalizedContent, 
  improvedStartEndTextMatching 
} from '../../shared/content-reconstruction';

type SiteType = 'twitter' | 'reddit' | 'hackernews' | 'generic';

export class Highlighter {
  private highlights: HTMLElement[] = [];
  private popups: HTMLElement[] = [];
  private textCache = new Map<string, string>();
  private searchCache = new Map<string, Element[]>();
  private highlightedNuggets = new Set<string>(); // Track highlighted content to prevent duplicates
  private siteType: SiteType;

  constructor() {
    this.siteType = this.detectSiteType();
  }

  // NOTE: Reconstruction logic has been moved to shared/content-reconstruction.ts

  async highlightNugget(nugget: GoldenNugget, pageContent?: string): Promise<boolean> {
    console.log('🔍 [Highlighter Debug] Starting highlightNugget:', {
      siteType: this.siteType,
      isThreadedSite: this.isThreadedSite(),
      nuggetType: nugget.type,
      startContent: nugget.startContent.substring(0, 50) + '...',
      endContent: nugget.endContent.substring(0, 50) + '...',
      url: window.location.href
    });
    
    // Create a normalized content key for deduplication
    const contentKey = this.createContentKey(nugget);
    
    // Check if this nugget content has already been highlighted
    if (this.highlightedNuggets.has(contentKey)) {
      console.log('⚠️ [Deduplication] Nugget already highlighted, skipping:', {
        contentKey,
        startContent: nugget.startContent.substring(0, 50) + '...',
        endContent: nugget.endContent.substring(0, 50) + '...'
      });
      return false;
    }
    
    // Attempt highlighting
    let result: boolean;
    if (this.isThreadedSite()) {
      console.log('📝 [Highlighter Debug] Using comment-based highlighting for threaded site');
      result = this.highlightCommentContainer(nugget, pageContent);
    } else {
      console.log('📄 [Highlighter Debug] Using text-based highlighting for generic site');
      result = this.findAndHighlightText(nugget, pageContent);
    }
    
    // Track successful highlights to prevent duplicates
    if (result) {
      this.highlightedNuggets.add(contentKey);
      console.log('✅ [Deduplication] Nugget highlighted and tracked:', {
        contentKey,
        totalTracked: this.highlightedNuggets.size
      });
    }
    
    return result;
  }

  getHighlightElement(nugget: GoldenNugget): HTMLElement | null {
    // Use the same matching strategy as highlighting to find the existing highlight
    if (this.isThreadedSite()) {
      return this.findExistingCommentHighlight(nugget);
    } else {
      return this.findExistingHighlight(nugget);
    }
  }

  scrollToHighlight(nugget: GoldenNugget): void {
    const element = this.getHighlightElement(nugget);
    
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'nearest'
      });
      
      // Add temporary glow effect - different for comment vs text highlights
      if (element.classList.contains('nugget-comment-highlight')) {
        this.addTemporaryCommentGlow(element);
      } else {
        this.addTemporaryTextGlow(element);
      }
    }
  }

  private addTemporaryCommentGlow(element: HTMLElement): void {
    const originalBorderLeft = element.style.borderLeft;
    const originalBoxShadow = element.style.boxShadow || '';
    
    // Enhanced glow for comment highlights
    element.style.borderLeft = `6px solid rgba(255, 215, 0, 1)`;
    element.style.boxShadow = `${originalBoxShadow}, 0 0 0 2px rgba(255, 215, 0, 0.3)`;
    
    setTimeout(() => {
      element.style.borderLeft = originalBorderLeft;
      element.style.boxShadow = originalBoxShadow;
    }, 1500);
  }

  private addTemporaryTextGlow(element: HTMLElement): void {
    const originalBoxShadow = element.style.boxShadow || '';
    element.style.boxShadow = `0 0 0 3px ${colors.text.accent}30`;
    setTimeout(() => {
      element.style.boxShadow = originalBoxShadow;
    }, 1500);
  }

  private detectSiteType(): SiteType {
    const url = window.location.href.toLowerCase();
    if (url.includes('twitter.com') || url.includes('x.com')) {
      return 'twitter';
    } else if (url.includes('reddit.com')) {
      return 'reddit';
    } else if (url.includes('news.ycombinator.com')) {
      return 'hackernews';
    } else {
      return 'generic';
    }
  }

  private createContentKey(nugget: GoldenNugget): string {
    // Create a unique key based on normalized start and end content for deduplication
    const normalizedStart = this.normalizeText(nugget.startContent);
    const normalizedEnd = this.normalizeText(nugget.endContent);
    
    // Include nugget type to allow same content with different types (rare but possible)
    return `${nugget.type}:${normalizedStart}|${normalizedEnd}`;
  }

  private isThreadedSite(): boolean {
    return this.siteType !== 'generic';
  }

  private getCommentSelectors(): string[] {
    switch (this.siteType) {
      case 'twitter':
        return [SITE_SELECTORS.TWITTER.TWEET_ARTICLE];
      case 'reddit':
        return [SITE_SELECTORS.REDDIT.COMMENTS, '.thing', '.Comment', '[class*="comment"]'];
      case 'hackernews':
        // Priority: Use container selectors first, then text selectors as fallback
        return ['.comtr', SITE_SELECTORS.HACKER_NEWS.COMMENT_TREE, '.comment'];
      default:
        return [];
    }
  }

  private findExistingHighlight(nugget: GoldenNugget): HTMLElement | null {
    // Get all existing highlight elements
    const existingHighlights = document.querySelectorAll('.nugget-highlight');
    
    if (existingHighlights.length === 0) {
      return null;
    }
    
    const normalizedContent = getNormalizedContent(nugget, pageContent);
    
    // Strategy 1: Try to find highlight by exact content match
    for (const highlight of existingHighlights) {
      const highlightText = highlight.textContent || '';
      const normalizedHighlight = this.normalizeText(highlightText);
      
      if (normalizedHighlight.includes(normalizedContent) || 
          normalizedContent.includes(normalizedHighlight) ||
          this.getOverlapScore(normalizedHighlight, normalizedContent) > 0.9) {
        return highlight as HTMLElement;
      }
    }
    
    // Strategy 2: Try to find by key phrases
    const keyPhrases = this.extractKeyPhrases(getDisplayContent(nugget, pageContent));
    for (const phrase of keyPhrases) {
      const normalizedPhrase = this.normalizeText(phrase);
      if (normalizedPhrase.length > 8) {
        for (const highlight of existingHighlights) {
          const highlightText = highlight.textContent || '';
          const normalizedHighlight = this.normalizeText(highlightText);
          
          if (normalizedHighlight.includes(normalizedPhrase) || 
              normalizedPhrase.includes(normalizedHighlight) ||
              this.getOverlapScore(normalizedHighlight, normalizedPhrase) > 0.8) {
            return highlight as HTMLElement;
          }
        }
      }
    }
    
    // Strategy 3: Try fuzzy matching with overlap scoring
    for (const highlight of existingHighlights) {
      const highlightText = highlight.textContent || '';
      const normalizedHighlight = this.normalizeText(highlightText);
      
      if (this.fuzzyMatch(normalizedHighlight, normalizedContent) || 
          this.fuzzyMatch(normalizedContent, normalizedHighlight) ||
          this.getOverlapScore(normalizedHighlight, normalizedContent) > 0.8) {
        return highlight as HTMLElement;
      }
    }
    
    return null;
  }

  private findExistingCommentHighlight(nugget: GoldenNugget): HTMLElement | null {
    // Get all existing comment highlights
    const existingHighlights = document.querySelectorAll('.nugget-comment-highlight');
    
    if (existingHighlights.length === 0) {
      return null;
    }
    
    const normalizedContent = getNormalizedContent(nugget, pageContent);
    
    // Find comment highlight that contains the nugget content
    for (const highlight of existingHighlights) {
      const commentText = highlight.textContent || '';
      const normalizedComment = this.normalizeText(commentText);
      
      if (normalizedComment.includes(normalizedContent) || 
          this.getOverlapScore(normalizedComment, normalizedContent) > 0.9) {
        return highlight as HTMLElement;
      }
    }
    
    return null;
  }


  clearHighlights(): void {
    // Remove text highlights (for generic sites)
    this.highlights.forEach(highlight => {
      const parent = highlight.parentNode;
      if (parent && !highlight.classList.contains('nugget-comment-highlight')) {
        parent.replaceChild(document.createTextNode(highlight.textContent || ''), highlight);
        parent.normalize();
      }
    });
    
    // Remove comment highlights (for threaded sites)
    const commentHighlights = document.querySelectorAll('.nugget-comment-highlight');
    commentHighlights.forEach(highlight => {
      highlight.classList.remove('nugget-comment-highlight');
      highlight.style.borderLeft = '';
      highlight.style.background = '';
      highlight.style.borderRadius = '';
      highlight.style.position = '';
      
      // Remove corner indicator
      const indicator = highlight.querySelector('.nugget-corner-indicator');
      if (indicator) {
        indicator.remove();
      }
      
      // Restore original content margins
      const allChildren = highlight.querySelectorAll('*');
      allChildren.forEach(child => {
        const childElement = child as HTMLElement;
        childElement.style.marginRight = '';
      });
      
      // Unwrap any text nodes we wrapped
      const wrappedSpans = highlight.querySelectorAll('span[style*="margin-right: 60px"]');
      wrappedSpans.forEach(span => {
        if (span.parentNode) {
          span.parentNode.replaceChild(document.createTextNode(span.textContent || ''), span);
        }
      });
    });
    
    this.highlights = [];

    // Remove all popups
    this.popups.forEach(popup => popup.remove());
    this.popups = [];
    
    // Clear caches and tracking
    this.textCache.clear();
    this.searchCache.clear();
    this.highlightedNuggets.clear(); // Clear tracked nuggets when clearing highlights
    
    console.log('🧹 [Deduplication] Cleared all highlights and tracking');
  }

  private highlightCommentContainer(nugget: GoldenNugget, pageContent?: string): boolean {
    const normalizedContent = getNormalizedContent(nugget, pageContent);
    
    // Early return if content is too short
    if (normalizedContent.length < 5) {
      return false;
    }
    
    // Use specialized highlighting for HackerNews
    if (this.siteType === 'hackernews') {
      return this.highlightHackerNewsComment(nugget, normalizedContent);
    }
    
    const commentSelectors = this.getCommentSelectors();
    
    // Find comment containers that contain the nugget content
    for (const selector of commentSelectors) {
      const containers = document.querySelectorAll(selector);
      
      for (const container of containers) {
        // Skip already highlighted comments
        if (container.classList.contains('nugget-comment-highlight')) {
          continue;
        }
        
        const containerText = container.textContent || '';
        
        // Use improved text matching algorithm
        const shouldHighlight = improvedStartEndTextMatching(nugget, containerText);
        
        console.log('🎯 Highlighting Debug:', {
          site: this.siteType,
          selector,
          startContent: nugget.startContent.substring(0, 50) + '...',
        endContent: nugget.endContent.substring(0, 50) + '...',
          normalizedContent: normalizedContent.substring(0, 100) + '...',
          containerText: containerText.substring(0, 100) + '...',
          normalizedContainer: this.normalizeText(containerText).substring(0, 100) + '...',
          exactMatch: this.normalizeText(containerText).includes(normalizedContent),
          overlapScore: this.getOverlapScore(this.normalizeText(containerText), normalizedContent),
          fuzzyMatch: this.fuzzyMatch(this.normalizeText(containerText), normalizedContent),
          willHighlight: shouldHighlight,
          matchReason: shouldHighlight ? 'improved_matching' : 'no_match'
        });
        
        // Check if this container contains the nugget content
        if (shouldHighlight) {
          
          this.highlightCommentElement(container as HTMLElement, nugget);
          return true;
        }
      }
    }
    
    // Fallback to text highlighting if comment detection fails
    console.log('🔄 Falling back to text highlighting for:', `${nugget.startContent}...${nugget.endContent}`);
    return this.findAndHighlightText(nugget, pageContent);
  }

  private highlightHackerNewsComment(nugget: GoldenNugget, normalizedContent: string): boolean {
    // For HackerNews, search for content in .commtext but highlight the parent .comtr container
    const commtextElements = document.querySelectorAll(SITE_SELECTORS.HACKER_NEWS.COMMENTS);
    
    for (const commtextElement of commtextElements) {
      const commentText = commtextElement.textContent || '';
      const normalizedCommentText = this.normalizeText(commentText);
      
      // Use improved text matching algorithm
      const shouldHighlight = improvedStartEndTextMatching(nugget, commentText);
      
      console.log('🎯 HackerNews Comment Debug:', {
        startContent: nugget.startContent.substring(0, 50) + '...',
        endContent: nugget.endContent.substring(0, 50) + '...',
        normalizedContent: normalizedContent.substring(0, 100) + '...',
        commentText: commentText.substring(0, 100) + '...',
        normalizedCommentText: normalizedCommentText.substring(0, 100) + '...',
        exactMatch: normalizedCommentText.includes(normalizedContent),
        overlapScore: this.getOverlapScore(normalizedCommentText, normalizedContent),
        fuzzyMatch: this.fuzzyMatch(normalizedCommentText, normalizedContent),
        willHighlight: shouldHighlight,
        matchReason: shouldHighlight ? 'improved_matching' : 'no_match'
      });
      
      if (shouldHighlight) {
        // Find the parent .comtr container
        const comtrContainer = commtextElement.closest('.comtr');
        
        // Enhanced debug logging to understand the DOM structure
        console.log('🔍 Debug: .comtr container search:', {
          commtextElement: commtextElement,
          commtextParent: commtextElement.parentElement,
          commtextParentClass: commtextElement.parentElement?.className,
          comtrContainer: comtrContainer,
          comtrFound: !!comtrContainer,
          alreadyHighlighted: comtrContainer?.classList.contains('nugget-comment-highlight'),
          parentHierarchy: this.getParentHierarchy(commtextElement, 5)
        });
        
        if (comtrContainer && !comtrContainer.classList.contains('nugget-comment-highlight')) {
          console.log('✅ Found matching comment, highlighting .comtr container');
          this.highlightCommentElement(comtrContainer as HTMLElement, nugget);
          return true;
        } else if (!comtrContainer) {
          console.log('❌ Could not find .comtr container - checking for alternative containers');
          // Try alternative container lookup strategies
          const alternativeContainer = this.findAlternativeHackerNewsContainer(commtextElement);
          if (alternativeContainer && !alternativeContainer.classList.contains('nugget-comment-highlight')) {
            console.log('✅ Found alternative container, highlighting:', alternativeContainer.className);
            this.highlightCommentElement(alternativeContainer as HTMLElement, nugget);
            return true;
          }
        } else {
          console.log('❌ Container found but already highlighted');
        }
      }
    }
    
    // Fallback to generic container search
    console.log('🔄 HackerNews: Falling back to generic container search');
    return this.highlightGenericCommentContainer(nugget, normalizedContent);
  }

  private highlightGenericCommentContainer(nugget: GoldenNugget, normalizedContent: string): boolean {
    const commentSelectors = this.getCommentSelectors();
    
    for (const selector of commentSelectors) {
      const containers = document.querySelectorAll(selector);
      
      for (const container of containers) {
        // Skip already highlighted comments
        if (container.classList.contains('nugget-comment-highlight')) {
          continue;
        }
        
        const containerText = container.textContent || '';
        
        // Use improved text matching algorithm
        const shouldHighlight = improvedStartEndTextMatching(nugget, containerText);
        
        if (shouldHighlight) {
          this.highlightCommentElement(container as HTMLElement, nugget);
          return true;
        }
      }
    }
    
    return false;
  }

  private highlightCommentElement(element: HTMLElement, nugget: GoldenNugget): void {
    // Apply comment highlighting styles
    element.classList.add('nugget-comment-highlight');
    element.dataset.nuggetType = nugget.type;
    
    // Apply site-specific styling
    const styles = this.getCommentHighlightStyles();
    Object.assign(element.style, styles);
    
    // Special handling for Hacker News table layout (apply after base styles)
    if (this.siteType === 'hackernews') {
      // Ensure the element maintains proper table-row display
      element.style.setProperty('display', 'table-row', 'important');
      element.style.setProperty('border-collapse', 'separate', 'important');
      element.style.borderSpacing = '0';
      element.style.boxSizing = 'border-box';
      
      // Use multiple aggressive approaches to ensure visibility
      // 1. Try border-left with maximum specificity
      element.style.setProperty('border-left', '4px solid rgba(255, 215, 0, 0.9)', 'important');
      // 2. Add a background color that will definitely be visible
      element.style.setProperty('background-color', 'rgba(255, 215, 0, 0.08)', 'important');
      // 3. Add a subtle shadow for additional visibility
      element.style.setProperty('box-shadow', 'inset 4px 0 0 rgba(255, 215, 0, 0.9)', 'important');
      // 4. Add a subtle outline as backup
      element.style.setProperty('outline', '1px solid rgba(255, 215, 0, 0.6)', 'important');
      element.style.setProperty('outline-offset', '-1px', 'important');
      
      // Force the first cell to have a visible left border as well
      const firstCell = element.querySelector('td:first-child');
      if (firstCell) {
        (firstCell as HTMLElement).style.setProperty('border-left', '4px solid rgba(255, 215, 0, 0.9)', 'important');
        (firstCell as HTMLElement).style.setProperty('background-color', 'rgba(255, 215, 0, 0.05)', 'important');
      }
    }
    
    // Debug logging to confirm highlighting is applied
    console.log('🎨 Applied highlighting styles to element:', {
      element: element,
      tagName: element.tagName,
      className: element.className,
      classList: Array.from(element.classList),
      hasNuggetClass: element.classList.contains('nugget-comment-highlight'),
      computedStyles: {
        borderLeft: window.getComputedStyle(element).borderLeft,
        backgroundColor: window.getComputedStyle(element).backgroundColor,
        boxShadow: window.getComputedStyle(element).boxShadow,
        outline: window.getComputedStyle(element).outline,
        display: window.getComputedStyle(element).display,
        position: window.getComputedStyle(element).position
      },
      appliedStyles: styles,
      siteType: this.siteType,
      // Additional debugging for HackerNews
      ...(this.siteType === 'hackernews' && {
        firstCellStyles: element.querySelector('td:first-child') ? {
          borderLeft: window.getComputedStyle(element.querySelector('td:first-child')!).borderLeft,
          backgroundColor: window.getComputedStyle(element.querySelector('td:first-child')!).backgroundColor
        } : null
      })
    });
    
    // Handle indicator placement differently for HackerNews table layout
    if (this.siteType === 'hackernews') {
      // For HackerNews, don't create safe zone - just position indicator absolutely
      const indicator = this.createCornerIndicator(nugget);
      element.style.position = 'relative'; // Ensure positioning context for indicator
      element.appendChild(indicator);
    } else {
      // For other sites, create text-free zone for indicator by styling all content inside
      this.createIndicatorSafeZone(element);
      
      // Add corner indicator
      const indicator = this.createCornerIndicator(nugget);
      element.style.position = 'relative'; // Ensure positioning context for indicator
      element.appendChild(indicator);
    }
    
    // Add hover effects
    this.addCommentHoverEffects(element);
    
    // Track this highlight
    this.highlights.push(element);
  }

  private addCommentHoverEffects(element: HTMLElement): void {
    const originalStyles = {
      borderLeft: element.style.borderLeft,
      background: element.style.background,
      boxShadow: element.style.boxShadow || ''
    };
    
    const hoverStyles = this.getCommentHoverStyles();
    
    element.addEventListener('mouseenter', () => {
      Object.assign(element.style, hoverStyles);
      // Special handling for Hacker News - enhance the aggressive styling on hover
      if (this.siteType === 'hackernews') {
        element.style.setProperty('border-left', '4px solid rgba(255, 215, 0, 1)', 'important');
        element.style.setProperty('background-color', 'rgba(255, 215, 0, 0.12)', 'important');
        element.style.setProperty('box-shadow', 'inset 4px 0 0 rgba(255, 215, 0, 1)', 'important');
        element.style.setProperty('outline', '1px solid rgba(255, 215, 0, 0.8)', 'important');
        
        // Also enhance the first cell on hover
        const firstCell = element.querySelector('td:first-child');
        if (firstCell) {
          (firstCell as HTMLElement).style.setProperty('border-left', '4px solid rgba(255, 215, 0, 1)', 'important');
          (firstCell as HTMLElement).style.setProperty('background-color', 'rgba(255, 215, 0, 0.08)', 'important');
        }
      }
    });
    
    element.addEventListener('mouseleave', () => {
      Object.assign(element.style, originalStyles);
      // Restore Hacker News aggressive styling
      if (this.siteType === 'hackernews') {
        element.style.setProperty('border-left', '4px solid rgba(255, 215, 0, 0.9)', 'important');
        element.style.setProperty('background-color', 'rgba(255, 215, 0, 0.08)', 'important');
        element.style.setProperty('box-shadow', 'inset 4px 0 0 rgba(255, 215, 0, 0.9)', 'important');
        element.style.setProperty('outline', '1px solid rgba(255, 215, 0, 0.6)', 'important');
        
        // Restore first cell styling
        const firstCell = element.querySelector('td:first-child');
        if (firstCell) {
          (firstCell as HTMLElement).style.setProperty('border-left', '4px solid rgba(255, 215, 0, 0.9)', 'important');
          (firstCell as HTMLElement).style.setProperty('background-color', 'rgba(255, 215, 0, 0.05)', 'important');
        }
      }
    });
  }

  private getCommentHoverStyles(): Record<string, string> {
    const baseStyles = {
      borderLeft: `4px solid rgba(255, 215, 0, 0.9)`,
      borderLeftWidth: '4px', // Keep consistent width to prevent movement
    };
    
    switch (this.siteType) {
      case 'twitter':
        return {
          ...baseStyles,
          background: 'rgba(255, 215, 0, 0.04)',
          boxShadow: 'inset 0 0 0 1px rgba(255, 215, 0, 0.15), 0 0 0 1px rgba(255, 215, 0, 0.2)'
        };
      case 'reddit':
        return {
          ...baseStyles,
          background: 'rgba(255, 215, 0, 0.035)',
          boxShadow: '0 0 0 1px rgba(255, 215, 0, 0.15)'
        };
      case 'hackernews':
        return {
          ...baseStyles,
          background: 'rgba(255, 215, 0, 0.025)',
          boxShadow: '0 0 0 1px rgba(255, 215, 0, 0.1)'
        };
      default:
        return {
          ...baseStyles,
          boxShadow: '0 0 0 1px rgba(255, 215, 0, 0.15)'
        };
    }
  }

  private createIndicatorSafeZone(element: HTMLElement): void {
    // Create a guaranteed text-free zone by styling all content inside the container
    const allChildren = element.querySelectorAll('*');
    const textNodes = this.getDirectTextNodes(element);
    
    // Style all child elements to respect the indicator space
    allChildren.forEach(child => {
      const childElement = child as HTMLElement;
      const currentMarginRight = window.getComputedStyle(childElement).marginRight;
      const currentMarginValue = parseInt(currentMarginRight) || 0;
      childElement.style.marginRight = `${Math.max(currentMarginValue, 60)}px`;
    });
    
    // For direct text nodes, wrap them in a span with margin
    textNodes.forEach(textNode => {
      if (textNode.textContent?.trim()) {
        const wrapper = document.createElement('span');
        wrapper.style.marginRight = '60px';
        wrapper.style.display = 'inline-block';
        wrapper.textContent = textNode.textContent;
        textNode.parentNode?.replaceChild(wrapper, textNode);
      }
    });
  }
  
  private getDirectTextNodes(element: HTMLElement): Node[] {
    const textNodes: Node[] = [];
    for (let i = 0; i < element.childNodes.length; i++) {
      const node = element.childNodes[i];
      if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
        textNodes.push(node);
      }
    }
    return textNodes;
  }

  private getCommentHighlightStyles(): Record<string, string> {
    const baseStyles = {
      borderLeft: `4px solid rgba(255, 215, 0, 0.8)`,
      transition: 'all 0.2s ease',
      boxSizing: 'border-box', // Prevent size changes on hover
    };
    
    switch (this.siteType) {
      case 'twitter':
        return {
          ...baseStyles,
          background: 'rgba(255, 215, 0, 0.025)',
          borderRadius: '2px 0 0 2px',
          boxShadow: 'inset 0 0 0 1px rgba(255, 215, 0, 0.1)',
          paddingTop: '4px',
          paddingBottom: '4px'
        };
      case 'reddit':
        return {
          ...baseStyles,
          background: 'rgba(255, 215, 0, 0.02)',
          borderRadius: '2px 0 0 2px',
          paddingTop: '4px',
          paddingBottom: '4px'
        };
      case 'hackernews':
        return {
          ...baseStyles,
          background: 'rgba(255, 215, 0, 0.015)',
          paddingTop: '4px',
          paddingBottom: '4px'
        };
      default:
        return {
          ...baseStyles,
          paddingTop: '4px',
          paddingBottom: '4px'
        };
    }
  }

  private createCornerIndicator(nugget: GoldenNugget): HTMLElement {
    const indicator = document.createElement('div');
    indicator.className = 'nugget-corner-indicator';
    
    // Consistent, clean design across all sites
    indicator.style.cssText = `
      position: absolute;
      top: 8px;
      right: 8px;
      background: ${colors.text.accent};
      color: ${colors.white};
      font-size: 11px;
      font-weight: 600;
      padding: 3px 6px;
      border-radius: 4px;
      cursor: pointer;
      z-index: ${zIndex.tooltip};
      box-shadow: ${generateInlineStyles.cardShadow()};
      transition: all 0.2s ease;
      user-select: none;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1;
      white-space: nowrap;
    `;
    
    // Clean, consistent content
    indicator.textContent = nugget.type;
    
    // Add hover effect
    indicator.addEventListener('mouseenter', () => {
      indicator.style.background = colors.text.primary;
      indicator.style.boxShadow = generateInlineStyles.cardShadowHover();
      indicator.style.transform = 'scale(1.05)';
    });
    
    indicator.addEventListener('mouseleave', () => {
      indicator.style.background = colors.text.accent;
      indicator.style.boxShadow = generateInlineStyles.cardShadow();
      indicator.style.transform = 'scale(1)';
    });
    
    // Add click handler to show synthesis popup
    indicator.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showSynthesisPopup(nugget, indicator);
    });
    
    return indicator;
  }

  private findAndHighlightText(nugget: GoldenNugget, pageContent?: string): boolean {
    const normalizedContent = getNormalizedContent(nugget, pageContent);
    
    console.log('🎯 [Generic Highlighting Debug] Starting findAndHighlightText:', {
      startContent: nugget.startContent.substring(0, 50) + '...',
      endContent: nugget.endContent.substring(0, 50) + '...',
      normalizedContent: normalizedContent.substring(0, 150) + '...',
      normalizedLength: normalizedContent.length
    });
    
    // Early return if content is too short or empty
    if (normalizedContent.length < 3) {
      console.log('❌ [Generic Highlighting Debug] Content too short, returning false');
      return false;
    }
    
    // For generic sites like Substack, try container-based highlighting first
    // since text is often fragmented across multiple nodes
    console.log('📦 [Generic Highlighting Debug] Trying container-based approach first for generic site...');
    if (this.tryGenericContainerHighlighting(nugget, pageContent)) {
      console.log('✅ [Generic Highlighting Debug] Container-based highlighting succeeded');
      return true;
    }
    
    // Fallback to traditional text node approach
    console.log('🔄 [Generic Highlighting Debug] Container approach failed, trying text node approach...');
    
    // Use more efficient search with caching
    const cacheKey = `highlight_${normalizedContent}`;
    let textNodes = this.searchCache.get(cacheKey);
    
    if (!textNodes) {
      textNodes = this.getTextNodesOptimized();
      this.searchCache.set(cacheKey, textNodes);
      console.log('🔍 [Generic Highlighting Debug] Found text nodes:', textNodes.length);
    } else {
      console.log('📦 [Generic Highlighting Debug] Using cached text nodes:', textNodes.length);
    }

    // Try multiple matching strategies in order of preference
    const result = this.tryMultipleMatchingStrategies(textNodes, nugget, normalizedContent);
    console.log('✅ [Generic Highlighting Debug] tryMultipleMatchingStrategies result:', result);
    return result;
  }





  private createClickableIndicator(nugget: GoldenNugget): HTMLElement {
    const isDiscussionSite = this.isThreadedSite();
    
    const indicator = document.createElement('span');
    indicator.className = 'nugget-indicator';
    indicator.style.cssText = `
      cursor: pointer;
      margin-left: 4px;
      font-size: 12px;
      opacity: 0.7;
      user-select: none;
    `;
    
    // For generic sites (text highlighting), show sparkles icon
    // For threaded sites, this indicator should not be used as we use corner indicators instead
    indicator.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/></svg>';
    indicator.style.cssText += `
      font-size: 14px;
    `;
    
    // Add click handler to show synthesis popup
    indicator.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showSynthesisPopup(nugget, indicator);
    });
    
    return indicator;
  }

  private showSynthesisPopup(nugget: GoldenNugget, targetElement: HTMLElement): void {
    // Remove any existing popups
    this.popups.forEach(popup => popup.remove());
    this.popups = [];
    
    const popup = document.createElement('div');
    popup.className = 'nugget-synthesis-popup';
    popup.style.cssText = `
      position: absolute;
      background: white;
      border: 1px solid ${colors.border.default};
      padding: 12px;
      border-radius: 4px;
      box-shadow: ${generateInlineStyles.notification()};
      max-width: 300px;
      z-index: ${zIndex.overlay};
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.4;
    `;
    
    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = `
      position: absolute;
      top: 4px;
      right: 8px;
      background: none;
      border: none;
      font-size: 18px;
      cursor: pointer;
      padding: 0;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    closeBtn.addEventListener('click', () => popup.remove());
    
    // Add content
    const content = document.createElement('div');
    content.style.paddingRight = '20px';
    content.textContent = nugget.synthesis;
    
    popup.appendChild(closeBtn);
    popup.appendChild(content);
    
    // Position popup near target element
    this.positionPopup(popup, targetElement);
    
    document.body.appendChild(popup);
    this.popups.push(popup);
    
    // Close on click outside
    setTimeout(() => {
      const closeHandler = (e: MouseEvent) => {
        if (!popup.contains(e.target as Node)) {
          popup.remove();
          document.removeEventListener('click', closeHandler);
        }
      };
      document.addEventListener('click', closeHandler);
    }, 0);
  }

  private positionPopup(popup: HTMLElement, targetElement: HTMLElement): void {
    const rect = targetElement.getBoundingClientRect();
    const popupRect = popup.getBoundingClientRect();
    
    let top = rect.bottom + window.scrollY + 5;
    let left = rect.left + window.scrollX;
    
    // For corner indicators, position popup differently
    if (targetElement.classList.contains('nugget-corner-indicator')) {
      // Position popup below and to the left of the corner indicator
      top = rect.bottom + window.scrollY + 8;
      left = rect.right + window.scrollX - 300; // Align right edge of popup with indicator
    }
    
    // Adjust if popup would go off-screen
    if (left + 300 > window.innerWidth) {
      left = window.innerWidth - 300 - 20;
    }
    
    if (left < 20) {
      left = 20;
    }
    
    if (top + 200 > window.innerHeight + window.scrollY) {
      top = rect.top + window.scrollY - 200 - 5;
    }
    
    popup.style.top = `${top}px`;
    popup.style.left = `${left}px`;
  }

  private normalizeText(text: string): string {
    if (this.textCache.has(text)) {
      return this.textCache.get(text)!;
    }
    
    const normalized = text
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '')
      .toLowerCase()
      .trim();
    
    // Cache with size limit
    if (this.textCache.size > 200) {
      this.textCache.clear();
    }
    this.textCache.set(text, normalized);
    
    return normalized;
  }

  private improvedTextMatching(nuggetText: string, commentText: string): boolean {
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
  
  private getTextNodesOptimized(): Element[] {
    const textNodes: Element[] = [];
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          
          // Skip already highlighted content and UI elements
          if (parent.classList.contains('nugget-highlight') || 
              parent.classList.contains('nugget-sidebar') ||
              parent.classList.contains('nugget-notification-banner')) {
            return NodeFilter.FILTER_REJECT;
          }
          
          // Skip elements that are unlikely to contain meaningful content
          const tagName = parent.tagName.toLowerCase();
          if (['script', 'style', 'noscript', 'svg', 'canvas'].includes(tagName)) {
            return NodeFilter.FILTER_REJECT;
          }
          
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let textNode: Node | null;
    while (textNode = walker.nextNode()) {
      const text = textNode.textContent || '';
      // Only include text nodes with meaningful content
      if (text.trim().length > 10) {
        textNodes.push(textNode as Element);
      }
    }
    
    return textNodes;
  }
  
  private tryMultipleMatchingStrategies(textNodes: Element[], nugget: GoldenNugget, normalizedContent: string): boolean {
    const originalContent = getDisplayContent(nugget, pageContent);
    
    console.log('🎲 [Matching Strategies Debug] Starting strategies for:', {
      nuggetType: nugget.type,
      textNodesCount: textNodes.length,
      normalizedContentLength: normalizedContent.length
    });
    
    // Strategy 1: Exact substring match (most precise) - KEEP ORIGINAL SIMPLE LOGIC
    console.log('🎯 [Strategy 1] Trying exact substring match...');
    let matchAttempts = 0;
    for (const textNode of textNodes) {
      const text = textNode.textContent || '';
      const normalizedText = this.normalizeText(text);
      matchAttempts++;
      
      if (matchAttempts <= 5) { // Log first 5 attempts
        console.log(`🔍 [Strategy 1] Attempt ${matchAttempts}:`, {
          nodeText: text.substring(0, 100) + '...',
          normalizedNodeText: normalizedText.substring(0, 100) + '...',
          includes: normalizedText.includes(normalizedContent),
          targetContent: normalizedContent.substring(0, 100) + '...'
        });
      }
      
      if (normalizedText.includes(normalizedContent)) {
        console.log('✅ [Strategy 1] Found exact match! Highlighting...');
        this.highlightTextNodeSimple(textNode as Text, nugget, normalizedContent);
        return true;
      }
    }
    console.log(`❌ [Strategy 1] No exact matches found in ${matchAttempts} text nodes`);
    
    // Strategy 2: Key phrase matching (extract key phrases from content)
    console.log('🗝️ [Strategy 2] Trying key phrase matching...');
    const keyPhrases = this.extractKeyPhrases(originalContent);
    console.log('🗝️ [Strategy 2] Extracted key phrases:', keyPhrases.slice(0, 3).map(p => p.substring(0, 50) + '...'));
    
    for (const phrase of keyPhrases) {
      const normalizedPhrase = this.normalizeText(phrase);
      if (normalizedPhrase.length > 8) { // Only try meaningful phrases
        for (const textNode of textNodes) {
          const text = textNode.textContent || '';
          const normalizedText = this.normalizeText(text);
          
          if (normalizedText.includes(normalizedPhrase)) {
            console.log('✅ [Strategy 2] Found phrase match! Highlighting...');
            this.highlightTextNodeSimple(textNode as Text, nugget, normalizedPhrase);
            return true;
          }
        }
      }
    }
    console.log('❌ [Strategy 2] No phrase matches found');
    
    // Strategy 3: Fuzzy word matching
    console.log('🔀 [Strategy 3] Trying fuzzy word matching...');
    let fuzzyAttempts = 0;
    for (const textNode of textNodes) {
      const text = textNode.textContent || '';
      const normalizedText = this.normalizeText(text);
      fuzzyAttempts++;
      
      if (this.fuzzyMatch(normalizedText, normalizedContent)) {
        console.log('✅ [Strategy 3] Found fuzzy match! Highlighting...');
        this.highlightTextNodeSimple(textNode as Text, nugget, normalizedContent);
        return true;
      }
    }
    console.log(`❌ [Strategy 3] No fuzzy matches found in ${fuzzyAttempts} text nodes`);
    
    // Strategy 4: Container-based search for HTML fragmentation (NEW - only as last resort)
    console.log('📦 [Strategy 4] Trying container-based highlighting as last resort...');
    const containerResult = this.tryContainerBasedHighlighting(nugget, pageContent);
    console.log(`🎲 [Matching Strategies Debug] All strategies completed. Final result: ${containerResult}`);
    return containerResult;
  }

  private highlightTextNodeSimple(textNode: Text, nugget: GoldenNugget, searchTerm: string): void {
    // Back to the original simple logic that worked
    const text = textNode.textContent || '';
    const normalizedText = this.normalizeText(text);
    
    const startIndex = normalizedText.indexOf(searchTerm);
    if (startIndex === -1) return;
    
    // Calculate the actual positions in the original text (simplified)
    const beforeText = text.substring(0, startIndex);
    const highlightText = text.substring(startIndex, startIndex + searchTerm.length);
    const afterText = text.substring(startIndex + searchTerm.length);
    
    // Create the highlight element with highly visible styling
    const highlightSpan = document.createElement('span');
    highlightSpan.className = 'nugget-highlight';
    
    // Apply highly visible styles with !important to override site CSS
    highlightSpan.style.cssText = `
      background-color: ${colors.highlight.background} !important;
      padding: 2px 4px !important;
      border-radius: 3px !important;
      border: 1px solid ${colors.highlight.border} !important;
      box-shadow: 0 0 0 2px ${colors.highlight.border}40, 0 2px 4px rgba(0,0,0,0.1) !important;
      position: relative !important;
      z-index: ${zIndex.tooltip} !important;
      display: inline !important;
      font-weight: 500 !important;
      text-decoration: none !important;
      color: inherit !important;
      line-height: inherit !important;
    `;
    
    highlightSpan.dataset.nuggetType = nugget.type;
    highlightSpan.textContent = highlightText;
    
    // Create clickable indicator
    const indicator = this.createClickableIndicator(nugget);
    
    // Replace the text node with the highlighted version
    const parent = textNode.parentNode;
    if (parent) {
      if (beforeText) {
        parent.insertBefore(document.createTextNode(beforeText), textNode);
      }
      parent.insertBefore(highlightSpan, textNode);
      if (afterText) {
        parent.insertBefore(document.createTextNode(afterText), textNode);
      }
      parent.removeChild(textNode);
      
      // Place indicator at the end of the containing comment element
      this.placeIndicatorAtCommentEnd(indicator, parent as Element);
    }
    
    this.highlights.push(highlightSpan);
  }
  
  private highlightSubstantialText(textNode: Text, nugget: GoldenNugget, targetPhrase: string, pageContent?: string): void {
    const text = textNode.textContent || '';
    const normalizedText = this.normalizeText(text);
    const normalizedPhrase = this.normalizeText(targetPhrase);
    const normalizedNugget = getNormalizedContent(nugget, pageContent);
    
    // Find the best position to highlight - prioritize content from the beginning of the nugget
    let startIndex = 0;
    let endIndex = text.length;
    
    // Check if this text contains the beginning of the nugget
    const nuggetStart = this.normalizeText(nugget.startContent);
    const containsNuggetStart = normalizedText.includes(nuggetStart);
    
    // Look for sentence boundaries to highlight complete thoughts
    const sentences = text.split(/[.!?]+/);
    let bestSentence = '';
    let bestScore = 0;
    let startPriority = false;
    
    for (const sentence of sentences) {
      const normalizedSentence = this.normalizeText(sentence);
      const score = this.getOverlapScore(normalizedSentence, normalizedPhrase);
      const hasStart = normalizedSentence.includes(nuggetStart);
      
      // Prioritize sentences that contain the beginning of the nugget
      if (hasStart && sentence.trim().length > 20) {
        bestSentence = sentence.trim();
        bestScore = score;
        startPriority = true;
        break; // Found sentence with start, use it
      } else if (!startPriority && score > bestScore && sentence.trim().length > 20) {
        bestScore = score;
        bestSentence = sentence.trim();
      }
    }
    
    // If we found a good sentence, highlight it; otherwise highlight substantial portion
    let highlightText: string;
    if (bestSentence && (startPriority || bestScore > 0.3)) {
      highlightText = bestSentence;
      startIndex = text.indexOf(bestSentence);
      endIndex = startIndex + bestSentence.length;
    } else if (containsNuggetStart) {
      // If the text contains the nugget start, try to highlight from the beginning
      const words = text.split(/\s+/);
      const startWords = nuggetStart.split(' ');
      
      // Find where the nugget start appears in the text
      for (let i = 0; i <= words.length - startWords.length; i++) {
        const window = words.slice(i, i + startWords.length);
        const windowNormalized = this.normalizeText(window.join(' '));
        
        if (windowNormalized.includes(nuggetStart)) {
          // Expand to include substantial context (15-30 words)
          const expandedStart = i;
          const expandedEnd = Math.min(words.length, i + 30);
          const expandedChunk = words.slice(expandedStart, expandedEnd).join(' ');
          
          if (expandedChunk.length > 40) {
            highlightText = expandedChunk;
            startIndex = text.indexOf(expandedChunk);
            endIndex = startIndex + expandedChunk.length;
            break;
          }
        }
      }
    } else {
      // Highlight a larger chunk around where we find key words
      const words = normalizedText.split(' ');
      const phraseWords = normalizedPhrase.split(' ').slice(0, 5); // First 5 words
      
      let bestWordIndex = -1;
      let maxMatches = 0;
      
      for (let i = 0; i < words.length - phraseWords.length + 1; i++) {
        const window = words.slice(i, i + phraseWords.length);
        const matches = window.filter(w => phraseWords.includes(w)).length;
        if (matches > maxMatches) {
          maxMatches = matches;
          bestWordIndex = i;
        }
      }
      
      if (bestWordIndex >= 0 && maxMatches > 0) {
        // Expand the highlight to include more context (3-4 sentences worth)
        const expandedStart = Math.max(0, bestWordIndex - 10);
        const expandedEnd = Math.min(words.length, bestWordIndex + 25);
        const expandedWords = words.slice(expandedStart, expandedEnd);
        
        // Find this expanded text in the original
        const expandedNormalized = expandedWords.join(' ');
        const originalWords = text.split(/\s+/);
        
        for (let i = 0; i <= originalWords.length - expandedWords.length; i++) {
          const chunk = originalWords.slice(i, i + expandedWords.length).join(' ');
          if (this.normalizeText(chunk) === expandedNormalized) {
            highlightText = chunk;
            startIndex = text.indexOf(chunk);
            endIndex = startIndex + chunk.length;
            break;
          }
        }
      }
      
      // Fallback to simple phrase matching
      if (!highlightText) {
        highlightText = targetPhrase;
        startIndex = text.toLowerCase().indexOf(targetPhrase.toLowerCase());
        endIndex = startIndex + targetPhrase.length;
      }
    }
    
    if (startIndex === -1 || !highlightText) {
      // Final fallback - highlight the whole text node if it's substantial
      if (text.length > 30) {
        highlightText = text;
        startIndex = 0;
        endIndex = text.length;
      } else {
        return; // Don't highlight tiny fragments
      }
    }
    
    const beforeText = text.substring(0, startIndex);
    const afterText = text.substring(endIndex);
    
    // Create the highlight element with highly visible styling
    const highlightSpan = document.createElement('span');
    highlightSpan.className = 'nugget-highlight';
    
    // Apply highly visible styles with !important to override site CSS
    highlightSpan.style.cssText = `
      background-color: ${colors.highlight.background} !important;
      padding: 3px 6px !important;
      border-radius: 4px !important;
      border: 2px solid ${colors.highlight.border} !important;
      box-shadow: 0 0 0 3px ${colors.highlight.border}30, 0 4px 8px rgba(0,0,0,0.15) !important;
      position: relative !important;
      z-index: ${zIndex.tooltip} !important;
      display: inline !important;
      font-weight: 600 !important;
      text-decoration: none !important;
      color: inherit !important;
      line-height: 1.4 !important;
      margin: 2px 0 !important;
    `;
    
    highlightSpan.dataset.nuggetType = nugget.type;
    highlightSpan.textContent = highlightText;
    
    // Create clickable indicator
    const indicator = this.createClickableIndicator(nugget);
    
    // Replace the text node with the highlighted version
    const parent = textNode.parentNode;
    if (parent) {
      if (beforeText) {
        parent.insertBefore(document.createTextNode(beforeText), textNode);
      }
      parent.insertBefore(highlightSpan, textNode);
      if (afterText) {
        parent.insertBefore(document.createTextNode(afterText), textNode);
      }
      parent.removeChild(textNode);
      
      // Place indicator at the end of the containing comment element
      this.placeIndicatorAtCommentEnd(indicator, parent as Element);
    }
    
    this.highlights.push(highlightSpan);
  }

  private placeIndicatorAtCommentEnd(indicator: HTMLElement, startElement: Element): void {
    // Find the containing comment element by traversing up the DOM tree
    let commentContainer = startElement;
    
    // Look for common comment container selectors
    const commentSelectors = [
      '.comtr',       // HackerNews comment container
      '.comment',     // HackerNews comment wrapper
      SITE_SELECTORS.HACKER_NEWS.COMMENTS,    // HackerNews comment text (for traversal)
      '.thing',       // Reddit
      '.Comment',     // Reddit modern
      '[class*="comment"]',  // Generic comment classes
      '[class*="Comment"]',  // Generic comment classes (capitalized)
      '[data-testid*="comment"]',  // Test ID patterns
      'article',      // Generic article elements
      'p',            // Paragraph elements as last resort
    ];
    
    // Traverse up the DOM tree to find a comment container
    while (commentContainer && commentContainer !== document.body) {
      for (const selector of commentSelectors) {
        if (commentContainer.matches && commentContainer.matches(selector)) {
          // Found a comment container, place indicator at the end
          this.appendIndicatorToContainer(indicator, commentContainer);
          return;
        }
      }
      commentContainer = commentContainer.parentElement!;
    }
    
    // Fallback: place indicator right after the start element
    if (startElement.parentElement) {
      startElement.parentElement.insertBefore(indicator, startElement.nextSibling);
    }
  }

  private appendIndicatorToContainer(indicator: HTMLElement, container: Element): void {
    // Try to find the best place to insert the indicator within the container
    const lastChild = container.lastChild;
    
    if (lastChild && lastChild.nodeType === Node.TEXT_NODE) {
      // If the last child is a text node, insert after it
      container.appendChild(indicator);
    } else if (lastChild && lastChild.nodeType === Node.ELEMENT_NODE) {
      // If the last child is an element, insert after it
      container.appendChild(indicator);
    } else {
      // Fallback: just append to the container
      container.appendChild(indicator);
    }
  }

  private tryGenericContainerHighlighting(nugget: GoldenNugget, pageContent?: string): boolean {
    const normalizedContent = getNormalizedContent(nugget, pageContent);
    
    console.log('🏗️ [Generic Container Debug] Starting generic container highlighting:', {
      normalizedContent: normalizedContent.substring(0, 100) + '...'
    });
    
    // For generic sites like Substack, look for content within article, main, or paragraph containers
    // Order by preference - larger containers first to get more context
    const containerSelectors = [
      'article', // Main article content (common on Substack)
      'main',    // Main content area
      '.post-content', // Common blog post container
      '.content', // Generic content container
      '[class*="post"]', // Post-related containers
      '[class*="article"]', // Article-related containers
      '[class*="content"]',  // Content-related containers
      'div[class*="body"]', // Substack body containers
      'div[class*="markup"]', // Substack markup containers
      'p'        // Individual paragraphs (last resort)
    ];
    
    // First pass: Look for containers that contain substantial portions of the nugget
    for (const selector of containerSelectors) {
      const containers = document.querySelectorAll(selector);
      console.log(`🏗️ [Generic Container Debug] Checking ${containers.length} containers for selector: ${selector}`);
      
      for (const container of containers) {
        // Skip our own UI elements and already highlighted content
        if (container.classList.contains('nugget-sidebar') ||
            container.classList.contains('nugget-highlight') ||
            container.classList.contains('nugget-comment-highlight')) {
          continue;
        }
        
        const containerText = container.textContent || '';
        
        // Skip tiny containers unless they're the only option
        if (containerText.length < 50 && selector !== 'p') {
          continue;
        }
        
        // Use improved text matching algorithm (same as comment highlighting)
        if (improvedStartEndTextMatching(nugget, containerText)) {
          console.log('✅ [Generic Container Debug] Found matching container! Highlighting with key phrase approach...');
          
          // For large containers (like article), try to find the best specific text
          // For smaller containers (like p), highlight more of the container content
          if (containerText.length > 500) {
            return this.highlightBestTextInContainer(container, nugget, pageContent);
          } else {
            // For smaller containers, highlight substantial portion
            return this.highlightContainerDirectly(container, nugget, pageContent);
          }
        }
      }
    }
    
    // Second pass: Look for any container that has reasonable overlap
    for (const selector of containerSelectors) {
      const containers = document.querySelectorAll(selector);
      
      for (const container of containers) {
        if (container.classList.contains('nugget-sidebar') ||
            container.classList.contains('nugget-highlight') ||
            container.classList.contains('nugget-comment-highlight')) {
          continue;
        }
        
        const containerText = container.textContent || '';
        const normalizedContainer = this.normalizeText(containerText);
        
        // Check for partial matches with lower threshold
        if (this.getOverlapScore(normalizedContainer, normalizedContent) > 0.4 && containerText.length > 30) {
          console.log('✅ [Generic Container Debug] Found container with partial match, highlighting...');
          return this.highlightBestTextInContainer(container, nugget, pageContent);
        }
      }
    }
    
    console.log('❌ [Generic Container Debug] No suitable generic containers found');
    return false;
  }
  
  private highlightContainerDirectly(container: Element, nugget: GoldenNugget, pageContent?: string): boolean {
    // For smaller containers, try to highlight a substantial portion that represents the nugget
    const containerText = container.textContent || '';
    const textNodes = this.getTextNodesInElement(container);
    
    if (textNodes.length === 0) return false;
    
    // If there's only one significant text node, highlight it
    if (textNodes.length === 1) {
      const textNode = textNodes[0] as Text;
      const text = textNode.textContent || '';
      if (text.trim().length > 20) {
        this.highlightSubstantialText(textNode, nugget, getDisplayContent(nugget, pageContent), pageContent);
        return true;
      }
    }
    
    // For multiple text nodes, find the best one
    let bestTextNode: Text | null = null;
    let bestScore = 0;
    
    for (const textNode of textNodes) {
      const text = textNode.textContent || '';
      const normalizedText = this.normalizeText(text);
      const score = this.getOverlapScore(normalizedText, getNormalizedContent(nugget, pageContent));
      
      if (score > bestScore && text.trim().length > 15) {
        bestScore = score;
        bestTextNode = textNode as Text;
      }
    }
    
    if (bestTextNode && bestScore > 0.2) {
      this.highlightSubstantialText(bestTextNode, nugget, getDisplayContent(nugget, pageContent), pageContent);
      return true;
    }
    
    return false;
  }

  private highlightBestTextInContainer(container: Element, nugget: GoldenNugget, pageContent?: string): boolean {
    console.log('🎯 [Best Text Debug] Finding best text to highlight in container');
    
    const containerText = container.textContent || '';
    const normalizedContainer = this.normalizeText(containerText);
    const normalizedNugget = getNormalizedContent(nugget, pageContent);
    
    // NEW STRATEGY: Try to highlight multiple text nodes that together contain more of the nugget
    console.log('🔗 [Multi-Node Strategy] Attempting to find multiple text nodes that together contain more nugget content...');
    if (this.tryMultiNodeHighlighting(container, nugget, pageContent)) {
      return true;
    }
    
    // Extract key phrases from the nugget content
    const keyPhrases = this.extractKeyPhrases(getDisplayContent(nugget, pageContent));
    console.log('🗝️ [Best Text Debug] Key phrases:', keyPhrases.slice(0, 3).map(p => p.substring(0, 50) + '...'));
    
    // Find text nodes within the container
    const textNodes = this.getTextNodesInElement(container);
    console.log('📝 [Best Text Debug] Found text nodes in container:', textNodes.length);
    
    // Strategy 1: Try to find text nodes with substantial content, prioritize longer matches
    const nuggetStart = this.normalizeText(nugget.startContent); // First 8 words
    
    // Sort phrases by length descending to prioritize longer, more complete content
    const sortedPhrases = keyPhrases.sort((a, b) => b.length - a.length);
    
    for (const phrase of sortedPhrases) {
      const normalizedPhrase = this.normalizeText(phrase);
      if (normalizedPhrase.length > 20) { // Prioritize longer, more substantial phrases
        
        for (const textNode of textNodes) {
          const text = textNode.textContent || '';
          const normalizedText = this.normalizeText(text);
          
          // Prefer phrases that include the beginning of the nugget
          const includesStart = normalizedText.includes(nuggetStart);
          const hasSubstantialOverlap = this.getOverlapScore(normalizedText, normalizedPhrase) > 0.6;
          
          if ((includesStart || hasSubstantialOverlap) && text.trim().length > 20) {
            console.log('✅ [Best Text Debug] Found substantial text node with key phrase, highlighting...');
            // NEW: Try to highlight as much of the phrase as possible within this node's context
            this.highlightMaximalText(textNode as Text, nugget, phrase, pageContent);
            return true;
          }
        }
      }
    }
    
    // Strategy 2: Try to find the best single text node that represents the nugget
    let bestTextNode: Text | null = null;
    let bestScore = 0;
    let bestPhrase = '';
    
    for (const phrase of sortedPhrases) {
      const normalizedPhrase = this.normalizeText(phrase);
      if (normalizedPhrase.length > 10) {
        
        for (const textNode of textNodes) {
          const text = textNode.textContent || '';
          const normalizedText = this.normalizeText(text);
          
          const score = this.getOverlapScore(normalizedText, normalizedPhrase);
          if (score > bestScore && text.trim().length > 15) {
            bestScore = score;
            bestTextNode = textNode as Text;
            bestPhrase = phrase;
          }
        }
      }
    }
    
    if (bestTextNode && bestScore > 0.3) {
      console.log('✅ [Best Text Debug] Found best matching text node, highlighting...');
      this.highlightMaximalText(bestTextNode, nugget, bestPhrase, pageContent);
      return true;
    }
    
    // Strategy 3: Try to find any text node that contains the beginning of the nugget
    const nuggetWords = getNormalizedContent(nugget, pageContent).split(' ');
    const firstSignificantWords = nuggetWords.slice(0, 12).join(' '); // More words for better context
    
    for (const textNode of textNodes) {
      const text = textNode.textContent || '';
      const normalizedText = this.normalizeText(text);
      
      if (normalizedText.includes(firstSignificantWords) && text.trim().length > 20) {
        console.log('✅ [Best Text Debug] Found text node with beginning words, highlighting...');
        this.highlightMaximalText(textNode as Text, nugget, getDisplayContent(nugget, pageContent), pageContent);
        return true;
      }
    }
    
    console.log('❌ [Best Text Debug] Could not find suitable text node to highlight');
    return false;
  }

  private tryMultiNodeHighlighting(container: Element, nugget: GoldenNugget, pageContent?: string): boolean {
    console.log('🔗 [Multi-Node Debug] Starting multi-node highlighting');
    
    const containerText = container.textContent || '';
    const normalizedContainer = this.normalizeText(containerText);
    const normalizedNugget = getNormalizedContent(nugget, pageContent);
    
    // Check if the container has enough of the nugget content to warrant multi-node highlighting
    const overlap = this.getOverlapScore(normalizedContainer, normalizedNugget);
    if (overlap < 0.4) { // Lowered threshold to catch more cases
      console.log('❌ [Multi-Node Debug] Container overlap too low:', overlap);
      return false;
    }
    
    // NEW: Try paragraph-based approach first for better content grouping
    if (this.tryParagraphBasedHighlighting(container, nugget, pageContent)) {
      return true;
    }
    
    // Find all text nodes in container
    const textNodes = this.getTextNodesInElement(container);
    if (textNodes.length < 2) {
      console.log('❌ [Multi-Node Debug] Not enough text nodes for multi-node highlighting');
      return false;
    }
    
    // Try to find a sequence of text nodes that together contain a substantial portion of the nugget
    console.log('🔍 [Multi-Node Debug] Looking for sequences of text nodes...');
    
    const nuggetWords = getNormalizedContent(nugget, pageContent).split(' ');
    const minWordsToMatch = Math.max(6, Math.floor(nuggetWords.length * 0.4)); // Lowered threshold: 40% of words or 6 words
    
    for (let i = 0; i < textNodes.length; i++) {
      for (let j = i + 1; j <= Math.min(i + 8, textNodes.length); j++) { // Check longer sequences up to 8 nodes
        const sequenceNodes = textNodes.slice(i, j);
        const combinedText = sequenceNodes.map(n => n.textContent || '').join(' ');
        const normalizedCombined = this.normalizeText(combinedText);
        
        // Count how many nugget words are in this sequence
        const combinedWords = normalizedCombined.split(' ');
        const matchingWords = nuggetWords.filter(word => word.length > 2 && combinedWords.includes(word)); // Only meaningful words
        
        if (matchingWords.length >= minWordsToMatch && combinedText.length > 40) { // Lowered minimum length
          console.log('✅ [Multi-Node Debug] Found good sequence:', {
            nodes: sequenceNodes.length,
            matchingWords: matchingWords.length,
            totalWords: nuggetWords.length,
            matchRatio: matchingWords.length / nuggetWords.length,
            textPreview: combinedText.substring(0, 150) + '...'
          });
          
          // Highlight each node in the sequence with a slightly different approach
          return this.highlightNodeSequence(sequenceNodes as Text[], nugget, combinedText);
        }
      }
    }
    
    console.log('❌ [Multi-Node Debug] No good sequences found');
    return false;
  }
  
  private tryParagraphBasedHighlighting(container: Element, nugget: GoldenNugget, pageContent?: string): boolean {
    console.log('📄 [Paragraph Debug] Trying paragraph-based highlighting');
    
    // Look for paragraph elements that together might contain the nugget
    const paragraphs = container.querySelectorAll('p, div[class*="paragraph"], paragraph');
    if (paragraphs.length < 2) {
      console.log('❌ [Paragraph Debug] Not enough paragraphs found');
      return false;
    }
    
    const normalizedNugget = getNormalizedContent(nugget, pageContent);
    const nuggetWords = normalizedNugget.split(' ');
    const minWordsToMatch = Math.max(6, Math.floor(nuggetWords.length * 0.4));
    
    console.log('🔍 [Paragraph Debug] Checking', paragraphs.length, 'paragraphs for content spans');
    
    // Try combinations of consecutive paragraphs
    for (let i = 0; i < paragraphs.length; i++) {
      for (let j = i + 1; j <= Math.min(i + 4, paragraphs.length); j++) { // Up to 4 consecutive paragraphs
        const paragraphSet = Array.from(paragraphs).slice(i, j);
        const combinedText = paragraphSet.map(p => p.textContent || '').join(' ');
        const normalizedCombined = this.normalizeText(combinedText);
        
        // Count word matches
        const combinedWords = normalizedCombined.split(' ');
        const matchingWords = nuggetWords.filter(word => word.length > 2 && combinedWords.includes(word));
        
        if (matchingWords.length >= minWordsToMatch && combinedText.length > 80) {
          console.log('✅ [Paragraph Debug] Found good paragraph sequence:', {
            paragraphs: paragraphSet.length,
            matchingWords: matchingWords.length,
            totalWords: nuggetWords.length,
            matchRatio: matchingWords.length / nuggetWords.length,
            textPreview: combinedText.substring(0, 200) + '...'
          });
          
          // Find the best paragraph to highlight from this sequence
          return this.highlightBestParagraphFromSequence(paragraphSet, nugget, combinedText);
        }
      }
    }
    
    console.log('❌ [Paragraph Debug] No good paragraph sequences found');
    return false;
  }
  
  private highlightBestParagraphFromSequence(paragraphs: Element[], nugget: GoldenNugget, combinedText: string): boolean {
    console.log('🎯 [Paragraph Highlight] Selecting best paragraph from sequence of', paragraphs.length);
    
    const normalizedNugget = getNormalizedContent(nugget, pageContent);
    let bestParagraph: Element | null = null;
    let bestScore = 0;
    
    // Find paragraph with best overlap with nugget content
    for (const paragraph of paragraphs) {
      const paragraphText = paragraph.textContent || '';
      const normalizedParagraph = this.normalizeText(paragraphText);
      const score = this.getOverlapScore(normalizedParagraph, normalizedNugget);
      
      if (score > bestScore && paragraphText.length > 20) {
        bestScore = score;
        bestParagraph = paragraph;
      }
    }
    
    if (bestParagraph && bestScore > 0.3) {
      console.log('✅ [Paragraph Highlight] Found best paragraph with score:', bestScore);
      
      // Get text nodes from the best paragraph and highlight multiple nodes if beneficial
      const textNodes = this.getTextNodesInElement(bestParagraph);
      if (textNodes.length > 1) {
        return this.highlightNodeSequence(textNodes.slice(0, 3) as Text[], nugget, combinedText);
      } else if (textNodes.length === 1) {
        this.highlightMaximalText(textNodes[0] as Text, nugget, getDisplayContent(nugget, pageContent), pageContent);
        return true;
      }
    }
    
    console.log('❌ [Paragraph Highlight] Could not find suitable paragraph to highlight');
    return false;
  }
  
  private highlightNodeSequence(nodes: Text[], nugget: GoldenNugget, combinedText: string): boolean {
    console.log('🎨 [Sequence Highlight] Highlighting', nodes.length, 'nodes in sequence');
    
    let highlightedCount = 0;
    
    for (let i = 0; i < nodes.length; i++) {
      const textNode = nodes[i];
      const text = textNode.textContent || '';
      
      // Skip nodes with too little meaningful content
      if (text.trim().length < 5) {
        continue;
      }
      
      // For the first node, try to include as much context as possible
      // For subsequent nodes, highlight the whole node if it has meaningful content
      if (i === 0) {
        // For first node, try to find the best starting point
        this.highlightMaximalText(textNode, nugget, combinedText, pageContent);
      } else {
        // For subsequent nodes, highlight the whole meaningful content
        this.highlightWholeTextNode(textNode, nugget);
      }
      
      highlightedCount++;
      
      // Don't highlight too many nodes to avoid overwhelming the user
      if (highlightedCount >= 3) {
        break;
      }
    }
    
    return highlightedCount > 0;
  }
  
  private highlightMaximalText(textNode: Text, nugget: GoldenNugget, targetContent: string, pageContent?: string): void {
    console.log('📏 [Maximal Text Debug] Highlighting maximal text within node');
    
    const text = textNode.textContent || '';
    const normalizedText = this.normalizeText(text);
    const normalizedTarget = this.normalizeText(targetContent);
    
    // Try to find the longest possible matching substring
    let bestMatch = this.findLongestMatch(text, targetContent);
    
    if (!bestMatch && normalizedText.length > 10) {
      // Fallback: if we can't find a direct match, try to highlight a substantial portion
      // that has good word overlap with the target
      const textWords = normalizedText.split(' ');
      const targetWords = normalizedTarget.split(' ');
      const matchingWords = textWords.filter(word => word.length > 2 && targetWords.includes(word));
      
      if (matchingWords.length >= Math.min(5, targetWords.length * 0.4)) {
        // If we have good word overlap, highlight a substantial portion of the text
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
        if (sentences.length > 0) {
          // Find the sentence with the best overlap
          let bestSentence = sentences[0];
          let bestScore = 0;
          
          for (const sentence of sentences) {
            const sentenceNorm = this.normalizeText(sentence);
            const score = this.getOverlapScore(sentenceNorm, normalizedTarget);
            if (score > bestScore) {
              bestScore = score;
              bestSentence = sentence;
            }
          }
          
          if (bestScore > 0.3) {
            bestMatch = {
              text: bestSentence.trim(),
              startIndex: text.indexOf(bestSentence.trim()),
              endIndex: text.indexOf(bestSentence.trim()) + bestSentence.trim().length
            };
          }
        }
      }
    }
    
    // If still no good match, highlight a meaningful chunk from the beginning
    if (!bestMatch && text.length > 30) {
      const words = text.split(/\s+/);
      const chunkSize = Math.min(20, Math.max(8, Math.floor(words.length * 0.6))); // 60% of words, but between 8-20
      const chunk = words.slice(0, chunkSize).join(' ');
      bestMatch = {
        text: chunk,
        startIndex: 0,
        endIndex: chunk.length
      };
    }
    
    if (bestMatch) {
      this.createHighlightSpan(textNode, bestMatch, nugget);
    }
  }
  
  private highlightWholeTextNode(textNode: Text, nugget: GoldenNugget): void {
    const text = textNode.textContent || '';
    if (text.trim().length > 5) {
      const match = {
        text: text,
        startIndex: 0,
        endIndex: text.length
      };
      this.createHighlightSpan(textNode, match, nugget);
    }
  }
  
  private findLongestMatch(text: string, targetContent: string): { text: string, startIndex: number, endIndex: number } | null {
    const normalizedText = this.normalizeText(text);
    const normalizedTarget = this.normalizeText(targetContent);
    
    // Look for the longest substring match
    let bestMatch: { text: string, startIndex: number, endIndex: number } | null = null;
    let maxLength = 0;
    
    // Try different chunk sizes, starting with larger ones
    const words = text.split(/\s+/);
    for (let chunkSize = Math.min(words.length, 25); chunkSize >= 4; chunkSize--) { // Increased max size and lowered min
      for (let i = 0; i <= words.length - chunkSize; i++) {
        const chunk = words.slice(i, i + chunkSize).join(' ');
        const normalizedChunk = this.normalizeText(chunk);
        
        // Check both directions: chunk in target AND target phrases in chunk
        const chunkInTarget = normalizedTarget.includes(normalizedChunk);
        const targetPhraseInChunk = this.hasSignificantOverlap(normalizedChunk, normalizedTarget);
        
        if ((chunkInTarget || targetPhraseInChunk) && chunk.length > maxLength) {
          const startIndex = text.indexOf(chunk);
          if (startIndex !== -1) {
            maxLength = chunk.length;
            bestMatch = {
              text: chunk,
              startIndex: startIndex,
              endIndex: startIndex + chunk.length
            };
          }
        }
      }
      
      // If we found a good match, don't keep looking for smaller ones
      if (bestMatch && maxLength > 40) { // Lowered threshold
        break;
      }
    }
    
    return bestMatch;
  }
  
  private hasSignificantOverlap(chunkText: string, targetText: string): boolean {
    const chunkWords = chunkText.split(' ').filter(w => w.length > 2);
    const targetWords = targetText.split(' ').filter(w => w.length > 2);
    
    if (chunkWords.length === 0 || targetWords.length === 0) return false;
    
    const matchingWords = chunkWords.filter(word => targetWords.includes(word));
    const overlapRatio = matchingWords.length / Math.min(chunkWords.length, targetWords.length);
    
    return overlapRatio > 0.6 && matchingWords.length >= 3; // Need at least 60% overlap and 3+ matching words
  }
  
  private createHighlightSpan(textNode: Text, match: { text: string, startIndex: number, endIndex: number }, nugget: GoldenNugget): void {
    const text = textNode.textContent || '';
    
    const beforeText = text.substring(0, match.startIndex);
    const highlightText = match.text;
    const afterText = text.substring(match.endIndex);
    
    // Create the highlight element with highly visible styling
    const highlightSpan = document.createElement('span');
    highlightSpan.className = 'nugget-highlight';
    
    // Apply highly visible styles with !important to override site CSS
    highlightSpan.style.cssText = `
      background-color: ${colors.highlight.background} !important;
      padding: 3px 6px !important;
      border-radius: 4px !important;
      border: 2px solid ${colors.highlight.border} !important;
      box-shadow: 0 0 0 3px ${colors.highlight.border}30, 0 4px 8px rgba(0,0,0,0.15) !important;
      position: relative !important;
      z-index: ${zIndex.tooltip} !important;
      display: inline !important;
      font-weight: 600 !important;
      text-decoration: none !important;
      color: inherit !important;
      line-height: 1.4 !important;
      margin: 2px 0 !important;
    `;
    
    highlightSpan.dataset.nuggetType = nugget.type;
    highlightSpan.textContent = highlightText;
    
    // Replace the text node with the highlighted version
    const parent = textNode.parentNode;
    if (parent) {
      if (beforeText) {
        parent.insertBefore(document.createTextNode(beforeText), textNode);
      }
      parent.insertBefore(highlightSpan, textNode);
      if (afterText) {
        parent.insertBefore(document.createTextNode(afterText), textNode);
      }
      parent.removeChild(textNode);
      
      // Create clickable indicator for the first highlight only
      if (this.highlights.length === 0) {
        const indicator = this.createClickableIndicator(nugget);
        this.placeIndicatorAtCommentEnd(indicator, parent as Element);
      }
    }
    
    this.highlights.push(highlightSpan);
  }

  private tryContainerBasedHighlighting(nugget: GoldenNugget, pageContent?: string): boolean {
    // Only for HTML fragmentation cases - find containers with full content
    const normalizedContent = getNormalizedContent(nugget, pageContent);
    
    console.log('📦 [Container Strategy Debug] Starting container-based highlighting:', {
      normalizedContent: normalizedContent.substring(0, 100) + '...'
    });
    
    // Look for specific comment containers that might have fragmented content
    // Use container selectors, not text selectors
    const containers = document.querySelectorAll(
      `.comtr, ${SITE_SELECTORS.HACKER_NEWS.COMMENT_TREE}, .comment, .usertext-body, .md, [class*="comment"], [class*="text"]`
    );
    
    console.log('📦 [Container Strategy Debug] Found containers:', containers.length);
    
    let containerIndex = 0;
    for (const container of containers) {
      containerIndex++;
      // Skip our own UI elements
      if (container.classList.contains('nugget-sidebar') ||
          container.classList.contains('nugget-highlight')) {
        continue;
      }
      
      const containerText = container.textContent || '';
      const normalizedContainer = this.normalizeText(containerText);
      
      if (containerIndex <= 3) { // Log first 3 containers
        console.log(`📦 [Container Strategy Debug] Container ${containerIndex}:`, {
          tagName: container.tagName,
          className: container.className,
          textPreview: containerText.substring(0, 100) + '...',
          normalizedPreview: normalizedContainer.substring(0, 100) + '...',
          includes: normalizedContainer.includes(normalizedContent)
        });
      }
      
      // If container has the full content, find a good text node within it
      if (normalizedContainer.includes(normalizedContent)) {
        console.log('✅ [Container Strategy Debug] Found container with content! Searching for text nodes...');
        const textNodes = this.getTextNodesInElement(container);
        console.log('📦 [Container Strategy Debug] Text nodes in container:', textNodes.length);
        
        // Find the best text node to highlight within this container
        for (const textNode of textNodes) {
          const text = textNode.textContent || '';
          if (text.trim().length > 10) {
            console.log('✅ [Container Strategy Debug] Highlighting representative text node');
            // Highlight this representative text node
            this.highlightTextNodeSimple(textNode as Text, nugget, this.normalizeText(text));
            return true;
          }
        }
      }
    }
    
    console.log('❌ [Container Strategy Debug] No suitable containers found');
    return false;
  }

  private extractKeyPhrases(content: string): string[] {
    const phrases: string[] = [];
    
    // Extract quoted text
    const quotedMatches = content.match(/["'`]([^"'`]+)["'`]/g);
    if (quotedMatches) {
      phrases.push(...quotedMatches.map(m => m.slice(1, -1)));
    }
    
    // Extract complete sentences (prefer longer, complete thoughts)
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
    phrases.push(...sentences.map(s => s.trim()));
    
    // Extract longer meaningful clauses separated by commas, semicolons, etc.
    const clauses = content.split(/[,;:]+/).filter(s => s.trim().length > 15);
    phrases.push(...clauses.map(s => s.trim()));
    
    // Extract overlapping phrases of different lengths for better matching
    const words = content.split(/\s+/);
    
    // Extract 8-12 word phrases (substantial chunks)
    for (let i = 0; i < words.length - 7; i++) {
      for (let len = 8; len <= Math.min(12, words.length - i); len++) {
        const phrase = words.slice(i, i + len).join(' ');
        if (phrase.length > 40) {
          phrases.push(phrase);
        }
      }
    }
    
    // Extract 5-7 word phrases as fallback
    for (let i = 0; i < words.length - 4; i++) {
      for (let len = 5; len <= Math.min(7, words.length - i); len++) {
        const phrase = words.slice(i, i + len).join(' ');
        if (phrase.length > 25) {
          phrases.push(phrase);
        }
      }
    }
    
    // Remove duplicates and sort by length descending to try longer phrases first
    const uniquePhrases = Array.from(new Set(phrases));
    return uniquePhrases
      .sort((a, b) => b.length - a.length)
      .slice(0, 20); // Limit to top 20 phrases to avoid excessive processing
  }

  private fuzzyMatch(text: string, pattern: string): boolean {
    // More precise fuzzy matching to avoid false positives
    const threshold = 0.8; // Increased threshold for higher precision
    
    // Filter out common English words that cause false matches
    const commonWords = new Set([
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were',
      'have', 'has', 'had', 'will', 'would', 'could', 'should', 'can', 'may', 'might', 'must', 'shall',
      'this', 'that', 'these', 'those', 'a', 'an', 'some', 'any', 'all', 'no', 'not', 'very', 'much',
      'more', 'most', 'less', 'least', 'such', 'so', 'too', 'quite', 'rather', 'just', 'only', 'even',
      'also', 'well', 'still', 'yet', 'already', 'now', 'then', 'here', 'there', 'where', 'when', 'how',
      'what', 'who', 'which', 'why', 'because', 'if', 'unless', 'until', 'while', 'during', 'before', 'after',
      'it', 'its', 'he', 'him', 'his', 'she', 'her', 'hers', 'we', 'us', 'our', 'ours', 'they', 'them', 'their',
      'i', 'me', 'my', 'mine', 'you', 'your', 'yours'
    ]);
    
    // Only consider meaningful words (length > 3 and not common words)
    const meaningfulWords = pattern.split(' ').filter(w => 
      w.length > 3 && !commonWords.has(w.toLowerCase())
    );
    const textWords = text.split(' ');
    
    if (meaningfulWords.length === 0) {
      return false;
    }
    
    let matchCount = 0;
    for (const word of meaningfulWords) {
      // More restrictive matching - only exact matches and close substring matches
      if (textWords.some(tw => 
        tw === word || 
        (tw.length > 4 && tw.includes(word)) ||
        (word.length > 4 && word.includes(tw)) ||
        this.similarity(tw, word) > 0.85 // Increased similarity threshold
      )) {
        matchCount++;
      }
    }
    
    const matchRatio = matchCount / meaningfulWords.length;
    
    // Additional check: if we have a decent match ratio, also check for minimum absolute matches
    if (matchRatio >= threshold) {
      // For very short patterns, require at least 2 meaningful word matches
      if (meaningfulWords.length < 4 && matchCount < 2) {
        return false;
      }
      // For longer patterns, require at least 3 meaningful word matches
      if (meaningfulWords.length >= 4 && matchCount < 3) {
        return false;
      }
    }
    
    return matchRatio >= threshold;
  }



  private getTextNodesInElement(element: Element): Node[] {
    const textNodes: Node[] = [];
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          
          // Skip already highlighted content and UI elements
          if (parent.classList.contains('nugget-highlight') || 
              parent.classList.contains('nugget-sidebar') ||
              parent.classList.contains('nugget-notification-banner')) {
            return NodeFilter.FILTER_REJECT;
          }
          
          // Skip elements that are unlikely to contain meaningful content
          const tagName = parent.tagName.toLowerCase();
          if (['script', 'style', 'noscript', 'svg', 'canvas'].includes(tagName)) {
            return NodeFilter.FILTER_REJECT;
          }
          
          const text = node.textContent || '';
          // Only include text nodes with meaningful content
          if (text.trim().length > 5) {
            return NodeFilter.FILTER_ACCEPT;
          }
          
          return NodeFilter.FILTER_REJECT;
        }
      }
    );

    let textNode: Node | null;
    while (textNode = walker.nextNode()) {
      textNodes.push(textNode);
    }
    
    return textNodes;
  }

  private getOverlapScore(text1: string, text2: string): number {
    const words1 = text1.split(/\s+/).filter(w => w.length > 2);
    const words2 = text2.split(/\s+/).filter(w => w.length > 2);
    
    if (words1.length === 0 || words2.length === 0) return 0;
    
    let commonWords = 0;
    const set2 = new Set(words2);
    
    for (const word of words1) {
      if (set2.has(word)) {
        commonWords++;
      }
    }
    
    return commonWords / Math.max(words1.length, words2.length);
  }

  private similarity(a: string, b: string): number {
    // Simple similarity measure using Levenshtein distance
    const matrix = [];
    const n = a.length;
    const m = b.length;
    
    if (n === 0) return m === 0 ? 1 : 0;
    if (m === 0) return 0;
    
    for (let i = 0; i <= n; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= m; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        if (a[i - 1] === b[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j - 1] + 1
          );
        }
      }
    }
    
    const distance = matrix[n][m];
    return 1 - distance / Math.max(n, m);
  }

  private getParentHierarchy(element: Element, depth: number): string[] {
    const hierarchy: string[] = [];
    let current = element.parentElement;
    
    for (let i = 0; i < depth && current; i++) {
      const tagName = current.tagName.toLowerCase();
      const className = current.className ? `.${current.className.replace(/\s+/g, '.')}` : '';
      const id = current.id ? `#${current.id}` : '';
      hierarchy.push(`${tagName}${id}${className}`);
      current = current.parentElement;
    }
    
    return hierarchy;
  }

  private findAlternativeHackerNewsContainer(commtextElement: Element): Element | null {
    // Try different container lookup strategies for HackerNews
    
    // Strategy 1: Look for tr elements with class containing "comtr" or similar
    let container = commtextElement.closest('tr[class*="comtr"]');
    if (container) return container;
    
    // Strategy 2: Look for tr elements with class "athing" + "comtr"
    container = commtextElement.closest('tr.athing');
    if (container) return container;
    
    // Strategy 3: Look for any tr element that could be a comment row
    container = commtextElement.closest('tr');
    if (container && (container.className.includes('com') || container.className.includes('thing'))) {
      return container;
    }
    
    // Strategy 4: Look for divs with comment-related classes
    container = commtextElement.closest('div[class*="comment"]');
    if (container) return container;
    
    // Strategy 5: Look for table elements that might contain the comment
    container = commtextElement.closest('table');
    if (container) {
      // Find the specific row within the table
      const row = commtextElement.closest('tr');
      if (row) return row;
    }
    
    return null;
  }
}