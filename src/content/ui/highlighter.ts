import { GoldenNugget } from '../../shared/types';
import { colors, generateInlineStyles, zIndex } from '../../shared/design-system';
import { SITE_SELECTORS } from 'threads-harvester';

type SiteType = 'twitter' | 'reddit' | 'hackernews' | 'generic';

export class Highlighter {
  private highlights: HTMLElement[] = [];
  private popups: HTMLElement[] = [];
  private textCache = new Map<string, string>();
  private searchCache = new Map<string, Element[]>();
  private siteType: SiteType;

  constructor() {
    this.siteType = this.detectSiteType();
  }

  async highlightNugget(nugget: GoldenNugget): Promise<boolean> {
    // Use different highlighting strategies based on site type
    if (this.isThreadedSite()) {
      return this.highlightCommentContainer(nugget);
    } else {
      return this.findAndHighlightText(nugget);
    }
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
        return ['.comment', '.comtr', SITE_SELECTORS.HACKER_NEWS.COMMENTS];
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
    
    const normalizedContent = this.normalizeText(nugget.content);
    
    // Strategy 1: Try to find highlight by exact content match
    for (const highlight of existingHighlights) {
      const highlightText = highlight.textContent || '';
      const normalizedHighlight = this.normalizeText(highlightText);
      
      if (normalizedHighlight.includes(normalizedContent) || 
          normalizedContent.includes(normalizedHighlight) ||
          this.getOverlapScore(normalizedHighlight, normalizedContent) > 0.7) {
        return highlight as HTMLElement;
      }
    }
    
    // Strategy 2: Try to find by key phrases
    const keyPhrases = this.extractKeyPhrases(nugget.content);
    for (const phrase of keyPhrases) {
      const normalizedPhrase = this.normalizeText(phrase);
      if (normalizedPhrase.length > 8) {
        for (const highlight of existingHighlights) {
          const highlightText = highlight.textContent || '';
          const normalizedHighlight = this.normalizeText(highlightText);
          
          if (normalizedHighlight.includes(normalizedPhrase) || 
              normalizedPhrase.includes(normalizedHighlight) ||
              this.getOverlapScore(normalizedHighlight, normalizedPhrase) > 0.6) {
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
          this.getOverlapScore(normalizedHighlight, normalizedContent) > 0.5) {
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
    
    const normalizedContent = this.normalizeText(nugget.content);
    
    // Find comment highlight that contains the nugget content
    for (const highlight of existingHighlights) {
      const commentText = highlight.textContent || '';
      const normalizedComment = this.normalizeText(commentText);
      
      if (normalizedComment.includes(normalizedContent) || 
          this.getOverlapScore(normalizedComment, normalizedContent) > 0.7) {
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
    
    // Clear caches
    this.textCache.clear();
    this.searchCache.clear();
  }

  private highlightCommentContainer(nugget: GoldenNugget): boolean {
    const normalizedContent = this.normalizeText(nugget.content);
    
    // Early return if content is too short
    if (normalizedContent.length < 5) {
      return false;
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
        const normalizedContainer = this.normalizeText(containerText);
        
        // Debug logging for highlighting failures
        const exactMatch = normalizedContainer.includes(normalizedContent);
        const overlapScore = this.getOverlapScore(normalizedContainer, normalizedContent);
        const fuzzyMatchResult = this.fuzzyMatch(normalizedContainer, normalizedContent);
        
        console.log('🎯 Highlighting Debug:', {
          site: this.siteType,
          selector,
          contentToFind: nugget.content.substring(0, 100) + '...',
          normalizedContent: normalizedContent.substring(0, 100) + '...',
          containerText: containerText.substring(0, 100) + '...',
          normalizedContainer: normalizedContainer.substring(0, 100) + '...',
          exactMatch,
          overlapScore,
          fuzzyMatch: fuzzyMatchResult,
          willHighlight: exactMatch || overlapScore > 0.7 || fuzzyMatchResult
        });
        
        // Check if this container contains the nugget content
        if (exactMatch || overlapScore > 0.7 || fuzzyMatchResult) {
          
          this.highlightCommentElement(container as HTMLElement, nugget);
          return true;
        }
      }
    }
    
    // Fallback to text highlighting if comment detection fails
    console.log('🔄 Falling back to text highlighting for:', nugget.content.substring(0, 100) + '...');
    return this.findAndHighlightText(nugget);
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
      // Ensure the element can display borders properly
      element.style.setProperty('display', 'table-cell', 'important');
      element.style.setProperty('border-collapse', 'separate', 'important');
      element.style.borderSpacing = '0';
      element.style.boxSizing = 'border-box';
      // Force border with !important to override Hacker News table styles
      element.style.setProperty('border-left', '4px solid rgba(255, 215, 0, 0.8)', 'important');
    }
    
    // Create text-free zone for indicator by styling all content inside
    this.createIndicatorSafeZone(element);
    
    // Add hover effects
    this.addCommentHoverEffects(element);
    
    // Add corner indicator
    const indicator = this.createCornerIndicator(nugget);
    element.style.position = 'relative'; // Ensure positioning context for indicator
    element.appendChild(indicator);
    
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
      // Special handling for Hacker News - keep border width consistent
      if (this.siteType === 'hackernews') {
        element.style.setProperty('border-left', '4px solid rgba(255, 215, 0, 0.9)', 'important');
      }
    });
    
    element.addEventListener('mouseleave', () => {
      Object.assign(element.style, originalStyles);
      // Restore Hacker News border
      if (this.siteType === 'hackernews') {
        element.style.setProperty('border-left', '4px solid rgba(255, 215, 0, 0.8)', 'important');
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

  private findAndHighlightText(nugget: GoldenNugget): boolean {
    const normalizedContent = this.normalizeText(nugget.content);
    
    // Early return if content is too short or empty
    if (normalizedContent.length < 5) {
      return false;
    }
    
    // Use more efficient search with caching
    const cacheKey = `highlight_${normalizedContent}`;
    let textNodes = this.searchCache.get(cacheKey);
    
    if (!textNodes) {
      textNodes = this.getTextNodesOptimized();
      this.searchCache.set(cacheKey, textNodes);
    }

    // Try multiple matching strategies in order of preference
    return this.tryMultipleMatchingStrategies(textNodes, nugget, normalizedContent);
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
    const originalContent = nugget.content;
    
    // Strategy 1: Exact substring match (most precise) - KEEP ORIGINAL SIMPLE LOGIC
    for (const textNode of textNodes) {
      const text = textNode.textContent || '';
      const normalizedText = this.normalizeText(text);
      
      if (normalizedText.includes(normalizedContent)) {
        this.highlightTextNodeSimple(textNode as Text, nugget, normalizedContent);
        return true;
      }
    }
    
    // Strategy 2: Key phrase matching (extract key phrases from content)
    const keyPhrases = this.extractKeyPhrases(originalContent);
    for (const phrase of keyPhrases) {
      const normalizedPhrase = this.normalizeText(phrase);
      if (normalizedPhrase.length > 8) { // Only try meaningful phrases
        for (const textNode of textNodes) {
          const text = textNode.textContent || '';
          const normalizedText = this.normalizeText(text);
          
          if (normalizedText.includes(normalizedPhrase)) {
            this.highlightTextNodeSimple(textNode as Text, nugget, normalizedPhrase);
            return true;
          }
        }
      }
    }
    
    // Strategy 3: Fuzzy word matching
    for (const textNode of textNodes) {
      const text = textNode.textContent || '';
      const normalizedText = this.normalizeText(text);
      
      if (this.fuzzyMatch(normalizedText, normalizedContent)) {
        this.highlightTextNodeSimple(textNode as Text, nugget, normalizedContent);
        return true;
      }
    }
    
    // Strategy 4: Container-based search for HTML fragmentation (NEW - only as last resort)
    return this.tryContainerBasedHighlighting(nugget);
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
    
    // Create the highlight element
    const highlightSpan = document.createElement('span');
    highlightSpan.className = 'nugget-highlight';
    highlightSpan.style.cssText = generateInlineStyles.highlightStyle();
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
      '.comment',     // HackerNews
      SITE_SELECTORS.HACKER_NEWS.COMMENTS,    // HackerNews comment text
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

  private tryContainerBasedHighlighting(nugget: GoldenNugget): boolean {
    // Only for HTML fragmentation cases - find containers with full content
    const normalizedContent = this.normalizeText(nugget.content);
    
    // Look for specific comment containers that might have fragmented content
    const containers = document.querySelectorAll(
      `${SITE_SELECTORS.HACKER_NEWS.COMMENTS}, .comment, .usertext-body, .md, [class*="comment"], [class*="text"]`
    );
    
    for (const container of containers) {
      // Skip our own UI elements
      if (container.classList.contains('nugget-sidebar') ||
          container.classList.contains('nugget-highlight')) {
        continue;
      }
      
      const containerText = container.textContent || '';
      const normalizedContainer = this.normalizeText(containerText);
      
      // If container has the full content, find a good text node within it
      if (normalizedContainer.includes(normalizedContent)) {
        const textNodes = this.getTextNodesInElement(container);
        
        // Find the best text node to highlight within this container
        for (const textNode of textNodes) {
          const text = textNode.textContent || '';
          if (text.trim().length > 10) {
            // Highlight this representative text node
            this.highlightTextNodeSimple(textNode as Text, nugget, this.normalizeText(text));
            return true;
          }
        }
      }
    }
    
    return false;
  }

  private extractKeyPhrases(content: string): string[] {
    const phrases: string[] = [];
    
    // Extract quoted text
    const quotedMatches = content.match(/["'`]([^"'`]+)["'`]/g);
    if (quotedMatches) {
      phrases.push(...quotedMatches.map(m => m.slice(1, -1)));
    }
    
    // Extract sentences or clauses
    const sentences = content.split(/[.!?;:]/).filter(s => s.trim().length > 10);
    phrases.push(...sentences);
    
    // Extract meaningful phrases (5+ words)
    const words = content.split(/\s+/);
    for (let i = 0; i < words.length - 4; i++) {
      const phrase = words.slice(i, i + 5).join(' ');
      if (phrase.length > 20) {
        phrases.push(phrase);
      }
    }
    
    // Sort by length descending to try longer phrases first
    return phrases.sort((a, b) => b.length - a.length);
  }

  private fuzzyMatch(text: string, pattern: string): boolean {
    // Improved fuzzy matching with multiple strategies
    const threshold = 0.7; // Relaxed threshold
    const words = pattern.split(' ').filter(w => w.length > 2);
    const textWords = text.split(' ');
    
    if (words.length === 0) {
      return false;
    }
    
    let matchCount = 0;
    for (const word of words) {
      // Check for exact word match, substring match, or similar words
      if (textWords.some(tw => 
        tw === word || 
        tw.includes(word) || 
        word.includes(tw) ||
        this.similarity(tw, word) > 0.8
      )) {
        matchCount++;
      }
    }
    
    return matchCount / words.length >= threshold;
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
}