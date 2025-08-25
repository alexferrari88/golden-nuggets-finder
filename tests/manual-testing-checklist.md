# Manual Testing Checklist

This checklist covers workflows that cannot be automated due to Playwright + Chrome Extension MV3 limitations. These tests require manual execution to validate full user workflows.

## Prerequisites

1. **Extension Setup**
   - [ ] Extension is built with `pnpm build`
   - [ ] Extension is loaded in Chrome (Load unpacked from `dist/`)
   - [ ] Valid Gemini API key is configured in options page
   - [ ] At least one prompt is configured

## Content Analysis Workflows

### Reddit Thread Analysis

**Test URL**: Any Reddit thread (e.g., r/programming discussion)

1. **Via Toolbar Popup**
   - [ ] Navigate to Reddit thread with comments
   - [ ] Click extension icon in toolbar
   - [ ] Verify popup shows configured prompts
   - [ ] Click on "Find Tools" prompt
   - [ ] Verify progress banner appears: "Finding golden nuggets..."
   - [ ] Wait for analysis completion (5-10 seconds)
   - [ ] Verify sidebar appears on right side of page
   - [ ] Verify nuggets are highlighted in golden yellow
   - [ ] Click on highlighted text to see nugget details
   - [ ] Verify details popup shows nugget information and close button

2. **Via Right-Click Context Menu**
   - [ ] Navigate to Reddit thread
   - [ ] Right-click anywhere on page
   - [ ] Verify "Find Golden Nuggets" context menu appears
   - [ ] Hover over submenu to see prompt options
   - [ ] Click "Find Analogies" prompt
   - [ ] Verify analysis workflow completes as above

3. **Multiple Analyses**
   - [ ] Complete first analysis with "Find Tools"
   - [ ] Immediately run second analysis with "Find Explanations"
   - [ ] Verify second analysis replaces first results
   - [ ] Verify no conflicts or UI glitches

### Hacker News Thread Analysis

**Test URL**: Any HN discussion (e.g., Show HN or Ask HN post)

1. **Analysis Workflow**
   - [ ] Navigate to HN thread with comments
   - [ ] Trigger analysis via popup (any prompt)
   - [ ] Verify content extraction works for HN format
   - [ ] Verify highlighting and sidebar display correctly
   - [ ] Verify details popups work

### Generic Blog Post Analysis

**Test URL**: Any technical blog post or documentation

1. **Analysis Workflow**
   - [ ] Navigate to blog post or article
   - [ ] Trigger analysis via popup
   - [ ] Verify generic content extraction works
   - [ ] Verify results display correctly
   - [ ] Test with different article formats

### Twitter/X Thread Analysis

**Test URL**: Any Twitter/X thread

1. **Analysis Workflow**
   - [ ] Navigate to Twitter thread
   - [ ] Trigger analysis via popup
   - [ ] Verify Twitter-specific extraction works
   - [ ] Verify thread content is properly captured

## Error Handling Scenarios

### API Key Errors

1. **Invalid API Key**
   - [ ] Set invalid API key in options page
   - [ ] Trigger analysis on any page
   - [ ] Verify error banner appears: "Analysis failed. Please try again."
   - [ ] Verify error auto-hides after 5 seconds

2. **Missing API Key**
   - [ ] Remove API key from options page
   - [ ] Trigger analysis on any page
   - [ ] Verify API key error banner appears
   - [ ] Click "options page" link in banner
   - [ ] Verify options page opens

### Network Errors

1. **Network Timeout**
   - [ ] Disable internet connection temporarily
   - [ ] Trigger analysis
   - [ ] Verify error handling gracefully displays failure message

### Content Extraction Errors

1. **Empty Pages**
   - [ ] Navigate to page with minimal content (e.g., login page)
   - [ ] Trigger analysis
   - [ ] Verify appropriate "No content found" message

2. **Complex Pages**
   - [ ] Test on pages with heavy JavaScript/React content
   - [ ] Verify extraction still works or fails gracefully

## UI Component Testing

### Sidebar Functionality

1. **Sidebar Display**
   - [ ] Verify sidebar appears on right side
   - [ ] Verify sidebar doesn't interfere with page scrolling
   - [ ] Verify sidebar content is readable and well-formatted
   - [ ] Verify nugget count is accurate
   - [ ] Verify nugget types (tool, analogy, aha! moments) display correctly

