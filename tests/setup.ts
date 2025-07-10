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

// Mock WebCrypto API for security tests
const mockCrypto = {
  subtle: {
    importKey: vi.fn().mockResolvedValue({
      type: 'secret',
      algorithm: { name: 'PBKDF2' },
      extractable: false,
      usages: ['deriveBits', 'deriveKey']
    }),
    deriveKey: vi.fn().mockResolvedValue({
      type: 'secret',
      algorithm: { name: 'AES-GCM', length: 256 },
      extractable: false,
      usages: ['encrypt', 'decrypt']
    }),
    encrypt: vi.fn().mockImplementation(() => {
      // Return a mock encrypted buffer
      const mockEncrypted = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      return Promise.resolve(mockEncrypted.buffer);
    }),
    decrypt: vi.fn().mockImplementation(() => {
      // Return a mock decrypted buffer containing "test-api-key"
      const encoder = new TextEncoder();
      const mockDecrypted = encoder.encode('test-api-key');
      return Promise.resolve(mockDecrypted.buffer);
    }),
    exportKey: vi.fn().mockImplementation(() => {
      // Return a mock key buffer
      const mockKey = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
      return Promise.resolve(mockKey.buffer);
    }),
    digest: vi.fn().mockImplementation(() => {
      // Return a mock hash buffer
      const mockHash = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
      return Promise.resolve(mockHash.buffer);
    })
  },
  getRandomValues: vi.fn().mockImplementation((array) => {
    // Fill array with predictable values for testing
    for (let i = 0; i < array.length; i++) {
      array[i] = i + 1;
    }
    return array;
  })
};

// Mock navigator for device fingerprinting
const mockNavigator = {
  userAgent: 'Mozilla/5.0 (Test Browser)',
  language: 'en-US',
  platform: 'Test Platform'
};

// Mock screen for device fingerprinting
const mockScreen = {
  width: 1920,
  height: 1080
};

// Mock Date for timezone offset
const mockDate = Date;
mockDate.prototype.getTimezoneOffset = vi.fn().mockReturnValue(-480); // PST

// Mock performance for timing
const mockPerformance = {
  now: vi.fn().mockImplementation(() => Date.now()),
  memory: {
    usedJSHeapSize: 1024 * 1024,
    totalJSHeapSize: 2 * 1024 * 1024,
    jsHeapSizeLimit: 4 * 1024 * 1024
  }
};

// Apply mocks to global objects
Object.defineProperty(global, 'crypto', {
  value: mockCrypto,
  writable: true,
  configurable: true
});

Object.defineProperty(global, 'navigator', {
  value: { ...global.navigator, ...mockNavigator },
  writable: true,
  configurable: true
});

Object.defineProperty(global, 'screen', {
  value: mockScreen,
  writable: true,
  configurable: true
});

Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true,
  configurable: true
});

export { mockChrome, mockCrypto };