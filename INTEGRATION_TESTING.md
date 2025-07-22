# Integration Testing Guide

This document explains how to test the end-to-end integration between the Chrome extension and the backend DSPy optimization system.

## Prerequisites

1. **Backend Running**: The backend must be running on `localhost:7532`
   ```bash
   cd backend/
   docker-compose up -d  # or python run.py
   ```

2. **Extension Installed**: Install the Chrome extension in development mode
   ```bash
   pnpm dev  # Start development mode
   # Then load unpacked extension from dist/ in Chrome
   ```

## Testing Workflow

### 1. Test Feedback Collection

**Test Nugget Feedback:**
1. Navigate to any webpage (e.g., HackerNews, Reddit, or any article)
2. Right-click → "Find Golden Nuggets"
3. Wait for analysis to complete
4. In the sidebar, use thumbs up/down buttons on nuggets
5. Change nugget types using the dropdown
6. **Expected**: Feedback should be sent to backend immediately

**Test Missing Content Feedback:**
1. In the sidebar, click the three-dots menu → "Mark Missing Content"
2. Select text on the page that should have been identified as a golden nugget
3. Choose the nugget type from the modal
4. Submit the feedback
5. **Expected**: Missing content feedback sent to backend

### 2. Test Feedback Stats

1. Open the extension popup
2. Look for feedback statistics (if displayed)
3. **Or** check browser console for feedback stats API calls
4. **Expected**: Stats should be retrieved from `localhost:7532/feedback/stats`

### 3. Test DSPy Optimization

**Automatic Optimization:**
- After collecting feedback, the system will automatically trigger optimization based on thresholds:
  - 7+ days + 25+ feedback items, OR
  - 75+ total feedback items, OR  
  - 15+ feedback items with 40%+ negative rate

**Manual Optimization Trigger:**
1. In the extension (if UI is available), trigger optimization manually
2. **Or** use browser console:
   ```javascript
   chrome.runtime.sendMessage({
     type: 'TRIGGER_OPTIMIZATION',
     mode: 'cheap' // or 'expensive'
   })
   ```
3. **Expected**: Optimization request sent to `localhost:7532/optimize`

### 4. Test Optimized Prompt Usage

1. After optimization completes, trigger a new analysis
2. **Expected**: Extension should automatically use optimized prompt from backend
3. Check console for: "Using optimized prompt from backend DSPy system"

## API Endpoints Being Tested

- `POST /feedback` - Submit feedback data
- `GET /feedback/stats` - Get feedback statistics  
- `POST /optimize` - Trigger manual optimization
- `GET /optimize/current` - Get current optimized prompt

## Verification Steps

### Backend Verification
Check backend logs and database:
```bash
# View backend logs
docker-compose logs -f backend

# Check database directly
sqlite3 backend/data/feedback.db
> SELECT COUNT(*) FROM nugget_feedback;
> SELECT COUNT(*) FROM missing_content_feedback;
> SELECT * FROM optimization_runs ORDER BY started_at DESC LIMIT 5;
```

### Extension Verification
Check browser console for:
- "Nugget feedback processed: ..." 
- "Missing content feedback processed: ..."
- "Feedback stats retrieved from backend: ..."
- "Using optimized prompt from backend DSPy system"

### Network Verification
Use Chrome DevTools Network tab to verify:
- POST requests to `localhost:7532/feedback`
- GET requests to `localhost:7532/feedback/stats`
- POST requests to `localhost:7532/optimize`
- GET requests to `localhost:7532/optimize/current`

## Error Handling Tests

### Backend Offline Test
1. Stop the backend: `docker-compose down`
2. Try to submit feedback via extension
3. **Expected**: Extension should gracefully handle backend unavailability
4. Check console for fallback messages

### Timeout Test
1. Add artificial delay to backend responses
2. Test if extension handles timeouts properly (10s for feedback, 5s for prompt fetch)
3. **Expected**: Proper timeout error messages

### Invalid Data Test
1. Try to trigger optimization with invalid parameters
2. Submit malformed feedback data
3. **Expected**: Proper error handling and user feedback

## Common Issues & Troubleshooting

### "Backend not available" 
- Ensure backend is running on port 7532
- Check if Docker containers are up
- Verify no firewall blocking localhost:7532

### "CORS Error"
- Backend includes CORS headers for `chrome-extension://*`
- Should not be an issue, but verify in Network tab

### "Failed to get optimized prompt"
- Normal if no optimization has run yet
- Extension falls back to default prompts

### "Feedback not appearing in backend"
- Check browser console for API errors
- Verify backend database connection
- Check backend logs for processing errors

## Success Criteria

✅ **Integration Successful if:**
- Feedback is stored in backend database
- Stats are retrieved from backend API  
- Optimization can be triggered manually
- Optimized prompts are used automatically in analysis
- Error handling works gracefully when backend is offline
- Performance is acceptable (< 10s for feedback submission)

## Performance Notes

- Feedback submission: Should complete in < 3 seconds
- Stats retrieval: Should complete in < 2 seconds  
- Optimization trigger: May take 5-15 minutes depending on mode
- Prompt fetch: Should complete in < 5 seconds

## Next Steps

After successful integration testing:
1. Monitor real-world usage and feedback quality
2. Tune optimization thresholds based on usage patterns
3. Consider adding UI for manual optimization triggering
4. Add analytics for tracking system performance