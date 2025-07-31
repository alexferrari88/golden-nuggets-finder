-- Golden Nuggets Finder - Multi-LLM Support Migration
-- Created: 2025-01-31
-- Description: Add model tracking fields to feedback tables for multi-provider DSPy optimization
--              Enables model-specific optimization by tracking which provider/model was used
--              for each golden nuggets extraction.

PRAGMA foreign_keys = ON;

-- =============================================================================
-- ADD MODEL TRACKING FIELDS
-- =============================================================================

-- Add model tracking to nugget_feedback table
ALTER TABLE nugget_feedback ADD COLUMN model_provider TEXT;
ALTER TABLE nugget_feedback ADD COLUMN model_name TEXT;

-- Add model tracking to missing_content_feedback table  
ALTER TABLE missing_content_feedback ADD COLUMN model_provider TEXT;
ALTER TABLE missing_content_feedback ADD COLUMN model_name TEXT;

-- =============================================================================
-- BACKFILL EXISTING DATA
-- =============================================================================

-- Backfill existing nugget_feedback records (assume they were Gemini)
UPDATE nugget_feedback 
SET model_provider = 'gemini', model_name = 'gemini-2.5-flash' 
WHERE model_provider IS NULL;

-- Backfill existing missing_content_feedback records (assume they were Gemini)
UPDATE missing_content_feedback 
SET model_provider = 'gemini', model_name = 'gemini-2.5-flash' 
WHERE model_provider IS NULL;

-- =============================================================================
-- ADD CONSTRAINTS AND INDEXES
-- =============================================================================

-- Add check constraints for valid provider IDs (after backfill to avoid constraint violations)
-- Note: SQLite doesn't support adding constraints to existing tables easily,
-- so we'll handle validation in the application layer

-- Add indexes for efficient querying by provider
CREATE INDEX idx_nugget_feedback_provider ON nugget_feedback(model_provider);
CREATE INDEX idx_nugget_feedback_model ON nugget_feedback(model_provider, model_name);
CREATE INDEX idx_missing_content_provider ON missing_content_feedback(model_provider);
CREATE INDEX idx_missing_content_model ON missing_content_feedback(model_provider, model_name);

-- =============================================================================
-- UPDATE VIEWS
-- =============================================================================

-- Update the recent_feedback_with_status view to include model tracking
DROP VIEW recent_feedback_with_status;

CREATE VIEW recent_feedback_with_status AS
SELECT 
    'nugget' as feedback_type,
    id,
    nugget_content as content,
    rating,
    url,
    processed,
    last_used_at,
    usage_count,
    report_count,
    first_reported_at,
    last_reported_at,
    created_at,
    client_timestamp,
    model_provider,
    model_name
FROM nugget_feedback
UNION ALL
SELECT 
    'missing_content' as feedback_type,
    id,
    content,
    NULL as rating,  -- Missing content doesn't have ratings
    url,
    processed,
    last_used_at,
    usage_count,
    report_count,
    first_reported_at,
    last_reported_at,
    created_at,
    client_timestamp,
    model_provider,
    model_name
FROM missing_content_feedback
ORDER BY COALESCE(last_reported_at, created_at) DESC;

-- Update the duplicate_content_analysis view to include model tracking
DROP VIEW duplicate_content_analysis;

CREATE VIEW duplicate_content_analysis AS
SELECT 
    'nugget' as feedback_type,
    nugget_content as content,
    url,
    report_count,
    first_reported_at as earliest_report,
    last_reported_at as latest_report,
    id as item_id,
    model_provider,
    model_name
FROM nugget_feedback
WHERE report_count > 1
UNION ALL
SELECT 
    'missing_content' as feedback_type,
    content,
    url,
    report_count,
    first_reported_at as earliest_report,
    last_reported_at as latest_report,
    id as item_id,
    model_provider,
    model_name
FROM missing_content_feedback
WHERE report_count > 1
ORDER BY report_count DESC, latest_report DESC;