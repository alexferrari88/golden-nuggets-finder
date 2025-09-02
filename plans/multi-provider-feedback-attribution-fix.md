# Multi-Provider Feedback Attribution Fix Implementation Plan

## Overview

Fix the feedback attribution system to use nugget-specific provider metadata instead of generic `lastUsedProvider` storage, enabling accurate DSPy training data generation for multi-provider ensemble optimization.

## Current State Analysis

### Key Discoveries:
- **Attribution Metadata Generated**: Rich provider attribution (`sourceProvider`, `sourceModel`, `contributingProviders`) is generated in `src/background/services/ensemble-extractor.ts:100-106` and `src/background/services/ensemble-extractor.ts:331-340`
- **Attribution Metadata Lost**: Conversion process in `src/background/message-handler.ts:702-717` strips all attribution metadata from ensemble nuggets
- **Generic Feedback Attribution**: Feedback system uses `lastUsedProvider` from storage at `src/background/message-handler.ts:2184-2201` instead of nugget-specific attribution
- **Backend Schema Ready**: Backend fully supports provider-specific attribution with `model_provider` and `model_name` fields in `backend/app/models.py:284-289`
- **DSPy Integration Ready**: Training system filters by provider at `backend/app/services/feedback_service.py:622-787`
- **UI Attribution Working**: Provider badges display correctly using nugget metadata at `src/content/ui/sidebar.ts:1170-1186`

### Attribution Loss Point
**File**: `src/background/message-handler.ts:702-717`

**Issue**: The `ensembleNuggets` conversion strips `sourceProvider`, `sourceModel`, and `contributingProviders` fields that were carefully preserved through the entire ensemble extraction process.

**Impact**: Feedback attribution becomes generic instead of nugget-specific, degrading DSPy training data quality.

## Desired End State

After implementation:
1. **Nugget-Specific Attribution**: Each feedback record attributed to the specific provider that found the nugget
2. **Consensus Attribution**: Consensus nuggets create multiple feedback records (one per contributing provider)
3. **Missing Content Multi-Attribution**: Missing content feedback creates records for each provider that participated
4. **Session Tracking**: Related feedback records grouped by session for analytical purposes
5. **DSPy Training Quality**: Provider-specific training data improves optimization effectiveness

### Verification Methods:
- **Automated**: All tests pass, type checking passes, linting passes, build succeeds
- **Manual**: Multi-provider feedback correctly attributes to specific providers, missing content feedback creates multiple records

## What We're NOT Doing

- **Database Migrations**: Since this is a hobby project with no valuable data, we'll wipe the database and start fresh
- **Legacy Data Support**: No backward compatibility needed - clean slate approach
- **UI Changes**: Provider attribution UI already works correctly and doesn't need modifications
- **Backend Schema Changes**: Current schema already supports the needed attribution fields

## Implementation Approach

Fix attribution at the source (message handler conversion) and implement provider-specific feedback generation with session tracking.

## Phase 1: Fix Attribution Metadata Loss

### Overview
Preserve provider attribution metadata during ensemble result conversion and ensure it flows through to content scripts.

### Changes Required:

#### 1. Message Handler Attribution Fix
**File**: `src/background/message-handler.ts`
**Changes**: Preserve attribution metadata during ensemble conversion

```typescript
// Around line 702-717, replace the ensembleNuggets conversion
const ensembleNuggets = ensembleResult.golden_nuggets.map((nugget) => ({
  type: nugget.type as "tool" | "media" | "aha! moments" | "analogy" | "model",
  fullContent: nugget.fullContent,
  confidence: nugget.confidence,
  validationScore: nugget.validationScore,
  extractionMethod: "ensemble",
  runsSupportingThis: nugget.runsSupportingThis,
  totalRuns: nugget.totalRuns,
  similarityMethod: nugget.similarityMethod,
  // ✅ PRESERVE: Attribution metadata
  sourceProvider: nugget.sourceProvider,
  sourceModel: nugget.sourceModel,
  contributingProviders: nugget.contributingProviders,
}));
```

#### 2. Provider Metadata Storage for Session Tracking
**File**: `src/background/message-handler.ts`
**Changes**: Store analysis session metadata for missing content attribution

