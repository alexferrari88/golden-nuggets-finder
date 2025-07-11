import { colors, typography, spacing, borderRadius, shadows } from '../../shared/design-system';
import { SavedPrompt } from '../../shared/types';
import { storage } from '../../shared/storage';
import { SITE_SELECTORS } from '../../shared/constants';

export interface CommentItem {
  element: HTMLElement;
  content: string;
  selected: boolean;
  checkbox?: HTMLElement;
}

export class CommentSelector {
  private comments: CommentItem[] = [];
  private controlPanel: HTMLElement | null = null;
  private isActive: boolean = false;
  private selectedPromptId: string | null = null;
  private prompts: SavedPrompt[] = [];

  constructor() {
    this.loadPrompts();
  }

  private async loadPrompts(): Promise<void> {
    try {
      this.prompts = await storage.getPrompts();
    } catch (error) {
      console.error('Failed to load prompts:', error);
    }
  }

  async enterSelectionMode(promptId?: string): Promise<void> {
    if (this.isActive) return;

    console.log('Entering selection mode...', { promptId, url: window.location.href });
    this.isActive = true;
    this.selectedPromptId = promptId || null;
    
    // Extract comments from the page
    await this.extractComments();
    
    if (this.comments.length === 0) {
      console.warn('No comments found for selection mode');
      // Still show control panel with a message
      this.showControlPanel();
      return;
    }
    
    // Add checkboxes to comments
    this.addCheckboxesToComments();
    
    // Show control panel
    this.showControlPanel();
  }

  private async extractComments(): Promise<void> {
    const url = window.location.href;
    let commentSelectors: string[] = [];

    if (url.includes('reddit.com')) {
      commentSelectors = [SITE_SELECTORS.REDDIT.COMMENTS];
    } else if (url.includes('news.ycombinator.com')) {
      commentSelectors = [SITE_SELECTORS.HACKER_NEWS.COMMENTS];
    } else if (url.includes('twitter.com') || url.includes('x.com')) {
      // Use only TWEET_ARTICLE to avoid double-selection
      commentSelectors = [SITE_SELECTORS.TWITTER.TWEET_ARTICLE];
    } else {
      // Generic comment selectors for other sites
      commentSelectors = ['[class*="comment"]', '[class*="reply"]', '[class*="post"]'];
    }

    this.comments = [];
    
    for (const selector of commentSelectors) {
      const elements = document.querySelectorAll(selector) as NodeListOf<HTMLElement>;
      console.log(`Selector "${selector}" found ${elements.length} elements`);
      
      for (const element of elements) {
        const content = element.textContent?.trim();
        if (content && content.length > 20) { // Filter out very short comments (same as extractor)
          this.comments.push({
            element,
            content,
            selected: true // Default to selected
          });
        }
      }
    }

    console.log(`Found ${this.comments.length} comments for selection on ${url}`);
  }

  private addCheckboxesToComments(): void {
    this.comments.forEach((comment, index) => {
      const checkbox = this.createCheckbox(comment, index);
      comment.checkbox = checkbox;
      
      // Position checkbox at top-left of comment with better positioning for different sites
      this.positionCheckbox(checkbox, comment.element);
      
      document.body.appendChild(checkbox);
    });
  }

  private positionCheckbox(checkbox: HTMLElement, element: HTMLElement): void {
    const rect = element.getBoundingClientRect();
    const url = window.location.href;
    
    checkbox.style.position = 'absolute';
    checkbox.style.zIndex = '10000';
    
    if (url.includes('news.ycombinator.com')) {
      // For HackerNews, position relative to the comment text element
      // Add a bit more offset to avoid overlapping with indentation
      checkbox.style.top = `${rect.top + window.scrollY - 2}px`;
      checkbox.style.left = `${Math.max(10, rect.left + window.scrollX - 25)}px`;
    } else if (url.includes('reddit.com')) {
      // For Reddit, position at the top-left corner
      checkbox.style.top = `${rect.top + window.scrollY - 5}px`;
      checkbox.style.left = `${rect.left + window.scrollX - 30}px`;
    } else if (url.includes('twitter.com') || url.includes('x.com')) {
      // For Twitter, position at the top-left corner
      checkbox.style.top = `${rect.top + window.scrollY - 5}px`;
      checkbox.style.left = `${rect.left + window.scrollX - 30}px`;
    } else {
      // Generic positioning
      checkbox.style.top = `${rect.top + window.scrollY - 5}px`;
      checkbox.style.left = `${Math.max(10, rect.left + window.scrollX - 30)}px`;
    }
  }

