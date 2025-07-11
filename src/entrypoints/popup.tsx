import { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";
import { storage } from "../shared/storage";
import { SavedPrompt, MESSAGE_TYPES } from "../shared/types";
import { colors, typography, spacing, borderRadius, shadows, components } from "../shared/design-system";
import { Check, Star } from "lucide-react";

// Custom hook for typing effect
const useTypingEffect = (text: string, speed: number = 80) => {
  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [showCursor, setShowCursor] = useState(false);

  useEffect(() => {
    let index = 0;
    setDisplayText('');
    setIsComplete(false);
    setShowCursor(false);

    const timer = setInterval(() => {
      if (index < text.length) {
        setDisplayText(text.substring(0, index + 1));
        index++;
      } else {
        setShowCursor(true);
        setTimeout(() => {
          setShowCursor(false);
          setIsComplete(true);
        }, 500);
        clearInterval(timer);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed]);

  return { displayText, isComplete, showCursor };
};

// Custom hook for step progression
const useStepProgression = (isTypingComplete: boolean) => {
  const [currentStep, setCurrentStep] = useState(-1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [visibleSteps, setVisibleSteps] = useState<number[]>([]);
  const timersRef = useRef<NodeJS.Timeout[]>([]);

  // Function to complete all remaining steps immediately
  const completeAllSteps = () => {
    // Clear all running timers
    timersRef.current.forEach(timer => clearTimeout(timer));
    timersRef.current = [];
    
    // Complete all steps immediately
    setCompletedSteps([0, 1, 2, 3]);
    setCurrentStep(-1);
  };

  // Listen for API completion messages
  useEffect(() => {
    const messageListener = (message: any) => {
      if (message.type === 'ANALYSIS_COMPLETE' || message.type === 'ANALYSIS_ERROR') {
        completeAllSteps();
      }
    };
    
    chrome.runtime.onMessage.addListener(messageListener);
    
    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
      // Clean up timers on unmount
      timersRef.current.forEach(timer => clearTimeout(timer));
    };
  }, []);

  useEffect(() => {
    if (!isTypingComplete) return;

    const progressSteps = async () => {
      // Clear any existing timers
      timersRef.current.forEach(timer => clearTimeout(timer));
      timersRef.current = [];
      
      // First, make steps visible with staggered animation
      for (let i = 0; i < 4; i++) {
        await new Promise(resolve => setTimeout(resolve, 300));
        setVisibleSteps(prev => [...prev, i]);
      }
      
      // Start step animations with staggered delays
      const startStep = (stepIndex: number, delay: number, duration: number) => {
        const timer = setTimeout(() => {
          setCurrentStep(stepIndex);
          const completeTimer = setTimeout(() => {
            setCompletedSteps(prev => {
              if (!prev.includes(stepIndex)) {
                return [...prev, stepIndex];
              }
              return prev;
            });
            if (stepIndex < 3) {
              setCurrentStep(-1);
            }
          }, duration);
          timersRef.current.push(completeTimer);
        }, delay);
        timersRef.current.push(timer);
      };
      
      // Start steps with realistic timing
      startStep(0, 0, 4000);     // Extract: start immediately, run 4s
      startStep(1, 2000, 4000);  // Patterns: start after 2s, run 4s
      startStep(2, 4000, 4000);  // Generate: start after 4s, run 4s
      startStep(3, 6000, 8000);  // Finalize: start after 6s, run 8s (will be interrupted)
    };

    progressSteps();
  }, [isTypingComplete]);

  return { currentStep, completedSteps, visibleSteps };
};

function IndexPopup() {
  const [prompts, setPrompts] = useState<SavedPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noApiKey, setNoApiKey] = useState(false);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState<'quick' | 'custom'>('quick');

  // Analysis steps data
  const analysisSteps = [
    { id: 'extract', text: 'Extracting key insights' },
    { id: 'patterns', text: 'Identifying patterns' },
    { id: 'generate', text: 'Generating golden nuggets' },
    { id: 'finalize', text: 'Finalizing analysis' }
  ];

  // Use custom hooks for loading animation
  const { displayText, isComplete, showCursor } = useTypingEffect(analyzing ? 'Analyzing your content...' : '', 80);
  const { currentStep, completedSteps, visibleSteps } = useStepProgression(isComplete);

  useEffect(() => {
    loadPrompts();
    
    // Add message listener for analysis completion
    const messageListener = (message: any) => {
      if (message.type === MESSAGE_TYPES.ANALYSIS_COMPLETE) {
        // Brief delay to show completion, then clear analyzing state
        setTimeout(() => {
          setAnalyzing(null);
        }, 600);
      } else if (message.type === MESSAGE_TYPES.ANALYSIS_ERROR) {
        setAnalyzing(null); // Clear analyzing state immediately on error
      }
    };
    
    chrome.runtime.onMessage.addListener(messageListener);
    
    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
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
      
      // Wait for content script to be ready with retries
      let attempts = 0;
      const maxAttempts = 10;
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100));
        try {
          const response = await chrome.tabs.sendMessage(tabId, { type: 'PING' });
          if (response && response.success) {
            break;
          }
        } catch (error) {
          // Still not ready, continue trying
        }
        attempts++;
      }
      
      if (attempts >= maxAttempts) {
        throw new Error('Content script failed to initialize after injection');
      }
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
        minHeight: '240px',
        padding: spacing['2xl'], 
        display: 'flex',
        flexDirection: 'column',
        gap: spacing.lg,
        fontFamily: typography.fontFamily.sans,
        backgroundColor: colors.background.primary
      }}>
        {/* Header with AI avatar and typing text */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing.xs,
          marginBottom: spacing.md
        }}>
          {/* AI Avatar */}
          <div style={{
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            background: colors.text.accent,
            boxShadow: `0 0 8px ${colors.text.accent}40`,
            flexShrink: 0
          }} />
          
          {/* Typing text */}
          <div style={{
            color: colors.text.primary,
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.medium,
            flex: 1
          }}>
            {displayText}
            {showCursor && <span style={{ opacity: 0.7, marginLeft: '2px' }}>|</span>}
          </div>
        </div>

        {/* Analysis steps */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: spacing.xs,
          marginBottom: spacing.md
        }}>
          {analysisSteps.map((step, index) => {
            const isVisible = visibleSteps.includes(index);
            const isInProgress = currentStep === index;
            const isCompleted = completedSteps.includes(index);
            
            let indicator = '○';
            let indicatorColor = colors.text.tertiary;
            let textColor = colors.text.tertiary;
            let indicatorAnimation = 'none';
            
            if (isCompleted) {
              indicator = <Check size={16} />;
              indicatorColor = colors.text.accent;
              textColor = colors.text.primary;
            } else if (isInProgress) {
              indicator = '●';
              indicatorColor = colors.text.accent;
              textColor = colors.text.secondary;
              indicatorAnimation = 'pulse 1s ease-in-out infinite';
            }
            
            return (
              <div
                key={step.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.sm,
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? 'translateY(0)' : 'translateY(10px)',
                  transition: 'all 0.3s ease'
                }}
              >
                <div style={{
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.medium,
                  color: indicatorColor,
                  width: '16px',
                  textAlign: 'center',
                  flexShrink: 0,
                  animation: indicatorAnimation
                }}>
                  {indicator}
                </div>
                <div style={{
                  fontSize: typography.fontSize.sm,
                  color: textColor,
                  fontWeight: typography.fontWeight.normal
                }}>
                  {step.text}
                </div>
              </div>
            );
          })}
        </div>

        {/* Prompt display */}
        <div style={{
          textAlign: 'center',
          paddingTop: spacing.md,
          borderTop: `1px solid ${colors.border.light}`
        }}>
          <div style={{
            color: colors.text.tertiary,
            fontSize: typography.fontSize.xs,
            fontWeight: typography.fontWeight.normal,
            marginBottom: spacing.xs
          }}>
            Using:
          </div>
          <div style={{
            color: colors.text.accent,
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.semibold
          }}>
            {analyzing}
          </div>
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
                  <Star size={16} />
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