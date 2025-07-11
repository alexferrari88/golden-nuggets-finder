# Tailwind CSS 4 + Shadcn UI Migration Plan

## Overview
Complete migration from custom design system to Tailwind CSS 4 + Shadcn UI for the Golden Nugget Finder Chrome extension. This involves migrating both React components and complex vanilla JavaScript content script UI components.

## System Architecture Analysis

### Current State
- **Build System**: WXT + Vite + Tailwind CSS 3.x (underutilized)
- **Design System**: Custom `src/shared/design-system.ts` (351 lines of design tokens)
- **React Components**: `popup.tsx` (~720 lines), `options.tsx` (~1,222 lines) with inline styles
- **Content Script UI**: Vanilla JS/TS components with dynamic DOM creation and inline styles:
  - `sidebar.ts` (~1,089 lines)
  - `notifications.ts` (~230 lines)
  - `comment-selector.ts` (complex multi-step UI)
  - `highlighter.ts` (~656 lines)
- **CSS**: `src/styles/content.css` (404 lines)

### Target State
- **Build System**: WXT + Vite + Tailwind CSS 4
- **Component Library**: Shadcn UI with Tailwind classes
- **Styling**: Utility-first CSS with proper content script isolation
- **Design Consistency**: Maintained Notion-inspired minimalistic aesthetic

## Migration Tasks

### Phase 1: Foundation Setup

#### Task 1.1: Create Migration Branch
**Status**: TODO
**Priority**: High
**Estimated Time**: 5 minutes

**Context**: Set up isolated branch for migration work to avoid affecting main development.

**Actions**:
1. Create new branch from main: `git checkout -b feature/tailwind-v4-shadcn-migration`
2. Ensure clean working directory
3. Push branch to remote for backup

**Success Criteria**:
- New branch created and pushed
- No uncommitted changes in working directory

---

#### Task 1.2: Install Tailwind CSS 4 Dependencies
**Status**: TODO
**Priority**: High
**Estimated Time**: 15 minutes

**Context**: Install Tailwind CSS 4 and core dependencies. Note: Tailwind CSS 4 uses `@tailwindcss/vite` plugin instead of PostCSS.

**Actions**:
1. Install Tailwind CSS 4: `npm install tailwindcss@latest @tailwindcss/vite@latest`
2. Remove old PostCSS dependencies if any: `npm uninstall @tailwindcss/postcss`
3. Verify installation: `npm ls tailwindcss`

**Success Criteria**:
- Tailwind CSS 4 installed successfully
- No dependency conflicts
- `package.json` updated with correct versions

---

#### Task 1.3: Install Shadcn UI Dependencies
**Status**: TODO
**Priority**: High
**Estimated Time**: 10 minutes

**Context**: Install core Shadcn UI dependencies required for component system.

**Actions**:
1. Install core dependencies: `npm install class-variance-authority clsx tailwind-merge tw-animate-css lucide-react`
2. Install Radix UI primitives: `npm install @radix-ui/react-slot @radix-ui/react-dialog @radix-ui/react-alert-dialog`
3. Verify installations: `npm ls | grep -E "(class-variance-authority|clsx|tailwind-merge|radix-ui)"`

**Success Criteria**:
- All Shadcn UI dependencies installed
- No peer dependency warnings
- Ready for Shadcn UI initialization

---

#### Task 1.4: Configure Tailwind CSS 4
**Status**: TODO
**Priority**: High
**Estimated Time**: 30 minutes

**Context**: Update Tailwind configuration for v4 and WXT integration. Need to handle both regular components and content script isolation.

**Actions**:
1. Update `tailwind.config.mjs` for Tailwind CSS 4:
   - Add proper content paths for WXT structure
   - Configure content script CSS isolation with prefix
   - Set up design tokens that match existing Notion-inspired palette
2. Update `wxt.config.ts` to include `@tailwindcss/vite` plugin
3. Create main CSS file at `src/styles/main.css` with `@import "tailwindcss"`
4. Update content script CSS architecture for proper scoping

**Files to modify**:
- `tailwind.config.mjs`
- `wxt.config.ts`
- `src/styles/main.css` (create new)
- `src/styles/content.css` (prepare for major changes)

**Success Criteria**:
- Tailwind CSS 4 compiles successfully
- Extension builds without errors
- Content script CSS properly scoped

---

