#!/bin/bash

# Transfer Docker images to server for Portainer deployment
# Run this script to save images and transfer them to your server

set -e

echo "📦 Saving Docker images..."

# Save images to tar files
docker save spendly-frontend:latest -o spendly-frontend.tar
docker save spendly-backend:latest -o spendly-backend.tar

echo "✅ Images saved to:"
echo "  - spendly-frontend.tar"
echo "  - spendly-backend.tar"

echo ""
echo "📤 Next steps:"
echo "1. Transfer these files to your server:"
echo "   scp spendly-frontend.tar spendly-backend.tar user@your-server:/tmp/"
echo ""
echo "2. On your server, load the images:"
echo "   docker load -i /tmp/spendly-frontend.tar"
echo "   docker load -i /tmp/spendly-backend.tar"
echo ""
echo "3. Verify images are loaded:"
echo "   docker images | grep spendly"
echo ""
echo "4. Then deploy using portainer-stack-simple.yml in Portainer"

# Optional: Auto-transfer if server details provided
if [ "$1" != "" ]; then
    echo ""
    echo "🚀 Transferring to server: $1"
    scp spendly-frontend.tar spendly-backend.tar $1:/tmp/
    echo "✅ Files transferred!"
    echo ""
    echo "Run on server:"
    echo "ssh $1 'docker load -i /tmp/spendly-frontend.tar && docker load -i /tmp/spendly-backend.tar'"
fi
