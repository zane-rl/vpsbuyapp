-- AlterTable
ALTER TABLE "VpsServer" ADD COLUMN "stoppedAt" DATETIME;

-- 旧数据没有独立的下线时间，用最后更新时间作为最接近的兼容值。
UPDATE "VpsServer" SET "stoppedAt" = "updatedAt" WHERE "status" = 'stopped' AND "stoppedAt" IS NULL;

-- CreateTable
CREATE TABLE "CustomerAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "usernameKey" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "sessionVersion" INTEGER NOT NULL DEFAULT 1,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CustomerAccount_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CustomerManagedUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT,
    "note" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CustomerManagedUser_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VpnNodeAssignment" (
    "managedUserId" TEXT NOT NULL,
    "vpnNodeId" TEXT NOT NULL,
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("managedUserId", "vpnNodeId"),
    CONSTRAINT "VpnNodeAssignment_managedUserId_fkey" FOREIGN KEY ("managedUserId") REFERENCES "CustomerManagedUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VpnNodeAssignment_vpnNodeId_fkey" FOREIGN KEY ("vpnNodeId") REFERENCES "VpnNode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomerAccount_customerId_key" ON "CustomerAccount"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerAccount_usernameKey_key" ON "CustomerAccount"("usernameKey");

-- CreateIndex
CREATE INDEX "CustomerManagedUser_customerId_idx" ON "CustomerManagedUser"("customerId");

-- CreateIndex
CREATE INDEX "VpnNodeAssignment_vpnNodeId_idx" ON "VpnNodeAssignment"("vpnNodeId");
