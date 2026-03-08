#!/bin/bash
# Redis Failure Chaos Script
set -e

echo "Starting Redis Chaos Test..."

# Stop Redis
echo "Stopping Redis container..."
docker stop ticket-booking-redis-1

echo "Redis is down. Run load tests now to verify graceful failure."
sleep 10

# Restart Redis
echo "Restarting Redis container..."
docker start ticket-booking-redis-1

echo "Redis is back up. System should recover."
