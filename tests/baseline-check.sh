#!/bin/bash
set -e

echo "Running Hermes Console baseline build check..."

cd "$(dirname "$0")/.."

echo "1. Installing dependencies..."
bun install

echo "2. Building Vite app..."
bun run build

echo "3. Starting preview server..."
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

echo "4. Waiting for server to start..."
sleep 3

echo "5. Checking for 200 OK..."
HTTP_STATUS=$(curl --noproxy "*" -o /dev/null -s -w "%{http_code}\n" http://localhost:$PORT/hermes/)

if [ "$HTTP_STATUS" -eq 200 ]; then
    echo "✅ Baseline check passed! Received HTTP 200 OK from preview server."
    exit 0
else
    echo "❌ Baseline check failed! Received HTTP $HTTP_STATUS."
    exit 1
fi
