-- Enterprise Hardening: PaymentEvent schema upgrade
-- Generated: 2026-03-02

ALTER TABLE "PaymentEvent" ADD COLUMN "errorMessage" TEXT;
ALTER TABLE "PaymentEvent" ADD COLUMN "failedAt" TIMESTAMP(3);
ALTER TABLE "PaymentEvent" ADD COLUMN "isDeadLetter" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PaymentEvent" ADD COLUMN "retryCount" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "PaymentEvent_isDeadLetter_idx" ON "PaymentEvent"("isDeadLetter");
CREATE INDEX "PaymentEvent_processed_createdAt_idx" ON "PaymentEvent"("processed", "createdAt");
