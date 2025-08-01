# Golden Nuggets Finder Backend

FastAPI backend for collecting user feedback and optimizing prompts using DSPy framework.

## Features

- **Feedback Collection**: REST API endpoints for collecting thumbs up/down ratings and type corrections
- **Missing Content Tracking**: API for user-identified golden nuggets that were missed
- **DSPy Optimization**: Automatic prompt optimization using MIPROv2 and BootstrapFewShotWithRandomSearch
- **Threshold-Based Triggers**: Smart optimization triggering based on feedback volume and quality
- **SQLite Storage**: Lightweight database for feedback and optimization history
- **Enhanced Logging**: Structured logging with emoji indicators and progress tracking
- **Monitoring & Observability**: Real-time optimization progress tracking and system health monitoring
- **Cost Tracking & Analytics**: Comprehensive API cost tracking and usage analytics across optimization runs
- **Feedback Management**: Full CRUD operations for feedback items with usage tracking and deduplication
- **Dashboard & Analytics**: Statistical dashboards with activity feeds and comprehensive system metrics
- **Database Migrations**: Schema versioning and migration system for database evolution
- **Progress Tracking Service**: Real-time in-memory progress tracking for active optimization runs

## Quick Start (Docker - Recommended)

1. **Set up environment variables:**
```bash
cd backend
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY (same as your Chrome extension uses)
```

2. **Run with Docker Compose:**
```bash
# Production deployment
docker-compose up -d backend

# Development with hot reload
docker-compose --profile dev up backend-dev

# With database backups (optional)
docker-compose --profile backup up -d backup
```

The server will start on `http://localhost:7532`.

## Docker Services

- **`backend`**: Production server with optimized build
- **`backend-dev`**: Development server with hot reload and source mounting  
- **`backup`**: Automatic daily database backups (optional, keeps 7 days)

## Alternative: Local Development Setup

For development without Docker:

1. **Create virtual environment:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
```

2. **Install dependencies:**
```bash
pip install -r requirements.txt
```

3. **Set up environment:**
```bash
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
```

4. **Run server:**
```bash
# Development (auto-reload)
python run.py

# Production mode
python run.py --prod

# Custom port
python run.py --port 8000
```

## API Endpoints

### Health Check
- `GET /` - Basic server health check

### Feedback Collection
- `POST /feedback` - Submit feedback from Chrome extension
- `GET /feedback/stats` - Get feedback statistics and optimization status
- `GET /feedback/{feedback_id}` - Get detailed information about specific feedback item
- `PUT /feedback/{feedback_id}` - Update existing feedback item (content, rating, corrections)
- `DELETE /feedback/{feedback_id}` - Delete feedback item and associated usage records
- `GET /feedback/pending` - Get pending (unprocessed) feedback items for dashboard queue
- `GET /feedback/recent` - Get recent feedback items with processing status
- `GET /feedback/usage/stats` - Get statistics about feedback usage across optimizations
- `GET /feedback/duplicates` - Get analysis of duplicate feedback submissions

### Prompt Optimization  
- `POST /optimize` - Manually trigger prompt optimization
- `GET /optimization/history` - Get optimization run history
- `GET /optimize/current` - Get current optimized prompt
- `GET /optimization/{run_id}/progress` - Get detailed progress history for an optimization run
- `GET /optimization/{run_id}/costs` - Get detailed cost breakdown for an optimization run

### Monitoring & Observability
- `GET /monitor/health` - Comprehensive system health check with component status
- `GET /monitor` - Complete monitoring dashboard with active runs and recent completions
- `GET /monitor/status/{run_id}` - Real-time progress tracking for specific optimization runs

### Cost Tracking and Analytics
- `GET /costs/summary` - Get cost summary over specified time period
- `GET /costs/trends` - Get cost trends and projections

### Dashboard and Analytics
- `GET /dashboard/stats` - Get comprehensive dashboard statistics
- `GET /activity/recent` - Get recent activity across all optimizations

## Optimization Thresholds

The system automatically triggers optimization when:

1. **Time + Volume**: 7+ days since last optimization AND 25+ feedback items
2. **High Volume**: 75+ total feedback items  
3. **Quality Issues**: 15+ feedback items with 40%+ recent negative rate

## Optimization Modes

- **Expensive** (`MIPROv2`): High-quality optimization, takes 5-15 minutes
- **Cheap** (`BootstrapFewShotWithRandomSearch`): Fast optimization, takes 1-3 minutes

## Database Schema

The system uses SQLite with these main tables:

- `nugget_feedback`: User ratings and type corrections for golden nuggets with full content storage
- `missing_content_feedback`: User-identified missed content for improving recall
- `optimization_runs`: History of optimization attempts with performance metrics
- `optimized_prompts`: Versioned optimized prompts with performance data
- `training_examples`: DSPy training data derived from feedback
- `feedback_usage`: Tracking of feedback items used in optimization runs
- `cost_tracking`: API costs and token usage for optimization runs
- `dashboard_stats`: Aggregated statistics view for dashboard analytics

See `DATABASE_SCHEMA.md` for detailed schema documentation.

## Monitoring Usage

### Real-time Optimization Tracking

Monitor optimization progress in real-time:

```bash
# Check system health
curl http://localhost:7532/monitor/health

