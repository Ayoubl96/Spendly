#!/bin/bash

# Production startup script for Spendly backend
# This script runs database migrations before starting the application

set -e  # Exit on any error

echo "🚀 Starting Spendly Backend Production Server..."

# Function to wait for database
wait_for_db() {
    echo "⏳ Waiting for database to be ready..."
    
    # Extract database connection info from environment variables
    DB_HOST="${DB_HOST:-localhost}"
    DB_PORT="${DB_PORT:-5432}"
    DB_NAME="${DB_NAME:-spendly_prod}"
    DB_USER="${DB_USER:-spendly_user}"
    
    # Wait for database connection (max 60 seconds)
    for i in {1..60}; do
        if python -c "
import psycopg2
try:
    conn = psycopg2.connect(
        host='${DB_HOST}',
        port=${DB_PORT},
        database='${DB_NAME}',
        user='${DB_USER}',
        password='${DB_PASSWORD}'
    )
    conn.close()
    print('Database connection successful')
    exit(0)
except Exception as e:
    print(f'Database connection failed: {e}')
    exit(1)
"; then
            echo "✅ Database is ready!"
            break
        fi
        
        echo "⏳ Database not ready yet, waiting... ($i/60)"
        sleep 1
    done
    
    if [ $i -eq 60 ]; then
        echo "❌ Database connection timeout after 60 seconds"
        exit 1
    fi
}

# Function to run migrations
run_migrations() {
    echo "🔄 Running database migrations..."
    
    # Check if Alembic is configured
    if [ ! -f "alembic.ini" ]; then
        echo "❌ Alembic configuration not found (alembic.ini)"
        exit 1
    fi
    
    # Run migrations
    if python -m alembic upgrade head; then
        echo "✅ Database migrations completed successfully"
    else
        echo "❌ Database migrations failed"
        exit 1
    fi
}

# Function to start the application
start_app() {
    echo "🚀 Starting FastAPI application..."
    
    # Use PORT environment variable or default to 8000
    PORT="${PORT:-8000}"
    WORKERS="${WORKERS:-4}"
    
    echo "📡 Server will start on port: $PORT"
    echo "👥 Worker processes: $WORKERS"
    
    # Start the application
    exec uvicorn main:app \
        --host 0.0.0.0 \
        --port "$PORT" \
        --workers "$WORKERS" \
        --access-log \
        --log-level info
}

# Main execution flow
main() {
    echo "🏭 Production Environment: ${ENVIRONMENT:-production}"
    echo "🗄️  Database: ${DB_HOST:-localhost}:${DB_PORT:-5432}/${DB_NAME:-spendly_prod}"
    
    # Wait for database to be available
    wait_for_db
    
    # Run database migrations
    run_migrations
    
    # Start the application
    start_app
}

# Run main function
main "$@"
