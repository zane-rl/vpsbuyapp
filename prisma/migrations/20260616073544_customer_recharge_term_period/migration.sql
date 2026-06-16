-- AlterTable
ALTER TABLE "VpsServer" ADD COLUMN "termPeriod" TEXT;

-- CreateTable
CREATE TABLE "CustomerRecharge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "amountUsd" REAL NOT NULL DEFAULT 0,
    "paidCny" REAL NOT NULL DEFAULT 0,
    "balanceAfter" REAL NOT NULL DEFAULT 0,
    "rechargeDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentProof" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomerRecharge_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CustomerRecharge_customerId_idx" ON "CustomerRecharge"("customerId");
