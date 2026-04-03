#!/bin/bash

# Deploy script for OBSIDIAN IDE

set -e

echo "Building and deploying OBSIDIAN IDE..."

# Build API server
cd artifacts/api-server
pnpm install --frozen-lockfile
pnpm build

# Build IDE
cd ../obsidian-ide
pnpm install --frozen-lockfile
pnpm build

echo "Build complete. Deploy containers..."

cd ../../
docker-compose up -d --build

echo "Deployment complete. Health check..."
sleep 10
curl -f http://localhost:3000/api/healthz || (echo "Health check failed" && exit 1)

echo "Deployment successful!"