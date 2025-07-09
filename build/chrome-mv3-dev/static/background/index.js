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
})({"f8T3y":[function(require,module,exports) {
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
    "serverPort": 44939
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
// Note: This will be loaded via script tag or bundled for browser
// import { GoogleGenAI } from '@google/genai';
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
parcelHelpers.export(exports, "GeminiClient", ()=>GeminiClient);
var _constants = require("../shared/constants");
var _schemas = require("../shared/schemas");
var _storage = require("../shared/storage");
class GeminiClient {
    async initializeClient() {
        if (this.genAI) return;
        const apiKey = await (0, _storage.storage).getApiKey();
        if (!apiKey) throw new Error("Gemini API key not configured. Please set it in the options page.");
        // this.genAI = new GoogleGenAI({ apiKey });
        // For now, we'll throw an error to indicate this needs to be implemented
        throw new Error("Gemini API integration not yet implemented");
    }
    async analyzeContent(content, userPrompt) {
        await this.initializeClient();
        if (!this.genAI) throw new Error("Gemini client not initialized");
        try {
            // Construct prompt with user query at the end for optimal performance
            const fullPrompt = `${content}\n\n${userPrompt}`;
            const response = await this.genAI.models.generateContent({
                model: (0, _constants.GEMINI_CONFIG).MODEL,
                contents: fullPrompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: (0, _schemas.GOLDEN_NUGGET_SCHEMA),
                    thinkingConfig: {
                        thinkingBudget: (0, _constants.GEMINI_CONFIG).THINKING_BUDGET
                    }
                }
            });
            const result = JSON.parse(response.text);
            // Validate the response structure
            if (!result.golden_nuggets || !Array.isArray(result.golden_nuggets)) throw new Error("Invalid response format from Gemini API");
            return result;
        } catch (error) {
            if (error instanceof Error) {
                // Handle specific API errors
                if (error.message.includes("API key")) throw new Error("Invalid API key. Please check your settings.");
                else if (error.message.includes("rate limit")) throw new Error("Rate limit reached. Please try again later.");
                else if (error.message.includes("timeout")) throw new Error("Request timed out. Please try again.");
            }
            console.error("Gemini API error:", error);
            throw new Error("Analysis failed. Please try again.");
        }
    }
    async validateApiKey(apiKey) {
        try {
            // For now, just validate that the API key is non-empty
            // In a real implementation, this would test the API key
            return apiKey.trim().length > 0;
        } catch (error) {
            return false;
        }
    }
    constructor(){
        this.genAI = null;
    }
}

},{"../shared/constants":"8r7N1","../shared/schemas":"a0IsU","../shared/storage":"ldVDm","@parcel/transformer-js/src/esmodule-helpers.js":"iIXqM"}],"a0IsU":[function(require,module,exports) {
// import { Type } from '@google/genai';
// For now, we'll define a simple schema structure
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

},{"../shared/types":"kj1EQ","../shared/storage":"ldVDm","@parcel/transformer-js/src/esmodule-helpers.js":"iIXqM"}]},["f8T3y","8oeFb"], "8oeFb", "parcelRequired8eb")

