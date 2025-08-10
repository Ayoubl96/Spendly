# Spendly Portainer Stack Deployment Guide

## Fixed Issues

### 1. ✅ Nginx Configuration Syntax Error
- **Problem**: Unexpected "s" in nginx configuration line 10
- **Solution**: Fixed indentation and structure in the embedded nginx config

### 2. ✅ Nginx UI Permissions and Database
- **Problem**: Missing `/etc/nginx-ui/app.ini` and database directory
- **Solution**: Added proper volume mounts and initialization commands:
  - `/opt/spendly/data/nginx-ui-config:/etc/nginx-ui`
  - `/opt/spendly/data/nginx-ui-db:/var/lib/nginx-ui`
  - Set `GIN_MODE=release` for production mode

### 3. ✅ Frontend 403 Errors
- **Problem**: Frontend container returning 403 forbidden errors
- **Solution**: Added health checks and proper service dependencies

### 4. ✅ Security Issues
- **Problem**: Hardcoded passwords and secrets in YAML
- **Solution**: Moved all sensitive data to environment variables

## Prerequisites

1. **Create required directories**:
```bash
sudo mkdir -p /opt/spendly/data/{postgres,uploads,logs,nginx-logs,nginx-config,nginx-ui-config,nginx-ui-db}
sudo chown -R 1000:1000 /opt/spendly/data
```

2. **Set up environment variables**:
```bash
# Copy the environment template
cp portainer.env /opt/spendly/portainer.env

# Edit with your actual values
sudo nano /opt/spendly/portainer.env
```

## Environment Variables Required

Create `/opt/spendly/portainer.env` with these values:

```env
# Database Configuration
POSTGRES_DB=spendly_prod
POSTGRES_USER=spendly_user
POSTGRES_PASSWORD=your_secure_db_password_here

# Application URLs
FRONTEND_URL=https://spendly.ayoublefhim.com
BACKEND_URL=https://spendly.ayoublefhim.com
CORS_ORIGIN=https://spendly.ayoublefhim.com

# JWT Configuration
JWT_SECRET=your_secure_jwt_secret_here
JWT_EXPIRE=7d
JWT_ALGORITHM=HS256

# Security
BCRYPT_ROUNDS=12
```

## Deployment Steps

1. **In Portainer**:
   - Go to Stacks → Add Stack
   - Name: `spendly-production`
   - Upload the `portainer-stack.yml` file
   - In Environment Variables section, upload `/opt/spendly/portainer.env`
   - Deploy the stack

2. **Access Points**:
   - **Application**: `http://your-server:8080`
   - **Nginx UI**: `http://your-server:8081`
   - **Health checks**:
     - `http://your-server:8080/nginx-health`
     - `http://your-server:8080/nginx-status`

## Service Architecture

```
┌─────────────────┐    ┌─────────────────┐
│   Nginx UI      │    │     Nginx       │
│   Port: 8081    │    │   Port: 8080    │
│   (Monitoring)  │    │ (Reverse Proxy) │
└─────────────────┘    └─────┬───────────┘
                              │
                    ┌─────────┼─────────┐
                    │                   │
            ┌───────▼────┐    ┌────────▼────┐
            │  Frontend  │    │   Backend   │
            │   :80      │    │    :8000    │
            └────────────┘    └─────┬───────┘
                                    │
                              ┌─────▼─────┐
                              │ Database  │
                              │   :5432   │
                              └───────────┘
```

## Troubleshooting

### If services fail to start:

1. **Check logs**:
```bash
docker logs spendly-frontend
docker logs spendly-backend
docker logs spendly-nginx
```

2. **Test individual services**:
```bash
# Test frontend directly
curl http://localhost:8080/test-frontend

# Test backend directly
curl http://localhost:8080/test-backend

# Check nginx status
curl http://localhost:8080/nginx-status
```

3. **Verify environment variables**:
```bash
docker exec spendly-backend env | grep -E "(JWT_|DB_|POSTGRES_)"
```

### Common Issues:

- **Database connection**: Ensure `POSTGRES_PASSWORD` matches in both database and backend services
- **Frontend build fails**: Check if the repository is accessible and build completes
- **502 errors**: Services might be starting up - wait for health checks to pass

## Security Notes

- All sensitive data is now in environment variables [[memory:5750885]]
- JWT secrets should be cryptographically secure
- Database passwords should be strong and unique
- Consider using Docker secrets for even better security in production

## Monitoring

- Nginx UI provides real-time monitoring at port 8081
- Application logs are stored in `/opt/spendly/data/logs`
- Nginx logs are in `/opt/spendly/data/nginx-logs`
