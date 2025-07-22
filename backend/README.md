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

### Prompt Optimization  
- `POST /optimize` - Manually trigger prompt optimization
- `GET /optimize/history` - Get optimization run history
- `GET /optimize/current` - Get current optimized prompt

### Monitoring & Observability
- `GET /monitor/health` - Comprehensive system health check with component status
- `GET /monitor` - Complete monitoring dashboard with active runs and recent completions
- `GET /monitor/status/{run_id}` - Real-time progress tracking for specific optimization runs

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

- `nugget_feedback`: User ratings and type corrections
- `missing_content_feedback`: User-identified missed content
- `optimization_runs`: History of optimization attempts
- `optimized_prompts`: Versioned optimized prompts
- `training_examples`: DSPy training data from feedback

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
python test_monitoring.py
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
```bash
pytest tests/
```

### Database Management
The database is automatically initialized on first startup. SQLite file is created at `data/feedback.db`.

### Adding New Features
1. Add models in `app/models.py`
2. Add database operations in `app/database.py` 
3. Add business logic in `app/services/`
4. Add API endpoints in `app/main.py`

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
│   ├── main.py              # FastAPI application and routes
│   ├── models.py            # Pydantic models for validation  
│   ├── database.py          # SQLite connection and queries
│   └── services/
│       ├── feedback_service.py    # Feedback storage and analysis
│       └── optimization_service.py # DSPy optimization logic
├── data/                    # SQLite database (auto-created)
├── tests/                   # Test files
└── run.py                   # Startup script
```