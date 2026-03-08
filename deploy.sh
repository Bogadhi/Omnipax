#!/bin/bash

# Deployment Script for Ticket Booking Backend
# Usage: ./deploy.sh

# Stop script on first error
set -e

echo "🚀 Starting Deployment..."

# 1. Update Repository
echo "⬇️ Pulling latest changes..."
git pull origin main

# 2. Stop existing containers
echo "🛑 Stopping running containers..."
docker compose -f docker-compose.prod.yml down

# 3. Build new images (No cache to ensure clean build)
echo "🏗️ Building Docker images..."
docker compose -f docker-compose.prod.yml build --no-cache

# 4. Start services in background
echo "▶️ Starting services..."
docker compose -f docker-compose.prod.yml up -d

# 5. Cleanup
echo "🧹 Cleaning up unused images..."
docker image prune -f

echo "✅ Deployment Complete!"
echo "👉 Check logs with: docker compose -f docker-compose.prod.yml logs -f"