# View monitoring dashboard  
curl http://localhost:7532/monitor

# Track specific optimization run
curl http://localhost:7532/monitor/status/your-run-id
```

### Enhanced Logging

The backend provides structured logging with visual indicators:

```
🚀 Starting DSPy optimization (mode: expensive, run_id: abc-123)
📊 Gathering training examples (20%)
🧠 Running DSPy optimization (75%) 
✅ Optimization completed successfully (improvement: 12.5%)
```

### Testing Monitoring Features

Use the included test script to demonstrate monitoring capabilities:

```bash
cd backend
FORCE_TEST_DB=1 python3 tests/manual/test_monitoring.py
```

This script:
- Demonstrates structured logging with progress tracking
- Tests all monitoring API endpoints
- Shows example monitoring dashboard responses
- Validates system health checks

## Chrome Extension Integration

The backend is designed to work with the Golden Nuggets Finder Chrome extension. The extension sends feedback data to:

- `POST /feedback` for user ratings and corrections
- `GET /feedback/stats` to check if optimization should be triggered
- `GET /optimize/current` to get the latest optimized prompt

## Development

### Running Tests

The backend has three types of tests with different database isolation requirements:

#### Automated Tests (Recommended)
```bash
# Run integration and unit tests with automatic database isolation
pytest tests/integration tests/unit

# Run all tests except manual ones
pytest tests/ --ignore=tests/manual/

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

The database is automatically initialized on first startup. SQLite file is created at `data/feedback.db`.

### Adding New Features
1. **Models First**: Define Pydantic models in `app/models.py`
2. **Database Schema**: Add tables/migrations in `app/database.py`
3. **Service Layer**: Implement business logic in appropriate service class
4. **API Endpoints**: Add FastAPI endpoints in `app/main.py`
5. **Testing**: Add tests in `tests/` directory

## Environment Variables

- `GEMINI_API_KEY`: Required for DSPy optimization (use same key as Chrome extension) 
- `PORT`: Server port (default: 7532)
- `DATABASE_PATH`: Custom database location (optional)
- `ENVIRONMENT`: development/production (optional)

## Troubleshooting

### Common Issues

1. **"DSPy not available" error**
   - Install DSPy: `pip install dspy-ai`

2. **Gemini API errors**  
   - Verify your `GEMINI_API_KEY` is valid (same key as your Chrome extension)
   - Check you have access to Gemini API and have sufficient credits

3. **Database errors**
   - Ensure write permissions in the data directory
   - Check SQLite is properly installed

4. **Chrome extension CORS errors**
   - Verify the backend is running on the expected port (7532)
   - Check Chrome extension's API URL configuration

5. **Monitoring endpoints not working**
   - Check server is running: `curl http://localhost:7532/monitor/health`
   - Use the test script: `python test_monitoring.py`
   - Check logs for structured output during optimization runs

6. **Optimization progress not visible**
   - Progress is tracked in memory during active runs only
   - Use `/monitor/status/{run_id}` with the run_id from `/optimize` response
   - Completed runs show historical data from database

## Architecture

```
backend/
├── app/
│   ├── main.py                      # FastAPI application and routes
│   ├── models.py                    # Pydantic models for validation  
│   ├── database.py                  # SQLite connection and queries
│   ├── database_migrations.py       # Database migration system
│   └── services/
│       ├── feedback_service.py              # Feedback storage and analysis
│       ├── optimization_service.py          # DSPy optimization logic
│       ├── cost_tracking_service.py         # Cost tracking and analytics
│       ├── improved_cost_tracking_service.py # Enhanced cost tracking
│       ├── progress_tracking_service.py     # Real-time progress tracking
│       └── dspy_config.py                   # DSPy framework configuration
├── data/                            # SQLite database (auto-created)
├── migrations/                      # SQL migration files
├── tests/
│   ├── integration/                 # API endpoint tests
│   ├── unit/                        # Service layer tests
│   └── manual/                      # Development and debugging scripts
├── scripts/                         # Database management utilities
├── Dockerfile / Dockerfile.dev      # Docker containerization
├── docker-compose.yml               # Multi-service orchestration
├── pyproject.toml                   # Python project configuration
└── run.py                           # Startup script
```

### Additional Documentation
- `DATABASE_SCHEMA.md` - Detailed database schema documentation
- `DEPLOYMENT.md` - Production deployment guidelines
- `DOCKER.md` - Docker setup and containerization guide
- `MONITORING_GUIDE.md` - Comprehensive monitoring and observability documentation