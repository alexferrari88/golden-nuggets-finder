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
    icons: {
      16: 'assets/icon16.png',
      32: 'assets/icon32.png',
      128: 'assets/icon128.png'
    },
    permissions: [
      'activeTab',
      'storage',
      'contextMenus',
      'scripting'
    ],
    // Add host permissions for testing - only in development builds
    ...(process.env.NODE_ENV === 'development' && {
      host_permissions: [
        'https://www.reddit.com/*',
        'https://news.ycombinator.com/*',
        'https://twitter.com/*',
        'https://x.com/*',
        'https://example.com/*'
      ]
    }),
    web_accessible_resources: [
      {
        resources: ['Readability.js'],
        matches: ['<all_urls>']
      }
    ],
    action: {
      default_popup: 'popup.html',
      default_icon: {
        16: 'assets/icon16.png',
        32: 'assets/icon32.png'
      }
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