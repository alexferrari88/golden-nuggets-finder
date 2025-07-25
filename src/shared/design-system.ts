// Design System - Notion-inspired minimalistic design
// This file contains the core design tokens for the Golden Nugget Finder extension

export const colors = {
  // Notion-inspired ultra-minimal palette
  // Focus on subtlety, elegance, and exceptional readability
  
  // Core neutral colors
  black: '#000000',           // Pure black (sparingly used)
  white: '#FFFFFF',           // Pure white
  gray: {
    25: '#FCFCFC',           // Barely-there gray
    50: '#F7F7F7',           // Ultra-light gray
    100: '#F1F1F1',          // Very light gray
    200: '#E6E6E6',          // Light gray
    300: '#D0D0D0',          // Medium-light gray
    400: '#A8A8A8',          // Medium gray
    500: '#6F6F6F',          // True medium gray
    600: '#525252',          // Medium-dark gray
    700: '#3F3F3F',          // Dark gray
    800: '#2A2A2A',          // Very dark gray
    900: '#1A1A1A',          // Almost black
  },

  // Semantic colors - all neutral tones
  text: {
    primary: '#2A2A2A',       // Very dark gray for primary text (softer than black)
    secondary: '#6F6F6F',     // Medium gray for secondary text
    tertiary: '#A8A8A8',      // Light gray for tertiary text
    accent: '#1A1A1A',        // Almost black for emphasis (softer than pure black)
  },

  background: {
    primary: '#FFFFFF',       // Pure white
    secondary: '#FCFCFC',     // Barely-there gray
    tertiary: '#F7F7F7',      // Ultra-light gray
    overlay: 'rgba(26, 26, 26, 0.04)', // Ultra-subtle dark overlay
    modalOverlay: 'rgba(26, 26, 26, 0.3)', // Subtle modal overlay
  },

  border: {
    light: '#F1F1F1',         // Very light gray border
    default: '#E6E6E6',       // Light gray border
    medium: '#D0D0D0',        // Medium-light gray border
    dark: '#A8A8A8',          // Medium gray border
  },

  // Highlight colors - golden yellow for clear visibility
  highlight: {
    background: 'rgba(255, 215, 0, 0.3)',  // Golden yellow highlight - highly visible
    border: 'rgba(255, 193, 7, 0.6)',      // Slightly darker golden border
    hover: 'rgba(255, 215, 0, 0.45)',      // Stronger golden hover state
  },

  // States - all neutral, no color
  success: '#3F3F3F',         // Dark gray for success states
  error: '#2A2A2A',           // Very dark gray for error states
  warning: '#525252',         // Medium-dark gray for warnings
};

export const typography = {
  fontFamily: {
    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },
  
  fontSize: {
    xs: '12px',
    sm: '14px',
    base: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '30px',
  },

  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },

  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
  },
};

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  '2xl': '24px',
  '3xl': '32px',
  '4xl': '48px',
  '5xl': '64px',
};

export const borderRadius = {
  sm: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
};

export const shadows = {
  sm: '0 1px 2px 0 rgba(26, 26, 26, 0.05)',
  md: '0 4px 6px -1px rgba(26, 26, 26, 0.1), 0 2px 4px -1px rgba(26, 26, 26, 0.06)',
  lg: '0 10px 15px -3px rgba(26, 26, 26, 0.1), 0 4px 6px -2px rgba(26, 26, 26, 0.05)',
  xl: '0 20px 25px -5px rgba(26, 26, 26, 0.1), 0 10px 10px -5px rgba(26, 26, 26, 0.04)',
  modal: '0 25px 50px -12px rgba(26, 26, 26, 0.15)',
};

export const zIndex = {
  dropdown: 1000,
  modal: 1050,
  tooltip: 1100,
  overlay: 1200,
  sidebar: 1300,
  notification: 1400,
  toggle: 1500,
};

// UI Constants - dimensions, timings, and other UI-specific values
export const ui = {
  sidebarWidth: '320px',
  notificationTimeout: 5000,
};

// Component-specific styles
export const components = {
  button: {
    primary: {
      backgroundColor: colors.black,
      color: colors.white,
      borderRadius: borderRadius.md,
      padding: `${spacing.md} ${spacing.xl}`,
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
      border: 'none',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      boxShadow: shadows.sm,
    },
    secondary: {
      backgroundColor: colors.white,
      color: colors.text.primary,
      borderRadius: borderRadius.md,
      padding: `${spacing.md} ${spacing.xl}`,
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
      border: `1px solid ${colors.border.default}`,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      boxShadow: shadows.sm,
    },
    ghost: {
      backgroundColor: 'transparent',
      color: colors.text.secondary,
      borderRadius: borderRadius.md,
      padding: `${spacing.sm} ${spacing.md}`,
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
      border: 'none',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    },
  },

  card: {
    default: {
      backgroundColor: colors.white,
      borderRadius: borderRadius.lg,
      padding: spacing['2xl'],
      border: `1px solid ${colors.border.light}`,
      boxShadow: shadows.sm,
    },
    hover: {
      boxShadow: shadows.md,
      borderColor: colors.border.default,
    },
  },

  input: {
    default: {
      backgroundColor: colors.white,
      borderRadius: borderRadius.md,
      padding: spacing.lg,
      fontSize: typography.fontSize.base,
      border: `1px solid ${colors.border.default}`,
      color: colors.text.primary,
      transition: 'all 0.2s ease',
      fontFamily: typography.fontFamily.sans,
    },
    focus: {
      borderColor: colors.gray[600],
      outline: 'none',
      boxShadow: `0 0 0 3px ${colors.background.secondary}`,
    },
  },

  badge: {
    default: {
      backgroundColor: colors.background.secondary,
      color: colors.text.secondary,
      borderRadius: borderRadius.sm,
      padding: `${spacing.xs} ${spacing.sm}`,
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.medium,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px',
    },
    accent: {
      backgroundColor: colors.gray[100],
      color: colors.text.accent,
    },
  },
};