2. **Sidebar Persistence**
   - [ ] Complete analysis
   - [ ] Scroll page up and down
   - [ ] Verify sidebar remains visible and positioned correctly
   - [ ] Navigate away from page and back
   - [ ] Verify sidebar is gone (doesn't persist across page loads)

### Highlighting System

1. **Text Highlighting**
   - [ ] Verify nuggets are highlighted with golden yellow background
   - [ ] Verify highlighting doesn't break page layout
   - [ ] Verify multiple nuggets can be highlighted simultaneously
   - [ ] Verify highlighted text is still readable

2. **Click Interactions**
   - [ ] Click on highlighted text
   - [ ] Verify details popup appears
   - [ ] Verify popup content shows nugget information
   - [ ] Click close button to dismiss popup
   - [ ] Click outside popup to dismiss
   - [ ] Verify popup doesn't interfere with page functionality

### Notification System

1. **Progress Notifications**
   - [ ] Verify progress banner appears at top center of page
   - [ ] Verify progress banner has animated dots
   - [ ] Verify progress banner disappears when analysis completes

2. **Error Notifications**
   - [ ] Trigger error scenario (invalid API key)
   - [ ] Verify error banner appears with red background
   - [ ] Verify error banner auto-hides after 5 seconds
   - [ ] Verify multiple error banners don't stack

## Extension Configuration

### Options Page

1. **API Key Management**
   - [ ] Open options page via extension icon
   - [ ] Enter valid API key
   - [ ] Click "Save API Key"
   - [ ] Verify success message appears
   - [ ] Enter invalid API key
   - [ ] Verify validation error appears

2. **Prompt Management**
   - [ ] Click "Add New Prompt"
   - [ ] Fill in prompt name and content
   - [ ] Save prompt
   - [ ] Verify prompt appears in list
   - [ ] Edit existing prompt
   - [ ] Delete prompt with confirmation
   - [ ] Set different prompt as default
   - [ ] Verify default prompt shows star icon

### Popup Interface

1. **Popup Display**
   - [ ] Click extension icon in toolbar
   - [ ] Verify popup opens quickly
   - [ ] Verify all configured prompts are listed
   - [ ] Verify default prompt has star icon
   - [ ] Verify prompt names are clear and readable

2. **Prompt Selection**
   - [ ] Click different prompts
   - [ ] Verify popup closes and analysis starts
   - [ ] Verify correct prompt is used for analysis

## Performance Testing

### Analysis Speed

1. **Timing Tests**
   - [ ] Measure time from prompt selection to results display
   - [ ] Test on pages with different content sizes
   - [ ] Verify analysis completes within reasonable time (< 10 seconds)

2. **Resource Usage**
   - [ ] Monitor browser CPU usage during analysis
   - [ ] Check for memory leaks after multiple analyses
   - [ ] Verify page responsiveness during analysis

### UI Responsiveness

1. **Page Interaction**
   - [ ] Verify page remains interactive during analysis
   - [ ] Test scrolling, clicking links during analysis
   - [ ] Verify analysis doesn't block page functionality

## Cross-Browser Testing

### Chrome Variations

1. **Different Chrome Versions**
   - [ ] Test on latest stable Chrome
   - [ ] Test on Chrome Beta (if available)

2. **Extension Contexts**
   - [ ] Test in normal browsing mode
   - [ ] Test in incognito mode (if extension allowed)

## Regression Testing

### Core Workflows

After any significant changes, re-test:

1. **Primary Workflow**
   - [ ] Reddit analysis via popup
   - [ ] Sidebar display and highlighting
   - [ ] Details popup interactions

2. **Configuration Workflow**
   - [ ] API key setup
   - [ ] Prompt management
   - [ ] Options page functionality

3. **Error Scenarios**
   - [ ] API key errors
   - [ ] Network errors
   - [ ] Content extraction failures

## Notes and Issues

**Date**: ___________  
**Tester**: ___________  
**Extension Version**: ___________  

**Issues Found**:
- [ ] Issue 1: ________________________________
- [ ] Issue 2: ________________________________
- [ ] Issue 3: ________________________________

**Performance Notes**:
- Analysis completion time: _______ seconds
- UI responsiveness: _____________
- Memory usage: _________________

**Browser Environment**:
- Chrome version: _______________
- Operating system: _____________
- Screen resolution: ____________