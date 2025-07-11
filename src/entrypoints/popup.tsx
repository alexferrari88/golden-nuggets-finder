import { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { storage } from "../shared/storage";
import { SavedPrompt, MESSAGE_TYPES } from "../shared/types";
import { colors, typography, spacing, borderRadius, shadows, components } from "../shared/design-system";

function IndexPopup() {
  const [prompts, setPrompts] = useState<SavedPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noApiKey, setNoApiKey] = useState(false);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState<'quick' | 'custom'>('quick');

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      setLoading(true);
      setError(null);
      setNoApiKey(false);

      // Check if API key is configured
      const apiKey = await storage.getApiKey({ source: 'popup', action: 'read', timestamp: Date.now() });
      if (!apiKey) {
        setNoApiKey(true);
        setLoading(false);
        return;
      }

      // Load prompts
      const userPrompts = await storage.getPrompts();
      
      // Sort prompts to show default first
      const sortedPrompts = [...userPrompts].sort((a, b) => {
        if (a.isDefault && !b.isDefault) return -1;
        if (!a.isDefault && b.isDefault) return 1;
        return a.name.localeCompare(b.name);
      });

      setPrompts(sortedPrompts);
    } catch (err) {
      console.error('Failed to load prompts:', err);
      setError('Failed to load prompts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const analyzeWithPrompt = async (promptId: string) => {
    try {
      // Find the prompt name for better UX
      const prompt = prompts.find(p => p.id === promptId);
      const promptName = prompt?.name || 'Unknown';
      
      // Show immediate feedback
      setAnalyzing(promptName);
      
      // Get the current active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.id) {
        throw new Error('No active tab found');
      }

      // Inject content script dynamically
      await injectContentScript(tab.id);
      
      // Send message to content script
      await chrome.tabs.sendMessage(tab.id, {
        type: MESSAGE_TYPES.ANALYZE_CONTENT,
        promptId: promptId
      });
      
      // Listen for analysis completion
      const listener = (message: any) => {
        if (message.type === MESSAGE_TYPES.ANALYSIS_COMPLETE || message.type === MESSAGE_TYPES.ANALYSIS_ERROR) {
          chrome.runtime.onMessage.removeListener(listener);
          window.close();
        }
      };
      chrome.runtime.onMessage.addListener(listener);
    } catch (err) {
      console.error('Failed to start analysis:', err);
      setAnalyzing(null);
      setError('Failed to start analysis. Please try again.');
    }
  };

  const enterSelectionMode = async (promptId: string) => {
    try {
      // Find the prompt name for better UX
      const prompt = prompts.find(p => p.id === promptId);
      const promptName = prompt?.name || 'Unknown';
      
      // Show immediate feedback
      setAnalyzing(promptName);
      
      // Get the current active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.id) {
        throw new Error('No active tab found');
      }

      // Inject content script dynamically
      await injectContentScript(tab.id);
      
      // Send message to content script to enter selection mode
      await chrome.tabs.sendMessage(tab.id, {
        type: MESSAGE_TYPES.ENTER_SELECTION_MODE,
        promptId: promptId
      });
      
      // Close popup immediately since user needs to interact with page
      window.close();
    } catch (err) {
      console.error('Failed to enter selection mode:', err);
      setAnalyzing(null);
      setError('Failed to enter selection mode. Please try again.');
    }
  };

  const injectContentScript = async (tabId: number): Promise<void> => {
    try {
      // Check if content script is already injected by trying to send a test message
      const testResponse = await chrome.tabs.sendMessage(tabId, { type: 'PING' }).catch(() => null);
      
      if (testResponse) {
        // Content script already exists
        return;
      }

      // Inject the content script
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content-injector.js']
      });
    } catch (error) {
      console.error('Failed to inject content script:', error);
      throw error;
    }
  };

  const openOptionsPage = () => {
    chrome.runtime.openOptionsPage();
    window.close();
  };

  if (loading) {
    return (
      <div style={{ 
        width: '320px', 
        padding: spacing['2xl'], 
        textAlign: 'center',
        fontFamily: typography.fontFamily.sans,
        backgroundColor: colors.background.primary
      }}>
        <div style={{ 
          color: colors.text.primary,
          fontSize: typography.fontSize.sm,
          fontWeight: typography.fontWeight.medium,
          marginBottom: spacing.lg
        }}>
          Loading prompts...
        </div>
        <div style={{ 
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: spacing.xs
        }}>
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: colors.text.secondary,
            animation: 'pulse 1.5s ease-in-out infinite'
          }}></div>
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: colors.text.secondary,
            animation: 'pulse 1.5s ease-in-out infinite 0.2s'
          }}></div>
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: colors.text.secondary,
            animation: 'pulse 1.5s ease-in-out infinite 0.4s'
          }}></div>
        </div>
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 0.3; transform: scale(0.8); }
            50% { opacity: 1; transform: scale(1.2); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        width: '320px', 
        padding: spacing['2xl'],
        fontFamily: typography.fontFamily.sans,
        backgroundColor: colors.background.primary
      }}>
        <div style={{ 
          textAlign: 'center', 
          color: colors.error,
          backgroundColor: colors.background.secondary,
          border: `1px solid ${colors.error}33`,
          borderRadius: borderRadius.md,
          padding: spacing['2xl'],
          fontSize: typography.fontSize.sm,
          fontWeight: typography.fontWeight.medium
        }}>
          {error}
        </div>
      </div>
    );
  }

  if (noApiKey) {
    return (
      <div style={{ 
        width: '320px', 
        padding: spacing['2xl'],
        fontFamily: typography.fontFamily.sans,
        backgroundColor: colors.background.primary
      }}>
        <div style={{ 
          textAlign: 'center', 
          color: colors.text.primary,
          backgroundColor: colors.background.secondary,
          border: `1px solid ${colors.text.secondary}33`,
          borderRadius: borderRadius.md,
          padding: spacing['2xl'],
          fontSize: typography.fontSize.sm,
          fontWeight: typography.fontWeight.medium,
          lineHeight: typography.lineHeight.normal
        }}>
          Please set your Gemini API key in the{' '}
          <button 
            onClick={openOptionsPage}
            style={{
              ...components.button.ghost,
              padding: '0',
              color: colors.text.accent,
              textDecoration: 'underline',
              fontSize: 'inherit',
              fontWeight: 'inherit'
            }}
          >
            options page
          </button>
          .
        </div>
      </div>
    );
  }

  if (analyzing) {
    return (
      <div style={{ 
        width: '320px', 
        minHeight: '200px',
        padding: spacing['2xl'], 
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        fontFamily: typography.fontFamily.sans,
        backgroundColor: colors.background.primary
      }}>
        <div style={{ 
          color: colors.text.primary,
          fontSize: typography.fontSize.sm,
          fontWeight: typography.fontWeight.medium,
          marginBottom: spacing.md
        }}>
          Starting analysis with
        </div>
        <div style={{ 
          color: colors.text.accent,
          fontSize: typography.fontSize.base,
          fontWeight: typography.fontWeight.semibold,
          marginBottom: spacing.lg
        }}>
          {analyzing}
        </div>
        <div style={{ 
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: spacing.xs
        }}>
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: colors.text.accent,
            animation: 'pulse 1.5s ease-in-out infinite'
          }}></div>
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: colors.text.accent,
            animation: 'pulse 1.5s ease-in-out infinite 0.2s'
          }}></div>
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: colors.text.accent,
            animation: 'pulse 1.5s ease-in-out infinite 0.4s'
          }}></div>
        </div>
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 0.3; transform: scale(0.8); }
            50% { opacity: 1; transform: scale(1.2); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ 
      width: '320px', 
      fontFamily: typography.fontFamily.sans,
      backgroundColor: colors.background.primary,
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
      boxShadow: shadows.lg
    }}>
      <div style={{ 
        backgroundColor: colors.background.primary,
        color: colors.text.primary,
        padding: spacing['2xl'],
        textAlign: 'center',
        borderBottom: `1px solid ${colors.border.light}`
      }}>
        <h1 style={{ 
          margin: 0, 
          fontSize: typography.fontSize.lg,
          fontWeight: typography.fontWeight.semibold,
          color: colors.text.primary,
          marginBottom: spacing.md
        }}>
          Golden Nugget Finder
        </h1>
        
        {/* Mode Toggle */}
        <div style={{
          display: 'flex',
          backgroundColor: colors.background.secondary,
          borderRadius: borderRadius.md,
          padding: spacing.xs,
          gap: spacing.xs
        }}>
          <button
            onClick={() => setSelectionMode('quick')}
            style={{
              flex: 1,
              padding: `${spacing.sm} ${spacing.md}`,
              backgroundColor: selectionMode === 'quick' ? colors.background.primary : 'transparent',
              color: selectionMode === 'quick' ? colors.text.primary : colors.text.secondary,
              border: 'none',
              borderRadius: borderRadius.sm,
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.medium,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: selectionMode === 'quick' ? shadows.sm : 'none'
            }}
          >
            Quick Analysis
          </button>
          <button
            onClick={() => setSelectionMode('custom')}
            style={{
              flex: 1,
              padding: `${spacing.sm} ${spacing.md}`,
              backgroundColor: selectionMode === 'custom' ? colors.background.primary : 'transparent',
              color: selectionMode === 'custom' ? colors.text.primary : colors.text.secondary,
              border: 'none',
              borderRadius: borderRadius.sm,
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.medium,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: selectionMode === 'custom' ? shadows.sm : 'none'
            }}
          >
            Custom Selection
          </button>
        </div>
      </div>
      
      <div style={{ 
        padding: spacing['2xl'],
        backgroundColor: colors.background.primary
      }}>
        <div style={{ 
          listStyle: 'none', 
          padding: 0, 
          margin: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: spacing.sm
        }}>
          {prompts.map(prompt => (
            <div 
              key={prompt.id}
              onClick={() => selectionMode === 'quick' ? analyzeWithPrompt(prompt.id) : enterSelectionMode(prompt.id)}
              style={{
                padding: spacing.lg,
                backgroundColor: prompt.isDefault ? colors.background.secondary : colors.background.secondary,
                border: `1px solid ${prompt.isDefault ? colors.text.accent + '33' : colors.border.light}`,
                borderRadius: borderRadius.md,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.medium,
                color: colors.text.primary
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = prompt.isDefault ? colors.background.secondary : colors.background.secondary;
                e.currentTarget.style.borderColor = colors.border.default;
                e.currentTarget.style.boxShadow = shadows.sm;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = prompt.isDefault ? colors.background.secondary : colors.background.secondary;
                e.currentTarget.style.borderColor = prompt.isDefault ? colors.text.accent + '33' : colors.border.light;
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: spacing.xs }}>
                <span style={{ 
                  fontWeight: typography.fontWeight.medium,
                  color: colors.text.primary
                }}>
                  {prompt.name}
                </span>
                {selectionMode === 'custom' && (
                  <span style={{ 
                    fontSize: typography.fontSize.xs,
                    color: colors.text.secondary,
                    fontWeight: typography.fontWeight.normal
                  }}>
                    Select & Analyze
                  </span>
                )}
              </div>
              {prompt.isDefault && (
                <span style={{ 
                  backgroundColor: colors.text.accent,
                  color: colors.background.primary,
                  padding: `${spacing.xs} ${spacing.sm}`,
                  borderRadius: borderRadius.sm,
                  fontSize: typography.fontSize.xs,
                  fontWeight: typography.fontWeight.medium
                }}>
                  ★
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
      
      <div style={{ 
        padding: spacing['2xl'],
        backgroundColor: colors.background.secondary,
        borderTop: `1px solid ${colors.border.light}`,
        textAlign: 'center'
      }}>
        <button 
          onClick={openOptionsPage}
          style={{
            ...components.button.ghost,
            color: colors.text.accent,
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.medium
          }}
        >
          Manage Prompts & Settings
        </button>
      </div>
    </div>
  );
}

export default {
  main() {
    const root = ReactDOM.createRoot(document.getElementById('root')!);
    root.render(<IndexPopup />);
  }
};