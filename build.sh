#!/bin/bash
set -e

echo "Building HLSPG unified portal..."

echo "Building Docker containers (React app will be built inside the container)..."
docker-compose build

echo "Build complete! You can now start the services with: docker-compose up -d"
echo ""
echo "Note: The React admin UI is now built as part of the portal container build process."
echo "For local development, you can still build the React app manually:"
echo "  cd admin-ui && npm install && npm run build"

