#!/bin/bash

# Spendly Development Setup Script

echo "🚀 Spendly Development Setup"
echo "============================"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    echo "Visit: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from example..."
    cp .env.example .env
    echo "⚠️  Please update .env with your configuration"
fi

# Build and start containers
echo "🏗️  Building Docker containers..."
docker-compose build

echo "🚀 Starting services..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Check service health
echo "🔍 Checking service status..."
docker-compose ps

# Display access URLs
echo ""
echo "✅ Setup complete! Access your application at:"
echo "   - Frontend: http://localhost"
echo "   - API Docs: http://localhost/api/v1/docs"
echo "   - Backend Direct: http://localhost:8000"
echo ""
echo "📝 Useful commands:"
echo "   - View logs: docker-compose logs -f"
echo "   - Stop services: docker-compose down"
echo "   - Restart services: docker-compose restart"
echo "   - Run tests: docker-compose exec backend pytest"