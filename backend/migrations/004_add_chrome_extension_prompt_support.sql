-- Golden Nuggets Finder - Chrome Extension Prompt Integration
-- Created: 2025-02-06
-- Description: Add support for Chrome extension prompt-specific optimization
--              Instead of optimizing a generic baseline_prompt, optimize the actual
--              prompts being used in the Chrome extension for better results.

PRAGMA foreign_keys = ON;

-- =============================================================================
-- CHROME EXTENSION PROMPT STORAGE
-- =============================================================================

-- Store Chrome extension prompts for optimization tracking
CREATE TABLE chrome_extension_prompts (
    id TEXT PRIMARY KEY,                    -- Chrome extension prompt ID
    name TEXT NOT NULL,                     -- Human-readable name
    prompt TEXT NOT NULL,                   -- Full prompt content
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    version INTEGER NOT NULL DEFAULT 1,    -- Version tracking for prompt changes
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT TRUE, -- Soft deletion support
    original_prompt_hash TEXT NOT NULL,     -- SHA-256 hash to detect changes
    last_sync_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP -- When synced from extension
);

-- Map Chrome extension prompts to their optimization runs
CREATE TABLE prompt_optimization_mappings (
    id TEXT PRIMARY KEY,
    chrome_prompt_id TEXT NOT NULL,         -- References chrome_extension_prompts.id
    chrome_prompt_version INTEGER NOT NULL,
    optimization_run_id TEXT NOT NULL,      -- References optimization_runs.id
    model_provider TEXT NOT NULL,          -- gemini, openai, anthropic, openrouter
    model_name TEXT NOT NULL,              -- Specific model
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_current BOOLEAN NOT NULL DEFAULT FALSE, -- Current optimization for this prompt+model
    
    FOREIGN KEY (chrome_prompt_id) REFERENCES chrome_extension_prompts(id) ON DELETE CASCADE,
    FOREIGN KEY (optimization_run_id) REFERENCES optimization_runs(id) ON DELETE CASCADE
);

-- =============================================================================
-- UPDATE EXISTING TABLES FOR PROMPT CONTEXT
-- =============================================================================

-- Add Chrome extension prompt context to feedback tables
ALTER TABLE nugget_feedback ADD COLUMN prompt_id TEXT;
ALTER TABLE nugget_feedback ADD COLUMN prompt_version INTEGER;
ALTER TABLE nugget_feedback ADD COLUMN full_prompt_content TEXT;

ALTER TABLE missing_content_feedback ADD COLUMN prompt_id TEXT;
ALTER TABLE missing_content_feedback ADD COLUMN prompt_version INTEGER;
ALTER TABLE missing_content_feedback ADD COLUMN full_prompt_content TEXT;

-- Add Chrome extension prompt context to optimization runs
ALTER TABLE optimization_runs ADD COLUMN chrome_prompt_id TEXT;
ALTER TABLE optimization_runs ADD COLUMN chrome_prompt_version INTEGER;

-- Add foreign key references where applicable
-- Note: We don't add FK constraints to feedback tables since they may have
-- data from before prompt tracking was implemented

-- Add foreign key for optimization runs
-- ALTER TABLE optimization_runs ADD FOREIGN KEY (chrome_prompt_id) REFERENCES chrome_extension_prompts(id);
-- Note: SQLite doesn't support adding FK constraints to existing tables easily,
-- so we'll handle this in application logic

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Chrome extension prompts indexes
CREATE INDEX idx_chrome_prompts_active ON chrome_extension_prompts(is_active);
CREATE INDEX idx_chrome_prompts_default ON chrome_extension_prompts(is_default);
CREATE INDEX idx_chrome_prompts_version ON chrome_extension_prompts(id, version);
CREATE INDEX idx_chrome_prompts_hash ON chrome_extension_prompts(original_prompt_hash);

