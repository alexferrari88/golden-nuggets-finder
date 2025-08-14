import { defineConfig } from "wxt";

export default defineConfig({
	// Configure to use src/ directory
	srcDir: "src",

	// Enable React module
	modules: ["@wxt-dev/module-react"],

	// Manifest configuration migrated from public/manifest.json
	manifest: {
		name: "Golden Nugget Finder",
		description: "Extract high-value insights from web content using AI",
		version: "1.1.0",
		icons: {
			16: "assets/icon16.png",
			32: "assets/icon32.png",
			128: "assets/icon128.png",
		},
		permissions: ["activeTab", "storage", "contextMenus", "scripting", "alarms"],
		// Host permissions for LLM provider APIs (always needed)
		host_permissions: [
			"https://generativelanguage.googleapis.com/*",
			"https://openrouter.ai/*",
			"https://api.anthropic.com/*",
			"https://api.openai.com/*",
			// Development and testing domains
			...(process.env.NODE_ENV === "development" ? [
				"https://www.reddit.com/*",
				"https://news.ycombinator.com/*",
				"https://twitter.com/*",
				"https://x.com/*",
				"https://example.com/*",
				"http://localhost/*",
			] : []),
		],
		web_accessible_resources: [
			{
				resources: ["Readability.js"],
				matches: [
					"https://www.reddit.com/*",
					"https://old.reddit.com/*",
					"https://news.ycombinator.com/*",
					"https://twitter.com/*",
					"https://x.com/*",
					"https://*.medium.com/*",
					"https://*.substack.com/*",
				],
			},
		],
		action: {
			default_popup: "popup.html",
			default_icon: {
				16: "assets/icon16.png",
				32: "assets/icon32.png",
			},
		},
		options_ui: {
			page: "options.html",
			open_in_tab: true,
		},
		content_security_policy: {
			// Use specific port for dev server HMR connection
			extension_pages:
				"script-src 'self'; object-src 'self'; connect-src 'self' https://generativelanguage.googleapis.com https://openrouter.ai https://api.anthropic.com https://api.openai.com ws://localhost:8624 http://localhost:7532; style-src 'self' 'unsafe-inline'",
		},
	},

	// Configure development server
	dev: {
		server: {
			port: 8624, // Change this to your desired port
		},
	},

	// Configure output directory
	outDir: "dist",
});
