#!/bin/sh

echo "Waiting for Postgres at postgres:5432..."

while ! nc -z postgres 5432; do
  sleep 1
done

echo "Postgres is ready!"

echo "Running database migrations..."
npx prisma migrate deploy || true

echo "Starting the application..."
npm run start:prod