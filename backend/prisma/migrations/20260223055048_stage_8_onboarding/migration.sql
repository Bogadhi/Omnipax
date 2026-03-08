-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('GST', 'LICENSE', 'ID_PROOF');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "forcePasswordReset" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "TheatreApplication" (
    "id" TEXT NOT NULL,
    "theatreName" TEXT NOT NULL,
    "tenantSlug" TEXT NOT NULL,
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

    CONSTRAINT "TheatreApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationDocument" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TheatreApplication_email_idx" ON "TheatreApplication"("email");

-- CreateIndex
CREATE INDEX "TheatreApplication_theatreName_idx" ON "TheatreApplication"("theatreName");

-- CreateIndex
CREATE INDEX "TheatreApplication_status_idx" ON "TheatreApplication"("status");

-- CreateIndex
CREATE INDEX "TheatreApplication_tenantSlug_idx" ON "TheatreApplication"("tenantSlug");

-- CreateIndex
CREATE UNIQUE INDEX "TheatreApplication_email_status_key" ON "TheatreApplication"("email", "status");

-- CreateIndex
CREATE INDEX "ApplicationDocument_applicationId_idx" ON "ApplicationDocument"("applicationId");

-- AddForeignKey
ALTER TABLE "TheatreApplication" ADD CONSTRAINT "TheatreApplication_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationDocument" ADD CONSTRAINT "ApplicationDocument_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "TheatreApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
