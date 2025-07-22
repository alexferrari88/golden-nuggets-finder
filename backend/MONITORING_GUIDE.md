# Monitoring & Observability Guide

This guide demonstrates how to use the monitoring and logging features in the Golden Nuggets Finder backend.

## Overview

The backend now provides comprehensive monitoring capabilities:

- **Enhanced Logging**: Structured logs with emoji indicators and detailed metadata
- **Real-time Progress Tracking**: Live progress updates for optimization runs  
- **System Health Monitoring**: Component status and diagnostics
- **Complete Monitoring Dashboard**: Unified view of active runs and system health

## Quick Start

### 1. Basic Health Check

Check if the system is running and healthy:

```bash
curl http://localhost:7532/monitor/health
```

**Response:**
```json
{
  "status": "healthy",
  "uptime_seconds": 3600.5,
  "active_optimizations": 1,
  "dspy_available": true,
  "gemini_configured": true,
  "database_accessible": true,
  "details": {
    "startup_time": "2025-01-01T12:00:00Z",
    "gemini_key_length": 39
  }
}
```

### 2. Start an Optimization (to see monitoring in action)

```bash
curl -X POST http://localhost:7532/optimize \
  -H "Content-Type: application/json" \
  -d '{"mode": "cheap"}'
```

**Response:**
```json
{
  "success": true,
  "message": "Optimization started in cheap mode",
  "estimatedTime": "1-3 minutes"
}
```

### 3. Monitor Active Optimizations

```bash
curl http://localhost:7532/monitor
```

**Response:**
```json
{
  "active_runs": {
    "abc-123": {
      "step": "optimization",
      "progress": 65,
      "message": "🧠 Running DSPy optimization",
      "timestamp": "2025-01-01T12:05:30Z",
      "last_updated": "2025-01-01T12:05:30Z"
    }
  },
  "recent_completions": [],
  "system_health": {
    "status": "healthy",
    "uptime_seconds": 3600.5,
    "active_optimizations": 1,
    "dspy_available": true,
    "gemini_configured": true,
    "database_accessible": true
  }
}
```

## Detailed Usage Examples

### Tracking a Specific Optimization Run

When you start an optimization, you'll get a `run_id` in the logs or can track via the monitoring dashboard. Use this to get detailed progress:

```bash
# Get the run_id from the optimization logs or monitoring dashboard
curl http://localhost:7532/monitor/status/abc-123
```

**Response (Active Run):**
```json
{
  "success": true,
  "run_id": "abc-123",
  "progress": {
    "step": "optimization",
    "progress": 75,
    "message": "🧠 Running DSPy optimization",
    "timestamp": "2025-01-01T12:05:45Z",
    "last_updated": "2025-01-01T12:05:45Z"
  },
  "source": "active"
}
```

**Response (Completed Run):**
```json
{
  "success": true,
  "run_id": "abc-123",
  "status": "completed",
  "started_at": "2025-01-01T12:00:00Z",
  "completed_at": "2025-01-01T12:05:50Z",
  "error_message": null,
  "performance_improvement": 0.125,
  "source": "database"
}
```

### System Health Diagnostics

The health endpoint provides detailed diagnostics for troubleshooting:

```bash
curl http://localhost:7532/monitor/health
```

**Healthy System:**
```json
{
  "status": "healthy",
  "uptime_seconds": 3600.5,
  "active_optimizations": 0,
  "dspy_available": true,
  "gemini_configured": true,
  "database_accessible": true,
  "details": {
    "startup_time": "2025-01-01T12:00:00Z",
    "gemini_key_length": 39
  }
}
```

**Degraded System (missing DSPy):**
```json
{
  "status": "degraded", 
  "uptime_seconds": 120.3,
  "active_optimizations": 0,
  "dspy_available": false,
  "gemini_configured": true,
  "database_accessible": true,
  "details": {
    "startup_time": "2025-01-01T12:00:00Z",
    "gemini_key_length": 39
  }
}
```

## Enhanced Logging Examples

### Console Output During Optimization

When running the backend, you'll see structured logging like this:

```
2025-01-01 12:00:00,123 - app.services.optimization_service - INFO - 🚀 Starting DSPy optimization
2025-01-01 12:00:05,456 - app.services.optimization_service - INFO - 📊 Gathering training examples (20%)
2025-01-01 12:00:15,789 - app.services.optimization_service - INFO - 📈 Training examples collected (30%)
2025-01-01 12:01:30,012 - app.services.optimization_service - INFO - 🧠 Running DSPy optimization (50%)
2025-01-01 12:03:45,345 - app.services.optimization_service - INFO - 📈 Evaluating performance (95%)
2025-01-01 12:04:00,678 - app.services.optimization_service - INFO - ✅ Optimization completed successfully
```

