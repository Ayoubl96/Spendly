# 🚀 Spendly Production Deployment Guide

## ✅ **New Clean Setup Complete**

All old Dockerfiles have been removed and replaced with a **production-optimized** setup.

## 📋 **What's New:**

### **Frontend Dockerfile** (`frontend/Dockerfile`)
- ✅ **Multi-stage build** (build → nginx)
- ✅ **React 19 compatibility** with `--legacy-peer-deps`
- ✅ **Environment variables** passed at build time
- ✅ **Optimized nginx** with SPA routing and caching
- ✅ **Health checks** and security headers
- ✅ **No external config files** - everything embedded

### **Production Stack** (`docker-compose.production.yml`)
- ✅ **Clean Docker Compose** setup
- ✅ **Environment variables** from external `.env` file
- ✅ **Proper networking** and volumes
- ✅ **Health checks** for all services
- ✅ **Build args** for frontend API URLs

## 🔧 **Deployment Steps:**

### **Step 1: Prepare Environment File**

Create/update `.env.production` in the root directory:

```env
# Replace YOUR_SERVER_IP with your actual IP (e.g., 192.168.1.13)
FRONTEND_URL=http://YOUR_SERVER_IP:4000
BACKEND_URL=http://YOUR_SERVER_IP:9000
CORS_ORIGIN=http://YOUR_SERVER_IP:4000

# Database
DB_NAME=spendly_prod
DB_USER=spendly_user
DB_PASSWORD=88gv^rt8Lkv&&ffNrwy2iV

# JWT
JWT_SECRET=2076ff86074634937849794082fce3c5e01918660245eb0162435641a6583664
JWT_EXPIRE=7d
JWT_ALGORITHM=HS256

# Security
BCRYPT_ROUNDS=12

# Production
ENVIRONMENT=production
ENABLE_DOCS=true
PYTHONDONTWRITEBYTECODE=1
PYTHONUNBUFFERED=1
```

### **Step 2: Deploy in Portainer**

1. **Go to Stacks** → **Add Stack**
2. **Stack Configuration:**
   - **Name**: `spendly-production`
   - **Build method**: Upload
   - **Compose file**: Upload `docker-compose.production.yml`
   - **Environment file**: Upload your `.env.production` (with correct IP)

3. **Deploy Stack**

### **Step 3: Access Application**

After successful deployment:
- **Frontend**: `http://YOUR_SERVER_IP:4000`
- **Backend API**: `http://YOUR_SERVER_IP:9000/api/v1`
- **API Documentation**: `http://YOUR_SERVER_IP:9000/docs`

## 🎯 **Key Improvements:**

### **Build Process:**
1. **Node.js build stage**: Compiles React with environment variables
2. **Nginx production stage**: Serves optimized static files
3. **Clean separation**: Build artifacts don't include dev dependencies

### **Environment Handling:**
- ✅ **Build-time injection**: API URLs baked into React build
- ✅ **External env file**: Easy configuration without code changes
- ✅ **Proper defaults**: Fallback values for all settings

### **Production Optimizations:**
- ✅ **Static file caching**: 1-year cache for assets
- ✅ **Gzip compression**: Automatic nginx compression
- ✅ **Security headers**: XSS protection, frame options
- ✅ **SPA routing**: Proper handling of client-side routes

## 🔍 **Troubleshooting:**

### **Build Issues:**
- **React 19 compatibility**: Uses `--legacy-peer-deps` to resolve conflicts
- **Memory limits**: Build runs in isolated stages to reduce memory usage
- **Environment variables**: Verified injection and build verification

### **Runtime Issues:**
- **CORS**: Properly configured with your server IP
- **API calls**: Frontend compiled with correct backend URLs
- **Health checks**: All services have proper health monitoring

## 📊 **Architecture:**

```
Frontend (React + Nginx) → Port 4000
    ↓ API Calls
Backend (Python + FastAPI) → Port 9000
    ↓ Database
PostgreSQL → Internal only
```

## ⚡ **Why This Works:**

1. **Proven technologies**: Standard nginx + React build
2. **Environment isolation**: Build vs runtime environment separation
3. **Compatibility fixes**: Handles React 19 + older tooling
4. **Production ready**: Optimized for performance and security

This setup eliminates all the previous build issues while maintaining modern React development practices!
