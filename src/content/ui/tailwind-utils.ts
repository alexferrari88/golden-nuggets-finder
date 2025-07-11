/**
 * Tailwind Utilities for Content Script UI Components
 * 
 * This module provides utility functions for applying Tailwind CSS classes
 * programmatically in vanilla JavaScript content scripts. It serves as the
 * replacement for the design-system.ts file, mapping all design tokens to
 * equivalent Tailwind classes with proper content script isolation.
 * 
 * Key Features:
 * - CSS class generation for DOM elements
 * - Design system token mapping to Tailwind classes
 * - Content script isolation with 'gnf-' prefix
 * - Type-safe style configuration
 * - Programmatic class application helpers
 */

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

export interface StyledElementOptions {
  tag: keyof HTMLElementTagMap;
  classes: string[];
  attributes?: Record<string, string>;
  content?: string;
  children?: HTMLElement[];
}

export interface SidebarStyleConfig {
  isOpen?: boolean;
  width?: 'normal' | 'wide' | 'narrow';
  position?: 'right' | 'left';
}

export interface NotificationStyleConfig {
  type: 'info' | 'success' | 'error' | 'progress';
  position?: 'top' | 'bottom';
  duration?: number;
}

export interface HighlightStyleConfig {
  intensity?: 'subtle' | 'medium' | 'strong';
  color?: 'gray' | 'blue' | 'yellow';
  hasIndicator?: boolean;
}

export interface PopupStyleConfig {
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  position?: 'top' | 'bottom' | 'left' | 'right';
  hasArrow?: boolean;
}

// =============================================================================
// DESIGN TOKEN MAPPINGS
// =============================================================================

/**
 * Maps design system color tokens to Tailwind classes
 * Maintains the Notion-inspired ultra-minimal aesthetic
 */
export const TailwindColorMap = {
  // Text colors
  textPrimary: 'text-gray-800',        // #2A2A2A
  textSecondary: 'text-gray-500',      // #6F6F6F
  textTertiary: 'text-gray-400',       // #A8A8A8
  textAccent: 'text-gray-900',         // #1A1A1A
  textWhite: 'text-white',             // #FFFFFF
  
  // Background colors
  bgPrimary: 'bg-white',               // #FFFFFF
  bgSecondary: 'bg-gray-25',           // #FCFCFC
  bgTertiary: 'bg-gray-50',            // #F7F7F7
  bgOverlay: 'bg-gray-900/5',          // rgba(26, 26, 26, 0.05)
  bgModalOverlay: 'bg-gray-900/30',    // rgba(26, 26, 26, 0.3)
  
  // Border colors
  borderLight: 'border-gray-100',      // #F1F1F1
  borderDefault: 'border-gray-200',    // #E6E6E6
  borderMedium: 'border-gray-300',     // #D0D0D0
  borderDark: 'border-gray-400',       // #A8A8A8
  
  // Highlight colors
  highlightBg: 'bg-gray-900/[0.02]',   // rgba(26, 26, 26, 0.02)
  highlightHover: 'hover:bg-gray-900/[0.04]', // rgba(26, 26, 26, 0.04)
  
  // Notification colors
  notificationProgress: 'bg-gray-700 text-white',
  notificationError: 'bg-gray-800 text-white',
  notificationInfo: 'bg-gray-900 text-white',
  notificationSuccess: 'bg-gray-600 text-white',
};

/**
 * Maps design system spacing tokens to Tailwind classes
 */
export const TailwindSpacingMap = {
  xs: 'p-1',      // 4px
  sm: 'p-2',      // 8px
  md: 'p-3',      // 12px
  lg: 'p-4',      // 16px
  xl: 'p-5',      // 20px
  '2xl': 'p-6',   // 24px
  '3xl': 'p-8',   // 32px
  '4xl': 'p-12',  // 48px
  '5xl': 'p-16',  // 64px
};

/**
 * Maps design system shadow tokens to Tailwind classes
 */
