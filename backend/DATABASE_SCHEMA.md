# Database Schema Documentation

This document describes the database schema for the Golden Nuggets Finder feedback system.

## Overview

The system uses SQLite for data storage with the following main components:
- **Feedback Collection**: User ratings and corrections
- **Missing Content Tracking**: User-identified missed golden nuggets
- **Optimization Management**: DSPy optimization runs and results
- **Prompt Versioning**: Versioned optimized prompts

## Tables

### nugget_feedback

Stores user feedback on extracted golden nuggets (thumbs up/down and type corrections).

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT | Unique feedback ID (from extension) |
| `nugget_content` | TEXT | Full golden nugget content |
| `original_type` | TEXT | Original type assigned by LLM |
| `corrected_type` | TEXT | User-corrected type (nullable) |
| `rating` | TEXT | 'positive' or 'negative' |
| `timestamp` | INTEGER | Unix timestamp from client |
| `url` | TEXT | Page URL where feedback was given |
| `context` | TEXT | Full surrounding context from page |
| `created_at` | TIMESTAMP | Server timestamp |

**Indexes**: `timestamp`, `rating`, `url`, `created_at`

### missing_content_feedback

Stores user-identified content that should have been extracted as golden nuggets.

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT | Unique feedback ID (from extension) |
| `content` | TEXT | Content user identified as valuable |
| `suggested_type` | TEXT | Type suggested by user |
| `timestamp` | INTEGER | Unix timestamp from client |
| `url` | TEXT | Page URL where content was identified |
| `context` | TEXT | Page context |
| `created_at` | TIMESTAMP | Server timestamp |

**Indexes**: `timestamp`, `suggested_type`, `url`, `created_at`

### optimization_runs

Tracks DSPy optimization execution history.

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT | Unique run ID |
| `mode` | TEXT | 'expensive' (MIPROv2) or 'cheap' (BootstrapFewShot) |
| `trigger_type` | TEXT | 'auto' or 'manual' |
| `started_at` | TIMESTAMP | When optimization started |
| `completed_at` | TIMESTAMP | When optimization completed (nullable) |
| `status` | TEXT | 'running', 'completed', or 'failed' |
| `result_prompt` | TEXT | Truncated result (first 1000 chars) |
| `performance_improvement` | REAL | Performance improvement over baseline |
| `feedback_count` | INTEGER | Number of training examples used |
| `error_message` | TEXT | Error details if failed (nullable) |

**Indexes**: `started_at`, `status`, `mode`

### optimized_prompts

Stores versioned optimized prompts from successful optimization runs.

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT | Unique prompt ID |
| `version` | INTEGER | Incremental version number |
| `prompt` | TEXT | Full optimized prompt text |
| `optimization_date` | TIMESTAMP | When prompt was created |
| `feedback_count` | INTEGER | Number of examples used for optimization |
| `positive_rate` | REAL | Performance score/positive rate |
| `is_current` | BOOLEAN | Whether this is the active prompt |
| `optimization_run_id` | TEXT | Link to optimization run (FK) |

**Foreign Keys**: `optimization_run_id` → `optimization_runs(id)`
**Indexes**: `version`, `is_current`, `optimization_date`

### training_examples

Stores training examples generated from feedback data for DSPy optimization.

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT | Unique example ID |
| `input_content` | TEXT | Input content for training |
| `expected_output` | TEXT | Expected JSON output (golden nuggets) |
| `feedback_score` | REAL | Quality score (0.0 to 1.0) |
| `url` | TEXT | Source URL |
| `timestamp` | TIMESTAMP | When example was created |
| `used_in_optimization` | BOOLEAN | Whether example was used in optimization |

**Indexes**: `feedback_score`, `timestamp`, `used_in_optimization`

### schema_migrations

Tracks applied database migrations (created by migration system).

| Column | Type | Description |
|--------|------|-------------|
| `version` | TEXT | Migration version/filename |
| `filename` | TEXT | Migration filename |
| `applied_at` | TIMESTAMP | When migration was applied |
| `checksum` | TEXT | Migration file checksum (unused currently) |

## Views

### feedback_stats

Aggregated feedback statistics for quick access.

