# Golden Nuggets Finder - Justfile
# Development and deployment commands for the Golden Nuggets Finder project

# Default command - show available recipes
default:
    @just --list

# ============================================================================
# EXTENSION DEVELOPMENT
# ============================================================================

# Clean and start extension development server
dev:
    pnpm clean && pnpm dev

# Clean and build extension for production
build:
    pnpm clean && pnpm build

# Clean build artifacts
clean:
    pnpm clean

# Build extension for Firefox
build-firefox:
    pnpm clean && pnpm build:firefox

# Package extension as zip
package:
    pnpm package

# ============================================================================
# DOCKER COMPOSE - BACKEND ONLY
# ============================================================================

# Start backend services for development (backend-dev profile)
up-backend:
    cd backend && docker-compose --profile dev up -d

# Stop backend services
down-backend:
    cd backend && docker-compose --profile dev down

# View backend logs
logs-backend:
    cd backend && docker-compose --profile dev logs -f

# Restart backend services
restart-backend:
    cd backend && docker-compose --profile dev restart

# ============================================================================
# DOCKER COMPOSE - WITH FRONTEND
# ============================================================================

# Start all services including frontend (backend + frontend)
up-all:
    cd backend && docker-compose --profile dev up -d backend-dev && cd ../frontend && pnpm dev

# Stop all services including frontend
down-all:
    cd backend && docker-compose --profile dev down
    @echo "Frontend dev server stopped manually if running"

# ============================================================================
# DOCKER COMPOSE - COMPLETE TEARDOWN
# ============================================================================

# Completely bring down all docker compose services
down-complete:
    cd backend && docker-compose --profile dev --profile backup down

# Completely bring down all services and remove volumes
down-complete-volumes:
    cd backend && docker-compose --profile dev --profile backup down -v

# ============================================================================
# DOCKER COMPOSE - REBUILD SERVICES
# ============================================================================

# Rebuild and start backend services (no cache, rebuild containers)
rebuild-backend:
    cd backend && docker-compose --profile dev down && docker-compose --profile dev build --no-cache && docker-compose --profile dev up -d

# Rebuild and start all services including frontend
rebuild-all:
    cd backend && docker-compose --profile dev down && docker-compose --profile dev build --no-cache && docker-compose --profile dev up -d
    cd frontend && pnpm install && pnpm dev

# ============================================================================
# TESTING
# ============================================================================

# Run all tests (unit tests)
test:
    pnpm test

# Run unit tests with UI
test-ui:
    pnpm test:ui

# Run unit tests once (no watch mode)
test-run:
    pnpm test:run

# Run tests with coverage
test-coverage:
    pnpm test:coverage

# Run E2E tests
test-e2e:
    pnpm test:e2e

# Run E2E tests with UI
test-e2e-ui:
    pnpm test:e2e:ui

# Run E2E tests in debug mode
test-e2e-debug:
    pnpm test:e2e:debug

# Run E2E tests with browser UI visible
test-e2e-headed:
    pnpm test:e2e:headed

# Show E2E test report
test-e2e-report:
    pnpm test:e2e:report

# Run backend tests (if in backend directory)
test-backend:
    cd backend && python -m pytest tests/integration tests/unit

# ============================================================================
# LINTING AND FORMATTING
# ============================================================================

# Run linter
lint:
    pnpm lint

# Run linter and fix issues
lint-fix:
    pnpm lint:fix

# ============================================================================
# BACKEND DEVELOPMENT
# ============================================================================

# Start backend development server locally (not Docker)
backend-dev:
    cd backend && python run.py

# Run backend tests with coverage
backend-test:
    cd backend && python -m pytest tests/ --ignore=tests/manual/ --cov=app

# Run backend linting
backend-lint:
    cd backend && ruff check . && ruff format . && mypy .

# Initialize backend database
backend-db-init:
    cd backend && python scripts/db_management.py init

# Backup backend database
backend-db-backup:
    cd backend && python scripts/db_management.py backup

# Show backend database statistics
backend-db-stats:
    cd backend && python scripts/db_management.py stats

# ============================================================================
# FRONTEND DEVELOPMENT
# ============================================================================

# Start frontend development server
frontend-dev:
    cd frontend && pnpm dev

# Build frontend for production
frontend-build:
    cd frontend && pnpm build

# Preview frontend production build
frontend-preview:
    cd frontend && pnpm preview

# Run frontend linting
frontend-lint:
    cd frontend && pnpm lint

# ============================================================================
# DEVELOPMENT UTILITIES
# ============================================================================

# Install all dependencies (root, backend Python, frontend)
install:
    pnpm install
    cd backend && pip install -r requirements.txt
    cd frontend && pnpm install

# Update all dependencies
update:
    pnpm update
    cd frontend && pnpm update

# Generate extension icons
icons:
    pnpm icons

# Show project status
status:
    @echo "=== Git Status ==="
    git status --short
    @echo ""
    @echo "=== Docker Status ==="
    cd backend && docker-compose ps
    @echo ""
    @echo "=== Node Modules Status ==="
    @if [ -d node_modules ]; then echo "✓ Root node_modules exists"; else echo "✗ Root node_modules missing"; fi
    @if [ -d frontend/node_modules ]; then echo "✓ Frontend node_modules exists"; else echo "✗ Frontend node_modules missing"; fi

# Clean all build artifacts and dependencies
clean-all:
    pnpm clean
    rm -rf node_modules
    rm -rf frontend/node_modules
    rm -rf frontend/dist
    cd backend && docker-compose --profile dev --profile backup down -v

# ============================================================================
# PRODUCTION DEPLOYMENT
# ============================================================================

# Deploy backend in production mode
deploy-backend:
    cd backend && docker-compose up -d backend

# Deploy with backup service
deploy-with-backup:
    cd backend && docker-compose --profile backup up -d

# Stop production deployment
deploy-stop:
    cd backend && docker-compose down

# View production logs
deploy-logs:
    cd backend && docker-compose logs -f

# ============================================================================
# QUICK DEVELOPMENT WORKFLOWS
# ============================================================================

# Full development setup - start everything
dev-full: install up-backend
    @echo "Backend started. Run 'just frontend-dev' in another terminal for frontend."
    @echo "Or run 'just up-all' to start everything including frontend."

# Quick test everything
test-all: test test-e2e backend-test

# Full cleanup and fresh start
reset: clean-all install dev-full

# ============================================================================
# MAINTENANCE
# ============================================================================

# Check for security issues
security:
    pnpm audit
    cd frontend && pnpm audit

# Update project documentation
docs:
    @echo "Documentation files:"
    @echo "- README.md"
    @echo "- CLAUDE.md (main)"
    @echo "- src/*/CLAUDE.md (component-specific)"
    @echo "- backend/CLAUDE.md"
    @echo "- frontend/CLAUDE.md"