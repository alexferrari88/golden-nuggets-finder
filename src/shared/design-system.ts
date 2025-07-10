// Design System - Notion-inspired minimalistic design
// This file contains the core design tokens for the Golden Nugget Finder extension

export const colors = {
  // Primary grays - Notion-inspired neutral palette
  gray: {
    50: '#fafafa',    // Almost white background
    100: '#f4f4f4',   // Light background
    200: '#e4e4e4',   // Light border
    300: '#d4d4d4',   // Border
    400: '#a3a3a3',   // Muted text
    500: '#737373',   // Secondary text
    600: '#525252',   // Primary text
    700: '#404040',   // Dark text
    800: '#262626',   // Darker text
    900: '#171717',   // Almost black
  },

  // Minimal accent colors
  accent: {
    blue: '#2563eb',     // Subtle blue for primary actions
    blueLight: '#dbeafe', // Light blue background
    green: '#16a34a',    // Success/positive
    greenLight: '#dcfce7', // Light green background
    amber: '#d97706',    // Warning/highlight
    amberLight: '#fef3c7', // Light amber background
    red: '#dc2626',      // Error/danger
    redLight: '#fee2e2', // Light red background
  },

  // Semantic colors
  text: {
    primary: '#171717',    // Main text
    secondary: '#525252',  // Secondary text
    tertiary: '#a3a3a3',   // Muted text
    accent: '#2563eb',     // Link/accent text
  },

  background: {
    primary: '#ffffff',    // Main background
    secondary: '#fafafa',  // Card/section background
    tertiary: '#f4f4f4',   // Input/tertiary background
    overlay: 'rgba(0, 0, 0, 0.2)', // Modal overlay
  },

  border: {
    light: '#f4f4f4',     // Very light border
    default: '#e4e4e4',   // Default border
    medium: '#d4d4d4',    // Medium border
    strong: '#a3a3a3',    // Strong border
  },

  // Highlight colors - much more subtle than current bright yellow
  highlight: {
    background: 'rgba(250, 204, 21, 0.15)', // Very subtle yellow
    border: 'rgba(250, 204, 21, 0.3)',      // Subtle yellow border
    hover: 'rgba(250, 204, 21, 0.25)',      // Slightly more visible on hover
  },
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
      backgroundColor: colors.accent.blue,
      color: colors.background.primary,
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
      backgroundColor: colors.background.primary,
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
      backgroundColor: colors.background.primary,
      borderRadius: borderRadius.lg,
      padding: spacing['2xl'],
      border: `1px solid ${colors.border.light}`,
      boxShadow: shadows.sm,
    },
    hover: {
      boxShadow: shadows.md,
      borderColor: colors.border.medium,
    },
  },

  input: {
    default: {
      backgroundColor: colors.background.primary,
      borderRadius: borderRadius.md,
      padding: spacing.lg,
      fontSize: typography.fontSize.base,
      border: `1px solid ${colors.border.default}`,
      color: colors.text.primary,
      transition: 'all 0.2s ease',
      fontFamily: typography.fontFamily.sans,
    },
    focus: {
      borderColor: colors.accent.blue,
      outline: 'none',
      boxShadow: `0 0 0 3px ${colors.accent.blueLight}`,
    },
  },

  badge: {
    default: {
      backgroundColor: colors.background.tertiary,
      color: colors.text.secondary,
      borderRadius: borderRadius.sm,
      padding: `${spacing.xs} ${spacing.sm}`,
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.medium,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px',
    },
    accent: {
      backgroundColor: colors.accent.blueLight,
      color: colors.accent.blue,
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