export const TailwindShadowMap = {
  sm: 'shadow-sm',      // 0 1px 2px 0 rgba(0, 0, 0, 0.05)
  md: 'shadow-md',      // 0 4px 6px -1px rgba(0, 0, 0, 0.1)
  lg: 'shadow-lg',      // 0 10px 15px -3px rgba(0, 0, 0, 0.1)
  xl: 'shadow-xl',      // 0 20px 25px -5px rgba(0, 0, 0, 0.1)
  modal: 'shadow-2xl',  // 0 25px 50px -12px rgba(0, 0, 0, 0.25)
};

/**
 * Maps design system border radius tokens to Tailwind classes
 */
export const TailwindRadiusMap = {
  sm: 'rounded-sm',     // 6px
  md: 'rounded-md',     // 8px
  lg: 'rounded-lg',     // 12px
  xl: 'rounded-xl',     // 16px
  full: 'rounded-full', // 9999px
};

/**
 * Maps design system typography tokens to Tailwind classes
 */
export const TailwindTypographyMap = {
  // Font sizes
  fontSizeXs: 'text-xs',     // 12px
  fontSizeSm: 'text-sm',     // 14px
  fontSizeBase: 'text-base', // 16px
  fontSizeLg: 'text-lg',     // 18px
  fontSizeXl: 'text-xl',     // 20px
  fontSize2xl: 'text-2xl',   // 24px
  fontSize3xl: 'text-3xl',   // 30px
  
  // Font weights
  fontWeightNormal: 'font-normal',     // 400
  fontWeightMedium: 'font-medium',     // 500
  fontWeightSemibold: 'font-semibold', // 600
  fontWeightBold: 'font-bold',         // 700
  
  // Line heights
  lineHeightTight: 'leading-tight',    // 1.25
  lineHeightNormal: 'leading-normal',  // 1.5
  lineHeightRelaxed: 'leading-relaxed', // 1.75
};

/**
 * Maps design system z-index tokens to Tailwind classes
 */
