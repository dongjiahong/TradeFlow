import Dexie, { type Table } from "dexie";
import * as XLSX from "xlsx";

// --- TYPES ---
export interface Trade {
  id: string;
  date: string; // ISO string (YYYY-MM-DD or full ISO)
  remarks: string | null;
  setup: string;
  type: string;
  exitReason: string;
  notes: string | null;
  positionSize: number;
  direction: string;
  entryPrice: number;
  stopLoss: number | null;
  takeProfit: number | null;
  exitPrice1: number;
  exitPrice2: number | null;
  pnl: number;
  rr: number | null;
  status: "win" | "lose" | "BE";
  symbol: string;
  errorReason: string | null;
  screenshots?: { id: string; filename: string }[];
}

export interface OptionItem {
  id?: number;
  name: string;
}

export interface ScreenshotRecord {
  id: string;
  tradeId: string;
  filename: string;
  blob: Blob;
}

export interface TradingRule {
  id?: number;
  content: string;
  type: "do" | "dont";
  createdAt: number;
}

// --- DATABASE CLASS ---
class TradingLogDatabase extends Dexie {
  trades!: Table<Trade, string>;
  setupOptions!: Table<OptionItem, number>;
  errorOptions!: Table<OptionItem, number>;
  exitOptions!: Table<OptionItem, number>;
  symbolOptions!: Table<OptionItem, number>;
  screenshots!: Table<ScreenshotRecord, string>;
  tradingRules!: Table<TradingRule, number>;

  constructor() {
    super("TradingLogDatabase");
    this.version(1).stores({
      trades: "id, date",
      setupOptions: "++id, &name",
      errorOptions: "++id, &name",
      exitOptions: "++id, &name",
      symbolOptions: "++id, &name",
      screenshots: "id, tradeId",
    });
    this.version(2).stores({
      trades: "id, date",
      setupOptions: "++id, &name",
      errorOptions: "++id, &name",
      exitOptions: "++id, &name",
      symbolOptions: "++id, &name",
      screenshots: "id, tradeId",
      tradingRules: "++id, type, createdAt"
    });
  }
}

export const db = new TradingLogDatabase();

// --- INITIAL SEED DATA ---
const defaultSetups = [
  "交易区间内三推反转",
  "交易区间内2ndleg陷阱",
  "交易区间确认突破",
  "AIL，AIS首次回调",
  "牛旗或熊旗",
  "三推楔形、信号k",
  "三推楔形、双底",
  "嵌套三推楔形",
  "嵌套楔形、高潮、信号K",
  "三重底",
  "三推楔形、双顶",
  "交易区间上下沿、信号K",
  "交易区间内2ndleg、趋势线",
  "EMA20、H/L1",
  "交易区间顶低限价单",
  "交易区间内2ndleg陷阱、信号K",
  "强趋势50%回调",
  "三推楔形、EMA20、信号K",
  "抛物线楔形、信号K",
  "趋势线、信号K",
  "H1、L1",
  "H2、L2",
  "不知道为什么开仓"
];

const defaultErrors = [
  "逆势交易",
  "盈利单但是提前离场",
  "突破/反转判断错误",
  "错误的信号k线",
  "限价单入场",
  "k线未收线就入场",
  "在阻力位买入，在支撑位卖出",
  "浮亏加仓",
  "市场背景理解错误"
];

const defaultExits = [
  "回测三推起点",
  "止盈太远",
  "推保本",
  "EMA20",
  "移动止盈",
  "止损触发（Stop out）",
  "觉得有逆势压提前止盈",
  "1倍MM",
  "2倍MM",
  "趋势线"
];

const defaultSymbols = [
  "BTCUSDT",
  "XAUUSD",
  "SPY",
  "QQQ",
  "ES1"
];

// Seed default data on database population
db.on("populate", () => {
  db.setupOptions.bulkAdd(defaultSetups.map(name => ({ name })));
  db.errorOptions.bulkAdd(defaultErrors.map(name => ({ name })));
  db.exitOptions.bulkAdd(defaultExits.map(name => ({ name })));
  db.symbolOptions.bulkAdd(defaultSymbols.map(name => ({ name })));
});

// --- HELPER FUNCTIONS (MATCHING ORIGINAL FORMULAS) ---
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

const getTradeStatus = (pnl: number): "win" | "lose" | "BE" => {
  if (pnl > 0) return "win";
  if (pnl < 0) return "lose";
  return "BE";
};

