// Design System - Notion-inspired minimalistic design
// This file contains the core design tokens for the Golden Nugget Finder extension

export const colors = {
  // Ultra-minimal palette inspired by Notion
  // Only 5 core colors - everything else is derived
  
  // Core colors (Notion-inspired)
  white: '#FFFFFF',           // Pure white
  grayLight: '#F1F1EF',       // Notion's gray background
  grayMedium: '#787774',      // Notion's gray text
  grayDark: '#373530',        // Notion's default text
  blueSubtle: '#487CA5',      // Notion's blue (only color accent)

  // Semantic colors (ultra-minimal)
  text: {
    primary: '#373530',       // Notion's default text
    secondary: '#787774',     // Notion's gray text
    accent: '#487CA5',        // Notion's blue for links/actions
  },

  background: {
    primary: '#FFFFFF',       // Pure white
    secondary: '#F1F1EF',     // Notion's gray background
    overlay: 'rgba(55, 53, 48, 0.1)', // Ultra-subtle overlay
  },

  border: {
    light: '#F1F1EF',         // Notion's gray background as border
    default: 'rgba(120, 119, 116, 0.2)', // Ultra-subtle border
  },

  // Highlight colors - extremely subtle
  highlight: {
    background: 'rgba(120, 119, 116, 0.08)', // Ultra-subtle highlight
    border: 'rgba(120, 119, 116, 0.15)',     // Barely visible border
    hover: 'rgba(120, 119, 116, 0.12)',      // Slightly more visible on hover
  },

  // States (only when absolutely necessary)
  success: '#548164',         // Notion's green (very muted)
  error: '#C4554D',           // Notion's red (very muted)
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
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
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

// Component-specific styles
export const components = {
  button: {
    primary: {
      backgroundColor: colors.blueSubtle,
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
      borderColor: colors.blueSubtle,
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
      backgroundColor: colors.background.secondary,
      color: colors.blueSubtle,
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

export const createFocusStyles = (baseStyles: Record<string, any>, focusStyles: Record<string, any>) => ({
  ...baseStyles,
  ':focus': {
    ...baseStyles[':focus'],
    ...focusStyles,
    outline: 'none',
  },
});

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