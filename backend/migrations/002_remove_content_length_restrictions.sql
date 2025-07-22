-- Migration to remove content length restrictions and update documentation
-- This migration removes the 200-character limits mentioned in comments and updates schema documentation

-- Note: SQLite TEXT columns already support unlimited length, so no column changes needed.
-- This migration primarily updates documentation and comments to reflect full content storage.

-- Update comments are implemented via table recreation with updated comments
-- SQLite doesn't support ALTER COLUMN COMMENT, so we document the change here:

-- CHANGES MADE:
-- 1. nugget_feedback.nugget_content: Now stores full golden nugget content (was: first 200 chars)
-- 2. nugget_feedback.context: Now stores full surrounding context (was: first 200 chars) 
-- 3. optimization_runs.result_prompt: Now stores full optimized prompt (was: first 1000 chars)

-- No schema changes needed - TEXT columns in SQLite already support unlimited length
-- The application layer (Pydantic models) has been updated to remove max_length constraints

-- Create a metadata table to track schema documentation changes
CREATE TABLE IF NOT EXISTS schema_documentation (
    table_name TEXT NOT NULL,
    column_name TEXT NOT NULL,
    old_description TEXT,
    new_description TEXT,
    migration_version TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (table_name, column_name, migration_version)
);

-- Document the changes for future reference
INSERT INTO schema_documentation (table_name, column_name, old_description, new_description, migration_version) VALUES
('nugget_feedback', 'nugget_content', 'First 200 chars of the nugget for identification', 'Full golden nugget content for complete DSPy training', '002'),
('nugget_feedback', 'context', 'Surrounding content (first 200 chars)', 'Full surrounding context from page for complete analysis', '002'),
('optimization_runs', 'result_prompt', 'Truncated result (first 1000 chars)', 'Full optimized prompt text for complete storage', '002');

-- Create an updated view that reflects full content capabilities
CREATE VIEW IF NOT EXISTS content_length_stats AS
SELECT 
    'nugget_feedback' as table_name,
    'nugget_content' as column_name,
    AVG(LENGTH(nugget_content)) as avg_length,
    MIN(LENGTH(nugget_content)) as min_length,
    MAX(LENGTH(nugget_content)) as max_length,
    COUNT(*) as total_records
FROM nugget_feedback
UNION ALL
SELECT 
    'nugget_feedback' as table_name,
    'context' as column_name,
    AVG(LENGTH(context)) as avg_length,
    MIN(LENGTH(context)) as min_length,
    MAX(LENGTH(context)) as max_length,
    COUNT(*) as total_records
FROM nugget_feedback
UNION ALL
SELECT 
    'missing_content_feedback' as table_name,
    'content' as column_name,
    AVG(LENGTH(content)) as avg_length,
    MIN(LENGTH(content)) as min_length,
    MAX(LENGTH(content)) as max_length,
    COUNT(*) as total_records
FROM missing_content_feedback
UNION ALL
SELECT 
    'missing_content_feedback' as table_name,
    'context' as column_name,
    AVG(LENGTH(context)) as avg_length,
    MIN(LENGTH(context)) as min_length,
    MAX(LENGTH(context)) as max_length,
    COUNT(*) as total_records
FROM missing_content_feedback;