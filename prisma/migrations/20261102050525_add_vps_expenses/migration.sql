-- CreateTable
CREATE TABLE "VpsExpense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vpsId" TEXT NOT NULL,
    "expenseType" TEXT NOT NULL,
    "expenseDate" DATETIME NOT NULL,
    "costUsd" REAL NOT NULL DEFAULT 0,
    "paidCny" REAL NOT NULL DEFAULT 0,
    "paymentProof" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VpsExpense_vpsId_fkey" FOREIGN KEY ("vpsId") REFERENCES "VpsServer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "VpsExpense_vpsId_expenseDate_idx" ON "VpsExpense"("vpsId", "expenseDate");
