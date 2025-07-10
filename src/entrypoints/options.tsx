import { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { SavedPrompt } from '../shared/types';
import { storage } from '../shared/storage';
import { GeminiClient } from '../background/gemini-client';
import { colors, typography, spacing, borderRadius, shadows, components } from '../shared/design-system';

// SVG Icons
const IconCheckCircle = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
  </svg>
);

const IconExclamationCircle = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
  </svg>
);

const IconKey = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd" />
  </svg>
);

const IconDocument = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
  </svg>
);

const IconEdit = () => (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
  </svg>
);

const IconTrash = () => (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
  </svg>
);

const IconStar = () => (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

const IconPlus = () => (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
  </svg>
);

const IconExternalLink = () => (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
    <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
    <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
  </svg>
);

const IconSparkles = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
  </svg>
);

type AlertType = 'success' | 'error' | 'warning' | 'info';

interface AlertProps {
  type: AlertType;
  title: string;
  message: string;
  onClose: () => void;
}

const Alert: React.FC<AlertProps> = ({ type, title, message, onClose }) => {
  const getAlertStyles = () => {
    const baseStyles = {
      padding: spacing.lg,
      borderRadius: borderRadius.md,
      border: '1px solid',
      marginBottom: spacing.lg,
      display: 'flex',
      alignItems: 'flex-start',
      gap: spacing.md,
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium
    };
    
    switch (type) {
      case 'success':
        return {
          ...baseStyles,
          backgroundColor: colors.background.secondary,
          borderColor: colors.success + '33',
          color: colors.success
        };
      case 'error':
        return {
          ...baseStyles,
          backgroundColor: colors.background.secondary,
          borderColor: colors.error + '33',
          color: colors.error
        };
      case 'warning':
        return {
          ...baseStyles,
          backgroundColor: colors.background.secondary,
          borderColor: colors.grayMedium + '33',
          color: colors.grayMedium
        };
      case 'info':
        return {
          ...baseStyles,
          backgroundColor: colors.background.secondary,
          borderColor: colors.blueSubtle + '33',
          color: colors.blueSubtle
        };
      default:
        return baseStyles;
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <IconCheckCircle />;
      case 'error':
      case 'warning':
        return <IconExclamationCircle />;
      case 'info':
        return <IconExclamationCircle />;
      default:
        return null;
    }
  };

  return (
    <div style={getAlertStyles()}>
      <div style={{ flexShrink: 0 }}>
        {getIcon()}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: '600', marginBottom: '4px' }}>{title}</div>
        <div style={{ fontWeight: '400', opacity: 0.8 }}>{message}</div>
      </div>
      <button
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '4px',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.6,
          transition: 'opacity 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
      >
        ✕
      </button>
    </div>
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
  if (!isOpen) return null;

  return (
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
      zIndex: 1000,
      padding: '20px',
      boxSizing: 'border-box'
    }}>
      <div style={{
        backgroundColor: colors.white,
        padding: '32px',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      }}>
        <h3 style={{
          margin: '0 0 16px 0',
          fontSize: '20px',
          fontWeight: '600',
          color: colors.text.primary
        }}>
          {title}
        </h3>
        <p style={{
          margin: '0 0 32px 0',
          fontSize: '16px',
          color: colors.text.secondary,
          lineHeight: '1.5'
        }}>
          {message}
        </p>
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: '12px 24px',
              backgroundColor: colors.background.secondary,
              color: colors.text.primary,
              border: `1px solid ${colors.border.light}`,
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.background.secondary;
              e.currentTarget.style.borderColor = colors.border.default;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = colors.background.secondary;
              e.currentTarget.style.borderColor = colors.border.light;
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '12px 24px',
              backgroundColor: type === 'danger' ? colors.error : colors.blueSubtle,
              color: colors.white,
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = type === 'danger' ? colors.error : colors.blueSubtle;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = type === 'danger' ? colors.error : colors.blueSubtle;
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
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
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: colors.background.secondary,
        fontFamily: typography.fontFamily.sans
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing.md,
          padding: spacing['2xl'],
          backgroundColor: colors.background.primary,
          borderRadius: borderRadius.lg,
          boxShadow: shadows.md
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            border: `2px solid ${colors.border.default}`,
            borderTop: `2px solid ${colors.blueSubtle}`,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <span style={{ 
            color: colors.text.secondary,
            fontSize: typography.fontSize.base
          }}>
            Loading your settings...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: colors.background.secondary,
        fontFamily: typography.fontFamily.sans
      }}>
        <div style={{
          maxWidth: '400px',
          padding: spacing['3xl'],
          backgroundColor: colors.background.primary,
          borderRadius: borderRadius.xl,
          boxShadow: shadows.lg,
          textAlign: 'center'
        }}>
          <div style={{
            color: colors.accent.red,
            marginBottom: spacing.lg,
            display: 'flex',
            justifyContent: 'center'
          }}>
            <IconExclamationCircle />
          </div>
          <h2 style={{
            margin: `0 0 ${spacing.sm} 0`,
            fontSize: typography.fontSize.xl,
            fontWeight: typography.fontWeight.semibold,
            color: colors.text.primary
          }}>
            Failed to Load Settings
          </h2>
          <p style={{
            margin: `0 0 ${spacing['2xl']} 0`,
            color: colors.text.secondary,
            fontSize: typography.fontSize.base,
            lineHeight: typography.lineHeight.normal
          }}>
            {error}
          </p>
          <button
            onClick={loadData}
            style={{
              ...components.button.primary,
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.medium
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.blueSubtle}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.blueSubtle}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: colors.background.secondary,
      fontFamily: typography.fontFamily.sans
    }}>
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
      
      <div style={{
        maxWidth: '1000px',
        margin: '0 auto',
        padding: `${spacing['4xl']} ${spacing['2xl']}`
      }}>
        {/* Header */}
        <div style={{
          marginBottom: spacing['4xl'],
          textAlign: 'center'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.md,
            marginBottom: spacing.lg
          }}>
            <div style={{ color: colors.grayMedium }}>
              <IconSparkles />
            </div>
            <h1 style={{
              margin: 0,
              fontSize: typography.fontSize['3xl'],
              fontWeight: typography.fontWeight.bold,
              color: colors.text.primary,
              letterSpacing: '-0.025em'
            }}>
              Golden Nugget Finder
            </h1>
          </div>
          <p style={{
            margin: 0,
            fontSize: typography.fontSize.lg,
            color: colors.text.secondary,
            fontWeight: typography.fontWeight.normal
          }}>
            Configure your AI-powered content analysis tool
          </p>
        </div>

        {/* Global Alert */}
        {apiKeyStatus && (
          <Alert
            type={apiKeyStatus.type}
            title={apiKeyStatus.title}
            message={apiKeyStatus.message}
            onClose={() => setApiKeyStatus(null)}
          />
        )}

        {/* API Key Section */}
        <div style={{
          marginBottom: spacing['3xl'],
          backgroundColor: colors.background.primary,
          padding: spacing['3xl'],
          borderRadius: borderRadius.xl,
          boxShadow: shadows.md,
          border: `1px solid ${colors.border.light}`
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing.md,
            marginBottom: spacing['2xl']
          }}>
            <div style={{ color: colors.blueSubtle }}>
              <IconKey />
            </div>
            <h2 style={{
              margin: 0,
              fontSize: typography.fontSize.xl,
              fontWeight: typography.fontWeight.semibold,
              color: colors.text.primary
            }}>
              Google Gemini API Key
            </h2>
          </div>
          
          <div style={{
            marginBottom: spacing['2xl'],
            padding: spacing.lg,
            backgroundColor: colors.background.secondary,
            borderRadius: borderRadius.lg,
            border: `1px solid ${colors.border.light}`
          }}>
            <p style={{
              margin: `0 0 ${spacing.md} 0`,
              fontSize: typography.fontSize.sm,
              color: colors.text.secondary,
              fontWeight: typography.fontWeight.medium
            }}>
              🔒 Your API key is stored securely in your browser and never shared
            </p>
            <p style={{
              margin: `0 0 ${spacing.md} 0`,
              fontSize: typography.fontSize.sm,
              color: colors.text.tertiary,
              lineHeight: typography.lineHeight.normal
            }}>
              You'll need a Google Gemini API key to use this extension. The key is used to analyze webpage content and find valuable insights.
            </p>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.sm,
              fontSize: typography.fontSize.sm,
              color: colors.text.accent
            }}>
              <span>Get your free API key from Google AI Studio</span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: colors.text.accent,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <IconExternalLink />
              </a>
            </div>
          </div>

          <div style={{
            display: 'flex',
            gap: spacing.md,
            alignItems: 'stretch',
            marginBottom: spacing.lg
          }}>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Gemini API key (e.g., AIzaSyC...)"
              style={{
                ...components.input.default,
                flex: 1,
                fontSize: typography.fontSize.base,
                color: colors.text.primary,
                fontFamily: typography.fontFamily.sans
              }}
              onFocus={(e) => e.target.style.borderColor = colors.blueSubtle}
              onBlur={(e) => e.target.style.borderColor = colors.border.default}
            />
            <button
              onClick={saveApiKey}
              disabled={isValidating}
              style={{
                ...components.button.primary,
                backgroundColor: isValidating ? colors.grayMedium : colors.blueSubtle,
                cursor: isValidating ? 'not-allowed' : 'pointer',
                fontSize: typography.fontSize.base,
                fontWeight: typography.fontWeight.semibold,
                minWidth: '120px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing.sm
              }}
              onMouseEnter={(e) => {
                if (!isValidating) e.currentTarget.style.backgroundColor = colors.blueSubtle;
              }}
              onMouseLeave={(e) => {
                if (!isValidating) e.currentTarget.style.backgroundColor = colors.blueSubtle;
              }}
            >
              {isValidating ? (
                <>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: `2px solid ${colors.background.primary}40`,
                    borderTop: `2px solid ${colors.background.primary}`,
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  Validating...
                </>
              ) : (
                'Save API Key'
              )}
            </button>
          </div>
        </div>

        {/* Prompts Section */}
        <div style={{
          backgroundColor: colors.white,
          padding: '32px',
          borderRadius: '16px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          border: `1px solid ${colors.border.light}`
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{ color: colors.blueSubtle }}>
                <IconDocument />
              </div>
              <h2 style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: '600',
                color: colors.text.primary
              }}>
                Analysis Prompts
              </h2>
            </div>
            <button
              onClick={() => openPromptEditor()}
              style={{
                padding: '12px 20px',
                backgroundColor: colors.blueSubtle,
                color: colors.white,
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'background-color 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.blueSubtle}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.blueSubtle}
            >
              <IconPlus />
              Add New Prompt
            </button>
          </div>
          
          <div style={{
            marginBottom: '24px',
            padding: '16px',
            backgroundColor: colors.background.secondary,
            borderRadius: '12px',
            border: `1px solid ${colors.border.light}`
          }}>
            <p style={{
              margin: 0,
              fontSize: '14px',
              color: colors.grayMedium,
              lineHeight: '1.5'
            }}>
              Prompts define what the AI looks for when analyzing web content. Create custom prompts for different use cases, or use the default prompt to get started.
            </p>
          </div>
          
          {prompts.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '48px 24px',
              backgroundColor: colors.background.secondary,
              borderRadius: '12px',
              border: `2px dashed ${colors.border.default}`
            }}>
              <div style={{
                color: colors.grayMedium,
                marginBottom: '16px',
                fontSize: '48px'
              }}>
                📝
              </div>
              <h3 style={{
                margin: '0 0 8px 0',
                fontSize: '18px',
                fontWeight: '600',
                color: colors.text.primary
              }}>
                No prompts yet
              </h3>
              <p style={{
                margin: '0 0 24px 0',
                color: colors.grayMedium,
                fontSize: '16px'
              }}>
                Create your first prompt to start analyzing web content
              </p>
              <button
                onClick={() => openPromptEditor()}
                style={{
                  padding: '12px 24px',
                  backgroundColor: colors.blueSubtle,
                  color: colors.white,
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'background-color 0.2s',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.blueSubtle}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.blueSubtle}
              >
                <IconPlus />
                Create First Prompt
              </button>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gap: '16px'
            }}>
              {prompts.map((prompt, index) => (
                <div
                  key={prompt.id}
                  style={{
                    padding: '24px',
                    backgroundColor: colors.background.secondary,
                    borderRadius: '12px',
                    border: `1px solid ${colors.border.light}`,
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = colors.background.secondary;
                    e.currentTarget.style.borderColor = colors.border.default;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = colors.background.secondary;
                    e.currentTarget.style.borderColor = colors.border.light;
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '16px'
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '8px'
                      }}>
                        <h3 style={{
                          margin: 0,
                          fontSize: '18px',
                          fontWeight: '600',
                          color: colors.text.primary
                        }}>
                          {prompt.name}
                        </h3>
                        {prompt.isDefault && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 8px',
                            backgroundColor: colors.background.secondary,
                            color: colors.grayMedium,
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '500'
                          }}>
                            <IconStar />
                            Default
                          </div>
                        )}
                      </div>
                      <p style={{
                        margin: 0,
                        color: colors.text.secondary,
                        fontSize: '14px',
                        lineHeight: '1.5',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical' as any,
                        overflow: 'hidden'
                      } as React.CSSProperties}>
                        {prompt.prompt}
                      </p>
                    </div>
                    
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <button
                        onClick={() => setDefaultPrompt(prompt.id)}
                        disabled={prompt.isDefault}
                        title={prompt.isDefault ? 'This is the default prompt' : 'Set as default prompt'}
                        style={{
                          padding: '8px',
                          backgroundColor: 'transparent',
                          color: prompt.isDefault ? colors.grayMedium : colors.grayMedium,
                          border: 'none',
                          borderRadius: '6px',
                          cursor: prompt.isDefault ? 'default' : 'pointer',
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        onMouseEnter={(e) => {
                          if (!prompt.isDefault) {
                            e.currentTarget.style.backgroundColor = colors.background.secondary;
                            e.currentTarget.style.color = colors.grayMedium;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!prompt.isDefault) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = colors.grayMedium;
                          }
                        }}
                      >
                        <IconStar />
                      </button>
                      <button
                        onClick={() => openPromptEditor(prompt)}
                        title="Edit prompt"
                        style={{
                          padding: '8px',
                          backgroundColor: 'transparent',
                          color: colors.grayMedium,
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = colors.background.secondary;
                          e.currentTarget.style.color = colors.text.primary;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = colors.grayMedium;
                        }}
                      >
                        <IconEdit />
                      </button>
                      <button
                        onClick={() => deletePrompt(prompt.id)}
                        title="Delete prompt"
                        style={{
                          padding: '8px',
                          backgroundColor: 'transparent',
                          color: colors.grayMedium,
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = colors.background.secondary;
                          e.currentTarget.style.color = colors.error;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = colors.grayMedium;
                        }}
                      >
                        <IconTrash />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          marginTop: '48px',
          padding: '24px',
          textAlign: 'center',
          color: colors.grayMedium,
          fontSize: '14px',
          borderTop: `1px solid ${colors.border.light}`
        }}>
          <p style={{ margin: 0 }}>
            Golden Nugget Finder • Made with ❤️ for better web content analysis
          </p>
        </div>
      </div>

      {/* Prompt Editor Modal */}
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
          zIndex: 1000,
          padding: '20px',
          boxSizing: 'border-box'
        }}>
          <div style={{
            backgroundColor: colors.white,
            padding: '32px',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '700px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <h3 style={{
              margin: '0 0 24px 0',
              fontSize: '24px',
              fontWeight: '700',
              color: colors.text.primary
            }}>
              {editingPrompt ? 'Edit Prompt' : 'Create New Prompt'}
            </h3>
            
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: colors.text.primary,
                fontSize: '14px',
                fontWeight: '600'
              }}>
                Prompt Name
              </label>
              <input
                type="text"
                value={promptName}
                onChange={(e) => setPromptName(e.target.value)}
                placeholder="e.g., 'Find Learning Resources', 'Identify Tools', 'Extract Key Insights'"
                style={{
                  width: '100%',
                  padding: '16px',
                  border: `2px solid ${validationErrors.name ? colors.error : colors.border.light}`,
                  borderRadius: '8px',
                  boxSizing: 'border-box',
                  fontSize: '16px',
                  color: colors.text.primary,
                  fontFamily: 'inherit',
                  transition: 'border-color 0.2s',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  if (!validationErrors.name) {
                    e.target.style.borderColor = colors.blueSubtle;
                  }
                }}
                onBlur={(e) => {
                  if (!validationErrors.name) {
                    e.target.style.borderColor = colors.border.light;
                  }
                }}
              />
              {validationErrors.name && (
                <p style={{
                  margin: '8px 0 0 0',
                  color: colors.error,
                  fontSize: '14px'
                }}>
                  {validationErrors.name}
                </p>
              )}
            </div>
            
            <div style={{ marginBottom: '32px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: colors.text.primary,
                fontSize: '14px',
                fontWeight: '600'
              }}>
                Prompt Instructions
              </label>
              <textarea
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                rows={12}
                placeholder="Describe what you want the AI to look for when analyzing web content...\n\nExample:\n'I'm a software developer learning new technologies. Find practical tools, frameworks, libraries, and learning resources mentioned in this content. Focus on actionable items that can help me improve my skills.'"
                style={{
                  width: '100%',
                  padding: '16px',
                  border: `2px solid ${validationErrors.prompt ? colors.error : colors.border.light}`,
                  borderRadius: '8px',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                  fontSize: '16px',
                  color: colors.text.primary,
                  fontFamily: 'inherit',
                  lineHeight: '1.5',
                  transition: 'border-color 0.2s',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  if (!validationErrors.prompt) {
                    e.target.style.borderColor = colors.blueSubtle;
                  }
                }}
                onBlur={(e) => {
                  if (!validationErrors.prompt) {
                    e.target.style.borderColor = colors.border.light;
                  }
                }}
              />
              {validationErrors.prompt && (
                <p style={{
                  margin: '8px 0 0 0',
                  color: colors.error,
                  fontSize: '14px'
                }}>
                  {validationErrors.prompt}
                </p>
              )}
            </div>
            
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setIsEditing(false)}
                style={{
                  padding: '12px 24px',
                  backgroundColor: colors.background.secondary,
                  color: colors.text.primary,
                  border: `1px solid ${colors.border.light}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = colors.background.secondary;
                  e.currentTarget.style.borderColor = colors.border.default;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = colors.background.secondary;
                  e.currentTarget.style.borderColor = colors.border.light;
                }}
              >
                Cancel
              </button>
              <button
                onClick={savePrompt}
                style={{
                  padding: '12px 24px',
                  backgroundColor: colors.blueSubtle,
                  color: colors.white,
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.blueSubtle}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.blueSubtle}
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