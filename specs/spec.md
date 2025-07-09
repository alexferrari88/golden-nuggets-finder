### **Project Specification: "Golden Nugget Finder" Chrome Extension**

#### **1. Project Overview and Goals**

The project is to create a Chrome extension that acts as an intelligent information filter for any webpage, with specialized functionality for discussion threads on sites like Hacker News and Reddit.

*   **Core Goal:** To help a "Pragmatic Synthesizer" persona with ADHD quickly extract high-signal, actionable insights ("Golden Nuggets") from articles, blog posts, and long comment threads, bypassing low-value content.
*   **Mechanism:** The extension will extract the main content of a webpage or discussion thread, send it to the Google Gemini LLM with a user-selected prompt, receive a structured JSON response, and then visually present the results on the page through a combination of highlighting and a dedicated sidebar.
*   **Target Persona Profile:**
    *   **Cognitive Model:** INTP (logical systems), ADHD (novelty, structure), 5w6 (competence, reliable knowledge).
    *   **Core Interests:** How things work (science/tech), how people think (cognition/philosophy), how we got here (history/evolution), meta-learning, and elegant principles.
    *   **Intellectual Flavor:** Prioritize First Principles and their practical, Applied Synthesis.
    *   **Vibe Check:** Tyler Cowen, Charlie Munger, or Nassim Taleb.

#### **2. Complete Feature List**

*   **Feature: Core Analysis Workflow**
    *   **Requirement 2.1 (Activation):** The user can initiate the analysis in two ways:
        1.  By clicking the extension icon in the Chrome toolbar, which opens a popup menu to select a prompt.
        2.  By right-clicking on the page, which opens a context sub-menu listing all saved prompts.
    *   **Requirement 2.2 (Processing Feedback):** After activation, a temporary notification banner must appear on the page indicating that analysis is in progress (e.g., "Finding golden nuggets...").
    *   **Requirement 2.3 (Result Display):** Upon successful analysis, the extension will display the results using a hybrid approach:
        1.  **On-Page Highlighting:** The extension will attempt to locate and highlight the text of each found "nugget" directly on the page.
        2.  **Results Sidebar:** A sidebar will always appear on the right side of the page, providing a complete list of all found nuggets and their status.

*   **Feature: Multi-Prompt Management**
    *   **Requirement 2.4 (Saved Prompts):** The user can create, name, and save multiple prompts to tailor the kind of nuggets they want to find.
    *   **Requirement 2.5 (Default Prompt):** The user can designate one saved prompt as their "default" for prioritization in UI lists.
    *   **Requirement 2.6 (Options Page):** The extension must have an options page to manage API keys and the library of saved prompts.

*   **Feature: "No Results" Feedback**
    *   **Requirement 2.7:** If the analysis completes and the LLM returns zero nuggets, a temporary notification banner will appear stating, "Analysis complete. No golden nuggets were found."

#### **3. Technical Architecture Decisions**

*   **Platform:** Google Chrome Extension.
*   **Framework**: Plasmo/WXT
*   **Language**: Typescript
*   **LLM Integration**: `@google/genai`
*   **LLM Model**: `gemini-2.5-flash` with thinking enabled and `thinkingBudget=-1`
*   **Core Components:**
    *   **Content Script:** Injected into webpages. Responsible for:
        1.  On activation, scraping the DOM for content. For discussion sites (Hacker News, Reddit), it will use specific selectors. For generic pages, it will use a library like `readability.js` to extract the main article text.
        2.  Receiving results from the background script.
        3.  Modifying the DOM to apply highlights, inject clickable icons, and render the results sidebar.
    *   **Background Script (Service Worker):** Responsible for:
        1.  Receiving scraped text and the chosen prompt from the content script.
        2.  Managing the API call to the Google Gemini.
        3.  Sending the JSON results back to the content script.
    *   **Options Page:** An HTML page for user configuration.

#### **4. Database / Data Model Specifications**

