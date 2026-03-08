-- ============================================================================
-- ENTERPRISE HARDENING: PostgreSQL Row Level Security (RLS) Migration
-- Version: 1.0
-- Target: All tenant-scoped tables
-- Compatible with: Prisma + NestJS
--
-- INSTRUCTIONS:
--   1. Run as a DATABASE OWNER (not the app DB user)
--   2. The app user must have BYPASSRLS if SUPER_ADMIN context is needed
--      OR use a separate superuser role granted BYPASSRLS
--   3. Configure per-connection: SET LOCAL app.tenant_id = '<uuid>'
--      via Prisma $executeRaw in a middleware before each query batch
-- ============================================================================

-- ─── 0. Create helper function ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS UUID AS $$
BEGIN
  -- If bypass flag is set (SUPER_ADMIN), return NULL so policy allows all rows
  IF current_setting('app.bypass_rls', TRUE) = 'true' THEN
    RETURN NULL;
  END IF;

  DECLARE val TEXT;
  BEGIN
    val := current_setting('app.tenant_id', TRUE);
    IF val IS NULL OR val = '' THEN
      RETURN NULL;
    END IF;
    RETURN val::UUID;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ─── Helper: tenant policy template (reused below) ──────────────────────────
-- Policy logic:
--   Allow ALL rows when current_tenant_id() IS NULL (SUPER_ADMIN or no context)
--   Restrict to tenant_id match otherwise

-- ─── 1. Enable RLS on all tenant-scoped tables ──────────────────────────────

ALTER TABLE "Event"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Show"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Seat"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SeatAvailability" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SeatLock"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Screen"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Theater"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Booking"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BookingSeat"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Coupon"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GiftCard"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Wishlist"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FeatureFlag"      ENABLE ROW LEVEL SECURITY;

-- ─── 2. Create row-level policies ───────────────────────────────────────────

-- PATTERN for each table:
--   USING: filters rows returned
--   WITH CHECK: filters rows on INSERT/UPDATE

-- Event
DROP POLICY IF EXISTS tenant_isolation ON "Event";
CREATE POLICY tenant_isolation ON "Event"
  USING (
    current_tenant_id() IS NULL
    OR "tenantId" = current_tenant_id()
  )
  WITH CHECK (
    current_tenant_id() IS NULL
    OR "tenantId" = current_tenant_id()
  );

-- Show
DROP POLICY IF EXISTS tenant_isolation ON "Show";
CREATE POLICY tenant_isolation ON "Show"
  USING (current_tenant_id() IS NULL OR "tenantId" = current_tenant_id())
  WITH CHECK (current_tenant_id() IS NULL OR "tenantId" = current_tenant_id());

-- Seat
DROP POLICY IF EXISTS tenant_isolation ON "Seat";
CREATE POLICY tenant_isolation ON "Seat"
  USING (current_tenant_id() IS NULL OR "tenantId" = current_tenant_id())
  WITH CHECK (current_tenant_id() IS NULL OR "tenantId" = current_tenant_id());

-- SeatAvailability
DROP POLICY IF EXISTS tenant_isolation ON "SeatAvailability";
CREATE POLICY tenant_isolation ON "SeatAvailability"
  USING (current_tenant_id() IS NULL OR "tenantId" = current_tenant_id())
  WITH CHECK (current_tenant_id() IS NULL OR "tenantId" = current_tenant_id());

-- SeatLock
DROP POLICY IF EXISTS tenant_isolation ON "SeatLock";
CREATE POLICY tenant_isolation ON "SeatLock"
  USING (current_tenant_id() IS NULL OR "tenantId" = current_tenant_id())
  WITH CHECK (current_tenant_id() IS NULL OR "tenantId" = current_tenant_id());

-- Screen
DROP POLICY IF EXISTS tenant_isolation ON "Screen";
CREATE POLICY tenant_isolation ON "Screen"
  USING (current_tenant_id() IS NULL OR "tenantId" = current_tenant_id())
  WITH CHECK (current_tenant_id() IS NULL OR "tenantId" = current_tenant_id());

