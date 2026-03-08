-- AlterTable
ALTER TABLE "TicketScanLog" ADD COLUMN     "scanSource" TEXT NOT NULL DEFAULT 'STAFF';

-- CreateTable
CREATE TABLE "ScannerDevice" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "deviceKey" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tenantId" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScannerDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfflineScanQueue" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "scannedAt" TIMESTAMP(3) NOT NULL,
    "synced" BOOLEAN NOT NULL DEFAULT false,
    "result" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfflineScanQueue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScannerDevice_deviceKey_key" ON "ScannerDevice"("deviceKey");

-- CreateIndex
CREATE INDEX "ScannerDevice_tenantId_idx" ON "ScannerDevice"("tenantId");

-- CreateIndex
CREATE INDEX "OfflineScanQueue_ticketId_idx" ON "OfflineScanQueue"("ticketId");

-- CreateIndex
CREATE INDEX "OfflineScanQueue_deviceId_idx" ON "OfflineScanQueue"("deviceId");

-- CreateIndex
CREATE INDEX "OfflineScanQueue_tenantId_idx" ON "OfflineScanQueue"("tenantId");
