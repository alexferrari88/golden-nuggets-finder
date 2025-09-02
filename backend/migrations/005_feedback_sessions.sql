-- Golden Nuggets Finder - Feedback Sessions and Enhanced Attribution
-- Created: 2025-09-02
-- Description: Database reset with enhanced session tracking for multi-provider feedback attribution
--              This migration wipes all existing data and creates a fresh schema with session tracking
--              to enable accurate DSPy training data generation for multi-provider ensemble optimization.

PRAGMA foreign_keys = ON;

-- =============================================================================
-- DATABASE RESET - START FRESH
-- =============================================================================

-- Drop all existing tables and start fresh (hobby project, no valuable data)
DROP TABLE IF EXISTS nugget_feedback;
DROP TABLE IF EXISTS missing_content_feedback; 
DROP TABLE IF EXISTS optimization_runs;
DROP TABLE IF EXISTS optimized_prompts;
DROP TABLE IF EXISTS training_examples;
DROP TABLE IF EXISTS feedback_usage;
DROP TABLE IF EXISTS cost_tracking;
DROP TABLE IF EXISTS optimization_progress;
DROP TABLE IF EXISTS chrome_extension_prompts;
DROP TABLE IF EXISTS prompt_optimization_mappings;

-- Drop views that depend on tables
DROP VIEW IF EXISTS dashboard_stats;
DROP VIEW IF EXISTS recent_feedback_with_status;
DROP VIEW IF EXISTS duplicate_content_analysis;
DROP VIEW IF EXISTS chrome_prompt_optimization_status;

-- =============================================================================
-- ENHANCED FEEDBACK TABLES WITH SESSION TRACKING
-- =============================================================================

