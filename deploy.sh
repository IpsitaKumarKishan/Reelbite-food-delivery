#!/usr/bin/env bash
# ==============================================================================
# ReelBite Cloud Deployment Automation Script
# Deploys Redis, Backend (with Adaptive Concurrency), and Frontend containers
# ==============================================================================

set -e

echo "=================================================================="
echo "🚀 Starting ReelBite Cloud Production Deployment on AWS EC2"
echo "=================================================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed. Please install Docker first."
    exit 1
fi

# Check Docker Compose
if ! docker compose version &> /dev/null; then
    echo "❌ Error: Docker Compose v2 is not installed."
    exit 1
fi

# Ensure .env exists
if [ ! -f .env ]; then
    echo "⚠️ .env file not found. Copying from backend/.env if available..."
    if [ -f backend/.env ]; then
        cp backend/.env .env
    else
        echo "❌ Critical: No .env configuration found. Aborting deployment."
        exit 1
    fi
fi

echo "📦 1. Building and launching Docker containers..."
docker compose up -d --build

echo "⏳ 2. Waiting for services to become healthy..."
sleep 8

echo "🔍 3. Inspecting running container status..."
docker compose ps

echo "🌐 4. Probing Backend Health..."
MAX_RETRIES=6
COUNTER=0
HEALTHY=false

while [ $COUNTER -lt $MAX_RETRIES ]; do
    if curl -s http://localhost:5000/api/health | grep -q "ok"; then
        echo "✅ Backend API is HEALTHY and connected to MongoDB Atlas!"
        HEALTHY=true
        break
    fi
    COUNTER=$((COUNTER+1))
    echo "   Waiting for backend to finish booting (Attempt $COUNTER/$MAX_RETRIES)..."
    sleep 3
done

if [ "$HEALTHY" = false ]; then
    echo "⚠️ Warning: Backend health check did not return 'ok' within the expected window."
    echo "   Review logs with: docker compose logs backend"
fi

echo "📊 5. Probing BullMQ Queue Status..."
if curl -s http://localhost:5000/api/queue/stats | grep -q "order-events"; then
    echo "✅ Redis 7 Message Broker and BullMQ Queue are ONLINE!"
else
    echo "⚠️ Note: Queue status endpoint pending."
fi

echo "=================================================================="
echo "🎉 ReelBite Deployment Complete!"
echo "   - Web App & Dashboard: http://localhost:80 (or http://13.127.5.34)"
echo "   - Infrastructure Tab:  http://localhost/admin?tab=infrastructure"
echo "   - View Live Scaling:   docker compose logs -f backend"
echo "=================================================================="

