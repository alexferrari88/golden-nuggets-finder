# Golden Nuggets Finder - Backend Deployment Guide

Complete deployment guide for the Golden Nuggets Finder feedback system backend.

## System Overview

The backend is a FastAPI application that provides:

- **Feedback Collection API**: Receives user ratings and corrections from Chrome extension
- **DSPy Optimization**: Automatic prompt optimization based on user feedback  
- **SQLite Database**: Stores feedback data and optimization history
- **Threshold-Based Triggers**: Smart optimization triggering based on feedback volume and quality
- **Docker Support**: Containerized deployment for easy management

## Architecture

```
Chrome Extension → FastAPI Backend → SQLite Database
                      ↓
                 DSPy Optimization
                      ↓  
               Optimized Prompts
```

### Key Components

1. **API Layer** (`app/main.py`): FastAPI routes and request handling
2. **Services Layer**: 
   - `FeedbackService`: Manages feedback data and statistics
   - `OptimizationService`: Handles DSPy optimization pipeline
3. **Database Layer** (`app/database.py`): SQLite with migration system
4. **Configuration** (`app/services/dspy_config.py`): DSPy setup and utilities

## Quick Start

### 1. Prerequisites

- Docker and Docker Compose
- Google Gemini API key (same as your Chrome extension uses)
- Chrome extension configured to use backend

### 2. Environment Setup

```bash
cd backend

# Copy environment template
cp .env.example .env

# Edit .env and add your Gemini API key (same as Chrome extension)
# GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Start Backend

**Development Mode:**
```bash
./scripts/docker_management.sh start-dev
```

**Production Mode:**
```bash
export GEMINI_API_KEY="your_key_here"
./scripts/docker_management.sh start-prod
```

### 4. Verify Installation

```bash
# Check health
./scripts/docker_management.sh health

# View feedback stats
curl http://localhost:7532/feedback/stats

# Check logs
./scripts/docker_management.sh logs
```

## Deployment Options

### Option 1: Docker Compose (Recommended)

**Development:**
- Hot reload enabled
- Source code mounted as volume
- Easy debugging

**Production:**
- Optimized build
- Health checks
- Automatic restarts
- Data persistence

### Option 2: Manual Installation

```bash
# Install dependencies
pip install -r requirements.txt

# Set up database
python app/database_migrations.py migrate

# Start server
python run.py --prod
```

## Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `GEMINI_API_KEY` | Google Gemini API key for DSPy optimization | Yes | - |
| `PORT` | Server port | No | 7532 |
| `ENVIRONMENT` | Environment mode | No | production |

### Optimization Thresholds

The system automatically triggers optimization when:

1. **Time + Volume**: 7+ days since last optimization AND 25+ feedback items
2. **High Volume**: 75+ total feedback items  
3. **Quality Issues**: 15+ feedback items with 40%+ recent negative rate

### Optimization Modes

- **Cheap** (`BootstrapFewShotWithRandomSearch`): Fast optimization, 1-3 minutes
- **Expensive** (`MIPROv2`): High-quality optimization, 5-15 minutes

## Database Management

### Schema

The system uses SQLite with these main tables:

- `nugget_feedback`: User ratings and type corrections
- `missing_content_feedback`: User-identified missed content  
- `optimization_runs`: Optimization execution history
- `optimized_prompts`: Versioned optimized prompts
- `training_examples`: DSPy training data

### Management Commands

```bash
# Show database statistics
./scripts/docker_management.sh db stats

# View recent feedback
./scripts/docker_management.sh db feedback 20

# Export data
./scripts/docker_management.sh db export backup_$(date +%Y%m%d).csv

# Clean up old data (90+ days)
./scripts/docker_management.sh db cleanup 90
```

### Backup and Recovery

**Automatic Backups:**
```bash
# Enable daily automatic backups
./scripts/docker_management.sh enable-backups
```

**Manual Backup:**
```bash
# Create backup
./scripts/docker_management.sh backup

# Restore from backup
./scripts/docker_management.sh restore-db ./backups/feedback_backup_20240101_120000.db
```

## API Endpoints

### Feedback Collection

- `POST /feedback` - Submit feedback from Chrome extension
- `GET /feedback/stats` - Get feedback statistics and optimization status

### Prompt Optimization

- `POST /optimize` - Manually trigger optimization
- `GET /optimize/history` - Get optimization run history
- `GET /optimize/current` - Get current optimized prompt

### System

- `GET /` - Health check endpoint

## Testing

### Unit Tests

```bash
# Run all tests
docker-compose exec backend pytest

