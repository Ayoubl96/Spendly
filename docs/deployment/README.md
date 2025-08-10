# Deployment Guide

This guide covers containerization and deployment strategies for the Spendly expense tracking platform, with focus on local server deployment.

## 📋 Table of Contents

1. [Deployment Overview](#deployment-overview)
2. [Local Server Deployment](#local-server-deployment)
3. [Docker Configuration](#docker-configuration)
4. [Environment Configuration](#environment-configuration)
5. [Database Setup](#database-setup)
6. [Backup & Recovery](#backup--recovery)
7. [Monitoring & Maintenance](#monitoring--maintenance)

## 🎯 Deployment Overview

### Deployment Architecture

```mermaid
graph TB
    subgraph "Local Server"
        subgraph "Docker Network"
            FE[Frontend Container<br/>React App<br/>Port: 3000]
            BE[Backend Container<br/>Node.js API<br/>Port: 3001]
            DB[Database Container<br/>PostgreSQL<br/>Port: 5432]

            NGINX[Nginx Container<br/>Reverse Proxy<br/>Port: 80/443]
        end
        VOL[Docker Volumes<br/>- Database Data<br/>- File Uploads<br/>- Logs]
    end
    
    USER[User Browser] --> NGINX
    NGINX --> FE
    NGINX --> BE
    BE --> DB

    BE --> VOL
```

### Technology Stack
- **Containerization**: Docker + Docker Compose
- **Reverse Proxy**: Nginx
- **SSL**: Let's Encrypt (optional)
- **Backend**: Python with FastAPI
- **Database**: PostgreSQL with persistent volumes

- **File Storage**: Local filesystem with Docker volumes
- **Monitoring**: Docker health checks + logs

## 🏠 Local Server Deployment

### Prerequisites

```bash
# System Requirements
- Linux server (Ubuntu 20.04+ recommended)
- Docker Engine 20.0+
- Docker Compose 2.0+
- Python 3.11+ (for local development)
- 4GB RAM minimum (8GB recommended)
- 50GB disk space minimum
- Static IP or DDNS (for external access)

# Install Docker (Ubuntu/Debian)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### Quick Deployment

```bash
# 1. Clone repository
git clone <repository-url>
cd spendly

# 2. Configure environment
cp .env.example .env
nano .env  # Edit configuration

# 3. Deploy with Docker Compose
docker-compose -f docker-compose.prod.yml up -d

# 4. Verify deployment
docker-compose ps
curl http://localhost
```

### Manual Step-by-Step Deployment

#### Step 1: Environment Setup
```bash
# Create project directory
sudo mkdir -p /opt/spendly
cd /opt/spendly

# Create data directories
sudo mkdir -p data/{postgres,uploads,backups,logs}
sudo mkdir -p config/{nginx,ssl}

# Set permissions
sudo chown -R $USER:$USER /opt/spendly
```

#### Step 2: Environment Configuration
```bash
# Create environment file
cat > .env << 'EOF'
# Application Configuration
NODE_ENV=production
APP_PORT=3001
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:3001

# Database Configuration
DB_HOST=database
DB_PORT=5432
DB_NAME=spendly
DB_USER=spendly_user
DB_PASSWORD=secure_password_here
DB_URL=postgresql://spendly_user:secure_password_here@database:5432/spendly



# JWT Configuration
JWT_SECRET=your_jwt_secret_here_make_it_long_and_secure
JWT_EXPIRE=7d

# File Upload Configuration
UPLOAD_PATH=/app/uploads
MAX_FILE_SIZE=10485760  # 10MB
ALLOWED_FILE_TYPES=image/jpeg,image/png,application/pdf

# Currency API (optional)
CURRENCY_API_KEY=your_api_key_here
CURRENCY_API_URL=https://api.exchangerate-api.com/v4/latest

# Email Configuration (optional)
SMTP_HOST=localhost
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@localhost

# Security
CORS_ORIGIN=http://localhost:3000
BCRYPT_ROUNDS=12
EOF
```

#### Step 3: Docker Compose Configuration
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  # Nginx Reverse Proxy
  nginx:
    image: nginx:1.24-alpine
    container_name: spendly-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./config/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./config/nginx/default.conf:/etc/nginx/conf.d/default.conf:ro
      - ./config/ssl:/etc/ssl/certs:ro
      - ./data/logs/nginx:/var/log/nginx
    depends_on:
      - frontend
      - backend
    restart: unless-stopped
    networks:
      - spendly-network

  # Frontend Service
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    container_name: spendly-frontend
    environment:
      - REACT_APP_API_URL=http://localhost:3001/api/v1
      - REACT_APP_UPLOAD_URL=http://localhost:3001/uploads
    volumes:
      - ./data/logs/frontend:/app/logs
    restart: unless-stopped
    networks:
      - spendly-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Backend Service
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    container_name: spendly-backend
    environment:
      - ENVIRONMENT=production
    env_file:
      - .env
    volumes:
      - ./data/uploads:/app/uploads
      - ./data/logs/backend:/app/logs
    depends_on:
      - database
      - redis
    restart: unless-stopped
    networks:
      - spendly-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Database Service
  database:
    image: postgres:15-alpine
    container_name: spendly-database
    environment:
      - POSTGRES_DB=${DB_NAME}
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - ./data/postgres:/var/lib/postgresql/data
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
      - ./data/backups:/backups
    ports:
      - "5432:5432"
    restart: unless-stopped
    networks:
      - spendly-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d ${DB_NAME}"]
      interval: 30s
      timeout: 10s
      retries: 3



networks:
  spendly-network:
    driver: bridge

volumes:
  postgres_data:
  upload_data:
```

#### Step 4: Nginx Configuration
```nginx
# config/nginx/nginx.conf
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log notice;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    
    access_log /var/log/nginx/access.log main;
    
    sendfile on;
    tcp_nopush on;
    keepalive_timeout 65;
    gzip on;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;
    
    include /etc/nginx/conf.d/*.conf;
}
```

```nginx
# config/nginx/default.conf
upstream backend {
    server backend:3001;
}

upstream frontend {
    server frontend:3000;
}

server {
    listen 80;
    server_name localhost;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Backend API
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Authentication endpoints (stricter rate limiting)
    location /api/v1/auth/ {
        limit_req zone=login burst=5 nodelay;
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # File uploads
    location /uploads/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 10m;
    }
}
```

## 🐳 Docker Configuration

### Frontend Dockerfile
```dockerfile
# frontend/Dockerfile.prod
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM nginx:1.24-alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
```

### Backend Dockerfile
```dockerfile
# backend/Dockerfile.prod
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Create app directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app source
COPY . .

# Create uploads and logs directories
RUN mkdir -p uploads logs

# Create non-root user
RUN addgroup --system appuser && adduser --system --group appuser
RUN chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## 🔧 Environment Configuration

### Development Environment
```bash
# .env.development
ENVIRONMENT=development
APP_PORT=8000
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=spendly_dev
DB_USER=postgres
DB_PASSWORD=postgres

REDIS_HOST=localhost
REDIS_PORT=6379

JWT_SECRET=development_secret_not_secure
JWT_EXPIRE=1d

# Enable debug logging
DEBUG=spendly:*
LOG_LEVEL=debug
```

### Production Environment
```bash
# .env.production
ENVIRONMENT=production
APP_PORT=8000
FRONTEND_URL=https://your-domain.com
BACKEND_URL=https://your-domain.com

# Secure database credentials
DB_HOST=database
DB_PORT=5432
DB_NAME=spendly
DB_USER=spendly_user
DB_PASSWORD=very_secure_password_here

# Redis with password
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=secure_redis_password

# Strong JWT secret
JWT_SECRET=very_long_and_secure_jwt_secret_here
JWT_EXPIRE=7d

# Production logging
LOG_LEVEL=info
LOG_FILE=/app/logs/app.log
```

## 💾 Database Setup

### Initialization Script
```sql
-- database/init.sql
-- Create database and user
CREATE USER spendly_user WITH PASSWORD 'secure_password_here';
CREATE DATABASE spendly OWNER spendly_user;
GRANT ALL PRIVILEGES ON DATABASE spendly TO spendly_user;

-- Connect to spendly database
\c spendly;

-- Create UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Grant schema permissions
GRANT ALL ON SCHEMA public TO spendly_user;
```

### Migration and Seeding
```bash
# Run migrations
docker-compose exec backend alembic upgrade head

# Seed initial data
docker-compose exec backend python -m app.db.seed

# Verify setup
docker-compose exec database psql -U spendly_user -d spendly -c "\dt"
```

## 📊 Backup & Recovery

### Automated Backup Script
```bash
#!/bin/bash
# scripts/backup.sh

set -e

# Configuration
BACKUP_DIR="/opt/spendly/data/backups"
CONTAINER_NAME="spendly-database"
DB_NAME="spendly"
DB_USER="spendly_user"
RETENTION_DAYS=30

# Create backup directory
mkdir -p $BACKUP_DIR

# Generate backup filename
BACKUP_FILE="spendly_backup_$(date +%Y%m%d_%H%M%S).sql"

# Create database backup
echo "Creating database backup..."
docker exec $CONTAINER_NAME pg_dump -U $DB_USER $DB_NAME > $BACKUP_DIR/$BACKUP_FILE

# Compress backup
gzip $BACKUP_DIR/$BACKUP_FILE

# Remove old backups
find $BACKUP_DIR -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: $BACKUP_FILE.gz"

# Backup file uploads
echo "Backing up file uploads..."
tar -czf $BACKUP_DIR/uploads_backup_$(date +%Y%m%d_%H%M%S).tar.gz -C /opt/spendly/data uploads/

echo "Backup process completed successfully"
```

### Cron Job Setup
```bash
# Add to crontab
crontab -e

# Daily backup at 2 AM
0 2 * * * /opt/spendly/scripts/backup.sh >> /opt/spendly/data/logs/backup.log 2>&1

# Weekly full backup at 3 AM on Sundays
0 3 * * 0 /opt/spendly/scripts/full-backup.sh >> /opt/spendly/data/logs/backup.log 2>&1
```

### Restore Procedure
```bash
#!/bin/bash
# scripts/restore.sh

BACKUP_FILE=$1
CONTAINER_NAME="spendly-database"
DB_NAME="spendly"
DB_USER="spendly_user"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file.sql.gz>"
    exit 1
fi

# Stop application
docker-compose stop backend frontend

# Extract backup
gunzip -c $BACKUP_FILE > /tmp/restore.sql

# Drop and recreate database
docker exec $CONTAINER_NAME psql -U postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
docker exec $CONTAINER_NAME psql -U postgres -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"

# Restore database
docker exec -i $CONTAINER_NAME psql -U $DB_USER $DB_NAME < /tmp/restore.sql

# Restart application
docker-compose start backend frontend

echo "Database restored successfully from $BACKUP_FILE"
```

## 📊 Monitoring & Maintenance

### Health Check Script
```bash
#!/bin/bash
# scripts/health-check.sh

echo "=== Spendly Health Check ==="
echo "Timestamp: $(date)"
echo

# Check container status
echo "Container Status:"
docker-compose ps

echo -e "\nService Health Checks:"

# Check frontend
if curl -f http://localhost:3000 >/dev/null 2>&1; then
    echo "✅ Frontend: Healthy"
else
    echo "❌ Frontend: Unhealthy"
fi

# Check backend
if curl -f http://localhost:3001/health >/dev/null 2>&1; then
    echo "✅ Backend: Healthy"
else
    echo "❌ Backend: Unhealthy"
fi

# Check database
if docker exec spendly-database pg_isready -U spendly_user >/dev/null 2>&1; then
    echo "✅ Database: Healthy"
else
    echo "❌ Database: Unhealthy"
fi

# Check redis
if docker exec spendly-redis redis-cli ping >/dev/null 2>&1; then
    echo "✅ Redis: Healthy"
else
    echo "❌ Redis: Unhealthy"
fi

echo -e "\nDisk Usage:"
df -h /opt/spendly

echo -e "\nMemory Usage:"
free -h

echo -e "\nContainer Resource Usage:"
docker stats --no-stream
```

### Log Rotation
```bash
# /etc/logrotate.d/spendly
/opt/spendly/data/logs/*/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        docker-compose -f /opt/spendly/docker-compose.prod.yml restart nginx backend
    endscript
}
```

### Update Procedure
```bash
#!/bin/bash
# scripts/update.sh

echo "Starting Spendly update process..."

# Create backup before update
./scripts/backup.sh

# Pull latest code
git pull origin main

# Rebuild containers
docker-compose -f docker-compose.prod.yml build --no-cache

# Run database migrations
docker-compose exec backend npm run migrate

# Restart services
docker-compose -f docker-compose.prod.yml up -d

# Verify health
sleep 30
./scripts/health-check.sh

echo "Update completed successfully"
```

### Useful Commands

```bash
# View logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f database

# Access container shell
docker-compose exec backend bash
docker-compose exec database psql -U spendly_user spendly

# Monitor resources
docker stats

# Clean up
docker system prune -a
docker volume prune

# Restart specific service
docker-compose restart backend

# Scale services (if needed)
docker-compose up -d --scale backend=2
```

---

**Deployment Checklist**:
- [ ] Server prerequisites installed
- [ ] Environment variables configured
- [ ] Docker Compose files ready
- [ ] Nginx configuration set
- [ ] Database initialized
- [ ] Backup scripts configured
- [ ] Monitoring set up
- [ ] Health checks working
- [ ] SSL certificates (if needed)
- [ ] Firewall rules configured