// Utility functions for consistent styling
export const createHoverStyles = (baseStyles: Record<string, any>, hoverStyles: Record<string, any>) => ({
  ...baseStyles,
  ':hover': {
    ...baseStyles[':hover'],
    ...hoverStyles,
  },
});

// Generate inline CSS strings for dynamic styling
export const generateInlineStyles = {
  highlightStyle: () => `background-color: ${colors.highlight.background} !important; padding: 2px 4px !important; border-radius: 3px !important; border: 1px solid ${colors.highlight.border} !important; box-shadow: 0 0 0 2px ${colors.highlight.border}40, 0 2px 4px rgba(0,0,0,0.1) !important; position: relative !important; z-index: 1100 !important; display: inline !important; font-weight: 500 !important; text-decoration: none !important; color: inherit !important;`,
  boxShadowMd: () => shadows.md,
  boxShadowLg: () => shadows.lg,
  boxShadowXl: () => shadows.xl,
  sidebarShadow: () => `-4px 0 8px -2px ${colors.background.overlay}, -2px 0 4px -1px ${colors.background.overlay}`,
  sidebarShadowHover: () => `-6px 0 12px -2px ${colors.background.overlay}, -4px 0 8px -1px ${colors.background.overlay}`,
  cardShadow: () => `0 1px 3px ${colors.background.overlay}`,
  cardShadowHover: () => `0 4px 6px -1px ${colors.background.overlay}, 0 2px 4px -1px ${colors.background.overlay}`,
  notification: () => `0 2px 8px ${colors.background.overlay}`,
};

export const createFocusStyles = (baseStyles: Record<string, any>, focusStyles: Record<string, any>) => ({
  ...baseStyles,
  ':focus': {
    ...baseStyles[':focus'],
    ...focusStyles,
    outline: 'none',
  },
});

// CSS Custom Properties Generator for content.css compatibility
export const generateCSSCustomProperties = () => `
  :root {
    --color-white: ${colors.white};
    --color-black: ${colors.black};
    --color-gray-25: ${colors.gray[25]};
    --color-gray-50: ${colors.gray[50]};
    --color-gray-100: ${colors.gray[100]};
    --color-gray-200: ${colors.gray[200]};
    --color-gray-300: ${colors.gray[300]};
    --color-gray-400: ${colors.gray[400]};
    --color-gray-500: ${colors.gray[500]};
    --color-gray-600: ${colors.gray[600]};
    --color-gray-700: ${colors.gray[700]};
    --color-gray-800: ${colors.gray[800]};
    --color-gray-900: ${colors.gray[900]};
    
    --color-text-primary: ${colors.text.primary};
    --color-text-secondary: ${colors.text.secondary};
    --color-text-tertiary: ${colors.text.tertiary};
    --color-text-accent: ${colors.text.accent};
    
    --color-bg-primary: ${colors.background.primary};
    --color-bg-secondary: ${colors.background.secondary};
    --color-bg-tertiary: ${colors.background.tertiary};
    --color-bg-overlay: ${colors.background.overlay};
    --color-bg-modal-overlay: ${colors.background.modalOverlay};
    
    --color-border-light: ${colors.border.light};
    --color-border-default: ${colors.border.default};
    --color-border-medium: ${colors.border.medium};
    --color-border-dark: ${colors.border.dark};
    
    --color-highlight-bg: ${colors.highlight.background};
    --color-highlight-border: ${colors.highlight.border};
    --color-highlight-hover: ${colors.highlight.hover};
    
    --color-success: ${colors.success};
    --color-error: ${colors.error};
    --color-warning: ${colors.warning};
    
    --shadow-sm: ${shadows.sm};
    --shadow-md: ${shadows.md};
    --shadow-lg: ${shadows.lg};
    --shadow-xl: ${shadows.xl};
    --shadow-modal: ${shadows.modal};
    
    --border-radius-sm: ${borderRadius.sm};
    --border-radius-md: ${borderRadius.md};
    --border-radius-lg: ${borderRadius.lg};
    --border-radius-xl: ${borderRadius.xl};
    
    --spacing-xs: ${spacing.xs};
    --spacing-sm: ${spacing.sm};
    --spacing-md: ${spacing.md};
    --spacing-lg: ${spacing.lg};
    --spacing-xl: ${spacing.xl};
    --spacing-2xl: ${spacing['2xl']};
    --spacing-3xl: ${spacing['3xl']};
    --spacing-4xl: ${spacing['4xl']};
    --spacing-5xl: ${spacing['5xl']};
  }
`;

// Animation utilities
export const animations = {
  fadeIn: {
    keyframes: `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    `,
    animation: 'fadeIn 0.2s ease-in-out',
  },
  
  slideIn: {
    keyframes: `
      @keyframes slideIn {
        from { transform: translateX(100%); }
        to { transform: translateX(0); }
      }
    `,
    animation: 'slideIn 0.3s ease-out',
  },
  
  scaleIn: {
    keyframes: `
      @keyframes scaleIn {
        from { transform: scale(0.95); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
    `,
    animation: 'scaleIn 0.2s ease-out',
  },
};