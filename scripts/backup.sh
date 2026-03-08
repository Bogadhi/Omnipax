#!/bin/bash
# Daily Database Backup Script
set -e

BACKUP_DIR="/opt/backups"
DATE=$(date +%Y-%m-%d_%H%M%S)
RETENTION_DAYS=7

mkdir -p $BACKUP_DIR

echo "Starting database backup at $DATE..."

# Get password from secret if using docker secrets
POSTGRES_PASSWORD=$(cat /run/secrets/postgres_password)

docker exec ticket-booking-postgres-1 pg_dump -U postgres ticket_booking > "$BACKUP_DIR/backup_$DATE.sql"

# Compress backup
gzip "$BACKUP_DIR/backup_$DATE.sql"

# Rotate backups
find $BACKUP_DIR -type f -name "*.sql.gz" -mtime +$RETENTION_DAYS -exec rm {} \;

echo "Backup complete: backup_$DATE.sql.gz"