export const TailwindZIndexMap = {
  dropdown: 'z-[1000]',
  modal: 'z-[1050]',
  tooltip: 'z-[1100]',
  overlay: 'z-[1200]',
  sidebar: 'z-[1300]',
  notification: 'z-[1400]',
  toggle: 'z-[1500]',
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Creates a DOM element with Tailwind classes and content script isolation
 */
export function createStyledElement(options: StyledElementOptions): HTMLElement {
  const element = document.createElement(options.tag);
  
  // Apply CSS reset and isolation
  element.classList.add('gnf-reset', 'gnf-root');
  
  // Apply provided classes
  options.classes.forEach(cls => {
    element.classList.add(cls);
  });
  
  // Apply attributes
  if (options.attributes) {
    Object.entries(options.attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
  }
  
  // Set content
  if (options.content) {
    element.textContent = options.content;
  }
  
  // Append children
  if (options.children) {
    options.children.forEach(child => element.appendChild(child));
  }
  
  return element;
}

/**
 * Applies sidebar-specific class combinations
 */
export function applySidebarStyles(element: HTMLElement, config: SidebarStyleConfig = {}): void {
  // Base sidebar classes
  const baseClasses = [
    'gnf-sidebar',
    'fixed',
    'top-0',
    'h-screen',
    'bg-white',
    'border-l',
    'border-gray-200',
    'overflow-y-auto',
    TailwindZIndexMap.sidebar,
    TailwindShadowMap.lg,
    'backdrop-blur-sm',
    'font-sans'
  ];
  
  // Width classes
  const widthClasses = {
    narrow: 'w-80',  // 320px
    normal: 'w-96',  // 384px
    wide: 'w-[450px]' // 450px
  };
  
  // Position classes
  const positionClasses = {
    right: 'right-0',
    left: 'left-0'
  };
  
  // Apply classes
  baseClasses.forEach(cls => element.classList.add(cls));
  element.classList.add(widthClasses[config.width || 'normal']);
  element.classList.add(positionClasses[config.position || 'right']);
  
  // Add scrollbar styles via CSS
  element.style.scrollbarWidth = 'thin';
  element.style.scrollbarColor = 'rgba(0, 0, 0, 0.2) transparent';
}

/**
 * Applies notification-specific class combinations
 */
export function applyNotificationStyles(element: HTMLElement, config: NotificationStyleConfig): void {
  // Base notification classes
  const baseClasses = [
    'gnf-notification-banner',
    'fixed',
    'left-1/2',
    'transform',
    '-translate-x-1/2',
    'px-5',
    'py-3',
    'rounded-lg',
    TailwindZIndexMap.notification,
    TailwindShadowMap.md,
    'font-sans',
    TailwindTypographyMap.fontSizeSm,
    TailwindTypographyMap.fontWeightMedium,
    'max-w-sm',
    'text-center',
    'animate-[slideDown_0.3s_ease]',
    'backdrop-blur-sm',
    'border',
    'border-gray-200'
  ];
  
  // Position classes
  const positionClasses = {
    top: 'top-6',
    bottom: 'bottom-6'
  };
  
  // Type-specific classes
  const typeClasses = {
    info: 'gnf-banner-info bg-gray-900 text-white',
    success: 'gnf-banner-success bg-gray-600 text-white',
    error: 'gnf-banner-error bg-gray-800 text-white',
    progress: 'gnf-banner-progress bg-gray-700 text-white'
  };
  
  // Apply classes
  baseClasses.forEach(cls => element.classList.add(cls));
  element.classList.add(positionClasses[config.position || 'top']);
  element.classList.add(typeClasses[config.type]);
}

/**
 * Applies highlight-specific class combinations
 */
export function applyHighlightStyles(element: HTMLElement, config: HighlightStyleConfig = {}): void {
  // Base highlight classes
  const baseClasses = [
    'gnf-highlight',
    'inline',
    'px-0.5',
    'py-px',
    'rounded-sm',
    'transition-all',
    'duration-200',
    'ease-in-out',
    'border-b',
    'border-gray-900/[0.06]',
    'shadow-[0_0_0_1px_rgba(0,0,0,0.06)]'
  ];
  
  // Intensity classes
  const intensityClasses = {
    subtle: 'bg-gray-900/[0.02] hover:bg-gray-900/[0.04]',
    medium: 'bg-gray-900/[0.04] hover:bg-gray-900/[0.06]',
    strong: 'bg-gray-900/[0.06] hover:bg-gray-900/[0.08]'
  };
  
  // Apply classes
  baseClasses.forEach(cls => element.classList.add(cls));
  element.classList.add(intensityClasses[config.intensity || 'subtle']);
  
  // Add indicator if needed
  if (config.hasIndicator) {
    element.classList.add('gnf-has-indicator');
  }
}

/**
 * Applies popup-specific class combinations
 */
export function applyPopupStyles(element: HTMLElement, config: PopupStyleConfig = {}): void {
  // Base popup classes
  const baseClasses = [
    'gnf-synthesis-popup',
    'absolute',
    'bg-white',
    'border',
    'border-gray-200',
    'p-4',
    'rounded-lg',
    TailwindShadowMap.lg,
    TailwindZIndexMap.tooltip,
    'font-sans',
    TailwindTypographyMap.fontSizeSm,
    TailwindTypographyMap.lineHeightNormal,
    TailwindColorMap.textPrimary,
    'backdrop-blur-sm'
  ];
  
  // Max width classes
  const maxWidthClasses = {
    sm: 'max-w-xs',   // 320px
    md: 'max-w-sm',   // 384px
    lg: 'max-w-md',   // 448px
    xl: 'max-w-lg'    // 512px
  };
  
  // Apply classes
  baseClasses.forEach(cls => element.classList.add(cls));
  element.classList.add(maxWidthClasses[config.maxWidth || 'sm']);
}

/**
 * Applies button-specific class combinations
 */
export function applyButtonStyles(element: HTMLElement, variant: 'primary' | 'secondary' | 'ghost' = 'primary'): void {
  // Base button classes
  const baseClasses = [
    'gnf-button',
    'inline-flex',
    'items-center',
    'justify-center',
    'rounded-lg',
    'font-medium',
    'transition-all',
    'duration-200',
    'cursor-pointer',
    'focus:outline-none',
    'focus:ring-2',
    'focus:ring-offset-2',
    'focus:ring-gray-900'
  ];
  
  // Variant-specific classes
  const variantClasses = {
    primary: [
      'bg-black',
      'text-white',
      'px-4',
      'py-3',
      'text-sm',
      'font-medium',
      'border-none',
      'shadow-sm',
      'hover:bg-gray-800'
    ],
    secondary: [
      'bg-white',
      'text-gray-800',
      'px-4',
      'py-3',
      'text-sm',
      'font-medium',
      'border',
      'border-gray-200',
      'shadow-sm',
      'hover:bg-gray-50',
      'hover:border-gray-300'
    ],
    ghost: [
      'bg-transparent',
      'text-gray-500',
      'px-3',
      'py-2',
      'text-sm',
      'font-medium',
      'border-none',
      'hover:bg-gray-100',
      'hover:text-gray-800'
    ]
  };
  
  // Apply classes
  baseClasses.forEach(cls => element.classList.add(cls));
  variantClasses[variant].forEach(cls => element.classList.add(cls));
}

/**
 * Applies card-specific class combinations
 */
export function applyCardStyles(element: HTMLElement, isHoverable: boolean = false): void {
  // Base card classes
  const baseClasses = [
    'gnf-item',
    'mb-4',
    'p-5',
    'border',
    'border-gray-100',
    'rounded-lg',
    'bg-white',
    'transition-all',
    'duration-200',
    'shadow-sm',
    'relative'
  ];
  
  // Hover classes
  const hoverClasses = [
    'hover:border-gray-200',
    'hover:shadow-md',
    'cursor-pointer'
  ];
  
  // Apply classes
  baseClasses.forEach(cls => element.classList.add(cls));
  
  if (isHoverable) {
    hoverClasses.forEach(cls => element.classList.add(cls));
  }
}

/**
 * Applies badge-specific class combinations
 */
export function applyBadgeStyles(element: HTMLElement, variant: 'default' | 'accent' = 'default'): void {
  // Base badge classes
  const baseClasses = [
    'gnf-type-badge',
    'inline-block',
    'px-2',
    'py-1',
    'rounded-sm',
    'text-xs',
    'font-medium',
    'uppercase',
    'mb-3',
    'tracking-wider'
  ];
  
  // Variant classes
  const variantClasses = {
    default: ['bg-gray-50', 'text-gray-500'],
    accent: ['bg-gray-100', 'text-gray-900']
  };
  
  // Apply classes
  baseClasses.forEach(cls => element.classList.add(cls));
  variantClasses[variant].forEach(cls => element.classList.add(cls));
}

/**
 * Applies toggle button-specific class combinations
 */
export function applyToggleButtonStyles(element: HTMLElement): void {
  const classes = [
    'gnf-toggle-button',
    'fixed',
    'right-0',
    'top-1/2',
    'transform',
    '-translate-y-1/2',
    'translate-x-full',
    'w-10',
    'h-20',
    'bg-white',
    'text-gray-500',
    'border',
    'border-gray-200',
    'border-r-0',
    'rounded-l-lg',
    'cursor-pointer',
    'flex',
    'items-center',
    'justify-center',
    'flex-col',
    'shadow-md',
    'transition-all',
    'duration-300',
    'ease-[cubic-bezier(0.4,0,0.2,1)]',
    'backdrop-blur-sm',
    'font-sans',
    'text-xs',
    'font-medium',
    'tracking-wide',
    'uppercase',
    'opacity-80',
    TailwindZIndexMap.toggle,
    'select-none',
    'hover:translate-x-0',
    'hover:text-gray-800',
    'hover:shadow-lg',
    'hover:opacity-100',
    'hover:border-gray-300',
    'focus:outline-none',
    'focus:ring-2',
    'focus:ring-gray-900',
    'focus:ring-offset-2'
  ];
  
  classes.forEach(cls => element.classList.add(cls));
}

// =============================================================================
// RESPONSIVE UTILITIES
// =============================================================================

/**
 * Applies responsive classes for mobile optimization
 */
export function applyResponsiveStyles(element: HTMLElement, component: 'sidebar' | 'notification' | 'toggle'): void {
  const responsiveClasses = {
    sidebar: [
      'md:w-96',
      'w-full',
      'md:left-auto',
      'left-0',
      'md:right-0',
      'right-0'
    ],
    notification: [
      'md:left-1/2',
      'left-3',
      'md:right-auto',
      'right-3',
      'md:transform',
      'md:-translate-x-1/2',
      'md:max-w-sm',
      'max-w-none'
    ],
    toggle: [
      'md:w-10',
      'w-12',
      'md:h-20',
      'h-12',
      'md:rounded-l-lg',
      'rounded-full',
      'md:top-1/2',
      'top-6',
      'md:right-0',
      'right-6',
      'md:transform',
      'md:-translate-y-1/2',
      'md:translate-x-full',
      'translate-x-0',
      'md:flex-col',
      'flex-row',
      'md:text-xs',
      'text-sm'
    ]
  };
  
  responsiveClasses[component].forEach(cls => element.classList.add(cls));
}

// =============================================================================
// ANIMATION UTILITIES
// =============================================================================

/**
 * Applies animation classes for smooth transitions
 */
export function applyAnimationStyles(element: HTMLElement, animation: 'fadeIn' | 'slideIn' | 'slideDown' | 'scaleIn'): void {
  const animationClasses = {
    fadeIn: 'animate-[fadeIn_0.2s_ease-in-out]',
    slideIn: 'animate-[slideIn_0.3s_ease-out]',
    slideDown: 'animate-[slideDown_0.3s_ease]',
    scaleIn: 'animate-[scaleIn_0.2s_ease-out]'
  };
  
  element.classList.add(animationClasses[animation]);
}

// =============================================================================
// UTILITY CLASS GENERATORS
// =============================================================================

/**
 * Generates a complete class string for common UI patterns
 */
export function generateClassString(baseClasses: string[], modifiers: string[] = []): string {
  return [...baseClasses, ...modifiers].join(' ');
}

/**
 * Creates a class name with the gnf- prefix for isolation
 */
export function createPrefixedClass(className: string): string {
  return `gnf-${className}`;
}

/**
 * Generates utility classes for common spacing patterns
 */
export function getSpacingClasses(spacing: keyof typeof TailwindSpacingMap): string[] {
  return [
    TailwindSpacingMap[spacing],
    `m${spacing}`,
    `mb-${spacing}`,
    `mt-${spacing}`,
    `ml-${spacing}`,
    `mr-${spacing}`
  ];
}

/**
 * Generates utility classes for common color patterns
 */
export function getColorClasses(color: keyof typeof TailwindColorMap): string[] {
  return [
    TailwindColorMap[color],
    `border-${color}`,
    `hover:${color}`,
    `focus:${color}`
  ];
}

// =============================================================================
// BACKWARDS COMPATIBILITY
// =============================================================================

/**
 * Legacy function mappings for smooth migration from design-system.ts
 * These maintain the same function signatures but use Tailwind classes
 */
export const legacyMappings = {
  // Replace generateInlineStyles.highlightStyle()
  highlightStyle: () => 'gnf-highlight bg-gray-900/[0.02] px-0.5 py-px rounded-sm border-b border-gray-900/[0.06] shadow-[0_0_0_1px_rgba(0,0,0,0.06)]',
  
  // Replace generateInlineStyles.cardShadow()
  cardShadow: () => 'shadow-sm',
  
  // Replace generateInlineStyles.sidebarShadow()
  sidebarShadow: () => 'shadow-lg',
  
  // Replace generateInlineStyles.notification()
  notification: () => 'shadow-md',
  
  // Replace color references
  colors: TailwindColorMap,
  spacing: TailwindSpacingMap,
  shadows: TailwindShadowMap,
  borderRadius: TailwindRadiusMap,
  typography: TailwindTypographyMap,
  zIndex: TailwindZIndexMap
};

// =============================================================================
// EXPORT ALL UTILITIES
// =============================================================================

export {
  TailwindColorMap as colors,
  TailwindSpacingMap as spacing,
  TailwindShadowMap as shadows,
  TailwindRadiusMap as borderRadius,
  TailwindTypographyMap as typography,
  TailwindZIndexMap as zIndex
};