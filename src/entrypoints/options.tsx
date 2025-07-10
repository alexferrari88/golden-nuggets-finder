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
      padding: '20px', 
      textAlign: 'center',
      color: '#64748b',
      fontSize: '16px'
    }}>Loading...</div>;
  }

  if (error) {
    return <div style={{ 
      padding: '20px', 
      color: '#dc2626', 
      backgroundColor: '#fef2f2',
      borderRadius: '6px',
      border: '1px solid #fecaca',
      margin: '20px',
      fontSize: '14px'
    }}>{error}</div>;
  }

  return (
    <div style={{ 
      maxWidth: '800px', 
      margin: '0 auto', 
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      backgroundColor: '#f8fafc',
      minHeight: '100vh'
    }}>
      <h1 style={{ 
        color: '#1e293b', 
        marginBottom: '32px',
        fontSize: '28px',
        fontWeight: '600'
      }}>Golden Nugget Finder Settings</h1>
      
      {/* API Key Section */}
      <div style={{ 
        marginBottom: '40px',
        backgroundColor: 'white',
        padding: '24px',
        borderRadius: '8px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
      }}>
        <h2 style={{ 
          color: '#1e293b', 
          marginBottom: '16px',
          fontSize: '20px',
          fontWeight: '600'
        }}>Gemini API Key</h2>
        <div style={{ marginBottom: '10px' }}>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your Gemini API key"
            style={{
              width: '400px',
              padding: '12px',
              marginRight: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: '#ffffff',
              color: '#1e293b'
            }}
          />
          <button onClick={saveApiKey} style={{
            padding: '12px 20px',
            backgroundColor: '#6366f1',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'background-color 0.2s'
          }}>
            Save & Validate
          </button>
        </div>
        {apiKeyStatus && (
          <div style={{
            padding: '12px',
            backgroundColor: apiKeyStatus.includes('Invalid') ? '#fef2f2' : '#f0fdf4',
            color: apiKeyStatus.includes('Invalid') ? '#dc2626' : '#059669',
            borderRadius: '6px',
            marginTop: '12px',
            border: `1px solid ${apiKeyStatus.includes('Invalid') ? '#fecaca' : '#bbf7d0'}`,
            fontSize: '14px'
          }}>
            {apiKeyStatus}
          </div>
        )}
      </div>

      {/* Prompts Section */}
      <div style={{ 
        backgroundColor: 'white',
        padding: '24px',
        borderRadius: '8px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ 
            color: '#1e293b', 
            margin: '0',
            fontSize: '20px',
            fontWeight: '600'
          }}>Saved Prompts</h2>
          <button onClick={() => openPromptEditor()} style={{
            padding: '10px 16px',
            backgroundColor: '#059669',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'background-color 0.2s'
          }}>
            Add New Prompt
          </button>
        </div>
        
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px' }}>
          {prompts.map((prompt) => (
            <div key={prompt.id} style={{
              padding: '20px',
              borderBottom: '1px solid #f1f5f9',
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
                  <strong style={{ color: '#1e293b', fontSize: '16px' }}>{prompt.name}</strong>
                  {prompt.isDefault && (
                    <span style={{ 
                      marginLeft: '10px', 
                      color: '#d97706',
                      fontSize: '16px'
                    }}>
                      ★
                    </span>
                  )}
                </div>
                <div style={{ 
                  color: '#64748b',
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
                  style={{
                    padding: '6px 12px',
                    backgroundColor: prompt.isDefault ? '#94a3b8' : '#d97706',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: prompt.isDefault ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}
                >
                  {prompt.isDefault ? 'Default' : 'Set Default'}
                </button>
                <button onClick={() => openPromptEditor(prompt)} style={{
                  padding: '6px 12px',
                  backgroundColor: '#0284c7',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                  Edit
                </button>
                <button onClick={() => deletePrompt(prompt.id)} style={{
                  padding: '6px 12px',
                  backgroundColor: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                  Delete
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
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '32px',
            borderRadius: '12px',
            width: '500px',
            maxWidth: '90%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <h3 style={{
              color: '#1e293b',
              marginBottom: '24px',
              fontSize: '20px',
              fontWeight: '600'
            }}>{editingPrompt ? 'Edit Prompt' : 'Add New Prompt'}</h3>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px',
                color: '#374151',
                fontSize: '14px',
                fontWeight: '500'
              }}>Name:</label>
              <input
                type="text"
                value={promptName}
                onChange={(e) => setPromptName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  boxSizing: 'border-box',
                  fontSize: '14px',
                  color: '#1e293b'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '24px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px',
                color: '#374151',
                fontSize: '14px',
                fontWeight: '500'
              }}>Prompt:</label>
              <textarea
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                rows={8}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                  fontSize: '14px',
                  color: '#1e293b'
                }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setIsEditing(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#94a3b8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={savePrompt}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6366f1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
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