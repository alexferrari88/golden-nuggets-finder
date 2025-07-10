import { MESSAGE_TYPES, AnalysisRequest, AnalysisResponse } from '../shared/types';
import { storage } from '../shared/storage';
import { GeminiClient } from './gemini-client';

export class MessageHandler {
  constructor(private geminiClient: GeminiClient) {}

  async handleMessage(
    request: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: any) => void
  ): Promise<void> {
    try {
      switch (request.type) {
        case MESSAGE_TYPES.ANALYZE_CONTENT:
          await this.handleAnalyzeContent(request, sendResponse);
          break;

        case MESSAGE_TYPES.GET_PROMPTS:
          await this.handleGetPrompts(sendResponse);
          break;

        case MESSAGE_TYPES.SAVE_PROMPT:
          await this.handleSavePrompt(request, sendResponse);
          break;

        case MESSAGE_TYPES.DELETE_PROMPT:
          await this.handleDeletePrompt(request, sendResponse);
          break;

        case MESSAGE_TYPES.SET_DEFAULT_PROMPT:
          await this.handleSetDefaultPrompt(request, sendResponse);
          break;

        case MESSAGE_TYPES.GET_CONFIG:
          await this.handleGetConfig(sendResponse);
          break;

        case MESSAGE_TYPES.SAVE_CONFIG:
          await this.handleSaveConfig(request, sendResponse);
          break;

        case MESSAGE_TYPES.OPEN_OPTIONS_PAGE:
          await this.handleOpenOptionsPage(sendResponse);
          break;

        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: (error as Error).message });
    }
  }

  private async handleAnalyzeContent(
    request: AnalysisRequest,
    sendResponse: (response: AnalysisResponse) => void
  ): Promise<void> {
    try {
      const prompts = await storage.getPrompts();
      const prompt = prompts.find(p => p.id === request.promptId);
      
      if (!prompt) {
        sendResponse({ success: false, error: 'Prompt not found' });
        return;
      }

      // Replace {{ source }} placeholder with appropriate source type
      const processedPrompt = this.replaceSourcePlaceholder(prompt.prompt, request.url);

      const result = await this.geminiClient.analyzeContent(request.content, processedPrompt);
      sendResponse({ success: true, data: result });
    } catch (error) {
      console.error('Analysis failed:', error);
      sendResponse({ success: false, error: (error as Error).message });
    }
  }

  private async handleGetPrompts(sendResponse: (response: any) => void): Promise<void> {
    try {
      const prompts = await storage.getPrompts();
      sendResponse({ success: true, data: prompts });
    } catch (error) {
      sendResponse({ success: false, error: (error as Error).message });
    }
  }

  private async handleSavePrompt(request: any, sendResponse: (response: any) => void): Promise<void> {
    try {
      await storage.savePrompt(request.prompt);
      sendResponse({ success: true });
    } catch (error) {
      sendResponse({ success: false, error: (error as Error).message });
    }
  }

  private async handleDeletePrompt(request: any, sendResponse: (response: any) => void): Promise<void> {
    try {
      await storage.deletePrompt(request.promptId);
      sendResponse({ success: true });
    } catch (error) {
      sendResponse({ success: false, error: (error as Error).message });
    }
  }

  private async handleSetDefaultPrompt(request: any, sendResponse: (response: any) => void): Promise<void> {
    try {
      await storage.setDefaultPrompt(request.promptId);
      sendResponse({ success: true });
    } catch (error) {
      sendResponse({ success: false, error: (error as Error).message });
    }
  }

  private async handleGetConfig(sendResponse: (response: any) => void): Promise<void> {
    try {
      const config = await storage.getConfig({ source: 'background', action: 'read', timestamp: Date.now() });
      sendResponse({ success: true, data: config });
    } catch (error) {
      sendResponse({ success: false, error: (error as Error).message });
    }
  }

  private async handleSaveConfig(request: any, sendResponse: (response: any) => void): Promise<void> {
    try {
      await storage.saveConfig(request.config, { source: 'background', action: 'write', timestamp: Date.now() });
      sendResponse({ success: true });
    } catch (error) {
      sendResponse({ success: false, error: (error as Error).message });
    }
  }

  private async handleOpenOptionsPage(sendResponse: (response: any) => void): Promise<void> {
    try {
      await chrome.runtime.openOptionsPage();
      sendResponse({ success: true });
    } catch (error) {
      sendResponse({ success: false, error: (error as Error).message });
    }
  }

  private replaceSourcePlaceholder(prompt: string, url: string): string {
    const sourceType = this.detectSourceType(url);
    return prompt.replace(/\{\{\s*source\s*\}\}/g, sourceType);
  }

  private detectSourceType(url: string): string {
    if (url.includes('news.ycombinator.com')) {
      return 'HackerNews thread';
    } else if (url.includes('reddit.com')) {
      return 'Reddit thread';
    } else if (url.includes('twitter.com') || url.includes('x.com')) {
      return 'Twitter thread';
    } else {
      return 'text';
    }
  }
}