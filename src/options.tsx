import { useState, useEffect } from 'react';
import { SavedPrompt } from './shared/types';
import { storage } from './shared/storage';
import { GeminiClient } from './background/gemini-client';

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
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>;
  }

  if (error) {
    return <div style={{ padding: '20px', color: 'red' }}>{error}</div>;
  }

  return (
    <div style={{ 
      maxWidth: '800px', 
      margin: '0 auto', 
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <h1>Golden Nugget Finder Settings</h1>
      
      {/* API Key Section */}
      <div style={{ marginBottom: '40px' }}>
        <h2>Gemini API Key</h2>
        <div style={{ marginBottom: '10px' }}>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your Gemini API key"
            style={{
              width: '400px',
              padding: '8px',
              marginRight: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}
          />
          <button onClick={saveApiKey} style={{
            padding: '8px 16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            Save & Validate
          </button>
        </div>
        {apiKeyStatus && (
          <div style={{
            padding: '8px',
            backgroundColor: apiKeyStatus.includes('Invalid') ? '#f8d7da' : '#d4edda',
            color: apiKeyStatus.includes('Invalid') ? '#721c24' : '#155724',
            borderRadius: '4px',
            marginTop: '10px'
          }}>
            {apiKeyStatus}
          </div>
        )}
      </div>

      {/* Prompts Section */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Saved Prompts</h2>
          <button onClick={() => openPromptEditor()} style={{
            padding: '8px 16px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            Add New Prompt
          </button>
        </div>
        
        <div style={{ border: '1px solid #ddd', borderRadius: '4px' }}>
          {prompts.map((prompt) => (
            <div key={prompt.id} style={{
              padding: '15px',
              borderBottom: '1px solid #eee',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  marginBottom: '5px' 
                }}>
                  <strong>{prompt.name}</strong>
                  {prompt.isDefault && (
                    <span style={{ 
                      marginLeft: '10px', 
                      color: '#ffc107',
                      fontSize: '16px'
                    }}>
                      ★
                    </span>
                  )}
                </div>
                <div style={{ 
                  color: '#666',
                  fontSize: '14px',
                  maxWidth: '500px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {prompt.prompt}
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={() => setDefaultPrompt(prompt.id)}
                  disabled={prompt.isDefault}
                  style={{
                    padding: '5px 10px',
                    backgroundColor: prompt.isDefault ? '#6c757d' : '#ffc107',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: prompt.isDefault ? 'not-allowed' : 'pointer'
                  }}
                >
                  {prompt.isDefault ? 'Default' : 'Set Default'}
                </button>
                <button onClick={() => openPromptEditor(prompt)} style={{
                  padding: '5px 10px',
                  backgroundColor: '#17a2b8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}>
                  Edit
                </button>
                <button onClick={() => deletePrompt(prompt.id)} style={{
                  padding: '5px 10px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer'
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
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            width: '500px',
            maxWidth: '90%'
          }}>
            <h3>{editingPrompt ? 'Edit Prompt' : 'Add New Prompt'}</h3>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Name:</label>
              <input
                type="text"
                value={promptName}
                onChange={(e) => setPromptName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Prompt:</label>
              <textarea
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                rows={8}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  boxSizing: 'border-box',
                  resize: 'vertical'
                }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setIsEditing(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={savePrompt}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
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

export default OptionsPage;