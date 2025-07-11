import { 
  createStyledElement, 
  applyButtonStyles, 
  applyCardStyles,
  colors, 
  typography, 
  spacing, 
  borderRadius, 
  shadows 
} from './tailwind-utils';
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
    checkbox.classList.add(
      'w-4.5', 'h-4.5', 'border-2', 'border-gray-200', 'rounded-sm', 
      'bg-white', 'cursor-pointer', 'flex', 'items-center', 'justify-center',
      'shadow-sm', 'transition-all', 'duration-200', 'select-none'
    );

    const updateCheckboxState = () => {
      if (comment.selected) {
        checkbox.classList.remove('bg-white', 'border-gray-200');
        checkbox.classList.add('bg-gray-900', 'border-gray-900', 'text-white', 'text-xs', 'font-semibold');
        checkbox.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
      } else {
        checkbox.classList.remove('bg-gray-900', 'border-gray-900', 'text-white', 'text-xs', 'font-semibold');
        checkbox.classList.add('bg-white', 'border-gray-200');
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
      checkbox.classList.add('border-gray-900', 'shadow-md');
    });

    checkbox.addEventListener('mouseleave', () => {
      checkbox.classList.remove('shadow-md');
      if (comment.selected) {
        checkbox.classList.add('border-gray-900');
      } else {
        checkbox.classList.remove('border-gray-900');
        checkbox.classList.add('border-gray-200');
      }
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
    this.controlPanel.classList.add(
      'fixed', 'bottom-5', 'right-5', 'w-80', 'bg-white', 
      'border', 'border-gray-100', 'rounded-xl', 'shadow-lg',
      'z-[10001]', 'font-sans', 'p-4', 'transition-all', 'duration-300'
    );
    this.controlPanel.style.cssText = `
      transform: translateY(100px);
      opacity: 0;
    `;

    // Header with close button
    const headerContainer = document.createElement('div');
    headerContainer.classList.add(
      'flex', 'justify-between', 'items-center', 'mb-3'
    );

    const header = document.createElement('div');
    header.classList.add('text-sm', 'font-semibold', 'text-gray-800');
    header.textContent = this.comments.length > 0 ? 'Select Comments to Analyze' : 'No Comments Found';

    // Close button
    const closeButton = document.createElement('button');
    closeButton.classList.add(
      'bg-transparent', 'border-none', 'cursor-pointer', 'text-gray-500',
      'text-lg', 'p-1', 'rounded-sm', 'transition-all', 'duration-200',
      'flex', 'items-center', 'justify-center', 'w-6', 'h-6'
    );
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
      closeButton.classList.add('bg-gray-25', 'text-gray-800');
    });

    closeButton.addEventListener('mouseleave', () => {
      closeButton.classList.remove('bg-gray-25', 'text-gray-800');
    });

    headerContainer.appendChild(header);
    headerContainer.appendChild(closeButton);

    const counter = document.createElement('div');
    counter.className = 'comment-counter';
    counter.classList.add('text-sm', 'text-gray-500', 'mb-3');

    // Quick actions
    const quickActions = document.createElement('div');
    quickActions.classList.add('flex', 'gap-2', 'mb-3');

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
    promptSection.classList.add('mb-3');

    const promptLabel = document.createElement('div');
    promptLabel.classList.add('text-sm', 'font-medium', 'text-gray-800', 'mb-2');
    promptLabel.textContent = 'Prompt:';

    const promptSelect = document.createElement('select');
    promptSelect.classList.add(
      'w-full', 'p-2', 'border', 'border-gray-100', 'rounded-sm',
      'bg-white', 'text-gray-800', 'text-sm'
    );

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
    applyButtonStyles(analyzeBtn, 'primary');
    analyzeBtn.classList.add('w-full', 'p-3', 'text-sm', 'font-semibold');
    analyzeBtn.textContent = 'Analyze Selected Comments';

    analyzeBtn.addEventListener('click', () => {
      this.analyzeSelectedComments();
    });

    // Hover styles are handled by the utility function

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
    applyButtonStyles(button, 'secondary');
    button.classList.add('flex-1', 'p-2', 'text-xs', 'font-medium');
    button.textContent = text;

    button.addEventListener('click', onClick);
    // Hover styles are handled by the utility function

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
      comment.checkbox.classList.remove('bg-white', 'border-gray-200');
      comment.checkbox.classList.add('bg-gray-900', 'border-gray-900', 'text-white');
      comment.checkbox.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
    } else {
      comment.checkbox.classList.remove('bg-gray-900', 'border-gray-900', 'text-white');
      comment.checkbox.classList.add('bg-white', 'border-gray-200');
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
    stepElement.classList.add(
      'flex', 'items-center', 'gap-2', 'mb-1', 'opacity-0', 
      'transition-all', 'duration-300'
    );
    stepElement.style.cssText = `
      transform: translateY(10px);
    `;

    const indicator = document.createElement('div');
    indicator.className = 'step-indicator';
    indicator.classList.add(
      'text-sm', 'font-medium', 'text-gray-400', 'w-4', 
      'text-center', 'flex-shrink-0'
    );
    indicator.textContent = '○';

    const text = document.createElement('div');
    text.className = 'step-text';
    text.classList.add('text-sm', 'text-gray-400', 'font-normal');
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
        indicator.classList.remove('text-gray-900', 'text-gray-500');
        indicator.classList.add('text-gray-400');
        indicator.style.animation = 'none';
        text.classList.remove('text-gray-500', 'text-gray-800');
        text.classList.add('text-gray-400');
        break;
      case 'in_progress':
        indicator.textContent = '●';
        indicator.classList.remove('text-gray-400', 'text-gray-500');
        indicator.classList.add('text-gray-900');
        indicator.style.animation = 'pulse 1s ease-in-out infinite';
        text.classList.remove('text-gray-400', 'text-gray-800');
        text.classList.add('text-gray-500');
        break;
      case 'completed':
        indicator.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
        indicator.classList.remove('text-gray-400', 'text-gray-500');
        indicator.classList.add('text-gray-900');
        indicator.style.animation = 'none';
        text.classList.remove('text-gray-400', 'text-gray-500');
        text.classList.add('text-gray-800');
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
    this.controlPanel.className = 'nugget-control-panel';
    this.controlPanel.classList.add(
      'fixed', 'bottom-5', 'right-5', 'w-80', 'min-h-60', 'bg-white',
      'border', 'border-gray-100', 'rounded-xl', 'shadow-lg', 'z-[10001]',
      'font-sans', 'p-6', 'flex', 'flex-col', 'gap-4', 'transition-all', 'duration-300'
    );
    this.controlPanel.style.cssText = `
      opacity: 1;
      transform: translateY(0);
    `;

    // Create header with AI avatar and typing text
    const header = document.createElement('div');
    header.classList.add(
      'flex', 'items-center', 'justify-start', 'gap-1', 'mb-3'
    );

    // AI Avatar
    const avatar = document.createElement('div');
    avatar.classList.add(
      'w-4', 'h-4', 'rounded-full', 'bg-gray-900', 'flex-shrink-0'
    );
    avatar.style.cssText = `
      box-shadow: 0 0 8px rgba(26, 26, 26, 0.25);
    `;

    // Typing text container
    const typingText = document.createElement('div');
    typingText.classList.add('text-gray-800', 'text-sm', 'font-medium', 'flex-1');

    header.appendChild(avatar);
    header.appendChild(typingText);

    // Create steps container
    const stepsContainer = document.createElement('div');
    stepsContainer.classList.add('flex', 'flex-col', 'gap-1', 'mb-3');

    // Create step elements
    this.analysisSteps.forEach(step => {
      const stepElement = this.createAnalysisStep(step);
      stepsContainer.appendChild(stepElement);
    });

    // Create prompt display
    const promptDisplay = document.createElement('div');
    promptDisplay.classList.add('text-center', 'pt-3', 'border-t', 'border-gray-100');

    const promptLabel = document.createElement('div');
    promptLabel.classList.add('text-gray-400', 'text-xs', 'font-normal', 'mb-1');
    promptLabel.textContent = 'Using:';

    const promptNameDiv = document.createElement('div');
    promptNameDiv.classList.add('text-gray-900', 'text-sm', 'font-semibold');
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