(function(define){var __define; typeof define === "function" && (__define=define,define=null);
// modules are defined as an array
// [ module function, map of requires ]
//
// map of requires is short require name -> numeric require
//
// anything defined in a previous bundle is accessed via the
// orig method which is the require for previous bundles

(function (modules, entry, mainEntry, parcelRequireName, globalName) {
  /* eslint-disable no-undef */
  var globalObject =
    typeof globalThis !== 'undefined'
      ? globalThis
      : typeof self !== 'undefined'
      ? self
      : typeof window !== 'undefined'
      ? window
      : typeof global !== 'undefined'
      ? global
      : {};
  /* eslint-enable no-undef */

  // Save the require from previous bundle to this closure if any
  var previousRequire =
    typeof globalObject[parcelRequireName] === 'function' &&
    globalObject[parcelRequireName];

  var cache = previousRequire.cache || {};
  // Do not use `require` to prevent Webpack from trying to bundle this call
  var nodeRequire =
    typeof module !== 'undefined' &&
    typeof module.require === 'function' &&
    module.require.bind(module);

  function newRequire(name, jumped) {
    if (!cache[name]) {
      if (!modules[name]) {
        // if we cannot find the module within our internal map or
        // cache jump to the current global require ie. the last bundle
        // that was added to the page.
        var currentRequire =
          typeof globalObject[parcelRequireName] === 'function' &&
          globalObject[parcelRequireName];
        if (!jumped && currentRequire) {
          return currentRequire(name, true);
        }

        // If there are other bundles on this page the require from the
        // previous one is saved to 'previousRequire'. Repeat this as
        // many times as there are bundles until the module is found or
        // we exhaust the require chain.
        if (previousRequire) {
          return previousRequire(name, true);
        }

        // Try the node require function if it exists.
        if (nodeRequire && typeof name === 'string') {
          return nodeRequire(name);
        }

        var err = new Error("Cannot find module '" + name + "'");
        err.code = 'MODULE_NOT_FOUND';
        throw err;
      }

      localRequire.resolve = resolve;
      localRequire.cache = {};

      var module = (cache[name] = new newRequire.Module(name));

      modules[name][0].call(
        module.exports,
        localRequire,
        module,
        module.exports,
        this
      );
    }

    return cache[name].exports;

    function localRequire(x) {
      var res = localRequire.resolve(x);
      return res === false ? {} : newRequire(res);
    }

    function resolve(x) {
      var id = modules[name][1][x];
      return id != null ? id : x;
    }
  }

  function Module(moduleName) {
    this.id = moduleName;
    this.bundle = newRequire;
    this.exports = {};
  }

  newRequire.isParcelRequire = true;
  newRequire.Module = Module;
  newRequire.modules = modules;
  newRequire.cache = cache;
  newRequire.parent = previousRequire;
  newRequire.register = function (id, exports) {
    modules[id] = [
      function (require, module) {
        module.exports = exports;
      },
      {},
    ];
  };

  Object.defineProperty(newRequire, 'root', {
    get: function () {
      return globalObject[parcelRequireName];
    },
  });

  globalObject[parcelRequireName] = newRequire;

  for (var i = 0; i < entry.length; i++) {
    newRequire(entry[i]);
  }

  if (mainEntry) {
    // Expose entry point to Node, AMD or browser globals
    // Based on https://github.com/ForbesLindesay/umd/blob/master/template.js
    var mainExports = newRequire(mainEntry);

    // CommonJS
    if (typeof exports === 'object' && typeof module !== 'undefined') {
      module.exports = mainExports;

      // RequireJS
    } else if (typeof define === 'function' && define.amd) {
      define(function () {
        return mainExports;
      });

      // <script>
    } else if (globalName) {
      this[globalName] = mainExports;
    }
  }
})({"en7Pg":[function(require,module,exports) {
var u = globalThis.process?.argv || [];
var h = ()=>globalThis.process?.env || {};
var B = new Set(u), _ = (e)=>B.has(e), G = u.filter((e)=>e.startsWith("--") && e.includes("=")).map((e)=>e.split("=")).reduce((e, [t, o])=>(e[t] = o, e), {});
var U = _("--dry-run"), g = ()=>_("--verbose") || h().VERBOSE === "true", N = g();
var m = (e = "", ...t)=>console.log(e.padEnd(9), "|", ...t);
var y = (...e)=>console.error("\uD83D\uDD34 ERROR".padEnd(9), "|", ...e), v = (...e)=>m("\uD83D\uDD35 INFO", ...e), f = (...e)=>m("\uD83D\uDFE0 WARN", ...e), M = 0, i = (...e)=>g() && m(`\u{1F7E1} ${M++}`, ...e);
var b = ()=>{
    let e = globalThis.browser?.runtime || globalThis.chrome?.runtime, t = ()=>setInterval(e.getPlatformInfo, 24e3);
    e.onStartup.addListener(t), t();
};
var n = {
    "isContentScript": false,
    "isBackground": true,
    "isReact": false,
    "runtimes": [
        "background-service-runtime"
    ],
    "host": "localhost",
    "port": 1815,
    "entryFilePath": "/home/alex/src/golden-nugget-finder/.plasmo/static/background/index.ts",
    "bundleId": "c338908e704c91f1",
    "envHash": "d99a5ffa57acd638",
    "verbose": "false",
    "secure": false,
    "serverPort": 46499
};
module.bundle.HMR_BUNDLE_ID = n.bundleId;
globalThis.process = {
    argv: [],
    env: {
        VERBOSE: n.verbose
    }
};
var D = module.bundle.Module;
function H(e) {
    D.call(this, e), this.hot = {
        data: module.bundle.hotData[e],
        _acceptCallbacks: [],
        _disposeCallbacks: [],
        accept: function(t) {
            this._acceptCallbacks.push(t || function() {});
        },
        dispose: function(t) {
            this._disposeCallbacks.push(t);
        }
    }, module.bundle.hotData[e] = void 0;
}
module.bundle.Module = H;
module.bundle.hotData = {};
var c = globalThis.browser || globalThis.chrome || null;
function R() {
    return !n.host || n.host === "0.0.0.0" ? location.protocol.indexOf("http") === 0 ? location.hostname : "localhost" : n.host;
}
function x() {
    return !n.host || n.host === "0.0.0.0" ? "localhost" : n.host;
}
function d() {
    return n.port || location.port;
}
var P = "__plasmo_runtime_page_", S = "__plasmo_runtime_script_";
var O = `${n.secure ? "https" : "http"}://${R()}:${d()}/`;
async function k(e = 1470) {
    for(;;)try {
        await fetch(O);
        break;
    } catch  {
        await new Promise((o)=>setTimeout(o, e));
    }
}
if (c.runtime.getManifest().manifest_version === 3) {
    let e = c.runtime.getURL("/__plasmo_hmr_proxy__?url=");
    globalThis.addEventListener("fetch", function(t) {
        let o = t.request.url;
        if (o.startsWith(e)) {
            let s = new URL(decodeURIComponent(o.slice(e.length)));
            s.hostname === n.host && s.port === `${n.port}` ? (s.searchParams.set("t", Date.now().toString()), t.respondWith(fetch(s).then((r)=>new Response(r.body, {
                    headers: {
                        "Content-Type": r.headers.get("Content-Type") ?? "text/javascript"
                    }
                })))) : t.respondWith(new Response("Plasmo HMR", {
                status: 200,
                statusText: "Testing"
            }));
        }
    });
}
function E(e, t) {
    let { modules: o } = e;
    return o ? !!o[t] : !1;
}
function C(e = d()) {
    let t = x();
    return `${n.secure || location.protocol === "https:" && !/localhost|127.0.0.1|0.0.0.0/.test(t) ? "wss" : "ws"}://${t}:${e}/`;
}
function L(e) {
    typeof e.message == "string" && y("[plasmo/parcel-runtime]: " + e.message);
}
function T(e) {
    if (typeof globalThis.WebSocket > "u") return;
    let t = new WebSocket(C(Number(d()) + 1));
    return t.addEventListener("message", async function(o) {
        let s = JSON.parse(o.data);
        await e(s);
    }), t.addEventListener("error", L), t;
}
function A(e) {
    if (typeof globalThis.WebSocket > "u") return;
    let t = new WebSocket(C());
    return t.addEventListener("message", async function(o) {
        let s = JSON.parse(o.data);
        if (s.type === "update" && await e(s.assets), s.type === "error") for (let r of s.diagnostics.ansi){
            let l = r.codeframe || r.stack;
            f("[plasmo/parcel-runtime]: " + r.message + `
` + l + `

` + r.hints.join(`
`));
        }
    }), t.addEventListener("error", L), t.addEventListener("open", ()=>{
        v(`[plasmo/parcel-runtime]: Connected to HMR server for ${n.entryFilePath}`);
    }), t.addEventListener("close", ()=>{
        f(`[plasmo/parcel-runtime]: Connection to the HMR server is closed for ${n.entryFilePath}`);
    }), t;
}
var w = module.bundle.parent, a = {
    buildReady: !1,
    bgChanged: !1,
    csChanged: !1,
    pageChanged: !1,
    scriptPorts: new Set,
    pagePorts: new Set
};
async function p(e = !1) {
    if (e || a.buildReady && a.pageChanged) {
        i("BGSW Runtime - reloading Page");
        for (let t of a.pagePorts)t.postMessage(null);
    }
    if (e || a.buildReady && (a.bgChanged || a.csChanged)) {
        i("BGSW Runtime - reloading CS");
        let t = await c?.tabs.query({
            active: !0
        });
        for (let o of a.scriptPorts){
            let s = t.some((r)=>r.id === o.sender.tab?.id);
            o.postMessage({
                __plasmo_cs_active_tab__: s
            });
        }
        c.runtime.reload();
    }
}
if (!w || !w.isParcelRequire) {
    b();
    let e = A(async (t)=>{
        i("BGSW Runtime - On HMR Update"), a.bgChanged ||= t.filter((s)=>s.envHash === n.envHash).some((s)=>E(module.bundle, s.id));
        let o = t.find((s)=>s.type === "json");
        if (o) {
            let s = new Set(t.map((l)=>l.id)), r = Object.values(o.depsByBundle).map((l)=>Object.values(l)).flat();
            a.bgChanged ||= r.every((l)=>s.has(l));
        }
        p();
    });
    e.addEventListener("open", ()=>{
        let t = setInterval(()=>e.send("ping"), 24e3);
        e.addEventListener("close", ()=>clearInterval(t));
    }), e.addEventListener("close", async ()=>{
        await k(), p(!0);
    });
}
T(async (e)=>{
    switch(i("BGSW Runtime - On Build Repackaged"), e.type){
        case "build_ready":
            a.buildReady ||= !0, p();
            break;
        case "cs_changed":
            a.csChanged ||= !0, p();
            break;
    }
});
c.runtime.onConnect.addListener(function(e) {
    let t = e.name.startsWith(P), o = e.name.startsWith(S);
    if (t || o) {
        let s = t ? a.pagePorts : a.scriptPorts;
        s.add(e), e.onDisconnect.addListener(()=>{
            s.delete(e);
        }), e.onMessage.addListener(function(r) {
            i("BGSW Runtime - On source changed", r), r.__plasmo_cs_changed__ && (a.csChanged ||= !0), r.__plasmo_page_changed__ && (a.pageChanged ||= !0), p();
        });
    }
});
c.runtime.onMessage.addListener(function(t) {
    return t.__plasmo_full_reload__ && (i("BGSW Runtime - On top-level code changed"), p()), !0;
});

},{}],"8oeFb":[function(require,module,exports) {
var _index = require("../../../src/background/index");

},{"../../../src/background/index":"kB65o"}],"kB65o":[function(require,module,exports) {
var _storage = require("../shared/storage");
var _types = require("../shared/types");
var _geminiClient = require("./gemini-client");
var _messageHandler = require("./message-handler");
class BackgroundService {
    constructor(){
        this.geminiClient = new (0, _geminiClient.GeminiClient)();
        this.messageHandler = new (0, _messageHandler.MessageHandler)(this.geminiClient);
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
            const prompts = await (0, _storage.storage).getPrompts();
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
                type: (0, _types.MESSAGE_TYPES).ANALYZE_CONTENT,
                promptId: promptId
            });
        } catch (error) {
            console.error("Failed to send message to content script:", error);
        }
    }
}
// Initialize the background service
new BackgroundService();

},{"../shared/storage":"ldVDm","../shared/types":"kj1EQ","./gemini-client":"e4Ic4","./message-handler":"64d4T"}],"ldVDm":[function(require,module,exports) {
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
parcelHelpers.export(exports, "StorageManager", ()=>StorageManager);
parcelHelpers.export(exports, "storage", ()=>storage);
var _constants = require("./constants");
class StorageManager {
    static getInstance() {
        if (!StorageManager.instance) StorageManager.instance = new StorageManager();
        return StorageManager.instance;
    }
    async getApiKey() {
        const result = await chrome.storage.sync.get((0, _constants.STORAGE_KEYS).API_KEY);
        return result[(0, _constants.STORAGE_KEYS).API_KEY] || "";
    }
    async saveApiKey(apiKey) {
        await chrome.storage.sync.set({
            [(0, _constants.STORAGE_KEYS).API_KEY]: apiKey
        });
    }
    async getPrompts() {
        const result = await chrome.storage.sync.get((0, _constants.STORAGE_KEYS).PROMPTS);
        const prompts = result[(0, _constants.STORAGE_KEYS).PROMPTS] || [];
        // If no prompts exist, return default prompts
        if (prompts.length === 0) {
            const defaultPrompts = (0, _constants.DEFAULT_PROMPTS).map((p)=>({
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
            [(0, _constants.STORAGE_KEYS).PROMPTS]: prompts
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
        if (config.geminiApiKey !== undefined) updates[(0, _constants.STORAGE_KEYS).API_KEY] = config.geminiApiKey;
        if (config.userPrompts !== undefined) updates[(0, _constants.STORAGE_KEYS).PROMPTS] = config.userPrompts;
        await chrome.storage.sync.set(updates);
    }
    async clearAll() {
        await chrome.storage.sync.clear();
    }
}
const storage = StorageManager.getInstance();

},{"./constants":"8r7N1","@parcel/transformer-js/src/esmodule-helpers.js":"iIXqM"}],"8r7N1":[function(require,module,exports) {
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
parcelHelpers.export(exports, "STORAGE_KEYS", ()=>STORAGE_KEYS);
parcelHelpers.export(exports, "SITE_SELECTORS", ()=>SITE_SELECTORS);
parcelHelpers.export(exports, "UI_CONSTANTS", ()=>UI_CONSTANTS);
parcelHelpers.export(exports, "GEMINI_CONFIG", ()=>GEMINI_CONFIG);
parcelHelpers.export(exports, "DEFAULT_PROMPTS", ()=>DEFAULT_PROMPTS);
const STORAGE_KEYS = {
    API_KEY: "geminiApiKey",
    PROMPTS: "userPrompts"
};
const SITE_SELECTORS = {
    REDDIT: {
        POST: '[slot="text-body"]',
        COMMENTS: '[slot="comment"]'
    },
    HACKER_NEWS: {
        POST: ".toptext",
        COMMENTS: ".comment"
    }
};
const UI_CONSTANTS = {
    HIGHLIGHT_STYLE: "background-color: rgba(255, 215, 0, 0.3);",
    SIDEBAR_WIDTH: "320px",
    NOTIFICATION_TIMEOUT: 5000,
    POPUP_Z_INDEX: 10000,
    SIDEBAR_Z_INDEX: 10000,
    BANNER_Z_INDEX: 10001
};
const GEMINI_CONFIG = {
    MODEL: "gemini-2.5-flash",
    THINKING_BUDGET: -1
};
const DEFAULT_PROMPTS = [
    {
        id: "default-insights",
        name: "Find Key Insights",
        prompt: 'Extract golden nuggets that would be valuable for a pragmatic synthesizer with ADHD. Focus on actionable insights, elegant principles, tools, analogies, and explanations that connect to first principles thinking. Prioritize content that answers "how things work" or provides practical synthesis.',
        isDefault: true
    }
];

},{"@parcel/transformer-js/src/esmodule-helpers.js":"iIXqM"}],"iIXqM":[function(require,module,exports) {
exports.interopDefault = function(a) {
    return a && a.__esModule ? a : {
        default: a
    };
};
exports.defineInteropFlag = function(a) {
    Object.defineProperty(a, "__esModule", {
        value: true
    });
};
exports.exportAll = function(source, dest) {
    Object.keys(source).forEach(function(key) {
        if (key === "default" || key === "__esModule" || dest.hasOwnProperty(key)) return;
        Object.defineProperty(dest, key, {
            enumerable: true,
            get: function() {
                return source[key];
            }
        });
    });
    return dest;
};
exports.export = function(dest, destName, get) {
    Object.defineProperty(dest, destName, {
        enumerable: true,
        get: get
    });
};

},{}],"kj1EQ":[function(require,module,exports) {
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
parcelHelpers.export(exports, "MESSAGE_TYPES", ()=>MESSAGE_TYPES);
const MESSAGE_TYPES = {
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

},{"@parcel/transformer-js/src/esmodule-helpers.js":"iIXqM"}],"e4Ic4":[function(require,module,exports) {
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
parcelHelpers.export(exports, "GeminiClient", ()=>GeminiClient);
var _constants = require("../shared/constants");
var _schemas = require("../shared/schemas");
var _storage = require("../shared/storage");
class GeminiClient {
    async initializeClient() {
        if (this.apiKey) return;
        this.apiKey = await (0, _storage.storage).getApiKey();
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
                    responseSchema: (0, _schemas.GOLDEN_NUGGET_SCHEMA),
                    thinkingConfig: {
                        thinkingBudget: (0, _constants.GEMINI_CONFIG).THINKING_BUDGET
                    }
                }
            };
            const response = await fetch(`${this.API_BASE_URL}/${(0, _constants.GEMINI_CONFIG).MODEL}:generateContent?key=${this.apiKey}`, {
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
            const response = await fetch(`${this.API_BASE_URL}/${(0, _constants.GEMINI_CONFIG).MODEL}:generateContent?key=${apiKey}`, {
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

},{"../shared/constants":"8r7N1","../shared/schemas":"a0IsU","../shared/storage":"ldVDm","@parcel/transformer-js/src/esmodule-helpers.js":"iIXqM"}],"a0IsU":[function(require,module,exports) {
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
parcelHelpers.export(exports, "GOLDEN_NUGGET_SCHEMA", ()=>GOLDEN_NUGGET_SCHEMA);
const GOLDEN_NUGGET_SCHEMA = {
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

},{"@parcel/transformer-js/src/esmodule-helpers.js":"iIXqM"}],"64d4T":[function(require,module,exports) {
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
parcelHelpers.export(exports, "MessageHandler", ()=>MessageHandler);
var _types = require("../shared/types");
var _storage = require("../shared/storage");
class MessageHandler {
    constructor(geminiClient){
        this.geminiClient = geminiClient;
    }
    async handleMessage(request, sender, sendResponse) {
        try {
            switch(request.type){
                case (0, _types.MESSAGE_TYPES).ANALYZE_CONTENT:
                    await this.handleAnalyzeContent(request, sendResponse);
                    break;
                case (0, _types.MESSAGE_TYPES).GET_PROMPTS:
                    await this.handleGetPrompts(sendResponse);
                    break;
                case (0, _types.MESSAGE_TYPES).SAVE_PROMPT:
                    await this.handleSavePrompt(request, sendResponse);
                    break;
                case (0, _types.MESSAGE_TYPES).DELETE_PROMPT:
                    await this.handleDeletePrompt(request, sendResponse);
                    break;
                case (0, _types.MESSAGE_TYPES).SET_DEFAULT_PROMPT:
                    await this.handleSetDefaultPrompt(request, sendResponse);
                    break;
                case (0, _types.MESSAGE_TYPES).GET_CONFIG:
                    await this.handleGetConfig(sendResponse);
                    break;
                case (0, _types.MESSAGE_TYPES).SAVE_CONFIG:
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
            const prompts = await (0, _storage.storage).getPrompts();
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
            const prompts = await (0, _storage.storage).getPrompts();
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
            await (0, _storage.storage).savePrompt(request.prompt);
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
            await (0, _storage.storage).deletePrompt(request.promptId);
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
            await (0, _storage.storage).setDefaultPrompt(request.promptId);
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
            const config = await (0, _storage.storage).getConfig();
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
            await (0, _storage.storage).saveConfig(request.config);
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

},{"../shared/types":"kj1EQ","../shared/storage":"ldVDm","@parcel/transformer-js/src/esmodule-helpers.js":"iIXqM"}]},["en7Pg","8oeFb"], "8oeFb", "parcelRequired8eb")

//# sourceMappingURL=data:application/json;charset=utf-8;base64,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QU8sQUFBQyxNQUFnQjtZQUFRO1FBQ2pFO0lBQ0Y7QUFDRiIsInNvdXJjZXMiOlsibm9kZV9tb2R1bGVzL0BwbGFzbW9ocS9wYXJjZWwtcnVudGltZS9kaXN0L3J1bnRpbWUtYmQwODBiZThmNzhiMGVmMC5qcyIsIi5wbGFzbW8vc3RhdGljL2JhY2tncm91bmQvaW5kZXgudHMiLCJzcmMvYmFja2dyb3VuZC9pbmRleC50cyIsInNyYy9zaGFyZWQvc3RvcmFnZS50cyIsInNyYy9zaGFyZWQvY29uc3RhbnRzLnRzIiwibm9kZV9tb2R1bGVzL0BwYXJjZWwvdHJhbnNmb3JtZXItanMvc3JjL2VzbW9kdWxlLWhlbHBlcnMuanMiLCJzcmMvc2hhcmVkL3R5cGVzLnRzIiwic3JjL2JhY2tncm91bmQvZ2VtaW5pLWNsaWVudC50cyIsInNyYy9zaGFyZWQvc2NoZW1hcy50cyIsInNyYy9iYWNrZ3JvdW5kL21lc3NhZ2UtaGFuZGxlci50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgdT1nbG9iYWxUaGlzLnByb2Nlc3M/LmFyZ3Z8fFtdO3ZhciBoPSgpPT5nbG9iYWxUaGlzLnByb2Nlc3M/LmVudnx8e307dmFyIEI9bmV3IFNldCh1KSxfPWU9PkIuaGFzKGUpLEc9dS5maWx0ZXIoZT0+ZS5zdGFydHNXaXRoKFwiLS1cIikmJmUuaW5jbHVkZXMoXCI9XCIpKS5tYXAoZT0+ZS5zcGxpdChcIj1cIikpLnJlZHVjZSgoZSxbdCxvXSk9PihlW3RdPW8sZSkse30pO3ZhciBVPV8oXCItLWRyeS1ydW5cIiksZz0oKT0+XyhcIi0tdmVyYm9zZVwiKXx8aCgpLlZFUkJPU0U9PT1cInRydWVcIixOPWcoKTt2YXIgbT0oZT1cIlwiLC4uLnQpPT5jb25zb2xlLmxvZyhlLnBhZEVuZCg5KSxcInxcIiwuLi50KTt2YXIgeT0oLi4uZSk9PmNvbnNvbGUuZXJyb3IoXCJcXHV7MUY1MzR9IEVSUk9SXCIucGFkRW5kKDkpLFwifFwiLC4uLmUpLHY9KC4uLmUpPT5tKFwiXFx1ezFGNTM1fSBJTkZPXCIsLi4uZSksZj0oLi4uZSk9Pm0oXCJcXHV7MUY3RTB9IFdBUk5cIiwuLi5lKSxNPTAsaT0oLi4uZSk9PmcoKSYmbShgXFx1ezFGN0UxfSAke00rK31gLC4uLmUpO3ZhciBiPSgpPT57bGV0IGU9Z2xvYmFsVGhpcy5icm93c2VyPy5ydW50aW1lfHxnbG9iYWxUaGlzLmNocm9tZT8ucnVudGltZSx0PSgpPT5zZXRJbnRlcnZhbChlLmdldFBsYXRmb3JtSW5mbywyNGUzKTtlLm9uU3RhcnR1cC5hZGRMaXN0ZW5lcih0KSx0KCl9O3ZhciBuPXtcImlzQ29udGVudFNjcmlwdFwiOmZhbHNlLFwiaXNCYWNrZ3JvdW5kXCI6dHJ1ZSxcImlzUmVhY3RcIjpmYWxzZSxcInJ1bnRpbWVzXCI6W1wiYmFja2dyb3VuZC1zZXJ2aWNlLXJ1bnRpbWVcIl0sXCJob3N0XCI6XCJsb2NhbGhvc3RcIixcInBvcnRcIjoxODE1LFwiZW50cnlGaWxlUGF0aFwiOlwiL2hvbWUvYWxleC9zcmMvZ29sZGVuLW51Z2dldC1maW5kZXIvLnBsYXNtby9zdGF0aWMvYmFja2dyb3VuZC9pbmRleC50c1wiLFwiYnVuZGxlSWRcIjpcImMzMzg5MDhlNzA0YzkxZjFcIixcImVudkhhc2hcIjpcImQ5OWE1ZmZhNTdhY2Q2MzhcIixcInZlcmJvc2VcIjpcImZhbHNlXCIsXCJzZWN1cmVcIjpmYWxzZSxcInNlcnZlclBvcnRcIjo0NjQ5OX07bW9kdWxlLmJ1bmRsZS5ITVJfQlVORExFX0lEPW4uYnVuZGxlSWQ7Z2xvYmFsVGhpcy5wcm9jZXNzPXthcmd2OltdLGVudjp7VkVSQk9TRTpuLnZlcmJvc2V9fTt2YXIgRD1tb2R1bGUuYnVuZGxlLk1vZHVsZTtmdW5jdGlvbiBIKGUpe0QuY2FsbCh0aGlzLGUpLHRoaXMuaG90PXtkYXRhOm1vZHVsZS5idW5kbGUuaG90RGF0YVtlXSxfYWNjZXB0Q2FsbGJhY2tzOltdLF9kaXNwb3NlQ2FsbGJhY2tzOltdLGFjY2VwdDpmdW5jdGlvbih0KXt0aGlzLl9hY2NlcHRDYWxsYmFja3MucHVzaCh0fHxmdW5jdGlvbigpe30pfSxkaXNwb3NlOmZ1bmN0aW9uKHQpe3RoaXMuX2Rpc3Bvc2VDYWxsYmFja3MucHVzaCh0KX19LG1vZHVsZS5idW5kbGUuaG90RGF0YVtlXT12b2lkIDB9bW9kdWxlLmJ1bmRsZS5Nb2R1bGU9SDttb2R1bGUuYnVuZGxlLmhvdERhdGE9e307dmFyIGM9Z2xvYmFsVGhpcy5icm93c2VyfHxnbG9iYWxUaGlzLmNocm9tZXx8bnVsbDtmdW5jdGlvbiBSKCl7cmV0dXJuIW4uaG9zdHx8bi5ob3N0PT09XCIwLjAuMC4wXCI/bG9jYXRpb24ucHJvdG9jb2wuaW5kZXhPZihcImh0dHBcIik9PT0wP2xvY2F0aW9uLmhvc3RuYW1lOlwibG9jYWxob3N0XCI6bi5ob3N0fWZ1bmN0aW9uIHgoKXtyZXR1cm4hbi5ob3N0fHxuLmhvc3Q9PT1cIjAuMC4wLjBcIj9cImxvY2FsaG9zdFwiOm4uaG9zdH1mdW5jdGlvbiBkKCl7cmV0dXJuIG4ucG9ydHx8bG9jYXRpb24ucG9ydH12YXIgUD1cIl9fcGxhc21vX3J1bnRpbWVfcGFnZV9cIixTPVwiX19wbGFzbW9fcnVudGltZV9zY3JpcHRfXCI7dmFyIE89YCR7bi5zZWN1cmU/XCJodHRwc1wiOlwiaHR0cFwifTovLyR7UigpfToke2QoKX0vYDthc3luYyBmdW5jdGlvbiBrKGU9MTQ3MCl7Zm9yKDs7KXRyeXthd2FpdCBmZXRjaChPKTticmVha31jYXRjaHthd2FpdCBuZXcgUHJvbWlzZShvPT5zZXRUaW1lb3V0KG8sZSkpfX1pZihjLnJ1bnRpbWUuZ2V0TWFuaWZlc3QoKS5tYW5pZmVzdF92ZXJzaW9uPT09Myl7bGV0IGU9Yy5ydW50aW1lLmdldFVSTChcIi9fX3BsYXNtb19obXJfcHJveHlfXz91cmw9XCIpO2dsb2JhbFRoaXMuYWRkRXZlbnRMaXN0ZW5lcihcImZldGNoXCIsZnVuY3Rpb24odCl7bGV0IG89dC5yZXF1ZXN0LnVybDtpZihvLnN0YXJ0c1dpdGgoZSkpe2xldCBzPW5ldyBVUkwoZGVjb2RlVVJJQ29tcG9uZW50KG8uc2xpY2UoZS5sZW5ndGgpKSk7cy5ob3N0bmFtZT09PW4uaG9zdCYmcy5wb3J0PT09YCR7bi5wb3J0fWA/KHMuc2VhcmNoUGFyYW1zLnNldChcInRcIixEYXRlLm5vdygpLnRvU3RyaW5nKCkpLHQucmVzcG9uZFdpdGgoZmV0Y2gocykudGhlbihyPT5uZXcgUmVzcG9uc2Uoci5ib2R5LHtoZWFkZXJzOntcIkNvbnRlbnQtVHlwZVwiOnIuaGVhZGVycy5nZXQoXCJDb250ZW50LVR5cGVcIik/P1widGV4dC9qYXZhc2NyaXB0XCJ9fSkpKSk6dC5yZXNwb25kV2l0aChuZXcgUmVzcG9uc2UoXCJQbGFzbW8gSE1SXCIse3N0YXR1czoyMDAsc3RhdHVzVGV4dDpcIlRlc3RpbmdcIn0pKX19KX1mdW5jdGlvbiBFKGUsdCl7bGV0e21vZHVsZXM6b309ZTtyZXR1cm4gbz8hIW9bdF06ITF9ZnVuY3Rpb24gQyhlPWQoKSl7bGV0IHQ9eCgpO3JldHVybmAke24uc2VjdXJlfHxsb2NhdGlvbi5wcm90b2NvbD09PVwiaHR0cHM6XCImJiEvbG9jYWxob3N0fDEyNy4wLjAuMXwwLjAuMC4wLy50ZXN0KHQpP1wid3NzXCI6XCJ3c1wifTovLyR7dH06JHtlfS9gfWZ1bmN0aW9uIEwoZSl7dHlwZW9mIGUubWVzc2FnZT09XCJzdHJpbmdcIiYmeShcIltwbGFzbW8vcGFyY2VsLXJ1bnRpbWVdOiBcIitlLm1lc3NhZ2UpfWZ1bmN0aW9uIFQoZSl7aWYodHlwZW9mIGdsb2JhbFRoaXMuV2ViU29ja2V0PlwidVwiKXJldHVybjtsZXQgdD1uZXcgV2ViU29ja2V0KEMoTnVtYmVyKGQoKSkrMSkpO3JldHVybiB0LmFkZEV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsYXN5bmMgZnVuY3Rpb24obyl7bGV0IHM9SlNPTi5wYXJzZShvLmRhdGEpO2F3YWl0IGUocyl9KSx0LmFkZEV2ZW50TGlzdGVuZXIoXCJlcnJvclwiLEwpLHR9ZnVuY3Rpb24gQShlKXtpZih0eXBlb2YgZ2xvYmFsVGhpcy5XZWJTb2NrZXQ+XCJ1XCIpcmV0dXJuO2xldCB0PW5ldyBXZWJTb2NrZXQoQygpKTtyZXR1cm4gdC5hZGRFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLGFzeW5jIGZ1bmN0aW9uKG8pe2xldCBzPUpTT04ucGFyc2Uoby5kYXRhKTtpZihzLnR5cGU9PT1cInVwZGF0ZVwiJiZhd2FpdCBlKHMuYXNzZXRzKSxzLnR5cGU9PT1cImVycm9yXCIpZm9yKGxldCByIG9mIHMuZGlhZ25vc3RpY3MuYW5zaSl7bGV0IGw9ci5jb2RlZnJhbWV8fHIuc3RhY2s7ZihcIltwbGFzbW8vcGFyY2VsLXJ1bnRpbWVdOiBcIityLm1lc3NhZ2UrYFxuYCtsK2BcblxuYCtyLmhpbnRzLmpvaW4oYFxuYCkpfX0pLHQuYWRkRXZlbnRMaXN0ZW5lcihcImVycm9yXCIsTCksdC5hZGRFdmVudExpc3RlbmVyKFwib3BlblwiLCgpPT57dihgW3BsYXNtby9wYXJjZWwtcnVudGltZV06IENvbm5lY3RlZCB0byBITVIgc2VydmVyIGZvciAke24uZW50cnlGaWxlUGF0aH1gKX0pLHQuYWRkRXZlbnRMaXN0ZW5lcihcImNsb3NlXCIsKCk9PntmKGBbcGxhc21vL3BhcmNlbC1ydW50aW1lXTogQ29ubmVjdGlvbiB0byB0aGUgSE1SIHNlcnZlciBpcyBjbG9zZWQgZm9yICR7bi5lbnRyeUZpbGVQYXRofWApfSksdH12YXIgdz1tb2R1bGUuYnVuZGxlLnBhcmVudCxhPXtidWlsZFJlYWR5OiExLGJnQ2hhbmdlZDohMSxjc0NoYW5nZWQ6ITEscGFnZUNoYW5nZWQ6ITEsc2NyaXB0UG9ydHM6bmV3IFNldCxwYWdlUG9ydHM6bmV3IFNldH07YXN5bmMgZnVuY3Rpb24gcChlPSExKXtpZihlfHxhLmJ1aWxkUmVhZHkmJmEucGFnZUNoYW5nZWQpe2koXCJCR1NXIFJ1bnRpbWUgLSByZWxvYWRpbmcgUGFnZVwiKTtmb3IobGV0IHQgb2YgYS5wYWdlUG9ydHMpdC5wb3N0TWVzc2FnZShudWxsKX1pZihlfHxhLmJ1aWxkUmVhZHkmJihhLmJnQ2hhbmdlZHx8YS5jc0NoYW5nZWQpKXtpKFwiQkdTVyBSdW50aW1lIC0gcmVsb2FkaW5nIENTXCIpO2xldCB0PWF3YWl0IGM/LnRhYnMucXVlcnkoe2FjdGl2ZTohMH0pO2ZvcihsZXQgbyBvZiBhLnNjcmlwdFBvcnRzKXtsZXQgcz10LnNvbWUocj0+ci5pZD09PW8uc2VuZGVyLnRhYj8uaWQpO28ucG9zdE1lc3NhZ2Uoe19fcGxhc21vX2NzX2FjdGl2ZV90YWJfXzpzfSl9Yy5ydW50aW1lLnJlbG9hZCgpfX1pZighd3x8IXcuaXNQYXJjZWxSZXF1aXJlKXtiKCk7bGV0IGU9QShhc3luYyB0PT57aShcIkJHU1cgUnVudGltZSAtIE9uIEhNUiBVcGRhdGVcIiksYS5iZ0NoYW5nZWR8fD10LmZpbHRlcihzPT5zLmVudkhhc2g9PT1uLmVudkhhc2gpLnNvbWUocz0+RShtb2R1bGUuYnVuZGxlLHMuaWQpKTtsZXQgbz10LmZpbmQocz0+cy50eXBlPT09XCJqc29uXCIpO2lmKG8pe2xldCBzPW5ldyBTZXQodC5tYXAobD0+bC5pZCkpLHI9T2JqZWN0LnZhbHVlcyhvLmRlcHNCeUJ1bmRsZSkubWFwKGw9Pk9iamVjdC52YWx1ZXMobCkpLmZsYXQoKTthLmJnQ2hhbmdlZHx8PXIuZXZlcnkobD0+cy5oYXMobCkpfXAoKX0pO2UuYWRkRXZlbnRMaXN0ZW5lcihcIm9wZW5cIiwoKT0+e2xldCB0PXNldEludGVydmFsKCgpPT5lLnNlbmQoXCJwaW5nXCIpLDI0ZTMpO2UuYWRkRXZlbnRMaXN0ZW5lcihcImNsb3NlXCIsKCk9PmNsZWFySW50ZXJ2YWwodCkpfSksZS5hZGRFdmVudExpc3RlbmVyKFwiY2xvc2VcIixhc3luYygpPT57YXdhaXQgaygpLHAoITApfSl9VChhc3luYyBlPT57c3dpdGNoKGkoXCJCR1NXIFJ1bnRpbWUgLSBPbiBCdWlsZCBSZXBhY2thZ2VkXCIpLGUudHlwZSl7Y2FzZVwiYnVpbGRfcmVhZHlcIjp7YS5idWlsZFJlYWR5fHw9ITAscCgpO2JyZWFrfWNhc2VcImNzX2NoYW5nZWRcIjp7YS5jc0NoYW5nZWR8fD0hMCxwKCk7YnJlYWt9fX0pO2MucnVudGltZS5vbkNvbm5lY3QuYWRkTGlzdGVuZXIoZnVuY3Rpb24oZSl7bGV0IHQ9ZS5uYW1lLnN0YXJ0c1dpdGgoUCksbz1lLm5hbWUuc3RhcnRzV2l0aChTKTtpZih0fHxvKXtsZXQgcz10P2EucGFnZVBvcnRzOmEuc2NyaXB0UG9ydHM7cy5hZGQoZSksZS5vbkRpc2Nvbm5lY3QuYWRkTGlzdGVuZXIoKCk9PntzLmRlbGV0ZShlKX0pLGUub25NZXNzYWdlLmFkZExpc3RlbmVyKGZ1bmN0aW9uKHIpe2koXCJCR1NXIFJ1bnRpbWUgLSBPbiBzb3VyY2UgY2hhbmdlZFwiLHIpLHIuX19wbGFzbW9fY3NfY2hhbmdlZF9fJiYoYS5jc0NoYW5nZWR8fD0hMCksci5fX3BsYXNtb19wYWdlX2NoYW5nZWRfXyYmKGEucGFnZUNoYW5nZWR8fD0hMCkscCgpfSl9fSk7Yy5ydW50aW1lLm9uTWVzc2FnZS5hZGRMaXN0ZW5lcihmdW5jdGlvbih0KXtyZXR1cm4gdC5fX3BsYXNtb19mdWxsX3JlbG9hZF9fJiYoaShcIkJHU1cgUnVudGltZSAtIE9uIHRvcC1sZXZlbCBjb2RlIGNoYW5nZWRcIikscCgpKSwhMH0pO1xuIiwiaW1wb3J0IFwiLi4vLi4vLi4vc3JjL2JhY2tncm91bmQvaW5kZXhcIiIsImltcG9ydCB7IHN0b3JhZ2UgfSBmcm9tICcuLi9zaGFyZWQvc3RvcmFnZSc7XG5pbXBvcnQgeyBNRVNTQUdFX1RZUEVTIH0gZnJvbSAnLi4vc2hhcmVkL3R5cGVzJztcbmltcG9ydCB7IEdlbWluaUNsaWVudCB9IGZyb20gJy4vZ2VtaW5pLWNsaWVudCc7XG5pbXBvcnQgeyBNZXNzYWdlSGFuZGxlciB9IGZyb20gJy4vbWVzc2FnZS1oYW5kbGVyJztcblxuY2xhc3MgQmFja2dyb3VuZFNlcnZpY2Uge1xuICBwcml2YXRlIGdlbWluaUNsaWVudDogR2VtaW5pQ2xpZW50O1xuICBwcml2YXRlIG1lc3NhZ2VIYW5kbGVyOiBNZXNzYWdlSGFuZGxlcjtcblxuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLmdlbWluaUNsaWVudCA9IG5ldyBHZW1pbmlDbGllbnQoKTtcbiAgICB0aGlzLm1lc3NhZ2VIYW5kbGVyID0gbmV3IE1lc3NhZ2VIYW5kbGVyKHRoaXMuZ2VtaW5pQ2xpZW50KTtcbiAgICB0aGlzLmluaXRpYWxpemUoKTtcbiAgfVxuXG4gIHByaXZhdGUgaW5pdGlhbGl6ZSgpOiB2b2lkIHtcbiAgICAvLyBTZXQgdXAgbWVzc2FnZSBsaXN0ZW5lcnNcbiAgICBjaHJvbWUucnVudGltZS5vbk1lc3NhZ2UuYWRkTGlzdGVuZXIoKHJlcXVlc3QsIHNlbmRlciwgc2VuZFJlc3BvbnNlKSA9PiB7XG4gICAgICB0aGlzLm1lc3NhZ2VIYW5kbGVyLmhhbmRsZU1lc3NhZ2UocmVxdWVzdCwgc2VuZGVyLCBzZW5kUmVzcG9uc2UpO1xuICAgICAgcmV0dXJuIHRydWU7IC8vIEtlZXAgdGhlIG1lc3NhZ2UgY2hhbm5lbCBvcGVuIGZvciBhc3luYyByZXNwb25zZXNcbiAgICB9KTtcblxuICAgIC8vIFNldCB1cCBjb250ZXh0IG1lbnVcbiAgICBjaHJvbWUucnVudGltZS5vbkluc3RhbGxlZC5hZGRMaXN0ZW5lcigoKSA9PiB7XG4gICAgICB0aGlzLnNldHVwQ29udGV4dE1lbnUoKTtcbiAgICB9KTtcblxuICAgIC8vIFVwZGF0ZSBjb250ZXh0IG1lbnUgd2hlbiBwcm9tcHRzIGNoYW5nZVxuICAgIGNocm9tZS5zdG9yYWdlLm9uQ2hhbmdlZC5hZGRMaXN0ZW5lcigoY2hhbmdlcywgbmFtZXNwYWNlKSA9PiB7XG4gICAgICBpZiAobmFtZXNwYWNlID09PSAnc3luYycgJiYgY2hhbmdlcy51c2VyUHJvbXB0cykge1xuICAgICAgICB0aGlzLnNldHVwQ29udGV4dE1lbnUoKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIEhhbmRsZSBjb250ZXh0IG1lbnUgY2xpY2tzXG4gICAgY2hyb21lLmNvbnRleHRNZW51cy5vbkNsaWNrZWQuYWRkTGlzdGVuZXIoKGluZm8sIHRhYikgPT4ge1xuICAgICAgaWYgKGluZm8ubWVudUl0ZW1JZCAmJiB0eXBlb2YgaW5mby5tZW51SXRlbUlkID09PSAnc3RyaW5nJyAmJiBpbmZvLm1lbnVJdGVtSWQuc3RhcnRzV2l0aCgncHJvbXB0LScpKSB7XG4gICAgICAgIGNvbnN0IHByb21wdElkID0gaW5mby5tZW51SXRlbUlkLnJlcGxhY2UoJ3Byb21wdC0nLCAnJyk7XG4gICAgICAgIHRoaXMuaGFuZGxlQ29udGV4dE1lbnVDbGljayhwcm9tcHRJZCwgdGFiKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgc2V0dXBDb250ZXh0TWVudSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0cnkge1xuICAgICAgLy8gQ2xlYXIgZXhpc3RpbmcgbWVudSBpdGVtc1xuICAgICAgYXdhaXQgY2hyb21lLmNvbnRleHRNZW51cy5yZW1vdmVBbGwoKTtcblxuICAgICAgLy8gR2V0IGN1cnJlbnQgcHJvbXB0c1xuICAgICAgY29uc3QgcHJvbXB0cyA9IGF3YWl0IHN0b3JhZ2UuZ2V0UHJvbXB0cygpO1xuXG4gICAgICAvLyBDcmVhdGUgcGFyZW50IG1lbnUgaXRlbVxuICAgICAgY2hyb21lLmNvbnRleHRNZW51cy5jcmVhdGUoe1xuICAgICAgICBpZDogJ2dvbGRlbi1udWdnZXQtZmluZGVyJyxcbiAgICAgICAgdGl0bGU6ICdGaW5kIEdvbGRlbiBOdWdnZXRzJyxcbiAgICAgICAgY29udGV4dHM6IFsncGFnZScsICdzZWxlY3Rpb24nXVxuICAgICAgfSk7XG5cbiAgICAgIC8vIENyZWF0ZSBzdWItbWVudSBpdGVtcyBmb3IgZWFjaCBwcm9tcHRcbiAgICAgIHByb21wdHMuZm9yRWFjaChwcm9tcHQgPT4ge1xuICAgICAgICBjaHJvbWUuY29udGV4dE1lbnVzLmNyZWF0ZSh7XG4gICAgICAgICAgaWQ6IGBwcm9tcHQtJHtwcm9tcHQuaWR9YCxcbiAgICAgICAgICBwYXJlbnRJZDogJ2dvbGRlbi1udWdnZXQtZmluZGVyJyxcbiAgICAgICAgICB0aXRsZTogcHJvbXB0LmlzRGVmYXVsdCA/IGDimIUgJHtwcm9tcHQubmFtZX1gIDogcHJvbXB0Lm5hbWUsXG4gICAgICAgICAgY29udGV4dHM6IFsncGFnZScsICdzZWxlY3Rpb24nXVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gc2V0dXAgY29udGV4dCBtZW51OicsIGVycm9yKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGhhbmRsZUNvbnRleHRNZW51Q2xpY2socHJvbXB0SWQ6IHN0cmluZywgdGFiPzogY2hyb21lLnRhYnMuVGFiKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKCF0YWI/LmlkKSByZXR1cm47XG5cbiAgICB0cnkge1xuICAgICAgLy8gU2VuZCBtZXNzYWdlIHRvIGNvbnRlbnQgc2NyaXB0IHRvIHN0YXJ0IGFuYWx5c2lzXG4gICAgICBhd2FpdCBjaHJvbWUudGFicy5zZW5kTWVzc2FnZSh0YWIuaWQsIHtcbiAgICAgICAgdHlwZTogTUVTU0FHRV9UWVBFUy5BTkFMWVpFX0NPTlRFTlQsXG4gICAgICAgIHByb21wdElkOiBwcm9tcHRJZFxuICAgICAgfSk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBzZW5kIG1lc3NhZ2UgdG8gY29udGVudCBzY3JpcHQ6JywgZXJyb3IpO1xuICAgIH1cbiAgfVxufVxuXG4vLyBJbml0aWFsaXplIHRoZSBiYWNrZ3JvdW5kIHNlcnZpY2Vcbm5ldyBCYWNrZ3JvdW5kU2VydmljZSgpOyIsImltcG9ydCB7IFNUT1JBR0VfS0VZUywgREVGQVVMVF9QUk9NUFRTIH0gZnJvbSAnLi9jb25zdGFudHMnO1xuaW1wb3J0IHsgRXh0ZW5zaW9uQ29uZmlnLCBTYXZlZFByb21wdCB9IGZyb20gJy4vdHlwZXMnO1xuXG5leHBvcnQgY2xhc3MgU3RvcmFnZU1hbmFnZXIge1xuICBwcml2YXRlIHN0YXRpYyBpbnN0YW5jZTogU3RvcmFnZU1hbmFnZXI7XG4gIFxuICBzdGF0aWMgZ2V0SW5zdGFuY2UoKTogU3RvcmFnZU1hbmFnZXIge1xuICAgIGlmICghU3RvcmFnZU1hbmFnZXIuaW5zdGFuY2UpIHtcbiAgICAgIFN0b3JhZ2VNYW5hZ2VyLmluc3RhbmNlID0gbmV3IFN0b3JhZ2VNYW5hZ2VyKCk7XG4gICAgfVxuICAgIHJldHVybiBTdG9yYWdlTWFuYWdlci5pbnN0YW5jZTtcbiAgfVxuXG4gIGFzeW5jIGdldEFwaUtleSgpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNocm9tZS5zdG9yYWdlLnN5bmMuZ2V0KFNUT1JBR0VfS0VZUy5BUElfS0VZKTtcbiAgICByZXR1cm4gcmVzdWx0W1NUT1JBR0VfS0VZUy5BUElfS0VZXSB8fCAnJztcbiAgfVxuXG4gIGFzeW5jIHNhdmVBcGlLZXkoYXBpS2V5OiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBhd2FpdCBjaHJvbWUuc3RvcmFnZS5zeW5jLnNldCh7IFtTVE9SQUdFX0tFWVMuQVBJX0tFWV06IGFwaUtleSB9KTtcbiAgfVxuXG4gIGFzeW5jIGdldFByb21wdHMoKTogUHJvbWlzZTxTYXZlZFByb21wdFtdPiB7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY2hyb21lLnN0b3JhZ2Uuc3luYy5nZXQoU1RPUkFHRV9LRVlTLlBST01QVFMpO1xuICAgIGNvbnN0IHByb21wdHMgPSByZXN1bHRbU1RPUkFHRV9LRVlTLlBST01QVFNdIHx8IFtdO1xuICAgIFxuICAgIC8vIElmIG5vIHByb21wdHMgZXhpc3QsIHJldHVybiBkZWZhdWx0IHByb21wdHNcbiAgICBpZiAocHJvbXB0cy5sZW5ndGggPT09IDApIHtcbiAgICAgIGNvbnN0IGRlZmF1bHRQcm9tcHRzID0gREVGQVVMVF9QUk9NUFRTLm1hcChwID0+ICh7IC4uLnAgfSkpO1xuICAgICAgYXdhaXQgdGhpcy5zYXZlUHJvbXB0cyhkZWZhdWx0UHJvbXB0cyk7XG4gICAgICByZXR1cm4gZGVmYXVsdFByb21wdHM7XG4gICAgfVxuICAgIFxuICAgIHJldHVybiBwcm9tcHRzO1xuICB9XG5cbiAgYXN5bmMgc2F2ZVByb21wdHMocHJvbXB0czogU2F2ZWRQcm9tcHRbXSk6IFByb21pc2U8dm9pZD4ge1xuICAgIC8vIENoZWNrIHNpemUgbGltaXQgKGNocm9tZS5zdG9yYWdlLnN5bmMgaGFzIDhLQiBwZXIgaXRlbSBsaW1pdClcbiAgICBjb25zdCBkYXRhID0geyBbU1RPUkFHRV9LRVlTLlBST01QVFNdOiBwcm9tcHRzIH07XG4gICAgY29uc3Qgc2l6ZSA9IG5ldyBCbG9iKFtKU09OLnN0cmluZ2lmeShkYXRhKV0pLnNpemU7XG4gICAgXG4gICAgaWYgKHNpemUgPiA4MTkyKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Byb21wdCBkYXRhIHRvbyBsYXJnZS4gUGxlYXNlIHJlZHVjZSBwcm9tcHQgY291bnQgb3IgbGVuZ3RoLicpO1xuICAgIH1cbiAgICBcbiAgICBhd2FpdCBjaHJvbWUuc3RvcmFnZS5zeW5jLnNldChkYXRhKTtcbiAgfVxuXG4gIGFzeW5jIHNhdmVQcm9tcHQocHJvbXB0OiBTYXZlZFByb21wdCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHByb21wdHMgPSBhd2FpdCB0aGlzLmdldFByb21wdHMoKTtcbiAgICBjb25zdCBleGlzdGluZ0luZGV4ID0gcHJvbXB0cy5maW5kSW5kZXgocCA9PiBwLmlkID09PSBwcm9tcHQuaWQpO1xuICAgIFxuICAgIGlmIChleGlzdGluZ0luZGV4ID49IDApIHtcbiAgICAgIHByb21wdHNbZXhpc3RpbmdJbmRleF0gPSBwcm9tcHQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIHByb21wdHMucHVzaChwcm9tcHQpO1xuICAgIH1cbiAgICBcbiAgICBhd2FpdCB0aGlzLnNhdmVQcm9tcHRzKHByb21wdHMpO1xuICB9XG5cbiAgYXN5bmMgZGVsZXRlUHJvbXB0KHByb21wdElkOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBwcm9tcHRzID0gYXdhaXQgdGhpcy5nZXRQcm9tcHRzKCk7XG4gICAgY29uc3QgZmlsdGVyZWRQcm9tcHRzID0gcHJvbXB0cy5maWx0ZXIocCA9PiBwLmlkICE9PSBwcm9tcHRJZCk7XG4gICAgYXdhaXQgdGhpcy5zYXZlUHJvbXB0cyhmaWx0ZXJlZFByb21wdHMpO1xuICB9XG5cbiAgYXN5bmMgc2V0RGVmYXVsdFByb21wdChwcm9tcHRJZDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgcHJvbXB0cyA9IGF3YWl0IHRoaXMuZ2V0UHJvbXB0cygpO1xuICAgIGNvbnN0IHVwZGF0ZWRQcm9tcHRzID0gcHJvbXB0cy5tYXAocCA9PiAoe1xuICAgICAgLi4ucCxcbiAgICAgIGlzRGVmYXVsdDogcC5pZCA9PT0gcHJvbXB0SWRcbiAgICB9KSk7XG4gICAgYXdhaXQgdGhpcy5zYXZlUHJvbXB0cyh1cGRhdGVkUHJvbXB0cyk7XG4gIH1cblxuICBhc3luYyBnZXREZWZhdWx0UHJvbXB0KCk6IFByb21pc2U8U2F2ZWRQcm9tcHQgfCBudWxsPiB7XG4gICAgY29uc3QgcHJvbXB0cyA9IGF3YWl0IHRoaXMuZ2V0UHJvbXB0cygpO1xuICAgIHJldHVybiBwcm9tcHRzLmZpbmQocCA9PiBwLmlzRGVmYXVsdCkgfHwgcHJvbXB0c1swXSB8fCBudWxsO1xuICB9XG5cbiAgYXN5bmMgZ2V0Q29uZmlnKCk6IFByb21pc2U8RXh0ZW5zaW9uQ29uZmlnPiB7XG4gICAgY29uc3QgW2FwaUtleSwgcHJvbXB0c10gPSBhd2FpdCBQcm9taXNlLmFsbChbXG4gICAgICB0aGlzLmdldEFwaUtleSgpLFxuICAgICAgdGhpcy5nZXRQcm9tcHRzKClcbiAgICBdKTtcbiAgICBcbiAgICByZXR1cm4ge1xuICAgICAgZ2VtaW5pQXBpS2V5OiBhcGlLZXksXG4gICAgICB1c2VyUHJvbXB0czogcHJvbXB0c1xuICAgIH07XG4gIH1cblxuICBhc3luYyBzYXZlQ29uZmlnKGNvbmZpZzogUGFydGlhbDxFeHRlbnNpb25Db25maWc+KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgdXBkYXRlczogeyBba2V5OiBzdHJpbmddOiBhbnkgfSA9IHt9O1xuICAgIFxuICAgIGlmIChjb25maWcuZ2VtaW5pQXBpS2V5ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHVwZGF0ZXNbU1RPUkFHRV9LRVlTLkFQSV9LRVldID0gY29uZmlnLmdlbWluaUFwaUtleTtcbiAgICB9XG4gICAgXG4gICAgaWYgKGNvbmZpZy51c2VyUHJvbXB0cyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB1cGRhdGVzW1NUT1JBR0VfS0VZUy5QUk9NUFRTXSA9IGNvbmZpZy51c2VyUHJvbXB0cztcbiAgICB9XG4gICAgXG4gICAgYXdhaXQgY2hyb21lLnN0b3JhZ2Uuc3luYy5zZXQodXBkYXRlcyk7XG4gIH1cblxuICBhc3luYyBjbGVhckFsbCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBhd2FpdCBjaHJvbWUuc3RvcmFnZS5zeW5jLmNsZWFyKCk7XG4gIH1cbn1cblxuZXhwb3J0IGNvbnN0IHN0b3JhZ2UgPSBTdG9yYWdlTWFuYWdlci5nZXRJbnN0YW5jZSgpOyIsImV4cG9ydCBjb25zdCBTVE9SQUdFX0tFWVMgPSB7XG4gIEFQSV9LRVk6ICdnZW1pbmlBcGlLZXknLFxuICBQUk9NUFRTOiAndXNlclByb21wdHMnXG59IGFzIGNvbnN0O1xuXG5leHBvcnQgY29uc3QgU0lURV9TRUxFQ1RPUlMgPSB7XG4gIFJFRERJVDoge1xuICAgIFBPU1Q6ICdbc2xvdD1cInRleHQtYm9keVwiXScsXG4gICAgQ09NTUVOVFM6ICdbc2xvdD1cImNvbW1lbnRcIl0nXG4gIH0sXG4gIEhBQ0tFUl9ORVdTOiB7XG4gICAgUE9TVDogJy50b3B0ZXh0JyxcbiAgICBDT01NRU5UUzogJy5jb21tZW50J1xuICB9XG59IGFzIGNvbnN0O1xuXG5leHBvcnQgY29uc3QgVUlfQ09OU1RBTlRTID0ge1xuICBISUdITElHSFRfU1RZTEU6ICdiYWNrZ3JvdW5kLWNvbG9yOiByZ2JhKDI1NSwgMjE1LCAwLCAwLjMpOycsXG4gIFNJREVCQVJfV0lEVEg6ICczMjBweCcsXG4gIE5PVElGSUNBVElPTl9USU1FT1VUOiA1MDAwLFxuICBQT1BVUF9aX0lOREVYOiAxMDAwMCxcbiAgU0lERUJBUl9aX0lOREVYOiAxMDAwMCxcbiAgQkFOTkVSX1pfSU5ERVg6IDEwMDAxXG59IGFzIGNvbnN0O1xuXG5leHBvcnQgY29uc3QgR0VNSU5JX0NPTkZJRyA9IHtcbiAgTU9ERUw6ICdnZW1pbmktMi41LWZsYXNoJyxcbiAgVEhJTktJTkdfQlVER0VUOiAtMVxufSBhcyBjb25zdDtcblxuZXhwb3J0IGNvbnN0IERFRkFVTFRfUFJPTVBUUyA9IFtcbiAge1xuICAgIGlkOiAnZGVmYXVsdC1pbnNpZ2h0cycsXG4gICAgbmFtZTogJ0ZpbmQgS2V5IEluc2lnaHRzJyxcbiAgICBwcm9tcHQ6ICdFeHRyYWN0IGdvbGRlbiBudWdnZXRzIHRoYXQgd291bGQgYmUgdmFsdWFibGUgZm9yIGEgcHJhZ21hdGljIHN5bnRoZXNpemVyIHdpdGggQURIRC4gRm9jdXMgb24gYWN0aW9uYWJsZSBpbnNpZ2h0cywgZWxlZ2FudCBwcmluY2lwbGVzLCB0b29scywgYW5hbG9naWVzLCBhbmQgZXhwbGFuYXRpb25zIHRoYXQgY29ubmVjdCB0byBmaXJzdCBwcmluY2lwbGVzIHRoaW5raW5nLiBQcmlvcml0aXplIGNvbnRlbnQgdGhhdCBhbnN3ZXJzIFwiaG93IHRoaW5ncyB3b3JrXCIgb3IgcHJvdmlkZXMgcHJhY3RpY2FsIHN5bnRoZXNpcy4nLFxuICAgIGlzRGVmYXVsdDogdHJ1ZVxuICB9XG5dIGFzIGNvbnN0OyIsImV4cG9ydHMuaW50ZXJvcERlZmF1bHQgPSBmdW5jdGlvbiAoYSkge1xuICByZXR1cm4gYSAmJiBhLl9fZXNNb2R1bGUgPyBhIDoge2RlZmF1bHQ6IGF9O1xufTtcblxuZXhwb3J0cy5kZWZpbmVJbnRlcm9wRmxhZyA9IGZ1bmN0aW9uIChhKSB7XG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShhLCAnX19lc01vZHVsZScsIHt2YWx1ZTogdHJ1ZX0pO1xufTtcblxuZXhwb3J0cy5leHBvcnRBbGwgPSBmdW5jdGlvbiAoc291cmNlLCBkZXN0KSB7XG4gIE9iamVjdC5rZXlzKHNvdXJjZSkuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgaWYgKGtleSA9PT0gJ2RlZmF1bHQnIHx8IGtleSA9PT0gJ19fZXNNb2R1bGUnIHx8IGRlc3QuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShkZXN0LCBrZXksIHtcbiAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHNvdXJjZVtrZXldO1xuICAgICAgfSxcbiAgICB9KTtcbiAgfSk7XG5cbiAgcmV0dXJuIGRlc3Q7XG59O1xuXG5leHBvcnRzLmV4cG9ydCA9IGZ1bmN0aW9uIChkZXN0LCBkZXN0TmFtZSwgZ2V0KSB7XG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShkZXN0LCBkZXN0TmFtZSwge1xuICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgZ2V0OiBnZXQsXG4gIH0pO1xufTtcbiIsImV4cG9ydCBpbnRlcmZhY2UgR29sZGVuTnVnZ2V0IHtcbiAgdHlwZTogJ3Rvb2wnIHwgJ21lZGlhJyB8ICdleHBsYW5hdGlvbicgfCAnYW5hbG9neScgfCAnbW9kZWwnO1xuICBjb250ZW50OiBzdHJpbmc7XG4gIHN5bnRoZXNpczogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEdlbWluaVJlc3BvbnNlIHtcbiAgZ29sZGVuX251Z2dldHM6IEdvbGRlbk51Z2dldFtdO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFNhdmVkUHJvbXB0IHtcbiAgaWQ6IHN0cmluZztcbiAgbmFtZTogc3RyaW5nO1xuICBwcm9tcHQ6IHN0cmluZztcbiAgaXNEZWZhdWx0OiBib29sZWFuO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEV4dGVuc2lvbkNvbmZpZyB7XG4gIGdlbWluaUFwaUtleTogc3RyaW5nO1xuICB1c2VyUHJvbXB0czogU2F2ZWRQcm9tcHRbXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBOdWdnZXREaXNwbGF5U3RhdGUge1xuICBudWdnZXQ6IEdvbGRlbk51Z2dldDtcbiAgaGlnaGxpZ2h0ZWQ6IGJvb2xlYW47XG4gIGVsZW1lbnRSZWY/OiBIVE1MRWxlbWVudDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBTaWRlYmFyTnVnZ2V0SXRlbSB7XG4gIG51Z2dldDogR29sZGVuTnVnZ2V0O1xuICBzdGF0dXM6ICdoaWdobGlnaHRlZCcgfCAnbm90LWZvdW5kJztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBBbmFseXNpc1JlcXVlc3Qge1xuICBjb250ZW50OiBzdHJpbmc7XG4gIHByb21wdElkOiBzdHJpbmc7XG4gIHVybDogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEFuYWx5c2lzUmVzcG9uc2Uge1xuICBzdWNjZXNzOiBib29sZWFuO1xuICBkYXRhPzogR2VtaW5pUmVzcG9uc2U7XG4gIGVycm9yPzogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIE1lc3NhZ2VUeXBlcyB7XG4gIEFOQUxZWkVfQ09OVEVOVDogJ0FOQUxZWkVfQ09OVEVOVCc7XG4gIEFOQUxZU0lTX0NPTVBMRVRFOiAnQU5BTFlTSVNfQ09NUExFVEUnO1xuICBBTkFMWVNJU19FUlJPUjogJ0FOQUxZU0lTX0VSUk9SJztcbiAgR0VUX1BST01QVFM6ICdHRVRfUFJPTVBUUyc7XG4gIFNBVkVfUFJPTVBUOiAnU0FWRV9QUk9NUFQnO1xuICBERUxFVEVfUFJPTVBUOiAnREVMRVRFX1BST01QVCc7XG4gIFNFVF9ERUZBVUxUX1BST01QVDogJ1NFVF9ERUZBVUxUX1BST01QVCc7XG4gIEdFVF9DT05GSUc6ICdHRVRfQ09ORklHJztcbiAgU0FWRV9DT05GSUc6ICdTQVZFX0NPTkZJRyc7XG59XG5cbmV4cG9ydCBjb25zdCBNRVNTQUdFX1RZUEVTOiBNZXNzYWdlVHlwZXMgPSB7XG4gIEFOQUxZWkVfQ09OVEVOVDogJ0FOQUxZWkVfQ09OVEVOVCcsXG4gIEFOQUxZU0lTX0NPTVBMRVRFOiAnQU5BTFlTSVNfQ09NUExFVEUnLFxuICBBTkFMWVNJU19FUlJPUjogJ0FOQUxZU0lTX0VSUk9SJyxcbiAgR0VUX1BST01QVFM6ICdHRVRfUFJPTVBUUycsXG4gIFNBVkVfUFJPTVBUOiAnU0FWRV9QUk9NUFQnLFxuICBERUxFVEVfUFJPTVBUOiAnREVMRVRFX1BST01QVCcsXG4gIFNFVF9ERUZBVUxUX1BST01QVDogJ1NFVF9ERUZBVUxUX1BST01QVCcsXG4gIEdFVF9DT05GSUc6ICdHRVRfQ09ORklHJyxcbiAgU0FWRV9DT05GSUc6ICdTQVZFX0NPTkZJRydcbn07IiwiaW1wb3J0IHsgR0VNSU5JX0NPTkZJRyB9IGZyb20gJy4uL3NoYXJlZC9jb25zdGFudHMnO1xuaW1wb3J0IHsgR09MREVOX05VR0dFVF9TQ0hFTUEgfSBmcm9tICcuLi9zaGFyZWQvc2NoZW1hcyc7XG5pbXBvcnQgeyBHZW1pbmlSZXNwb25zZSB9IGZyb20gJy4uL3NoYXJlZC90eXBlcyc7XG5pbXBvcnQgeyBzdG9yYWdlIH0gZnJvbSAnLi4vc2hhcmVkL3N0b3JhZ2UnO1xuXG5leHBvcnQgY2xhc3MgR2VtaW5pQ2xpZW50IHtcbiAgcHJpdmF0ZSBhcGlLZXk6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIHJlYWRvbmx5IE1BWF9SRVRSSUVTID0gMztcbiAgcHJpdmF0ZSByZWFkb25seSBSRVRSWV9ERUxBWSA9IDEwMDA7IC8vIDEgc2Vjb25kXG4gIHByaXZhdGUgcmVhZG9ubHkgQVBJX0JBU0VfVVJMID0gJ2h0dHBzOi8vZ2VuZXJhdGl2ZWxhbmd1YWdlLmdvb2dsZWFwaXMuY29tL3YxYmV0YS9tb2RlbHMnO1xuXG4gIHByaXZhdGUgYXN5bmMgaW5pdGlhbGl6ZUNsaWVudCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAodGhpcy5hcGlLZXkpIHJldHVybjtcblxuICAgIHRoaXMuYXBpS2V5ID0gYXdhaXQgc3RvcmFnZS5nZXRBcGlLZXkoKTtcbiAgICBpZiAoIXRoaXMuYXBpS2V5KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0dlbWluaSBBUEkga2V5IG5vdCBjb25maWd1cmVkLiBQbGVhc2Ugc2V0IGl0IGluIHRoZSBvcHRpb25zIHBhZ2UuJyk7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgYW5hbHl6ZUNvbnRlbnQoY29udGVudDogc3RyaW5nLCB1c2VyUHJvbXB0OiBzdHJpbmcpOiBQcm9taXNlPEdlbWluaVJlc3BvbnNlPiB7XG4gICAgYXdhaXQgdGhpcy5pbml0aWFsaXplQ2xpZW50KCk7XG5cbiAgICBpZiAoIXRoaXMuYXBpS2V5KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0dlbWluaSBjbGllbnQgbm90IGluaXRpYWxpemVkJyk7XG4gICAgfVxuXG4gICAgLy8gQ29uc3RydWN0IHByb21wdCB3aXRoIHVzZXIgcXVlcnkgYXQgdGhlIGVuZCBmb3Igb3B0aW1hbCBwZXJmb3JtYW5jZVxuICAgIGNvbnN0IGZ1bGxQcm9tcHQgPSBgJHtjb250ZW50fVxcblxcbiR7dXNlclByb21wdH1gO1xuXG4gICAgcmV0dXJuIHRoaXMucmV0cnlSZXF1ZXN0KGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IHJlcXVlc3RCb2R5ID0ge1xuICAgICAgICBjb250ZW50czogW3tcbiAgICAgICAgICBwYXJ0czogW3sgdGV4dDogZnVsbFByb21wdCB9XVxuICAgICAgICB9XSxcbiAgICAgICAgZ2VuZXJhdGlvbkNvbmZpZzoge1xuICAgICAgICAgIHJlc3BvbnNlTWltZVR5cGU6IFwiYXBwbGljYXRpb24vanNvblwiLFxuICAgICAgICAgIHJlc3BvbnNlU2NoZW1hOiBHT0xERU5fTlVHR0VUX1NDSEVNQSxcbiAgICAgICAgICB0aGlua2luZ0NvbmZpZzoge1xuICAgICAgICAgICAgdGhpbmtpbmdCdWRnZXQ6IEdFTUlOSV9DT05GSUcuVEhJTktJTkdfQlVER0VUXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKGAke3RoaXMuQVBJX0JBU0VfVVJMfS8ke0dFTUlOSV9DT05GSUcuTU9ERUx9OmdlbmVyYXRlQ29udGVudD9rZXk9JHt0aGlzLmFwaUtleX1gLCB7XG4gICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgfSxcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkocmVxdWVzdEJvZHkpXG4gICAgICB9KTtcblxuICAgICAgaWYgKCFyZXNwb25zZS5vaykge1xuICAgICAgICBjb25zdCBlcnJvclRleHQgPSBhd2FpdCByZXNwb25zZS50ZXh0KCk7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgR2VtaW5pIEFQSSBlcnJvcjogJHtyZXNwb25zZS5zdGF0dXN9ICR7cmVzcG9uc2Uuc3RhdHVzVGV4dH0gLSAke2Vycm9yVGV4dH1gKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgcmVzcG9uc2VEYXRhID0gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xuICAgICAgXG4gICAgICAvLyBFeHRyYWN0IHRoZSB0ZXh0IGZyb20gdGhlIHJlc3BvbnNlXG4gICAgICBjb25zdCByZXNwb25zZVRleHQgPSByZXNwb25zZURhdGEuY2FuZGlkYXRlcz8uWzBdPy5jb250ZW50Py5wYXJ0cz8uWzBdPy50ZXh0O1xuICAgICAgaWYgKCFyZXNwb25zZVRleHQpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdObyByZXNwb25zZSB0ZXh0IHJlY2VpdmVkIGZyb20gR2VtaW5pIEFQSScpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCByZXN1bHQgPSBKU09OLnBhcnNlKHJlc3BvbnNlVGV4dCkgYXMgR2VtaW5pUmVzcG9uc2U7XG4gICAgICBcbiAgICAgIC8vIFZhbGlkYXRlIHRoZSByZXNwb25zZSBzdHJ1Y3R1cmVcbiAgICAgIGlmICghcmVzdWx0LmdvbGRlbl9udWdnZXRzIHx8ICFBcnJheS5pc0FycmF5KHJlc3VsdC5nb2xkZW5fbnVnZ2V0cykpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHJlc3BvbnNlIGZvcm1hdCBmcm9tIEdlbWluaSBBUEknKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgcmV0cnlSZXF1ZXN0PFQ+KFxuICAgIG9wZXJhdGlvbjogKCkgPT4gUHJvbWlzZTxUPixcbiAgICBjdXJyZW50QXR0ZW1wdDogbnVtYmVyID0gMVxuICApOiBQcm9taXNlPFQ+IHtcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIGF3YWl0IG9wZXJhdGlvbigpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zdCBlcnJvck1lc3NhZ2UgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcik7XG4gICAgICBcbiAgICAgIC8vIEhhbmRsZSBzcGVjaWZpYyBBUEkgZXJyb3JzIHRoYXQgc2hvdWxkbid0IGJlIHJldHJpZWRcbiAgICAgIGlmICh0aGlzLmlzTm9uUmV0cnlhYmxlRXJyb3IoZXJyb3JNZXNzYWdlKSkge1xuICAgICAgICB0aHJvdyB0aGlzLmVuaGFuY2VFcnJvcihlcnJvcik7XG4gICAgICB9XG5cbiAgICAgIC8vIElmIHdlJ3ZlIGV4aGF1c3RlZCByZXRyaWVzLCB0aHJvdyB0aGUgZW5oYW5jZWQgZXJyb3JcbiAgICAgIGlmIChjdXJyZW50QXR0ZW1wdCA+PSB0aGlzLk1BWF9SRVRSSUVTKSB7XG4gICAgICAgIHRocm93IHRoaXMuZW5oYW5jZUVycm9yKGVycm9yKTtcbiAgICAgIH1cblxuICAgICAgLy8gV2FpdCBiZWZvcmUgcmV0cnlpbmcgKGV4cG9uZW50aWFsIGJhY2tvZmYpXG4gICAgICBjb25zdCBkZWxheSA9IHRoaXMuUkVUUllfREVMQVkgKiBNYXRoLnBvdygyLCBjdXJyZW50QXR0ZW1wdCAtIDEpO1xuICAgICAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIGRlbGF5KSk7XG5cbiAgICAgIGNvbnNvbGUud2FybihgUmV0cnlpbmcgR2VtaW5pIEFQSSByZXF1ZXN0IChhdHRlbXB0ICR7Y3VycmVudEF0dGVtcHQgKyAxfS8ke3RoaXMuTUFYX1JFVFJJRVN9KWApO1xuICAgICAgcmV0dXJuIHRoaXMucmV0cnlSZXF1ZXN0KG9wZXJhdGlvbiwgY3VycmVudEF0dGVtcHQgKyAxKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGlzTm9uUmV0cnlhYmxlRXJyb3IoZXJyb3JNZXNzYWdlOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICBjb25zdCBub25SZXRyeWFibGVFcnJvcnMgPSBbXG4gICAgICAnQVBJIGtleScsXG4gICAgICAnYXV0aGVudGljYXRpb24nLFxuICAgICAgJ2F1dGhvcml6YXRpb24nLFxuICAgICAgJ2ludmFsaWQgcmVxdWVzdCcsXG4gICAgICAnYmFkIHJlcXVlc3QnLFxuICAgICAgJ21hbGZvcm1lZCdcbiAgICBdO1xuICAgIFxuICAgIHJldHVybiBub25SZXRyeWFibGVFcnJvcnMuc29tZShlcnJvciA9PiBcbiAgICAgIGVycm9yTWVzc2FnZS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKGVycm9yLnRvTG93ZXJDYXNlKCkpXG4gICAgKTtcbiAgfVxuXG4gIHByaXZhdGUgZW5oYW5jZUVycm9yKGVycm9yOiB1bmtub3duKTogRXJyb3Ige1xuICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICBjb25zdCBtZXNzYWdlID0gZXJyb3IubWVzc2FnZS50b0xvd2VyQ2FzZSgpO1xuICAgICAgXG4gICAgICBpZiAobWVzc2FnZS5pbmNsdWRlcygnYXBpIGtleScpIHx8IG1lc3NhZ2UuaW5jbHVkZXMoJ2F1dGhlbnRpY2F0aW9uJykpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBFcnJvcignSW52YWxpZCBBUEkga2V5LiBQbGVhc2UgY2hlY2sgeW91ciBzZXR0aW5ncy4nKTtcbiAgICAgIH0gZWxzZSBpZiAobWVzc2FnZS5pbmNsdWRlcygncmF0ZSBsaW1pdCcpIHx8IG1lc3NhZ2UuaW5jbHVkZXMoJ3F1b3RhJykpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBFcnJvcignUmF0ZSBsaW1pdCByZWFjaGVkLiBQbGVhc2UgdHJ5IGFnYWluIGxhdGVyLicpO1xuICAgICAgfSBlbHNlIGlmIChtZXNzYWdlLmluY2x1ZGVzKCd0aW1lb3V0JykpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBFcnJvcignUmVxdWVzdCB0aW1lZCBvdXQuIFBsZWFzZSB0cnkgYWdhaW4uJyk7XG4gICAgICB9IGVsc2UgaWYgKG1lc3NhZ2UuaW5jbHVkZXMoJ25ldHdvcmsnKSB8fCBtZXNzYWdlLmluY2x1ZGVzKCdjb25uZWN0aW9uJykpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBFcnJvcignTmV0d29yayBlcnJvci4gUGxlYXNlIGNoZWNrIHlvdXIgaW50ZXJuZXQgY29ubmVjdGlvbi4nKTtcbiAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgY29uc29sZS5lcnJvcignR2VtaW5pIEFQSSBlcnJvcjonLCBlcnJvcik7XG4gICAgcmV0dXJuIG5ldyBFcnJvcignQW5hbHlzaXMgZmFpbGVkLiBQbGVhc2UgdHJ5IGFnYWluLicpO1xuICB9XG5cbiAgYXN5bmMgdmFsaWRhdGVBcGlLZXkoYXBpS2V5OiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICB0cnkge1xuICAgICAgLy8gQmFzaWMgdmFsaWRhdGlvbiBmaXJzdFxuICAgICAgaWYgKCFhcGlLZXkgfHwgYXBpS2V5LnRyaW0oKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuXG4gICAgICAvLyBUZXN0IHRoZSBBUEkga2V5IHdpdGggYSBzaW1wbGUgcmVxdWVzdFxuICAgICAgY29uc3QgdGVzdFJlcXVlc3RCb2R5ID0ge1xuICAgICAgICBjb250ZW50czogW3tcbiAgICAgICAgICBwYXJ0czogW3sgdGV4dDogXCJUZXN0IG1lc3NhZ2VcIiB9XVxuICAgICAgICB9XSxcbiAgICAgICAgZ2VuZXJhdGlvbkNvbmZpZzoge1xuICAgICAgICAgIHJlc3BvbnNlTWltZVR5cGU6IFwiYXBwbGljYXRpb24vanNvblwiLFxuICAgICAgICAgIHJlc3BvbnNlU2NoZW1hOiB7XG4gICAgICAgICAgICB0eXBlOiBcIm9iamVjdFwiLFxuICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICB0ZXN0OiB7XG4gICAgICAgICAgICAgICAgdHlwZTogXCJzdHJpbmdcIlxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcmVxdWlyZWQ6IFtcInRlc3RcIl1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYCR7dGhpcy5BUElfQkFTRV9VUkx9LyR7R0VNSU5JX0NPTkZJRy5NT0RFTH06Z2VuZXJhdGVDb250ZW50P2tleT0ke2FwaUtleX1gLCB7XG4gICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgfSxcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkodGVzdFJlcXVlc3RCb2R5KVxuICAgICAgfSk7XG5cbiAgICAgIC8vIElmIHdlIGdldCBhIDIwMCByZXNwb25zZSwgdGhlIEFQSSBrZXkgaXMgdmFsaWRcbiAgICAgIHJldHVybiByZXNwb25zZS5vaztcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS53YXJuKCdBUEkga2V5IHZhbGlkYXRpb24gZmFpbGVkOicsIGVycm9yKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cbn0iLCJleHBvcnQgY29uc3QgR09MREVOX05VR0dFVF9TQ0hFTUEgPSB7XG4gIHR5cGU6IFwib2JqZWN0XCIsXG4gIHByb3BlcnRpZXM6IHtcbiAgICBnb2xkZW5fbnVnZ2V0czoge1xuICAgICAgdHlwZTogXCJhcnJheVwiLFxuICAgICAgZGVzY3JpcHRpb246IFwiQW4gYXJyYXkgb2YgZXh0cmFjdGVkIGdvbGRlbiBudWdnZXRzLlwiLFxuICAgICAgbWluSXRlbXM6IDAsXG4gICAgICBpdGVtczoge1xuICAgICAgICB0eXBlOiBcIm9iamVjdFwiLFxuICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgdHlwZToge1xuICAgICAgICAgICAgdHlwZTogXCJzdHJpbmdcIixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIlRoZSBjYXRlZ29yeSBvZiB0aGUgZXh0cmFjdGVkIGdvbGRlbiBudWdnZXQuXCIsXG4gICAgICAgICAgICBlbnVtOiBbXCJ0b29sXCIsIFwibWVkaWFcIiwgXCJleHBsYW5hdGlvblwiLCBcImFuYWxvZ3lcIiwgXCJtb2RlbFwiXVxuICAgICAgICAgIH0sXG4gICAgICAgICAgY29udGVudDoge1xuICAgICAgICAgICAgdHlwZTogXCJzdHJpbmdcIixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIlRoZSBvcmlnaW5hbCBjb21tZW50KHMpIHZlcmJhdGltLCB3aXRob3V0IGFueSBjaGFuZ2VzIHRvIHdvcmRpbmcgb3Igc3ltYm9scy5cIlxuICAgICAgICAgIH0sXG4gICAgICAgICAgc3ludGhlc2lzOiB7XG4gICAgICAgICAgICB0eXBlOiBcInN0cmluZ1wiLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiQSBjb25jaXNlIGV4cGxhbmF0aW9uIG9mIHdoeSB0aGlzIGlzIHJlbGV2YW50IHRvIHRoZSBwZXJzb25hLCBjb25uZWN0aW5nIGl0IHRvIHRoZWlyIGNvcmUgaW50ZXJlc3RzIG9yIGNvZ25pdGl2ZSBwcm9maWxlLlwiXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICByZXF1aXJlZDogW1widHlwZVwiLCBcImNvbnRlbnRcIiwgXCJzeW50aGVzaXNcIl0sXG4gICAgICAgIHByb3BlcnR5T3JkZXJpbmc6IFtcInR5cGVcIiwgXCJjb250ZW50XCIsIFwic3ludGhlc2lzXCJdXG4gICAgICB9XG4gICAgfVxuICB9LFxuICByZXF1aXJlZDogW1wiZ29sZGVuX251Z2dldHNcIl0sXG4gIHByb3BlcnR5T3JkZXJpbmc6IFtcImdvbGRlbl9udWdnZXRzXCJdXG59IGFzIGNvbnN0OyIsImltcG9ydCB7IE1FU1NBR0VfVFlQRVMsIEFuYWx5c2lzUmVxdWVzdCwgQW5hbHlzaXNSZXNwb25zZSB9IGZyb20gJy4uL3NoYXJlZC90eXBlcyc7XG5pbXBvcnQgeyBzdG9yYWdlIH0gZnJvbSAnLi4vc2hhcmVkL3N0b3JhZ2UnO1xuaW1wb3J0IHsgR2VtaW5pQ2xpZW50IH0gZnJvbSAnLi9nZW1pbmktY2xpZW50JztcblxuZXhwb3J0IGNsYXNzIE1lc3NhZ2VIYW5kbGVyIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBnZW1pbmlDbGllbnQ6IEdlbWluaUNsaWVudCkge31cblxuICBhc3luYyBoYW5kbGVNZXNzYWdlKFxuICAgIHJlcXVlc3Q6IGFueSxcbiAgICBzZW5kZXI6IGNocm9tZS5ydW50aW1lLk1lc3NhZ2VTZW5kZXIsXG4gICAgc2VuZFJlc3BvbnNlOiAocmVzcG9uc2U6IGFueSkgPT4gdm9pZFxuICApOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0cnkge1xuICAgICAgc3dpdGNoIChyZXF1ZXN0LnR5cGUpIHtcbiAgICAgICAgY2FzZSBNRVNTQUdFX1RZUEVTLkFOQUxZWkVfQ09OVEVOVDpcbiAgICAgICAgICBhd2FpdCB0aGlzLmhhbmRsZUFuYWx5emVDb250ZW50KHJlcXVlc3QsIHNlbmRSZXNwb25zZSk7XG4gICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgY2FzZSBNRVNTQUdFX1RZUEVTLkdFVF9QUk9NUFRTOlxuICAgICAgICAgIGF3YWl0IHRoaXMuaGFuZGxlR2V0UHJvbXB0cyhzZW5kUmVzcG9uc2UpO1xuICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGNhc2UgTUVTU0FHRV9UWVBFUy5TQVZFX1BST01QVDpcbiAgICAgICAgICBhd2FpdCB0aGlzLmhhbmRsZVNhdmVQcm9tcHQocmVxdWVzdCwgc2VuZFJlc3BvbnNlKTtcbiAgICAgICAgICBicmVhaztcblxuICAgICAgICBjYXNlIE1FU1NBR0VfVFlQRVMuREVMRVRFX1BST01QVDpcbiAgICAgICAgICBhd2FpdCB0aGlzLmhhbmRsZURlbGV0ZVByb21wdChyZXF1ZXN0LCBzZW5kUmVzcG9uc2UpO1xuICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGNhc2UgTUVTU0FHRV9UWVBFUy5TRVRfREVGQVVMVF9QUk9NUFQ6XG4gICAgICAgICAgYXdhaXQgdGhpcy5oYW5kbGVTZXREZWZhdWx0UHJvbXB0KHJlcXVlc3QsIHNlbmRSZXNwb25zZSk7XG4gICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgY2FzZSBNRVNTQUdFX1RZUEVTLkdFVF9DT05GSUc6XG4gICAgICAgICAgYXdhaXQgdGhpcy5oYW5kbGVHZXRDb25maWcoc2VuZFJlc3BvbnNlKTtcbiAgICAgICAgICBicmVhaztcblxuICAgICAgICBjYXNlIE1FU1NBR0VfVFlQRVMuU0FWRV9DT05GSUc6XG4gICAgICAgICAgYXdhaXQgdGhpcy5oYW5kbGVTYXZlQ29uZmlnKHJlcXVlc3QsIHNlbmRSZXNwb25zZSk7XG4gICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdVbmtub3duIG1lc3NhZ2UgdHlwZScgfSk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGhhbmRsaW5nIG1lc3NhZ2U6JywgZXJyb3IpO1xuICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAoZXJyb3IgYXMgRXJyb3IpLm1lc3NhZ2UgfSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBoYW5kbGVBbmFseXplQ29udGVudChcbiAgICByZXF1ZXN0OiBBbmFseXNpc1JlcXVlc3QsXG4gICAgc2VuZFJlc3BvbnNlOiAocmVzcG9uc2U6IEFuYWx5c2lzUmVzcG9uc2UpID0+IHZvaWRcbiAgKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHByb21wdHMgPSBhd2FpdCBzdG9yYWdlLmdldFByb21wdHMoKTtcbiAgICAgIGNvbnN0IHByb21wdCA9IHByb21wdHMuZmluZChwID0+IHAuaWQgPT09IHJlcXVlc3QucHJvbXB0SWQpO1xuICAgICAgXG4gICAgICBpZiAoIXByb21wdCkge1xuICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdQcm9tcHQgbm90IGZvdW5kJyB9KTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmdlbWluaUNsaWVudC5hbmFseXplQ29udGVudChyZXF1ZXN0LmNvbnRlbnQsIHByb21wdC5wcm9tcHQpO1xuICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogcmVzdWx0IH0pO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdBbmFseXNpcyBmYWlsZWQ6JywgZXJyb3IpO1xuICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAoZXJyb3IgYXMgRXJyb3IpLm1lc3NhZ2UgfSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBoYW5kbGVHZXRQcm9tcHRzKHNlbmRSZXNwb25zZTogKHJlc3BvbnNlOiBhbnkpID0+IHZvaWQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgcHJvbXB0cyA9IGF3YWl0IHN0b3JhZ2UuZ2V0UHJvbXB0cygpO1xuICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogcHJvbXB0cyB9KTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAoZXJyb3IgYXMgRXJyb3IpLm1lc3NhZ2UgfSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBoYW5kbGVTYXZlUHJvbXB0KHJlcXVlc3Q6IGFueSwgc2VuZFJlc3BvbnNlOiAocmVzcG9uc2U6IGFueSkgPT4gdm9pZCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCBzdG9yYWdlLnNhdmVQcm9tcHQocmVxdWVzdC5wcm9tcHQpO1xuICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogdHJ1ZSB9KTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAoZXJyb3IgYXMgRXJyb3IpLm1lc3NhZ2UgfSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBoYW5kbGVEZWxldGVQcm9tcHQocmVxdWVzdDogYW55LCBzZW5kUmVzcG9uc2U6IChyZXNwb25zZTogYW55KSA9PiB2b2lkKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHN0b3JhZ2UuZGVsZXRlUHJvbXB0KHJlcXVlc3QucHJvbXB0SWQpO1xuICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogdHJ1ZSB9KTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAoZXJyb3IgYXMgRXJyb3IpLm1lc3NhZ2UgfSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBoYW5kbGVTZXREZWZhdWx0UHJvbXB0KHJlcXVlc3Q6IGFueSwgc2VuZFJlc3BvbnNlOiAocmVzcG9uc2U6IGFueSkgPT4gdm9pZCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCBzdG9yYWdlLnNldERlZmF1bHRQcm9tcHQocmVxdWVzdC5wcm9tcHRJZCk7XG4gICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiB0cnVlIH0pO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IChlcnJvciBhcyBFcnJvcikubWVzc2FnZSB9KTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGhhbmRsZUdldENvbmZpZyhzZW5kUmVzcG9uc2U6IChyZXNwb25zZTogYW55KSA9PiB2b2lkKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGNvbmZpZyA9IGF3YWl0IHN0b3JhZ2UuZ2V0Q29uZmlnKCk7XG4gICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiB0cnVlLCBkYXRhOiBjb25maWcgfSk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogKGVycm9yIGFzIEVycm9yKS5tZXNzYWdlIH0pO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgaGFuZGxlU2F2ZUNvbmZpZyhyZXF1ZXN0OiBhbnksIHNlbmRSZXNwb25zZTogKHJlc3BvbnNlOiBhbnkpID0+IHZvaWQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgc3RvcmFnZS5zYXZlQ29uZmlnKHJlcXVlc3QuY29uZmlnKTtcbiAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUgfSk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogKGVycm9yIGFzIEVycm9yKS5tZXNzYWdlIH0pO1xuICAgIH1cbiAgfVxufSJdLCJuYW1lcyI6W10sInZlcnNpb24iOjMsImZpbGUiOiJpbmRleC5qcy5tYXAifQ==
 globalThis.define=__define;  })(globalThis.define);