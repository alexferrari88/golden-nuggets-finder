# CLAUDE.md - Backend

This file provides guidance to Claude Code when working with the Golden Nuggets Finder backend infrastructure.

## Core Principles

- **Defensive Security Only**: This backend collects feedback to improve AI prompts - never implement offensive security capabilities
- **Data Privacy**: User feedback contains webpage content - handle with appropriate privacy considerations
- **API Stability**: Chrome extension depends on stable API contracts - breaking changes require extension updates
- **Performance**: DSPy optimization can be CPU/memory intensive - use background tasks and limits

## ⚠️ CRITICAL WARNINGS - DO NOT IGNORE

### NEVER Expose Internal Database Operations

**ABSOLUTELY NEVER** create direct database endpoints that expose raw SQL or internal database operations.

**Why this is critical:**
- All database access must go through service layer (`FeedbackService`, `OptimizationService`)
- Pydantic models provide validation and security boundaries
- Direct database exposure could leak sensitive user data or allow injection attacks
- Chrome extension expects specific JSON response formats

**Current Architecture (DO NOT CHANGE):**
- All database operations in `app/database.py` and service classes
- API endpoints only use service layer methods
- Pydantic models validate all input/output data
- No direct SQL exposure in API responses

### NEVER Store Sensitive Data in Feedback

**ABSOLUTELY NEVER** store full webpage content, personal information, or sensitive data in feedback records.

**Why this is critical:**
- Feedback contains user's browsing context which may include personal information
- Database should only store what's necessary for prompt optimization
- Full content is now stored for optimal DSPy training and analysis
- User URLs are stored for analysis but should not contain query parameters with sensitive data

**Current Data Storage (UPDATED):**
- `nuggetContent`: Full golden nugget content (no length restrictions)
- `context`: Full surrounding context from page (no length restrictions)
- Full webpage content is NEVER stored in database
- Personal identifiers are not collected

## Architecture Overview

### Framework and Core Technologies
- **Framework**: FastAPI with async/await support
- **Database**: SQLite with aiosqlite for async operations
- **AI Integration**: DSPy framework with Google Gemini API
- **Validation**: Pydantic models for type safety
- **Deployment**: Docker with multi-stage builds
- **Testing**: pytest with async support

### Backend Components

1. **FastAPI Application** (`app/main.py`):
   - REST API endpoints for feedback collection and optimization
   - CORS configuration for Chrome extension integration
   - Background task management for async optimization
   - Health check and monitoring endpoints

2. **Service Layer**:
   - **FeedbackService** (`services/feedback_service.py`): Manages feedback storage, statistics, and analysis
   - **OptimizationService** (`services/optimization_service.py`): Handles DSPy-based prompt optimization
   - **CostTrackingService** (`services/cost_tracking_service.py`): Tracks API costs and token usage
   - **ProgressTrackingService** (`services/progress_tracking_service.py`): Real-time optimization progress monitoring
   - **DSPy Configuration** (`services/dspy_config.py`): DSPy framework setup and configuration

3. **Data Models** (`app/models.py`):
   - **Request/Response Models**: `FeedbackSubmissionRequest`, `UpdateFeedbackRequest`, `OptimizationRequest`, `FeedbackStatsResponse`, `OptimizedPromptResponse`
   - **Monitoring Models**: `OptimizationProgress`, `SystemHealthResponse`, `MonitoringResponse`
   - **Deduplication Models**: `DeduplicationInfo`, `FeedbackWithDeduplication`
   - **Internal Storage Models**: `StoredNuggetFeedback`, `StoredMissingContentFeedback`, `OptimizationRun`
   - **DSPy Integration Models**: `TrainingExample`, `PromptOptimizationResult`
   - TypeScript interface compatibility for Chrome extension

4. **Database Layer** (`app/database.py`):
   - SQLite schema and migrations
   - Async connection management
   - Query operations and data persistence

## Development Workflow

### Setup and Running
```bash
# Docker (Recommended)
cd backend
cp .env.example .env
# Add GEMINI_API_KEY to .env
docker-compose --profile dev up backend-dev

# Local Development
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python run.py
```

