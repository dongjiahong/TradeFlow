"use server";

import { prisma } from "../lib/db";
import { revalidatePath } from "next/cache";
import { rmSync } from "fs";
import path from "path";
import * as XLSX from "xlsx";

// Helper: Calculate trade PnL matching Excel formulas
const calculateTradePnl = (
  direction: string,
  positionSize: number,
  entryPrice: number,
  exitPrice1: number,
  exitPrice2?: number | null
): number => {
  if (exitPrice2 === undefined || exitPrice2 === null || isNaN(exitPrice2) || exitPrice2 === 0) {
    if (direction === "Long") {
      return (exitPrice1 - entryPrice) * positionSize;
    } else {
      return (entryPrice - exitPrice1) * positionSize;
    }
  } else {
    if (direction === "Long") {
      return (
        (exitPrice1 - entryPrice) * (positionSize / 2) +
        (exitPrice2 - entryPrice) * (positionSize / 2)
      );
    } else {
      return (
        (entryPrice - exitPrice1) * (positionSize / 2) +
        (entryPrice - exitPrice2) * (positionSize / 2)
      );
    }
  }
};

// Helper: Get status based on PnL
const getTradeStatus = (pnl: number): "win" | "lose" | "BE" => {
  if (pnl > 0) return "win";
  if (pnl < 0) return "lose";
  return "BE";
};

// --- TRADES ACTIONS ---

export async function getTrades() {
  try {
    return await prisma.trade.findMany({
      orderBy: { date: "asc" },
      include: { screenshots: { select: { id: true, filename: true } } },
    });
  } catch (error) {
    console.error("Error fetching trades:", error);
    return [];
  }
}

export async function createTrade(data: {
  date: string;
  setup: string;
  type: string;
  exitReason: string;
  direction: string;
  positionSize: number;
  entryPrice: number;
  exitPrice1: number;
  exitPrice2?: number | null;
  remarks?: string;
  notes?: string;
  errorReason?: string;
  symbol?: string;
  rr?: number | null;
}) {
  try {
    const pnl = calculateTradePnl(
      data.direction,
      data.positionSize,
      data.entryPrice,
      data.exitPrice1,
      data.exitPrice2
    );
    const status = getTradeStatus(pnl);

    const trade = await prisma.trade.create({
      data: {
        date: new Date(data.date),
        setup: data.setup,
        type: data.type,
        exitReason: data.exitReason,
        direction: data.direction,
        positionSize: data.positionSize,
        entryPrice: data.entryPrice,
        exitPrice1: data.exitPrice1,
        exitPrice2: data.exitPrice2 || null,
        pnl,
        rr: data.rr ?? null,
        status,
        remarks: data.remarks || null,
        notes: data.notes || null,
        errorReason: data.errorReason || null,
        symbol: data.symbol || "",
      },
    });

    revalidatePath("/");
    return { success: true, trade };
  } catch (error: any) {
    console.error("Error creating trade:", error);
    return { success: false, error: error.message };
  }
}