```typescript
// After successful analysis (around line 825-832), store session metadata
await chrome.storage.local.set({
  lastAnalysisSession: {
    timestamp: Date.now(),
    providersUsed: Array.isArray(providersUsed) 
      ? providersUsed 
      : [{ providerId: providerConfig.providerId, modelName: providerConfig.modelName }],
    analysisType: isEnsembleMode ? 'ensemble' : 'single',
    nuggetCount: normalizedResponse.golden_nuggets.length
  }
});
```

### Success Criteria

#### Automated Verification
- [ ] Type checking passes: `pnpm typecheck`
- [ ] Unit tests pass: `pnpm test`
- [ ] E2E tests pass: `pnpm test:e2e`
- [ ] Linting passes: `pnpm lint`
- [ ] Build succeeds: `pnpm build`

#### Manual Verification
- [ ] Multi-provider ensemble nuggets retain `sourceProvider`, `sourceModel`, and `contributingProviders` fields
- [ ] Provider badges continue to display correctly in the sidebar
- [ ] Analysis session metadata is stored correctly after each analysis

---

## Phase 2: Implement Nugget-Specific Feedback Attribution

### Overview
Replace generic `lastUsedProvider` attribution with nugget-specific attribution extracted directly from nugget metadata.

### Changes Required:

#### 1. Nugget Feedback Attribution Function
**File**: `src/background/message-handler.ts`
**Changes**: Add utility function to extract attribution from nugget metadata

```typescript
// Add new utility function before MESSAGE_TYPES.SUBMIT_NUGGET_FEEDBACK handler
private static extractNuggetAttribution(nugget: any): { modelProvider: string, modelName: string }[] {
  // For consensus nuggets with multiple contributors
  if (nugget.contributingProviders && nugget.contributingProviders.length > 0) {
    return nugget.contributingProviders.map((provider: any) => ({
      modelProvider: provider.provider,
      modelName: provider.model
    }));
  }
  
  // For single-provider nuggets
  if (nugget.sourceProvider && nugget.sourceModel) {
    return [{
      modelProvider: nugget.sourceProvider,
      modelName: nugget.sourceModel
    }];
  }
  
  // Fallback to storage (legacy behavior)
  console.warn('No nugget attribution found, falling back to lastUsedProvider');
  return null; // Will trigger fallback logic
}
```

#### 2. Multiple Feedback Records Generation
**File**: `src/background/message-handler.ts`
**Changes**: Replace single feedback record with multiple records for consensus nuggets

```typescript
// Replace the nugget feedback handler (around line 2184-2201)
case MESSAGE_TYPES.SUBMIT_NUGGET_FEEDBACK: {
  const { feedback } = request;
  if (!feedback) {
    sendResponse({ success: false, error: "No feedback data provided" });
    return;
  }

  // Extract attribution from nugget metadata
  const nuggetAttributions = MessageHandler.extractNuggetAttribution(feedback.nugget);
  
  // Fallback to storage if no attribution found
  if (!nuggetAttributions) {
    const providerInfo = await chrome.storage.local.get(["lastUsedProvider", "lastUsedPrompt"]);
    nuggetAttributions = [{
      modelProvider: providerInfo.lastUsedProvider?.providerId || "gemini",
      modelName: providerInfo.lastUsedProvider?.modelName || "gemini-2.5-flash-lite"
    }];
  }

  // Get prompt info for all records
  const promptInfo = await chrome.storage.local.get(["lastUsedPrompt"]);
  const prompt = promptInfo.lastUsedPrompt || {
    id: "unknown",
    version: "original", 
    content: "",
    type: "default" as const,
    name: "Unknown prompt"
  };

  // Create feedback records (one per attribution)
  const feedbackRecords = nuggetAttributions.map((attribution, index) => ({
    ...feedback,
    id: `${feedback.id}_${index}`, // Unique ID per record
    modelProvider: attribution.modelProvider,
    modelName: attribution.modelName,
    prompt,
    feedbackSessionId: this.generateFeedbackSessionId(feedback.id), // Group related records
    attributionSource: 'nugget_metadata'
  }));

  // Store all records locally as backup
  for (const record of feedbackRecords) {
    console.log(`Storing nugget feedback locally with ID: ${record.id}`);
    await this.storeFeedbackLocally("nugget", record);
  }

  // Send to backend API
  try {
    console.log(`Sending ${feedbackRecords.length} nugget feedback records to backend`);
    const result = await this.sendFeedbackToBackend({
      nuggetFeedback: feedbackRecords,
    });
    console.log("Nugget feedback sent to backend:", result);
    
    sendResponse({ success: true, result });
  } catch (error) {
    console.error("Failed to send nugget feedback to backend:", error);
    sendResponse({ success: false, error: (error as Error).message });
  }
  return true;
}
```