### Testing

The backend has three types of tests with different database isolation requirements. Testing configuration is managed in `pyproject.toml` with pytest settings, coverage reporting, and async test support.

#### Automated Tests (Recommended)
```bash
# Run integration and unit tests (automatic database isolation)
pytest tests/integration tests/unit

# Run all automated tests
pytest tests/ --ignore=tests/manual/

# Run specific test file
pytest tests/integration/test_main.py -v

# Run with coverage (configured in pyproject.toml)
pytest --cov=app tests/integration tests/unit

# Coverage report includes HTML output in htmlcov/ directory
# Test markers available: slow, integration, unit
# Run only fast tests: pytest -m "not slow"
```

#### Manual Tests (Development & Debugging)
Manual test scripts require explicit database isolation to prevent production database pollution:

```bash
# Run manual tests with isolated test database (REQUIRED)
FORCE_TEST_DB=1 python3 tests/manual/test_dashboard_backend.py
FORCE_TEST_DB=1 python3 tests/manual/test_monitoring.py
FORCE_TEST_DB=1 python3 tests/manual/test_improved_cost_tracking.py

# Run with sample data for testing
FORCE_TEST_DB=1 python3 tests/manual/test_dashboard_backend.py --with-sample-data
```

**⚠️ CRITICAL**: Always use `FORCE_TEST_DB=1` with manual tests to prevent production database pollution.

#### Test Database Isolation

The system automatically detects test environments and uses isolated databases:

- **Pytest tests**: Automatic isolation using temporary databases per test
- **Manual tests**: Must use `FORCE_TEST_DB=1` environment variable  
- **Production safety**: Multiple detection mechanisms prevent accidental pollution

**Environment Detection:**
- `pytest` in sys.modules (automatic)
- `PYTEST_CURRENT_TEST` environment variable (pytest runner)
- `FORCE_TEST_DB=1` environment variable (manual tests)

#### Test Categories

1. **Integration Tests** (`tests/integration/`): API endpoints with real database
2. **Unit Tests** (`tests/unit/`): Individual service classes with mocked dependencies  
3. **Manual Tests** (`tests/manual/`): Development scripts for debugging and performance testing

### Code Quality
```bash
# Formatting and linting with ruff (configured in pyproject.toml)
ruff check .      # Lint with extensive rule set (E, W, F, I, B, C4, UP, ARG, SIM, etc.)
ruff format .     # Format code with consistent style

# Type checking with mypy
mypy .

# Run all quality checks together
ruff check . && ruff format . && mypy .
```

### Database Management
```bash
# Initialize database (automatic on startup)
python scripts/db_management.py init

# Backup database
python scripts/db_management.py backup

# View feedback stats
python scripts/db_management.py stats
```

## File Structure and Components

### Main Application Files
- `app/main.py` - FastAPI application with all API endpoints
- `app/models.py` - Pydantic models for validation and type safety
- `app/database.py` - SQLite database operations and schema

### Service Layer (`app/services/`)
- `feedback_service.py` - Feedback collection, storage, and statistics
- `optimization_service.py` - DSPy optimization logic and prompt management
- `cost_tracking_service.py` - Cost tracking and analytics for API usage
- `improved_cost_tracking_service.py` - Enhanced cost tracking with advanced analytics
- `progress_tracking_service.py` - Real-time progress tracking for optimization runs
- `dspy_config.py` - DSPy framework configuration and setup

### Infrastructure
- `Dockerfile` / `Dockerfile.dev` - Docker containerization
- `docker-compose.yml` - Multi-service orchestration
- `requirements.txt` - Python dependencies
- `pyproject.toml` - Python project configuration with ruff, pytest, and coverage settings
- `run.py` - Development server startup script

### Database and Migrations
- `app/database_migrations.py` - Database migration system and schema management
- `migrations/` - SQL migration files for database schema evolution

### Additional Documentation
- `DATABASE_SCHEMA.md` - Detailed database schema documentation
- `DEPLOYMENT.md` - Production deployment guidelines
- `DOCKER.md` - Docker setup and containerization guide
- `MONITORING_GUIDE.md` - Comprehensive monitoring and observability documentation

