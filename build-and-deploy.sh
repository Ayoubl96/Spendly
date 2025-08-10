#!/bin/bash

echo "🏗️ Building Spendly for Production Deployment"

# Set the correct API URLs for production
export REACT_APP_API_URL="http://192.168.1.13:9000/api/v1"
export REACT_APP_UPLOAD_URL="http://192.168.1.13:9000/uploads"

echo "📦 Building frontend with production URLs..."
cd frontend

# Build the React app locally
npm run build

echo "✅ Build completed successfully!"
echo "📂 Build directory ready for deployment"

# Verify build
if [ -f "build/index.html" ]; then
    echo "✅ index.html found - build is valid"
    ls -la build/
else
    echo "❌ Build failed - index.html not found"
    exit 1
fi

echo ""
echo "🚀 Ready for deployment!"
echo "   Next steps:"
echo "   1. Commit all changes to git"
echo "   2. Deploy with portainer-stack-prebuilt.yml"
echo "   3. Frontend will use the pre-built files"