#### Task 1.5: Initialize Shadcn UI
**Status**: TODO
**Priority**: High
**Estimated Time**: 20 minutes

**Context**: Set up Shadcn UI configuration and component structure for the extension.

**Actions**:
1. Run `npx shadcn@latest init` and configure:
   - Style: default
   - Base color: zinc (matches existing gray palette)
   - CSS variables: yes
   - Tailwind config: `tailwind.config.mjs`
   - Components directory: `src/components/ui`
   - Utils: `src/lib/utils`
2. Create `src/lib/utils.ts` with `cn()` function
3. Install initial components: `npx shadcn@latest add button card alert input textarea`

**Files created**:
- `components.json`
- `src/lib/utils.ts`
- `src/components/ui/` (directory with components)

**Success Criteria**:
- Shadcn UI initialized successfully
- Basic components available
- No TypeScript errors

---

### Phase 2: Content Script CSS Architecture

#### Task 2.1: Design Content Script CSS Isolation Strategy
**Status**: TODO
**Priority**: High
**Estimated Time**: 45 minutes

**Context**: Content scripts inject UI into arbitrary websites. Need bulletproof CSS isolation to prevent conflicts with host page styles while maintaining design consistency.

**Actions**:
1. Analyze current `src/styles/content.css` structure
2. Design CSS scoping strategy:
   - Use CSS prefix for all content script styles (e.g., `gnf-` for Golden Nugget Finder)
   - Create Tailwind configuration for content script build
   - Ensure no global styles leak to host page
3. Create new content script CSS architecture:
   - `src/styles/content-script.css` for content script specific styles
   - Use CSS cascade layers for proper isolation
   - Include only necessary Tailwind utilities
4. Document CSS isolation strategy in comments

**Files to create/modify**:
- `src/styles/content-script.css`
- Update `tailwind.config.mjs` with content script configuration
- Document CSS architecture in comments

**Success Criteria**:
- Clear CSS isolation strategy defined
- No style conflicts with host pages
- Tailwind utilities properly scoped

---

#### Task 2.2: Create Content Script Tailwind Utilities
**Status**: TODO
**Priority**: High
**Estimated Time**: 60 minutes

**Context**: Create utility functions for applying Tailwind classes programmatically in vanilla JS content scripts. Need to replace design-system.ts functions with Tailwind equivalents.

**Actions**:
1. Create `src/content/ui/tailwind-utils.ts` with utility functions:
   - `createStyledElement()` - creates DOM elements with Tailwind classes
   - `applySidebarStyles()` - applies sidebar-specific class combinations
   - `applyNotificationStyles()` - applies notification-specific class combinations
   - `applyHighlightStyles()` - applies highlight-specific class combinations
2. Map existing design system tokens to Tailwind classes:
   - `colors.background.primary` → `bg-white`
   - `colors.text.primary` → `text-gray-800`
   - `spacing.md` → `p-4`
   - `shadows.md` → `shadow-md`
   - `borderRadius.md` → `rounded-md`
3. Create class combination utilities for common patterns
4. Add TypeScript types for style configuration

**Files to create**:
- `src/content/ui/tailwind-utils.ts`

**Success Criteria**:
- Utility functions created and typed
- Design system tokens mapped to Tailwind
- Ready for content script UI migration

---

### Phase 3: Content Script UI Component Migration

#### Task 3.1: Migrate Sidebar Component
**Status**: TODO
**Priority**: High
**Estimated Time**: 2 hours

**Context**: `sidebar.ts` is the most complex content script component (~1,089 lines) with extensive inline styling using design system. Need to convert all styling to Tailwind classes while maintaining functionality.

**Actions**:
1. Analyze current sidebar styling in `src/content/ui/sidebar.ts`
2. Replace all design system imports with Tailwind utility imports
3. Convert inline styles to Tailwind classes:
   - Background colors: `colors.background.primary` → `bg-white`
   - Text colors: `colors.text.primary` → `text-gray-800`
   - Shadows: `generateInlineStyles.cardShadow()` → `shadow-md`
   - Spacing: `spacing.md` → `p-4`, `m-4`, etc.
   - Typography: `typography.fontSize.sm` → `text-sm`
   - Borders: `colors.border.light` → `border-gray-200`
4. Update dynamic DOM creation to use Tailwind classes
5. Handle hover states with Tailwind hover variants
6. Update responsive design with Tailwind breakpoints
7. Test sidebar functionality thoroughly