### Database Schema

The SQLite database includes these main tables:

1. **`nugget_feedback`**: User ratings and type corrections for golden nuggets
   - Stores positive/negative ratings and type corrections
   - Full content storage for complete DSPy training
   
2. **`missing_content_feedback`**: User-identified content that was missed
   - Captures golden nuggets the AI failed to identify
   - Used to improve recall in optimization

3. **`optimization_runs`**: History of DSPy optimization attempts
   - Tracks expensive vs cheap optimization modes
   - Records performance improvements and execution time

4. **`optimized_prompts`**: Versioned optimized prompts from DSPy
   - Current and historical optimized prompts
   - Performance metrics and feedback integration

5. **`training_examples`**: DSPy training data derived from feedback
   - Converts user feedback into training examples
   - Used for both expensive and cheap optimization modes

## Chrome Extension Integration

### API Contract
The backend provides stable API endpoints that the Chrome extension depends on:

- `POST /feedback` - Submit user feedback (ratings, corrections, missing content)
- `GET /feedback/stats` - Get feedback statistics and optimization triggers
- `GET /optimize/current` - Retrieve current optimized prompt

### Data Flow
1. Chrome extension collects user feedback through UI interactions
2. Feedback is batched and sent to `POST /feedback` endpoint
3. Backend stores feedback and checks optimization thresholds
4. If thresholds met, background optimization is triggered
5. Chrome extension periodically checks `GET /optimize/current` for updated prompts

### Type Safety
Pydantic models in `app/models.py` match TypeScript interfaces in the Chrome extension to ensure type safety across the entire system.

## DSPy Optimization System

### Optimization Modes
- **Expensive Mode** (`MIPROv2`): High-quality optimization, 5-15 minutes execution time
- **Cheap Mode** (`BootstrapFewShotWithRandomSearch`): Fast optimization, 1-3 minutes execution time

### Automatic Triggers
Optimization is automatically triggered when:
1. **Time + Volume**: 7+ days since last optimization AND 25+ feedback items
2. **High Volume**: 75+ total feedback items
3. **Quality Issues**: 15+ feedback items with 40%+ recent negative rate

### Training Data Generation
User feedback is converted into DSPy training examples:
- Positive feedback creates positive training examples
- Negative feedback with corrections guides optimization
- Missing content feedback improves recall metrics

## API Endpoints

### Feedback Collection
- `POST /feedback` - Submit feedback from Chrome extension
  - Accepts both nugget feedback and missing content feedback
  - Triggers optimization if thresholds are met
  - Returns updated statistics

- `GET /feedback/stats` - Get current feedback statistics
  - Total feedback count and positive/negative rates
  - Days since last optimization
  - Optimization trigger status

- `GET /feedback/{feedback_id}` - Get detailed information about specific feedback item
  - Requires `feedback_type` query parameter ('nugget' or 'missing_content')
  - Returns complete feedback details including usage history
  - Returns 404 if feedback item not found

- `PUT /feedback/{feedback_id}` - Update existing feedback item
  - Requires `feedback_type` query parameter ('nugget' or 'missing_content')
  - Request body: `UpdateFeedbackRequest` with optional fields to update
  - Supports updating: `content`, `rating`, `corrected_type`, `suggested_type`
  - Returns updated field names and success confirmation
  - Returns 404 if feedback item not found
  - Returns 400 if no fields provided for update

- `DELETE /feedback/{feedback_id}` - Delete feedback item and associated usage records
  - Requires `feedback_type` query parameter ('nugget' or 'missing_content') 
  - Permanently removes feedback item and all usage history
  - Returns success confirmation
  - Returns 404 if feedback item not found

- `GET /feedback/pending` - Get pending (unprocessed) feedback items for dashboard queue
  - Supports pagination with limit/offset parameters
  - Filter by feedback_type ('nugget', 'missing_content', or 'all')
  - Returns feedback items that haven't been used in optimization yet

