# Shared Utilities Documentation

This document covers the shared utilities, types, storage management, and performance monitoring for the Golden Nugget Finder extension.

## Storage Management

### Storage Manager (`storage.ts`)
Handles Chrome storage with caching:
- Provides abstraction layer over Chrome storage APIs
- Implements caching for frequently accessed data
- Handles storage quota management
- Ensures data consistency across extension components

### Storage Structure
- `geminiApiKey`: User's Google Gemini API key
- `userPrompts`: Array of saved prompt objects with names, content, and default status

### Storage Best Practices
- Use local storage for user preferences and settings
- Implement proper error handling for storage operations
- Validate data integrity on read/write operations
- Handle storage quota exceeded scenarios

## Type System

### Types (`types.ts`)
TypeScript interfaces for all data structures:
- Golden nugget data models
- API request/response interfaces
- UI component prop types
- Storage data schemas

### Type Safety Guidelines
- Use strict TypeScript configuration
- Define interfaces for all data structures
- Implement proper type guards for runtime validation
- Use discriminated unions for complex type hierarchies

## Design System

### Design System (`design-system.ts`)
Comprehensive Notion-inspired design system with consistent styling:
- **Color Palette**: Gray-based neutral palette with strategic blue accents
- **Typography**: System font stack with defined sizes and weights
- **Spacing**: Consistent spacing scale from 4px to 64px
- **Components**: Pre-built styles for buttons, cards, inputs, badges
- **Utilities**: Helper functions for hover, focus, and animation states

### Design Tokens
- **Colors**: 
  - Primary grays (50-900 scale) for neutral elements
  - Accent colors (blue, green, amber, red) for interactive states
  - Semantic colors for text, backgrounds, and borders
  - Subtle highlight colors replacing bright yellow
- **Typography**: System font stack with 7 size variants (xs to 3xl)
- **Spacing**: 8-step scale for consistent layouts
- **Shadows**: 4 shadow variants for depth and hierarchy
- **Border Radius**: 5 variants from subtle to full rounded

### Component Styles
- **Buttons**: Primary, secondary, and ghost variants
- **Cards**: Hover states and consistent padding
- **Inputs**: Focus states with blue accent borders
- **Badges**: Default and accent variants for status indicators

### Design Philosophy
- Minimalistic approach inspired by Notion's clean interface
- Subtle visual feedback over bright, attention-grabbing elements
- Consistent spacing and typography for professional appearance
- Accessibility-focused with proper contrast ratios

## Constants and Configuration

### Constants (`constants.ts`)
Configuration values and defaults:
- API endpoints and configuration
- UI constants and styling values
- Performance thresholds and limits
- Error messages and user-facing text

### Configuration Management
- Centralize all configuration values
- Use environment-specific overrides
- Implement validation for critical constants
- Document all configuration options

## Performance Monitoring

### Performance Monitor (`performance.ts`)
Tracks timing and memory usage:
- Measures content extraction performance
- Monitors API call latency and success rates
- Tracks DOM operations and rendering performance
- Provides insights for optimization

### Performance Metrics
- **Content Extraction**: Time to extract content from different site types
- **API Calls**: Request/response times and error rates
- **DOM Operations**: Time for highlighting and UI rendering
- **Memory Usage**: Tracked during analysis phases

### Performance Best Practices
- Batch DOM operations where possible
- Implement lazy loading for non-critical components
- Use efficient data structures for large datasets
- Monitor and optimize memory usage patterns

## Utility Functions

### Common Utilities
- String manipulation and validation helpers
- DOM utility functions
- Async operation helpers
- Error handling utilities

### Helper Function Guidelines
- Keep functions pure and side-effect free where possible
- Implement proper error handling
- Use TypeScript generics for reusable functions
- Document function parameters and return types

## Error Handling

### Error Utilities
- Standardized error types and messages
- Error logging and reporting functions
- User-friendly error message formatting
- Debug information collection

### Error Handling Strategy
- Use typed error objects for better error handling
- Implement proper error boundaries in UI components
- Log errors with sufficient context for debugging
- Provide graceful degradation for non-critical failures

## Development Notes

### Testing Shared Utilities
- Focus on unit testing for utility functions
- Test error conditions and edge cases
- Verify type safety and validation logic
- Test performance under various conditions

### Adding New Utilities
1. Follow existing naming conventions
2. Implement proper TypeScript typing
3. Add comprehensive tests
4. Document usage examples

### Performance Optimization
- Profile utility functions for performance bottlenecks
- Implement memoization where appropriate
- Use efficient algorithms and data structures
- Monitor memory usage and garbage collection

## Migration Notes

### Storage Migration
- Implement version-based storage migration
- Handle legacy data format conversion
- Provide fallback values for missing data
- Test migration scenarios thoroughly

### API Changes
- Version API interfaces appropriately
- Maintain backward compatibility where possible
- Document breaking changes clearly
- Provide migration guides for major updates