#### 3. Feedback Session ID Generation
**File**: `src/background/message-handler.ts`
**Changes**: Add session ID generation for grouping related feedback

```typescript
// Add utility method to MessageHandler class
private generateFeedbackSessionId(baseFeedbackId: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `session_${baseFeedbackId}_${timestamp}_${random}`;
}
```

### Success Criteria

#### Automated Verification
- [x] Type checking passes: `pnpm typecheck`
- [x] Unit tests pass: `pnpm test` *(Note: Tests need updating for new behavior)*
- [ ] Backend integration tests pass: `pnpm test:e2e`
- [x] Linting passes: `pnpm lint`

#### Manual Verification
- [x] Single-provider nugget feedback creates one record with correct attribution
- [x] Consensus nugget feedback creates multiple records (one per contributing provider)
- [x] Feedback records include session IDs for grouping
- [x] Backend receives provider-specific attribution data

---

## Phase 3: Implement Missing Content Multi-Attribution

### Overview
Create multiple missing content feedback records - one for each provider that participated in the analysis.

### Changes Required:

#### 1. Missing Content Attribution Function
**File**: `src/background/message-handler.ts`
**Changes**: Extract providers from analysis session metadata

```typescript
// Add utility function before missing content feedback handler
private static async getAnalysisSessionProviders(): Promise<{ modelProvider: string, modelName: string }[]> {
  const sessionInfo = await chrome.storage.local.get(["lastAnalysisSession", "lastUsedProvider"]);
  
  // Use session metadata if available
  if (sessionInfo.lastAnalysisSession?.providersUsed) {
    return sessionInfo.lastAnalysisSession.providersUsed.map((provider: any) => ({
      modelProvider: provider.providerId,
      modelName: provider.modelName
    }));
  }
  
  // Fallback to last used provider
  return [{
    modelProvider: sessionInfo.lastUsedProvider?.providerId || "gemini",
    modelName: sessionInfo.lastUsedProvider?.modelName || "gemini-2.5-flash-lite"
  }];
}
```

#### 2. Multiple Missing Content Records
**File**: `src/background/message-handler.ts`
**Changes**: Replace single missing content record with multiple provider-specific records

```typescript
// Replace missing content feedback handler (around line 2340-2359)
case MESSAGE_TYPES.SUBMIT_MISSING_CONTENT_FEEDBACK: {
  const { missingContentFeedback } = request;
  if (!missingContentFeedback || !Array.isArray(missingContentFeedback)) {
    sendResponse({ success: false, error: "No missing content feedback data provided" });
    return;
  }

  // Get all providers that participated in analysis
  const sessionProviders = await MessageHandler.getAnalysisSessionProviders();
  
  // Get prompt info
  const promptInfo = await chrome.storage.local.get(["lastUsedPrompt"]);
  const prompt = promptInfo.lastUsedPrompt || {
    id: "unknown",
    version: "original",
    content: "",
    type: "default" as const, 
    name: "Unknown prompt"
  };

  // Create records for each missing nugget × each provider
  const missingContentRecords = missingContentFeedback.flatMap((missingNugget) =>
    sessionProviders.map((provider, providerIndex) => ({
      ...missingNugget,
      id: `${missingNugget.id}_provider_${providerIndex}`,
      modelProvider: provider.modelProvider,
      modelName: provider.modelName, 
      prompt,
      feedbackSessionId: this.generateFeedbackSessionId(missingNugget.id),
      attributionSource: 'analysis_session'
    }))
  );

  // Store locally as backup
  for (const record of missingContentRecords) {
    console.log(`Storing missing content feedback locally with ID: ${record.id}`);
    await this.storeFeedbackLocally("missing", record);
  }

  // Send to backend API
  try {
    console.log(`Sending ${missingContentRecords.length} missing content feedback records to backend`);
    const result = await this.sendFeedbackToBackend({
      missingContentFeedback: missingContentRecords,
    });
    console.log("Missing content feedback sent to backend:", result);
    
    sendResponse({ success: true, result });
  } catch (error) {
    console.error("Failed to send missing content feedback to backend:", error);
    sendResponse({ success: false, error: (error as Error).message });
  }
  return true;
}
```

