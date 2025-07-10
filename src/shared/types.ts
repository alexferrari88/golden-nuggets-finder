export interface GoldenNugget {
  type: 'tool' | 'media' | 'explanation' | 'analogy' | 'model';
  content: string;
  synthesis: string;
}

export interface GeminiResponse {
  golden_nuggets: GoldenNugget[];
}

export interface SavedPrompt {
  id: string;
  name: string;
  prompt: string;
  isDefault: boolean;
}

export interface ExtensionConfig {
  geminiApiKey: string;
  userPrompts: SavedPrompt[];
}

export interface NuggetDisplayState {
  nugget: GoldenNugget;
  highlighted: boolean;
  elementRef?: HTMLElement;
}

export interface SidebarNuggetItem {
  nugget: GoldenNugget;
  status: 'highlighted' | 'not-found';
}

export interface AnalysisRequest {
  content: string;
  promptId: string;
  url: string;
}

export interface AnalysisResponse {
  success: boolean;
  data?: GeminiResponse;
  error?: string;
}

export interface MessageTypes {
  ANALYZE_CONTENT: 'ANALYZE_CONTENT';
  ANALYSIS_COMPLETE: 'ANALYSIS_COMPLETE';
  ANALYSIS_ERROR: 'ANALYSIS_ERROR';
  SHOW_ERROR: 'SHOW_ERROR';
  GET_PROMPTS: 'GET_PROMPTS';
  SAVE_PROMPT: 'SAVE_PROMPT';
  DELETE_PROMPT: 'DELETE_PROMPT';
  SET_DEFAULT_PROMPT: 'SET_DEFAULT_PROMPT';
  GET_CONFIG: 'GET_CONFIG';
  SAVE_CONFIG: 'SAVE_CONFIG';
}

export const MESSAGE_TYPES: MessageTypes = {
  ANALYZE_CONTENT: 'ANALYZE_CONTENT',
  ANALYSIS_COMPLETE: 'ANALYSIS_COMPLETE',
  ANALYSIS_ERROR: 'ANALYSIS_ERROR',
  SHOW_ERROR: 'SHOW_ERROR',
  GET_PROMPTS: 'GET_PROMPTS',
  SAVE_PROMPT: 'SAVE_PROMPT',
  DELETE_PROMPT: 'DELETE_PROMPT',
  SET_DEFAULT_PROMPT: 'SET_DEFAULT_PROMPT',
  GET_CONFIG: 'GET_CONFIG',
  SAVE_CONFIG: 'SAVE_CONFIG'
};