//# sourceMappingURL=data:application/json;charset=utf-8;base64,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RSxZQUFxQyxFQUFpQjtRQUNqRyxJQUFJO1lBQ0YsTUFBTSxDQUFBLEdBQUEsZ0JBQU0sRUFBRSxXQUFXLFFBQVE7WUFDakMsYUFBYTtnQkFBRSxTQUFTO1lBQUs7UUFDL0IsRUFBRSxPQUFPLE9BQU87WUFDZCxhQUFhO2dCQUFFLFNBQVM7Z0JBQU8sT0FBTyxBQUFDLE1BQWdCO1lBQVE7UUFDakU7SUFDRjtBQUNGIiwic291cmNlcyI6WyJub2RlX21vZHVsZXMvQHBsYXNtb2hxL3BhcmNlbC1ydW50aW1lL2Rpc3QvcnVudGltZS0wNmNhZjZhYTA3NmZiYmY4LmpzIiwiLnBsYXNtby9zdGF0aWMvYmFja2dyb3VuZC9pbmRleC50cyIsInNyYy9iYWNrZ3JvdW5kL2luZGV4LnRzIiwic3JjL3NoYXJlZC9zdG9yYWdlLnRzIiwic3JjL3NoYXJlZC9jb25zdGFudHMudHMiLCJub2RlX21vZHVsZXMvQHBhcmNlbC90cmFuc2Zvcm1lci1qcy9zcmMvZXNtb2R1bGUtaGVscGVycy5qcyIsInNyYy9zaGFyZWQvdHlwZXMudHMiLCJzcmMvYmFja2dyb3VuZC9nZW1pbmktY2xpZW50LnRzIiwic3JjL3NoYXJlZC9zY2hlbWFzLnRzIiwic3JjL2JhY2tncm91bmQvbWVzc2FnZS1oYW5kbGVyLnRzIl0sInNvdXJjZXNDb250ZW50IjpbInZhciB1PWdsb2JhbFRoaXMucHJvY2Vzcz8uYXJndnx8W107dmFyIGg9KCk9Pmdsb2JhbFRoaXMucHJvY2Vzcz8uZW52fHx7fTt2YXIgQj1uZXcgU2V0KHUpLF89ZT0+Qi5oYXMoZSksRz11LmZpbHRlcihlPT5lLnN0YXJ0c1dpdGgoXCItLVwiKSYmZS5pbmNsdWRlcyhcIj1cIikpLm1hcChlPT5lLnNwbGl0KFwiPVwiKSkucmVkdWNlKChlLFt0LG9dKT0+KGVbdF09byxlKSx7fSk7dmFyIFU9XyhcIi0tZHJ5LXJ1blwiKSxnPSgpPT5fKFwiLS12ZXJib3NlXCIpfHxoKCkuVkVSQk9TRT09PVwidHJ1ZVwiLE49ZygpO3ZhciBtPShlPVwiXCIsLi4udCk9PmNvbnNvbGUubG9nKGUucGFkRW5kKDkpLFwifFwiLC4uLnQpO3ZhciB5PSguLi5lKT0+Y29uc29sZS5lcnJvcihcIlxcdXsxRjUzNH0gRVJST1JcIi5wYWRFbmQoOSksXCJ8XCIsLi4uZSksdj0oLi4uZSk9Pm0oXCJcXHV7MUY1MzV9IElORk9cIiwuLi5lKSxmPSguLi5lKT0+bShcIlxcdXsxRjdFMH0gV0FSTlwiLC4uLmUpLE09MCxpPSguLi5lKT0+ZygpJiZtKGBcXHV7MUY3RTF9ICR7TSsrfWAsLi4uZSk7dmFyIGI9KCk9PntsZXQgZT1nbG9iYWxUaGlzLmJyb3dzZXI/LnJ1bnRpbWV8fGdsb2JhbFRoaXMuY2hyb21lPy5ydW50aW1lLHQ9KCk9PnNldEludGVydmFsKGUuZ2V0UGxhdGZvcm1JbmZvLDI0ZTMpO2Uub25TdGFydHVwLmFkZExpc3RlbmVyKHQpLHQoKX07dmFyIG49e1wiaXNDb250ZW50U2NyaXB0XCI6ZmFsc2UsXCJpc0JhY2tncm91bmRcIjp0cnVlLFwiaXNSZWFjdFwiOmZhbHNlLFwicnVudGltZXNcIjpbXCJiYWNrZ3JvdW5kLXNlcnZpY2UtcnVudGltZVwiXSxcImhvc3RcIjpcImxvY2FsaG9zdFwiLFwicG9ydFwiOjE4MTUsXCJlbnRyeUZpbGVQYXRoXCI6XCIvaG9tZS9hbGV4L3NyYy9nb2xkZW4tbnVnZ2V0LWZpbmRlci8ucGxhc21vL3N0YXRpYy9iYWNrZ3JvdW5kL2luZGV4LnRzXCIsXCJidW5kbGVJZFwiOlwiYzMzODkwOGU3MDRjOTFmMVwiLFwiZW52SGFzaFwiOlwiZDk5YTVmZmE1N2FjZDYzOFwiLFwidmVyYm9zZVwiOlwiZmFsc2VcIixcInNlY3VyZVwiOmZhbHNlLFwic2VydmVyUG9ydFwiOjQ0OTM5fTttb2R1bGUuYnVuZGxlLkhNUl9CVU5ETEVfSUQ9bi5idW5kbGVJZDtnbG9iYWxUaGlzLnByb2Nlc3M9e2FyZ3Y6W10sZW52OntWRVJCT1NFOm4udmVyYm9zZX19O3ZhciBEPW1vZHVsZS5idW5kbGUuTW9kdWxlO2Z1bmN0aW9uIEgoZSl7RC5jYWxsKHRoaXMsZSksdGhpcy5ob3Q9e2RhdGE6bW9kdWxlLmJ1bmRsZS5ob3REYXRhW2VdLF9hY2NlcHRDYWxsYmFja3M6W10sX2Rpc3Bvc2VDYWxsYmFja3M6W10sYWNjZXB0OmZ1bmN0aW9uKHQpe3RoaXMuX2FjY2VwdENhbGxiYWNrcy5wdXNoKHR8fGZ1bmN0aW9uKCl7fSl9LGRpc3Bvc2U6ZnVuY3Rpb24odCl7dGhpcy5fZGlzcG9zZUNhbGxiYWNrcy5wdXNoKHQpfX0sbW9kdWxlLmJ1bmRsZS5ob3REYXRhW2VdPXZvaWQgMH1tb2R1bGUuYnVuZGxlLk1vZHVsZT1IO21vZHVsZS5idW5kbGUuaG90RGF0YT17fTt2YXIgYz1nbG9iYWxUaGlzLmJyb3dzZXJ8fGdsb2JhbFRoaXMuY2hyb21lfHxudWxsO2Z1bmN0aW9uIFIoKXtyZXR1cm4hbi5ob3N0fHxuLmhvc3Q9PT1cIjAuMC4wLjBcIj9sb2NhdGlvbi5wcm90b2NvbC5pbmRleE9mKFwiaHR0cFwiKT09PTA/bG9jYXRpb24uaG9zdG5hbWU6XCJsb2NhbGhvc3RcIjpuLmhvc3R9ZnVuY3Rpb24geCgpe3JldHVybiFuLmhvc3R8fG4uaG9zdD09PVwiMC4wLjAuMFwiP1wibG9jYWxob3N0XCI6bi5ob3N0fWZ1bmN0aW9uIGQoKXtyZXR1cm4gbi5wb3J0fHxsb2NhdGlvbi5wb3J0fXZhciBQPVwiX19wbGFzbW9fcnVudGltZV9wYWdlX1wiLFM9XCJfX3BsYXNtb19ydW50aW1lX3NjcmlwdF9cIjt2YXIgTz1gJHtuLnNlY3VyZT9cImh0dHBzXCI6XCJodHRwXCJ9Oi8vJHtSKCl9OiR7ZCgpfS9gO2FzeW5jIGZ1bmN0aW9uIGsoZT0xNDcwKXtmb3IoOzspdHJ5e2F3YWl0IGZldGNoKE8pO2JyZWFrfWNhdGNoe2F3YWl0IG5ldyBQcm9taXNlKG89PnNldFRpbWVvdXQobyxlKSl9fWlmKGMucnVudGltZS5nZXRNYW5pZmVzdCgpLm1hbmlmZXN0X3ZlcnNpb249PT0zKXtsZXQgZT1jLnJ1bnRpbWUuZ2V0VVJMKFwiL19fcGxhc21vX2htcl9wcm94eV9fP3VybD1cIik7Z2xvYmFsVGhpcy5hZGRFdmVudExpc3RlbmVyKFwiZmV0Y2hcIixmdW5jdGlvbih0KXtsZXQgbz10LnJlcXVlc3QudXJsO2lmKG8uc3RhcnRzV2l0aChlKSl7bGV0IHM9bmV3IFVSTChkZWNvZGVVUklDb21wb25lbnQoby5zbGljZShlLmxlbmd0aCkpKTtzLmhvc3RuYW1lPT09bi5ob3N0JiZzLnBvcnQ9PT1gJHtuLnBvcnR9YD8ocy5zZWFyY2hQYXJhbXMuc2V0KFwidFwiLERhdGUubm93KCkudG9TdHJpbmcoKSksdC5yZXNwb25kV2l0aChmZXRjaChzKS50aGVuKHI9Pm5ldyBSZXNwb25zZShyLmJvZHkse2hlYWRlcnM6e1wiQ29udGVudC1UeXBlXCI6ci5oZWFkZXJzLmdldChcIkNvbnRlbnQtVHlwZVwiKT8/XCJ0ZXh0L2phdmFzY3JpcHRcIn19KSkpKTp0LnJlc3BvbmRXaXRoKG5ldyBSZXNwb25zZShcIlBsYXNtbyBITVJcIix7c3RhdHVzOjIwMCxzdGF0dXNUZXh0OlwiVGVzdGluZ1wifSkpfX0pfWZ1bmN0aW9uIEUoZSx0KXtsZXR7bW9kdWxlczpvfT1lO3JldHVybiBvPyEhb1t0XTohMX1mdW5jdGlvbiBDKGU9ZCgpKXtsZXQgdD14KCk7cmV0dXJuYCR7bi5zZWN1cmV8fGxvY2F0aW9uLnByb3RvY29sPT09XCJodHRwczpcIiYmIS9sb2NhbGhvc3R8MTI3LjAuMC4xfDAuMC4wLjAvLnRlc3QodCk/XCJ3c3NcIjpcIndzXCJ9Oi8vJHt0fToke2V9L2B9ZnVuY3Rpb24gTChlKXt0eXBlb2YgZS5tZXNzYWdlPT1cInN0cmluZ1wiJiZ5KFwiW3BsYXNtby9wYXJjZWwtcnVudGltZV06IFwiK2UubWVzc2FnZSl9ZnVuY3Rpb24gVChlKXtpZih0eXBlb2YgZ2xvYmFsVGhpcy5XZWJTb2NrZXQ+XCJ1XCIpcmV0dXJuO2xldCB0PW5ldyBXZWJTb2NrZXQoQyhOdW1iZXIoZCgpKSsxKSk7cmV0dXJuIHQuYWRkRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIixhc3luYyBmdW5jdGlvbihvKXtsZXQgcz1KU09OLnBhcnNlKG8uZGF0YSk7YXdhaXQgZShzKX0pLHQuYWRkRXZlbnRMaXN0ZW5lcihcImVycm9yXCIsTCksdH1mdW5jdGlvbiBBKGUpe2lmKHR5cGVvZiBnbG9iYWxUaGlzLldlYlNvY2tldD5cInVcIilyZXR1cm47bGV0IHQ9bmV3IFdlYlNvY2tldChDKCkpO3JldHVybiB0LmFkZEV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsYXN5bmMgZnVuY3Rpb24obyl7bGV0IHM9SlNPTi5wYXJzZShvLmRhdGEpO2lmKHMudHlwZT09PVwidXBkYXRlXCImJmF3YWl0IGUocy5hc3NldHMpLHMudHlwZT09PVwiZXJyb3JcIilmb3IobGV0IHIgb2Ygcy5kaWFnbm9zdGljcy5hbnNpKXtsZXQgbD1yLmNvZGVmcmFtZXx8ci5zdGFjaztmKFwiW3BsYXNtby9wYXJjZWwtcnVudGltZV06IFwiK3IubWVzc2FnZStgXG5gK2wrYFxuXG5gK3IuaGludHMuam9pbihgXG5gKSl9fSksdC5hZGRFdmVudExpc3RlbmVyKFwiZXJyb3JcIixMKSx0LmFkZEV2ZW50TGlzdGVuZXIoXCJvcGVuXCIsKCk9Pnt2KGBbcGxhc21vL3BhcmNlbC1ydW50aW1lXTogQ29ubmVjdGVkIHRvIEhNUiBzZXJ2ZXIgZm9yICR7bi5lbnRyeUZpbGVQYXRofWApfSksdC5hZGRFdmVudExpc3RlbmVyKFwiY2xvc2VcIiwoKT0+e2YoYFtwbGFzbW8vcGFyY2VsLXJ1bnRpbWVdOiBDb25uZWN0aW9uIHRvIHRoZSBITVIgc2VydmVyIGlzIGNsb3NlZCBmb3IgJHtuLmVudHJ5RmlsZVBhdGh9YCl9KSx0fXZhciB3PW1vZHVsZS5idW5kbGUucGFyZW50LGE9e2J1aWxkUmVhZHk6ITEsYmdDaGFuZ2VkOiExLGNzQ2hhbmdlZDohMSxwYWdlQ2hhbmdlZDohMSxzY3JpcHRQb3J0czpuZXcgU2V0LHBhZ2VQb3J0czpuZXcgU2V0fTthc3luYyBmdW5jdGlvbiBwKGU9ITEpe2lmKGV8fGEuYnVpbGRSZWFkeSYmYS5wYWdlQ2hhbmdlZCl7aShcIkJHU1cgUnVudGltZSAtIHJlbG9hZGluZyBQYWdlXCIpO2ZvcihsZXQgdCBvZiBhLnBhZ2VQb3J0cyl0LnBvc3RNZXNzYWdlKG51bGwpfWlmKGV8fGEuYnVpbGRSZWFkeSYmKGEuYmdDaGFuZ2VkfHxhLmNzQ2hhbmdlZCkpe2koXCJCR1NXIFJ1bnRpbWUgLSByZWxvYWRpbmcgQ1NcIik7bGV0IHQ9YXdhaXQgYz8udGFicy5xdWVyeSh7YWN0aXZlOiEwfSk7Zm9yKGxldCBvIG9mIGEuc2NyaXB0UG9ydHMpe2xldCBzPXQuc29tZShyPT5yLmlkPT09by5zZW5kZXIudGFiPy5pZCk7by5wb3N0TWVzc2FnZSh7X19wbGFzbW9fY3NfYWN0aXZlX3RhYl9fOnN9KX1jLnJ1bnRpbWUucmVsb2FkKCl9fWlmKCF3fHwhdy5pc1BhcmNlbFJlcXVpcmUpe2IoKTtsZXQgZT1BKGFzeW5jIHQ9PntpKFwiQkdTVyBSdW50aW1lIC0gT24gSE1SIFVwZGF0ZVwiKSxhLmJnQ2hhbmdlZHx8PXQuZmlsdGVyKHM9PnMuZW52SGFzaD09PW4uZW52SGFzaCkuc29tZShzPT5FKG1vZHVsZS5idW5kbGUscy5pZCkpO2xldCBvPXQuZmluZChzPT5zLnR5cGU9PT1cImpzb25cIik7aWYobyl7bGV0IHM9bmV3IFNldCh0Lm1hcChsPT5sLmlkKSkscj1PYmplY3QudmFsdWVzKG8uZGVwc0J5QnVuZGxlKS5tYXAobD0+T2JqZWN0LnZhbHVlcyhsKSkuZmxhdCgpO2EuYmdDaGFuZ2VkfHw9ci5ldmVyeShsPT5zLmhhcyhsKSl9cCgpfSk7ZS5hZGRFdmVudExpc3RlbmVyKFwib3BlblwiLCgpPT57bGV0IHQ9c2V0SW50ZXJ2YWwoKCk9PmUuc2VuZChcInBpbmdcIiksMjRlMyk7ZS5hZGRFdmVudExpc3RlbmVyKFwiY2xvc2VcIiwoKT0+Y2xlYXJJbnRlcnZhbCh0KSl9KSxlLmFkZEV2ZW50TGlzdGVuZXIoXCJjbG9zZVwiLGFzeW5jKCk9Pnthd2FpdCBrKCkscCghMCl9KX1UKGFzeW5jIGU9Pntzd2l0Y2goaShcIkJHU1cgUnVudGltZSAtIE9uIEJ1aWxkIFJlcGFja2FnZWRcIiksZS50eXBlKXtjYXNlXCJidWlsZF9yZWFkeVwiOnthLmJ1aWxkUmVhZHl8fD0hMCxwKCk7YnJlYWt9Y2FzZVwiY3NfY2hhbmdlZFwiOnthLmNzQ2hhbmdlZHx8PSEwLHAoKTticmVha319fSk7Yy5ydW50aW1lLm9uQ29ubmVjdC5hZGRMaXN0ZW5lcihmdW5jdGlvbihlKXtsZXQgdD1lLm5hbWUuc3RhcnRzV2l0aChQKSxvPWUubmFtZS5zdGFydHNXaXRoKFMpO2lmKHR8fG8pe2xldCBzPXQ/YS5wYWdlUG9ydHM6YS5zY3JpcHRQb3J0cztzLmFkZChlKSxlLm9uRGlzY29ubmVjdC5hZGRMaXN0ZW5lcigoKT0+e3MuZGVsZXRlKGUpfSksZS5vbk1lc3NhZ2UuYWRkTGlzdGVuZXIoZnVuY3Rpb24ocil7aShcIkJHU1cgUnVudGltZSAtIE9uIHNvdXJjZSBjaGFuZ2VkXCIsciksci5fX3BsYXNtb19jc19jaGFuZ2VkX18mJihhLmNzQ2hhbmdlZHx8PSEwKSxyLl9fcGxhc21vX3BhZ2VfY2hhbmdlZF9fJiYoYS5wYWdlQ2hhbmdlZHx8PSEwKSxwKCl9KX19KTtjLnJ1bnRpbWUub25NZXNzYWdlLmFkZExpc3RlbmVyKGZ1bmN0aW9uKHQpe3JldHVybiB0Ll9fcGxhc21vX2Z1bGxfcmVsb2FkX18mJihpKFwiQkdTVyBSdW50aW1lIC0gT24gdG9wLWxldmVsIGNvZGUgY2hhbmdlZFwiKSxwKCkpLCEwfSk7XG4iLCJpbXBvcnQgXCIuLi8uLi8uLi9zcmMvYmFja2dyb3VuZC9pbmRleFwiIiwiaW1wb3J0IHsgc3RvcmFnZSB9IGZyb20gJy4uL3NoYXJlZC9zdG9yYWdlJztcbmltcG9ydCB7IE1FU1NBR0VfVFlQRVMgfSBmcm9tICcuLi9zaGFyZWQvdHlwZXMnO1xuaW1wb3J0IHsgR2VtaW5pQ2xpZW50IH0gZnJvbSAnLi9nZW1pbmktY2xpZW50JztcbmltcG9ydCB7IE1lc3NhZ2VIYW5kbGVyIH0gZnJvbSAnLi9tZXNzYWdlLWhhbmRsZXInO1xuXG5jbGFzcyBCYWNrZ3JvdW5kU2VydmljZSB7XG4gIHByaXZhdGUgZ2VtaW5pQ2xpZW50OiBHZW1pbmlDbGllbnQ7XG4gIHByaXZhdGUgbWVzc2FnZUhhbmRsZXI6IE1lc3NhZ2VIYW5kbGVyO1xuXG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMuZ2VtaW5pQ2xpZW50ID0gbmV3IEdlbWluaUNsaWVudCgpO1xuICAgIHRoaXMubWVzc2FnZUhhbmRsZXIgPSBuZXcgTWVzc2FnZUhhbmRsZXIodGhpcy5nZW1pbmlDbGllbnQpO1xuICAgIHRoaXMuaW5pdGlhbGl6ZSgpO1xuICB9XG5cbiAgcHJpdmF0ZSBpbml0aWFsaXplKCk6IHZvaWQge1xuICAgIC8vIFNldCB1cCBtZXNzYWdlIGxpc3RlbmVyc1xuICAgIGNocm9tZS5ydW50aW1lLm9uTWVzc2FnZS5hZGRMaXN0ZW5lcigocmVxdWVzdCwgc2VuZGVyLCBzZW5kUmVzcG9uc2UpID0+IHtcbiAgICAgIHRoaXMubWVzc2FnZUhhbmRsZXIuaGFuZGxlTWVzc2FnZShyZXF1ZXN0LCBzZW5kZXIsIHNlbmRSZXNwb25zZSk7XG4gICAgICByZXR1cm4gdHJ1ZTsgLy8gS2VlcCB0aGUgbWVzc2FnZSBjaGFubmVsIG9wZW4gZm9yIGFzeW5jIHJlc3BvbnNlc1xuICAgIH0pO1xuXG4gICAgLy8gU2V0IHVwIGNvbnRleHQgbWVudVxuICAgIGNocm9tZS5ydW50aW1lLm9uSW5zdGFsbGVkLmFkZExpc3RlbmVyKCgpID0+IHtcbiAgICAgIHRoaXMuc2V0dXBDb250ZXh0TWVudSgpO1xuICAgIH0pO1xuXG4gICAgLy8gVXBkYXRlIGNvbnRleHQgbWVudSB3aGVuIHByb21wdHMgY2hhbmdlXG4gICAgY2hyb21lLnN0b3JhZ2Uub25DaGFuZ2VkLmFkZExpc3RlbmVyKChjaGFuZ2VzLCBuYW1lc3BhY2UpID0+IHtcbiAgICAgIGlmIChuYW1lc3BhY2UgPT09ICdzeW5jJyAmJiBjaGFuZ2VzLnVzZXJQcm9tcHRzKSB7XG4gICAgICAgIHRoaXMuc2V0dXBDb250ZXh0TWVudSgpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gSGFuZGxlIGNvbnRleHQgbWVudSBjbGlja3NcbiAgICBjaHJvbWUuY29udGV4dE1lbnVzLm9uQ2xpY2tlZC5hZGRMaXN0ZW5lcigoaW5mbywgdGFiKSA9PiB7XG4gICAgICBpZiAoaW5mby5tZW51SXRlbUlkICYmIHR5cGVvZiBpbmZvLm1lbnVJdGVtSWQgPT09ICdzdHJpbmcnICYmIGluZm8ubWVudUl0ZW1JZC5zdGFydHNXaXRoKCdwcm9tcHQtJykpIHtcbiAgICAgICAgY29uc3QgcHJvbXB0SWQgPSBpbmZvLm1lbnVJdGVtSWQucmVwbGFjZSgncHJvbXB0LScsICcnKTtcbiAgICAgICAgdGhpcy5oYW5kbGVDb250ZXh0TWVudUNsaWNrKHByb21wdElkLCB0YWIpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBzZXR1cENvbnRleHRNZW51KCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRyeSB7XG4gICAgICAvLyBDbGVhciBleGlzdGluZyBtZW51IGl0ZW1zXG4gICAgICBhd2FpdCBjaHJvbWUuY29udGV4dE1lbnVzLnJlbW92ZUFsbCgpO1xuXG4gICAgICAvLyBHZXQgY3VycmVudCBwcm9tcHRzXG4gICAgICBjb25zdCBwcm9tcHRzID0gYXdhaXQgc3RvcmFnZS5nZXRQcm9tcHRzKCk7XG5cbiAgICAgIC8vIENyZWF0ZSBwYXJlbnQgbWVudSBpdGVtXG4gICAgICBjaHJvbWUuY29udGV4dE1lbnVzLmNyZWF0ZSh7XG4gICAgICAgIGlkOiAnZ29sZGVuLW51Z2dldC1maW5kZXInLFxuICAgICAgICB0aXRsZTogJ0ZpbmQgR29sZGVuIE51Z2dldHMnLFxuICAgICAgICBjb250ZXh0czogWydwYWdlJywgJ3NlbGVjdGlvbiddXG4gICAgICB9KTtcblxuICAgICAgLy8gQ3JlYXRlIHN1Yi1tZW51IGl0ZW1zIGZvciBlYWNoIHByb21wdFxuICAgICAgcHJvbXB0cy5mb3JFYWNoKHByb21wdCA9PiB7XG4gICAgICAgIGNocm9tZS5jb250ZXh0TWVudXMuY3JlYXRlKHtcbiAgICAgICAgICBpZDogYHByb21wdC0ke3Byb21wdC5pZH1gLFxuICAgICAgICAgIHBhcmVudElkOiAnZ29sZGVuLW51Z2dldC1maW5kZXInLFxuICAgICAgICAgIHRpdGxlOiBwcm9tcHQuaXNEZWZhdWx0ID8gYOKYhSAke3Byb21wdC5uYW1lfWAgOiBwcm9tcHQubmFtZSxcbiAgICAgICAgICBjb250ZXh0czogWydwYWdlJywgJ3NlbGVjdGlvbiddXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBzZXR1cCBjb250ZXh0IG1lbnU6JywgZXJyb3IpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgaGFuZGxlQ29udGV4dE1lbnVDbGljayhwcm9tcHRJZDogc3RyaW5nLCB0YWI/OiBjaHJvbWUudGFicy5UYWIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAoIXRhYj8uaWQpIHJldHVybjtcblxuICAgIHRyeSB7XG4gICAgICAvLyBTZW5kIG1lc3NhZ2UgdG8gY29udGVudCBzY3JpcHQgdG8gc3RhcnQgYW5hbHlzaXNcbiAgICAgIGF3YWl0IGNocm9tZS50YWJzLnNlbmRNZXNzYWdlKHRhYi5pZCwge1xuICAgICAgICB0eXBlOiBNRVNTQUdFX1RZUEVTLkFOQUxZWkVfQ09OVEVOVCxcbiAgICAgICAgcHJvbXB0SWQ6IHByb21wdElkXG4gICAgICB9KTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIHNlbmQgbWVzc2FnZSB0byBjb250ZW50IHNjcmlwdDonLCBlcnJvcik7XG4gICAgfVxuICB9XG59XG5cbi8vIEluaXRpYWxpemUgdGhlIGJhY2tncm91bmQgc2VydmljZVxubmV3IEJhY2tncm91bmRTZXJ2aWNlKCk7IiwiaW1wb3J0IHsgU1RPUkFHRV9LRVlTLCBERUZBVUxUX1BST01QVFMgfSBmcm9tICcuL2NvbnN0YW50cyc7XG5pbXBvcnQgeyBFeHRlbnNpb25Db25maWcsIFNhdmVkUHJvbXB0IH0gZnJvbSAnLi90eXBlcyc7XG5cbmV4cG9ydCBjbGFzcyBTdG9yYWdlTWFuYWdlciB7XG4gIHByaXZhdGUgc3RhdGljIGluc3RhbmNlOiBTdG9yYWdlTWFuYWdlcjtcbiAgXG4gIHN0YXRpYyBnZXRJbnN0YW5jZSgpOiBTdG9yYWdlTWFuYWdlciB7XG4gICAgaWYgKCFTdG9yYWdlTWFuYWdlci5pbnN0YW5jZSkge1xuICAgICAgU3RvcmFnZU1hbmFnZXIuaW5zdGFuY2UgPSBuZXcgU3RvcmFnZU1hbmFnZXIoKTtcbiAgICB9XG4gICAgcmV0dXJuIFN0b3JhZ2VNYW5hZ2VyLmluc3RhbmNlO1xuICB9XG5cbiAgYXN5bmMgZ2V0QXBpS2V5KCk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY2hyb21lLnN0b3JhZ2Uuc3luYy5nZXQoU1RPUkFHRV9LRVlTLkFQSV9LRVkpO1xuICAgIHJldHVybiByZXN1bHRbU1RPUkFHRV9LRVlTLkFQSV9LRVldIHx8ICcnO1xuICB9XG5cbiAgYXN5bmMgc2F2ZUFwaUtleShhcGlLZXk6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IGNocm9tZS5zdG9yYWdlLnN5bmMuc2V0KHsgW1NUT1JBR0VfS0VZUy5BUElfS0VZXTogYXBpS2V5IH0pO1xuICB9XG5cbiAgYXN5bmMgZ2V0UHJvbXB0cygpOiBQcm9taXNlPFNhdmVkUHJvbXB0W10+IHtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBjaHJvbWUuc3RvcmFnZS5zeW5jLmdldChTVE9SQUdFX0tFWVMuUFJPTVBUUyk7XG4gICAgY29uc3QgcHJvbXB0cyA9IHJlc3VsdFtTVE9SQUdFX0tFWVMuUFJPTVBUU10gfHwgW107XG4gICAgXG4gICAgLy8gSWYgbm8gcHJvbXB0cyBleGlzdCwgcmV0dXJuIGRlZmF1bHQgcHJvbXB0c1xuICAgIGlmIChwcm9tcHRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgY29uc3QgZGVmYXVsdFByb21wdHMgPSBERUZBVUxUX1BST01QVFMubWFwKHAgPT4gKHsgLi4ucCB9KSk7XG4gICAgICBhd2FpdCB0aGlzLnNhdmVQcm9tcHRzKGRlZmF1bHRQcm9tcHRzKTtcbiAgICAgIHJldHVybiBkZWZhdWx0UHJvbXB0cztcbiAgICB9XG4gICAgXG4gICAgcmV0dXJuIHByb21wdHM7XG4gIH1cblxuICBhc3luYyBzYXZlUHJvbXB0cyhwcm9tcHRzOiBTYXZlZFByb21wdFtdKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgLy8gQ2hlY2sgc2l6ZSBsaW1pdCAoY2hyb21lLnN0b3JhZ2Uuc3luYyBoYXMgOEtCIHBlciBpdGVtIGxpbWl0KVxuICAgIGNvbnN0IGRhdGEgPSB7IFtTVE9SQUdFX0tFWVMuUFJPTVBUU106IHByb21wdHMgfTtcbiAgICBjb25zdCBzaXplID0gbmV3IEJsb2IoW0pTT04uc3RyaW5naWZ5KGRhdGEpXSkuc2l6ZTtcbiAgICBcbiAgICBpZiAoc2l6ZSA+IDgxOTIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignUHJvbXB0IGRhdGEgdG9vIGxhcmdlLiBQbGVhc2UgcmVkdWNlIHByb21wdCBjb3VudCBvciBsZW5ndGguJyk7XG4gICAgfVxuICAgIFxuICAgIGF3YWl0IGNocm9tZS5zdG9yYWdlLnN5bmMuc2V0KGRhdGEpO1xuICB9XG5cbiAgYXN5bmMgc2F2ZVByb21wdChwcm9tcHQ6IFNhdmVkUHJvbXB0KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgcHJvbXB0cyA9IGF3YWl0IHRoaXMuZ2V0UHJvbXB0cygpO1xuICAgIGNvbnN0IGV4aXN0aW5nSW5kZXggPSBwcm9tcHRzLmZpbmRJbmRleChwID0+IHAuaWQgPT09IHByb21wdC5pZCk7XG4gICAgXG4gICAgaWYgKGV4aXN0aW5nSW5kZXggPj0gMCkge1xuICAgICAgcHJvbXB0c1tleGlzdGluZ0luZGV4XSA9IHByb21wdDtcbiAgICB9IGVsc2Uge1xuICAgICAgcHJvbXB0cy5wdXNoKHByb21wdCk7XG4gICAgfVxuICAgIFxuICAgIGF3YWl0IHRoaXMuc2F2ZVByb21wdHMocHJvbXB0cyk7XG4gIH1cblxuICBhc3luYyBkZWxldGVQcm9tcHQocHJvbXB0SWQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHByb21wdHMgPSBhd2FpdCB0aGlzLmdldFByb21wdHMoKTtcbiAgICBjb25zdCBmaWx0ZXJlZFByb21wdHMgPSBwcm9tcHRzLmZpbHRlcihwID0+IHAuaWQgIT09IHByb21wdElkKTtcbiAgICBhd2FpdCB0aGlzLnNhdmVQcm9tcHRzKGZpbHRlcmVkUHJvbXB0cyk7XG4gIH1cblxuICBhc3luYyBzZXREZWZhdWx0UHJvbXB0KHByb21wdElkOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBwcm9tcHRzID0gYXdhaXQgdGhpcy5nZXRQcm9tcHRzKCk7XG4gICAgY29uc3QgdXBkYXRlZFByb21wdHMgPSBwcm9tcHRzLm1hcChwID0+ICh7XG4gICAgICAuLi5wLFxuICAgICAgaXNEZWZhdWx0OiBwLmlkID09PSBwcm9tcHRJZFxuICAgIH0pKTtcbiAgICBhd2FpdCB0aGlzLnNhdmVQcm9tcHRzKHVwZGF0ZWRQcm9tcHRzKTtcbiAgfVxuXG4gIGFzeW5jIGdldERlZmF1bHRQcm9tcHQoKTogUHJvbWlzZTxTYXZlZFByb21wdCB8IG51bGw+IHtcbiAgICBjb25zdCBwcm9tcHRzID0gYXdhaXQgdGhpcy5nZXRQcm9tcHRzKCk7XG4gICAgcmV0dXJuIHByb21wdHMuZmluZChwID0+IHAuaXNEZWZhdWx0KSB8fCBwcm9tcHRzWzBdIHx8IG51bGw7XG4gIH1cblxuICBhc3luYyBnZXRDb25maWcoKTogUHJvbWlzZTxFeHRlbnNpb25Db25maWc+IHtcbiAgICBjb25zdCBbYXBpS2V5LCBwcm9tcHRzXSA9IGF3YWl0IFByb21pc2UuYWxsKFtcbiAgICAgIHRoaXMuZ2V0QXBpS2V5KCksXG4gICAgICB0aGlzLmdldFByb21wdHMoKVxuICAgIF0pO1xuICAgIFxuICAgIHJldHVybiB7XG4gICAgICBnZW1pbmlBcGlLZXk6IGFwaUtleSxcbiAgICAgIHVzZXJQcm9tcHRzOiBwcm9tcHRzXG4gICAgfTtcbiAgfVxuXG4gIGFzeW5jIHNhdmVDb25maWcoY29uZmlnOiBQYXJ0aWFsPEV4dGVuc2lvbkNvbmZpZz4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCB1cGRhdGVzOiB7IFtrZXk6IHN0cmluZ106IGFueSB9ID0ge307XG4gICAgXG4gICAgaWYgKGNvbmZpZy5nZW1pbmlBcGlLZXkgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdXBkYXRlc1tTVE9SQUdFX0tFWVMuQVBJX0tFWV0gPSBjb25maWcuZ2VtaW5pQXBpS2V5O1xuICAgIH1cbiAgICBcbiAgICBpZiAoY29uZmlnLnVzZXJQcm9tcHRzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHVwZGF0ZXNbU1RPUkFHRV9LRVlTLlBST01QVFNdID0gY29uZmlnLnVzZXJQcm9tcHRzO1xuICAgIH1cbiAgICBcbiAgICBhd2FpdCBjaHJvbWUuc3RvcmFnZS5zeW5jLnNldCh1cGRhdGVzKTtcbiAgfVxuXG4gIGFzeW5jIGNsZWFyQWxsKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IGNocm9tZS5zdG9yYWdlLnN5bmMuY2xlYXIoKTtcbiAgfVxufVxuXG5leHBvcnQgY29uc3Qgc3RvcmFnZSA9IFN0b3JhZ2VNYW5hZ2VyLmdldEluc3RhbmNlKCk7IiwiZXhwb3J0IGNvbnN0IFNUT1JBR0VfS0VZUyA9IHtcbiAgQVBJX0tFWTogJ2dlbWluaUFwaUtleScsXG4gIFBST01QVFM6ICd1c2VyUHJvbXB0cydcbn0gYXMgY29uc3Q7XG5cbmV4cG9ydCBjb25zdCBTSVRFX1NFTEVDVE9SUyA9IHtcbiAgUkVERElUOiB7XG4gICAgUE9TVDogJ1tzbG90PVwidGV4dC1ib2R5XCJdJyxcbiAgICBDT01NRU5UUzogJ1tzbG90PVwiY29tbWVudFwiXSdcbiAgfSxcbiAgSEFDS0VSX05FV1M6IHtcbiAgICBQT1NUOiAnLnRvcHRleHQnLFxuICAgIENPTU1FTlRTOiAnLmNvbW1lbnQnXG4gIH1cbn0gYXMgY29uc3Q7XG5cbmV4cG9ydCBjb25zdCBVSV9DT05TVEFOVFMgPSB7XG4gIEhJR0hMSUdIVF9TVFlMRTogJ2JhY2tncm91bmQtY29sb3I6IHJnYmEoMjU1LCAyMTUsIDAsIDAuMyk7JyxcbiAgU0lERUJBUl9XSURUSDogJzMyMHB4JyxcbiAgTk9USUZJQ0FUSU9OX1RJTUVPVVQ6IDUwMDAsXG4gIFBPUFVQX1pfSU5ERVg6IDEwMDAwLFxuICBTSURFQkFSX1pfSU5ERVg6IDEwMDAwLFxuICBCQU5ORVJfWl9JTkRFWDogMTAwMDFcbn0gYXMgY29uc3Q7XG5cbmV4cG9ydCBjb25zdCBHRU1JTklfQ09ORklHID0ge1xuICBNT0RFTDogJ2dlbWluaS0yLjUtZmxhc2gnLFxuICBUSElOS0lOR19CVURHRVQ6IC0xXG59IGFzIGNvbnN0O1xuXG5leHBvcnQgY29uc3QgREVGQVVMVF9QUk9NUFRTID0gW1xuICB7XG4gICAgaWQ6ICdkZWZhdWx0LWluc2lnaHRzJyxcbiAgICBuYW1lOiAnRmluZCBLZXkgSW5zaWdodHMnLFxuICAgIHByb21wdDogJ0V4dHJhY3QgZ29sZGVuIG51Z2dldHMgdGhhdCB3b3VsZCBiZSB2YWx1YWJsZSBmb3IgYSBwcmFnbWF0aWMgc3ludGhlc2l6ZXIgd2l0aCBBREhELiBGb2N1cyBvbiBhY3Rpb25hYmxlIGluc2lnaHRzLCBlbGVnYW50IHByaW5jaXBsZXMsIHRvb2xzLCBhbmFsb2dpZXMsIGFuZCBleHBsYW5hdGlvbnMgdGhhdCBjb25uZWN0IHRvIGZpcnN0IHByaW5jaXBsZXMgdGhpbmtpbmcuIFByaW9yaXRpemUgY29udGVudCB0aGF0IGFuc3dlcnMgXCJob3cgdGhpbmdzIHdvcmtcIiBvciBwcm92aWRlcyBwcmFjdGljYWwgc3ludGhlc2lzLicsXG4gICAgaXNEZWZhdWx0OiB0cnVlXG4gIH1cbl0gYXMgY29uc3Q7IiwiZXhwb3J0cy5pbnRlcm9wRGVmYXVsdCA9IGZ1bmN0aW9uIChhKSB7XG4gIHJldHVybiBhICYmIGEuX19lc01vZHVsZSA/IGEgOiB7ZGVmYXVsdDogYX07XG59O1xuXG5leHBvcnRzLmRlZmluZUludGVyb3BGbGFnID0gZnVuY3Rpb24gKGEpIHtcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGEsICdfX2VzTW9kdWxlJywge3ZhbHVlOiB0cnVlfSk7XG59O1xuXG5leHBvcnRzLmV4cG9ydEFsbCA9IGZ1bmN0aW9uIChzb3VyY2UsIGRlc3QpIHtcbiAgT2JqZWN0LmtleXMoc291cmNlKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgICBpZiAoa2V5ID09PSAnZGVmYXVsdCcgfHwga2V5ID09PSAnX19lc01vZHVsZScgfHwgZGVzdC5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGRlc3QsIGtleSwge1xuICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgIGdldDogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gc291cmNlW2tleV07XG4gICAgICB9LFxuICAgIH0pO1xuICB9KTtcblxuICByZXR1cm4gZGVzdDtcbn07XG5cbmV4cG9ydHMuZXhwb3J0ID0gZnVuY3Rpb24gKGRlc3QsIGRlc3ROYW1lLCBnZXQpIHtcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGRlc3QsIGRlc3ROYW1lLCB7XG4gICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICBnZXQ6IGdldCxcbiAgfSk7XG59O1xuIiwiZXhwb3J0IGludGVyZmFjZSBHb2xkZW5OdWdnZXQge1xuICB0eXBlOiAndG9vbCcgfCAnbWVkaWEnIHwgJ2V4cGxhbmF0aW9uJyB8ICdhbmFsb2d5JyB8ICdtb2RlbCc7XG4gIGNvbnRlbnQ6IHN0cmluZztcbiAgc3ludGhlc2lzOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgR2VtaW5pUmVzcG9uc2Uge1xuICBnb2xkZW5fbnVnZ2V0czogR29sZGVuTnVnZ2V0W107XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2F2ZWRQcm9tcHQge1xuICBpZDogc3RyaW5nO1xuICBuYW1lOiBzdHJpbmc7XG4gIHByb21wdDogc3RyaW5nO1xuICBpc0RlZmF1bHQ6IGJvb2xlYW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRXh0ZW5zaW9uQ29uZmlnIHtcbiAgZ2VtaW5pQXBpS2V5OiBzdHJpbmc7XG4gIHVzZXJQcm9tcHRzOiBTYXZlZFByb21wdFtdO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIE51Z2dldERpc3BsYXlTdGF0ZSB7XG4gIG51Z2dldDogR29sZGVuTnVnZ2V0O1xuICBoaWdobGlnaHRlZDogYm9vbGVhbjtcbiAgZWxlbWVudFJlZj86IEhUTUxFbGVtZW50O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFNpZGViYXJOdWdnZXRJdGVtIHtcbiAgbnVnZ2V0OiBHb2xkZW5OdWdnZXQ7XG4gIHN0YXR1czogJ2hpZ2hsaWdodGVkJyB8ICdub3QtZm91bmQnO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEFuYWx5c2lzUmVxdWVzdCB7XG4gIGNvbnRlbnQ6IHN0cmluZztcbiAgcHJvbXB0SWQ6IHN0cmluZztcbiAgdXJsOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQW5hbHlzaXNSZXNwb25zZSB7XG4gIHN1Y2Nlc3M6IGJvb2xlYW47XG4gIGRhdGE/OiBHZW1pbmlSZXNwb25zZTtcbiAgZXJyb3I/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTWVzc2FnZVR5cGVzIHtcbiAgQU5BTFlaRV9DT05URU5UOiAnQU5BTFlaRV9DT05URU5UJztcbiAgQU5BTFlTSVNfQ09NUExFVEU6ICdBTkFMWVNJU19DT01QTEVURSc7XG4gIEFOQUxZU0lTX0VSUk9SOiAnQU5BTFlTSVNfRVJST1InO1xuICBHRVRfUFJPTVBUUzogJ0dFVF9QUk9NUFRTJztcbiAgU0FWRV9QUk9NUFQ6ICdTQVZFX1BST01QVCc7XG4gIERFTEVURV9QUk9NUFQ6ICdERUxFVEVfUFJPTVBUJztcbiAgU0VUX0RFRkFVTFRfUFJPTVBUOiAnU0VUX0RFRkFVTFRfUFJPTVBUJztcbiAgR0VUX0NPTkZJRzogJ0dFVF9DT05GSUcnO1xuICBTQVZFX0NPTkZJRzogJ1NBVkVfQ09ORklHJztcbn1cblxuZXhwb3J0IGNvbnN0IE1FU1NBR0VfVFlQRVM6IE1lc3NhZ2VUeXBlcyA9IHtcbiAgQU5BTFlaRV9DT05URU5UOiAnQU5BTFlaRV9DT05URU5UJyxcbiAgQU5BTFlTSVNfQ09NUExFVEU6ICdBTkFMWVNJU19DT01QTEVURScsXG4gIEFOQUxZU0lTX0VSUk9SOiAnQU5BTFlTSVNfRVJST1InLFxuICBHRVRfUFJPTVBUUzogJ0dFVF9QUk9NUFRTJyxcbiAgU0FWRV9QUk9NUFQ6ICdTQVZFX1BST01QVCcsXG4gIERFTEVURV9QUk9NUFQ6ICdERUxFVEVfUFJPTVBUJyxcbiAgU0VUX0RFRkFVTFRfUFJPTVBUOiAnU0VUX0RFRkFVTFRfUFJPTVBUJyxcbiAgR0VUX0NPTkZJRzogJ0dFVF9DT05GSUcnLFxuICBTQVZFX0NPTkZJRzogJ1NBVkVfQ09ORklHJ1xufTsiLCIvLyBOb3RlOiBUaGlzIHdpbGwgYmUgbG9hZGVkIHZpYSBzY3JpcHQgdGFnIG9yIGJ1bmRsZWQgZm9yIGJyb3dzZXJcbi8vIGltcG9ydCB7IEdvb2dsZUdlbkFJIH0gZnJvbSAnQGdvb2dsZS9nZW5haSc7XG5pbXBvcnQgeyBHRU1JTklfQ09ORklHIH0gZnJvbSAnLi4vc2hhcmVkL2NvbnN0YW50cyc7XG5pbXBvcnQgeyBHT0xERU5fTlVHR0VUX1NDSEVNQSB9IGZyb20gJy4uL3NoYXJlZC9zY2hlbWFzJztcbmltcG9ydCB7IEdlbWluaVJlc3BvbnNlIH0gZnJvbSAnLi4vc2hhcmVkL3R5cGVzJztcbmltcG9ydCB7IHN0b3JhZ2UgfSBmcm9tICcuLi9zaGFyZWQvc3RvcmFnZSc7XG5cbmV4cG9ydCBjbGFzcyBHZW1pbmlDbGllbnQge1xuICBwcml2YXRlIGdlbkFJOiBhbnkgfCBudWxsID0gbnVsbDtcblxuICBwcml2YXRlIGFzeW5jIGluaXRpYWxpemVDbGllbnQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKHRoaXMuZ2VuQUkpIHJldHVybjtcblxuICAgIGNvbnN0IGFwaUtleSA9IGF3YWl0IHN0b3JhZ2UuZ2V0QXBpS2V5KCk7XG4gICAgaWYgKCFhcGlLZXkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignR2VtaW5pIEFQSSBrZXkgbm90IGNvbmZpZ3VyZWQuIFBsZWFzZSBzZXQgaXQgaW4gdGhlIG9wdGlvbnMgcGFnZS4nKTtcbiAgICB9XG5cbiAgICAvLyB0aGlzLmdlbkFJID0gbmV3IEdvb2dsZUdlbkFJKHsgYXBpS2V5IH0pO1xuICAgIC8vIEZvciBub3csIHdlJ2xsIHRocm93IGFuIGVycm9yIHRvIGluZGljYXRlIHRoaXMgbmVlZHMgdG8gYmUgaW1wbGVtZW50ZWRcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0dlbWluaSBBUEkgaW50ZWdyYXRpb24gbm90IHlldCBpbXBsZW1lbnRlZCcpO1xuICB9XG5cbiAgYXN5bmMgYW5hbHl6ZUNvbnRlbnQoY29udGVudDogc3RyaW5nLCB1c2VyUHJvbXB0OiBzdHJpbmcpOiBQcm9taXNlPEdlbWluaVJlc3BvbnNlPiB7XG4gICAgYXdhaXQgdGhpcy5pbml0aWFsaXplQ2xpZW50KCk7XG5cbiAgICBpZiAoIXRoaXMuZ2VuQUkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignR2VtaW5pIGNsaWVudCBub3QgaW5pdGlhbGl6ZWQnKTtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgLy8gQ29uc3RydWN0IHByb21wdCB3aXRoIHVzZXIgcXVlcnkgYXQgdGhlIGVuZCBmb3Igb3B0aW1hbCBwZXJmb3JtYW5jZVxuICAgICAgY29uc3QgZnVsbFByb21wdCA9IGAke2NvbnRlbnR9XFxuXFxuJHt1c2VyUHJvbXB0fWA7XG5cbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5nZW5BSS5tb2RlbHMuZ2VuZXJhdGVDb250ZW50KHtcbiAgICAgICAgbW9kZWw6IEdFTUlOSV9DT05GSUcuTU9ERUwsXG4gICAgICAgIGNvbnRlbnRzOiBmdWxsUHJvbXB0LFxuICAgICAgICBjb25maWc6IHtcbiAgICAgICAgICByZXNwb25zZU1pbWVUeXBlOiBcImFwcGxpY2F0aW9uL2pzb25cIixcbiAgICAgICAgICByZXNwb25zZVNjaGVtYTogR09MREVOX05VR0dFVF9TQ0hFTUEsXG4gICAgICAgICAgdGhpbmtpbmdDb25maWc6IHtcbiAgICAgICAgICAgIHRoaW5raW5nQnVkZ2V0OiBHRU1JTklfQ09ORklHLlRISU5LSU5HX0JVREdFVFxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IEpTT04ucGFyc2UocmVzcG9uc2UudGV4dCkgYXMgR2VtaW5pUmVzcG9uc2U7XG4gICAgICBcbiAgICAgIC8vIFZhbGlkYXRlIHRoZSByZXNwb25zZSBzdHJ1Y3R1cmVcbiAgICAgIGlmICghcmVzdWx0LmdvbGRlbl9udWdnZXRzIHx8ICFBcnJheS5pc0FycmF5KHJlc3VsdC5nb2xkZW5fbnVnZ2V0cykpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHJlc3BvbnNlIGZvcm1hdCBmcm9tIEdlbWluaSBBUEknKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgaWYgKGVycm9yIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgLy8gSGFuZGxlIHNwZWNpZmljIEFQSSBlcnJvcnNcbiAgICAgICAgaWYgKGVycm9yLm1lc3NhZ2UuaW5jbHVkZXMoJ0FQSSBrZXknKSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBBUEkga2V5LiBQbGVhc2UgY2hlY2sgeW91ciBzZXR0aW5ncy4nKTtcbiAgICAgICAgfSBlbHNlIGlmIChlcnJvci5tZXNzYWdlLmluY2x1ZGVzKCdyYXRlIGxpbWl0JykpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1JhdGUgbGltaXQgcmVhY2hlZC4gUGxlYXNlIHRyeSBhZ2FpbiBsYXRlci4nKTtcbiAgICAgICAgfSBlbHNlIGlmIChlcnJvci5tZXNzYWdlLmluY2x1ZGVzKCd0aW1lb3V0JykpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1JlcXVlc3QgdGltZWQgb3V0LiBQbGVhc2UgdHJ5IGFnYWluLicpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0dlbWluaSBBUEkgZXJyb3I6JywgZXJyb3IpO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdBbmFseXNpcyBmYWlsZWQuIFBsZWFzZSB0cnkgYWdhaW4uJyk7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgdmFsaWRhdGVBcGlLZXkoYXBpS2V5OiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICB0cnkge1xuICAgICAgLy8gRm9yIG5vdywganVzdCB2YWxpZGF0ZSB0aGF0IHRoZSBBUEkga2V5IGlzIG5vbi1lbXB0eVxuICAgICAgLy8gSW4gYSByZWFsIGltcGxlbWVudGF0aW9uLCB0aGlzIHdvdWxkIHRlc3QgdGhlIEFQSSBrZXlcbiAgICAgIHJldHVybiBhcGlLZXkudHJpbSgpLmxlbmd0aCA+IDA7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cbn0iLCIvLyBpbXBvcnQgeyBUeXBlIH0gZnJvbSAnQGdvb2dsZS9nZW5haSc7XG4vLyBGb3Igbm93LCB3ZSdsbCBkZWZpbmUgYSBzaW1wbGUgc2NoZW1hIHN0cnVjdHVyZVxuXG5leHBvcnQgY29uc3QgR09MREVOX05VR0dFVF9TQ0hFTUEgPSB7XG4gIHR5cGU6IFwib2JqZWN0XCIsXG4gIHByb3BlcnRpZXM6IHtcbiAgICBnb2xkZW5fbnVnZ2V0czoge1xuICAgICAgdHlwZTogXCJhcnJheVwiLFxuICAgICAgZGVzY3JpcHRpb246IFwiQW4gYXJyYXkgb2YgZXh0cmFjdGVkIGdvbGRlbiBudWdnZXRzLlwiLFxuICAgICAgbWluSXRlbXM6IDAsXG4gICAgICBpdGVtczoge1xuICAgICAgICB0eXBlOiBcIm9iamVjdFwiLFxuICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgdHlwZToge1xuICAgICAgICAgICAgdHlwZTogXCJzdHJpbmdcIixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIlRoZSBjYXRlZ29yeSBvZiB0aGUgZXh0cmFjdGVkIGdvbGRlbiBudWdnZXQuXCIsXG4gICAgICAgICAgICBlbnVtOiBbXCJ0b29sXCIsIFwibWVkaWFcIiwgXCJleHBsYW5hdGlvblwiLCBcImFuYWxvZ3lcIiwgXCJtb2RlbFwiXVxuICAgICAgICAgIH0sXG4gICAgICAgICAgY29udGVudDoge1xuICAgICAgICAgICAgdHlwZTogXCJzdHJpbmdcIixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIlRoZSBvcmlnaW5hbCBjb21tZW50KHMpIHZlcmJhdGltLCB3aXRob3V0IGFueSBjaGFuZ2VzIHRvIHdvcmRpbmcgb3Igc3ltYm9scy5cIlxuICAgICAgICAgIH0sXG4gICAgICAgICAgc3ludGhlc2lzOiB7XG4gICAgICAgICAgICB0eXBlOiBcInN0cmluZ1wiLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiQSBjb25jaXNlIGV4cGxhbmF0aW9uIG9mIHdoeSB0aGlzIGlzIHJlbGV2YW50IHRvIHRoZSBwZXJzb25hLCBjb25uZWN0aW5nIGl0IHRvIHRoZWlyIGNvcmUgaW50ZXJlc3RzIG9yIGNvZ25pdGl2ZSBwcm9maWxlLlwiXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICByZXF1aXJlZDogW1widHlwZVwiLCBcImNvbnRlbnRcIiwgXCJzeW50aGVzaXNcIl0sXG4gICAgICAgIHByb3BlcnR5T3JkZXJpbmc6IFtcInR5cGVcIiwgXCJjb250ZW50XCIsIFwic3ludGhlc2lzXCJdXG4gICAgICB9XG4gICAgfVxuICB9LFxuICByZXF1aXJlZDogW1wiZ29sZGVuX251Z2dldHNcIl0sXG4gIHByb3BlcnR5T3JkZXJpbmc6IFtcImdvbGRlbl9udWdnZXRzXCJdXG59IGFzIGNvbnN0OyIsImltcG9ydCB7IE1FU1NBR0VfVFlQRVMsIEFuYWx5c2lzUmVxdWVzdCwgQW5hbHlzaXNSZXNwb25zZSB9IGZyb20gJy4uL3NoYXJlZC90eXBlcyc7XG5pbXBvcnQgeyBzdG9yYWdlIH0gZnJvbSAnLi4vc2hhcmVkL3N0b3JhZ2UnO1xuaW1wb3J0IHsgR2VtaW5pQ2xpZW50IH0gZnJvbSAnLi9nZW1pbmktY2xpZW50JztcblxuZXhwb3J0IGNsYXNzIE1lc3NhZ2VIYW5kbGVyIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBnZW1pbmlDbGllbnQ6IEdlbWluaUNsaWVudCkge31cblxuICBhc3luYyBoYW5kbGVNZXNzYWdlKFxuICAgIHJlcXVlc3Q6IGFueSxcbiAgICBzZW5kZXI6IGNocm9tZS5ydW50aW1lLk1lc3NhZ2VTZW5kZXIsXG4gICAgc2VuZFJlc3BvbnNlOiAocmVzcG9uc2U6IGFueSkgPT4gdm9pZFxuICApOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0cnkge1xuICAgICAgc3dpdGNoIChyZXF1ZXN0LnR5cGUpIHtcbiAgICAgICAgY2FzZSBNRVNTQUdFX1RZUEVTLkFOQUxZWkVfQ09OVEVOVDpcbiAgICAgICAgICBhd2FpdCB0aGlzLmhhbmRsZUFuYWx5emVDb250ZW50KHJlcXVlc3QsIHNlbmRSZXNwb25zZSk7XG4gICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgY2FzZSBNRVNTQUdFX1RZUEVTLkdFVF9QUk9NUFRTOlxuICAgICAgICAgIGF3YWl0IHRoaXMuaGFuZGxlR2V0UHJvbXB0cyhzZW5kUmVzcG9uc2UpO1xuICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGNhc2UgTUVTU0FHRV9UWVBFUy5TQVZFX1BST01QVDpcbiAgICAgICAgICBhd2FpdCB0aGlzLmhhbmRsZVNhdmVQcm9tcHQocmVxdWVzdCwgc2VuZFJlc3BvbnNlKTtcbiAgICAgICAgICBicmVhaztcblxuICAgICAgICBjYXNlIE1FU1NBR0VfVFlQRVMuREVMRVRFX1BST01QVDpcbiAgICAgICAgICBhd2FpdCB0aGlzLmhhbmRsZURlbGV0ZVByb21wdChyZXF1ZXN0LCBzZW5kUmVzcG9uc2UpO1xuICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGNhc2UgTUVTU0FHRV9UWVBFUy5TRVRfREVGQVVMVF9QUk9NUFQ6XG4gICAgICAgICAgYXdhaXQgdGhpcy5oYW5kbGVTZXREZWZhdWx0UHJvbXB0KHJlcXVlc3QsIHNlbmRSZXNwb25zZSk7XG4gICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgY2FzZSBNRVNTQUdFX1RZUEVTLkdFVF9DT05GSUc6XG4gICAgICAgICAgYXdhaXQgdGhpcy5oYW5kbGVHZXRDb25maWcoc2VuZFJlc3BvbnNlKTtcbiAgICAgICAgICBicmVhaztcblxuICAgICAgICBjYXNlIE1FU1NBR0VfVFlQRVMuU0FWRV9DT05GSUc6XG4gICAgICAgICAgYXdhaXQgdGhpcy5oYW5kbGVTYXZlQ29uZmlnKHJlcXVlc3QsIHNlbmRSZXNwb25zZSk7XG4gICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdVbmtub3duIG1lc3NhZ2UgdHlwZScgfSk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGhhbmRsaW5nIG1lc3NhZ2U6JywgZXJyb3IpO1xuICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAoZXJyb3IgYXMgRXJyb3IpLm1lc3NhZ2UgfSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBoYW5kbGVBbmFseXplQ29udGVudChcbiAgICByZXF1ZXN0OiBBbmFseXNpc1JlcXVlc3QsXG4gICAgc2VuZFJlc3BvbnNlOiAocmVzcG9uc2U6IEFuYWx5c2lzUmVzcG9uc2UpID0+IHZvaWRcbiAgKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHByb21wdHMgPSBhd2FpdCBzdG9yYWdlLmdldFByb21wdHMoKTtcbiAgICAgIGNvbnN0IHByb21wdCA9IHByb21wdHMuZmluZChwID0+IHAuaWQgPT09IHJlcXVlc3QucHJvbXB0SWQpO1xuICAgICAgXG4gICAgICBpZiAoIXByb21wdCkge1xuICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdQcm9tcHQgbm90IGZvdW5kJyB9KTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmdlbWluaUNsaWVudC5hbmFseXplQ29udGVudChyZXF1ZXN0LmNvbnRlbnQsIHByb21wdC5wcm9tcHQpO1xuICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogcmVzdWx0IH0pO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdBbmFseXNpcyBmYWlsZWQ6JywgZXJyb3IpO1xuICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAoZXJyb3IgYXMgRXJyb3IpLm1lc3NhZ2UgfSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBoYW5kbGVHZXRQcm9tcHRzKHNlbmRSZXNwb25zZTogKHJlc3BvbnNlOiBhbnkpID0+IHZvaWQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgcHJvbXB0cyA9IGF3YWl0IHN0b3JhZ2UuZ2V0UHJvbXB0cygpO1xuICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogcHJvbXB0cyB9KTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAoZXJyb3IgYXMgRXJyb3IpLm1lc3NhZ2UgfSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBoYW5kbGVTYXZlUHJvbXB0KHJlcXVlc3Q6IGFueSwgc2VuZFJlc3BvbnNlOiAocmVzcG9uc2U6IGFueSkgPT4gdm9pZCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCBzdG9yYWdlLnNhdmVQcm9tcHQocmVxdWVzdC5wcm9tcHQpO1xuICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogdHJ1ZSB9KTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAoZXJyb3IgYXMgRXJyb3IpLm1lc3NhZ2UgfSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBoYW5kbGVEZWxldGVQcm9tcHQocmVxdWVzdDogYW55LCBzZW5kUmVzcG9uc2U6IChyZXNwb25zZTogYW55KSA9PiB2b2lkKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHN0b3JhZ2UuZGVsZXRlUHJvbXB0KHJlcXVlc3QucHJvbXB0SWQpO1xuICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogdHJ1ZSB9KTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAoZXJyb3IgYXMgRXJyb3IpLm1lc3NhZ2UgfSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBoYW5kbGVTZXREZWZhdWx0UHJvbXB0KHJlcXVlc3Q6IGFueSwgc2VuZFJlc3BvbnNlOiAocmVzcG9uc2U6IGFueSkgPT4gdm9pZCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCBzdG9yYWdlLnNldERlZmF1bHRQcm9tcHQocmVxdWVzdC5wcm9tcHRJZCk7XG4gICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiB0cnVlIH0pO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IChlcnJvciBhcyBFcnJvcikubWVzc2FnZSB9KTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGhhbmRsZUdldENvbmZpZyhzZW5kUmVzcG9uc2U6IChyZXNwb25zZTogYW55KSA9PiB2b2lkKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGNvbmZpZyA9IGF3YWl0IHN0b3JhZ2UuZ2V0Q29uZmlnKCk7XG4gICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiB0cnVlLCBkYXRhOiBjb25maWcgfSk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogKGVycm9yIGFzIEVycm9yKS5tZXNzYWdlIH0pO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgaGFuZGxlU2F2ZUNvbmZpZyhyZXF1ZXN0OiBhbnksIHNlbmRSZXNwb25zZTogKHJlc3BvbnNlOiBhbnkpID0+IHZvaWQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgc3RvcmFnZS5zYXZlQ29uZmlnKHJlcXVlc3QuY29uZmlnKTtcbiAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUgfSk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogKGVycm9yIGFzIEVycm9yKS5tZXNzYWdlIH0pO1xuICAgIH1cbiAgfVxufSJdLCJuYW1lcyI6W10sInZlcnNpb24iOjMsImZpbGUiOiJpbmRleC5qcy5tYXAifQ==
 globalThis.define=__define;  })(globalThis.define);