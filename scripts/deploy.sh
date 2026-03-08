#!/bin/bash
# Zero-Downtime Deployment Script
set -e

echo "Starting deployment..."

# Pull latest images
docker compose pull

# Build images
docker compose build

# Deploy with orphans removal
docker compose up -d --remove-orphans

# Health Check Loop
echo "Waiting for backend health check..."
MAX_RETRIES=12
RETRY_COUNT=0
until $(curl -sf http://localhost/api/health | grep -q '"status":"ok"'); do
    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
      echo "Health check failed after $MAX_RETRIES attempts."
      exit 1
    fi
    echo "Backend still starting... ($((RETRY_COUNT+1))/$MAX_RETRIES)"
    sleep 5
    RETRY_COUNT=$((RETRY_COUNT+1))
done

# Reload Nginx to ensure new certs/configs are picked up
docker compose exec nginx nginx -s reload

echo "Deployment complete and verified."