### Structured Log Data

Each log entry includes structured metadata in the `extra` field for programmatic parsing:

```json
{
  "timestamp": "2025-01-01T12:01:30.012Z",
  "level": "INFO", 
  "logger": "app.services.optimization_service",
  "message": "🧠 Running DSPy optimization (50%)",
  "extra": {
    "run_id": "abc-123",
    "step": "optimization",
    "progress": 50,
    "mode": "cheap"
  }
}
```

## Optimization Progress Phases

The optimization tracking follows these phases:

1. **initialization** (10%): Setting up optimization environment
2. **data_gathering** (20%): Collecting training examples from feedback  
3. **optimization** (30-80%): Running DSPy optimization algorithms
4. **storing** (90%): Storing optimized prompt and results
5. **completed** (100%): Optimization finished successfully

Or **failed** (-1%): Optimization encountered an error

## Testing and Development

### Use the Test Script

Run the comprehensive monitoring test:

```bash
cd backend
python test_monitoring.py
```

This script will:
- Demonstrate structured logging with live progress updates
- Test all monitoring API endpoints
- Show example responses for each endpoint
- Validate system health checks

### Manual Testing with curl

```bash
# Test all monitoring endpoints
curl http://localhost:7532/monitor/health
curl http://localhost:7532/monitor  
curl http://localhost:7532/monitor/status/test-run-123

# Start an optimization to generate monitoring data
curl -X POST http://localhost:7532/optimize \
  -H "Content-Type: application/json" \
  -d '{"mode": "cheap"}'

# Monitor the optimization in real-time
watch -n 2 'curl -s http://localhost:7532/monitor | jq'
```

## Integration with Monitoring Tools

### Log Parsing

The structured logs can be parsed by log aggregation tools:

```python
import json
import logging

# Set up structured logging handler
class StructuredHandler(logging.Handler):
    def emit(self, record):
        log_data = {
            'timestamp': record.created,
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'extra': getattr(record, 'extra', {})
        }
        print(json.dumps(log_data))
```

### Health Check Monitoring

Set up automated health checks:

```bash
#!/bin/bash
# health-check.sh - Monitor backend health

BACKEND_URL="http://localhost:7532"

health_status=$(curl -s "$BACKEND_URL/monitor/health" | jq -r '.status')

case $health_status in
  "healthy")
    echo "✅ Backend is healthy"
    exit 0
    ;;
  "degraded")
    echo "⚠️  Backend is degraded"
    exit 1
    ;;
  "unhealthy")
    echo "❌ Backend is unhealthy" 
    exit 2
    ;;
  *)
    echo "🚨 Backend not responding"
    exit 3
    ;;
esac
```

## Troubleshooting

### Common Monitoring Issues

**Problem**: Monitoring endpoints return 404
```bash
# Solution: Verify server is running and endpoints exist
curl http://localhost:7532/monitor/health
```

**Problem**: No progress data for optimization run  
```bash
# Solution: Ensure you're using the correct run_id
# Check active runs first:
curl http://localhost:7532/monitor | jq '.active_runs'
```

**Problem**: System health shows "degraded"
```bash
# Solution: Check the health response for specific issues
curl http://localhost:7532/monitor/health | jq '.details'
# Install missing components (DSPy) or configure API keys
```

**Problem**: No structured logs visible
```bash
# Solution: Ensure log level is set to INFO or DEBUG in run.py
# Check console output during optimization runs
```

### Performance Considerations

- In-memory progress tracking uses minimal memory (< 1KB per active run)
- Progress data is automatically cleaned up after 24 hours
- Health checks are lightweight (< 10ms response time)
- Monitoring dashboard queries are optimized with limits (last 10 completions)

## Advanced Usage

### Custom Monitoring Dashboards

You can build custom dashboards using the monitoring API:

```javascript
// Example: Simple web dashboard
async function fetchMonitoringData() {
  const response = await fetch('http://localhost:7532/monitor');
  const data = await response.json();
  
  // Update dashboard with active runs
  data.active_runs.forEach((run, runId) => {
    updateProgressBar(runId, run.progress, run.message);
  });
  
  // Update system status
  updateSystemStatus(data.system_health.status);
}

// Poll every 2 seconds during optimization
setInterval(fetchMonitoringData, 2000);
```

### Integration with External Tools

The monitoring endpoints can be integrated with external monitoring tools:

- **Prometheus**: Scrape health metrics from `/monitor/health`
- **Grafana**: Create dashboards using the monitoring API
- **Alerting**: Set up alerts based on system health status
- **CI/CD**: Use health checks in deployment pipelines

This comprehensive monitoring system provides full visibility into your DSPy optimization processes while maintaining simplicity and performance.