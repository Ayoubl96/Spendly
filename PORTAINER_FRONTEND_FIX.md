# 🚀 Portainer Frontend Fix Guide

## 🚨 **Frontend Issues Identified:**

1. **API URL Configuration**: Frontend trying to connect to `localhost` which doesn't work in containers
2. **Backend Dependency**: Frontend depends on backend being healthy first
3. **Environment Variables**: Need proper propagation from build args to runtime

## ✅ **Fixed Configuration:**

### **Updated `portainer-stack.yml`:**
- ✅ Frontend now uses environment variable for API URL
- ✅ Both build args AND environment variables set
- ✅ URLs reference external server IP instead of localhost

### **Updated `env.portainer`:**
- ✅ All URLs use `YOUR_SERVER_IP` placeholder
- ✅ Consistent URL structure across all services

## 🔧 **Deployment Steps:**

### **Step 1: Update Environment File**
Edit `env.portainer` and replace **ALL instances** of `YOUR_SERVER_IP`:

```bash
# Example: If your server IP is 192.168.1.100
FRONTEND_URL=http://192.168.1.100:4000
BACKEND_URL=http://192.168.1.100:9000
CORS_ORIGIN=http://192.168.1.100:4000
UPLOAD_URL=http://192.168.1.100:9000/uploads
```

### **Step 2: Redeploy Stack in Portainer**
1. **Stop current stack** (if running)
2. **Delete the stack** to force rebuild
3. **Create new stack** with updated files:
   - Upload: `portainer-stack.yml`
   - Environment: `env.portainer` (with YOUR_SERVER_IP updated)

### **Step 3: Monitor Container Startup Order**
Expected startup sequence:
1. **init-dirs** → **completed** (creates directories)
2. **database** → **healthy** (PostgreSQL ready)
3. **backend** → **healthy** (API server ready)
4. **frontend** → **running** (React app served by nginx)

## 🔍 **Troubleshooting:**

### **If Frontend Still Shows "Created" Status:**

1. **Check Backend Health:**
   ```bash
   curl http://YOUR_SERVER_IP:9000/api/v1/health
   ```
   Should return: `{"status": "ok"}`

2. **Check Container Logs:**
   - Click on `spendly-frontend` in Portainer
   - Go to **Logs** tab
   - Look for build errors or nginx startup issues

3. **Verify Environment Variables:**
   - In Portainer, click on `spendly-frontend`
   - Go to **Inspect** tab
   - Check **Environment** section for correct API URLs

### **Common Frontend Build Issues:**

**Error: "Build failed"**
- Solution: Check if your GitHub repo has latest code
- Alternative: Use local build context instead of GitHub

**Error: "curl: command not found"**
- This is expected during build, nginx will install curl in production stage

**Error: "Cannot connect to backend"**
- Ensure backend is healthy before frontend starts
- Check CORS_ORIGIN matches frontend URL exactly

## 🎯 **Expected Final State:**

| Service | Status | Port | Health Check |
|---------|--------|------|--------------|
| database | **healthy** | Internal | ✅ |
| backend | **healthy** | 9000:8001 | ✅ |
| frontend | **running** | 4000:80 | ✅ |

## 🌐 **Access URLs:**
- **Frontend App**: `http://YOUR_SERVER_IP:4000`
- **Backend API**: `http://YOUR_SERVER_IP:9000/api/v1`
- **API Docs**: `http://YOUR_SERVER_IP:9000/docs`

## ⚡ **Quick Fix Commands:**

If you need to restart just the frontend:
1. In Portainer → Containers
2. Select `spendly-frontend`
3. Click **Restart**

If you need to force rebuild:
1. Delete the entire stack
2. Redeploy with updated files

---

**Note**: The frontend configuration now properly uses your server's external IP for API calls, which is required for the React app running in the browser to communicate with the backend container.