- `GET /feedback/recent` - Get recent feedback items with processing status
  - Configurable limit (default: 20)
  - Option to include/exclude processed items
  - Returns creation timestamps and processing status

- `GET /feedback/usage/stats` - Get statistics about feedback usage across optimizations
  - Shows how many times feedback items have been used in training
  - Usage patterns and effectiveness metrics

- `GET /feedback/duplicates` - Get analysis of duplicate feedback submissions
  - Identifies and analyzes duplicate content submissions
  - Shows report counts and similarity analysis
  - Helps identify frequently reported issues

### Prompt Optimization
- `POST /optimize` - Manually trigger optimization
  - Supports both expensive and cheap modes
  - Runs as background task
  - Returns estimated completion time

- `GET /optimization/history` - Get optimization run history
  - Past optimization attempts and results
  - Performance improvements over time
  - Supports filtering by limit, days, and mode

- `GET /optimize/current` - Get current optimized prompt
  - Latest optimized prompt if available
  - Performance metrics and version information

- `GET /optimization/{run_id}/progress` - Get detailed progress history for an optimization run
  - Step-by-step progress tracking for specific runs
  - Historical progress data with timestamps

- `GET /optimization/{run_id}/costs` - Get detailed cost breakdown for an optimization run
  - Token usage and API costs for specific optimization runs
  - Detailed cost analysis per optimization phase

### Monitoring and Observability
- `GET /` - Basic health check endpoint
- `GET /monitor/health` - Comprehensive system health check
  - System status (healthy/degraded/unhealthy)
  - Uptime tracking and component diagnostics
  - DSPy availability and Gemini API configuration status
  - Database accessibility verification
  - Active optimization count
- `GET /monitor` - Complete monitoring dashboard
  - Real-time active optimization runs with progress
  - Recent completion history (last 10 runs)
  - Comprehensive system health data
  - Structured data for monitoring integrations
- `GET /monitor/status/{run_id}` - Individual optimization run status
  - Real-time progress for active optimizations (step, progress %, message)
  - Historical data for completed/failed runs
  - Detailed error information and performance metrics
  - Source indication (active memory vs database)

### Cost Tracking and Analytics
- `GET /costs/summary` - Get cost summary over specified time period
  - Configurable time period (default: 30 days)
  - Total costs, token usage, and API call statistics
  - Cost breakdown by optimization type and phase

- `GET /costs/trends` - Get cost trends and projections
  - Historical cost trends over time
  - Usage pattern analysis and future projections
  - Cost optimization recommendations

### Dashboard and Analytics
- `GET /dashboard/stats` - Get comprehensive dashboard statistics
  - Aggregated statistics from dashboard_stats database view
  - Pending and processed feedback counts
  - Active and completed optimization counts
  - Monthly cost and token usage summaries

- `GET /activity/recent` - Get recent activity across all optimizations
  - Configurable limit (default: 10)
  - Cross-system activity feed showing recent optimization events
  - Progress updates and completion notifications

## Enhanced Logging and Progress Tracking

### Structured Logging Features
The backend now includes comprehensive structured logging with the following capabilities:

- **Emoji-Enhanced Logs**: Visual indicators for different types of events
  - 🚀 Optimization started
  - 📊 Data gathering phase
  - 🧠 DSPy optimization running
  - ✅ Successful completion
  - ❌ Error conditions

- **Structured Metadata**: All log entries include structured data for parsing:
  ```json
  {
    "run_id": "abc-123",
    "mode": "expensive", 
    "step": "optimization",
    "progress": 45,
    "timestamp": "2025-01-01T12:00:00Z"
  }
  ```

- **Real-time Progress Tracking**: In-memory progress storage for active optimizations
  - Step-by-step progress (initialization → data_gathering → optimization → storing → completed)
  - Percentage completion (0-100%, -1 for failed)
  - Descriptive messages for each phase
  - Automatic cleanup of old progress data

### Monitoring Usage Examples

**Check System Health:**
```bash
curl http://localhost:7532/monitor/health
# Returns: status, uptime, component health, active optimizations
```

