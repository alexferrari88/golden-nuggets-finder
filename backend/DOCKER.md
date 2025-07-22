# Docker Deployment Guide

This guide covers Docker deployment options for the Golden Nuggets Finder backend.

## Quick Start

### Development Mode

1. **Set up environment variables:**
```bash
# Create .env file
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
```

2. **Run in development mode:**
```bash
docker-compose --profile dev up backend-dev
```

This starts the backend with:
- Hot reload enabled
- Source code mounted as volume  
- Development dependencies installed
- Port 7532 exposed

### Production Mode

1. **Set up environment variables:**
```bash
# Set environment variables
export GEMINI_API_KEY="your_gemini_api_key_here"
```

2. **Run in production mode:**
```bash
docker-compose up backend
```

This starts the backend with:
- Optimized production build
- Health checks enabled
- Data persistence
- Automatic restart on failure

## Deployment Options

### Option 1: Docker Compose (Recommended)

**Development:**
```bash
# Start development environment
docker-compose --profile dev up -d

# View logs
docker-compose logs -f backend-dev

# Stop
docker-compose --profile dev down
```

**Production:**
```bash
# Start production environment
docker-compose up -d

# Enable backups
docker-compose --profile backup up -d

# View logs
docker-compose logs -f backend

# Stop
docker-compose down
```

### Option 2: Direct Docker Commands

**Build the image:**
```bash
docker build -t golden-nuggets-backend .
```

**Run the container:**
```bash
docker run -d \
  --name golden-nuggets-backend \
  -p 7532:7532 \
  -e GEMINI_API_KEY="your_key_here" \
  -v golden_nuggets_data:/app/data \
  --restart unless-stopped \
  golden-nuggets-backend
```

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `GEMINI_API_KEY` | Google Gemini API key for DSPy optimization | Yes | - |
| `PORT` | Server port | No | 7532 |
| `ENVIRONMENT` | Environment mode | No | production |

## Data Persistence

The backend uses SQLite for data storage. To persist data across container restarts:

**Using Docker Compose (automatic):**
- Data is stored in the `backend_data` named volume
- Database file: `/app/data/feedback.db`

**Using Docker directly:**
```bash
# Create volume
docker volume create golden_nuggets_data

# Run with volume mounted
docker run -v golden_nuggets_data:/app/data golden-nuggets-backend
```

## Health Checks

The containers include health checks that monitor:
- HTTP endpoint availability (`GET /`)
- Response time (10s timeout)
- Automatic restart on failure

Check health status:
```bash
# Using Docker Compose
docker-compose ps

# Using Docker directly  
docker ps --format "table {{.Names}}\t{{.Status}}"
```

## Backup and Recovery

### Automatic Backups

Enable automatic daily backups:
```bash
# Start backup service
docker-compose --profile backup up -d backup

# Backup location
ls ./backups/
```

### Manual Backup

```bash
# Create backup directory
mkdir -p backups

# Backup database
docker-compose exec backend sqlite3 /app/data/feedback.db ".backup /app/data/manual_backup_$(date +%Y%m%d_%H%M%S).db"

# Copy to host
docker cp $(docker-compose ps -q backend):/app/data/manual_backup_*.db ./backups/
```

### Recovery

```bash
# Stop backend
docker-compose stop backend

# Copy backup to container
docker cp ./backups/feedback_backup_20240101_120000.db $(docker-compose ps -q backend):/app/data/feedback.db

# Start backend
docker-compose start backend
```

## Monitoring

### Logs

```bash
# Real-time logs
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend

# Logs with timestamps
docker-compose logs -t backend
```

### Metrics

Access built-in monitoring:
- Health check: `http://localhost:7532/`
- Feedback stats: `http://localhost:7532/feedback/stats`
- Optimization history: `http://localhost:7532/optimize/history`

### Container Stats

```bash
# Resource usage
docker stats $(docker-compose ps -q backend)

# Disk usage
docker system df
```

## Troubleshooting

### Common Issues

**1. Container won't start**
```bash
# Check logs
docker-compose logs backend

# Common causes:
# - Missing GEMINI_API_KEY
# - Port 7532 already in use
# - Permission issues with data volume
```

**2. Database issues**
```bash
# Access database directly
docker-compose exec backend sqlite3 /app/data/feedback.db

# Run migrations manually
docker-compose exec backend python app/database_migrations.py migrate
```

**3. Permission errors**
```bash
# Fix volume permissions
docker-compose exec backend chown -R app:app /app/data
```

**4. Network connectivity**
```bash
# Test from inside container
docker-compose exec backend curl -f http://localhost:7532/

# Test external access
curl http://localhost:7532/
```

### Debug Mode

Run container in debug mode:
```bash
# Override command
docker-compose run --rm backend-dev bash

# Inside container
python run.py --host 0.0.0.0 --port 7532
```

## Scaling and Load Balancing

### Multiple Workers

For production with higher load:

```yaml
# docker-compose.override.yml
version: '3.8'
services:
  backend:
    command: ["python", "run.py", "--prod", "--workers", "4"]
```

### Load Balancer

Use nginx or similar:

```nginx
# nginx.conf
upstream backend {
    server localhost:7532;
    server localhost:7533;
}

server {
    listen 80;
    location / {
        proxy_pass http://backend;
    }
}
```

## Updates and Maintenance

### Update Application

```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose build backend
docker-compose up -d backend
```

### Update Dependencies

```bash
# Update requirements.txt
# Then rebuild
docker-compose build --no-cache backend
docker-compose up -d backend
```

### Database Maintenance

```bash
# Run database cleanup
docker-compose exec backend python scripts/db_management.py cleanup 30

# Export data
docker-compose exec backend python scripts/db_management.py export backup_$(date +%Y%m%d).csv
```

## Security Considerations

1. **API Keys**: Never include API keys in the Docker image. Use environment variables or secrets.

2. **Network Security**: The backend runs on localhost by default. For production:
   - Use reverse proxy (nginx)
   - Enable HTTPS
   - Restrict access to necessary IPs

3. **Container Security**:
   - Runs as non-root user (`app`)
   - Minimal base image (python:3.11-slim)
   - No unnecessary packages

4. **Data Security**:
   - Database files are stored in Docker volumes
   - Regular backups recommended
   - No sensitive data in logs

## Production Deployment Checklist

- [ ] Set GEMINI_API_KEY environment variable
- [ ] Configure reverse proxy with HTTPS
- [ ] Set up monitoring and alerting
- [ ] Configure automatic backups
- [ ] Test recovery procedures
- [ ] Monitor resource usage
- [ ] Set up log rotation
- [ ] Review security settings
- [ ] Document maintenance procedures
- [ ] Test optimization pipeline with real data

## Support

For issues with Docker deployment:

1. Check logs: `docker-compose logs backend`
2. Verify environment variables
3. Test database connectivity
4. Check disk space and permissions
5. Review Docker and Docker Compose versions