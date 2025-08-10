# Spendly Simple Production Deployment (No Nginx)

## 🎯 **Why This Version?**

This simplified version removes nginx entirely and exposes services directly. **Much simpler and more reliable!**

## ✅ **What's Different:**

- ❌ **No nginx** - eliminates all nginx configuration issues
- ❌ **No nginx-ui** - removes unnecessary complexity  
- ✅ **Direct service access** - frontend and backend exposed directly
- ✅ **Fewer moving parts** - more stable deployment
- ✅ **Easier troubleshooting** - clear service separation

## 🚀 **Deployment Steps:**

### 1. **Prepare Environment File**
Edit `portainer-simple.env` and replace `YOUR_SERVER_IP` with your actual server IP:

```env
# Replace with your actual server IP
FRONTEND_URL=http://192.168.1.100:3001
BACKEND_URL=http://192.168.1.100:8001
CORS_ORIGIN=http://192.168.1.100:3001
```

### 2. **Create Directories** (Optional - handled automatically)
The stack creates directories automatically, but you can create them manually if needed:
```bash
sudo mkdir -p /opt/spendly/data/{postgres,uploads,logs}
sudo chown -R 1000:1000 /opt/spendly/data
```

### 3. **Deploy in Portainer**
1. Go to **Stacks** → **Add Stack**
2. **Name**: `spendly-simple`
3. **Upload**: `portainer-stack-simple.yml`
4. **Environment variables**: Upload `portainer-simple.env`
5. **Deploy**

## 🌐 **Access Your Application:**

### **Direct Service Access:**
- **🎨 Frontend (React App)**: `http://your-server-ip:3001`
- **🔧 Backend API**: `http://your-server-ip:8001`
- **📊 API Documentation**: `http://your-server-ip:8001/docs`
- **💾 Database**: Internal only (no external access)

### **Health Checks:**
- **Backend Health**: `http://your-server-ip:8001/api/v1/health`
- **Frontend Health**: `http://your-server-ip:3001/health`

## 📊 **Service Architecture:**

```
┌─────────────────┐    ┌─────────────────┐
│    Frontend     │    │    Backend      │
│   Port: 3001    │    │   Port: 8001    │
│   (React App)   │    │   (Python API)  │
└─────────────────┘    └─────┬───────────┘
                              │
                        ┌─────▼─────┐
                        │ Database  │
                        │   :5432   │
                        │ (Internal)│
                        └───────────┘
```

## 🔧 **Configuration:**

### **Frontend Build Args:**
- API calls go directly to: `http://your-server:8001/api/v1`
- File uploads go to: `http://your-server:8001/uploads`

### **Backend CORS:**
- Configured to accept requests from frontend on port 3001
- API accessible on port 8001

## 🆘 **Troubleshooting:**

### **If services don't start:**
1. **Check logs**: Click on container name in Portainer → Logs
2. **Verify environment variables**: Ensure `portainer-simple.env` has correct values
3. **Check database**: Database must be healthy before backend starts

### **If frontend can't reach backend:**
1. **Check CORS settings**: Ensure `CORS_ORIGIN` matches frontend URL
2. **Verify network**: Both containers should be on same Docker network
3. **Test backend directly**: `curl http://your-server:8000/api/v1/health`

### **Common Issues:**
- **Port conflicts**: Make sure ports 3000 and 8000 aren't used by other services
- **Firewall**: Ensure ports 3000 and 8000 are open on your server
- **IP address**: Use actual server IP, not localhost, in environment variables

## 🎉 **Benefits of This Approach:**

✅ **Simpler** - No nginx configuration complexity  
✅ **Faster** - Direct service access, no proxy overhead  
✅ **Easier debugging** - Clear service separation  
✅ **More reliable** - Fewer components to fail  
✅ **Development-friendly** - Same ports as dev environment  

## 🔄 **Migration from Complex Version:**

If you were using the nginx version:
1. **Stop the old stack** in Portainer
2. **Deploy this simple version**
3. **Update your bookmarks** to new URLs:
   - Old: `http://server:8090` → New: `http://server:3000`
   - Old: `http://server:8090/api` → New: `http://server:8000/api/v1`

**This version is much more reliable and easier to manage!** 🚀
