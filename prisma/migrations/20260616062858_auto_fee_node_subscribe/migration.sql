/*
  Warnings:

  - You are about to drop the column `currency` on the `VpsBalanceLog` table. All the data in the column will be lost.
  - You are about to drop the column `topupAmount` on the `VpsBalanceLog` table. All the data in the column will be lost.
  - You are about to drop the column `balanceCurrency` on the `VpsServer` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "VpnNode" ADD COLUMN "subscribeUrl" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_VpsBalanceLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vpsId" TEXT NOT NULL,
    "logDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "topupUsd" REAL NOT NULL DEFAULT 0,
    "paidCny" REAL NOT NULL DEFAULT 0,
    "balanceAfter" REAL NOT NULL DEFAULT 0,
    "paymentProof" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VpsBalanceLog_vpsId_fkey" FOREIGN KEY ("vpsId") REFERENCES "VpsServer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_VpsBalanceLog" ("balanceAfter", "createdAt", "id", "logDate", "note", "paymentProof", "vpsId") SELECT "balanceAfter", "createdAt", "id", "logDate", "note", "paymentProof", "vpsId" FROM "VpsBalanceLog";
DROP TABLE "VpsBalanceLog";
ALTER TABLE "new_VpsBalanceLog" RENAME TO "VpsBalanceLog";
CREATE INDEX "VpsBalanceLog_vpsId_idx" ON "VpsBalanceLog"("vpsId");
CREATE TABLE "new_VpsServer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "customerId" TEXT,
    "providerId" TEXT,
    "billingType" TEXT NOT NULL DEFAULT 'term',
    "autoCycle" TEXT,
    "cyclePriceUsd" REAL,
    "balanceAmount" REAL,
    "cpu" TEXT,
    "ram" TEXT,
    "disk" TEXT,
    "bandwidth" TEXT,
    "region" TEXT,
    "ipAddress" TEXT,
    "os" TEXT,
    "purchaseDate" DATETIME NOT NULL,
    "expiryDate" DATETIME,
    "purchaseCostUsd" REAL NOT NULL DEFAULT 0,
    "purchasePaidCny" REAL NOT NULL DEFAULT 0,
    "paymentProof" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VpsServer_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "VpsServer_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_VpsServer" ("autoCycle", "balanceAmount", "bandwidth", "billingType", "cpu", "createdAt", "customerId", "disk", "expiryDate", "id", "ipAddress", "name", "notes", "os", "paymentProof", "providerId", "purchaseCostUsd", "purchaseDate", "purchasePaidCny", "ram", "region", "status", "updatedAt") SELECT "autoCycle", "balanceAmount", "bandwidth", "billingType", "cpu", "createdAt", "customerId", "disk", "expiryDate", "id", "ipAddress", "name", "notes", "os", "paymentProof", "providerId", "purchaseCostUsd", "purchaseDate", "purchasePaidCny", "ram", "region", "status", "updatedAt" FROM "VpsServer";
DROP TABLE "VpsServer";
ALTER TABLE "new_VpsServer" RENAME TO "VpsServer";
CREATE INDEX "VpsServer_expiryDate_idx" ON "VpsServer"("expiryDate");
CREATE INDEX "VpsServer_customerId_idx" ON "VpsServer"("customerId");
CREATE INDEX "VpsServer_providerId_idx" ON "VpsServer"("providerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
