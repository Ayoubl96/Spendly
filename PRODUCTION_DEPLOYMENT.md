# 🚀 Spendly Production Deployment

Simple and clean deployment guide for Spendly on Portainer.

## 📁 Production Files

Only these files are needed for production deployment:

- **`portainer-stack.yml`** - Main Portainer stack configuration
- **`env.production`** - Environment variables with production secrets
- **`frontend/Dockerfile.prod`** - Frontend production Docker build
- **`backend/Dockerfile.prod`** - Backend production Docker build

## 🔧 Deployment Steps

### 1. Setup Server Directories

```bash
# Create required directories on your server
sudo mkdir -p /opt/spendly/data/{postgres,uploads,backups,logs,nginx-logs}
sudo chown -R $USER:$USER /opt/spendly
sudo chown -R 999:999 /opt/spendly/data/postgres  # Postgres user
```

### 2. Deploy in Portainer

1. **Go to Portainer** → Stacks → Add stack
2. **Name**: `spendly-production`
3. **Build method**: Web editor
4. **Copy the entire content** of `portainer-stack.yml`
5. **Add environment variables** (in the Environment variables section):
   ```
   COMPOSE_PROJECT_NAME=spendly-prod
   ```
6. **Deploy the stack**

### 3. Configure Cloudflare Tunnel

After deployment, set up external access:

```bash
# Install cloudflared
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# Authenticate and create tunnel
cloudflared tunnel login
cloudflared tunnel create spendly

# Configure DNS in Cloudflare dashboard:
# CNAME: spendly.ayoublefhim.com → YOUR_TUNNEL_UUID.cfargotunnel.com

# Create tunnel config
sudo mkdir -p /etc/cloudflared
sudo nano /etc/cloudflared/config.yml
```

Add to config file:
```yaml
tunnel: YOUR_TUNNEL_UUID
credentials-file: /root/.cloudflared/YOUR_TUNNEL_UUID.json

ingress:
  - hostname: spendly.ayoublefhim.com
    service: http://localhost:8080
  - service: http_status:404
```

```bash
# Install and start service
sudo cloudflared service install
sudo systemctl start cloudflared
sudo systemctl enable cloudflared
```

## 🔗 Access URLs

- **Local**: `http://your-server:8080`
- **External**: `https://spendly.ayoublefhim.com`

## 🔐 Security Notes

- All secrets are properly configured in `env.production`
- Database is not exposed externally
- JWT tokens are securely generated (256-bit)
- CORS is configured for your domain only

## 📊 What the Stack Includes

- **Frontend**: React app with Nginx
- **Backend**: FastAPI with Python
- **Database**: PostgreSQL 15
- **Reverse Proxy**: Nginx with embedded config
- **Backup**: Automated daily database backups
- **Health Checks**: All services monitored

## 🔄 Updates

To update the application:

1. Push changes to GitHub
2. In Portainer, go to Stacks → spendly-production
3. Click "Update the stack"
4. Portainer will rebuild from the latest GitHub code

## 🆘 Troubleshooting

**Check logs in Portainer:**
- Go to Containers
- Click on container name
- View logs tab

**Common issues:**
- Make sure directories exist: `/opt/spendly/data/{postgres,uploads,backups,logs}`
- Check Cloudflare tunnel status: `sudo systemctl status cloudflared`
- Verify DNS: `nslookup spendly.ayoublefhim.com`

---

That's it! Clean, simple, and production-ready. 🎉
