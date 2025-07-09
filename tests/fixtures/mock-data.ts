import { GoldenNugget, GeminiResponse, SavedPrompt, ExtensionConfig } from '../../src/shared/types';

export const mockGoldenNuggets: GoldenNugget[] = [
  {
    type: 'tool',
    content: 'Use regex101.com for testing regular expressions',
    synthesis: 'Perfect for someone who values precision and testing - allows you to validate patterns before implementation'
  },
  {
    type: 'explanation',
    content: 'React hooks follow the principle of composition over inheritance, making code more modular and reusable',
    synthesis: 'Aligns with first-principles thinking - explains the fundamental design philosophy behind React hooks'
  },
  {
    type: 'analogy',
    content: 'Database indexing is like having a phone book organized alphabetically - you can find what you need quickly without scanning every page',
    synthesis: 'Excellent mental model for understanding database performance optimization'
  },
  {
    type: 'model',
    content: 'The MVC pattern separates concerns: Model (data), View (presentation), Controller (logic)',
    synthesis: 'Fundamental architectural pattern that provides clear mental framework for organizing code'
  },
  {
    type: 'media',
    content: 'Check out this video on system design fundamentals: https://youtube.com/watch?v=example',
    synthesis: 'Visual learning resource that complements theoretical understanding of system architecture'
  }
];

export const mockGeminiResponse: GeminiResponse = {
  golden_nuggets: mockGoldenNuggets
};

export const mockSavedPrompts: SavedPrompt[] = [
  {
    id: 'default-insights',
    name: 'Find Key Insights',
    prompt: 'Extract golden nuggets that would be valuable for a pragmatic synthesizer with ADHD. Focus on actionable insights, elegant principles, tools, analogies, and explanations that connect to first principles thinking.',
    isDefault: true
  },
  {
    id: 'technical-focus',
    name: 'Technical Deep Dive',
    prompt: 'Focus on technical explanations, code examples, and development tools that would be useful for a software engineer.',
    isDefault: false
  },
  {
    id: 'business-insights',
    name: 'Business Strategy',
    prompt: 'Identify strategic insights, market analysis, and business frameworks that would be valuable for decision-making.',
    isDefault: false
  }
];

export const mockExtensionConfig: ExtensionConfig = {
  geminiApiKey: 'test-api-key-12345',
  userPrompts: mockSavedPrompts
};

export const mockRedditHTML = `
<div class="page">
  <div slot="text-body" style="width: 100px; height: 100px;">
    This is a Reddit post about the amazing benefits of using TypeScript for large-scale applications.
    The type safety really helps catch bugs early in development.
  </div>
  <div slot="comment" style="width: 100px; height: 100px;">
    I totally agree! TypeScript has saved me countless hours of debugging.
    The IntelliSense support is incredible too.
  </div>
  <div slot="comment" style="width: 100px; height: 100px;">
    Short
  </div>
  <div slot="comment" style="width: 100px; height: 100px;">
    For anyone starting with TypeScript, I recommend beginning with strict mode disabled and gradually enabling it as you get comfortable.
  </div>
</div>
`;

export const mockHackerNewsHTML = `
<div class="page">
  <div class="titleline">
    <a href="https://example.com/article">The Future of Web Development</a>
  </div>
  <div class="toptext" style="width: 100px; height: 100px;">
    This article discusses the emerging trends in web development including WebAssembly, serverless architecture, and JAMstack.
  </div>
  <div class="comment" style="width: 100px; height: 100px;">
    WebAssembly is going to revolutionize how we think about web performance. The ability to run near-native code in the browser opens up so many possibilities.
  </div>
  <div class="comment" style="width: 100px; height: 100px;">
    I've been using JAMstack for client projects and the developer experience is fantastic. Build times are fast and deployment is seamless.
  </div>
  <div class="comment" style="width: 100px; height: 100px;">
    Short comment
  </div>
</div>
`;

