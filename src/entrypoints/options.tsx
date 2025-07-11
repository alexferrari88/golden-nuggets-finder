import { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { SavedPrompt } from '../shared/types';
import { storage } from '../shared/storage';
import { GeminiClient } from '../background/gemini-client';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { cn } from '../lib/utils';
import { CircleCheck, CircleAlert, Key, FileText, Pencil, Trash, Star, Plus, ExternalLink, Sparkles, X, Lock, StickyNote, Heart } from 'lucide-react';
// Design system migration: Replaced with Tailwind classes and Shadcn UI components

type AlertType = 'success' | 'error' | 'warning' | 'info';

interface CustomAlertProps {
  type: AlertType;
  title: string;
  message: string;
  onClose: () => void;
}

const CustomAlert: React.FC<CustomAlertProps> = ({ type, title, message, onClose }) => {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CircleCheck size={20} />;
      case 'error':
      case 'warning':
        return <CircleAlert size={20} />;
      case 'info':
        return <CircleAlert size={20} />;
      default:
        return null;
    }
  };

  const getVariant = () => {
    switch (type) {
      case 'error':
        return 'destructive';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      case 'success':
      default:
        return 'default';
    }
  };

  return (
    <Alert variant={getVariant()} className="mb-4 relative">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        <div className="flex-1">
          <AlertTitle className="font-semibold mb-1">{title}</AlertTitle>
          <AlertDescription className="opacity-80">{message}</AlertDescription>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="absolute top-2 right-2 h-6 w-6 p-0 opacity-60 hover:opacity-100"
        >
          <X size={16} />
        </Button>
      </div>
    </Alert>
  );
};

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'default';
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  type = 'default'
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
          <DialogDescription className="text-gray-600 leading-relaxed">
            {message}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={onCancel}
            className="flex-1"
          >
            {cancelText}
          </Button>
          <Button 
            variant={type === 'danger' ? 'destructive' : 'default'}
            onClick={onConfirm}
            className="flex-1"
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

