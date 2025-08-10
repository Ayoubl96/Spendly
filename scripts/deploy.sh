#!/bin/bash

# Spendly Production Deployment Script
# Usage: ./scripts/deploy.sh

set -e  # Exit on any error

echo "🚀 Starting Spendly Production Deployment..."

# Configuration
DEPLOY_DIR="/opt/spendly"
APP_DIR="$DEPLOY_DIR/app"
CONFIG_DIR="$DEPLOY_DIR/config"
DATA_DIR="$DEPLOY_DIR/data"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
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

# Check if running as root
check_permissions() {
    if [[ $EUID -eq 0 ]]; then
        print_error "This script should not be run as root for security reasons"
        exit 1
    fi
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check if Docker Compose is available
    if ! docker compose version &> /dev/null; then
        print_error "Docker Compose is not available. Please install Docker Compose."
        exit 1
    fi
    
    # Check if cloudflared is installed
    if ! command -v cloudflared &> /dev/null; then
        print_warning "cloudflared is not installed. You'll need to set up Cloudflare tunnel manually."
    fi
    
    print_success "Prerequisites check completed"
}

# Create directory structure
create_directories() {
    print_status "Creating directory structure..."
    
    sudo mkdir -p $DEPLOY_DIR/{data/{postgres,uploads,backups,logs,nginx-logs},config/nginx}
    sudo chown -R $USER:$USER $DEPLOY_DIR
    sudo chown -R 999:999 $DATA_DIR/postgres  # Postgres user
    
    print_success "Directories created"
}

# Generate secrets
generate_secrets() {
    print_status "Generating secure secrets..."
    
    if [[ ! -f "$DEPLOY_DIR/.secrets" ]]; then
        echo "# Generated secrets for Spendly production deployment" > $DEPLOY_DIR/.secrets
        echo "# Generated on: $(date)" >> $DEPLOY_DIR/.secrets
        echo "DB_PASSWORD=$(openssl rand -base64 32)" >> $DEPLOY_DIR/.secrets
        echo "JWT_SECRET=$(openssl rand -hex 32)" >> $DEPLOY_DIR/.secrets
        echo "SESSION_SECRET=$(openssl rand -hex 32)" >> $DEPLOY_DIR/.secrets
        echo "BACKUP_ENCRYPTION_KEY=$(openssl rand -hex 32)" >> $DEPLOY_DIR/.secrets
        
        chmod 600 $DEPLOY_DIR/.secrets
        print_success "Secrets generated and saved to $DEPLOY_DIR/.secrets"
        print_warning "Please update your env.production file with these secrets!"
    else
        print_warning "Secrets file already exists. Using existing secrets."
    fi
}

# Copy application files
copy_application() {
    print_status "Copying application files..."
    
    # Create app directory if it doesn't exist
    mkdir -p $APP_DIR
    
    # Copy current directory to app directory
    rsync -av --exclude='.git' --exclude='node_modules' --exclude='__pycache__' \
          --exclude='.env*' --exclude='data/' --exclude='logs/' \
          ./ $APP_DIR/
    
    # Copy configuration files
    cp config/nginx/nginx.conf $CONFIG_DIR/nginx/
    cp config/nginx/default.conf $CONFIG_DIR/nginx/
    
    # Copy environment file
    if [[ -f "env.production" ]]; then
        cp env.production $DEPLOY_DIR/.env
        print_success "Environment file copied"
    else
        print_warning "env.production not found. Please create it manually."
    fi
    
    print_success "Application files copied"
}

# Build and deploy
deploy_application() {
    print_status "Building and deploying application..."
    
    cd $APP_DIR
    
    # Pull latest images
    docker compose -f portainer-stack.yml pull
    
    # Build custom images
    docker compose -f portainer-stack.yml build
    
    # Deploy the stack
    docker compose -f portainer-stack.yml up -d
    
    print_success "Application deployed"
}

# Health check
health_check() {
    print_status "Performing health check..."
    
    sleep 30  # Wait for services to start
    
    # Check if containers are running
    if docker ps | grep -q "spendly-"; then
        print_success "Containers are running"
    else
        print_error "Some containers are not running"
        docker ps --format "table {{.Names}}\t{{.Status}}"
        exit 1
    fi
    
    # Check application health
    for i in {1..30}; do
        if curl -s http://localhost:8080/health > /dev/null; then
            print_success "Application is healthy"
            break
        else
            if [[ $i -eq 30 ]]; then
                print_error "Health check failed after 5 minutes"
                print_status "Checking logs..."
                docker logs spendly-nginx --tail 20
                docker logs spendly-backend --tail 20
                exit 1
            fi
            print_status "Waiting for application to be healthy... ($i/30)"
            sleep 10
        fi
    done
}

# Setup cloudflare tunnel
setup_cloudflare() {
    print_status "Setting up Cloudflare tunnel..."
    
    if command -v cloudflared &> /dev/null; then
        print_status "Cloudflared is installed"
        print_warning "Please run the following commands to set up your tunnel:"
        echo "1. cloudflared tunnel login"
        echo "2. cloudflared tunnel create spendly"
        echo "3. Configure DNS in Cloudflare dashboard"
        echo "4. Create /etc/cloudflared/config.yml with your tunnel configuration"
        echo "5. sudo cloudflared service install"
        echo ""
        echo "Refer to DEPLOYMENT_GUIDE.md for detailed instructions"
    else
        print_warning "Cloudflared not found. Please install it manually and configure the tunnel."
    fi
}

# Display final information
display_final_info() {
    print_success "🎉 Deployment completed successfully!"
    echo ""
    echo "📋 Deployment Summary:"
    echo "  • Application directory: $APP_DIR"
    echo "  • Configuration directory: $CONFIG_DIR"
    echo "  • Data directory: $DATA_DIR"
    echo "  • Local access: http://localhost:8080"
    echo "  • External access: https://spendly.ayoublefhim.com (after tunnel setup)"
    echo ""
    echo "🔧 Next Steps:"
    echo "  1. Update $DEPLOY_DIR/.env with your secrets from $DEPLOY_DIR/.secrets"
    echo "  2. Set up Cloudflare tunnel (see DEPLOYMENT_GUIDE.md)"
    echo "  3. Configure your domain DNS"
    echo "  4. Test the application"
    echo ""
    echo "📚 Documentation: DEPLOYMENT_GUIDE.md"
    echo "🔍 Monitor logs: docker logs <container_name>"
    echo "📊 Portainer UI: http://your-server:9000"
}

# Main execution
main() {
    print_status "Starting Spendly deployment script..."
    
    check_permissions
    check_prerequisites
    create_directories
    generate_secrets
    copy_application
    deploy_application
    health_check
    setup_cloudflare
    display_final_info
}

# Handle interruption
trap 'print_error "Deployment interrupted!"; exit 1' INT TERM

# Run main function
main "$@"
