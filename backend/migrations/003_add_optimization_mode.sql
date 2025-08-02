-- Golden Nuggets Finder - Add Optimization Mode Tracking
-- Created: 2025-08-02 
-- Description: Add optimization_mode column to optimized_prompts table to track
--              whether the prompt was optimized using 'cheap' or 'expensive' mode.
--              This enables filtering and comparison of optimization strategies.

PRAGMA foreign_keys = ON;

-- =============================================================================
-- ADD OPTIMIZATION MODE COLUMN
-- =============================================================================

-- Add optimization_mode to optimized_prompts table
ALTER TABLE optimized_prompts ADD COLUMN optimization_mode TEXT CHECK(optimization_mode IN ('cheap', 'expensive'));

-- =============================================================================
-- BACKFILL EXISTING DATA
-- =============================================================================

-- Backfill existing optimized_prompts records based on linked optimization_runs
UPDATE optimized_prompts 
SET optimization_mode = (
    SELECT mode 
    FROM optimization_runs 
    WHERE optimization_runs.id = optimized_prompts.optimization_run_id
)
WHERE optimization_mode IS NULL;

-- =============================================================================
-- ADD INDEXES FOR PERFORMANCE
-- =============================================================================

-- Add index for efficient querying by optimization mode
CREATE INDEX idx_optimized_prompts_mode ON optimized_prompts(optimization_mode);

-- Add composite index for provider-specific optimization queries
CREATE INDEX idx_optimized_prompts_provider_mode ON optimized_prompts(model_provider, model_name, optimization_mode);