**Files to modify**:
- `src/content/ui/sidebar.ts`

**Success Criteria**:
- All inline styles replaced with Tailwind classes
- Sidebar functionality unchanged
- Visual appearance matches existing design
- No console errors

---

#### Task 3.2: Migrate Notifications Component
**Status**: TODO
**Priority**: High
**Estimated Time**: 45 minutes

**Context**: `notifications.ts` creates banner notifications with design system styling. Need to convert to Tailwind classes while maintaining notification types and auto-hide functionality.

**Actions**:
1. Analyze current notification styling in `src/content/ui/notifications.ts`
2. Replace design system imports with Tailwind classes
3. Convert notification type styling:
   - Success notifications: green variants
   - Error notifications: red variants
   - Progress notifications: blue variants
   - Info notifications: gray variants
4. Update banner positioning and z-index with Tailwind utilities
5. Convert animations to Tailwind animation classes
6. Test all notification types

**Files to modify**:
- `src/content/ui/notifications.ts`

**Success Criteria**:
- All notification types styled with Tailwind
- Animations working correctly
- Auto-hide functionality intact
- Visual consistency maintained

---

#### Task 3.3: Migrate Comment Selector Component
**Status**: TODO
**Priority**: Medium
**Estimated Time**: 90 minutes

**Context**: `comment-selector.ts` creates complex multi-step UI with control panels, checkboxes, and analysis steps. Contains extensive styling using design system.

**Actions**:
1. Analyze current comment selector styling in `src/content/ui/comment-selector.ts`
2. Replace design system imports with Tailwind classes
3. Convert control panel styling:
   - Panel backgrounds and borders
   - Button styling for prompt selection
   - Checkbox styling for comment selection
   - Step progress indicators
4. Update analysis step styling:
   - Step containers and progress indicators
   - Typing animation effects
   - Completion states
5. Handle dynamic step creation with Tailwind classes
6. Test full comment selection workflow

**Files to modify**:
- `src/content/ui/comment-selector.ts`

**Success Criteria**:
- Control panel styled with Tailwind
- Comment selection UI functional
- Analysis steps display correctly
- No styling regressions

---

#### Task 3.4: Migrate Highlighter Component
**Status**: TODO
**Priority**: Medium
**Estimated Time**: 75 minutes

**Context**: `highlighter.ts` creates text highlights and popups with subtle design system styling. Need to maintain ultra-minimal highlighting aesthetic with Tailwind.

**Actions**:
1. Analyze current highlighter styling in `src/content/ui/highlighter.ts`
2. Replace design system imports with Tailwind classes
3. Convert highlight styling:
   - Highlight background colors: subtle gray overlays
   - Highlight borders: minimal borders
   - Popup styling: card-like appearance
4. Update popup positioning and z-index
5. Convert hover effects to Tailwind hover variants
6. Maintain text selection and scroll behavior
7. Test highlighting across different content types

**Files to modify**:
- `src/content/ui/highlighter.ts`

**Success Criteria**:
- Highlights styled with Tailwind
- Popup functionality intact
- Visual subtlety maintained
- No text selection issues

---

### Phase 4: React Component Migration

#### Task 4.1: Migrate Popup Component
**Status**: TODO
**Priority**: High
**Estimated Time**: 90 minutes

**Context**: `popup.tsx` is a React component (~720 lines) with extensive inline styling using design system. Need to convert to Tailwind classes and integrate Shadcn UI components.

**Actions**:
1. Analyze current popup styling in `src/entrypoints/popup.tsx`
2. Replace design system imports with Tailwind classes
3. Convert inline styles to Tailwind utility classes:
   - Container styling: backgrounds, padding, borders
   - Typography: text sizes, colors, weights
   - Layout: flexbox, grid, spacing
   - Interactive elements: buttons, hover states
4. Integrate Shadcn UI components:
   - Replace custom buttons with Shadcn Button component
   - Replace custom cards with Shadcn Card component
   - Use Shadcn Badge for status indicators
5. Update typing animation to use Tailwind classes
6. Test popup functionality and appearance

**Files to modify**:
- `src/entrypoints/popup.tsx`

**Success Criteria**:
- All inline styles replaced with Tailwind
- Shadcn UI components integrated
- Popup functionality unchanged
- Visual consistency maintained

---

