# Production Monitoring Guide

## System Monitoring

- **CPU/Memory**: Use `htop` to monitor overall VPS load.
- **Docker Stats**: Run `docker stats` to see real-time resource usage of all containers.
- **Logs**:
  - Backend: `docker compose logs backend --tail 100 -f`
  - Nginx: `docker compose logs nginx --tail 100 -f`

## Health Verification Endpoints

- **Public API**: `https://yourdomain.com/api/health`
- **Internal Metrics**: `https://yourdomain.com/api/metrics` (Requires Admin Token)

## Backup Management

- Backups are stored in `/opt/backups`.
- Rotation is automatic (7 days retention).
- To manually trigger a backup: `sudo ./scripts/backup.sh`

## Zero-Downtime Updates

To deploy code changes without dropping traffic:

1. `git pull`
2. `sudo ./scripts/deploy.sh`
