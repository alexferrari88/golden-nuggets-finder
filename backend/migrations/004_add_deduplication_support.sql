-- Migration 004: Add Deduplication Support
-- Date: 2025-01-22
-- Description: Add comprehensive deduplication support for both missing content feedback
--              and nugget feedback to prevent duplicate reports from inflating feedback
--              counts and biasing training data

-- 1. Add deduplication columns to missing_content_feedback table
ALTER TABLE missing_content_feedback ADD COLUMN report_count INTEGER DEFAULT 1;
ALTER TABLE missing_content_feedback ADD COLUMN first_reported_at TIMESTAMP;
ALTER TABLE missing_content_feedback ADD COLUMN last_reported_at TIMESTAMP;

-- 2. Add deduplication columns to nugget_feedback table
ALTER TABLE nugget_feedback ADD COLUMN report_count INTEGER DEFAULT 1;
ALTER TABLE nugget_feedback ADD COLUMN first_reported_at TIMESTAMP;
ALTER TABLE nugget_feedback ADD COLUMN last_reported_at TIMESTAMP;

-- 3. Update existing records to populate the new timestamp fields
UPDATE missing_content_feedback 
SET first_reported_at = created_at, 
    last_reported_at = created_at 
WHERE first_reported_at IS NULL OR last_reported_at IS NULL;

UPDATE nugget_feedback 
SET first_reported_at = created_at, 
    last_reported_at = created_at 
WHERE first_reported_at IS NULL OR last_reported_at IS NULL;

-- 4. Create indexes to optimize duplicate detection queries
CREATE INDEX idx_missing_content_dedup ON missing_content_feedback(content, url);
CREATE INDEX idx_nugget_content_dedup ON nugget_feedback(nugget_content, url, original_type);
CREATE INDEX idx_missing_content_report_count ON missing_content_feedback(report_count);
CREATE INDEX idx_nugget_feedback_report_count ON nugget_feedback(report_count);

-- 5. Update the dashboard stats view to account for report counts
DROP VIEW IF EXISTS dashboard_stats;
CREATE VIEW dashboard_stats AS
SELECT 
    -- Feedback stats (using individual items, not report counts)
    (SELECT COUNT(*) FROM nugget_feedback WHERE processed = FALSE) as pending_nugget_feedback,
    (SELECT COUNT(*) FROM missing_content_feedback WHERE processed = FALSE) as pending_missing_feedback,
    (SELECT COUNT(*) FROM nugget_feedback WHERE processed = TRUE) as processed_nugget_feedback,
    (SELECT COUNT(*) FROM missing_content_feedback WHERE processed = TRUE) as processed_missing_feedback,
    
    -- Report count metrics (total reports including duplicates)
    (SELECT COALESCE(SUM(report_count), 0) FROM nugget_feedback) as total_nugget_reports,
    (SELECT COALESCE(SUM(report_count), 0) FROM missing_content_feedback) as total_missing_reports,
    (SELECT COUNT(*) FROM nugget_feedback WHERE report_count > 1) as duplicate_nugget_items,
    (SELECT COUNT(*) FROM missing_content_feedback WHERE report_count > 1) as duplicate_missing_items,
    
    -- Current optimization stats
    (SELECT COUNT(*) FROM optimization_runs WHERE status = 'running') as active_optimizations,
    (SELECT COUNT(*) FROM optimization_runs WHERE status = 'completed') as completed_optimizations,
    (SELECT COUNT(*) FROM optimization_runs WHERE status = 'failed') as failed_optimizations,
    
    -- Cost stats (last 30 days)
    (SELECT COALESCE(SUM(api_cost), 0) FROM optimization_runs 
     WHERE started_at > datetime('now', '-30 days')) as monthly_costs,
    (SELECT COALESCE(SUM(tokens_used), 0) FROM optimization_runs 
     WHERE started_at > datetime('now', '-30 days')) as monthly_tokens;

-- 6. Update the recent feedback view to include report count information
DROP VIEW IF EXISTS recent_feedback_with_status;
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
    timestamp as client_timestamp
FROM nugget_feedback
UNION ALL
SELECT 
    'missing_content' as feedback_type,
    id,
    content,
    NULL as rating,
    url,
    processed,
    last_used_at,
    usage_count,
    report_count,
    first_reported_at,
    last_reported_at,
    created_at,
    timestamp as client_timestamp
FROM missing_content_feedback
ORDER BY COALESCE(last_reported_at, created_at) DESC;

-- 7. Create a view for duplicate analysis
CREATE VIEW duplicate_content_analysis AS
SELECT 
    'missing_content' as feedback_type,
    content,
    url,
    report_count,
    1 as similar_items,  -- Since we're deduplicating, each row represents unique content
    first_reported_at as earliest_report,
    last_reported_at as latest_report,
    id as item_ids
FROM missing_content_feedback
WHERE report_count > 1
UNION ALL
SELECT 
    'nugget' as feedback_type,
    nugget_content as content,
    url,
    report_count,
    1 as similar_items,  -- Since we're deduplicating, each row represents unique content
    first_reported_at as earliest_report,
    last_reported_at as latest_report,
    id as item_ids
FROM nugget_feedback
WHERE report_count > 1
ORDER BY report_count DESC, latest_report DESC;