import { colors, typography, spacing, borderRadius, shadows } from '../../shared/design-system';
import { SavedPrompt, MESSAGE_TYPES } from '../../shared/types';
import { storage } from '../../shared/storage';
import { SITE_SELECTORS } from '../../shared/constants';

export interface CommentItem {
  element: HTMLElement;
  content: string;
  selected: boolean;
  checkbox?: HTMLElement;
}

interface AnalysisStep {
  id: string;
  text: string;
  status: 'pending' | 'in_progress' | 'completed';
  element?: HTMLElement;
}

export class CommentSelector {
  private comments: CommentItem[] = [];
  private controlPanel: HTMLElement | null = null;
  private isActive: boolean = false;
  private selectedPromptId: string | null = null;
  private prompts: SavedPrompt[] = [];
  private keydownHandler: (event: KeyboardEvent) => void;
  private onExitCallback: (() => void) | null = null;
  private typingTimer: NodeJS.Timeout | null = null;
  private stepTimers: NodeJS.Timeout[] = [];
  private messageListener: ((message: any, sender: any, sendResponse: any) => void) | null = null;
  private analysisSteps: AnalysisStep[] = [
    { id: 'extract', text: 'Extracting key insights', status: 'pending' },
    { id: 'patterns', text: 'Identifying patterns', status: 'pending' },
    { id: 'generate', text: 'Generating golden nuggets', status: 'pending' },
    { id: 'finalize', text: 'Finalizing analysis', status: 'pending' }
  ];

  constructor() {
    this.loadPrompts();
    this.keydownHandler = this.handleKeydown.bind(this);
    this.messageListener = this.handleMessage.bind(this);
  }

  private async loadPrompts(): Promise<void> {
    try {
      this.prompts = await storage.getPrompts();
    } catch (error) {
      console.error('Failed to load prompts:', error);
    }
  }

  private handleMessage(message: any, sender: any, sendResponse: any): void {
    if (message.type === MESSAGE_TYPES.ANALYSIS_COMPLETE) {
      this.handleAnalysisComplete();
    } else if (message.type === MESSAGE_TYPES.ANALYSIS_ERROR) {
      this.handleAnalysisError(message.error);
    }
  }

  private handleAnalysisComplete(): void {
    // Clear all running timers immediately
    this.stepTimers.forEach(timer => clearTimeout(timer));
    this.stepTimers = [];
    
    // Complete ALL remaining steps immediately
    this.analysisSteps.forEach(step => {
      if (step.status !== 'completed') {
        step.status = 'completed';
        this.updateStepVisual(step);
      }
    });
    
    // Exit selection mode after a brief delay to show completion
    setTimeout(() => {
      this.exitSelectionMode();
    }, 600);
  }

  private handleAnalysisError(error: string): void {
    // Clear all running timers immediately
    this.stepTimers.forEach(timer => clearTimeout(timer));
    this.stepTimers = [];
    
    // Handle error - maybe show error state in UI
    console.error('Analysis error:', error);
    this.exitSelectionMode();
  }

  setOnExitCallback(callback: () => void): void {
    this.onExitCallback = callback;
  }

