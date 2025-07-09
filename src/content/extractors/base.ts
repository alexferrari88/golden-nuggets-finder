export abstract class ContentExtractor {
  abstract extractContent(): Promise<string>;
  
  protected cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')  // Replace multiple whitespace with single space
      .replace(/\n\s*\n/g, '\n\n')  // Normalize line breaks
      .trim();
  }
  
  protected extractTextFromElement(element: Element): string {
    // Remove script and style elements
    const clone = element.cloneNode(true) as Element;
    const scriptsAndStyles = clone.querySelectorAll('script, style');
    scriptsAndStyles.forEach(el => el.remove());
    
    return this.cleanText(clone.textContent || '');
  }
  
  protected isElementVisible(element: Element): boolean {
    const rect = element.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(element);
    
    return rect.width > 0 && 
           rect.height > 0 && 
           computedStyle.display !== 'none' && 
           computedStyle.visibility !== 'hidden';
  }
}