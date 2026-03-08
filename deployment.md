# Production Deployment Guide

## 1. Prerequisites

- **Ubuntu 22.04 LTS** (Recommended)
- **Domain Name** pointed to your VPS IP (`api.yourdomain.com`).
- **Docker & Docker Compose** installed.
- **Git** installed.

## 2. Server Setup (One-Time)

### Install Docker

````bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

### Firewall Setup (UFW)
Secure your server by allowing only necessary ports.

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
````

### Install Certbot (Host-Based)

We use Certbot on the host machine to manage SSL certificates, which are mapped into the Nginx container.

```bash
sudo apt install -y certbot
```

## 3. SSL Certificate Generation

Stop any service running on port 80 before generating the certificate.

```bash
# Replace api.yourdomain.com with your actual domain
sudo certbot certonly --standalone -d api.yourdomain.com
```

This creates certificates in `/etc/letsencrypt/live/api.yourdomain.com/`.

## 4. Configuration

1. Clone the repository:

   ```bash
   git clone <your-repo-url>
   cd <repo-folder>
   ```

2. Create Production Environment File:

   ```bash
   cp .env.production.example .env.production
   nano .env.production
   ```

   **CRITICAL:**
   - Update `POSTGRES_PASSWORD` to a strong string.
   - Update `JWT_SECRET`.
   - Update `DOMAIN_NAME` (e.g., `api.yourdomain.com`).
   - Update `FRONTEND_URL`.

3. Update Nginx Config:
   Open `nginx/nginx.prod.conf` and verify the `server_name` and `ssl_certificate` paths match your domain.

## 5. Deployment

Run the automated deployment script:

```bash
chmod +x deploy.sh
./deploy.sh
```

## 6. Verification

1. **Check Logs:**

   ```bash
   docker compose -f docker-compose.prod.yml logs -f
   ```

2. **Verify Health Endpoint:**

   ```bash
   curl https://api.yourdomain.com/health
   ```

   Should return `200 OK`.

3. **Verify Security Headers:**
   Check headers in browser DevTools or use `curl -I https://api.yourdomain.com`. Look for `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`.

## 7. Auto-Renewal Setup

Add a cron job to renew certificates automatically.

```bash
sudo crontab -e
```

Add:

```bash
0 3 1 * * /usr/bin/certbot renew --quiet && docker compose -f /path/to/repo/docker-compose.prod.yml restart nginx
```

## 8. Backup Strategy

Add a cron job to backup the database daily.

```bash
0 4 * * * docker exec -t ticket_postgres_prod pg_dumpall -c -U postgres > /path/to/backups/dump_`date +\%d-\%m-\%Y"_"\%H_\%M_\%S`.sql
```

## 9. Rollback

If a deployment fails, revert to the previous code and re-deploy:

```bash
git checkout HEAD^
./deploy.sh
```
