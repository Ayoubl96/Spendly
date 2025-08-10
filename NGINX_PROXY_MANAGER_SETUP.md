# Nginx Proxy Manager Setup Guide for Spendly

This guide explains how to set up and configure Nginx Proxy Manager (NPM) for the Spendly application, providing a web-based interface for managing SSL certificates and proxy configurations.

## Overview

Nginx Proxy Manager provides:
- 🌐 **Web UI** for proxy management
- 🔒 **Automatic SSL** certificate generation and renewal (Let's Encrypt)
- 🚀 **Easy domain management** without manual configuration files
- 📊 **Real-time monitoring** and access logs
- 🛡️ **Built-in security features** and rate limiting

## Architecture Changes

### Before (Original Setup)
```
Internet → Cloudflare → Direct Container Ports
- Frontend: Port 4000
- Backend: Port 9000
- Database: Port 5432 (exposed)
```

### After (With Nginx Proxy Manager)
```
Internet → Nginx Proxy Manager → Internal Services
- NPM Admin UI: Port 81
- HTTP Traffic: Port 80 → HTTPS redirect
- HTTPS Traffic: Port 443 → Internal containers
- All services communicate internally (no exposed ports)
```

## Deployment Steps

### 1. Deploy the Updated Stack

Replace your current `portainer-stack.yml` with the new version that includes Nginx Proxy Manager:

```bash
# Use the new stack file
cp portainer-stack-nginx-proxy.yml portainer-stack.yml

# Or update your existing portainer-stack.yml with the NPM configuration
```

### 2. Update Environment Variables

Use the new environment file for NPM compatibility:

```bash
# Copy the NPM-optimized environment file
cp env.nginx-proxy-manager env.production
```

### 3. Deploy the Stack

In Portainer:
1. Go to **Stacks** → **spendly-production**
2. **Update** the stack with the new configuration
3. Deploy the changes

### 4. Access Nginx Proxy Manager

Once deployed, access the NPM admin interface:

- **URL**: `http://your-server-ip:81`
- **Default Login**: 
  - Email: `admin@example.com`
  - Password: `changeme`

**⚠️ IMPORTANT**: Change the default credentials immediately after first login!

## Configuration Guide

### 1. Initial Setup

1. **Login** to NPM admin interface
2. **Change default credentials**:
   - Go to **Users** → **admin@example.com**
   - Update email and password
3. **Configure settings** (optional):
   - Go to **Settings** → **General**
   - Update default SSL certificate settings

### 2. Create Proxy Hosts

#### Frontend Proxy Host

1. Go to **Hosts** → **Proxy Hosts** → **Add Proxy Host**
2. Fill in the **Details** tab:
   - **Domain Names**: `spendly.ayoublefhim.com`
   - **Scheme**: `http`
   - **Forward Hostname/IP**: `spendly-frontend`
   - **Forward Port**: `80`
   - ✅ **Cache Assets**
   - ✅ **Block Common Exploits**
   - ✅ **Websockets Support** (if using WebSockets)

3. Go to **SSL** tab:
   - ✅ **SSL Certificate**: Select "Request a new SSL Certificate"
   - ✅ **Force SSL**
   - ✅ **HTTP/2 Support**
   - ✅ **HSTS Enabled**
   - **Email**: Your email for Let's Encrypt
   - ✅ **I Agree to the Let's Encrypt Terms of Service**

4. **Advanced** tab (optional):
   ```nginx
   # Add custom nginx directives if needed
   location /api/ {
       proxy_pass http://spendly-backend:8001;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
   }
   
   location /uploads/ {
       proxy_pass http://spendly-backend:8001;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
       client_max_body_size 50m;
   }
   ```

#### Alternative: Separate API Subdomain (Optional)

If you prefer separate subdomains:

1. **API Proxy Host**:
   - **Domain**: `api.spendly.ayoublefhim.com`
   - **Forward to**: `spendly-backend:8001`
   - **SSL**: Enable with Let's Encrypt

2. Update frontend environment:
   ```env
   REACT_APP_API_URL=https://api.spendly.ayoublefhim.com/api/v1
   REACT_APP_UPLOAD_URL=https://api.spendly.ayoublefhim.com/uploads
   ```

### 3. Advanced Configuration

#### Rate Limiting

In the **Advanced** tab of your proxy host:

```nginx
# Rate limiting for API endpoints
location /api/ {
    limit_req zone=api burst=20 nodelay;
    proxy_pass http://spendly-backend:8001;
    # ... other proxy settings
}

# Stricter rate limiting for authentication
location /api/v1/auth/ {
    limit_req zone=auth burst=5 nodelay;
    proxy_pass http://spendly-backend:8001;
    # ... other proxy settings
}
```

#### Security Headers

NPM automatically adds basic security headers, but you can add more:

```nginx
# Additional security headers
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;" always;
```

## SSL Certificate Management

### Automatic Renewal

NPM automatically renews Let's Encrypt certificates. Monitor the **SSL Certificates** page for:
- ✅ **Valid certificates** (green status)
- ⚠️ **Expiring certificates** (yellow status)
- ❌ **Failed certificates** (red status)

### Manual Certificate Upload

If you have custom SSL certificates:

1. Go to **SSL Certificates** → **Add SSL Certificate**
2. Choose **Custom**
3. Upload your certificate files
4. Assign to proxy hosts

### Wildcard Certificates

For multiple subdomains:

1. **Add SSL Certificate** → **Let's Encrypt**
2. **Domain Names**: `*.ayoublefhim.com`
3. **DNS Challenge**: Configure your DNS provider API
4. NPM will handle DNS validation automatically

## Monitoring and Maintenance

### Access Logs

1. Go to **Hosts** → **Proxy Hosts**
2. Click **View** on any host to see access logs
3. Monitor traffic patterns and errors

### Health Checks

NPM includes built-in health monitoring:
- Service availability checks
- SSL certificate expiration monitoring
- Automatic failover (if configured)

### Backup Configuration

**Important**: Backup NPM data regularly:

```bash
# Backup NPM data volume
docker run --rm -v spendly_npm_data:/source -v $(pwd):/backup alpine tar czf /backup/npm-backup-$(date +%Y%m%d).tar.gz -C /source .

# Backup Let's Encrypt certificates
docker run --rm -v spendly_npm_letsencrypt:/source -v $(pwd):/backup alpine tar czf /backup/letsencrypt-backup-$(date +%Y%m%d).tar.gz -C /source .
```

## Troubleshooting

### Common Issues

#### 1. SSL Certificate Generation Fails

**Symptoms**: SSL certificate request fails
**Solutions**:
- Ensure DNS points to your server
- Check firewall allows ports 80/443
- Verify domain ownership
- Check Let's Encrypt rate limits

#### 2. 502 Bad Gateway

**Symptoms**: NPM returns 502 error
**Solutions**:
- Verify backend container is running: `docker ps`
- Check backend health: `docker logs spendly-backend`
- Ensure correct internal hostname/port in proxy config

#### 3. CORS Issues

**Symptoms**: Frontend can't connect to API
**Solutions**:
- Update CORS_ORIGIN in backend environment
- Ensure consistent HTTPS/HTTP protocol
- Check proxy configuration passes correct headers

#### 4. File Upload Issues

**Symptoms**: Large file uploads fail
**Solutions**:
- Increase `client_max_body_size` in NPM Advanced config
- Check backend UPLOAD_MAX_SIZE setting
- Monitor disk space on server

### Logs and Debugging

```bash
# View NPM logs
docker logs spendly-nginx-proxy-manager

# View backend logs
docker logs spendly-backend

# View frontend logs
docker logs spendly-frontend

# Check NPM configuration
docker exec spendly-nginx-proxy-manager cat /data/nginx/proxy_host/*.conf
```

## Security Best Practices

### 1. Change Default NPM Admin Port

In production, change port 81 to a non-standard port:

```yaml
ports:
  - '80:80'
  - '443:443'  
  - '8443:81'  # Custom admin port
```

### 2. Firewall Configuration

```bash
# Allow only necessary ports
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow 8443/tcp  # NPM Admin (custom port)
ufw deny 81/tcp     # Block default NPM port
```

### 3. Admin Access Restriction

In NPM Advanced config for admin interface:

```nginx
# Restrict admin access to specific IPs
location / {
    allow 203.0.113.0/24;  # Your office IP range
    allow 198.51.100.1;    # Your home IP
    deny all;
    proxy_pass http://upstream;
}
```

### 4. Enable 2FA (if available)

Some NPM versions support 2FA - enable it for additional security.

## Migration from Current Setup

### 1. Pre-migration Checklist

- [ ] Backup current configuration
- [ ] Note current domain DNS settings
- [ ] Verify all services are working
- [ ] Plan maintenance window

### 2. Migration Steps

1. **Deploy NPM stack** (services will be temporarily unavailable)
2. **Configure proxy hosts** in NPM
3. **Test internal connectivity**
4. **Generate SSL certificates**
5. **Update DNS** if needed (should already point to your server)
6. **Test full application functionality**

### 3. Rollback Plan

If issues occur:

1. **Revert to original stack**:
   ```bash
   git checkout HEAD~1 -- portainer-stack.yml
   ```
2. **Redeploy original configuration**
3. **Verify services are restored**

## Additional Resources

- [Nginx Proxy Manager Documentation](https://nginxproxymanager.com/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Docker Compose Networking](https://docs.docker.com/compose/networking/)

## Support

For issues specific to this setup:
1. Check logs following the troubleshooting guide
2. Verify NPM configuration matches this guide
3. Test each component individually
4. Review Docker networking configuration

---

**Next Steps**: After successful deployment, consider setting up monitoring, automated backups, and additional security measures.
