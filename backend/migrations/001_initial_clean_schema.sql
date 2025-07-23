-- Golden Nuggets Finder - Clean Initial Schema
-- Created: 2025-01-23
-- Description: Clean, well-designed schema replacing the messy incremental migrations
--              This single migration creates all necessary tables and views with consistent
--              design patterns and proper data types.

PRAGMA foreign_keys = ON;

-- =============================================================================
-- CORE TABLES
-- =============================================================================

-- User feedback on AI-extracted golden nuggets (ratings and corrections)
CREATE TABLE nugget_feedback (
    id TEXT PRIMARY KEY,
    nugget_content TEXT NOT NULL,
    original_type TEXT NOT NULL,
    corrected_type TEXT,
    rating TEXT NOT NULL CHECK(rating IN ('positive', 'negative')),
    url TEXT NOT NULL,
    context TEXT NOT NULL,
    
    -- Deduplication support
    report_count INTEGER NOT NULL DEFAULT 1,
    first_reported_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_reported_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Processing tracking
    processed BOOLEAN NOT NULL DEFAULT FALSE,
    last_used_at TIMESTAMP,
    usage_count INTEGER NOT NULL DEFAULT 0,
    
    -- Timestamps (consistent format)
    client_timestamp TIMESTAMP NOT NULL,  -- When user submitted (from extension)
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP  -- Server processing time
);

