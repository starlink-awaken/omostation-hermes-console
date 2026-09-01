#!/bin/bash
set -e

echo "Running Hermes Console baseline build check..."

cd "$(dirname "$0")/.."

echo "1. Installing dependencies..."
bun install

echo "2. Type checking..."
bun run typecheck

echo "3. Running unit tests..."
bun run test:unit

echo "4. Building Vite app..."
bun run build

echo "5. Starting preview server..."
# Run preview server in background
PORT=4173
bun run preview --port $PORT &
PREVIEW_PID=$!

# Cleanup function to kill the server when the script exits
cleanup() {
    echo "Cleaning up preview server (PID: $PREVIEW_PID)..."
    kill $PREVIEW_PID || true
}
trap cleanup EXIT

echo "6. Waiting for server to start..."
sleep 3

echo "7. Checking for 200 OK..."
HTTP_STATUS=$(curl --noproxy "*" -o /dev/null -s -w "%{http_code}\n" http://localhost:$PORT/hermes/)

if [ "$HTTP_STATUS" -ne 200 ]; then
    echo "❌ Baseline check failed! Received HTTP $HTTP_STATUS."
    exit 1
fi

echo "8. Running E2E page smoke tests..."
bun run test:e2e

echo "✅ Baseline check passed! Typecheck + Unit + Build + Preview + E2E all green."
