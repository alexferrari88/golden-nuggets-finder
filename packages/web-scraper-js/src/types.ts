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

export interface ScraperOptions {
  includeHtml?: boolean;
  checkboxStyles?: {
    selected?: string; // CSS class for selected state
    deselected?: string; // CSS class for deselected state
  };
}