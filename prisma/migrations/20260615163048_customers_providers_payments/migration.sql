/*
  Warnings:

  - You are about to drop the column `clientPaymentCny` on the `VpsRenewal` table. All the data in the column will be lost.
  - You are about to drop the column `clientPaymentCny` on the `VpsServer` table. All the data in the column will be lost.
  - You are about to drop the column `provider` on the `VpsServer` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "Provider" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CustomerPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "amountCny" REAL NOT NULL DEFAULT 0,
    "payDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomerPayment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_VpsRenewal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vpsId" TEXT NOT NULL,
    "renewDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "previousExpiry" DATETIME NOT NULL,
    "newExpiry" DATETIME NOT NULL,
    "costUsd" REAL NOT NULL DEFAULT 0,
    "paidCny" REAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VpsRenewal_vpsId_fkey" FOREIGN KEY ("vpsId") REFERENCES "VpsServer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_VpsRenewal" ("costUsd", "createdAt", "id", "newExpiry", "notes", "paidCny", "previousExpiry", "renewDate", "vpsId") SELECT "costUsd", "createdAt", "id", "newExpiry", "notes", "paidCny", "previousExpiry", "renewDate", "vpsId" FROM "VpsRenewal";
DROP TABLE "VpsRenewal";
ALTER TABLE "new_VpsRenewal" RENAME TO "VpsRenewal";
CREATE INDEX "VpsRenewal_vpsId_idx" ON "VpsRenewal"("vpsId");
CREATE TABLE "new_VpsServer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "customerId" TEXT,
    "providerId" TEXT,
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
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VpsServer_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "VpsServer_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_VpsServer" ("bandwidth", "cpu", "createdAt", "disk", "expiryDate", "id", "ipAddress", "name", "notes", "os", "purchaseCostUsd", "purchaseDate", "purchasePaidCny", "ram", "region", "status", "updatedAt") SELECT "bandwidth", "cpu", "createdAt", "disk", "expiryDate", "id", "ipAddress", "name", "notes", "os", "purchaseCostUsd", "purchaseDate", "purchasePaidCny", "ram", "region", "status", "updatedAt" FROM "VpsServer";
DROP TABLE "VpsServer";
ALTER TABLE "new_VpsServer" RENAME TO "VpsServer";
CREATE INDEX "VpsServer_expiryDate_idx" ON "VpsServer"("expiryDate");
CREATE INDEX "VpsServer_customerId_idx" ON "VpsServer"("customerId");
CREATE INDEX "VpsServer_providerId_idx" ON "VpsServer"("providerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Provider_name_key" ON "Provider"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_name_key" ON "Customer"("name");

-- CreateIndex
CREATE INDEX "CustomerPayment_customerId_idx" ON "CustomerPayment"("customerId");