function OptionsPage() {
  const [apiKey, setApiKey] = useState('');
  const [apiKeyStatus, setApiKeyStatus] = useState<{ type: AlertType; title: string; message: string } | null>(null);
  const [prompts, setPrompts] = useState<SavedPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<SavedPrompt | null>(null);
  const [promptName, setPromptName] = useState('');
  const [promptText, setPromptText] = useState('');
  const [validationErrors, setValidationErrors] = useState<{name?: string; prompt?: string}>({});
  const [isValidating, setIsValidating] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [savedApiKey, savedPrompts] = await Promise.all([
        storage.getApiKey({ source: 'options', action: 'read', timestamp: Date.now() }),
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
    if (!apiKey.trim()) {
      setApiKeyStatus({
        type: 'error',
        title: 'API Key Required',
        message: 'Please enter your Gemini API key'
      });
      return;
    }

    try {
      setIsValidating(true);
      setApiKeyStatus({
        type: 'info',
        title: 'Validating...',
        message: 'Checking your API key with Google Gemini'
      });
      
      const client = new GeminiClient(apiKey);
      await client.validateApiKey();
      
      await storage.saveApiKey(apiKey, { source: 'options', action: 'write', timestamp: Date.now() });
      setApiKeyStatus({
        type: 'success',
        title: 'API Key Saved',
        message: 'Your API key has been validated and saved successfully'
      });
      
      setTimeout(() => setApiKeyStatus(null), 5000);
    } catch (err) {
      setApiKeyStatus({
        type: 'error',
        title: 'Invalid API Key',
        message: 'The API key is invalid or doesn\'t have the required permissions. Please check your key and try again.'
      });
    } finally {
      setIsValidating(false);
    }
  };

  const validatePromptForm = () => {
    const errors: {name?: string; prompt?: string} = {};
    
    if (!promptName.trim()) {
      errors.name = 'Prompt name is required';
    } else if (promptName.trim().length < 3) {
      errors.name = 'Prompt name must be at least 3 characters';
    }
    
    if (!promptText.trim()) {
      errors.prompt = 'Prompt text is required';
    } else if (promptText.trim().length < 10) {
      errors.prompt = 'Prompt text must be at least 10 characters';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const openPromptEditor = (prompt?: SavedPrompt) => {
    setEditingPrompt(prompt || null);
    setPromptName(prompt?.name || '');
    setPromptText(prompt?.prompt || '');
    setValidationErrors({});
    setIsEditing(true);
  };

  const savePrompt = async () => {
    if (!validatePromptForm()) {
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
      setValidationErrors({});
    } catch (err) {
      setApiKeyStatus({
        type: 'error',
        title: 'Save Failed',
        message: 'Failed to save the prompt. Please try again.'
      });
    }
  };

  const deletePrompt = async (promptId: string) => {
    const prompt = prompts.find(p => p.id === promptId);
    if (!prompt) return;

    setConfirmDialog({
      isOpen: true,
      title: 'Delete Prompt',
      message: `Are you sure you want to delete "${prompt.name}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await storage.deletePrompt(promptId);
          await loadData();
          setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: () => {} });
        } catch (err) {
          setApiKeyStatus({
            type: 'error',
            title: 'Delete Failed',
            message: 'Failed to delete the prompt. Please try again.'
          });
        }
      }
    });
  };

  const setDefaultPrompt = async (promptId: string) => {
    try {
      await storage.setDefaultPrompt(promptId);
      await loadData();
    } catch (err) {
      setApiKeyStatus({
        type: 'error',
        title: 'Failed to Set Default',
        message: 'Failed to set the default prompt. Please try again.'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 font-sans">
        <Card className="shadow-md">
          <CardContent className="flex items-center gap-3 p-8">
            <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
            <span className="text-gray-600 text-base">
              Loading your settings...
            </span>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 font-sans">
        <Card className="max-w-md shadow-lg text-center">
          <CardContent className="p-12">
            <div className="text-red-600 mb-4 flex justify-center">
              <CircleAlert size={20} />
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Failed to Load Settings
            </h2>
            <p className="text-gray-600 text-base leading-normal mb-8">
              {error}
            </p>
            <Button onClick={loadData} className="text-sm font-medium">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
      
      <div className="max-w-4xl mx-auto px-8 py-16">
        {/* Header */}
        <div className="mb-16 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="text-gray-600">
              <Sparkles size={24} />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 tracking-tight">
              Golden Nugget Finder
            </h1>
          </div>
          <p className="text-lg text-gray-600 font-normal">
            Configure your AI-powered content analysis tool
          </p>
        </div>

        {/* Global Alert */}
        {apiKeyStatus && (
          <CustomAlert
            type={apiKeyStatus.type}
            title={apiKeyStatus.title}
            message={apiKeyStatus.message}
            onClose={() => setApiKeyStatus(null)}
          />
        )}

        {/* API Key Section */}
        <Card className="mb-8 p-8">
          <CardHeader className="p-0 mb-6">
            <div className="flex items-center gap-3">
              <div className="text-gray-900">
                <Key size={20} />
              </div>
              <CardTitle className="text-xl font-semibold text-gray-800">
                Google Gemini API Key
              </CardTitle>
            </div>
          </CardHeader>
          
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
            <p className="mb-3 text-sm text-gray-500 font-medium flex items-center">
              <Lock size={16} className="mr-2" />
              Your API key is stored securely in your browser and never shared
            </p>
            <p className="mb-3 text-sm text-gray-400 leading-normal">
              You'll need a Google Gemini API key to use this extension. The key is used to analyze webpage content and find valuable insights.
            </p>
            <div className="flex items-center gap-2 text-sm text-gray-900">
              <span>Get your free API key from Google AI Studio</span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-900 hover:text-gray-700 flex items-center"
              >
                <ExternalLink size={16} />
              </a>
            </div>
          </div>

          <div className="flex gap-3 items-stretch mb-4">
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Gemini API key (e.g., AIzaSyC...)"
              className="flex-1"
            />
            <Button
              onClick={saveApiKey}
              disabled={isValidating}
              className="min-w-[120px]"
            >
              {isValidating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin mr-2" />
                  Validating...
                </>
              ) : (
                'Save API Key'
              )}
            </Button>
          </div>
        </Card>

        {/* Prompts Section */}
        <Card className="p-8">
          <CardHeader className="p-0 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-gray-900">
                  <FileText size={20} />
                </div>
                <CardTitle className="text-xl font-semibold text-gray-800">
                  Analysis Prompts
                </CardTitle>
              </div>
              <Button onClick={() => openPromptEditor()}>
                <Plus size={16} className="mr-2" />
                Add New Prompt
              </Button>
            </div>
          </CardHeader>
          
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
            <p className="text-sm text-gray-500 leading-normal">
              Prompts define what the AI looks for when analyzing web content. Create custom prompts for different use cases, or use the default prompt to get started.
            </p>
          </div>
          
          {prompts.length === 0 ? (
            <div className="text-center py-12 px-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
              <div className="text-gray-500 mb-4">
                <StickyNote size={48} />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                No prompts yet
              </h3>
              <p className="text-gray-500 text-base mb-6">
                Create your first prompt to start analyzing web content
              </p>
              <Button onClick={() => openPromptEditor()}>
                <Plus size={16} className="mr-2" />
                Create First Prompt
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {prompts.map((prompt, index) => (
                <div
                  key={prompt.id}
                  className="p-6 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-50 hover:border-gray-200 transition-all duration-200"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-800 m-0">
                          {prompt.name}
                        </h3>
                        {prompt.isDefault && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-xs font-medium">
                            <Star size={16} />
                            Default
                          </div>
                        )}
                      </div>
                      <p className="text-gray-600 text-sm leading-relaxed line-clamp-3 m-0">
                        {prompt.prompt}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setDefaultPrompt(prompt.id)}
                        disabled={prompt.isDefault}
                        title={prompt.isDefault ? 'This is the default prompt' : 'Set as default prompt'}
                        className={`p-2 rounded-md transition-all duration-200 flex items-center justify-center ${
                          prompt.isDefault 
                            ? 'text-gray-400 cursor-default' 
                            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 cursor-pointer'
                        }`}
                      >
                        <Star size={16} />
                      </button>
                      <button
                        onClick={() => openPromptEditor(prompt)}
                        title="Edit prompt"
                        className="p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800 rounded-md cursor-pointer transition-all duration-200 flex items-center justify-center"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => deletePrompt(prompt.id)}
                        title="Delete prompt"
                        className="p-2 text-gray-500 hover:bg-gray-100 hover:text-red-600 rounded-md cursor-pointer transition-all duration-200 flex items-center justify-center"
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Footer */}
        <div className="mt-12 pt-6 text-center text-gray-500 text-sm border-t border-gray-100">
          <p className="m-0">
            Golden Nugget Finder • Made with <Heart size={16} className="inline mx-1" /> for better web content analysis
          </p>
        </div>
      </div>

      {/* Prompt Editor Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-5">
          <div className="bg-white p-8 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 m-0">
              {editingPrompt ? 'Edit Prompt' : 'Create New Prompt'}
            </h3>
            
            <div className="mb-6">
              <label className="block mb-2 text-gray-800 text-sm font-semibold">
                Prompt Name
              </label>
              <input
                type="text"
                value={promptName}
                onChange={(e) => setPromptName(e.target.value)}
                placeholder="e.g., 'Find Learning Resources', 'Identify Tools', 'Extract Key Insights'"
                className={`w-full p-4 border-2 rounded-lg text-base text-gray-800 transition-colors outline-none ${
                  validationErrors.name ? 'border-red-500' : 'border-gray-200 focus:border-gray-900'
                }`}
              />
              {validationErrors.name && (
                <p className="mt-2 text-red-600 text-sm">
                  {validationErrors.name}
                </p>
              )}
            </div>
            
            <div className="mb-8">
              <label className="block mb-2 text-gray-800 text-sm font-semibold">
                Prompt Instructions
              </label>
              <textarea
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                rows={12}
                placeholder="Describe what you want the AI to look for when analyzing web content...\n\nExample:\n'I'm a software developer learning new technologies. Find practical tools, frameworks, libraries, and learning resources mentioned in this content. Focus on actionable items that can help me improve my skills.'"
                className={`w-full p-4 border-2 rounded-lg resize-y text-base text-gray-800 leading-relaxed transition-colors outline-none ${
                  validationErrors.prompt ? 'border-red-500' : 'border-gray-200 focus:border-gray-900'
                }`}
              />
              {validationErrors.prompt && (
                <p className="mt-2 text-red-600 text-sm">
                  {validationErrors.prompt}
                </p>
              )}
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setIsEditing(false)}
                className="px-6 py-3 bg-gray-50 text-gray-800 border border-gray-200 rounded-lg cursor-pointer text-sm font-medium hover:bg-gray-100 hover:border-gray-300 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={savePrompt}
                className="px-6 py-3 bg-gray-900 text-white rounded-lg cursor-pointer text-sm font-medium hover:bg-gray-800 transition-colors duration-200"
              >
                {editingPrompt ? 'Save Changes' : 'Create Prompt'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: () => {} })}
        type="danger"
      />
    </div>
  );
}

export default {
  main() {
    const root = ReactDOM.createRoot(document.getElementById('root')!);
    root.render(<OptionsPage />);
  }
};