# 🚀 Spendly Production Deployment Guide

Complete step-by-step guide to deploy Spendly on your local server using Portainer with Cloudflare tunnel.

## 📋 Prerequisites

- Local server with Docker and Portainer installed
- Domain: `ayoublefhim.com` with DNS access
- Cloudflare account
- Git repository access

## 🔧 Step 1: Server Preparation

### 1.1 Create Directory Structure

```bash
# Create application directories
sudo mkdir -p /opt/spendly/{data/{postgres,uploads,backups,logs,nginx-logs},config/nginx}
sudo chown -R $USER:$USER /opt/spendly
```

### 1.2 Set Proper Permissions

```bash
# Set ownership for data directories
sudo chown -R 999:999 /opt/spendly/data/postgres  # Postgres user
sudo chown -R $USER:$USER /opt/spendly/data/uploads
sudo chown -R $USER:$USER /opt/spendly/data/backups
sudo chown -R $USER:$USER /opt/spendly/data/logs
sudo chown -R $USER:$USER /opt/spendly/data/nginx-logs
sudo chown -R $USER:$USER /opt/spendly/config
```

## 🔒 Step 2: Security Configuration

### 2.1 Generate Secure Secrets

```bash
# Generate JWT secret (256-bit)
openssl rand -hex 32

# Generate session secret (256-bit)
openssl rand -hex 32

# Generate backup encryption key
openssl rand -hex 32

# Generate strong database password
openssl rand -base64 32
```

### 2.2 Update Environment File

Copy `env.production` to your server and update these critical values:

```bash
# Replace these with your generated secrets
DB_PASSWORD=YOUR_GENERATED_DB_PASSWORD
JWT_SECRET=YOUR_GENERATED_JWT_SECRET
SESSION_SECRET=YOUR_GENERATED_SESSION_SECRET
BACKUP_ENCRYPTION_KEY=YOUR_GENERATED_BACKUP_KEY

# Configure email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@spendly.ayoublefhim.com
```

## 🌐 Step 3: Cloudflare Tunnel Setup

### 3.1 Install Cloudflared

```bash
# Download and install cloudflared
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb
```

### 3.2 Authenticate with Cloudflare

```bash
cloudflared tunnel login
```

### 3.3 Create Tunnel

```bash
# Create tunnel
cloudflared tunnel create spendly

# Note the tunnel UUID from the output
```

### 3.4 Configure DNS

In Cloudflare Dashboard:
1. Go to DNS settings for `ayoublefhim.com`
2. Add CNAME record:
   - **Name**: `spendly`
   - **Content**: `YOUR_TUNNEL_UUID.cfargotunnel.com`
   - **Proxy status**: Proxied (orange cloud)

### 3.5 Create Tunnel Configuration

```bash
# Create config directory
sudo mkdir -p /etc/cloudflared

# Create tunnel config
sudo nano /etc/cloudflared/config.yml
```

Add this content:

```yaml
tunnel: YOUR_TUNNEL_UUID
credentials-file: /root/.cloudflared/YOUR_TUNNEL_UUID.json

ingress:
  - hostname: spendly.ayoublefhim.com
    service: http://localhost:8080
  - service: http_status:404
```

### 3.6 Install Tunnel as Service

```bash
sudo cloudflared service install
sudo systemctl start cloudflared
sudo systemctl enable cloudflared
```

## 🐳 Step 4: Copy Application Files

### 4.1 Copy Configuration Files

```bash
# Copy nginx configurations
cp config/nginx/nginx.conf /opt/spendly/config/nginx/
cp config/nginx/default.conf /opt/spendly/config/nginx/

# Copy environment file
cp env.production /opt/spendly/.env
```

### 4.2 Copy Application Code

```bash
# Option 1: Copy entire project
cp -r /path/to/spendly /opt/spendly/app

# Option 2: Clone from repository
cd /opt/spendly
git clone YOUR_REPOSITORY_URL app
cd app
git checkout main  # or your production branch
```

## 📦 Step 5: Portainer Deployment

### 5.1 Access Portainer

Go to your Portainer interface (usually `http://your-server:9000`)

### 5.2 Create New Stack

1. Go to **Stacks** → **Add stack**
2. Name: `spendly-production`
3. Build method: **Web editor**

### 5.3 Copy Stack Configuration

Copy the entire content of `portainer-stack.yml` into the web editor.

### 5.4 Update Environment Variables

In the stack editor, update these variables:

```yaml
environment:
  - POSTGRES_PASSWORD=YOUR_GENERATED_DB_PASSWORD
  # Add other environment variables as needed
```

### 5.5 Advanced Settings

In **Advanced mode**:

1. **Environment variables**:
   ```
   COMPOSE_PROJECT_NAME=spendly-prod
   ```

2. **Deploy the stack**

## 🔍 Step 6: Verification

### 6.1 Check Container Status

