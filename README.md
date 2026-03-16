# OMNIPAX Backend

NestJS + TypeScript backend for multi-tenant seat booking with Redis locks, BullMQ workers, Razorpay payments, QR ticketing, and WebSocket seat updates.

## Tech Stack
- NestJS
- Prisma + PostgreSQL
- Redis
- BullMQ
- Razorpay
- Socket.IO

## Setup
1. Copy environment variables:
   ```bash
   cp .env.example backend/.env
   ```
2. Install dependencies:
   ```bash
   cd backend
   yarn install
   ```
3. Generate Prisma client:
   ```bash
   yarn prisma:generate
   ```
4. Apply migrations:
   ```bash
   yarn prisma:migrate:deploy
   ```
5. Run service:
   ```bash
   yarn start:dev
   ```

## Core Features
- JWT authentication (`/api/auth/*`)
- Tenant-aware routing via `x-tenant-slug`
- Redis seat locks with 5-minute TTL (`/api/seat-locks`)
- Booking initiation + Razorpay order creation (`/api/bookings/initiate`)
- Razorpay webhook signature verification (`/api/payments/webhook`)
- Booking confirmation only after webhook verification
- Idempotent webhook processing (`PaymentWebhookEvent`)
- QR ticket generation on successful payment
- WebSocket seat updates (`/seats` namespace, `join_event` room subscription)
- BullMQ processors for seat lock expiry and booking expiry

## API Overview
- `POST /api/tenants`
- `GET /api/tenants/:slug`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/events`
- `GET /api/events`
- `GET /api/events/:eventId/seats`
- `POST /api/seat-locks`
- `DELETE /api/seat-locks`
- `POST /api/bookings/initiate`
- `GET /api/bookings/me`
- `GET /api/bookings/:bookingId/ticket`
- `POST /api/bookings/verify-ticket`
- `POST /api/payments/webhook`

## WebSocket
- Namespace: `/seats`
- Client event: `join_event`
  ```json
  { "tenantSlug": "cinema-a", "eventId": "evt_123" }
  ```
- Server event: `seat_update`

## Deployment
- `render.yaml` included for Render deployment.

## Notes
- Users are global across tenants.
- All tenant-scoped endpoints require `x-tenant-slug` header.
- Seat locks expire after `SEAT_LOCK_TTL_SECONDS`.
- Pending bookings expire after `BOOKING_TTL_MINUTES`.