/*
  Warnings:

  - You are about to drop the `DiaryEntry` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "Trade" ADD COLUMN "stopLoss" REAL;
ALTER TABLE "Trade" ADD COLUMN "takeProfit" REAL;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "DiaryEntry";
PRAGMA foreign_keys=on;