# Run specific test file
docker-compose exec backend pytest tests/test_optimization.py

# Run with coverage
docker-compose exec backend pytest --cov=app
```

### DSPy Optimization Tests

```bash
# Test DSPy environment
python scripts/test_optimization.py test-env

# Generate test data and run optimization
python scripts/test_optimization.py full-test

# Benchmark optimization performance
python scripts/test_optimization.py benchmark
```

## Monitoring

### Health Checks

```bash
# Check backend health
./scripts/docker_management.sh health

# View service status
./scripts/docker_management.sh status
```

### Logs

```bash
# Real-time logs
./scripts/docker_management.sh logs

# Database management logs  
./scripts/docker_management.sh logs | grep "database"

# Optimization logs
./scripts/docker_management.sh logs | grep "optimization"
```

### Performance Monitoring

- Memory usage: Monitor Docker container stats
- Database size: Check SQLite file growth
- Optimization success rate: Review `/optimize/history`
- API response times: Monitor endpoint performance

## Chrome Extension Integration

### Configuration

The Chrome extension should be configured to use:

- **Backend URL**: `http://localhost:7532` (development) or your production URL
- **Feedback Endpoint**: `POST /feedback`
- **Stats Endpoint**: `GET /feedback/stats`
- **Current Prompt**: `GET /optimize/current`

### Data Flow

1. **User provides feedback** → Chrome extension sends to `POST /feedback`
2. **Threshold check** → Backend checks if optimization should trigger
3. **Auto optimization** → If thresholds met, DSPy optimization runs in background
4. **Prompt update** → Extension fetches new prompt from `GET /optimize/current`

## Troubleshooting

### Common Issues

**Backend won't start:**
- Check `GEMINI_API_KEY` is set
- Verify port 7532 is available
- Check Docker logs: `./scripts/docker_management.sh logs`

**Optimization fails:**
- Verify Gemini API key is valid and has credits
- Check DSPy environment: `python scripts/test_optimization.py test-env`
- Review optimization logs for errors

**Database issues:**
- Run migrations: `python app/database_migrations.py migrate`
- Check database permissions
- Verify SQLite is accessible

**Chrome extension can't connect:**
- Verify backend is running: `curl http://localhost:7532/`
- Check CORS configuration in `app/main.py`
- Ensure extension is using correct backend URL

### Debug Mode

```bash
# Run backend in debug mode
./scripts/docker_management.sh start-dev

# Access container shell
docker-compose exec backend-dev bash

# Run manual tests
python scripts/test_optimization.py test-env
```

## Production Deployment

### Security Checklist

- [ ] Use HTTPS with reverse proxy (nginx/Apache)
- [ ] Set up firewall rules
- [ ] Secure API key storage (environment variables/secrets)
- [ ] Enable access logging
- [ ] Set up monitoring and alerting
- [ ] Configure automatic backups
- [ ] Test recovery procedures

### Performance Optimization

- [ ] Use multiple workers: `python run.py --prod --workers 4`
- [ ] Set up load balancing if needed
- [ ] Monitor resource usage
- [ ] Configure log rotation
- [ ] Set up database maintenance cron jobs

### Monitoring and Alerting

- [ ] Set up health check monitoring
- [ ] Monitor optimization success rate
- [ ] Alert on high error rates
- [ ] Track database growth
- [ ] Monitor API response times

## Support

### Getting Help

1. Check logs: `./scripts/docker_management.sh logs`
2. Verify configuration: `./scripts/docker_management.sh health`
3. Test DSPy environment: `python scripts/test_optimization.py test-env`
4. Review database stats: `./scripts/docker_management.sh db stats`

### Common Commands

```bash
# Start development environment
./scripts/docker_management.sh start-dev

# Create database backup
./scripts/docker_management.sh backup

# View optimization history
./scripts/docker_management.sh db optimizations

# Clean up old data
./scripts/docker_management.sh db cleanup 60

# Update backend
git pull && ./scripts/docker_management.sh build
```

### Files and Directories

- `app/`: FastAPI application code
- `migrations/`: Database migration files
- `scripts/`: Management and testing scripts
- `tests/`: Unit and integration tests
- `data/`: SQLite database (created on first run)
- `logs/`: Application logs (if enabled)
- `backups/`: Database backups

The backend is now fully configured and ready for deployment! 🚀