-- Prompt optimization mappings indexes
CREATE INDEX idx_prompt_mappings_chrome_prompt ON prompt_optimization_mappings(chrome_prompt_id);
CREATE INDEX idx_prompt_mappings_optimization ON prompt_optimization_mappings(optimization_run_id);
CREATE INDEX idx_prompt_mappings_provider ON prompt_optimization_mappings(model_provider, model_name);
CREATE INDEX idx_prompt_mappings_current ON prompt_optimization_mappings(is_current);
CREATE INDEX idx_prompt_mappings_combined ON prompt_optimization_mappings(chrome_prompt_id, model_provider, model_name, is_current);

-- Feedback prompt context indexes
CREATE INDEX idx_nugget_feedback_prompt ON nugget_feedback(prompt_id);
CREATE INDEX idx_nugget_feedback_prompt_version ON nugget_feedback(prompt_id, prompt_version);
CREATE INDEX idx_missing_content_prompt ON missing_content_feedback(prompt_id);
CREATE INDEX idx_missing_content_prompt_version ON missing_content_feedback(prompt_id, prompt_version);

-- Optimization runs prompt context indexes
CREATE INDEX idx_optimization_runs_chrome_prompt ON optimization_runs(chrome_prompt_id);
CREATE INDEX idx_optimization_runs_chrome_prompt_version ON optimization_runs(chrome_prompt_id, chrome_prompt_version);

-- =============================================================================
-- TRIGGERS FOR DATA INTEGRITY
-- =============================================================================

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
-- UPDATED VIEWS
-- =============================================================================

-- Update dashboard stats to include Chrome extension prompt metrics
DROP VIEW dashboard_stats;

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
     
    -- NEW: Chrome extension prompt metrics
    (SELECT COUNT(*) FROM chrome_extension_prompts WHERE is_active = TRUE) as active_chrome_prompts,
    (SELECT COUNT(*) FROM prompt_optimization_mappings WHERE is_current = TRUE) as current_optimizations;

-- Create view for Chrome extension prompt optimization status
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
-- DATA MIGRATION AND BACKFILL
-- =============================================================================

-- Import the current baseline prompt as a Chrome extension prompt for backward compatibility
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
    'legacy-baseline-prompt',
    'Legacy Baseline Prompt',
    (SELECT prompt FROM optimized_prompts WHERE id = 'baseline-prompt-001'),
    TRUE,
    1,
    '5d41402abc4b2a76b9719d911017c592', -- MD5 of 'hello' as placeholder
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Create mapping for existing optimization run
INSERT INTO prompt_optimization_mappings (
    id,
    chrome_prompt_id,
    chrome_prompt_version,
    optimization_run_id,
    model_provider,
    model_name,
    is_current
) VALUES (
    'legacy-baseline-mapping',
    'legacy-baseline-prompt',
    1,
    'baseline-run-001',
    'gemini',
    'gemini-2.5-flash',
    TRUE
);

-- Update the baseline optimization run to reference Chrome prompt
UPDATE optimization_runs 
SET chrome_prompt_id = 'legacy-baseline-prompt',
    chrome_prompt_version = 1
WHERE id = 'baseline-run-001';

-- =============================================================================
-- COMMENTS AND DOCUMENTATION
-- =============================================================================

-- This migration enables prompt-specific optimization by:
-- 1. Storing Chrome extension prompts in `chrome_extension_prompts`
-- 2. Mapping prompts to optimization runs via `prompt_optimization_mappings`  
-- 3. Linking feedback to specific prompts via new columns in feedback tables
-- 4. Supporting multiple models per prompt through the mapping table
-- 5. Maintaining backward compatibility with existing baseline data
--
-- Key benefits:
-- - Optimize actual prompts being used instead of generic baseline
-- - Support multiple AI providers per Chrome extension prompt
-- - Track which prompts perform best for different content types
-- - Enable A/B testing of different prompt variations
-- - Provide better training data for DSPy by using real prompt context