#### Task 4.2: Migrate Options Component
**Status**: TODO
**Priority**: High
**Estimated Time**: 2 hours

**Context**: `options.tsx` is the largest React component (~1,222 lines) with complex forms, alerts, and extensive inline styling. Need comprehensive migration to Tailwind + Shadcn UI.

**Actions**:
1. Analyze current options styling in `src/entrypoints/options.tsx`
2. Replace design system imports with Tailwind classes
3. Convert form styling:
   - Input fields: borders, focus states, validation states
   - Textarea styling: sizing, borders, focus states
   - Label styling: typography, spacing
   - Button styling: variants, hover states
4. Integrate Shadcn UI components:
   - Replace custom inputs with Shadcn Input component
   - Replace custom textareas with Shadcn Textarea component
   - Replace custom buttons with Shadcn Button component
   - Replace custom alerts with Shadcn Alert component
   - Add Shadcn Dialog for confirmations
5. Update alert system to use Shadcn Alert variants
6. Test all form functionality and validation

**Files to modify**:
- `src/entrypoints/options.tsx`

**Success Criteria**:
- All form elements use Shadcn UI components
- Form validation and functionality intact
- Alert system working correctly
- Visual consistency maintained

---

### Phase 5: Design System Cleanup

#### Task 5.1: Remove Design System File
**Status**: TODO
**Priority**: Medium
**Estimated Time**: 30 minutes

**Context**: Remove the custom design system file and update any remaining imports. This should be done after all components are migrated.

**Actions**:
1. Create backup of `src/shared/design-system.ts` for reference
2. Search for remaining design system imports across codebase:
   - `grep -r "design-system" src/`
   - `grep -r "generateInlineStyles" src/`
   - `grep -r "colors\." src/`
3. Update any remaining imports to use Tailwind classes
4. Delete `src/shared/design-system.ts`
5. Remove design system exports from any index files
6. Run TypeScript compiler to check for errors

**Files to delete**:
- `src/shared/design-system.ts`

**Success Criteria**:
- Design system file removed
- No remaining imports
- No TypeScript compilation errors
- Extension builds successfully

---

#### Task 5.2: Update Content Script CSS
**Status**: TODO
**Priority**: Medium
**Estimated Time**: 45 minutes

**Context**: Replace the existing `content.css` with new Tailwind-based content script styles.

**Actions**:
1. Analyze current `src/styles/content.css` (404 lines)
2. Identify critical styles that need to be preserved
3. Create new content script CSS using Tailwind utilities
4. Ensure proper CSS scoping and isolation
5. Remove unused styles and consolidate where possible
6. Test content script styling across different websites
7. Verify no style conflicts with host pages

**Files to modify**:
- `src/styles/content.css`

**Success Criteria**:
- Content script CSS uses Tailwind utilities
- No style conflicts with host pages
- All UI components styled correctly
- Reduced CSS bundle size

---

### Phase 6: Testing and Validation

#### Task 6.1: Visual Regression Testing
**Status**: TODO
**Priority**: High
**Estimated Time**: 60 minutes

**Context**: Comprehensive testing to ensure visual consistency and functionality across all components.

**Actions**:
1. Test popup component:
   - Open extension popup
   - Verify all styling matches original design
   - Test interactive elements and animations
   - Test responsive behavior
2. Test options component:
   - Open extension options page
   - Test all form elements
   - Verify alert system functionality
   - Test prompt management features
3. Test content script UI:
   - Test on multiple websites (Reddit, Hacker News, generic sites)
   - Verify sidebar functionality
   - Test notification banners
   - Test comment selector workflow
   - Test text highlighting
4. Document any visual regressions or issues

**Success Criteria**:
- All components visually match original design
- No functionality regressions
- Content script UI works across different sites
- No console errors

---

#### Task 6.2: Performance Testing
**Status**: TODO
**Priority**: Medium
**Estimated Time**: 30 minutes

**Context**: Verify that the migration didn't negatively impact performance, especially content script injection speed.

**Actions**:
1. Measure content script injection time before and after migration
2. Check CSS bundle sizes:
   - Compare old `content.css` size with new version
   - Verify Tailwind CSS is properly purged
3. Test extension loading time in dev and production builds
4. Monitor memory usage during content script execution
5. Verify no performance regressions in E2E tests

**Success Criteria**:
- Content script injection speed maintained or improved
- CSS bundle size reduced or maintained
- No performance regressions
- E2E tests pass

