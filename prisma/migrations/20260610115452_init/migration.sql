-- CreateTable
CREATE TABLE "SetupOption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "ErrorOption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "ExitOption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Trade" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DiaryEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "ruleExecuted" BOOLEAN NOT NULL,
    "emotionStable" BOOLEAN NOT NULL,
    "recordKept" BOOLEAN NOT NULL,
    "prepared" BOOLEAN NOT NULL,
    "noFomo" BOOLEAN NOT NULL,
    "pnl" REAL NOT NULL,
    "remarks" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "SetupOption_name_key" ON "SetupOption"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ErrorOption_name_key" ON "ErrorOption"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ExitOption_name_key" ON "ExitOption"("name");

-- CreateIndex
CREATE UNIQUE INDEX "DiaryEntry_date_key" ON "DiaryEntry"("date");
