# Gemini Integration Test

This document describes how to test the Gemini integration manually.

## Test Setup

1. Load the extension in Chrome
2. Go to the options page and set a valid Gemini API key
3. Visit a test page with content

## Test Cases

### 1. API Key Validation
- Enter an invalid API key → should show error
- Enter a valid API key → should be accepted

### 2. Content Analysis
- Use the extension on a Reddit thread
- Use the extension on a Hacker News discussion
- Use the extension on a blog post

### 3. Expected Response Format
The API should return a JSON response with this structure:
```json
{
  "golden_nuggets": [
    {
      "type": "tool" | "media" | "explanation" | "analogy" | "model",
      "content": "Original text verbatim",
      "synthesis": "Why this is relevant to the persona"
    }
  ]
}
```

### 4. Error Handling
- Test with network disconnected
- Test with invalid API key
- Test with malformed content

## Manual Test Procedure

1. Install the extension
2. Set API key in options
3. Right-click on a page → "Find Golden Nuggets" → select a prompt
4. Verify the progress banner appears
5. Check that nuggets are highlighted if found
6. Verify the sidebar shows all results
7. Test clicking on highlighted nuggets to see synthesis popups