  private handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.isActive) {
      event.preventDefault();
      if (this.onExitCallback) {
        this.onExitCallback();
      } else {
        this.exitSelectionMode();
      }
    }
  }

  async enterSelectionMode(promptId?: string): Promise<void> {
    if (this.isActive) return;

    console.log('Entering selection mode...', { promptId, url: window.location.href });
    this.isActive = true;
    this.selectedPromptId = promptId || null;
    
    // Add keyboard event listener
    document.addEventListener('keydown', this.keydownHandler);
    
    // Add message listener for analysis completion
    if (this.messageListener) {
      chrome.runtime.onMessage.addListener(this.messageListener);
    }
    
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
        checkbox.style.backgroundColor = colors.text.accent;
        checkbox.style.borderColor = colors.text.accent;
        checkbox.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
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
      checkbox.style.borderColor = colors.text.accent;
      checkbox.style.boxShadow = shadows.md;
    });

    checkbox.addEventListener('mouseleave', () => {
      checkbox.style.borderColor = comment.selected ? colors.text.accent : colors.border.default;
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

    // Header with close button
    const headerContainer = document.createElement('div');
    headerContainer.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: ${spacing.md};
    `;

    const header = document.createElement('div');
    header.style.cssText = `
      font-size: ${typography.fontSize.sm};
      font-weight: ${typography.fontWeight.semibold};
      color: ${colors.text.primary};
    `;
    header.textContent = this.comments.length > 0 ? 'Select Comments to Analyze' : 'No Comments Found';

    // Close button
    const closeButton = document.createElement('button');
    closeButton.style.cssText = `
      background: none;
      border: none;
      cursor: pointer;
      color: ${colors.text.secondary};
      font-size: ${typography.fontSize.lg};
      padding: ${spacing.xs};
      border-radius: ${borderRadius.sm};
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
    `;
    closeButton.innerHTML = '×';
    closeButton.title = 'Close selection mode (Esc)';

    closeButton.addEventListener('click', () => {
      if (this.onExitCallback) {
        this.onExitCallback();
      } else {
        this.exitSelectionMode();
      }
    });

    closeButton.addEventListener('mouseenter', () => {
      closeButton.style.backgroundColor = colors.background.secondary;
      closeButton.style.color = colors.text.primary;
    });

    closeButton.addEventListener('mouseleave', () => {
      closeButton.style.backgroundColor = 'transparent';
      closeButton.style.color = colors.text.secondary;
    });

    headerContainer.appendChild(header);
    headerContainer.appendChild(closeButton);

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

    // Auto-select default prompt if none is selected (e.g., from right-click menu)
    if (!this.selectedPromptId && this.prompts.length > 0) {
      const defaultPrompt = this.prompts.find(p => p.isDefault) || this.prompts[0];
      this.selectedPromptId = defaultPrompt.id;
    }

    this.prompts.forEach(prompt => {
      const option = document.createElement('option');
      option.value = prompt.id;
      option.textContent = prompt.name;
      if (prompt.id === this.selectedPromptId) {
        option.selected = true;
      }
      promptSelect.appendChild(option);
    });

    // Set initial value and add change listener
    promptSelect.value = this.selectedPromptId || '';
    promptSelect.addEventListener('change', () => {
      this.selectedPromptId = promptSelect.value;
      console.log('Prompt selected:', this.selectedPromptId);
    });

    promptSection.appendChild(promptLabel);
    promptSection.appendChild(promptSelect);

    // Analyze button
    const analyzeBtn = document.createElement('button');
    analyzeBtn.style.cssText = `
      width: 100%;
      padding: ${spacing.md};
      background-color: ${colors.text.accent};
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
      analyzeBtn.style.backgroundColor = colors.text.accent;
      analyzeBtn.style.boxShadow = shadows.md;
    });

    analyzeBtn.addEventListener('mouseleave', () => {
      analyzeBtn.style.backgroundColor = colors.text.accent;
      analyzeBtn.style.boxShadow = 'none';
    });

    // Assemble panel
    this.controlPanel.appendChild(headerContainer);
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
      comment.checkbox.style.backgroundColor = colors.text.accent;
      comment.checkbox.style.borderColor = colors.text.accent;
      comment.checkbox.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
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

    // Show loading state immediately
    this.showLoadingState().catch(error => {
      console.error('Failed to show loading state:', error);
    });

    // Send message to background script
    chrome.runtime.sendMessage({
      type: 'ANALYZE_SELECTED_CONTENT',
      content: selectedComments.map(c => c.content).join('\n\n'),
      promptId: this.selectedPromptId,
      url: window.location.href,
      selectedComments: selectedComments.map(c => c.content)
    });

    // Note: exitSelectionMode will be called when analysis completes or errors
  }

  private createTypingEffect(element: HTMLElement, text: string, speed: number = 80): Promise<void> {
    return new Promise((resolve) => {
      let index = 0;
      element.textContent = '';
      
      const typeNextChar = () => {
        if (index < text.length) {
          element.textContent = text.substring(0, index + 1);
          index++;
          this.typingTimer = setTimeout(typeNextChar, speed);
        } else {
          // Show cursor briefly at the end
          element.innerHTML = text + '<span style="opacity: 0.7; margin-left: 2px;">|</span>';
          this.typingTimer = setTimeout(() => {
            element.textContent = text;
            resolve();
          }, 500);
        }
      };
      
      typeNextChar();
    });
  }

  private createAnalysisStep(step: AnalysisStep): HTMLElement {
    const stepElement = document.createElement('div');
    stepElement.style.cssText = `
      display: flex;
      align-items: center;
      gap: ${spacing.sm};
      margin-bottom: ${spacing.xs};
      opacity: 0;
      transform: translateY(10px);
      transition: all 0.3s ease;
    `;

    const indicator = document.createElement('div');
    indicator.className = 'step-indicator';
    indicator.style.cssText = `
      font-size: ${typography.fontSize.sm};
      font-weight: ${typography.fontWeight.medium};
      color: ${colors.text.tertiary};
      width: 16px;
      text-align: center;
      flex-shrink: 0;
    `;
    indicator.textContent = '○';

    const text = document.createElement('div');
    text.className = 'step-text';
    text.style.cssText = `
      font-size: ${typography.fontSize.sm};
      color: ${colors.text.tertiary};
      font-weight: ${typography.fontWeight.normal};
    `;
    text.textContent = step.text;

    stepElement.appendChild(indicator);
    stepElement.appendChild(text);
    
    step.element = stepElement;
    return stepElement;
  }

  private updateStepVisual(step: AnalysisStep): void {
    if (!step.element) return;

    const indicator = step.element.querySelector('.step-indicator') as HTMLElement;
    const text = step.element.querySelector('.step-text') as HTMLElement;

    switch (step.status) {
      case 'pending':
        indicator.textContent = '○';
        indicator.style.color = colors.text.tertiary;
        indicator.style.animation = 'none';
        text.style.color = colors.text.tertiary;
        break;
      case 'in_progress':
        indicator.textContent = '●';
        indicator.style.color = colors.text.accent;
        indicator.style.animation = 'pulse 1s ease-in-out infinite';
        text.style.color = colors.text.secondary;
        break;
      case 'completed':
        indicator.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
        indicator.style.color = colors.text.accent;
        indicator.style.animation = 'none';
        text.style.color = colors.text.primary;
        break;
    }
  }

  private async animateStep(stepId: string, duration: number): Promise<void> {
    const step = this.analysisSteps.find(s => s.id === stepId);
    if (!step) return;

    // Start step
    step.status = 'in_progress';
    this.updateStepVisual(step);

    // Wait for duration (but can be interrupted by API completion)
    await new Promise(resolve => {
      const timer = setTimeout(() => {
        // Only complete if not already completed by API response
        if (step.status === 'in_progress') {
          step.status = 'completed';
          this.updateStepVisual(step);
        }
        resolve(undefined);
      }, duration);
      this.stepTimers.push(timer);
    });
  }

  private async showLoadingState(): Promise<void> {
    if (!this.controlPanel) return;

    // Get the prompt name for display
    const selectedPrompt = this.prompts.find(p => p.id === this.selectedPromptId);
    const promptName = selectedPrompt?.name || 'Unknown';

    // Reset analysis steps
    this.analysisSteps.forEach(step => {
      step.status = 'pending';
      step.element = undefined;
    });

    // Clear existing content and transform to loading state
    this.controlPanel.innerHTML = '';
    this.controlPanel.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 320px;
      min-height: 240px;
      background: ${colors.background.primary};
      border: 1px solid ${colors.border.light};
      border-radius: ${borderRadius.lg};
      box-shadow: ${shadows.lg};
      z-index: 10001;
      font-family: ${typography.fontFamily.sans};
      padding: ${spacing['2xl']};
      display: flex;
      flex-direction: column;
      gap: ${spacing.lg};
      opacity: 1;
      transform: translateY(0);
      transition: all 0.3s ease;
    `;

    // Create header with AI avatar and typing text
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: ${spacing.xs};
      margin-bottom: ${spacing.md};
    `;

    // AI Avatar
    const avatar = document.createElement('div');
    avatar.style.cssText = `
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: ${colors.text.accent};
      box-shadow: 0 0 8px ${colors.text.accent}40;
      flex-shrink: 0;
    `;

    // Typing text container
    const typingText = document.createElement('div');
    typingText.style.cssText = `
      color: ${colors.text.primary};
      font-size: ${typography.fontSize.sm};
      font-weight: ${typography.fontWeight.medium};
      flex: 1;
    `;

    header.appendChild(avatar);
    header.appendChild(typingText);

    // Create steps container
    const stepsContainer = document.createElement('div');
    stepsContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: ${spacing.xs};
      margin-bottom: ${spacing.md};
    `;

    // Create step elements
    this.analysisSteps.forEach(step => {
      const stepElement = this.createAnalysisStep(step);
      stepsContainer.appendChild(stepElement);
    });

    // Create prompt display
    const promptDisplay = document.createElement('div');
    promptDisplay.style.cssText = `
      text-align: center;
      padding-top: ${spacing.md};
      border-top: 1px solid ${colors.border.light};
    `;

    const promptLabel = document.createElement('div');
    promptLabel.style.cssText = `
      color: ${colors.text.tertiary};
      font-size: ${typography.fontSize.xs};
      font-weight: ${typography.fontWeight.normal};
      margin-bottom: ${spacing.xs};
    `;
    promptLabel.textContent = 'Using:';

    const promptNameDiv = document.createElement('div');
    promptNameDiv.style.cssText = `
      color: ${colors.text.accent};
      font-size: ${typography.fontSize.sm};
      font-weight: ${typography.fontWeight.semibold};
    `;
    promptNameDiv.textContent = promptName;

    promptDisplay.appendChild(promptLabel);
    promptDisplay.appendChild(promptNameDiv);

    // Add CSS animation keyframes
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0%, 100% { opacity: 0.3; transform: scale(0.8); }
        50% { opacity: 1; transform: scale(1.2); }
      }
    `;

    // Assemble loading state
    this.controlPanel.appendChild(header);
    this.controlPanel.appendChild(stepsContainer);
    this.controlPanel.appendChild(promptDisplay);
    this.controlPanel.appendChild(style);

    // Start the animation sequence
    this.startLoadingAnimation(typingText, stepsContainer);
  }

  private async startLoadingAnimation(typingElement: HTMLElement, stepsContainer: HTMLElement): Promise<void> {
    try {
      // Step 1: Type the main text with cursor effect
      await this.createTypingEffect(typingElement, 'Analyzing your content...');
      
      // Step 2: Show steps with staggered fade-in
      const stepElements = stepsContainer.querySelectorAll('[class*="step"]');
      for (let i = 0; i < stepElements.length; i++) {
        const stepElement = stepElements[i] as HTMLElement;
        stepElement.style.opacity = '1';
        stepElement.style.transform = 'translateY(0)';
        await new Promise(resolve => {
          const timer = setTimeout(resolve, 300);
          this.stepTimers.push(timer);
        });
      }

      // Step 3: Progressive step completion with realistic timing
      // Each step starts with a delay and can be interrupted by API completion
      
      // Start first step immediately
      setTimeout(() => this.animateStep('extract', 4000), 0);
      
      // Start subsequent steps with staggered delays
      setTimeout(() => this.animateStep('patterns', 4000), 2000);
      setTimeout(() => this.animateStep('generate', 4000), 4000);
      setTimeout(() => this.animateStep('finalize', 8000), 6000);
      
      // Animation will continue until API completes and calls handleAnalysisComplete()
      
    } catch (error) {
      console.error('Loading animation error:', error);
      // Gracefully handle animation errors - clear timers
      this.stepTimers.forEach(timer => clearTimeout(timer));
      this.stepTimers = [];
    }
  }

  exitSelectionMode(): void {
    if (!this.isActive) return;

    this.isActive = false;
    
    // Clear any running timers
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
      this.typingTimer = null;
    }
    
    this.stepTimers.forEach(timer => clearTimeout(timer));
    this.stepTimers = [];
    
    // Remove keyboard event listener
    document.removeEventListener('keydown', this.keydownHandler);
    
    // Remove message listener
    if (this.messageListener) {
      chrome.runtime.onMessage.removeListener(this.messageListener);
    }
    
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