const calculateRR = (
  direction: string,
  entryPrice: number,
  stopLoss: number | null | undefined,
  takeProfit: number | null | undefined
): number | null => {
  if (!stopLoss || !takeProfit || !entryPrice) return null;

  let risk: number, reward: number;
  if (direction === "Long") {
    risk = entryPrice - stopLoss;
    reward = takeProfit - entryPrice;
  } else {
    risk = stopLoss - entryPrice;
    reward = entryPrice - takeProfit;
  }

  if (risk <= 0 || reward <= 0) return null;
  return parseFloat((reward / risk).toFixed(2));
};

// Helper: Convert JS Date to Excel Date string YYYY-MM-DD
function formatDate(dateVal: Date | string): string {
  const date = typeof dateVal === "string" ? new Date(dateVal) : dateVal;
  if (isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// --- TRADES ACTIONS ---
export async function getTrades(): Promise<Trade[]> {
  try {
    const rawTrades = await db.trades.orderBy("date").toArray();
    // Fetch and attach screenshots meta to trades
    const trades: Trade[] = [];
    for (const t of rawTrades) {
      const shots = await db.screenshots.where("tradeId").equals(t.id).toArray();
      trades.push({
        ...t,
        screenshots: shots.map(s => ({ id: s.id, filename: s.filename })),
      });
    }
    return trades;
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
  stopLoss?: number | null;
  takeProfit?: number | null;
  exitPrice1: number;
  exitPrice2?: number | null;
  remarks?: string;
  notes?: string;
  errorReason?: string;
  symbol?: string;
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
    const rr = calculateRR(data.direction, data.entryPrice, data.stopLoss, data.takeProfit);
    const id = self.crypto.randomUUID();

    const trade: Trade = {
      id,
      date: data.date,
      setup: data.setup,
      type: data.type,
      exitReason: data.exitReason,
      direction: data.direction,
      positionSize: data.positionSize,
      entryPrice: data.entryPrice,
      stopLoss: data.stopLoss ?? null,
      takeProfit: data.takeProfit ?? null,
      exitPrice1: data.exitPrice1,
      exitPrice2: data.exitPrice2 || null,
      pnl,
      rr,
      status,
      remarks: data.remarks || null,
      notes: data.notes || null,
      errorReason: data.errorReason || null,
      symbol: data.symbol || "",
    };

    await db.trades.add(trade);
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
    stopLoss?: number | null;
    takeProfit?: number | null;
    exitPrice1: number;
    exitPrice2?: number | null;
    remarks?: string;
    notes?: string;
    errorReason?: string;
    symbol?: string;
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
    const rr = calculateRR(data.direction, data.entryPrice, data.stopLoss, data.takeProfit);

    const updateData: Partial<Trade> = {
      date: data.date,
      setup: data.setup,
      type: data.type,
      exitReason: data.exitReason,
      direction: data.direction,
      positionSize: data.positionSize,
      entryPrice: data.entryPrice,
      stopLoss: data.stopLoss ?? null,
      takeProfit: data.takeProfit ?? null,
      exitPrice1: data.exitPrice1,
      exitPrice2: data.exitPrice2 || null,
      pnl,
      rr,
      status,
      remarks: data.remarks || null,
      notes: data.notes || null,
      errorReason: data.errorReason || null,
    };

    if (data.symbol !== undefined) {
      updateData.symbol = data.symbol;
    }

    await db.trades.update(id, updateData);
    const trade = await db.trades.get(id);
    return { success: true, trade };
  } catch (error: any) {
    console.error("Error updating trade:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteTrade(id: string) {
  try {
    await db.transaction("rw", [db.trades, db.screenshots], async () => {
      // Clean up screenshot blobs from database
      await db.screenshots.where("tradeId").equals(id).delete();
      // Delete trade
      await db.trades.delete(id);
    });
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting trade:", error);
    return { success: false, error: error.message };
  }
}

// --- CONFIG OPTIONS ACTIONS ---
export async function getConfigOptions() {
  try {
    const setups = await db.setupOptions.orderBy("name").toArray();
    const errors = await db.errorOptions.orderBy("name").toArray();
    const exits = await db.exitOptions.orderBy("name").toArray();
    const symbols = await db.symbolOptions.orderBy("name").toArray();
    return { setups, errors, exits, symbols };
  } catch (error) {
    console.error("Error fetching config options:", error);
    return { setups: [], errors: [], exits: [], symbols: [] };
  }
}

export async function addSymbolOption(name: string) {
  try {
    const id = await db.symbolOptions.add({ name });
    const option = { id, name };
    return { success: true, option };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteSymbolOption(id: string | number) {
  try {
    const numericId = typeof id === "string" ? parseInt(id, 10) : id;
    await db.symbolOptions.delete(numericId);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function addSetupOption(name: string) {
  try {
    const id = await db.setupOptions.add({ name });
    const option = { id, name };
    return { success: true, option };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteSetupOption(id: string | number) {
  try {
    const numericId = typeof id === "string" ? parseInt(id, 10) : id;
    await db.setupOptions.delete(numericId);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function addErrorOption(name: string) {
  try {
    const id = await db.errorOptions.add({ name });
    const option = { id, name };
    return { success: true, option };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteErrorOption(id: string | number) {
  try {
    const numericId = typeof id === "string" ? parseInt(id, 10) : id;
    await db.errorOptions.delete(numericId);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function addExitOption(name: string) {
  try {
    const id = await db.exitOptions.add({ name });
    const option = { id, name };
    return { success: true, option };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteExitOption(id: string | number) {
  try {
    const numericId = typeof id === "string" ? parseInt(id, 10) : id;
    await db.exitOptions.delete(numericId);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- SCREENSHOT MANAGEMENT ---
export async function uploadScreenshot(tradeId: string, file: File) {
  try {
    const trade = await db.trades.get(tradeId);
    if (!trade) {
      return { success: false, error: "Trade not found" };
    }

    const id = self.crypto.randomUUID();
    await db.screenshots.add({
      id,
      tradeId,
      filename: file.name,
      blob: file, // File is subclass of Blob, safe to store directly
    });

    return { success: true, screenshot: { id, filename: file.name } };
  } catch (error: any) {
    console.error("Screenshot upload failed:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteScreenshot(screenshotId: string) {
  try {
    await db.screenshots.delete(screenshotId);
    return { success: true };
  } catch (error: any) {
    console.error("Screenshot delete failed:", error);
    return { success: false, error: error.message };
  }
}

// --- FRONTEND EXCEL IMPORT ACTION ---
export async function importExcelData(base64Data: string) {
  try {
    // 1. Read the base64 Excel data
    const workbook = XLSX.read(base64Data, { type: "base64", cellDates: true });

    // 2. Process "日志" sheet (Trades)
    const logsSheet = workbook.Sheets["日志"];
    if (!logsSheet) {
      return { success: false, error: "未找到名称为 '日志' 的工作表" };
    }

    const logsJson: any[] = XLSX.utils.sheet_to_json(logsSheet, { header: 1 });
    if (logsJson.length < 2) {
      return { success: false, error: "Excel 文件中没有足够的数据行" };
    }

    // Find the header row (typically row 0 or row 1)
    let headerRowIdx = -1;
    let headers: string[] = [];

    for (let r = 0; r < Math.min(logsJson.length, 5); r++) {
      const row = logsJson[r];
      if (row && row.some((cell: any) => String(cell).includes("日期"))) {
        headerRowIdx = r;
        headers = row.map((h: any) => String(h || "").trim());
        break;
      }
    }

    if (headerRowIdx === -1) {
      return { success: false, error: "无法识别的 Excel 格式：未找到‘日期’列头" };
    }

    // Map column header name to its index
    const headerMap: { [key: string]: number } = {};
    headers.forEach((h, idx) => {
      if (h) headerMap[h] = idx;
    });

    // Helper to extract value by matching field header names
    const getVal = (row: any[], fieldNames: string[], defaultValue: any = null) => {
      for (const name of fieldNames) {
        if (headerMap[name] !== undefined) {
          const val = row[headerMap[name]];
          if (val !== undefined && val !== null) return val;
        }
        const key = Object.keys(headerMap).find(k => k.includes(name));
        if (key !== undefined) {
          const val = row[headerMap[key]];
          if (val !== undefined && val !== null) return val;
        }
      }
      return defaultValue;
    };

    const tradesToInsert: Trade[] = [];
    const importedSetups = new Set<string>();
    const importedSymbols = new Set<string>();

    for (let i = headerRowIdx + 1; i < logsJson.length; i++) {
      const row = logsJson[i];
      if (!row || row.length === 0) continue;

      const dateVal = getVal(row, ["日期"]);
      const entryPriceVal = getVal(row, ["入场价格", "价格"]);

      if (!dateVal || entryPriceVal === undefined || entryPriceVal === null) {
        continue;
      }

      // Convert date
      let parsedDateOnly = "";
      if (dateVal instanceof Date) {
        parsedDateOnly = dateVal.toISOString().split("T")[0];
      } else {
        const d = Date.parse(String(dateVal));
        if (!isNaN(d)) {
          parsedDateOnly = new Date(d).toISOString().split("T")[0];
        } else {
          continue;
        }
      }
      const h = String(Math.floor(i / 3600) % 24).padStart(2, '0');
      const m = String(Math.floor(i / 60) % 60).padStart(2, '0');
      const s = String(i % 60).padStart(2, '0');
      const parsedDateStr = `${parsedDateOnly}T${h}:${m}:${s}`;

      const remarks = String(getVal(row, ["备注", "补充说明"], "")).trim();
      const setup = String(getVal(row, ["入场理由", "入场原因"], "其他")).trim();
      const type = String(getVal(row, ["类型"], "未知")).trim();
      const exitReason = String(getVal(row, ["离场理由/方式", "离场理由"], "止损")).trim();
      const notes = String(getVal(row, ["复盘说明", "补充说明", "备注"], "")).trim();
      const positionSize = parseFloat(getVal(row, ["仓位大小", "仓位"], 0)) || 0;
      const direction = String(getVal(row, ["方向"], "Long")).trim();
      const entryPrice = parseFloat(entryPriceVal) || 0;
      const exitPrice1 = parseFloat(getVal(row, ["离场价格1", "离场价格"], 0)) || 0;
      const exitPrice2 = getVal(row, ["离场价格2", "离场价格二"]) !== null 
        ? parseFloat(getVal(row, ["离场价格2", "离场价格二"])) 
        : null;
      const stopLoss = getVal(row, ["止损"]) !== null ? parseFloat(getVal(row, ["止损"])) : null;
      const takeProfit = getVal(row, ["止盈"]) !== null ? parseFloat(getVal(row, ["止盈"])) : null;
      
      const symbol = String(getVal(row, ["品类"], "")).trim();
      const errorReason = getVal(row, ["错误原因", "离场错误"]) ? String(getVal(row, ["错误原因", "离场错误"])) : null;

      // Prioritize directly exported PnL and Status, fall back to calculation if missing
      let pnl = parseFloat(getVal(row, ["盈亏", "盈亏情况"])) || 0;
      let status = getVal(row, ["状态", "盈亏状态"]);

      if (pnl === 0 && entryPrice > 0 && positionSize > 0) {
        pnl = calculateTradePnl(direction, positionSize, entryPrice, exitPrice1, exitPrice2);
      }
      if (!status || (status !== "win" && status !== "lose" && status !== "BE")) {
        status = getTradeStatus(pnl);
      }

      let rr = getVal(row, ["RR", "盈亏比"]) !== null ? parseFloat(getVal(row, ["RR", "盈亏比"])) : null;
      if (rr === null || isNaN(rr)) {
        rr = calculateRR(direction, entryPrice, stopLoss, takeProfit);
      }

      if (setup && setup !== "其他") {
        importedSetups.add(setup);
      }
      if (symbol) {
        importedSymbols.add(symbol);
      }

      tradesToInsert.push({
        id: self.crypto.randomUUID(),
        date: parsedDateStr,
        remarks: remarks || null,
        setup,
        type,
        exitReason,
        notes: notes || null,
        positionSize,
        direction,
        entryPrice,
        stopLoss,
        takeProfit,
        exitPrice1,
        exitPrice2,
        pnl,
        rr,
        status: status as "win" | "lose" | "BE",
        symbol,
        errorReason: errorReason || null,
      });
    }

    // 3. Write imported data to DB inside transaction
    await db.transaction("rw", [db.trades, db.setupOptions, db.symbolOptions, db.screenshots], async () => {
      // Save setup options if they are not in DB
      for (const setupName of importedSetups) {
        const exist = await db.setupOptions.where("name").equals(setupName).first();
        if (!exist) {
          await db.setupOptions.add({ name: setupName });
        }
      }

      // Save symbol options if they are not in DB
      for (const symbolName of importedSymbols) {
        const exist = await db.symbolOptions.where("name").equals(symbolName).first();
        if (!exist) {
          await db.symbolOptions.add({ name: symbolName });
        }
      }

      // Clear existing records
      await db.trades.clear();
      await db.screenshots.clear();

      // Bulk add new trades
      await db.trades.bulkAdd(tradesToInsert);
    });

    return {
      success: true,
      tradesCount: tradesToInsert.length,
      diaryCount: 0,
    };
  } catch (error: any) {
    console.error("Excel import failed:", error);
    return { success: false, error: error.message };
  }
}

// --- FRONTEND EXCEL EXPORT ACTION ---
export async function exportExcelData(startDate?: string, endDate?: string) {
  try {
    // 1. Fetch data from DB
    let trades = await db.trades.orderBy("date").toArray();

    // Filter by date range if provided
    if (startDate || endDate) {
      trades = trades.filter(trade => {
        const tradeDate = trade.date.split("T")[0]; // YYYY-MM-DD
        if (startDate && tradeDate < startDate) return false;
        if (endDate && tradeDate > endDate) return false;
        return true;
      });
    }

    if (trades.length === 0) {
      return { success: true, count: 0 };
    }

    // 2. Initialize new workbook
    const wb = XLSX.utils.book_new();

    // --- SHEET: 日志 ---
    const logsData: any[][] = [];
    
    // Headers
    const headers = [
      "日期",
      "品类",
      "方向",
      "入场理由",
      "类型",
      "仓位",
      "入场价格",
      "离场价格",
      "离场价格二",
      "止盈",
      "止损",
      "RR",
      "盈亏",
      "状态",
      "离场错误",
      "备注",
      "复盘说明"
    ];
    logsData.push(headers);

    // Populate rows
    for (const trade of trades) {
      const row: any[] = [
        formatDate(trade.date),
        trade.symbol || "",
        trade.direction || "",
        trade.setup || "",
        trade.type || "",
        trade.positionSize,
        trade.entryPrice,
        trade.exitPrice1,
        trade.exitPrice2 ?? "",
        trade.takeProfit ?? "",
        trade.stopLoss ?? "",
        trade.rr ?? "",
        trade.pnl,
        trade.status || "",
        trade.errorReason || "",
        trade.remarks || "",
        trade.notes || ""
      ];
      logsData.push(row);
    }

    const logsSheet = XLSX.utils.aoa_to_sheet(logsData);
    XLSX.utils.book_append_sheet(wb, logsSheet, "日志");

    // 3. Write workbook and download
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    
    let filename = "trading-log-export.xlsx";
    if (startDate && endDate) {
      filename = `trading-log-export_${startDate}_to_${endDate}.xlsx`;
    } else if (startDate) {
      filename = `trading-log-export_from_${startDate}.xlsx`;
    } else if (endDate) {
      filename = `trading-log-export_to_${endDate}.xlsx`;
    }
    
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    return { success: true, count: trades.length };
  } catch (error: any) {
    console.error("Excel export failed:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteTradesByDateRange(startDate: string, endDate: string) {
  try {
    // 找出符合日期范围的交易
    const tradesToDelete = await db.trades
      .where("date")
      .between(startDate, endDate, true, true)
      .toArray();
    
    const ids = tradesToDelete.map(t => t.id);
    if (ids.length === 0) {
      return { success: true, count: 0 };
    }

    await db.transaction("rw", [db.trades, db.screenshots], async () => {
      // 删除关联截图
      await db.screenshots.where("tradeId").anyOf(ids).delete();
      // 删除交易
      await db.trades.where("id").anyOf(ids).delete();
    });

    return { success: true, count: ids.length };
  } catch (error: any) {
    console.error("Error deleting trades by date range:", error);
    return { success: false, error: error.message };
  }
}

// --- TRADING RULES ACTIONS ---
export async function getTradingRules(): Promise<TradingRule[]> {
  try {
    return await db.tradingRules.orderBy("createdAt").toArray();
  } catch (error) {
    console.error("Failed to get trading rules:", error);
    return [];
  }
}

export async function addTradingRule(content: string, type: "do" | "dont"): Promise<TradingRule> {
  const rule: TradingRule = {
    content,
    type,
    createdAt: Date.now()
  };
  const id = await db.tradingRules.add(rule);
  return { ...rule, id };
}

export async function deleteTradingRule(id: number): Promise<void> {
  await db.tradingRules.delete(id);
}

