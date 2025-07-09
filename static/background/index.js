(function(define){var __define; typeof define === "function" && (__define=define,define=null);
(() => {
const $6bbcd3a3f27af2e5$export$5aae9b6b3e0e7094 = {
    API_KEY: "geminiApiKey",
    PROMPTS: "userPrompts"
};
const $6bbcd3a3f27af2e5$export$df0eebf933b490e1 = {
    REDDIT: {
        POST: '[slot="text-body"]',
        COMMENTS: '[slot="comment"]'
    },
    HACKER_NEWS: {
        POST: ".toptext",
        COMMENTS: ".comment"
    }
};
const $6bbcd3a3f27af2e5$export$dcf199c5d4f9d8af = {
    HIGHLIGHT_STYLE: "background-color: rgba(255, 215, 0, 0.3);",
    SIDEBAR_WIDTH: "320px",
    NOTIFICATION_TIMEOUT: 5000,
    POPUP_Z_INDEX: 10000,
    SIDEBAR_Z_INDEX: 10000,
    BANNER_Z_INDEX: 10001
};
const $6bbcd3a3f27af2e5$export$db3eeeaeb393f860 = {
    MODEL: "gemini-2.5-flash",
    THINKING_BUDGET: -1
};
const $6bbcd3a3f27af2e5$export$a249d26f8aeff723 = [
    {
        id: "default-insights",
        name: "Find Key Insights",
        prompt: 'Extract golden nuggets that would be valuable for a pragmatic synthesizer with ADHD. Focus on actionable insights, elegant principles, tools, analogies, and explanations that connect to first principles thinking. Prioritize content that answers "how things work" or provides practical synthesis.',
        isDefault: true
    }
];


class $6cec50ece7296342$export$93525d6e221593cb {
    static getInstance() {
        if (!$6cec50ece7296342$export$93525d6e221593cb.instance) $6cec50ece7296342$export$93525d6e221593cb.instance = new $6cec50ece7296342$export$93525d6e221593cb();
        return $6cec50ece7296342$export$93525d6e221593cb.instance;
    }
    async getApiKey() {
        const result = await chrome.storage.sync.get((0, $6bbcd3a3f27af2e5$export$5aae9b6b3e0e7094).API_KEY);
        return result[(0, $6bbcd3a3f27af2e5$export$5aae9b6b3e0e7094).API_KEY] || "";
    }
    async saveApiKey(apiKey) {
        await chrome.storage.sync.set({
            [(0, $6bbcd3a3f27af2e5$export$5aae9b6b3e0e7094).API_KEY]: apiKey
        });
    }
    async getPrompts() {
        const result = await chrome.storage.sync.get((0, $6bbcd3a3f27af2e5$export$5aae9b6b3e0e7094).PROMPTS);
        const prompts = result[(0, $6bbcd3a3f27af2e5$export$5aae9b6b3e0e7094).PROMPTS] || [];
        // If no prompts exist, return default prompts
        if (prompts.length === 0) {
            const defaultPrompts = (0, $6bbcd3a3f27af2e5$export$a249d26f8aeff723).map((p)=>({
                    ...p
                }));
            await this.savePrompts(defaultPrompts);
            return defaultPrompts;
        }
        return prompts;
    }
    async savePrompts(prompts) {
        // Check size limit (chrome.storage.sync has 8KB per item limit)
        const data = {
            [(0, $6bbcd3a3f27af2e5$export$5aae9b6b3e0e7094).PROMPTS]: prompts
        };
        const size = new Blob([
            JSON.stringify(data)
        ]).size;
        if (size > 8192) throw new Error("Prompt data too large. Please reduce prompt count or length.");
        await chrome.storage.sync.set(data);
    }
    async savePrompt(prompt) {
        const prompts = await this.getPrompts();
        const existingIndex = prompts.findIndex((p)=>p.id === prompt.id);
        if (existingIndex >= 0) prompts[existingIndex] = prompt;
        else prompts.push(prompt);
        await this.savePrompts(prompts);
    }
    async deletePrompt(promptId) {
        const prompts = await this.getPrompts();
        const filteredPrompts = prompts.filter((p)=>p.id !== promptId);
        await this.savePrompts(filteredPrompts);
    }
    async setDefaultPrompt(promptId) {
        const prompts = await this.getPrompts();
        const updatedPrompts = prompts.map((p)=>({
                ...p,
                isDefault: p.id === promptId
            }));
        await this.savePrompts(updatedPrompts);
    }
    async getDefaultPrompt() {
        const prompts = await this.getPrompts();
        return prompts.find((p)=>p.isDefault) || prompts[0] || null;
    }
    async getConfig() {
        const [apiKey, prompts] = await Promise.all([
            this.getApiKey(),
            this.getPrompts()
        ]);
        return {
            geminiApiKey: apiKey,
            userPrompts: prompts
        };
    }
    async saveConfig(config) {
        const updates = {};
        if (config.geminiApiKey !== undefined) updates[(0, $6bbcd3a3f27af2e5$export$5aae9b6b3e0e7094).API_KEY] = config.geminiApiKey;
        if (config.userPrompts !== undefined) updates[(0, $6bbcd3a3f27af2e5$export$5aae9b6b3e0e7094).PROMPTS] = config.userPrompts;
        await chrome.storage.sync.set(updates);
    }
    async clearAll() {
        await chrome.storage.sync.clear();
    }
}
const $6cec50ece7296342$export$ddcffe0146c8f882 = $6cec50ece7296342$export$93525d6e221593cb.getInstance();


const $41d97d4bf16804e4$export$e5fcfdba4a8ae715 = {
    ANALYZE_CONTENT: "ANALYZE_CONTENT",
    ANALYSIS_COMPLETE: "ANALYSIS_COMPLETE",
    ANALYSIS_ERROR: "ANALYSIS_ERROR",
    GET_PROMPTS: "GET_PROMPTS",
    SAVE_PROMPT: "SAVE_PROMPT",
    DELETE_PROMPT: "DELETE_PROMPT",
    SET_DEFAULT_PROMPT: "SET_DEFAULT_PROMPT",
    GET_CONFIG: "GET_CONFIG",
    SAVE_CONFIG: "SAVE_CONFIG"
};



const $3a950200c24a4e66$export$184c7dfebfdb227c = {
    type: "object",
    properties: {
        golden_nuggets: {
            type: "array",
            description: "An array of extracted golden nuggets.",
            minItems: 0,
            items: {
                type: "object",
                properties: {
                    type: {
                        type: "string",
                        description: "The category of the extracted golden nugget.",
                        enum: [
                            "tool",
                            "media",
                            "explanation",
                            "analogy",
                            "model"
                        ]
                    },
                    content: {
                        type: "string",
                        description: "The original comment(s) verbatim, without any changes to wording or symbols."
                    },
                    synthesis: {
                        type: "string",
                        description: "A concise explanation of why this is relevant to the persona, connecting it to their core interests or cognitive profile."
                    }
                },
                required: [
                    "type",
                    "content",
                    "synthesis"
                ],
                propertyOrdering: [
                    "type",
                    "content",
                    "synthesis"
                ]
            }
        }
    },
    required: [
        "golden_nuggets"
    ],
    propertyOrdering: [
        "golden_nuggets"
    ]
};



class $c617f7d2688b693a$export$c6c4e05128b33946 {
    async initializeClient() {
        if (this.apiKey) return;
        this.apiKey = await (0, $6cec50ece7296342$export$ddcffe0146c8f882).getApiKey();
        if (!this.apiKey) throw new Error("Gemini API key not configured. Please set it in the options page.");
    }
    async analyzeContent(content, userPrompt) {
        await this.initializeClient();
        if (!this.apiKey) throw new Error("Gemini client not initialized");
        // Construct prompt with user query at the end for optimal performance
        const fullPrompt = `${content}\n\n${userPrompt}`;
        return this.retryRequest(async ()=>{
            const requestBody = {
                contents: [
                    {
                        parts: [
                            {
                                text: fullPrompt
                            }
                        ]
                    }
                ],
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: (0, $3a950200c24a4e66$export$184c7dfebfdb227c),
                    thinkingConfig: {
                        thinkingBudget: (0, $6bbcd3a3f27af2e5$export$db3eeeaeb393f860).THINKING_BUDGET
                    }
                }
            };
            const response = await fetch(`${this.API_BASE_URL}/${(0, $6bbcd3a3f27af2e5$export$db3eeeaeb393f860).MODEL}:generateContent?key=${this.apiKey}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(requestBody)
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorText}`);
            }
            const responseData = await response.json();
            // Extract the text from the response
            const responseText = responseData.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!responseText) throw new Error("No response text received from Gemini API");
            const result = JSON.parse(responseText);
            // Validate the response structure
            if (!result.golden_nuggets || !Array.isArray(result.golden_nuggets)) throw new Error("Invalid response format from Gemini API");
            return result;
        });
    }
    async retryRequest(operation, currentAttempt = 1) {
        try {
            return await operation();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            // Handle specific API errors that shouldn't be retried
            if (this.isNonRetryableError(errorMessage)) throw this.enhanceError(error);
            // If we've exhausted retries, throw the enhanced error
            if (currentAttempt >= this.MAX_RETRIES) throw this.enhanceError(error);
            // Wait before retrying (exponential backoff)
            const delay = this.RETRY_DELAY * Math.pow(2, currentAttempt - 1);
            await new Promise((resolve)=>setTimeout(resolve, delay));
            console.warn(`Retrying Gemini API request (attempt ${currentAttempt + 1}/${this.MAX_RETRIES})`);
            return this.retryRequest(operation, currentAttempt + 1);
        }
    }
    isNonRetryableError(errorMessage) {
        const nonRetryableErrors = [
            "API key",
            "authentication",
            "authorization",
            "invalid request",
            "bad request",
            "malformed"
        ];
        return nonRetryableErrors.some((error)=>errorMessage.toLowerCase().includes(error.toLowerCase()));
    }
    enhanceError(error) {
        if (error instanceof Error) {
            const message = error.message.toLowerCase();
            if (message.includes("api key") || message.includes("authentication")) return new Error("Invalid API key. Please check your settings.");
            else if (message.includes("rate limit") || message.includes("quota")) return new Error("Rate limit reached. Please try again later.");
            else if (message.includes("timeout")) return new Error("Request timed out. Please try again.");
            else if (message.includes("network") || message.includes("connection")) return new Error("Network error. Please check your internet connection.");
        }
        console.error("Gemini API error:", error);
        return new Error("Analysis failed. Please try again.");
    }
    async validateApiKey(apiKey) {
        try {
            // Basic validation first
            if (!apiKey || apiKey.trim().length === 0) return false;
            // Test the API key with a simple request
            const testRequestBody = {
                contents: [
                    {
                        parts: [
                            {
                                text: "Test message"
                            }
                        ]
                    }
                ],
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: "object",
                        properties: {
                            test: {
                                type: "string"
                            }
                        },
                        required: [
                            "test"
                        ]
                    }
                }
            };
            const response = await fetch(`${this.API_BASE_URL}/${(0, $6bbcd3a3f27af2e5$export$db3eeeaeb393f860).MODEL}:generateContent?key=${apiKey}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(testRequestBody)
            });
            // If we get a 200 response, the API key is valid
            return response.ok;
        } catch (error) {
            console.warn("API key validation failed:", error);
            return false;
        }
    }
    constructor(){
        this.apiKey = null;
        this.MAX_RETRIES = 3;
        this.RETRY_DELAY = 1000 // 1 second
        ;
        this.API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
    }
}




class $218b9fe7a4e0b944$export$3deceafe0aaeaa95 {
    constructor(geminiClient){
        this.geminiClient = geminiClient;
    }
    async handleMessage(request, sender, sendResponse) {
        try {
            switch(request.type){
                case (0, $41d97d4bf16804e4$export$e5fcfdba4a8ae715).ANALYZE_CONTENT:
                    await this.handleAnalyzeContent(request, sendResponse);
                    break;
                case (0, $41d97d4bf16804e4$export$e5fcfdba4a8ae715).GET_PROMPTS:
                    await this.handleGetPrompts(sendResponse);
                    break;
                case (0, $41d97d4bf16804e4$export$e5fcfdba4a8ae715).SAVE_PROMPT:
                    await this.handleSavePrompt(request, sendResponse);
                    break;
                case (0, $41d97d4bf16804e4$export$e5fcfdba4a8ae715).DELETE_PROMPT:
                    await this.handleDeletePrompt(request, sendResponse);
                    break;
                case (0, $41d97d4bf16804e4$export$e5fcfdba4a8ae715).SET_DEFAULT_PROMPT:
                    await this.handleSetDefaultPrompt(request, sendResponse);
                    break;
                case (0, $41d97d4bf16804e4$export$e5fcfdba4a8ae715).GET_CONFIG:
                    await this.handleGetConfig(sendResponse);
                    break;
                case (0, $41d97d4bf16804e4$export$e5fcfdba4a8ae715).SAVE_CONFIG:
                    await this.handleSaveConfig(request, sendResponse);
                    break;
                default:
                    sendResponse({
                        success: false,
                        error: "Unknown message type"
                    });
            }
        } catch (error) {
            console.error("Error handling message:", error);
            sendResponse({
                success: false,
                error: error.message
            });
        }
    }
    async handleAnalyzeContent(request, sendResponse) {
        try {
            const prompts = await (0, $6cec50ece7296342$export$ddcffe0146c8f882).getPrompts();
            const prompt = prompts.find((p)=>p.id === request.promptId);
            if (!prompt) {
                sendResponse({
                    success: false,
                    error: "Prompt not found"
                });
                return;
            }
            const result = await this.geminiClient.analyzeContent(request.content, prompt.prompt);
            sendResponse({
                success: true,
                data: result
            });
        } catch (error) {
            console.error("Analysis failed:", error);
            sendResponse({
                success: false,
                error: error.message
            });
        }
    }
    async handleGetPrompts(sendResponse) {
        try {
            const prompts = await (0, $6cec50ece7296342$export$ddcffe0146c8f882).getPrompts();
            sendResponse({
                success: true,
                data: prompts
            });
        } catch (error) {
            sendResponse({
                success: false,
                error: error.message
            });
        }
    }
    async handleSavePrompt(request, sendResponse) {
        try {
            await (0, $6cec50ece7296342$export$ddcffe0146c8f882).savePrompt(request.prompt);
            sendResponse({
                success: true
            });
        } catch (error) {
            sendResponse({
                success: false,
                error: error.message
            });
        }
    }
    async handleDeletePrompt(request, sendResponse) {
        try {
            await (0, $6cec50ece7296342$export$ddcffe0146c8f882).deletePrompt(request.promptId);
            sendResponse({
                success: true
            });
        } catch (error) {
            sendResponse({
                success: false,
                error: error.message
            });
        }
    }
    async handleSetDefaultPrompt(request, sendResponse) {
        try {
            await (0, $6cec50ece7296342$export$ddcffe0146c8f882).setDefaultPrompt(request.promptId);
            sendResponse({
                success: true
            });
        } catch (error) {
            sendResponse({
                success: false,
                error: error.message
            });
        }
    }
    async handleGetConfig(sendResponse) {
        try {
            const config = await (0, $6cec50ece7296342$export$ddcffe0146c8f882).getConfig();
            sendResponse({
                success: true,
                data: config
            });
        } catch (error) {
            sendResponse({
                success: false,
                error: error.message
            });
        }
    }
    async handleSaveConfig(request, sendResponse) {
        try {
            await (0, $6cec50ece7296342$export$ddcffe0146c8f882).saveConfig(request.config);
            sendResponse({
                success: true
            });
        } catch (error) {
            sendResponse({
                success: false,
                error: error.message
            });
        }
    }
}


class $9f73dd61fd0e459a$var$BackgroundService {
    constructor(){
        this.geminiClient = new (0, $c617f7d2688b693a$export$c6c4e05128b33946)();
        this.messageHandler = new (0, $218b9fe7a4e0b944$export$3deceafe0aaeaa95)(this.geminiClient);
        this.initialize();
    }
    initialize() {
        // Set up message listeners
        chrome.runtime.onMessage.addListener((request, sender, sendResponse)=>{
            this.messageHandler.handleMessage(request, sender, sendResponse);
            return true; // Keep the message channel open for async responses
        });
        // Set up context menu
        chrome.runtime.onInstalled.addListener(()=>{
            this.setupContextMenu();
        });
        // Update context menu when prompts change
        chrome.storage.onChanged.addListener((changes, namespace)=>{
            if (namespace === "sync" && changes.userPrompts) this.setupContextMenu();
        });
        // Handle context menu clicks
        chrome.contextMenus.onClicked.addListener((info, tab)=>{
            if (info.menuItemId && typeof info.menuItemId === "string" && info.menuItemId.startsWith("prompt-")) {
                const promptId = info.menuItemId.replace("prompt-", "");
                this.handleContextMenuClick(promptId, tab);
            }
        });
    }
    async setupContextMenu() {
        try {
            // Clear existing menu items
            await chrome.contextMenus.removeAll();
            // Get current prompts
            const prompts = await (0, $6cec50ece7296342$export$ddcffe0146c8f882).getPrompts();
            // Create parent menu item
            chrome.contextMenus.create({
                id: "golden-nugget-finder",
                title: "Find Golden Nuggets",
                contexts: [
                    "page",
                    "selection"
                ]
            });
            // Create sub-menu items for each prompt
            prompts.forEach((prompt)=>{
                chrome.contextMenus.create({
                    id: `prompt-${prompt.id}`,
                    parentId: "golden-nugget-finder",
                    title: prompt.isDefault ? `\u2605 ${prompt.name}` : prompt.name,
                    contexts: [
                        "page",
                        "selection"
                    ]
                });
            });
        } catch (error) {
            console.error("Failed to setup context menu:", error);
        }
    }
    async handleContextMenuClick(promptId, tab) {
        if (!tab?.id) return;
        try {
            // Send message to content script to start analysis
            await chrome.tabs.sendMessage(tab.id, {
                type: (0, $41d97d4bf16804e4$export$e5fcfdba4a8ae715).ANALYZE_CONTENT,
                promptId: promptId
            });
        } catch (error) {
            console.error("Failed to send message to content script:", error);
        }
    }
}
// Initialize the background service
new $9f73dd61fd0e459a$var$BackgroundService();



})();
 globalThis.define=__define;  })(globalThis.define);