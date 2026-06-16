-- CreateTable
CREATE TABLE "VpsServer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "cpu" TEXT,
    "ram" TEXT,
    "disk" TEXT,
    "bandwidth" TEXT,
    "region" TEXT,
    "ipAddress" TEXT,
    "os" TEXT,
    "purchaseDate" DATETIME NOT NULL,
    "expiryDate" DATETIME NOT NULL,
    "purchaseCostUsd" REAL NOT NULL DEFAULT 0,
    "purchasePaidCny" REAL NOT NULL DEFAULT 0,
    "clientPaymentCny" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "VpsRenewal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vpsId" TEXT NOT NULL,
    "renewDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "previousExpiry" DATETIME NOT NULL,
    "newExpiry" DATETIME NOT NULL,
    "costUsd" REAL NOT NULL DEFAULT 0,
    "paidCny" REAL NOT NULL DEFAULT 0,
    "clientPaymentCny" REAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VpsRenewal_vpsId_fkey" FOREIGN KEY ("vpsId") REFERENCES "VpsServer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VpnNode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vpsId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "protocol" TEXT NOT NULL,
    "address" TEXT,
    "port" INTEGER,
    "config" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VpnNode_vpsId_fkey" FOREIGN KEY ("vpsId") REFERENCES "VpsServer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "VpsServer_expiryDate_idx" ON "VpsServer"("expiryDate");

-- CreateIndex
CREATE INDEX "VpsRenewal_vpsId_idx" ON "VpsRenewal"("vpsId");

-- CreateIndex
CREATE INDEX "VpnNode_vpsId_idx" ON "VpnNode"("vpsId");
