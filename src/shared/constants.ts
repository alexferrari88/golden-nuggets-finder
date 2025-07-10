export const STORAGE_KEYS = {
  API_KEY: 'geminiApiKey',
  PROMPTS: 'userPrompts'
} as const;

export const SITE_SELECTORS = {
  REDDIT: {
    POST: '[slot="text-body"]',
    COMMENTS: '[slot="comment"]'
  },
  HACKER_NEWS: {
    POST: '.toptext',
    COMMENTS: '.comment'
  }
} as const;

export const UI_CONSTANTS = {
  HIGHLIGHT_STYLE: 'background-color: rgba(59, 130, 246, 0.08); padding: 1px 2px; border-radius: 3px; border-bottom: 1px solid rgba(59, 130, 246, 0.2); box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.1);',
  SIDEBAR_WIDTH: '320px',
  NOTIFICATION_TIMEOUT: 5000,
  POPUP_Z_INDEX: 10000,
  SIDEBAR_Z_INDEX: 10000,
  BANNER_Z_INDEX: 10001
} as const;

export const GEMINI_CONFIG = {
  MODEL: 'gemini-2.5-flash',
  THINKING_BUDGET: -1
} as const;

export const DEFAULT_PROMPTS = [
  {
    id: 'default-insights',
    name: 'Find Key Insights',
    prompt: 'Extract golden nuggets that would be valuable for a pragmatic synthesizer with ADHD. Focus on actionable insights, elegant principles, tools, analogies, and explanations that connect to first principles thinking. Prioritize content that answers "how things work" or provides practical synthesis. Do not force finding golden nuggets: if you cannot find any, return an empty `golden_nuggets` array.',
    isDefault: true
  }
] as const;