-- Theater
DROP POLICY IF EXISTS tenant_isolation ON "Theater";
CREATE POLICY tenant_isolation ON "Theater"
  USING (current_tenant_id() IS NULL OR "tenantId" = current_tenant_id())
  WITH CHECK (current_tenant_id() IS NULL OR "tenantId" = current_tenant_id());

-- Booking
DROP POLICY IF EXISTS tenant_isolation ON "Booking";
CREATE POLICY tenant_isolation ON "Booking"
  USING (current_tenant_id() IS NULL OR "tenantId" = current_tenant_id())
  WITH CHECK (current_tenant_id() IS NULL OR "tenantId" = current_tenant_id());

-- BookingSeat
DROP POLICY IF EXISTS tenant_isolation ON "BookingSeat";
CREATE POLICY tenant_isolation ON "BookingSeat"
  USING (current_tenant_id() IS NULL OR "tenantId" = current_tenant_id())
  WITH CHECK (current_tenant_id() IS NULL OR "tenantId" = current_tenant_id());

-- Coupon
DROP POLICY IF EXISTS tenant_isolation ON "Coupon";
CREATE POLICY tenant_isolation ON "Coupon"
  USING (current_tenant_id() IS NULL OR "tenantId" = current_tenant_id())
  WITH CHECK (current_tenant_id() IS NULL OR "tenantId" = current_tenant_id());

-- GiftCard
DROP POLICY IF EXISTS tenant_isolation ON "GiftCard";
CREATE POLICY tenant_isolation ON "GiftCard"
  USING (current_tenant_id() IS NULL OR "tenantId" = current_tenant_id())
  WITH CHECK (current_tenant_id() IS NULL OR "tenantId" = current_tenant_id());

-- Wishlist
DROP POLICY IF EXISTS tenant_isolation ON "Wishlist";
CREATE POLICY tenant_isolation ON "Wishlist"
  USING (current_tenant_id() IS NULL OR "tenantId" = current_tenant_id())
  WITH CHECK (current_tenant_id() IS NULL OR "tenantId" = current_tenant_id());

-- FeatureFlag (tenant-scoped flags only — global flags have tenantId = NULL)
DROP POLICY IF EXISTS tenant_isolation ON "FeatureFlag";
CREATE POLICY tenant_isolation ON "FeatureFlag"
  USING (
    current_tenant_id() IS NULL
    OR "tenantId" IS NULL
    OR "tenantId" = current_tenant_id()
  );

-- ─── 3. Grant app database user PERMISSION to set session variables ─────────
-- Replace 'ticket_app_user' with your actual DB username
-- GRANT SET ON PARAMETER app.tenant_id TO ticket_app_user;
-- GRANT SET ON PARAMETER app.bypass_rls TO ticket_app_user;

-- ─── 4. Verification queries ─────────────────────────────────────────────────
-- After applying: test tenant isolation works:
/*
  -- As app user, simulate tenant 1:
  SET LOCAL app.tenant_id = '<your-tenant-uuid>';
  SELECT COUNT(*) FROM "Booking";  -- should return only tenant 1 bookings

  -- Test bypass:
  SET LOCAL app.bypass_rls = 'true';
  SELECT COUNT(*) FROM "Booking";  -- should return ALL bookings

  -- Verify RLS is enabled:
  SELECT tablename, rowsecurity
  FROM pg_tables
  WHERE schemaname = 'public'
  AND rowsecurity = true;
*/

-- ─── 5. NestJS Prisma Integration ─────────────────────────────────────────
-- In PrismaService.registerTenantMiddleware(), add BEFORE each query block:
--
--   await this.$executeRawUnsafe(
--     `SET LOCAL app.tenant_id = '${tenantId}'`
--   );
--
-- For SUPER_ADMIN:
--   await this.$executeRawUnsafe(`SET LOCAL app.bypass_rls = 'true'`);
--
-- NOTE: This must be done inside a transaction ($transaction) to ensure
-- the SET LOCAL only applies to that transaction scope. Using SET without
-- LOCAL would persist for the connection duration (unsafe in connection pools).
