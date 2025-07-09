import { vi } from 'vitest';

// Mock Chrome extension APIs
const mockChrome = {
  storage: {
    sync: {
      get: vi.fn(),
      set: vi.fn(),
      clear: vi.fn(),
      remove: vi.fn()
    }
  },
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
      hasListener: vi.fn()
    }
  }
};

// Make chrome available globally
global.chrome = mockChrome;

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: 'https://example.com',
    hostname: 'example.com',
    origin: 'https://example.com',
    pathname: '/',
    search: '',
    hash: ''
  },
  writable: true
});

// Mock document.createTreeWalker for tests
global.NodeFilter = {
  FILTER_ACCEPT: 1,
  FILTER_REJECT: 2,
  FILTER_SKIP: 3,
  SHOW_TEXT: 4,
  SHOW_ELEMENT: 1,
  SHOW_ALL: 0xFFFFFFFF
};

// Mock fetch for API tests
global.fetch = vi.fn();

// Mock console methods to avoid noise in tests
console.warn = vi.fn();
console.error = vi.fn();

export { mockChrome };