-- Create enhanced nugget_feedback table with session tracking
CREATE TABLE nugget_feedback (
    id TEXT PRIMARY KEY,
    nugget_content TEXT NOT NULL,
    original_type TEXT NOT NULL,
    corrected_type TEXT,
    rating TEXT NOT NULL CHECK(rating IN ('positive', 'negative')),
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
    
    -- Deduplication support
    report_count INTEGER NOT NULL DEFAULT 1,
    first_reported_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_reported_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Processing tracking
    processed BOOLEAN NOT NULL DEFAULT FALSE,
    last_used_at TIMESTAMP,
    usage_count INTEGER NOT NULL DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create enhanced missing_content_feedback table with session tracking  
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
    
    -- Deduplication support (matching nugget_feedback structure)
    report_count INTEGER NOT NULL DEFAULT 1,
    first_reported_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_reported_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Processing tracking (matching nugget_feedback structure)
    processed BOOLEAN NOT NULL DEFAULT FALSE,
    last_used_at TIMESTAMP,
    usage_count INTEGER NOT NULL DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- RECREATE CORE SYSTEM TABLES
-- =============================================================================

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
    
    -- Chrome extension prompt context
    chrome_prompt_id TEXT,
    chrome_prompt_version INTEGER,
    model_provider TEXT,
    model_name TEXT,
    
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

-- Chrome extension prompts storage
CREATE TABLE chrome_extension_prompts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    prompt TEXT NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    original_prompt_hash TEXT NOT NULL,
    last_sync_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Map Chrome extension prompts to their optimization runs
CREATE TABLE prompt_optimization_mappings (
    id TEXT PRIMARY KEY,
    chrome_prompt_id TEXT NOT NULL,
    chrome_prompt_version INTEGER NOT NULL,
    optimization_run_id TEXT NOT NULL,
    model_provider TEXT NOT NULL,
    model_name TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_current BOOLEAN NOT NULL DEFAULT FALSE,
    
    FOREIGN KEY (chrome_prompt_id) REFERENCES chrome_extension_prompts(id) ON DELETE CASCADE,
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
-- INDEXES FOR EFFICIENT QUERIES
-- =============================================================================

-- Enhanced nugget feedback indexes
CREATE INDEX idx_nugget_feedback_provider ON nugget_feedback(model_provider, model_name);
CREATE INDEX idx_nugget_feedback_session ON nugget_feedback(feedback_session_id);
CREATE INDEX idx_nugget_feedback_attribution ON nugget_feedback(attribution_source);
CREATE INDEX idx_nugget_feedback_rating ON nugget_feedback(rating);
CREATE INDEX idx_nugget_feedback_processed ON nugget_feedback(processed);
CREATE INDEX idx_nugget_feedback_url ON nugget_feedback(url);
CREATE INDEX idx_nugget_feedback_dedup ON nugget_feedback(nugget_content, url, original_type);
CREATE INDEX idx_nugget_feedback_created_at ON nugget_feedback(created_at);
CREATE INDEX idx_nugget_feedback_prompt ON nugget_feedback(prompt_id);

-- Enhanced missing content feedback indexes
CREATE INDEX idx_missing_content_provider ON missing_content_feedback(model_provider, model_name);
CREATE INDEX idx_missing_content_session ON missing_content_feedback(feedback_session_id);
CREATE INDEX idx_missing_content_attribution ON missing_content_feedback(attribution_source);
CREATE INDEX idx_missing_content_processed ON missing_content_feedback(processed);
CREATE INDEX idx_missing_content_url ON missing_content_feedback(url);
CREATE INDEX idx_missing_content_dedup ON missing_content_feedback(full_content, url);
CREATE INDEX idx_missing_content_created_at ON missing_content_feedback(created_at);
CREATE INDEX idx_missing_content_prompt ON missing_content_feedback(prompt_id);

-- Optimization runs indexes
CREATE INDEX idx_optimization_runs_status ON optimization_runs(status);
CREATE INDEX idx_optimization_runs_started_at ON optimization_runs(started_at);
CREATE INDEX idx_optimization_runs_mode ON optimization_runs(mode);
CREATE INDEX idx_optimization_runs_chrome_prompt ON optimization_runs(chrome_prompt_id);
CREATE INDEX idx_optimization_runs_provider ON optimization_runs(model_provider, model_name);

-- Chrome extension prompts indexes
CREATE INDEX idx_chrome_prompts_active ON chrome_extension_prompts(is_active);
CREATE INDEX idx_chrome_prompts_default ON chrome_extension_prompts(is_default);
CREATE INDEX idx_chrome_prompts_version ON chrome_extension_prompts(id, version);

-- Prompt optimization mappings indexes
CREATE INDEX idx_prompt_mappings_chrome_prompt ON prompt_optimization_mappings(chrome_prompt_id);
CREATE INDEX idx_prompt_mappings_optimization ON prompt_optimization_mappings(optimization_run_id);
CREATE INDEX idx_prompt_mappings_provider ON prompt_optimization_mappings(model_provider, model_name);
CREATE INDEX idx_prompt_mappings_current ON prompt_optimization_mappings(is_current);

-- Other core indexes
CREATE INDEX idx_optimized_prompts_current ON optimized_prompts(is_current);
CREATE INDEX idx_feedback_usage_run_id ON feedback_usage(optimization_run_id);
CREATE INDEX idx_cost_tracking_run_id ON cost_tracking(optimization_run_id);
CREATE INDEX idx_optimization_progress_run_id ON optimization_progress(optimization_run_id);

-- =============================================================================
-- RECREATE VIEWS WITH SESSION AWARENESS
-- =============================================================================

-- Dashboard overview statistics with enhanced metrics
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
     WHERE started_at > datetime('now', '-30 days')) as monthly_tokens,
     
    -- Chrome extension prompt metrics
    (SELECT COUNT(*) FROM chrome_extension_prompts WHERE is_active = TRUE) as active_chrome_prompts,
    (SELECT COUNT(*) FROM prompt_optimization_mappings WHERE is_current = TRUE) as current_optimizations;

-- Recent feedback with session tracking
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
    timestamp as client_timestamp,
    model_provider,
    model_name,
    feedback_session_id,
    attribution_source
FROM nugget_feedback
UNION ALL
SELECT 
    'missing_content' as feedback_type,
    id,
    full_content as content,
    NULL as rating,
    url,
    processed,
    last_used_at,
    usage_count,
    report_count,
    first_reported_at,
    last_reported_at,
    created_at,
    timestamp as client_timestamp,
    model_provider,
    model_name,
    feedback_session_id,
    attribution_source
FROM missing_content_feedback
ORDER BY COALESCE(last_reported_at, created_at) DESC;

-- Chrome extension prompt optimization status
CREATE VIEW chrome_prompt_optimization_status AS
SELECT 
    cep.id as chrome_prompt_id,
    cep.name as prompt_name,
    cep.version as prompt_version,
    cep.is_default,
    pom.model_provider,
    pom.model_name,
    pom.optimization_run_id,
    or_table.status as optimization_status,
    or_table.started_at as optimization_started,
    or_table.completed_at as optimization_completed,
    or_table.performance_improvement,
    op.prompt as optimized_prompt_content,
    op.positive_rate as optimization_performance,
    pom.is_current as is_current_optimization
FROM chrome_extension_prompts cep
LEFT JOIN prompt_optimization_mappings pom ON cep.id = pom.chrome_prompt_id
LEFT JOIN optimization_runs or_table ON pom.optimization_run_id = or_table.id
LEFT JOIN optimized_prompts op ON or_table.id = op.optimization_run_id
WHERE cep.is_active = TRUE
ORDER BY cep.name, pom.model_provider, or_table.started_at DESC;

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

-- Ensure only one current optimization per prompt+model combination
CREATE TRIGGER ensure_single_current_optimization_per_prompt
    BEFORE UPDATE ON prompt_optimization_mappings
    WHEN NEW.is_current = TRUE
BEGIN
    UPDATE prompt_optimization_mappings 
    SET is_current = FALSE 
    WHERE chrome_prompt_id = NEW.chrome_prompt_id 
      AND model_provider = NEW.model_provider 
      AND model_name = NEW.model_name
      AND is_current = TRUE 
      AND id != NEW.id;
END;

-- Auto-complete optimization run when prompt is created
CREATE TRIGGER complete_optimization_on_prompt_creation
    AFTER INSERT ON optimized_prompts
BEGIN
    UPDATE optimization_runs 
    SET status = 'completed', completed_at = CURRENT_TIMESTAMP
    WHERE id = NEW.optimization_run_id AND status = 'running';
END;

-- Auto-update timestamps on Chrome extension prompt changes
CREATE TRIGGER update_chrome_prompt_timestamp
    BEFORE UPDATE ON chrome_extension_prompts
    FOR EACH ROW
BEGIN
    UPDATE chrome_extension_prompts 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;

-- =============================================================================
-- INITIAL DATA - BASELINE PROMPT
-- =============================================================================

-- Insert default baseline prompt run
INSERT INTO optimization_runs (
    id, mode, trigger_type, status, started_at, completed_at, 
    feedback_count, performance_improvement, chrome_prompt_id, chrome_prompt_version,
    model_provider, model_name
) VALUES (
    'baseline-run-001', 'cheap', 'manual', 'completed', 
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0.0, 'baseline-chrome-prompt', 1,
    'gemini', 'gemini-2.5-flash-lite'
);

-- Insert baseline Chrome extension prompt
INSERT INTO chrome_extension_prompts (
    id, 
    name, 
    prompt, 
    is_default, 
    version,
    original_prompt_hash,
    created_at,
    updated_at,
    last_sync_at
) VALUES (
    'baseline-chrome-prompt',
    'Default Golden Nuggets Prompt',
    'You are an expert at identifying golden nuggets of insight from content.

Your task is to find the most valuable insights that would be useful for a software developer, entrepreneur, or knowledge worker. Focus on:

1. **Tools and Resources**: Specific tools, libraries, services, or resources mentioned
2. **Media and References**: Books, articles, videos, podcasts, or other content worth consuming
3. **Aha! Moments**: Clear explanations of complex concepts, processes, or phenomena
4. **Analogies and Models**: Mental models, analogies, or frameworks for understanding
5. **Models and Frameworks**: Structured approaches, methodologies, or systematic thinking tools

For each golden nugget, extract the complete, verbatim text and classify it by type.

Return your response as valid JSON with this exact structure:
{
  "golden_nuggets": [
    {
      "type": "tool|media|aha! moments|analogy|model",
      "fullContent": "Complete verbatim text of the golden nugget",
      "confidence": 0.95
    }
  ]
}',
    TRUE,
    1,
    '5d41402abc4b2a76b9719d911017c592',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Insert baseline optimized prompt
INSERT INTO optimized_prompts (
    id, version, prompt, is_current, feedback_count, positive_rate, optimization_run_id
) VALUES (
    'baseline-prompt-001',
    1,
    'You are an expert at identifying golden nuggets of insight from content.

Your task is to find the most valuable insights that would be useful for a software developer, entrepreneur, or knowledge worker. Focus on:

1. **Tools and Resources**: Specific tools, libraries, services, or resources mentioned
2. **Media and References**: Books, articles, videos, podcasts, or other content worth consuming
3. **Aha! Moments**: Clear explanations of complex concepts, processes, or phenomena
4. **Analogies and Models**: Mental models, analogies, or frameworks for understanding
5. **Models and Frameworks**: Structured approaches, methodologies, or systematic thinking tools

For each golden nugget, extract the complete, verbatim text and classify it by type.

Return your response as valid JSON with this exact structure:
{
  "golden_nuggets": [
    {
      "type": "tool|media|aha! moments|analogy|model",
      "fullContent": "Complete verbatim text of the golden nugget",
      "confidence": 0.95
    }
  ]
}',
    TRUE,
    0,
    0.0,
    'baseline-run-001'
);

-- Create mapping for baseline optimization
INSERT INTO prompt_optimization_mappings (
    id,
    chrome_prompt_id,
    chrome_prompt_version,
    optimization_run_id,
    model_provider,
    model_name,
    is_current
) VALUES (
    'baseline-mapping-001',
    'baseline-chrome-prompt',
    1,
    'baseline-run-001',
    'gemini',
    'gemini-2.5-flash-lite',
    TRUE
);

-- =============================================================================
-- COMMENTS AND DOCUMENTATION
-- =============================================================================

-- This migration enables session-aware multi-provider feedback attribution by:
-- 1. Wiping all existing data for a clean start (hobby project, no valuable data)
-- 2. Adding session tracking fields (feedback_session_id, attribution_source) to feedback tables
-- 3. Adding enhanced provider tracking (model_provider, model_name) for accurate attribution
-- 4. Creating indexes for efficient provider and session-based queries
-- 5. Maintaining backward compatibility with Chrome extension integration
-- 6. Supporting DSPy training data quality improvements through attribution filtering
--
-- Key benefits:
-- - Accurate provider attribution for each feedback record
-- - Session grouping for related feedback records (consensus nuggets, missing content)
-- - Enhanced DSPy training data quality through attribution source filtering
-- - Support for multi-provider ensemble feedback attribution
-- - Improved analytics and cost tracking per provider