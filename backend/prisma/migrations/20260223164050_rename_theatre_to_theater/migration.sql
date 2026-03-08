/*
  Warnings:

  - The values [THEATRE_MANAGER] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `theatreNetAmount` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `theatreId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `TheatreApplication` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('SUPER_ADMIN', 'TENANT_ADMIN', 'THEATER_MANAGER', 'STAFF', 'USER', 'ADMIN', 'SCANNER_DEVICE');
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "Role_old";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'USER';
COMMIT;

-- DropForeignKey
ALTER TABLE "ApplicationDocument" DROP CONSTRAINT "ApplicationDocument_applicationId_fkey";

-- DropForeignKey
ALTER TABLE "TheatreApplication" DROP CONSTRAINT "TheatreApplication_reviewedById_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_theatreId_fkey";

-- DropIndex
DROP INDEX "User_theatreId_idx";

-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "theatreNetAmount",
ADD COLUMN     "theaterNetAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "theatreId",
ADD COLUMN     "theaterId" TEXT;

-- DropTable
DROP TABLE "TheatreApplication";

-- CreateTable
CREATE TABLE "TheaterApplication" (
    "id" TEXT NOT NULL,
    "theaterName" TEXT NOT NULL,
    "theaterSlug" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "gstNumber" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewNotes" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TheaterApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TheaterApplication_email_idx" ON "TheaterApplication"("email");

-- CreateIndex
CREATE INDEX "TheaterApplication_theaterName_idx" ON "TheaterApplication"("theaterName");

-- CreateIndex
CREATE INDEX "TheaterApplication_status_idx" ON "TheaterApplication"("status");

-- CreateIndex
CREATE INDEX "TheaterApplication_theaterSlug_idx" ON "TheaterApplication"("theaterSlug");

-- CreateIndex
CREATE UNIQUE INDEX "TheaterApplication_email_status_key" ON "TheaterApplication"("email", "status");

-- CreateIndex
CREATE INDEX "User_theaterId_idx" ON "User"("theaterId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_theaterId_fkey" FOREIGN KEY ("theaterId") REFERENCES "Theater"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TheaterApplication" ADD CONSTRAINT "TheaterApplication_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationDocument" ADD CONSTRAINT "ApplicationDocument_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "TheaterApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
