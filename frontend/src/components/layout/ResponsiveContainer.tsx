import type { ReactNode } from "react"
import { cn } from "../../lib/utils"

interface ResponsiveContainerProps {
  children: ReactNode
  className?: string
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full"
  padding?: "none" | "sm" | "md" | "lg"
  spacing?: "none" | "sm" | "md" | "lg"
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  className = "",
  maxWidth = "2xl",
  padding = "md",
  spacing = "md",
}) => {
  const maxWidthClass = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    full: "max-w-full",
  }[maxWidth]

  const paddingClass = {
    none: "",
    sm: "px-2 sm:px-4",
    md: "px-4 sm:px-6",
    lg: "px-6 sm:px-8",
  }[padding]

  const spacingClass = {
    none: "",
    sm: "space-y-2 sm:space-y-3",
    md: "space-y-4 sm:space-y-6",
    lg: "space-y-6 sm:space-y-8",
  }[spacing]

  return (
    <div
      className={cn(
        "mx-auto w-full",
        maxWidthClass,
        paddingClass,
        spacingClass,
        className,
      )}
    >
      {children}
    </div>
  )
}

interface ResponsiveGridProps {
  children: ReactNode
  className?: string
  cols?: {
    default: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
  }
  gap?: "sm" | "md" | "lg"
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  className = "",
  cols = { default: 1, md: 2, lg: 3 },
  gap = "md",
}) => {
  const colsClass = [
    `grid-cols-${cols.default}`,
    cols.sm && `sm:grid-cols-${cols.sm}`,
    cols.md && `md:grid-cols-${cols.md}`,
    cols.lg && `lg:grid-cols-${cols.lg}`,
    cols.xl && `xl:grid-cols-${cols.xl}`,
  ]
    .filter(Boolean)
    .join(" ")

  const gapClass = {
    sm: "gap-2 sm:gap-3",
    md: "gap-4 sm:gap-6",
    lg: "gap-6 sm:gap-8",
  }[gap]

  return (
    <div className={cn("grid", colsClass, gapClass, className)}>{children}</div>
  )
}

interface MobileOptimizedCardProps {
  children: ReactNode
  className?: string
  collapsible?: boolean
  title?: string
}

export const MobileOptimizedCard: React.FC<MobileOptimizedCardProps> = ({
  children,
  className = "",
  collapsible = false,
  title,
}) => {
  return (
    <div
      className={cn(
        "rounded-lg border bg-white shadow-sm",
        "w-full overflow-hidden",
        // Mobile-first responsive padding
        "p-3 sm:p-4 md:p-6",
        className,
      )}
    >
      {title && (
        <div
          className={cn(
            "mb-3 font-semibold text-gray-900 sm:mb-4",
            "text-sm sm:text-base",
            collapsible && "cursor-pointer hover:text-gray-700",
          )}
        >
          {title}
        </div>
      )}
      <div className="w-full overflow-x-auto">{children}</div>
    </div>
  )
}

interface ResponsiveStackProps {
  children: ReactNode
  className?: string
  direction?: "vertical" | "horizontal-on-desktop"
  spacing?: "sm" | "md" | "lg"
  align?: "start" | "center" | "end" | "stretch"
}

export const ResponsiveStack: React.FC<ResponsiveStackProps> = ({
  children,
  className = "",
  direction = "vertical",
  spacing = "md",
  align = "stretch",
}) => {
  const directionClass =
    direction === "horizontal-on-desktop"
      ? "flex flex-col md:flex-row"
      : "flex flex-col"

  const spacingClass =
    direction === "horizontal-on-desktop"
      ? {
          sm: "gap-2 md:gap-3",
          md: "gap-4 md:gap-6",
          lg: "gap-6 md:gap-8",
        }[spacing]
      : {
          sm: "gap-2",
          md: "gap-4",
          lg: "gap-6",
        }[spacing]

  const alignClass = {
    start: "items-start",
    center: "items-center",
    end: "items-end",
    stretch: "items-stretch",
  }[align]

  return (
    <div className={cn(directionClass, spacingClass, alignClass, className)}>
      {children}
    </div>
  )
}

// Hook for responsive breakpoints
export const useResponsive = () => {
  return {
    isMobile: window.innerWidth < 640,
    isTablet: window.innerWidth >= 640 && window.innerWidth < 1024,
    isDesktop: window.innerWidth >= 1024,
  }
}