export const mockGenericHTML = `
<html>
<head>
  <title>Understanding System Design</title>
  <meta name="description" content="A comprehensive guide to system design principles and patterns">
</head>
<body>
  <header>
    <nav>Navigation menu</nav>
  </header>
  <main style="width: 100px; height: 100px;">
    <article>
      <h1>Understanding System Design</h1>
      <p>System design is the process of designing the architecture, components, and interfaces of a system to satisfy specified requirements.</p>
      <p>Key principles include scalability, reliability, availability, and consistency. These form the foundation of any well-designed system.</p>
      <h2>Core Patterns</h2>
      <p>Load balancing distributes requests across multiple servers to prevent any single server from becoming a bottleneck.</p>
      <p>Caching stores frequently accessed data in fast storage to reduce latency and improve performance.</p>
    </article>
  </main>
  <aside>
    <div class="sidebar">Sidebar content</div>
  </aside>
  <footer>
    <p>Footer content</p>
  </footer>
</body>
</html>
`;

export const mockAPIResponses = {
  validGeminiResponse: {
    candidates: [{
      content: {
        parts: [{
          text: JSON.stringify(mockGeminiResponse)
        }]
      }
    }]
  },
  
  emptyGeminiResponse: {
    candidates: [{
      content: {
        parts: [{
          text: JSON.stringify({ golden_nuggets: [] })
        }]
      }
    }]
  },
  
  invalidGeminiResponse: {
    candidates: [{
      content: {
        parts: [{
          text: JSON.stringify({ invalid: 'format' })
        }]
      }
    }]
  },
  
  malformedGeminiResponse: {
    candidates: [{
      content: {
        parts: [{
          text: 'invalid json response'
        }]
      }
    }]
  },
  
  noResponseText: {
    candidates: [{
      content: {
        parts: [{}]
      }
    }]
  }
};

export const mockStorageData = {
  withApiKey: {
    geminiApiKey: 'test-api-key-12345'
  },
  
  withPrompts: {
    userPrompts: mockSavedPrompts
  },
  
  withComplete: {
    geminiApiKey: 'test-api-key-12345',
    userPrompts: mockSavedPrompts
  },
  
  empty: {}
};

export const mockErrors = {
  networkError: new Error('Network connection failed'),
  authError: new Error('API key authentication failed'),
  rateLimitError: new Error('Rate limit exceeded'),
  timeoutError: new Error('Request timeout'),
  malformedError: new Error('Malformed request body'),
  genericError: new Error('Something went wrong')
};

export const mockDOMElements = {
  createVisibleElement: (tag: string, content: string, className?: string) => {
    const element = document.createElement(tag);
    element.textContent = content;
    element.style.width = '100px';
    element.style.height = '100px';
    if (className) {
      element.className = className;
    }
    return element;
  },
  
  createHiddenElement: (tag: string, content: string, hideMethod: 'display' | 'visibility' = 'display') => {
    const element = document.createElement(tag);
    element.textContent = content;
    if (hideMethod === 'display') {
      element.style.display = 'none';
    } else {
      element.style.visibility = 'hidden';
    }
    return element;
  },
  
  createRedditPost: (content: string) => {
    const element = document.createElement('div');
    element.setAttribute('slot', 'text-body');
    element.style.width = '100px';
    element.style.height = '100px';
    element.textContent = content;
    return element;
  },
  
  createRedditComment: (content: string) => {
    const element = document.createElement('div');
    element.setAttribute('slot', 'comment');
    element.style.width = '100px';
    element.style.height = '100px';
    element.textContent = content;
    return element;
  },
  
  createHackerNewsPost: (content: string) => {
    const element = document.createElement('div');
    element.className = 'toptext';
    element.style.width = '100px';
    element.style.height = '100px';
    element.textContent = content;
    return element;
  },
  
  createHackerNewsComment: (content: string) => {
    const element = document.createElement('div');
    element.className = 'comment';
    element.style.width = '100px';
    element.style.height = '100px';
    element.textContent = content;
    return element;
  }
};