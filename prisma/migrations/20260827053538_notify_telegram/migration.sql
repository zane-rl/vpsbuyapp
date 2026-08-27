-- CreateTable
CREATE TABLE "NotifySetting" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "botToken" TEXT,
    "daysAhead" INTEGER NOT NULL DEFAULT 5,
    "siteBaseUrl" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "NotifyRecipient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chatId" TEXT NOT NULL,
    "label" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "NotifyLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "notifyDate" DATETIME NOT NULL,
    "reason" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failCount" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NotifyLog_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "NotifyRecipient_chatId_key" ON "NotifyRecipient"("chatId");

-- CreateIndex
CREATE INDEX "NotifyLog_createdAt_idx" ON "NotifyLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotifyLog_customerId_notifyDate_key" ON "NotifyLog"("customerId", "notifyDate");