  private createCheckbox(comment: CommentItem, index: number): HTMLElement {
    const checkbox = document.createElement('div');
    checkbox.className = 'nugget-comment-checkbox';
    checkbox.style.cssText = `
      width: 18px;
      height: 18px;
      border: 2px solid ${colors.border.default};
      border-radius: ${borderRadius.sm};
      background-color: ${colors.background.primary};
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: ${shadows.sm};
      transition: all 0.2s ease;
      user-select: none;
    `;

    const updateCheckboxState = () => {
      if (comment.selected) {
        checkbox.style.backgroundColor = colors.blueSubtle;
        checkbox.style.borderColor = colors.blueSubtle;
        checkbox.innerHTML = '✓';
        checkbox.style.color = colors.background.primary;
        checkbox.style.fontSize = '12px';
        checkbox.style.fontWeight = '600';
      } else {
        checkbox.style.backgroundColor = colors.background.primary;
        checkbox.style.borderColor = colors.border.default;
        checkbox.innerHTML = '';
      }
    };

    checkbox.addEventListener('click', (e) => {
      e.stopPropagation();
      comment.selected = !comment.selected;
      updateCheckboxState();
      this.updateControlPanel();
    });

    checkbox.addEventListener('mouseenter', () => {
      checkbox.style.borderColor = colors.blueSubtle;
      checkbox.style.boxShadow = shadows.md;
    });

    checkbox.addEventListener('mouseleave', () => {
      checkbox.style.borderColor = comment.selected ? colors.blueSubtle : colors.border.default;
      checkbox.style.boxShadow = shadows.sm;
    });

    updateCheckboxState();
    return checkbox;
  }

