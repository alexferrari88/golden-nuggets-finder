export interface ContentItem {
  id: string; // A unique identifier for the item (e.g., a hash of its content)
  element: HTMLElement; // The actual DOM element
  URL?: string;
  textContent?: string;
  htmlContent?: string;
  type: "post" | "comment";
  selected: boolean;
}

export interface Content {
  pageURL: string;
  title: string;
  items: ContentItem[];
}

export interface CheckboxStyling {
  // Function that returns CSS styles for default checkbox state
  getDefaultStyles: () => string;
  // Function that returns CSS styles for selected checkbox state
  getSelectedStyles: () => string;
  // Function that returns CSS styles for hover state
  getHoverStyles: () => string;
  // Function that returns positioning styles
  getPositioningStyles: (targetRect: DOMRect) => { top: string; left: string };
}

export interface ScraperOptions {
  includeHtml?: boolean;
  checkboxStyling?: CheckboxStyling;
  showCheckboxes?: boolean; // Controls whether checkboxes are displayed automatically
}