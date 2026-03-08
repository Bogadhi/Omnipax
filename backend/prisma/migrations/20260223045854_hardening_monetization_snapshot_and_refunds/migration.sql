/*
  Warnings:

  - You are about to alter the column `discountAmount` on the `Booking` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `couponDiscountAmount` on the `Booking` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `giftCardDiscountAmount` on the `Booking` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `finalAmount` on the `Booking` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.

*/
-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "platformFeePercentageSnapshot" DECIMAL(10,2),
ADD COLUMN     "platformFeeTypeSnapshot" "PlatformFeeType",
ADD COLUMN     "platformFlatFeeSnapshot" DECIMAL(10,2),
ADD COLUMN     "refundAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "refundedSeatsCount" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "discountAmount" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "couponDiscountAmount" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "giftCardDiscountAmount" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "finalAmount" SET DATA TYPE DECIMAL(10,2);

-- CreateTable
CREATE TABLE "MonetizationAudit" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "oldFeeType" "PlatformFeeType",
    "oldPercentage" DECIMAL(10,2),
    "oldFlatFee" DECIMAL(10,2),
    "newFeeType" "PlatformFeeType" NOT NULL,
    "newPercentage" DECIMAL(10,2),
    "newFlatFee" DECIMAL(10,2),
    "changedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonetizationAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MonetizationAudit_tenantId_idx" ON "MonetizationAudit"("tenantId");

-- AddForeignKey
ALTER TABLE "MonetizationAudit" ADD CONSTRAINT "MonetizationAudit_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