  private showControlPanel(): void {
    if (this.controlPanel) {
      this.controlPanel.remove();
    }

    console.log(`Creating control panel for ${this.comments.length} comments`);

    this.controlPanel = document.createElement('div');
    this.controlPanel.className = 'nugget-control-panel';
    this.controlPanel.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 320px;
      background: ${colors.background.primary};
      border: 1px solid ${colors.border.light};
      border-radius: ${borderRadius.lg};
      box-shadow: ${shadows.lg};
      z-index: 10001;
      font-family: ${typography.fontFamily.sans};
      padding: ${spacing.lg};
      transform: translateY(100px);
      opacity: 0;
      transition: all 0.3s ease;
    `;

    // Content
    const header = document.createElement('div');
    header.style.cssText = `
      font-size: ${typography.fontSize.sm};
      font-weight: ${typography.fontWeight.semibold};
      color: ${colors.text.primary};
      margin-bottom: ${spacing.md};
    `;
    header.textContent = this.comments.length > 0 ? 'Select Comments to Analyze' : 'No Comments Found';

    const counter = document.createElement('div');
    counter.className = 'comment-counter';
    counter.style.cssText = `
      font-size: ${typography.fontSize.sm};
      color: ${colors.text.secondary};
      margin-bottom: ${spacing.md};
    `;

    // Quick actions
    const quickActions = document.createElement('div');
    quickActions.style.cssText = `
      display: flex;
      gap: ${spacing.sm};
      margin-bottom: ${spacing.md};
    `;

    const selectAllBtn = this.createButton('Select All', () => {
      this.selectAll();
    });

    const clearAllBtn = this.createButton('Clear All', () => {
      this.clearAll();
    });

    quickActions.appendChild(selectAllBtn);
    quickActions.appendChild(clearAllBtn);

    // Prompt selection
    const promptSection = document.createElement('div');
    promptSection.style.cssText = `
      margin-bottom: ${spacing.md};
    `;

    const promptLabel = document.createElement('div');
    promptLabel.style.cssText = `
      font-size: ${typography.fontSize.sm};
      font-weight: ${typography.fontWeight.medium};
      color: ${colors.text.primary};
      margin-bottom: ${spacing.sm};
    `;
    promptLabel.textContent = 'Prompt:';

    const promptSelect = document.createElement('select');
    promptSelect.style.cssText = `
      width: 100%;
      padding: ${spacing.sm};
      border: 1px solid ${colors.border.light};
      border-radius: ${borderRadius.sm};
      background-color: ${colors.background.primary};
      color: ${colors.text.primary};
      font-size: ${typography.fontSize.sm};
    `;

    this.prompts.forEach(prompt => {
      const option = document.createElement('option');
      option.value = prompt.id;
      option.textContent = prompt.name;
      if (prompt.id === this.selectedPromptId) {
        option.selected = true;
      }
      promptSelect.appendChild(option);
    });

    promptSelect.addEventListener('change', () => {
      this.selectedPromptId = promptSelect.value;
    });

    promptSection.appendChild(promptLabel);
    promptSection.appendChild(promptSelect);

    // Analyze button
    const analyzeBtn = document.createElement('button');
    analyzeBtn.style.cssText = `
      width: 100%;
      padding: ${spacing.md};
      background-color: ${colors.blueSubtle};
      color: ${colors.background.primary};
      border: none;
      border-radius: ${borderRadius.md};
      font-size: ${typography.fontSize.sm};
      font-weight: ${typography.fontWeight.semibold};
      cursor: pointer;
      transition: all 0.2s ease;
    `;
    analyzeBtn.textContent = 'Analyze Selected Comments';

    analyzeBtn.addEventListener('click', () => {
      this.analyzeSelectedComments();
    });

    analyzeBtn.addEventListener('mouseenter', () => {
      analyzeBtn.style.backgroundColor = colors.blueSubtle;
      analyzeBtn.style.boxShadow = shadows.md;
    });

    analyzeBtn.addEventListener('mouseleave', () => {
      analyzeBtn.style.backgroundColor = colors.blueSubtle;
      analyzeBtn.style.boxShadow = 'none';
    });

    // Assemble panel
    this.controlPanel.appendChild(header);
    this.controlPanel.appendChild(counter);
    this.controlPanel.appendChild(quickActions);
    this.controlPanel.appendChild(promptSection);
    this.controlPanel.appendChild(analyzeBtn);

    document.body.appendChild(this.controlPanel);

    // Animate in
    requestAnimationFrame(() => {
      this.controlPanel!.style.transform = 'translateY(0)';
      this.controlPanel!.style.opacity = '1';
    });

    this.updateControlPanel();
  }

  private createButton(text: string, onClick: () => void): HTMLElement {
    const button = document.createElement('button');
    button.style.cssText = `
      flex: 1;
      padding: ${spacing.sm};
      background-color: ${colors.background.secondary};
      color: ${colors.text.primary};
      border: 1px solid ${colors.border.light};
      border-radius: ${borderRadius.sm};
      font-size: ${typography.fontSize.xs};
      font-weight: ${typography.fontWeight.medium};
      cursor: pointer;
      transition: all 0.2s ease;
    `;
    button.textContent = text;

    button.addEventListener('click', onClick);
    button.addEventListener('mouseenter', () => {
      button.style.backgroundColor = colors.background.primary;
      button.style.borderColor = colors.border.default;
    });
    button.addEventListener('mouseleave', () => {
      button.style.backgroundColor = colors.background.secondary;
      button.style.borderColor = colors.border.light;
    });

    return button;
  }

  private updateControlPanel(): void {
    if (!this.controlPanel) return;

    const selectedCount = this.comments.filter(c => c.selected).length;
    const totalCount = this.comments.length;

    const counter = this.controlPanel.querySelector('.comment-counter');
    if (counter) {
      if (totalCount === 0) {
        counter.textContent = 'No comments detected on this page. This may be due to page structure changes.';
      } else {
        counter.textContent = `${selectedCount} of ${totalCount} comments selected`;
      }
    }
  }

  private selectAll(): void {
    this.comments.forEach(comment => {
      comment.selected = true;
      this.updateCheckboxAppearance(comment);
    });
    this.updateControlPanel();
  }

  private clearAll(): void {
    this.comments.forEach(comment => {
      comment.selected = false;
      this.updateCheckboxAppearance(comment);
    });
    this.updateControlPanel();
  }

  private updateCheckboxAppearance(comment: CommentItem): void {
    if (!comment.checkbox) return;

    if (comment.selected) {
      comment.checkbox.style.backgroundColor = colors.blueSubtle;
      comment.checkbox.style.borderColor = colors.blueSubtle;
      comment.checkbox.innerHTML = '✓';
      comment.checkbox.style.color = colors.background.primary;
    } else {
      comment.checkbox.style.backgroundColor = colors.background.primary;
      comment.checkbox.style.borderColor = colors.border.default;
      comment.checkbox.innerHTML = '';
    }
  }

  private analyzeSelectedComments(): void {
    if (this.comments.length === 0) {
      alert('No comments found on this page. The page structure may have changed or comments may not be loaded yet.');
      return;
    }

    const selectedComments = this.comments.filter(c => c.selected);
    
    if (selectedComments.length === 0) {
      alert('Please select at least one comment to analyze.');
      return;
    }

    if (!this.selectedPromptId) {
      alert('Please select a prompt for analysis.');
      return;
    }

    console.log(`Analyzing ${selectedComments.length} selected comments`);

    // Send message to background script
    chrome.runtime.sendMessage({
      type: 'ANALYZE_SELECTED_CONTENT',
      content: selectedComments.map(c => c.content).join('\n\n'),
      promptId: this.selectedPromptId,
      url: window.location.href,
      selectedComments: selectedComments.map(c => c.content)
    });

    // Clean up selection mode
    this.exitSelectionMode();
  }

  exitSelectionMode(): void {
    if (!this.isActive) return;

    this.isActive = false;
    
    // Remove checkboxes
    this.comments.forEach(comment => {
      if (comment.checkbox) {
        comment.checkbox.remove();
      }
    });

    // Remove control panel
    if (this.controlPanel) {
      this.controlPanel.style.transform = 'translateY(100px)';
      this.controlPanel.style.opacity = '0';
      
      setTimeout(() => {
        if (this.controlPanel) {
          this.controlPanel.remove();
          this.controlPanel = null;
        }
      }, 300);
    }

    // Clear state
    this.comments = [];
    this.selectedPromptId = null;
  }

  getSelectedComments(): string[] {
    return this.comments.filter(c => c.selected).map(c => c.content);
  }

  isSelectionModeActive(): boolean {
    return this.isActive;
  }
}