-- User-identified content that was missed by the AI
CREATE TABLE missing_content_feedback (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    suggested_type TEXT NOT NULL,
    url TEXT NOT NULL,
    context TEXT NOT NULL,
    
    -- Deduplication support (matching nugget_feedback structure)
    report_count INTEGER NOT NULL DEFAULT 1,
    first_reported_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_reported_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Processing tracking (matching nugget_feedback structure)
    processed BOOLEAN NOT NULL DEFAULT FALSE,
    last_used_at TIMESTAMP,
    usage_count INTEGER NOT NULL DEFAULT 0,
    
    -- Timestamps (consistent format)
    client_timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- DSPy optimization run tracking
CREATE TABLE optimization_runs (
    id TEXT PRIMARY KEY,
    mode TEXT NOT NULL CHECK(mode IN ('expensive', 'cheap')),
    trigger_type TEXT NOT NULL CHECK(trigger_type IN ('auto', 'manual')),
    status TEXT NOT NULL DEFAULT 'running' CHECK(status IN ('running', 'completed', 'failed')),
    
    -- Timing
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Results
    result_prompt TEXT,
    performance_improvement REAL,
    feedback_count INTEGER NOT NULL,
    error_message TEXT,
    
    -- Cost tracking (summary level)
    api_cost REAL NOT NULL DEFAULT 0.0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    training_examples_used INTEGER NOT NULL DEFAULT 0,
    
    -- Optional detailed metrics (JSON)
    detailed_metrics TEXT
);

-- Versioned optimized prompts produced by DSPy
CREATE TABLE optimized_prompts (
    id TEXT PRIMARY KEY,
    version INTEGER NOT NULL,
    prompt TEXT NOT NULL,
    is_current BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Performance metrics
    feedback_count INTEGER NOT NULL,
    positive_rate REAL NOT NULL,
    
    -- Linking
    optimization_run_id TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (optimization_run_id) REFERENCES optimization_runs(id) ON DELETE CASCADE
);

-- Junction table tracking which feedback was used in which optimizations
CREATE TABLE feedback_usage (
    id TEXT PRIMARY KEY,
    optimization_run_id TEXT NOT NULL,
    feedback_type TEXT NOT NULL CHECK(feedback_type IN ('nugget', 'missing_content')),
    feedback_id TEXT NOT NULL,
    contribution_score REAL NOT NULL DEFAULT 1.0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (optimization_run_id) REFERENCES optimization_runs(id) ON DELETE CASCADE
);

-- Detailed API cost tracking per operation
CREATE TABLE cost_tracking (
    id TEXT PRIMARY KEY,
    optimization_run_id TEXT NOT NULL,
    operation_type TEXT NOT NULL CHECK(operation_type IN (
        'prompt_generation', 'optimization', 'evaluation', 'api_call'
    )),
    model_name TEXT,
    
    -- Token usage
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    cost_usd REAL NOT NULL DEFAULT 0.0,
    
    -- Optional operation-specific details (JSON)
    metadata TEXT,
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (optimization_run_id) REFERENCES optimization_runs(id) ON DELETE CASCADE
);

-- Progress tracking for long-running optimizations
CREATE TABLE optimization_progress (
    id TEXT PRIMARY KEY,
    optimization_run_id TEXT NOT NULL,
    phase TEXT NOT NULL CHECK(phase IN (
        'initialization', 'data_gathering', 'optimization', 
        'storing', 'completed', 'failed'
    )),
    progress_percent INTEGER NOT NULL DEFAULT 0 CHECK(progress_percent >= -1 AND progress_percent <= 100),
    message TEXT NOT NULL,
    
    -- Optional phase-specific details (JSON)
    metadata TEXT,
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (optimization_run_id) REFERENCES optimization_runs(id) ON DELETE CASCADE
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Nugget feedback indexes
CREATE INDEX idx_nugget_feedback_rating ON nugget_feedback(rating);
CREATE INDEX idx_nugget_feedback_processed ON nugget_feedback(processed);
CREATE INDEX idx_nugget_feedback_url ON nugget_feedback(url);
CREATE INDEX idx_nugget_feedback_dedup ON nugget_feedback(nugget_content, url, original_type);
CREATE INDEX idx_nugget_feedback_report_count ON nugget_feedback(report_count);
CREATE INDEX idx_nugget_feedback_created_at ON nugget_feedback(created_at);

-- Missing content feedback indexes
CREATE INDEX idx_missing_content_processed ON missing_content_feedback(processed);
CREATE INDEX idx_missing_content_url ON missing_content_feedback(url);
CREATE INDEX idx_missing_content_dedup ON missing_content_feedback(content, url);
CREATE INDEX idx_missing_content_report_count ON missing_content_feedback(report_count);
CREATE INDEX idx_missing_content_created_at ON missing_content_feedback(created_at);

-- Optimization runs indexes
CREATE INDEX idx_optimization_runs_status ON optimization_runs(status);
CREATE INDEX idx_optimization_runs_started_at ON optimization_runs(started_at);
CREATE INDEX idx_optimization_runs_mode ON optimization_runs(mode);

-- Optimized prompts indexes
CREATE INDEX idx_optimized_prompts_current ON optimized_prompts(is_current);
CREATE INDEX idx_optimized_prompts_version ON optimized_prompts(version);
CREATE INDEX idx_optimized_prompts_run_id ON optimized_prompts(optimization_run_id);

-- Feedback usage indexes
CREATE INDEX idx_feedback_usage_run_id ON feedback_usage(optimization_run_id);
CREATE INDEX idx_feedback_usage_feedback ON feedback_usage(feedback_type, feedback_id);

-- Cost tracking indexes
CREATE INDEX idx_cost_tracking_run_id ON cost_tracking(optimization_run_id);
CREATE INDEX idx_cost_tracking_operation_type ON cost_tracking(operation_type);

-- Progress tracking indexes
CREATE INDEX idx_optimization_progress_run_id ON optimization_progress(optimization_run_id);
CREATE INDEX idx_optimization_progress_phase ON optimization_progress(phase);

-- =============================================================================
-- VIEWS
-- =============================================================================

-- Dashboard overview statistics
-- COLUMN CONTRACT: This view returns exactly 9 columns in this order:
-- 0: pending_nugget_feedback, 1: pending_missing_feedback, 2: processed_nugget_feedback,
-- 3: processed_missing_feedback, 4: active_optimizations, 5: completed_optimizations,
-- 6: failed_optimizations, 7: monthly_costs, 8: monthly_tokens
CREATE VIEW dashboard_stats AS
SELECT 
    -- Feedback processing status (items, not report counts)
    (SELECT COUNT(*) FROM nugget_feedback WHERE processed = FALSE) as pending_nugget_feedback,
    (SELECT COUNT(*) FROM missing_content_feedback WHERE processed = FALSE) as pending_missing_feedback,
    (SELECT COUNT(*) FROM nugget_feedback WHERE processed = TRUE) as processed_nugget_feedback,
    (SELECT COUNT(*) FROM missing_content_feedback WHERE processed = TRUE) as processed_missing_feedback,
    
    -- Optimization status
    (SELECT COUNT(*) FROM optimization_runs WHERE status = 'running') as active_optimizations,
    (SELECT COUNT(*) FROM optimization_runs WHERE status = 'completed') as completed_optimizations,
    (SELECT COUNT(*) FROM optimization_runs WHERE status = 'failed') as failed_optimizations,
    
    -- Monthly costs (last 30 days)
    (SELECT COALESCE(SUM(api_cost), 0.0) FROM optimization_runs 
     WHERE started_at > datetime('now', '-30 days')) as monthly_costs,
    (SELECT COALESCE(SUM(total_tokens), 0) FROM optimization_runs 
     WHERE started_at > datetime('now', '-30 days')) as monthly_tokens;

-- Recent feedback from both types, unified view
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
    client_timestamp
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
    client_timestamp
FROM missing_content_feedback
ORDER BY COALESCE(last_reported_at, created_at) DESC;

-- Duplicate content analysis for monitoring
CREATE VIEW duplicate_content_analysis AS
SELECT 
    'nugget' as feedback_type,
    nugget_content as content,
    url,
    report_count,
    first_reported_at as earliest_report,
    last_reported_at as latest_report,
    id as item_id
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
    id as item_id
FROM missing_content_feedback
WHERE report_count > 1
ORDER BY report_count DESC, latest_report DESC;

-- =============================================================================
-- TRIGGERS FOR DATA INTEGRITY
-- =============================================================================

-- Ensure only one current prompt at a time
CREATE TRIGGER ensure_single_current_prompt
    BEFORE UPDATE ON optimized_prompts
    WHEN NEW.is_current = TRUE
BEGIN
    UPDATE optimized_prompts SET is_current = FALSE 
    WHERE is_current = TRUE AND id != NEW.id;
END;

-- Auto-complete optimization run when prompt is created
CREATE TRIGGER complete_optimization_on_prompt_creation
    AFTER INSERT ON optimized_prompts
BEGIN
    UPDATE optimization_runs 
    SET status = 'completed', completed_at = CURRENT_TIMESTAMP
    WHERE id = NEW.optimization_run_id AND status = 'running';
END;

-- =============================================================================
-- INITIAL DATA
-- =============================================================================

-- Insert default baseline prompt
INSERT INTO optimization_runs (
    id, mode, trigger_type, status, started_at, completed_at, 
    feedback_count, performance_improvement
) VALUES (
    'baseline-run-001', 'cheap', 'manual', 'completed', 
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0.0
);

INSERT INTO optimized_prompts (
    id, version, prompt, is_current, feedback_count, positive_rate, optimization_run_id
) VALUES (
    'baseline-prompt-001',
    1,
    'You are an expert at identifying golden nuggets of insight from {{ source }}.

Your task is to find the most valuable insights that would be useful for a software developer, entrepreneur, or knowledge worker. Focus on:

1. **Tools and Resources**: Specific tools, libraries, services, or resources mentioned
2. **Media and References**: Books, articles, videos, podcasts, or other content worth consuming
3. **Explanations**: Clear explanations of complex concepts, processes, or phenomena
4. **Analogies and Models**: Mental models, analogies, or frameworks for understanding
5. **Models and Frameworks**: Structured approaches, methodologies, or systematic thinking tools

For each golden nugget, provide:
- The exact original text (verbatim quote)
- Why it''s valuable for the target persona

Return your response as valid JSON only, with no additional text or explanation.',
    TRUE,
    0,
    0.0,
    'baseline-run-001'
);