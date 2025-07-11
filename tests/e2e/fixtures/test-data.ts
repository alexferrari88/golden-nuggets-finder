export const TEST_API_KEY = 'test-api-key-for-e2e-tests';
export const INVALID_API_KEY = 'invalid-api-key-123';

export const DEFAULT_PROMPTS = [
  {
    id: '1',
    name: 'Find Tools',
    prompt: 'Extract mentions of useful tools, software, or resources that would be valuable to developers or creators.',
    isDefault: true,
  },
  {
    id: '2', 
    name: 'Find Analogies',
    prompt: 'Find insightful analogies or metaphors that explain complex concepts in simple terms.',
    isDefault: false,
  },
  {
    id: '3',
    name: 'Find Explanations',
    prompt: 'Extract clear explanations of technical concepts, processes, or phenomena.',
    isDefault: false,
  },
];

export const MOCK_REDDIT_THREAD = {
  title: 'What are your favorite developer tools?',
  url: 'https://www.reddit.com/r/programming/comments/test123/what_are_your_favorite_developer_tools/',
  comments: [
    {
      author: 'user1',
      content: 'I love using VS Code with the Vim extension. It gives me the best of both worlds - modern IDE features with vim keybindings.',
      replies: [],
    },
    {
      author: 'user2', 
      content: 'Docker has completely changed how I deploy applications. No more "it works on my machine" problems.',
      replies: [
        {
          author: 'user3',
          content: 'Docker is great but I prefer Podman for rootless containers. More secure by default.',
          replies: [],
        },
      ],
    },
  ],
};

export const MOCK_HACKERNEWS_THREAD = {
  title: 'Show HN: My new productivity app',
  url: 'https://news.ycombinator.com/item?id=12345',
  comments: [
    {
      author: 'techuser',
      content: 'Nice work! Have you considered using React Query for data fetching? It handles caching and synchronization much better than useEffect.',
      replies: [],
    },
    {
      author: 'devguru',
      content: 'The UI looks clean but I think you could benefit from using a state management library like Zustand. It\'s lighter than Redux but still powerful.',
      replies: [],
    },
  ],
};

export const MOCK_BLOG_POST = {
  title: 'Understanding React Hooks',
  url: 'https://example.com/react-hooks-guide',
  content: `
    React Hooks revolutionized how we write React components. Before hooks, you had to use class components for state management.
    
    The useState hook is like a Swiss Army knife for state management. It's simple but powerful.
    
    useEffect is your go-to for side effects. Think of it as componentDidMount, componentDidUpdate, and componentWillUnmount rolled into one.
    
    Custom hooks are where the real magic happens. They're like creating your own tools for specific problems.
  `,
};

export const MOCK_TWITTER_THREAD = {
  title: 'Thread about AI development tools',
  url: 'https://twitter.com/ai_developer/status/1234567890',
  author: '/ai_developer',
  tweets: [
    {
      fullText: 'Just discovered Claude Code - an AI assistant that helps with development. Game changer for debugging complex issues. 🧵',
      truncatedText: 'Just discovered Claude Code - an AI assistant that helps with development. Game changer for debugging...',
      isOriginalAuthor: true,
      needsExpansion: true,
    },
    {
      fullText: 'The key insight is that AI tools work best when you give them context. Don\'t just ask "fix this bug" - explain what you\'re trying to achieve.',
      truncatedText: null,
      isOriginalAuthor: true,
      needsExpansion: false,
    },
    {
      fullText: 'Another powerful technique: use AI to explain complex code. I often ask it to break down algorithms I\'m not familiar with.',
      truncatedText: null,
      isOriginalAuthor: true,
      needsExpansion: false,
    },
  ],
  relatedTweets: [
    {
      fullText: 'Thanks for sharing this! I\'ve been looking for better AI tools.',
      truncatedText: null,
      isOriginalAuthor: false,
      needsExpansion: false,
    },
  ],
};

export const MOCK_ANALYSIS_RESPONSE = {
  golden_nuggets: [
    {
      type: 'tool',
      content: 'VS Code with the Vim extension. It gives me the best of both worlds - modern IDE features with vim keybindings.',
      synthesis: 'This tool recommendation combines the productivity of a modern IDE with the efficiency of vim keybindings, appealing to developers who value both features and workflow speed.',
    },
    {
      type: 'tool',
      content: 'Docker has completely changed how I deploy applications. No more "it works on my machine" problems.',
      synthesis: 'Docker addresses a fundamental problem in software deployment - environment consistency. This insight is valuable for understanding containerization benefits.',
    },
    {
      type: 'tool',
      content: 'React Query for data fetching. It handles caching and synchronization much better than useEffect.',
      synthesis: 'This highlights a specialized tool that solves common React development pain points around data management and caching.',
    },
  ],
};

export const MOCK_EMPTY_RESPONSE = {
  golden_nuggets: [],
};

export const MOCK_ERROR_RESPONSE = {
  error: 'API rate limit exceeded',
  message: 'Too many requests. Please try again later.',
};