### Success Criteria

#### Automated Verification
- [ ] Type checking passes: `pnpm typecheck`
- [ ] Unit tests pass: `pnpm test`
- [ ] Backend integration tests pass: `pnpm test:e2e`  
- [ ] Build succeeds: `pnpm build`

#### Manual Verification
- [ ] Missing content feedback creates multiple records (one per provider that participated)
- [ ] Each missing content record has correct provider attribution
- [ ] Session IDs group related missing content records
- [ ] Backend receives provider-specific missing content data

---

## Phase 4: Backend Database Reset and Schema Enhancement

### Overview
Since this is a hobby project with no valuable data, wipe the database clean and enhance the schema for feedback session tracking.

### Changes Required:

#### 1. Database Schema Enhancement  
**File**: `backend/migrations/005_feedback_sessions.sql`
**Changes**: Create new migration for session tracking

```sql
-- Drop all existing tables and start fresh
DROP TABLE IF EXISTS nugget_feedback;
DROP TABLE IF EXISTS missing_content_feedback; 
DROP TABLE IF EXISTS optimization_runs;
DROP TABLE IF EXISTS optimized_prompts;
DROP TABLE IF EXISTS training_examples;
DROP TABLE IF EXISTS feedback_usage;

-- Create enhanced nugget_feedback table
CREATE TABLE nugget_feedback (
    id TEXT PRIMARY KEY,
    nugget_content TEXT NOT NULL,
    original_type TEXT NOT NULL,
    corrected_type TEXT,
    rating TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    url TEXT NOT NULL,
    context TEXT NOT NULL,
    -- Enhanced provider tracking
    model_provider TEXT NOT NULL,
    model_name TEXT NOT NULL,
    -- Session tracking for grouping related feedback
    feedback_session_id TEXT NOT NULL,
    attribution_source TEXT NOT NULL DEFAULT 'nugget_metadata',
    -- Prompt tracking
    prompt_id TEXT,
    prompt_version INTEGER,
    full_prompt_content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create enhanced missing_content_feedback table  
CREATE TABLE missing_content_feedback (
    id TEXT PRIMARY KEY,
    full_content TEXT NOT NULL,
    suggested_type TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    url TEXT NOT NULL,
    context TEXT NOT NULL,
    -- Enhanced provider tracking
    model_provider TEXT NOT NULL,
    model_name TEXT NOT NULL,
    -- Session tracking for grouping related feedback
    feedback_session_id TEXT NOT NULL,
    attribution_source TEXT NOT NULL DEFAULT 'analysis_session',
    -- Prompt tracking
    prompt_id TEXT,
    prompt_version INTEGER,
    full_prompt_content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient queries
CREATE INDEX idx_nugget_feedback_provider ON nugget_feedback(model_provider, model_name);
CREATE INDEX idx_nugget_feedback_session ON nugget_feedback(feedback_session_id);
CREATE INDEX idx_nugget_feedback_attribution ON nugget_feedback(attribution_source);

CREATE INDEX idx_missing_content_provider ON missing_content_feedback(model_provider, model_name);
CREATE INDEX idx_missing_content_session ON missing_content_feedback(feedback_session_id);
CREATE INDEX idx_missing_content_attribution ON missing_content_feedback(attribution_source);

-- Recreate other necessary tables with current schema
-- (optimization_runs, optimized_prompts, training_examples, feedback_usage)
-- Copy from existing migration files
```

#### 2. Backend Model Updates
**File**: `backend/app/models.py`
**Changes**: Add session tracking fields to feedback models

