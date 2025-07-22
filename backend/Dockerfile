# Golden Nuggets Finder Backend Dockerfile
# Multi-stage build for production optimization

# Build stage
FROM python:3.11-slim as builder

WORKDIR /app

# Install system dependencies for building
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --user -r requirements.txt

# Production stage
FROM python:3.11-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    sqlite3 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy Python packages from builder stage
COPY --from=builder /root/.local /root/.local

# Add local packages to PATH
ENV PATH=/root/.local/bin:$PATH

# Create app user for security
RUN useradd --create-home --shell /bin/bash app

# Create directories
RUN mkdir -p /app/data /app/logs && \
    chown -R app:app /app

# Copy application code
COPY --chown=app:app . .

# Switch to app user
USER app

# Create data directory for SQLite database
RUN mkdir -p data

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT:-7532}/ || exit 1

# Expose port
EXPOSE 7532

# Default command
CMD ["python", "run.py", "--prod"]