In Portainer:
1. Go to **Containers**
2. Verify all containers are running:
   - `spendly-nginx` ✅
   - `spendly-frontend` ✅
   - `spendly-backend` ✅
   - `spendly-database` ✅
   - `spendly-backup` ✅

### 6.2 Check Health Status

```bash
# Check individual container health
docker ps --format "table {{.Names}}\t{{.Status}}"

# Check logs if any issues
docker logs spendly-nginx
docker logs spendly-backend
docker logs spendly-frontend
docker logs spendly-database
```

### 6.3 Test Application

1. **Internal access**: `http://your-server:8080`
2. **External access**: `https://spendly.ayoublefhim.com`

### 6.4 Test API Endpoints

```bash
# Health check
curl https://spendly.ayoublefhim.com/health

# API health
curl https://spendly.ayoublefhim.com/api/v1/health

# Check if frontend loads
curl -I https://spendly.ayoublefhim.com
```

## 🔧 Step 7: Database Setup

### 7.1 Initialize Database

```bash
# Connect to database container
docker exec -it spendly-database psql -U spendly_user -d spendly_prod

# Run initial setup (if needed)
# Your init.sql should handle this
```

### 7.2 Create Admin User (if needed)

```bash
# Access backend container
docker exec -it spendly-backend bash

# Run any necessary setup scripts
python scripts/create_admin_user.py
```

## 📊 Step 8: Monitoring

### 8.1 Set Up Log Monitoring

```bash
# Check logs location
ls -la /opt/spendly/data/logs/
ls -la /opt/spendly/data/nginx-logs/

# Set up log rotation
sudo nano /etc/logrotate.d/spendly
```

Add logrotate configuration:

```
/opt/spendly/data/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    notifempty
    create 644 root root
    postrotate
        docker kill -s USR1 spendly-nginx
    endscript
}
```

### 8.2 Set Up Backup Monitoring

```bash
# Check backup cron job
docker exec spendly-backup crontab -l

# Monitor backup directory
ls -la /opt/spendly/data/backups/
```

## 🔐 Step 9: Security Hardening

### 9.1 Firewall Configuration

```bash
# Allow only necessary ports
sudo ufw allow ssh
sudo ufw allow 8080/tcp  # Nginx (internal)
sudo ufw deny 5432/tcp   # Postgres (block external access)
sudo ufw enable
```

### 9.2 SSL/TLS Configuration

Since using Cloudflare tunnel, SSL is handled by Cloudflare:
- ✅ Automatic SSL certificate management
- ✅ DDoS protection
- ✅ CDN acceleration

### 9.3 Regular Updates

```bash
# Create update script
sudo nano /opt/spendly/update.sh
```

Add update script:

```bash
#!/bin/bash
cd /opt/spendly/app
git pull origin main
docker-compose -f portainer-stack.yml pull
docker-compose -f portainer-stack.yml up -d
```

## 🚨 Step 10: Troubleshooting

### 10.1 Common Issues

**Frontend not loading:**
```bash
docker logs spendly-frontend
docker logs spendly-nginx
```

**API errors:**
```bash
docker logs spendly-backend
# Check database connection
docker exec spendly-backend curl http://localhost:8000/health
```

**Database connection issues:**
```bash
docker logs spendly-database
docker exec spendly-database pg_isready -U spendly_user -d spendly_prod
```

### 10.2 Rollback Strategy

```bash
# Stop current deployment
docker-compose -f portainer-stack.yml down

# Restore from backup
docker run --rm -v postgres_data:/data -v /opt/spendly/data/backups:/backup postgres:15-alpine sh -c "psql -U spendly_user -d spendly_prod < /backup/latest_backup.sql"

# Restart with previous version
git checkout PREVIOUS_COMMIT
docker-compose -f portainer-stack.yml up -d
```

## ✅ Final Checklist

- [ ] Server directories created with proper permissions
- [ ] Secure secrets generated and configured
- [ ] Cloudflare tunnel configured and running
- [ ] DNS record pointing to tunnel
- [ ] Application files copied to server
- [ ] Portainer stack deployed successfully
- [ ] All containers running and healthy
- [ ] External access working via `https://spendly.ayoublefhim.com`
- [ ] Database initialized with admin user
- [ ] Backup system operational
- [ ] Monitoring and logging configured
- [ ] Security measures implemented

## 📝 Maintenance

### Daily
- Check application health via Portainer
- Monitor log files for errors

### Weekly
- Review backup files
- Update dependencies if needed

### Monthly
- Security updates
- Performance optimization
- Backup testing

---

## 🆘 Support

If you encounter issues:

1. Check container logs in Portainer
2. Verify Cloudflare tunnel status: `cloudflared tunnel info spendly`
3. Test internal connectivity: `curl http://localhost:8080/health`
4. Check DNS resolution: `nslookup spendly.ayoublefhim.com`

**Your Spendly application should now be live at: https://spendly.ayoublefhim.com** 🎉
