import { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { SavedPrompt } from '../shared/types';
import { storage } from '../shared/storage';
import { GeminiClient } from '../background/gemini-client';

function OptionsPage() {
  const [apiKey, setApiKey] = useState('');
  const [apiKeyStatus, setApiKeyStatus] = useState<string>('');
  const [prompts, setPrompts] = useState<SavedPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<SavedPrompt | null>(null);
  const [promptName, setPromptName] = useState('');
  const [promptText, setPromptText] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [savedApiKey, savedPrompts] = await Promise.all([
        storage.getApiKey(),
        storage.getPrompts()
      ]);
      setApiKey(savedApiKey);
      setPrompts(savedPrompts);
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const saveApiKey = async () => {
    try {
      setApiKeyStatus('Validating...');
      
      // Validate API key
      const client = new GeminiClient(apiKey);
      await client.validateApiKey();
      
      // Save if valid
      await storage.saveApiKey(apiKey);
      setApiKeyStatus('API key saved and validated successfully!');
      
      setTimeout(() => setApiKeyStatus(''), 3000);
    } catch (err) {
      setApiKeyStatus('Invalid API key. Please check and try again.');
    }
  };

  const openPromptEditor = (prompt?: SavedPrompt) => {
    setEditingPrompt(prompt || null);
    setPromptName(prompt?.name || '');
    setPromptText(prompt?.prompt || '');
    setIsEditing(true);
  };

  const savePrompt = async () => {
    if (!promptName.trim() || !promptText.trim()) {
      alert('Please fill in both name and prompt text');
      return;
    }

    try {
      const prompt: SavedPrompt = {
        id: editingPrompt?.id || Date.now().toString(),
        name: promptName.trim(),
        prompt: promptText.trim(),
        isDefault: editingPrompt?.isDefault || false
      };

      await storage.savePrompt(prompt);
      await loadData();
      setIsEditing(false);
      setEditingPrompt(null);
      setPromptName('');
      setPromptText('');
    } catch (err) {
      alert('Failed to save prompt');
    }
  };

  const deletePrompt = async (promptId: string) => {
    if (confirm('Are you sure you want to delete this prompt?')) {
      try {
        await storage.deletePrompt(promptId);
        await loadData();
      } catch (err) {
        alert('Failed to delete prompt');
      }
    }
  };

  const setDefaultPrompt = async (promptId: string) => {
    try {
      await storage.setDefaultPrompt(promptId);
      await loadData();
    } catch (err) {
      alert('Failed to set default prompt');
    }
  };

  if (loading) {
    return <div style={{ 
      padding: '48px', 
      textAlign: 'center',
      color: '#6b7280',
      fontSize: '14px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>Loading...</div>;
  }

  if (error) {
    return <div style={{ 
      padding: '32px', 
      color: '#dc2626', 
      backgroundColor: '#fef2f2',
      borderRadius: '0px',
      border: '1px solid #fecaca',
      margin: '20px',
      fontSize: '14px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>{error}</div>;
  }

  return (
    <div style={{ 
      maxWidth: '800px', 
      margin: '0 auto', 
      padding: '40px 20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      backgroundColor: '#ffffff',
      minHeight: '100vh'
    }}>
      <h1 style={{ 
        color: '#111827', 
        marginBottom: '48px',
        fontSize: '32px',
        fontWeight: '300',
        letterSpacing: '-0.025em'
      }}>Settings</h1>
      
      {/* API Key Section */}
      <div style={{ 
        marginBottom: '48px',
        backgroundColor: '#ffffff',
        padding: '32px',
        border: '1px solid #e5e7eb',
        borderRadius: '2px'
      }}>
        <h2 style={{ 
          color: '#374151', 
          marginBottom: '24px',
          fontSize: '16px',
          fontWeight: '500',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>API Key</h2>
        <div style={{ marginBottom: '16px' }}>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your Gemini API key"
            style={{
              width: '400px',
              padding: '14px',
              marginRight: '16px',
              border: '1px solid #d1d5db',
              borderRadius: '0px',
              fontSize: '14px',
              backgroundColor: '#ffffff',
              color: '#111827',
              fontFamily: 'inherit'
            }}
          />
          <button onClick={saveApiKey} style={{
            padding: '14px 28px',
            backgroundColor: '#111827',
            color: 'white',
            border: 'none',
            borderRadius: '0px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '400',
            transition: 'background-color 0.2s',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            Save
          </button>
        </div>
        {apiKeyStatus && (
          <div style={{
            padding: '16px',
            backgroundColor: apiKeyStatus.includes('Invalid') ? '#fef2f2' : '#f9fafb',
            color: apiKeyStatus.includes('Invalid') ? '#dc2626' : '#374151',
            borderRadius: '0px',
            marginTop: '16px',
            border: `1px solid ${apiKeyStatus.includes('Invalid') ? '#fecaca' : '#e5e7eb'}`,
            fontSize: '14px'
          }}>
            {apiKeyStatus}
          </div>
        )}
      </div>

      {/* Prompts Section */}
      <div style={{ 
        backgroundColor: '#ffffff',
        padding: '32px',
        border: '1px solid #e5e7eb',
        borderRadius: '2px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <h2 style={{ 
            color: '#374151', 
            margin: '0',
            fontSize: '16px',
            fontWeight: '500',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>Prompts</h2>
          <button onClick={() => openPromptEditor()} style={{
            padding: '12px 24px',
            backgroundColor: '#111827',
            color: 'white',
            border: 'none',
            borderRadius: '0px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '400',
            transition: 'background-color 0.2s',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            Add New
          </button>
        </div>
        
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '2px' }}>
          {prompts.map((prompt) => (
            <div key={prompt.id} style={{
              padding: '24px',
              borderBottom: '1px solid #f3f4f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  marginBottom: '8px' 
                }}>
                  <strong style={{ color: '#111827', fontSize: '16px', fontWeight: '500' }}>{prompt.name}</strong>
                  {prompt.isDefault && (
                    <span style={{ 
                      marginLeft: '12px', 
                      color: '#f59e0b',
                      fontSize: '16px'
                    }}>
                      ★
                    </span>
                  )}
                </div>
                <div style={{ 
                  color: '#6b7280',
                  fontSize: '14px',
                  maxWidth: '500px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {prompt.prompt}
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => setDefaultPrompt(prompt.id)}
                  disabled={prompt.isDefault}
                  title={prompt.isDefault ? 'This is the default prompt' : 'Set as default prompt'}
                  aria-label={prompt.isDefault ? 'This is the default prompt' : 'Set as default prompt'}
                  style={{
                    width: '24px',
                    height: '24px',
                    backgroundColor: 'transparent',
                    color: prompt.isDefault ? '#f59e0b' : '#9ca3af',
                    border: 'none',
                    cursor: prompt.isDefault ? 'default' : 'pointer',
                    fontSize: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'color 0.2s',
                    opacity: prompt.isDefault ? 1 : 0.7
                  }}
                  onMouseEnter={(e) => {
                    if (!prompt.isDefault) {
                      e.currentTarget.style.color = '#f59e0b';
                      e.currentTarget.style.opacity = '1';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!prompt.isDefault) {
                      e.currentTarget.style.color = '#9ca3af';
                      e.currentTarget.style.opacity = '0.7';
                    }
                  }}
                >
                  ★
                </button>
                <button 
                  onClick={() => openPromptEditor(prompt)} 
                  title="Edit prompt"
                  aria-label="Edit prompt"
                  style={{
                    width: '24px',
                    height: '24px',
                    backgroundColor: 'transparent',
                    color: '#9ca3af',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'color 0.2s',
                    opacity: 0.7
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#374151';
                    e.currentTarget.style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#9ca3af';
                    e.currentTarget.style.opacity = '0.7';
                  }}
                >
                  ✏️
                </button>
                <button 
                  onClick={() => deletePrompt(prompt.id)} 
                  title="Delete prompt"
                  aria-label="Delete prompt"
                  style={{
                    width: '24px',
                    height: '24px',
                    backgroundColor: 'transparent',
                    color: '#9ca3af',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'color 0.2s',
                    opacity: 0.7
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#ef4444';
                    e.currentTarget.style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#9ca3af';
                    e.currentTarget.style.opacity = '0.7';
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal for editing prompts */}
      {isEditing && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '48px',
            borderRadius: '0px',
            width: '600px',
            maxWidth: '90%',
            border: '1px solid #e5e7eb'
          }}>
            <h3 style={{
              color: '#374151',
              marginBottom: '32px',
              fontSize: '16px',
              fontWeight: '500',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>{editingPrompt ? 'Edit Prompt' : 'Add Prompt'}</h3>
            
            <div style={{ marginBottom: '24px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px',
                color: '#6b7280',
                fontSize: '12px',
                fontWeight: '500',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>Name</label>
              <input
                type="text"
                value={promptName}
                onChange={(e) => setPromptName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px',
                  border: '1px solid #d1d5db',
                  borderRadius: '0px',
                  boxSizing: 'border-box',
                  fontSize: '14px',
                  color: '#111827',
                  fontFamily: 'inherit'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '32px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px',
                color: '#6b7280',
                fontSize: '12px',
                fontWeight: '500',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>Prompt</label>
              <textarea
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                rows={10}
                style={{
                  width: '100%',
                  padding: '14px',
                  border: '1px solid #d1d5db',
                  borderRadius: '0px',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                  fontSize: '14px',
                  color: '#111827',
                  fontFamily: 'inherit'
                }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setIsEditing(false)}
                style={{
                  padding: '14px 28px',
                  backgroundColor: '#f9fafb',
                  color: '#374151',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '400',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={savePrompt}
                style={{
                  padding: '14px 28px',
                  backgroundColor: '#111827',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '400',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default {
  main() {
    const root = ReactDOM.createRoot(document.getElementById('root')!);
    root.render(<OptionsPage />);
  }
};