*   **Data Storage:** The extension will use `chrome.storage.sync` to store:
    1.  `geminiApiKey`: The user's Google Gemini API key (string).
    2.  `userPrompts`: An array of objects for the user's saved prompts, e.g., `[{name: "Find Analogies", prompt: "...", isDefault: true}, ...]`.
*   **Input Data to LLM:** A single string of text compiled from the webpage.
*   **Output Data from LLM (MANDATORY):** A JSON object that strictly adheres to the following schema.
    ```json
    {
      "description": "Response when golden nuggets are found.",
      "type": "object",
      "properties": {
        "golden_nuggets": {
          "type": "array",
          "description": "An array of extracted golden nuggets.",
          "minItems": 0,
          "items": {
            "type": "object",
            "properties": {
              "type": {
                "type": "string",
                "description": "The category of the extracted golden nugget.",
                "enum": ["tool", "media", "explanation", "analogy", "model"]
              },
              "content": {
                "type": "string",
                "description": "The original comment(s) verbatim, without any changes to wording or symbols."
              },
              "synthesis": {
                "type": "string",
                "description": "A concise explanation of why this is relevant to the persona, connecting it to their core interests or cognitive profile."
              }
            },
            "required": ["type", "content", "synthesis"]
          }
        }
      },
      "required": ["golden_nuggets"]
    }
    ```

#### **5. UI/UX Requirements and Design Decisions**

*   **Activation UI:**
    *   **Toolbar Button:** A single click on the extension icon opens a popup menu. This menu lists all saved prompts (with the default prompt listed first) for the user to select.
    *   **Context Menu:** Right-clicking on the page shows a "Find Golden Nuggets" menu item, which expands into a sub-menu listing all saved prompts.
*   **On-Page Highlighting:**
    *   **Highlight Style:** `background-color: rgba(255, 215, 0, 0.3);`
    *   **Interaction:**
        *   **For discussion threads (HN/Reddit):** A small, clickable tag (e.g., `[tool]`) is injected into the comment's metadata area. Clicking it opens a popup with the `synthesis`.
        *   **For generic pages:** A small, clickable icon (e.g., ✨) is placed at the end of the highlighted text. Clicking this icon opens a popup with the `synthesis`.
*   **Results Sidebar:**
    *   **Behavior:** The sidebar will **always** appear on the right side of the screen after an analysis is complete.
    *   **Content:** It will display a **complete master list** of all golden nuggets found by the LLM. Each item in the list will show the nugget's `content` and `type`, and indicate its status (e.g., "Highlighted on page" or "Could not be located"). The full `synthesis` for each nugget will be readable within this sidebar.
*   **Options Page UI:**
    *   **Prompt Management:** Will feature a simple list of all saved prompts. Each prompt in the list will have distinct buttons next to it for "Edit," "Delete," and a star icon (★) to "Set as Default." An "Add New Prompt" button will be present to create new prompts.

#### **6. Integration Requirements**

*   **Target Websites:** All websites.
    *   The extension will use robust DOM selectors for specialized extraction on `news.ycombinator.com` and `www.reddit.com`.
    *   On all other websites, it will use a content extraction library (e.g., Mozilla's Readability.js) to identify and parse the main article text.
*   **LLM API:** Google Gemini API, authenticated via a user-provided key. The request must enforce the specified JSON schema via structured output tooling.

#### **7. Constraints and Limitations**

*   **Scraping Scope:** The extension only analyzes content visible in the DOM upon activation. The user must manually expand threads or load more content to include it in the analysis.
*   **API Dependency & Cost:** Functionality is dependent on the Google Gemini API. The user is responsible for all associated costs and adherence to terms of service.
*   **Website Structure Dependency:** The specialized scrapers for Hacker News and Reddit are brittle and may require maintenance if those sites change their HTML structure.
*   **Analysis Integrity:** The quality of results depends on the LLM's performance and the user's prompts.
*   **Text-Only Analysis:** The extension cannot process images, videos, or other non-text media.