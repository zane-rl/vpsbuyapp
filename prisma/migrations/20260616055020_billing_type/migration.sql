-- CreateTable
CREATE TABLE "VpsBalanceLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vpsId" TEXT NOT NULL,
    "logDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "topupAmount" REAL NOT NULL DEFAULT 0,
    "balanceAfter" REAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "paymentProof" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VpsBalanceLog_vpsId_fkey" FOREIGN KEY ("vpsId") REFERENCES "VpsServer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_VpsServer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "customerId" TEXT,
    "providerId" TEXT,
    "billingType" TEXT NOT NULL DEFAULT 'term',
    "autoCycle" TEXT,
    "balanceAmount" REAL,
    "balanceCurrency" TEXT,
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
INSERT INTO "new_VpsServer" ("bandwidth", "cpu", "createdAt", "customerId", "disk", "expiryDate", "id", "ipAddress", "name", "notes", "os", "paymentProof", "providerId", "purchaseCostUsd", "purchaseDate", "purchasePaidCny", "ram", "region", "status", "updatedAt") SELECT "bandwidth", "cpu", "createdAt", "customerId", "disk", "expiryDate", "id", "ipAddress", "name", "notes", "os", "paymentProof", "providerId", "purchaseCostUsd", "purchaseDate", "purchasePaidCny", "ram", "region", "status", "updatedAt" FROM "VpsServer";
DROP TABLE "VpsServer";
ALTER TABLE "new_VpsServer" RENAME TO "VpsServer";
CREATE INDEX "VpsServer_expiryDate_idx" ON "VpsServer"("expiryDate");
CREATE INDEX "VpsServer_customerId_idx" ON "VpsServer"("customerId");
CREATE INDEX "VpsServer_providerId_idx" ON "VpsServer"("providerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "VpsBalanceLog_vpsId_idx" ON "VpsBalanceLog"("vpsId");
