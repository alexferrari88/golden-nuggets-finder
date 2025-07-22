-- Migration 003: Dashboard Enhancements
-- Date: 2025-01-22
-- Description: Add dashboard tracking capabilities including cost tracking, 
--              feedback processing status, persistent progress tracking,
--              and feedback-optimization relationships

-- 1. Extend optimization_runs table with cost and metrics tracking
ALTER TABLE optimization_runs ADD COLUMN tokens_used INTEGER DEFAULT 0;
ALTER TABLE optimization_runs ADD COLUMN api_cost REAL DEFAULT 0.0;
ALTER TABLE optimization_runs ADD COLUMN input_tokens INTEGER DEFAULT 0;
ALTER TABLE optimization_runs ADD COLUMN output_tokens INTEGER DEFAULT 0;
ALTER TABLE optimization_runs ADD COLUMN training_examples_used INTEGER DEFAULT 0;
ALTER TABLE optimization_runs ADD COLUMN detailed_metrics TEXT; -- JSON blob for performance metrics

-- 2. Add processing status to nugget_feedback table
ALTER TABLE nugget_feedback ADD COLUMN processed BOOLEAN DEFAULT FALSE;
ALTER TABLE nugget_feedback ADD COLUMN last_used_at TIMESTAMP;
ALTER TABLE nugget_feedback ADD COLUMN usage_count INTEGER DEFAULT 0;

-- 3. Add processing status to missing_content_feedback table
ALTER TABLE missing_content_feedback ADD COLUMN processed BOOLEAN DEFAULT FALSE;
ALTER TABLE missing_content_feedback ADD COLUMN last_used_at TIMESTAMP;
ALTER TABLE missing_content_feedback ADD COLUMN usage_count INTEGER DEFAULT 0;

-- 4. Create feedback usage tracking junction table
CREATE TABLE feedback_usage (
    id TEXT PRIMARY KEY,
    optimization_run_id TEXT NOT NULL,
    feedback_type TEXT NOT NULL CHECK (feedback_type IN ('nugget', 'missing_content')),
    feedback_id TEXT NOT NULL,
    contribution_score REAL DEFAULT 1.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (optimization_run_id) REFERENCES optimization_runs(id) ON DELETE CASCADE
);

-- 5. Create persistent progress tracking table
CREATE TABLE optimization_progress (
    id TEXT PRIMARY KEY,
    optimization_run_id TEXT NOT NULL,
    phase TEXT NOT NULL CHECK (phase IN (
        'initialization', 'data_gathering', 'optimization', 
        'storing', 'completed', 'failed'
    )),
    progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= -1 AND progress_percent <= 100),
    message TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT, -- JSON with phase-specific details
    FOREIGN KEY (optimization_run_id) REFERENCES optimization_runs(id) ON DELETE CASCADE
);

-- 6. Create detailed cost tracking table
CREATE TABLE cost_tracking (
    id TEXT PRIMARY KEY,
    optimization_run_id TEXT NOT NULL,
    operation_type TEXT NOT NULL, -- 'prompt_generation', 'optimization', 'evaluation', 'api_call'
    model_name TEXT, -- 'gpt-4o', 'gemini-2.5-flash', etc.
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    cost_usd REAL DEFAULT 0.0,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT, -- JSON with operation-specific details
    FOREIGN KEY (optimization_run_id) REFERENCES optimization_runs(id) ON DELETE CASCADE
);

-- 7. Create indexes for performance optimization

-- Feedback usage indexes
CREATE INDEX idx_feedback_usage_run_id ON feedback_usage(optimization_run_id);
CREATE INDEX idx_feedback_usage_feedback ON feedback_usage(feedback_type, feedback_id);
CREATE INDEX idx_feedback_usage_created_at ON feedback_usage(created_at);

-- Progress tracking indexes
CREATE INDEX idx_optimization_progress_run_id ON optimization_progress(optimization_run_id);
CREATE INDEX idx_optimization_progress_timestamp ON optimization_progress(timestamp);
CREATE INDEX idx_optimization_progress_phase ON optimization_progress(phase);

-- Cost tracking indexes
CREATE INDEX idx_cost_tracking_run_id ON cost_tracking(optimization_run_id);
CREATE INDEX idx_cost_tracking_timestamp ON cost_tracking(timestamp);
CREATE INDEX idx_cost_tracking_operation_type ON cost_tracking(operation_type);

-- New feedback table indexes
CREATE INDEX idx_nugget_feedback_processed ON nugget_feedback(processed);
CREATE INDEX idx_nugget_feedback_last_used_at ON nugget_feedback(last_used_at);
CREATE INDEX idx_missing_feedback_processed ON missing_content_feedback(processed);
CREATE INDEX idx_missing_feedback_last_used_at ON missing_content_feedback(last_used_at);

-- 8. Create useful views for the dashboard

-- Dashboard stats view
CREATE VIEW dashboard_stats AS
SELECT 
    -- Feedback stats
    (SELECT COUNT(*) FROM nugget_feedback WHERE processed = FALSE) as pending_nugget_feedback,
    (SELECT COUNT(*) FROM missing_content_feedback WHERE processed = FALSE) as pending_missing_feedback,
    (SELECT COUNT(*) FROM nugget_feedback WHERE processed = TRUE) as processed_nugget_feedback,
    (SELECT COUNT(*) FROM missing_content_feedback WHERE processed = TRUE) as processed_missing_feedback,
    
    -- Current optimization stats
    (SELECT COUNT(*) FROM optimization_runs WHERE status = 'running') as active_optimizations,
    (SELECT COUNT(*) FROM optimization_runs WHERE status = 'completed') as completed_optimizations,
    (SELECT COUNT(*) FROM optimization_runs WHERE status = 'failed') as failed_optimizations,
    
    -- Cost stats (last 30 days)
    (SELECT COALESCE(SUM(api_cost), 0) FROM optimization_runs 
     WHERE started_at > datetime('now', '-30 days')) as monthly_costs,
    (SELECT COALESCE(SUM(tokens_used), 0) FROM optimization_runs 
     WHERE started_at > datetime('now', '-30 days')) as monthly_tokens;

-- Recent feedback view with processing status
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
    created_at,
    timestamp as client_timestamp
FROM missing_content_feedback
ORDER BY created_at DESC;

-- Optimization run costs view
CREATE VIEW optimization_run_costs AS
SELECT 
    or_main.id,
    or_main.mode,
    or_main.started_at,
    or_main.completed_at,
    or_main.status,
    or_main.api_cost as total_cost,
    or_main.tokens_used as total_tokens,
    or_main.input_tokens,
    or_main.output_tokens,
    or_main.training_examples_used,
    COALESCE(detailed_costs.operation_count, 0) as cost_operations_count
FROM optimization_runs or_main
LEFT JOIN (
    SELECT 
        optimization_run_id,
        COUNT(*) as operation_count,
        SUM(cost_usd) as detailed_total_cost
    FROM cost_tracking 
    GROUP BY optimization_run_id
) detailed_costs ON or_main.id = detailed_costs.optimization_run_id;