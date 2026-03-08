#!/bin/sh

# Running migrations
echo "Running database migrations..."
# Using the service-based URL directly to bypass any accidentally persistent .env
npx prisma migrate deploy

# Starting the application
echo "Starting the application..."
node dist/src/main.js
