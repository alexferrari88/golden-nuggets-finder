import { defineConfig } from 'wxt';

export default defineConfig({
  // Configure to use src/ directory
  srcDir: 'src',
  
  // Enable React module
  modules: ['@wxt-dev/module-react'],
  
  // Manifest configuration migrated from public/manifest.json
  manifest: {
    name: 'Golden Nugget Finder',
    description: 'Extract high-value insights from web content using AI',
    version: '1.0.0',
    permissions: [
      'activeTab',
      'storage',
      'contextMenus',
      'scripting'
    ],
    web_accessible_resources: [
      {
        resources: ['Readability.js'],
        matches: ['<all_urls>']
      }
    ],
    action: {
      default_popup: 'popup.html'
    },
    options_ui: {
      page: 'options.html',
      open_in_tab: true
    },
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self'; connect-src 'self' https://generativelanguage.googleapis.com ws://localhost:3000; style-src 'self' 'unsafe-inline'"
    }
  },
  
  // Configure output directory
  outDir: 'dist'
});