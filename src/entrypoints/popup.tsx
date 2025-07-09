import { useState, useEffect } from "react";
import { storage } from "../shared/storage";
import { SavedPrompt, MESSAGE_TYPES } from "../shared/types";

function IndexPopup() {
  const [prompts, setPrompts] = useState<SavedPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noApiKey, setNoApiKey] = useState(false);

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      setLoading(true);
      setError(null);
      setNoApiKey(false);

      // Check if API key is configured
      const apiKey = await storage.getApiKey();
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
      
      // Close popup
      window.close();
    } catch (err) {
      console.error('Failed to start analysis:', err);
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
      <div style={{ width: '300px', padding: '20px', textAlign: 'center' }}>
        <div style={{ color: '#6c757d' }}>Loading prompts...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ width: '300px', padding: '20px' }}>
        <div style={{ 
          textAlign: 'center', 
          color: '#dc3545',
          background: '#f8d7da',
          border: '1px solid #f5c6cb',
          borderRadius: '4px',
          padding: '20px'
        }}>
          {error}
        </div>
      </div>
    );
  }

  if (noApiKey) {
    return (
      <div style={{ width: '300px', padding: '20px' }}>
        <div style={{ 
          textAlign: 'center', 
          color: '#856404',
          background: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '4px',
          padding: '20px'
        }}>
          Please set your Gemini API key in the{' '}
          <button 
            onClick={openOptionsPage}
            style={{
              background: 'none',
              border: 'none',
              color: '#007bff',
              textDecoration: 'underline',
              cursor: 'pointer'
            }}
          >
            options page
          </button>
          .
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '300px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <div style={{ 
        background: '#007bff', 
        color: 'white', 
        padding: '16px', 
        textAlign: 'center' 
      }}>
        <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
          Golden Nugget Finder
        </h1>
      </div>
      
      <div style={{ padding: '16px', background: 'white' }}>
        <div style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {prompts.map(prompt => (
            <div 
              key={prompt.id}
              onClick={() => analyzeWithPrompt(prompt.id)}
              style={{
                padding: '12px',
                marginBottom: '8px',
                background: prompt.isDefault ? '#fff3cd' : '#f8f9fa',
                border: prompt.isDefault ? '1px solid #ffc107' : '1px solid #e9ecef',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <span style={{ fontWeight: 500, color: '#495057' }}>
                {prompt.name}
              </span>
              {prompt.isDefault && (
                <span style={{ color: '#ffc107', fontSize: '16px' }}>★</span>
              )}
            </div>
          ))}
        </div>
      </div>
      
      <div style={{ 
        padding: '16px', 
        background: '#f8f9fa', 
        borderTop: '1px solid #e9ecef',
        textAlign: 'center'
      }}>
        <button 
          onClick={openOptionsPage}
          style={{
            background: 'none',
            border: 'none',
            color: '#007bff',
            textDecoration: 'none',
            fontSize: '13px',
            cursor: 'pointer'
          }}
        >
          Manage Prompts & Settings
        </button>
      </div>
    </div>
  );
}

export default IndexPopup;