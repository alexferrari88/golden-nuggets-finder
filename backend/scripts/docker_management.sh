#!/bin/bash
# Docker management utility script for Golden Nuggets Finder backend

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker and Docker Compose are available
check_dependencies() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed or not in PATH"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed or not in PATH"
        exit 1
    fi
}

# Start development environment
start_dev() {
    print_info "Starting development environment..."
    
    if [ ! -f .env ]; then
        print_warning ".env file not found. Creating from template..."
        cp .env.example .env
        print_warning "Please edit .env file and add your GEMINI_API_KEY"
        print_info "Use the same API key as your Chrome extension"
        return 1
    fi
    
    docker-compose --profile dev up -d backend-dev
    print_success "Development environment started"
    print_info "Backend available at: http://localhost:7532"
    print_info "View logs with: docker-compose logs -f backend-dev"
}

# Start production environment
start_prod() {
    print_info "Starting production environment..."
    
    if [ -z "$GEMINI_API_KEY" ]; then
        print_error "GEMINI_API_KEY environment variable is not set"
        print_info "Set it with: export GEMINI_API_KEY='your_key_here'"
        print_info "This should be the same API key used by your Chrome extension"
        return 1
    fi
    
    docker-compose up -d backend
    print_success "Production environment started"
    print_info "Backend available at: http://localhost:7532"
    print_info "View logs with: docker-compose logs -f backend"
}

# Stop services
stop_services() {
    print_info "Stopping all services..."
    docker-compose --profile dev --profile backup down
    print_success "All services stopped"
}

# Stop services and remove volumes
teardown() {
    print_warning "This will stop all services and remove all volumes (including database data)!"
    print_warning "Are you sure? (y/N)"
    read -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Teardown cancelled"
        return 1
    fi
    
    print_info "Stopping services and removing volumes..."
    docker-compose --profile dev --profile backup down -v
    print_success "Services stopped and volumes removed"
}

# View logs
view_logs() {
    local service=${1:-backend}
    print_info "Viewing logs for $service..."
    docker-compose logs -f $service
}

# Run database backup
backup_database() {
    print_info "Creating database backup..."
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_name="feedback_backup_${timestamp}.db"
    
    # Create backups directory if it doesn't exist
    mkdir -p ./backups
    
    # Create backup
    if docker-compose exec -T backend sqlite3 /app/data/feedback.db ".backup /tmp/${backup_name}"; then
        # Copy backup to host
        docker cp $(docker-compose ps -q backend):/tmp/${backup_name} ./backups/${backup_name}
        
        print_success "Database backed up to ./backups/${backup_name}"
        
        # Clean up temporary file
        docker-compose exec -T backend rm -f /tmp/${backup_name}
        
        # Keep only last 7 backups
        cd backups
        ls -t feedback_backup_*.db | tail -n +8 | xargs -r rm
        cd ..
        
        print_info "Cleaned up old backups (keeping last 7)"
    else
        print_error "Failed to create database backup"
        return 1
    fi
}

# Restore database from backup
restore_database() {
    local backup_file=$1
    
    if [ -z "$backup_file" ]; then
        print_error "Please specify backup file"
        print_info "Usage: $0 restore-db <backup_file>"
        return 1
    fi
    
    if [ ! -f "$backup_file" ]; then
        print_error "Backup file not found: $backup_file"
        return 1
    fi
    
    print_warning "This will replace the current database. Are you sure? (y/N)"
    read -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Database restore cancelled"
        return 1
    fi
    
    print_info "Restoring database from $backup_file..."
    
    # Stop backend
    docker-compose stop backend backend-dev
    
    # Copy backup to container
    docker cp "$backup_file" $(docker-compose ps -q backend || docker-compose ps -q backend-dev):/app/data/feedback.db
    
    # Start backend
    docker-compose start backend backend-dev
    
    print_success "Database restored from $backup_file"
}

# Health check
health_check() {
    print_info "Checking backend health..."
    
    local response=$(curl -s -f http://localhost:7532/ || echo "FAILED")
    
    if [[ "$response" == "FAILED" ]]; then
        print_error "Backend is not responding"
        print_info "Check logs with: $0 logs"
        return 1
    else
        print_success "Backend is healthy"
        print_info "Response: $response"
    fi
}

# Build and update
build_and_update() {
    print_info "Building and updating backend..."
    
    # Build new image
    docker-compose build --no-cache backend
    
    # Restart services
    docker-compose up -d backend
    
    print_success "Backend updated and restarted"
}

# Clean up Docker resources
cleanup() {
    print_info "Cleaning up Docker resources..."
    
    # Remove stopped containers
    docker container prune -f
    
    # Remove unused images
    docker image prune -f
    
    # Remove unused volumes (be careful!)
    print_warning "Remove unused Docker volumes? This may delete data! (y/N)"
    read -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker volume prune -f
        print_success "Docker volumes cleaned up"
    else
        print_info "Volume cleanup skipped"
    fi
    
    print_success "Docker cleanup completed"
}

# Show status
show_status() {
    print_info "Docker services status:"
    docker-compose ps
    
    echo
    print_info "Container resource usage:"
    docker stats --no-stream $(docker-compose ps -q) 2>/dev/null || echo "No running containers"
    
    echo
    print_info "Volume usage:"
    docker volume ls | grep golden
}

# Run database management
run_db_management() {
    local command=${1:-stats}
    print_info "Running database management: $command"
    docker-compose exec backend python scripts/db_management.py $command
}

# Enable automatic backups
enable_backups() {
    print_info "Enabling automatic daily backups..."
    docker-compose --profile backup up -d backup
    print_success "Automatic backups enabled"
    print_info "Backups will be created daily in ./backups directory"
}

# Show help
show_help() {
    echo "Golden Nuggets Finder - Docker Management Script"
    echo
    echo "Usage: $0 <command> [options]"
    echo
    echo "Commands:"
    echo "  start-dev           Start development environment with hot reload"
    echo "  start-prod          Start production environment"
    echo "  stop               Stop all services"
    echo "  teardown           Stop all services and remove volumes (destructive!)"
    echo "  restart            Restart services"
    echo "  logs [service]     View logs (default: backend)"
    echo "  health             Check backend health"
    echo "  status             Show services status and resource usage"
    echo "  backup             Create database backup"
    echo "  restore-db <file>  Restore database from backup file"
    echo "  enable-backups     Enable automatic daily backups"
    echo "  build              Build and update backend image"
    echo "  cleanup            Clean up Docker resources"
    echo "  db <command>       Run database management command"
    echo "  help               Show this help message"
    echo
    echo "Examples:"
    echo "  $0 start-dev       # Start development environment"
    echo "  $0 logs backend    # View backend logs"
    echo "  $0 backup          # Create database backup"
    echo "  $0 db stats        # Show database statistics"
}

# Main script logic
main() {
    check_dependencies
    
    case "${1:-help}" in
        start-dev)
            start_dev
            ;;
        start-prod)
            start_prod
            ;;
        stop)
            stop_services
            ;;
        teardown)
            teardown
            ;;
        restart)
            stop_services
            sleep 2
            start_prod
            ;;
        logs)
            view_logs $2
            ;;
        health)
            health_check
            ;;
        status)
            show_status
            ;;
        backup)
            backup_database
            ;;
        restore-db)
            restore_database $2
            ;;
        enable-backups)
            enable_backups
            ;;
        build)
            build_and_update
            ;;
        cleanup)
            cleanup
            ;;
        db)
            shift
            run_db_management "$@"
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_error "Unknown command: $1"
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"