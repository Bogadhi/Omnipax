# SSL and HTTPS Setup

This project uses Certbot for SSL certificate management and Nginx as a reverse proxy with security hardening.

## Initial Setup

1. **Replace Domain**: In `docker-compose.yml` and `nginx/default.conf`, replace `yourdomain.com` (or use the `DOMAIN` environment variable).
2. **Request Certificate**:
   Run the following command to obtain the initial certificate from Let's Encrypt:
   ```bash
   docker compose run --rm certbot certonly \
     --webroot \
     --webroot-path=/var/www/certbot \
     --email your@email.com \
     --agree-tos \
     --no-eff-email \
     -d yourdomain.com
   ```
3. **Restart Nginx**:
   ```bash
   docker compose restart nginx
   ```

## Auto Renewal

The stack includes a `certbot-renew` service that automatically checks for certificate renewals every 12 hours.

## Security Hardening

The Nginx configuration includes:

- HTTP to HTTPS redirection.
- HSTS (Strict-Transport-Security) header.
- X-Frame-Options (SAMEORIGIN).
- X-Content-Type-Options (nosniff).
- Referrer-Policy.
- TLS 1.2 and 1.3 only.
