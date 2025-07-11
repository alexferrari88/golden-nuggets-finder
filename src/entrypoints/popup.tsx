import { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";
import { storage } from "../shared/storage";
import { SavedPrompt, MESSAGE_TYPES } from "../shared/types";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { cn } from "../lib/utils";
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
      <div className="w-80 p-8 text-center font-sans bg-white">
        <div className="text-gray-800 text-sm font-medium mb-4">
          Loading prompts...
        </div>
        <div className="flex justify-center items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-pulse [animation-delay:0s]" />
          <div className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-pulse [animation-delay:0.2s]" />
          <div className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-pulse [animation-delay:0.4s]" />
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
      <div className="w-80 p-8 font-sans bg-white">
        <div className="text-center text-red-600 bg-gray-50 border border-red-200 rounded-md p-8 text-sm font-medium">
          {error}
        </div>
      </div>
    );
  }

  if (noApiKey) {
    return (
      <div className="w-80 p-8 font-sans bg-white">
        <div className="text-center text-gray-800 bg-gray-50 border border-gray-200 rounded-md p-8 text-sm font-medium leading-normal">
          Please set your Gemini API key in the{' '}
          <Button 
            variant="link"
            onClick={openOptionsPage}
            className="p-0 h-auto text-sm font-medium text-gray-900 underline"
          >
            options page
          </Button>
          .
        </div>
      </div>
    );
  }

  if (analyzing) {
    return (
      <div className="w-80 min-h-60 p-8 flex flex-col gap-4 font-sans bg-white">
        {/* Header with AI avatar and typing text */}
        <div className="flex items-center gap-1 mb-3">
          {/* AI Avatar */}
          <div className="w-4 h-4 rounded-full bg-gray-900 shadow-lg shadow-gray-900/25 flex-shrink-0" />
          
          {/* Typing text */}
          <div className="text-gray-800 text-sm font-medium flex-1">
            {displayText}
            {showCursor && <span className="opacity-70 ml-0.5">|</span>}
          </div>
        </div>

        {/* Analysis steps */}
        <div className="flex flex-col gap-1 mb-3">
          {analysisSteps.map((step, index) => {
            const isVisible = visibleSteps.includes(index);
            const isInProgress = currentStep === index;
            const isCompleted = completedSteps.includes(index);
            
            let indicator = '○';
            let indicatorClasses = 'text-gray-400';
            let textClasses = 'text-gray-400';
            let animationClasses = '';
            
            if (isCompleted) {
              indicator = <Check size={16} />;
              indicatorClasses = 'text-gray-900';
              textClasses = 'text-gray-800';
            } else if (isInProgress) {
              indicator = '●';
              indicatorClasses = 'text-gray-900';
              textClasses = 'text-gray-500';
              animationClasses = 'animate-pulse';
            }
            
            return (
              <div
                key={step.id}
                className={cn(
                  'flex items-center gap-2 transition-all duration-300',
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2.5'
                )}
              >
                <div className={cn(
                  'text-sm font-medium w-4 text-center flex-shrink-0',
                  indicatorClasses,
                  animationClasses
                )}>
                  {indicator}
                </div>
                <div className={cn('text-sm font-normal', textClasses)}>
                  {step.text}
                </div>
              </div>
            );
          })}
        </div>

        {/* Prompt display */}
        <div className="text-center pt-3 border-t border-gray-100">
          <div className="text-gray-400 text-xs font-normal mb-1">
            Using:
          </div>
          <div className="text-gray-900 text-sm font-semibold">
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
    <div className="w-80 font-sans bg-white rounded-lg overflow-hidden shadow-lg">
      <div className="bg-white text-gray-800 p-8 text-center border-b border-gray-100">
        <h1 className="m-0 text-lg font-semibold text-gray-800 mb-3">
          Golden Nugget Finder
        </h1>
        
        {/* Mode Toggle */}
        <div className="flex bg-gray-50 rounded-md p-1 gap-1">
          <button
            onClick={() => setSelectionMode('quick')}
            className={cn(
              'flex-1 px-3 py-2 border-none rounded-sm text-sm font-medium cursor-pointer transition-all duration-200',
              selectionMode === 'quick' 
                ? 'bg-white text-gray-800 shadow-sm' 
                : 'bg-transparent text-gray-500'
            )}
          >
            Quick Analysis
          </button>
          <button
            onClick={() => setSelectionMode('custom')}
            className={cn(
              'flex-1 px-3 py-2 border-none rounded-sm text-sm font-medium cursor-pointer transition-all duration-200',
              selectionMode === 'custom' 
                ? 'bg-white text-gray-800 shadow-sm' 
                : 'bg-transparent text-gray-500'
            )}
          >
            Custom Selection
          </button>
        </div>
      </div>
      
      <div className="p-8 bg-white">
        <div className="list-none p-0 m-0 flex flex-col gap-2">
          {prompts.map(prompt => (
            <Card 
              key={prompt.id}
              className={cn(
                'cursor-pointer transition-all duration-200 hover:shadow-sm',
                prompt.isDefault 
                  ? 'border-gray-900/20 bg-gray-50' 
                  : 'border-gray-100 bg-gray-50'
              )}
              onClick={() => selectionMode === 'quick' ? analyzeWithPrompt(prompt.id) : enterSelectionMode(prompt.id)}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex flex-col items-start gap-1">
                  <span className="font-medium text-gray-800">
                    {prompt.name}
                  </span>
                  {selectionMode === 'custom' && (
                    <span className="text-xs text-gray-500 font-normal">
                      Select & Analyze
                    </span>
                  )}
                </div>
                {prompt.isDefault && (
                  <Badge className="bg-gray-900 text-white text-xs font-medium">
                    <Star size={16} />
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      
      <div className="p-8 bg-gray-50 border-t border-gray-100 text-center">
        <Button 
          variant="ghost"
          onClick={openOptionsPage}
          className="text-gray-900 text-sm font-medium hover:bg-gray-100"
        >
          Manage Prompts & Settings
        </Button>
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