---

#### Task 6.3: Cross-Browser Testing
**Status**: TODO
**Priority**: Medium
**Estimated Time**: 45 minutes

**Context**: Test the extension across different browsers to ensure compatibility.

**Actions**:
1. Test in Chrome (primary target)
2. Test in Firefox using dev build
3. Test in Edge if possible
4. Verify all UI components work correctly
5. Check for any browser-specific styling issues
6. Test content script injection across browsers

**Success Criteria**:
- Extension works in all target browsers
- No browser-specific styling issues
- Content script UI consistent across browsers

---

### Phase 7: Documentation and Cleanup

#### Task 7.1: Update Documentation
**Status**: TODO
**Priority**: Low
**Estimated Time**: 30 minutes

**Context**: Update project documentation to reflect the new Tailwind CSS + Shadcn UI architecture.

**Actions**:
1. Update `CLAUDE.md` to remove design system references
2. Update component documentation to mention Tailwind classes
3. Add notes about content script CSS isolation
4. Update development commands if needed
5. Document any new utilities or patterns

**Success Criteria**:
- Documentation updated and accurate
- No references to old design system
- New architecture documented

---

#### Task 7.2: Final Cleanup and Commit
**Status**: TODO
**Priority**: Low
**Estimated Time**: 15 minutes

**Context**: Final cleanup and commit of the migration work.

**Actions**:
1. Remove any unused files or dependencies
2. Clean up any debug code or comments
3. Run final build to ensure everything works
4. Run tests to verify functionality
5. Commit changes with conventional commit message
6. Push to remote branch

**Success Criteria**:
- Clean working directory
- All tests passing
- Successful build
- Changes committed and pushed

---

## Risk Assessment

### High Risk
- **Content Script CSS Conflicts**: Styles may conflict with host page styles
- **Visual Regressions**: UI may not match original design exactly
- **Performance Impact**: Bundle size may increase

### Medium Risk
- **Component Functionality**: Complex components may break during migration
- **TypeScript Errors**: Type mismatches after removing design system

### Low Risk
- **Browser Compatibility**: Modern browsers should handle Tailwind CSS well
- **Build Issues**: WXT and Vite have good Tailwind support

## Dependencies

### Critical Path Dependencies
1. Foundation Setup (Tasks 1.1-1.5) must be completed first
2. Content Script CSS Architecture (Tasks 2.1-2.2) must be completed before UI migration
3. Content Script UI Migration (Tasks 3.1-3.4) can be done in parallel but depends on Task 2.2
4. React Component Migration (Tasks 4.1-4.2) can be done in parallel with Task 3.x
5. Design System Cleanup (Tasks 5.1-5.2) must be done after all component migrations
6. Testing and Validation (Tasks 6.1-6.3) must be done after all migrations
7. Documentation (Tasks 7.1-7.2) should be done last

### Parallel Execution Opportunities
- Tasks 3.1-3.4 can be done in parallel (different files)
- Tasks 4.1-4.2 can be done in parallel (different files)
- Tasks 6.1-6.3 can be done in parallel (different testing aspects)

## Success Metrics

### Technical Metrics
- All TypeScript compilation errors resolved
- Extension builds successfully in dev and production
- No console errors during runtime
- CSS bundle size maintained or reduced
- Content script injection speed maintained

### Functional Metrics
- All extension features work as before
- Visual consistency maintained (Notion-inspired design)
- No regressions in user workflows
- Content script UI works across target websites

### Quality Metrics
- Code maintainability improved (utility-first CSS)
- Consistent component library (Shadcn UI)
- Proper CSS isolation for content scripts
- Clean removal of custom design system

## Rollback Plan

If migration issues are encountered:
1. Revert to previous commit on main branch
2. Analyze specific issues encountered
3. Break down problematic tasks into smaller subtasks
4. Re-attempt migration with focused approach

## Estimated Total Time
- **Foundation Setup**: 1.5 hours
- **Content Script Architecture**: 1.75 hours
- **Content Script UI Migration**: 4.5 hours
- **React Component Migration**: 3.5 hours
- **Design System Cleanup**: 1.25 hours
- **Testing and Validation**: 2.25 hours
- **Documentation**: 0.75 hours

**Total Estimated Time**: 15.5 hours

This represents a substantial but manageable migration that will modernize the extension's styling architecture while maintaining its core functionality and aesthetic.