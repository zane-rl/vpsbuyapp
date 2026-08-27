-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_NotifyRecipient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT,
    "chatId" TEXT NOT NULL,
    "label" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NotifyRecipient_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_NotifyRecipient" ("chatId", "createdAt", "enabled", "id", "label") SELECT "chatId", "createdAt", "enabled", "id", "label" FROM "NotifyRecipient";
DROP TABLE "NotifyRecipient";
ALTER TABLE "new_NotifyRecipient" RENAME TO "NotifyRecipient";
CREATE INDEX "NotifyRecipient_customerId_idx" ON "NotifyRecipient"("customerId");
CREATE UNIQUE INDEX "NotifyRecipient_customerId_chatId_key" ON "NotifyRecipient"("customerId", "chatId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
