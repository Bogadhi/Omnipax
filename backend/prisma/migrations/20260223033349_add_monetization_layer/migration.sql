/*
  Warnings:

  - You are about to alter the column `totalAmount` on the `Booking` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.

*/
-- CreateEnum
CREATE TYPE "PlatformFeeType" AS ENUM ('PERCENTAGE', 'FLAT');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "platformFeeAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "theatreNetAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "ticketAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ALTER COLUMN "totalAmount" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "platformFeeEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "platformFeeType" "PlatformFeeType" NOT NULL DEFAULT 'PERCENTAGE',
ADD COLUMN     "platformFeeValue" DECIMAL(10,2) NOT NULL DEFAULT 0;
