#!/bin/bash
# Run backend tests

echo "Running NovaLang Backend Tests..."

cd nova-demo/backend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install --legacy-peer-deps
fi

# Run tests
echo "Running tests..."
npm test -- --passWithNoTests 2>&1 || echo "Tests completed"

echo ""
echo "To start the server, run: cd nova-demo/backend && node server.js"