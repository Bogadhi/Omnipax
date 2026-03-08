# Ticket Booking Backend

## Operational Instructions

### 1. External Infrastructure (From Project Root)

Run all Docker commands from the **project root** directory:

```bash
docker compose down
docker compose up -d
```

### 2. Backend Development (From /backend Directory)

Change directory to the backend folder for all development tasks:

```bash
cd backend
```

#### Run Database Migrations

Initialize the database schema using Prisma:

```bash
npx prisma migrate dev --name init
```

#### Start Development Server

```bash
npm run start:dev
```

## Environment Configuration

The database is exposed on port **5433** to avoid local conflicts. Ensure `.env` reflects this:

- `DATABASE_URL="postgresql://postgres:postgres@localhost:5433/ticket_booking"`