**Monitor Active Optimizations:**
```bash
curl http://localhost:7532/monitor
# Returns: active runs, recent completions, system health
```

**Track Specific Optimization:**
```bash
curl http://localhost:7532/monitor/status/your-run-id
# Returns: real-time progress or historical data
```

**Test Monitoring (Development):**
```bash
cd backend
python test_monitoring.py
# Demonstrates logging and tests all monitoring endpoints
```

### Log Output Examples

**Console Output During Optimization:**
```
2025-01-01 12:00:00 - INFO - 🚀 Starting DSPy optimization
2025-01-01 12:00:05 - INFO - 📊 Gathering training examples (20%)  
2025-01-01 12:01:30 - INFO - 🧠 Running DSPy optimization (50%)
2025-01-01 12:05:45 - INFO - ✅ Optimization completed successfully
```

**API Response for Active Run:**
```json
{
  "success": true,
  "run_id": "abc-123",
  "progress": {
    "step": "optimization", 
    "progress": 75,
    "message": "🧠 Running DSPy optimization",
    "timestamp": "2025-01-01T12:03:00Z"
  },
  "source": "active"
}
```

## Development Best Practices

### Adding New Features
1. **Models First**: Define Pydantic models in `app/models.py`
2. **Database Schema**: Add tables/migrations in `app/database.py`
3. **Service Layer**: Implement business logic in appropriate service class
4. **API Endpoints**: Add FastAPI endpoints in `app/main.py`
5. **Testing**: Add tests in `tests/` directory

### Error Handling
- Use HTTPException for API errors with appropriate status codes
- Log errors for debugging but don't expose internal details
- Graceful degradation when DSPy is not available

### Performance Considerations
- DSPy optimization runs in background tasks to avoid blocking API
- ThreadPoolExecutor limits concurrent optimization attempts
- Database operations are async to handle concurrent requests

### Security Guidelines
- Validate all input with Pydantic models
- Limit stored content to prevent data bloat and privacy issues
- Use environment variables for sensitive configuration
- Proper CORS configuration for Chrome extension integration

## Environment Variables

- `GEMINI_API_KEY` - Required for DSPy optimization (same as Chrome extension)
- `PORT` - Server port (default: 7532)
- `DATABASE_PATH` - Custom database location (optional)
- `ENVIRONMENT` - development/production mode (optional)

## Troubleshooting

### Common Issues
1. **DSPy Import Error**: Install with `pip install dspy-ai`
2. **Gemini API Errors**: Verify API key and account credits
3. **CORS Issues**: Check server port and Chrome extension configuration
4. **Database Errors**: Verify write permissions in data directory

### Debugging
- Enable debug logging in `run.py` for development
- Check optimization service logs for DSPy execution issues
- Use FastAPI's automatic OpenAPI docs at `/docs` endpoint
- Monitor background task execution in server logs

### Monitoring and Observability Troubleshooting
1. **Optimization Progress Not Visible**: 
   - Check `/monitor/status/{run_id}` endpoint for real-time progress
   - Verify run_id matches what's returned from `/optimize` POST request
   - In-memory progress is cleaned up after completion

2. **System Health Issues**:
   - Use `/monitor/health` to diagnose component failures
   - Check DSPy availability: `dspy_available: false` → Install DSPy
   - Check Gemini configuration: `gemini_configured: false` → Set GEMINI_API_KEY
   - Check database access: `database_accessible: false` → Verify file permissions

3. **Missing Log Output**:
   - Ensure logging level is set to INFO or DEBUG
   - Check console output during optimization runs
   - Structured log data is in the `extra` field for log parsing tools

4. **Monitoring Dashboard Empty**:
   - No active runs: Start an optimization to see progress tracking
   - No recent completions: Historical data from `optimization_runs` table
   - Use `python test_monitoring.py` to generate sample data

## Integration with Main Extension

This backend integrates with the Chrome extension's feedback collection system:
- Feedback UI components send data to backend API
- Background script polls for optimized prompts
- Error handling maintains functionality even when backend is unavailable
- Gradual rollout of optimized prompts based on performance metrics