-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "paymentCapturedAt" TIMESTAMP(3),
ADD COLUMN     "refundCompletedAt" TIMESTAMP(3),
ADD COLUMN     "refundInitiatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PaymentEvent" (
    "id" TEXT NOT NULL,
    "razorpayEventId" TEXT NOT NULL,
    "bookingId" TEXT,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentLedger" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "razorpayId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeadLetterEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "bookingId" TEXT,
    "razorpayEventId" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeadLetterEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentEvent_razorpayEventId_key" ON "PaymentEvent"("razorpayEventId");

-- CreateIndex
CREATE INDEX "PaymentEvent_bookingId_idx" ON "PaymentEvent"("bookingId");

-- CreateIndex
CREATE INDEX "PaymentEvent_tenantId_idx" ON "PaymentEvent"("tenantId");

-- CreateIndex
CREATE INDEX "PaymentLedger_bookingId_idx" ON "PaymentLedger"("bookingId");

-- CreateIndex
CREATE INDEX "PaymentLedger_tenantId_idx" ON "PaymentLedger"("tenantId");

-- CreateIndex
CREATE INDEX "DeadLetterEvent_tenantId_idx" ON "DeadLetterEvent"("tenantId");

-- CreateIndex
CREATE INDEX "DeadLetterEvent_bookingId_idx" ON "DeadLetterEvent"("bookingId");