export async function updateTrade(
  id: string,
  data: {
    date: string;
    setup: string;
    type: string;
    exitReason: string;
    direction: string;
    positionSize: number;
    entryPrice: number;
    exitPrice1: number;
    exitPrice2?: number | null;
    remarks?: string;
    notes?: string;
    errorReason?: string;
    symbol?: string;
    rr?: number | null;
  }
) {
  try {
    const pnl = calculateTradePnl(
      data.direction,
      data.positionSize,
      data.entryPrice,
      data.exitPrice1,
      data.exitPrice2
    );
    const status = getTradeStatus(pnl);

    const trade = await prisma.trade.update({
      where: { id },
      data: {
        date: new Date(data.date),
        setup: data.setup,
        type: data.type,
        exitReason: data.exitReason,
        direction: data.direction,
        positionSize: data.positionSize,
        entryPrice: data.entryPrice,
        exitPrice1: data.exitPrice1,
        exitPrice2: data.exitPrice2 || null,
        pnl,
        rr: data.rr ?? null,
        status,
        remarks: data.remarks || null,
        notes: data.notes || null,
        errorReason: data.errorReason || null,
        symbol: data.symbol !== undefined ? data.symbol : undefined,
      },
    });

    revalidatePath("/");
    return { success: true, trade };
  } catch (error: any) {
    console.error("Error updating trade:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteTrade(id: string) {
  try {
    // Clean up screenshot files from disk
    try {
      const screenshotDir = path.join(process.cwd(), "data", "screenshots", id);
      rmSync(screenshotDir, { recursive: true, force: true });
    } catch {
      // Directory may not exist
    }

    await prisma.trade.delete({
      where: { id },
    });
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting trade:", error);
    return { success: false, error: error.message };
  }
}

// --- DIARY ACTIONS ---

export async function getDiaryEntries() {
  try {
    return await prisma.diaryEntry.findMany({
      orderBy: { date: "asc" },
    });
  } catch (error) {
    console.error("Error fetching diary entries:", error);
    return [];
  }
}

export async function upsertDiaryEntry(data: {
  date: string;
  ruleExecuted: boolean;
  emotionStable: boolean;
  recordKept: boolean;
  prepared: boolean;
  noFomo: boolean;
  pnl: number;
  remarks?: string;
}) {
  try {
    const targetDate = new Date(data.date);
    // Clear time part for day matching
    targetDate.setHours(0, 0, 0, 0);

    const entry = await prisma.diaryEntry.upsert({
      where: { date: targetDate },
      update: {
        ruleExecuted: data.ruleExecuted,
        emotionStable: data.emotionStable,
        recordKept: data.recordKept,
        prepared: data.prepared,
        noFomo: data.noFomo,
        pnl: data.pnl,
        remarks: data.remarks || null,
      },
      create: {
        date: targetDate,
        ruleExecuted: data.ruleExecuted,
        emotionStable: data.emotionStable,
        recordKept: data.recordKept,
        prepared: data.prepared,
        noFomo: data.noFomo,
        pnl: data.pnl,
        remarks: data.remarks || null,
      },
    });

    revalidatePath("/");
    return { success: true, entry };
  } catch (error: any) {
    console.error("Error upserting diary entry:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteDiaryEntry(id: string) {
  try {
    await prisma.diaryEntry.delete({
      where: { id },
    });
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting diary entry:", error);
    return { success: false, error: error.message };
  }
}

// --- CONFIG OPTIONS ACTIONS ---

export async function getConfigOptions() {
  try {
    const setups = await prisma.setupOption.findMany({ orderBy: { name: "asc" } });
    const errors = await prisma.errorOption.findMany({ orderBy: { name: "asc" } });
    const exits = await prisma.exitOption.findMany({ orderBy: { name: "asc" } });
    const symbols = await prisma.symbolOption.findMany({ orderBy: { name: "asc" } });
    return { setups, errors, exits, symbols };
  } catch (error) {
    console.error("Error fetching config options:", error);
    return { setups: [], errors: [], exits: [], symbols: [] };
  }
}

export async function addSymbolOption(name: string) {
  try {
    const option = await prisma.symbolOption.create({ data: { name } });
    revalidatePath("/");
    return { success: true, option };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteSymbolOption(id: string) {
  try {
    await prisma.symbolOption.delete({ where: { id } });
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function addSetupOption(name: string) {
  try {
    const option = await prisma.setupOption.create({ data: { name } });
    revalidatePath("/");
    return { success: true, option };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteSetupOption(id: string) {
  try {
    await prisma.setupOption.delete({ where: { id } });
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function addErrorOption(name: string) {
  try {
    const option = await prisma.errorOption.create({ data: { name } });
    revalidatePath("/");
    return { success: true, option };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteErrorOption(id: string) {
  try {
    await prisma.errorOption.delete({ where: { id } });
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function addExitOption(name: string) {
  try {
    const option = await prisma.exitOption.create({ data: { name } });
    revalidatePath("/");
    return { success: true, option };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteExitOption(id: string) {
  try {
    await prisma.exitOption.delete({ where: { id } });
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- EXCEL IMPORT ACTION ---

export async function importExcelData(base64Data: string) {
  try {
    const buffer = Buffer.from(base64Data, "base64");
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });

    // 1. Process "日志" sheet (Trades)
    const logsSheet = workbook.Sheets["日志"];
    if (!logsSheet) {
      return { success: false, error: "未找到名称为 '日志' 的工作表" };
    }

    const logsJson: any[] = XLSX.utils.sheet_to_json(logsSheet, { header: 1 });
    const tradesToInsert: any[] = [];
    const importedSetups = new Set<string>();
    const importedSymbols = new Set<string>();

    // Row 1 is labels, Row 2 is headers, data starts from Row 3 (index 2)
    for (let i = 2; i < logsJson.length; i++) {
      const row = logsJson[i];
      if (!row || row.length === 0) continue;

      // Col A: Date, Col I: Entry Price, Col G: Position Size, Col H: Direction
      const dateVal = row[0]; // A
      const entryPriceVal = row[8]; // I
      const exitPrice1Val = row[9]; // J

      if (!dateVal || entryPriceVal === undefined || entryPriceVal === null) {
        continue; // Skip rows without core trade data
      }

      // Convert date
      let parsedDate = new Date();
      if (dateVal instanceof Date) {
        parsedDate = dateVal;
      } else {
        const d = Date.parse(String(dateVal));
        if (!isNaN(d)) {
          parsedDate = new Date(d);
        } else {
          continue; // Skip invalid dates
        }
      }

      const remarks = row[1] ? String(row[1]) : "";
      const setup = row[2] ? String(row[2]) : "其他";
      const type = row[3] ? String(row[3]) : "未知";
      const exitReason = row[4] ? String(row[4]) : "止损";
      const notes = row[5] ? String(row[5]) : "";
      const positionSize = parseFloat(row[6]) || 0;
      const direction = String(row[7]).trim(); // "Long" or "Short"
      const entryPrice = parseFloat(row[8]) || 0;
      const exitPrice1 = parseFloat(row[9]) || 0;
      const exitPrice2 = row[10] !== undefined && row[10] !== null ? parseFloat(row[10]) : null;
      const symbol = row[14] ? String(row[14]).trim() : "";
      const errorReason = row[15] ? String(row[15]) : null; // Col P is index 15

      // Calculate PnL and status
      const pnl = calculateTradePnl(direction, positionSize, entryPrice, exitPrice1, exitPrice2);
      const status = getTradeStatus(pnl);

      if (setup && setup !== "其他") {
        importedSetups.add(setup);
      }
      if (symbol) {
        importedSymbols.add(symbol);
      }

      tradesToInsert.push({
        date: parsedDate,
        remarks,
        setup,
        type,
        exitReason,
        notes,
        positionSize,
        direction,
        entryPrice,
        exitPrice1,
        exitPrice2,
        pnl,
        status,
        symbol,
        errorReason,
      });
    }

    // 2. Process "别瞎搞日记本" sheet (Diary Entries)
    const diarySheet = workbook.Sheets["别瞎搞日记本"];
    const diaryEntriesToInsert: any[] = [];
    if (diarySheet) {
      const diaryJson: any[] = XLSX.utils.sheet_to_json(diarySheet, { header: 1 });
      // Row 1 is header, data starts from Row 2 (index 1)
      for (let i = 1; i < diaryJson.length; i++) {
        const row = diaryJson[i];
        if (!row || row.length === 0) continue;

        const dateVal = row[0]; // A
        if (!dateVal) continue;

        let parsedDate = new Date();
        if (dateVal instanceof Date) {
          parsedDate = dateVal;
        } else {
          const d = Date.parse(String(dateVal));
          if (!isNaN(d)) {
            parsedDate = new Date(d);
          } else {
            continue;
          }
        }
        parsedDate.setHours(0, 0, 0, 0);

        // Check columns (✅/❌ mapping to boolean)
        const checkVal = (val: any) => String(val).trim() === "✅";

        const ruleExecuted = checkVal(row[1]); // B
        const emotionStable = checkVal(row[2]); // C
        const recordKept = checkVal(row[3]); // D
        const prepared = checkVal(row[4]); // E
        const noFomo = checkVal(row[5]); // F
        const pnl = parseFloat(row[6]) || 0; // G
        const remarks = row[7] ? String(row[7]) : ""; // H

        diaryEntriesToInsert.push({
          date: parsedDate,
          ruleExecuted,
          emotionStable,
          recordKept,
          prepared,
          noFomo,
          pnl,
          remarks,
        });
      }
    }

    // Execute import in a database transaction
    await prisma.$transaction(async (tx) => {
      // 1. Save new setup options if imported setups are not in DB
      for (const setupName of importedSetups) {
        await tx.setupOption.upsert({
          where: { name: setupName },
          update: {},
          create: { name: setupName },
        });
      }

      // Save new symbol options if imported symbols are not in DB
      for (const symbolName of importedSymbols) {
        await tx.symbolOption.upsert({
          where: { name: symbolName },
          update: {},
          create: { name: symbolName },
        });
      }

      // 2. Delete existing trades and diary logs (clear for new import)
      // Alternatively, we could append, but a full sync is typically preferred when importing a template
      await tx.trade.deleteMany({});
      await tx.diaryEntry.deleteMany({});

      // 3. Insert trades
      for (const trade of tradesToInsert) {
        await tx.trade.create({ data: trade });
      }

      // 4. Insert diary entries
      for (const entry of diaryEntriesToInsert) {
        await tx.diaryEntry.upsert({
          where: { date: entry.date },
          update: entry,
          create: entry,
        });
      }
    });

    revalidatePath("/");
    return {
      success: true,
      tradesCount: tradesToInsert.length,
      diaryCount: diaryEntriesToInsert.length,
    };
  } catch (error: any) {
    console.error("Excel import failed:", error);
    return { success: false, error: error.message };
  }
}
