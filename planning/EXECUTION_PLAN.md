# Execution Plan: WebScraper.js (Monorepo Approach)

This document outlines the step-by-step process to create the WebScraper.js library as a local package within the existing project and then refactor the host application.

## Phase 1: Project Setup & Scaffolding

**Objective:** Create a new local package for the library within the current project structure.

1.  **Create New Directory:** Inside the `golden-nugget-finder` project root, create a new directory named `packages/web-scraper-js`.
2.  **Initialize Node Project:** Run `npm init -y` inside the new `packages/web-scraper-js` directory. This will create a dedicated `package.json` for the library.
3.  **Install TypeScript:** In the `packages/web-scraper-js` directory, run `npm install typescript --save-dev`.
4.  **Configure TypeScript:** Create a `tsconfig.json` file inside `packages/web-scraper-js`. This file will configure how the library code is compiled, ensuring it generates the necessary JavaScript and `.d.ts` declaration files into a `dist` folder.
5.  **Create File Structure:** Create the library's source directory structure inside `packages/web-scraper-js/src` as defined in `TECHNICAL_SPEC.md`.

## Phase 2: Core Implementation

**Objective:** Build the core components of the library based on the technical spec.

1.  **Implement `types.ts`:** Define the `ContentItem`, `Content`, and `ScraperOptions` interfaces in `packages/web-scraper-js/src/types.ts`.
2.  **Implement `BaseExtractor`:** Create the abstract `BaseExtractor` class in `packages/web-scraper-js/src/extractors/base.ts`. Copy the utility methods from the original codebase.
3.  **Implement Site-Specific Extractors:**
    *   For each extractor (`generic.ts`, `hackernews.ts`, `reddit.ts`, `twitter.ts`):
        *   Create the class extending `BaseExtractor` in the library's `extractors` directory.
        *   Copy and **adapt** the logic from the corresponding file in the `golden-nugget-finder` project to return the structured `Content` object.
4.  **Implement `UIManager`:**
    *   Create the `UIManager` class in `packages/web-scraper-js/src/ui-manager.ts`.
    *   Implement the `displayCheckboxes`, `on`, and `destroy` methods, using the original `CommentSelector` for reference but keeping the implementation generic.
5.  **Implement `ContentScraper`:**
    *   Create the main `ContentScraper` class in `packages/web-scraper-js/src/index.ts`.
    *   Implement the site-detection logic and the public API to orchestrate the library's components.

## Phase 3: Refactoring the Host Application

**Objective:** Replace the old code in `golden-nugget-finder` with the new local library.

1.  **Compile the Library:** Run the TypeScript compiler (`tsc`) from the `packages/web-scraper-js` directory to build the library into its `dist` folder.
2.  **Install the Local Library:** From the **root** of the `golden-nugget-finder` project, run `npm install ./packages/web-scraper-js`. This command tells NPM to install the package from the local folder, creating a link in your `node_modules`.
3.  **Update Content Scripts:**
    *   In the host application's files (e.g., `src/content/content-injector.ts`), replace the old logic with imports from the new library (e.g., `import { ContentScraper } from 'web-scraper-js';`).
    *   Instantiate and use the `ContentScraper` class.
4.  **Delete Old Files:** Once the refactoring is complete and verified, delete the now-redundant files from the host application:
    *   `src/content/extractors/*`
    *   `src/content/ui/comment-selector.ts`

## Phase 4: Documentation & Publishing

**Objective:** Prepare the library for public use.

1.  **Write `README.md`:** Create a high-quality README inside `packages/web-scraper-js` with installation instructions, API documentation, and clear usage examples.
2.  **Publish to npm:** (Optional) When ready, you can publish the package to the npm registry directly from the `packages/web-scraper-js` directory.