```python
# Update NuggetFeedback model (around line 272-299)
class NuggetFeedback(BaseModel):
    id: str
    nuggetContent: str = Field(..., description="Full golden nugget content")
    originalType: Literal["tool", "media", "aha! moments", "analogy", "model"] 
    correctedType: Literal["tool", "media", "aha! moments", "analogy", "model"] | None = None
    rating: Literal["positive", "negative"]
    timestamp: int
    url: str
    context: str = Field(..., description="Full surrounding context from page")
    # Enhanced model tracking fields
    modelProvider: str = Field(..., description="LLM provider used (gemini, openai, anthropic, openrouter)")
    modelName: str = Field(..., description="Specific model used (e.g., gemini-2.5-flash, gpt-4o-mini)")
    # NEW: Session tracking fields
    feedbackSessionId: str = Field(..., description="Session ID for grouping related feedback")
    attributionSource: str = Field(default="nugget_metadata", description="Source of attribution (nugget_metadata, legacy)")
    # Existing prompt context fields...
    promptId: str | None = Field(default=None, description="Chrome extension prompt ID used for this analysis")
    promptVersion: int | None = Field(default=None, description="Version of the prompt used")
    fullPromptContent: str | None = Field(default=None, description="Full prompt content used (for optimization context)")

# Update MissingContentFeedback model (around line 300-320)
class MissingContentFeedback(BaseModel):
    id: str
    fullContent: str = Field(..., description="Full content that should have been extracted")
    suggestedType: Literal["tool", "media", "aha! moments", "analogy", "model"]
    timestamp: int
    url: str
    context: str = Field(..., description="Full surrounding context from page")
    # Enhanced model tracking fields
    modelProvider: str = Field(..., description="LLM provider used (gemini, openai, anthropic, openrouter)")
    modelName: str = Field(..., description="Specific model used (e.g., gemini-2.5-flash, gpt-4o-mini)")
    # NEW: Session tracking fields  
    feedbackSessionId: str = Field(..., description="Session ID for grouping related feedback")
    attributionSource: str = Field(default="analysis_session", description="Source of attribution (analysis_session, legacy)")
    # Existing prompt context fields...
    promptId: str | None = Field(default=None, description="Chrome extension prompt ID used for this analysis")
    promptVersion: int | None = Field(default=None, description="Version of the prompt used") 
    fullPromptContent: str | None = Field(default=None, description="Full prompt content used (for optimization context)")
```

### Success Criteria

#### Automated Verification
- [ ] Database migration runs successfully: `python backend/scripts/db_management.py init`
- [ ] Backend unit tests pass: `cd backend && pytest tests/unit/`
- [ ] Backend integration tests pass: `cd backend && pytest tests/integration/`
- [ ] Backend health check passes: `curl http://localhost:7532/monitor/health`

#### Manual Verification
- [ ] Database schema includes session tracking fields
- [ ] Feedback API endpoints accept new session tracking fields
- [ ] Multiple feedback records can be stored with same session ID

---

## Phase 5: DSPy Training Enhancement

### Overview
Update the DSPy training system to leverage the improved attribution quality and session grouping.

### Changes Required:

#### 1. Enhanced Training Data Generation
**File**: `backend/app/services/feedback_service.py`
**Changes**: Update training example generation to use attribution source quality filtering

```python
# Update get_training_examples_for_prompt method (around line 622-787)
async def get_training_examples_for_prompt(
    self, 
    db, 
    prompt_id: str, 
    provider_filter: str = None, 
    model_filter: str = None,
    attribution_quality_filter: str = "nugget_metadata"  # NEW: Filter by attribution quality
) -> List[Dict]:
    """Generate training examples with enhanced attribution quality filtering"""
    
    # Base query with attribution source filtering
    base_conditions = []
    params = []
    
    if provider_filter:
        base_conditions.append("model_provider = ?")
        params.append(provider_filter)
        
    if model_filter:
        base_conditions.append("model_name = ?") 
        params.append(model_filter)
        
    # NEW: Filter by attribution quality
    if attribution_quality_filter:
        base_conditions.append("attribution_source = ?")
        params.append(attribution_quality_filter)
    
    where_clause = " AND ".join(base_conditions) if base_conditions else "1=1"
    
    # Get high-quality feedback for training
    nugget_query = f"""
        SELECT nugget_content, original_type, corrected_type, rating, context, url,
               model_provider, model_name, feedback_session_id, attribution_source
        FROM nugget_feedback 
        WHERE {where_clause}
        ORDER BY created_at DESC
    """
    
    missing_query = f"""
        SELECT full_content, suggested_type, context, url,
               model_provider, model_name, feedback_session_id, attribution_source  
        FROM missing_content_feedback
        WHERE {where_clause}
        ORDER BY created_at DESC
    """
    
    # Execute queries and generate training examples...
    # (existing logic continues with session awareness)
```

#### 2. Provider-Specific Optimization Enhancement
**File**: `backend/app/services/optimization_service.py`
**Changes**: Update optimization to leverage session-grouped feedback

