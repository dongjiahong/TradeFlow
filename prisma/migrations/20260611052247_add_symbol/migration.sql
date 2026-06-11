-- CreateTable
CREATE TABLE "SymbolOption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Trade" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "setup" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "exitReason" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "positionSize" REAL NOT NULL,
    "entryPrice" REAL NOT NULL,
    "exitPrice1" REAL NOT NULL,
    "exitPrice2" REAL,
    "pnl" REAL NOT NULL,
    "status" TEXT NOT NULL,
    "remarks" TEXT,
    "notes" TEXT,
    "errorReason" TEXT,
    "symbol" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Trade" ("createdAt", "date", "direction", "entryPrice", "errorReason", "exitPrice1", "exitPrice2", "exitReason", "id", "notes", "pnl", "positionSize", "remarks", "setup", "status", "type", "updatedAt") SELECT "createdAt", "date", "direction", "entryPrice", "errorReason", "exitPrice1", "exitPrice2", "exitReason", "id", "notes", "pnl", "positionSize", "remarks", "setup", "status", "type", "updatedAt" FROM "Trade";
DROP TABLE "Trade";
ALTER TABLE "new_Trade" RENAME TO "Trade";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "SymbolOption_name_key" ON "SymbolOption"("name");