```sql
SELECT 
    COUNT(*) as total_feedback,
    SUM(CASE WHEN rating = 'positive' THEN 1 ELSE 0 END) as positive_count,
    SUM(CASE WHEN rating = 'negative' THEN 1 ELSE 0 END) as negative_count,
    ROUND(AVG(CASE WHEN rating = 'positive' THEN 1.0 ELSE 0.0 END), 3) as positive_rate,
    MAX(created_at) as last_feedback_date,
    COUNT(DISTINCT url) as unique_urls
FROM nugget_feedback;
```

### recent_feedback_stats

Recent feedback trends (last 20 items) for optimization trigger analysis.

```sql
SELECT 
    COUNT(*) as recent_total,
    SUM(CASE WHEN rating = 'positive' THEN 1 ELSE 0 END) as recent_positive,
    SUM(CASE WHEN rating = 'negative' THEN 1 ELSE 0 END) as recent_negative,
    ROUND(AVG(CASE WHEN rating = 'positive' THEN 1.0 ELSE 0.0 END), 3) as recent_positive_rate,
    ROUND(AVG(CASE WHEN rating = 'negative' THEN 1.0 ELSE 0.0 END), 3) as recent_negative_rate
FROM (
    SELECT rating 
    FROM nugget_feedback 
    ORDER BY created_at DESC 
    LIMIT 20
);
```

## Triggers

### ensure_single_current_prompt

Ensures only one prompt can be marked as current at a time.

```sql
CREATE TRIGGER ensure_single_current_prompt
    BEFORE UPDATE ON optimized_prompts
    WHEN NEW.is_current = TRUE
BEGIN
    UPDATE optimized_prompts SET is_current = FALSE WHERE is_current = TRUE AND id != NEW.id;
END;
```

### update_optimization_run_on_prompt_creation

Automatically marks optimization runs as completed when a prompt is created.

```sql
CREATE TRIGGER update_optimization_run_on_prompt_creation
    AFTER INSERT ON optimized_prompts
    WHEN NEW.optimization_run_id IS NOT NULL
BEGIN
    UPDATE optimization_runs 
    SET status = 'completed', completed_at = CURRENT_TIMESTAMP
    WHERE id = NEW.optimization_run_id AND status = 'running';
END;
```

## Optimization Triggers

The system automatically triggers optimization based on these thresholds:

1. **Time + Volume**: 7+ days since last optimization AND 25+ feedback items
2. **High Volume**: 75+ total feedback items
3. **Quality Issues**: 15+ feedback items with 40%+ recent negative rate

These thresholds are implemented in the `FeedbackService.get_feedback_stats()` method.

## Data Flow

1. **Feedback Collection**: Chrome extension sends feedback → stored in `nugget_feedback` and `missing_content_feedback`
2. **Training Data Generation**: Feedback data → converted to `training_examples` for DSPy
3. **Optimization Trigger**: Threshold analysis → creates `optimization_runs` record
4. **Prompt Optimization**: DSPy processes training examples → creates `optimized_prompts` 
5. **Prompt Delivery**: Chrome extension fetches current optimized prompt

## Performance Considerations

### Indexes
All tables have appropriate indexes on commonly queried columns:
- Timestamp fields for chronological queries
- Status fields for filtering
- Foreign keys for joins
- URL fields for grouping by source

### Query Optimization
- Views provide pre-aggregated statistics
- Recent feedback analysis limited to last 20 items for performance
- Training example queries use indexes on `feedback_score` and `used_in_optimization`

### Storage
- Content fields store full text for complete DSPy training
- Full prompt text only stored in `optimized_prompts`
- Old training examples can be cleaned up periodically

## Backup and Migration

### Migration System
- SQL migration files in `migrations/` directory
- Tracked in `schema_migrations` table
- Run via `python app/database_migrations.py migrate`

### Backup
```bash
# Create backup
python -c "
from app.database_migrations import backup_database
import asyncio
asyncio.run(backup_database('backup_$(date +%Y%m%d_%H%M%S).db'))
"
```

### Reset (Development Only)
```bash
python app/database_migrations.py reset
```

## Security Considerations

- Foreign key constraints enabled via `PRAGMA foreign_keys = ON`
- Input validation via CHECK constraints on enum fields
- No sensitive data stored (URLs and content snippets only)
- Database file permissions should be restricted in production