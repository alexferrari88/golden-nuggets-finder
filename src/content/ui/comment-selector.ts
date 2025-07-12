// Minimal stub for CommentSelector to maintain compatibility
// TODO: This should be replaced with the new library's UI functionality or removed entirely

export class CommentSelector {
  private selectionModeActive = false;
  private onExitCallback?: () => void;
  private selectedComments: string[] = [];

  setOnExitCallback(callback: () => void): void {
    this.onExitCallback = callback;
  }

  async enterSelectionMode(promptId?: string): Promise<void> {
    this.selectionModeActive = true;
    this.selectedComments = [];
    // TODO: Implement actual selection UI or integrate with new library
    console.warn('CommentSelector.enterSelectionMode is a stub - not fully implemented');
  }

  exitSelectionMode(): void {
    this.selectionModeActive = false;
    this.selectedComments = [];
    // TODO: Cleanup selection UI
  }

  isSelectionModeActive(): boolean {
    return this.selectionModeActive;
  }

  getSelectedComments(): string[] {
    return this.selectedComments;
  }
}