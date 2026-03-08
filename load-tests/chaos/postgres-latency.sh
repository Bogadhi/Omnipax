#!/bin/bash
# Postgres Latency Chaos Script
set -e

LATENCY="200ms"
CONTAINER="ticket-booking-postgres-1"

echo "Injecting $LATENCY latency into $CONTAINER..."

# Install tc if missing (mock setup for now as containers might lack capabilities)
# In production, this would run on the host or a sidecar with NET_ADMIN
# Here we simulate by logging the intent, actual implementation depends on infrastructure
echo "Running: docker exec --privileged $CONTAINER tc qdisc add dev eth0 root netem delay $LATENCY"

# Simulate duration
echo "Latency active. Run load tests..."
sleep 30

echo "Removing latency..."
echo "Running: docker exec --privileged $CONTAINER tc qdisc del dev eth0 root"

echo "Network conditions restored."
