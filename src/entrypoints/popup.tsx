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
            backgroundColor: colors.text.tertiary,
            animation: 'pulse 1.5s ease-in-out infinite'
          }}></div>
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: colors.text.tertiary,
            animation: 'pulse 1.5s ease-in-out infinite 0.2s'
          }}></div>
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: colors.text.tertiary,
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
          color: colors.accent.red,
          backgroundColor: colors.accent.redLight,
          border: `1px solid ${colors.accent.red}33`,
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
          backgroundColor: colors.accent.amberLight,
          border: `1px solid ${colors.accent.amber}33`,
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
        padding: spacing['2xl'], 
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
            backgroundColor: colors.accent.blue,
            animation: 'pulse 1.5s ease-in-out infinite'
          }}></div>
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: colors.accent.blue,
            animation: 'pulse 1.5s ease-in-out infinite 0.2s'
          }}></div>
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: colors.accent.blue,
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
          color: colors.text.primary
        }}>
          Golden Nugget Finder
        </h1>
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
              onClick={() => analyzeWithPrompt(prompt.id)}
              style={{
                padding: spacing.lg,
                backgroundColor: prompt.isDefault ? colors.accent.blueLight : colors.background.secondary,
                border: `1px solid ${prompt.isDefault ? colors.accent.blue + '33' : colors.border.light}`,
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
                e.currentTarget.style.backgroundColor = prompt.isDefault ? colors.accent.blueLight : colors.background.tertiary;
                e.currentTarget.style.borderColor = colors.border.medium;
                e.currentTarget.style.boxShadow = shadows.sm;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = prompt.isDefault ? colors.accent.blueLight : colors.background.secondary;
                e.currentTarget.style.borderColor = prompt.isDefault ? colors.accent.blue + '33' : colors.border.light;
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <span style={{ 
                fontWeight: typography.fontWeight.medium,
                color: colors.text.primary
              }}>
                {prompt.name}
              </span>
              {prompt.isDefault && (
                <span style={{ 
                  backgroundColor: colors.accent.blue,
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