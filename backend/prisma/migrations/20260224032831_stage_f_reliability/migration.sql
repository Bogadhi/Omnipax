-- CreateTable
CREATE TABLE "PaymentLog" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "razorpayOrderId" TEXT NOT NULL,
    "razorpayPaymentId" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL,
    "rawPayload" JSONB NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentLog_razorpayPaymentId_key" ON "PaymentLog"("razorpayPaymentId");

-- CreateIndex
CREATE INDEX "PaymentLog_bookingId_idx" ON "PaymentLog"("bookingId");

-- CreateIndex
CREATE INDEX "PaymentLog_razorpayOrderId_idx" ON "PaymentLog"("razorpayOrderId");

-- CreateIndex
CREATE INDEX "PaymentLog_tenantId_idx" ON "PaymentLog"("tenantId");
