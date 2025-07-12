
# Project Plan: Web Content Extractor Library ("WebScraper.js")

## 1. Mission Statement

To refactor the content extraction and UI injection logic from the existing Golden Nugget Finder Chrome extension into a standalone, framework-agnostic, and extensible TypeScript library. This library, tentatively named "WebScraper.js", will be designed for use in Chrome extension content scripts, enabling developers to easily extract structured content from web pages and present a selection UI to the user. The final product will be published to npm with full TypeScript support.

## 2. Core Principles

This project will be guided by the following principles:

*   **Decoupling:** The logic for *extracting* content from the DOM will be strictly separated from the logic for *displaying* UI elements (like checkboxes). A developer should be able to use one without the other.
*   **Extensibility:** The architecture must make it simple to add support for new websites (e.g., a news site, a different forum) with minimal code changes to the core library.
*   **Developer Experience (DX):** The library's public API should be simple, intuitive, and well-documented. A developer should be able to get started with just a few lines of code.
*   **Zero Dependencies:** The library will be written in pure, vanilla TypeScript and will have no external runtime dependencies, ensuring it is lightweight and avoids version conflicts in consuming projects.
*   **Sensible Defaults:** The library will work out-of-the-box with default configurations and styles, but will provide clear options for customization.

## 3. High-Level Architecture

The library will be composed of three primary components:

1.  **The Orchestrator (`ContentScraper`):** The main, public-facing class. It acts as the entry point for the developer, detects the current website, and coordinates the other components.
2.  **Extractors (`BaseExtractor`, `HackerNewsExtractor`, etc.):** A set of classes responsible for the "what" and "where" of content extraction. Each class knows how to find and parse content (posts, comments) from a specific website's DOM structure.
3.  **The UI Manager (`UIManager`):** A single class responsible for all DOM manipulation. It will take a list of DOM elements and render checkboxes next to them, handling user interaction and providing optional styling hooks.

## 4. Final Deliverables

The project is considered complete when the following artifacts have been created in a new, dedicated Git repository:

1.  A `package.json` file configured for publishing to npm.
2.  A `src/` directory containing the full TypeScript source code.
3.  A `dist/` directory containing the compiled JavaScript output and all necessary TypeScript declaration files (`.d.ts`).
4.  A comprehensive `README.md` explaining how to install, configure, and use the library with clear code examples.
5.  The original `golden-nugget-finder` codebase refactored to use this new library as a dependency.
