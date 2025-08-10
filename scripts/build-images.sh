#!/bin/bash

# Build Docker images for Spendly production deployment
# Run this script before deploying to Portainer

set -e  # Exit on any error

echo "🔨 Building Spendly production images..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Change to project root
cd "$(dirname "$0")/.."

# Build backend image
print_status "Building backend image..."
docker build -f backend/Dockerfile.prod -t spendly-backend:latest ./backend
print_success "Backend image built"

# Build frontend image
print_status "Building frontend image..."
docker build -f frontend/Dockerfile.prod \
  --build-arg REACT_APP_API_URL=/api/v1 \
  --build-arg REACT_APP_UPLOAD_URL=/uploads \
  -t spendly-frontend:latest ./frontend
print_success "Frontend image built"

# List built images
print_status "Built images:"
docker images | grep spendly

print_success "🎉 All images built successfully!"
echo ""
echo "📋 Next steps:"
echo "  1. Use 'portainer-stack-simple.yml' in Portainer"
echo "  2. Update JWT_SECRET and other secrets in the stack configuration"
echo "  3. Deploy the stack"