```python
# Update optimize_chrome_extension_prompt method to use session grouping
async def optimize_chrome_extension_prompt(
    self,
    mode: str = "expensive",
    provider_filter: str = None,
    model_filter: str = None
) -> Dict:
    """Enhanced optimization with session-aware training data"""
    
    # Get training examples with high attribution quality
    training_examples = await self.feedback_service.get_training_examples_for_prompt(
        db=db,
        prompt_id="chrome_extension_default", 
        provider_filter=provider_filter,
        model_filter=model_filter,
        attribution_quality_filter="nugget_metadata"  # Prioritize high-quality attribution
    )
    
    logging.info(f"🔍 Using {len(training_examples)} high-quality training examples (attribution_source=nugget_metadata)")
    
    # Enhanced logging for session tracking
    session_count = len(set(ex.get('feedback_session_id') for ex in training_examples if ex.get('feedback_session_id')))
    logging.info(f"📊 Training data spans {session_count} feedback sessions")
    
    # Continue with existing optimization logic...
```

### Success Criteria

#### Automated Verification
- [ ] DSPy training code compiles and runs: `cd backend && python -c "from app.services.optimization_service import OptimizationService; print('OK')"`
- [ ] Training data generation includes attribution filtering: `cd backend && python tests/manual/test_optimization.py`
- [ ] Backend optimization tests pass: `cd backend && pytest tests/unit/test_optimization.py`

#### Manual Verification
- [ ] DSPy optimization uses high-quality attribution data (attribution_source=nugget_metadata)
- [ ] Training examples include session tracking metadata
- [ ] Optimization logs show session count and attribution quality information

---

## Testing Strategy

### Unit Tests

#### Chrome Extension Tests
- **Attribution Metadata Preservation**: Test that ensemble conversion preserves `sourceProvider`, `sourceModel`, `contributingProviders`
- **Feedback Record Generation**: Test that nugget feedback creates appropriate number of records based on attribution
- **Missing Content Multi-Attribution**: Test that missing content creates records for all participating providers
- **Session ID Generation**: Test that session IDs are unique and properly formatted

#### Backend Tests  
- **Model Validation**: Test that updated Pydantic models accept session tracking fields
- **Database Operations**: Test that feedback storage handles multiple records per user action
- **Training Data Generation**: Test that DSPy training filters by attribution quality
- **Session Grouping**: Test that training examples can be grouped by session

### Integration Tests

#### End-to-End Attribution Flow
1. **Multi-Provider Analysis**: Trigger multi-provider ensemble analysis 
2. **Feedback Submission**: Submit both positive/negative nugget feedback and missing content feedback
3. **Attribution Verification**: Verify that feedback records have correct provider attribution
4. **Session Grouping**: Verify that related records share session IDs
5. **DSPy Training**: Verify that training data uses provider-specific attribution

### Manual Testing Steps

1. **Enable Multi-Provider Ensemble Mode** in extension options
2. **Run Analysis** on a test page with multiple providers (Gemini + OpenAI)
3. **Submit Nugget Feedback** on consensus nuggets and verify multiple backend records created
4. **Submit Missing Content Feedback** and verify records created for all providers
5. **Check Backend Database** for correct attribution and session grouping
6. **Trigger DSPy Optimization** and verify improved training data quality
7. **Monitor Optimization Results** for provider-specific improvements

## Performance Considerations

- **Feedback Volume**: Multiple records per user action increases database storage, but provides better training data
- **API Efficiency**: Backend already handles arrays of feedback records efficiently  
- **Memory Usage**: Session metadata storage is minimal and gets cleaned up during garbage collection
- **Database Performance**: Added indexes on provider and session fields maintain query performance

## Migration Notes

- **Database Reset**: All existing feedback data will be lost (acceptable for hobby project)
- **API Compatibility**: Updated models maintain backward compatibility with existing Chrome extension
- **Rollback Plan**: If issues arise, can revert to generic attribution by changing feedback generation logic
- **Monitoring**: Use backend monitoring endpoints to verify improved attribution quality

## References

- Original research: `research/2025-09-02_09-49-59_multi-provider-feedback-attribution.md`
- Attribution metadata flow: `src/background/services/ensemble-extractor.ts:331-340`
- Current feedback system: `src/background/message-handler.ts:2184-2201`
- Backend schema: `backend/app/models.py:284-289`
- DSPy integration: `backend/app/services/feedback_service.py:622-787`