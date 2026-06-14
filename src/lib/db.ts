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

// --- DATABASE CLASS ---
class TradingLogDatabase extends Dexie {
  trades!: Table<Trade, string>;
  setupOptions!: Table<OptionItem, number>;
  errorOptions!: Table<OptionItem, number>;
  exitOptions!: Table<OptionItem, number>;
  symbolOptions!: Table<OptionItem, number>;
  screenshots!: Table<ScreenshotRecord, string>;

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
    const tradesToInsert: Trade[] = [];
    const importedSetups = new Set<string>();
    const importedSymbols = new Set<string>();

    // Row 1 is labels, Row 2 is headers, data starts from Row 3 (index 2)
    for (let i = 2; i < logsJson.length; i++) {
      const row = logsJson[i];
      if (!row || row.length === 0) continue;

      const dateVal = row[0]; // A
      const entryPriceVal = row[8]; // I
      const exitPrice1Val = row[9]; // J

      if (!dateVal || entryPriceVal === undefined || entryPriceVal === null) {
        continue;
      }

      // Convert date
      let parsedDateStr = "";
      if (dateVal instanceof Date) {
        parsedDateStr = dateVal.toISOString().split("T")[0];
      } else {
        const d = Date.parse(String(dateVal));
        if (!isNaN(d)) {
          parsedDateStr = new Date(d).toISOString().split("T")[0];
        } else {
          continue;
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
      const errorReason = row[15] ? String(row[15]) : null;

      // Calculate PnL and status
      const pnl = calculateTradePnl(direction, positionSize, entryPrice, exitPrice1, exitPrice2);
      const status = getTradeStatus(pnl);
      const rr = calculateRR(direction, entryPrice, null, null); // Stop loss / take profit values are not in standard Excel cols directly, or we set them to null.

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
        stopLoss: null,
        takeProfit: null,
        exitPrice1,
        exitPrice2,
        pnl,
        rr,
        status,
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
export async function exportExcelData() {
  try {
    // 1. Fetch data from DB
    const trades = await db.trades.orderBy("date").toArray();
    const configSetups = await db.setupOptions.orderBy("name").toArray();
    const configErrors = await db.errorOptions.orderBy("name").toArray();
    const configExits = await db.exitOptions.orderBy("name").toArray();

    // 2. Initialize new workbook
    const wb = XLSX.utils.book_new();

    // --- SHEET 1: 日志 ---
    const logsData: any[][] = [];
    const maxRows = Math.max(trades.length + 3, 500); // Generate at least 500 rows to match original template bounds
    
    // Row 1 (Index 0)
    const row1: any[] = new Array(26).fill(null);
    row1[1] = "若判断错误，只需等待。除非可反向操作";
    row1[16] = "接受亏损，然后继续";
    row1[21] = "总共胜率";
    row1[22] = "总盈亏";
    row1[23] = "平均盈利金额";
    row1[24] = "平均亏损金额";
    row1[25] = "盈亏比";
    logsData.push(row1);

    // Row 2 (Index 1)
    const row2: any[] = new Array(26).fill(null);
    row2[0] = "日期";
    row2[1] = "备注";
    row2[2] = "入场理由";
    row2[3] = "类型";
    row2[4] = "离场理由/方式";
    row2[5] = "补充说明";
    row2[6] = "仓位大小\n（填数字）";
    row2[7] = "方向";
    row2[8] = "入场价格";
    row2[9] = "离场价格1";
    row2[10] = "离场价格2";
    row2[11] = "盈亏情况\n（会自动计算）";
    row2[12] = "盈亏状态\n（会自动计算）";
    row2[13] = "累计盈亏\n（会自动计算）";
    row2[14] = "品类";
    row2[15] = "错误原因";
    row2[16] = "隐";
    row2[17] = "限";
    row2[18] = "离";
    row2[19] = "止";
    row2[20] = "记";
    // Formulas in row 2 (V2, W2, X2, Y2, Z2)
    row2[21] = { t: "n", f: `COUNTIF($M$3:$M$${maxRows},"win")/(COUNTIF($M$3:$M$${maxRows},"win")+COUNTIF($M$3:$M$${maxRows},"lose"))` };
    row2[22] = { t: "n", f: `SUM($L$3:$L$${maxRows})` };
    row2[23] = { t: "n", f: `AVERAGEIF(L$3:L$${maxRows},">0")` };
    row2[24] = { t: "n", f: `AVERAGEIF(L$3:L$${maxRows},"<0")` };
    row2[25] = { t: "n", f: `V2/-W2` }; // Win rate stats
    logsData.push(row2);

    // Populate rows 3 to maxRows
    for (let rIdx = 3; rIdx <= maxRows; rIdx++) {
      const row: any[] = new Array(26).fill(null);
      const tradeIdx = rIdx - 3;
      const trade = trades[tradeIdx];

      if (trade) {
        row[0] = formatDate(trade.date);
        row[1] = trade.remarks || "";
        row[2] = trade.setup;
        row[3] = trade.type;
        row[4] = trade.exitReason;
        row[5] = trade.notes || "";
        row[6] = trade.positionSize;
        row[7] = trade.direction;
        row[8] = trade.entryPrice;
        row[9] = trade.exitPrice1;
        row[10] = trade.exitPrice2 || null;
        row[14] = trade.symbol || "";
        row[15] = trade.errorReason || "";
      }

      // Calculated cells (Col L=11, Col M=12, Col N=13)
      row[11] = {
        t: "n",
        f: `IF(ISBLANK(K${rIdx}),IF(H${rIdx}="Long",(J${rIdx}-I${rIdx})*G${rIdx},(I${rIdx}-J${rIdx})*G${rIdx}),IF(H${rIdx}="Long",(J${rIdx}-I${rIdx})*(G${rIdx}/2)+(K${rIdx}-I${rIdx})*(G${rIdx}/2),(I${rIdx}-J${rIdx})*(G${rIdx}/2)+(I${rIdx}-K${rIdx})*(G${rIdx}/2)))`
      };
      row[12] = {
        t: "s",
        f: `_xlfn.IFS(L${rIdx}>0,"win",L${rIdx}<0,"lose",L${rIdx}=0,"BE")`
      };
      row[13] = rIdx === 3 
        ? { t: "n", f: `L${rIdx}` } 
        : { t: "n", f: `L${rIdx}+N${rIdx-1}` };

      // --- SIDEBAR STRUCTURES (Col R to Z) ---
      // Sidebar Row 4 (rIdx=4): Headers
      if (rIdx === 4) {
        row[17] = "入场原因\n（可以自己定义）"; // R
        row[18] = "盈亏金额"; // S
        row[19] = "胜率"; // T
        row[20] = "使用次数"; // U
      }

      // Sidebar Rows 5 to 27 (rIdx=5..27): Setup statistics
      if (rIdx >= 5 && rIdx <= 27) {
        const setupIdx = rIdx - 5;
        const setupName = configSetups[setupIdx]?.name || "";
        if (setupName) {
          row[17] = setupName; // R
          row[18] = { t: "n", f: `SUMIF(C$3:C$${maxRows},R${rIdx},L$3:L$${maxRows})` }; // S
          row[19] = { t: "n", f: `IFERROR(COUNTIFS(C$3:C$${maxRows},R${rIdx},M$3:M$${maxRows},"win")/COUNTIF(C$3:C$${maxRows},R${rIdx}),0)` }; // T
          row[20] = { t: "n", f: `COUNTIF(C$3:C$${maxRows},R${rIdx})` }; // U
        }
      }

      // Static classification notes in W24:Z35
      if (rIdx === 24) {
        row[23] = "做多"; // X
        row[24] = "横盘"; // Y
        row[25] = "做空"; // Z
      }
      if (rIdx === 25) {
        row[22] = "上涨"; // W
        row[23] = "回调后的第二次进场信号\n, 首次突破通道, 突破前高后产生了更高的高点, 第二次回踩缺口k线, 突破测试"; // X
        row[24] = "交易区间"; // Y
        row[25] = "W结构, W 结构突破后的首次回调"; // Z
      }
      if (rIdx === 26) {
        row[22] = "横盘"; // W
        row[23] = "突破"; // X
        row[24] = "假突破"; // Y
        row[25] = "突破"; // Z
      }
      if (rIdx === 27) {
        row[22] = "下跌"; // W
        row[23] = "W结构, W 结构突破后的首次回调"; // X
        row[24] = "交易区间"; // Y
        row[25] = "回调后的第二次进场信号\n, 首次突破通道, 突破前高后产生了更高的高点, 第二次回踩缺口k线, 突破测试"; // Z
      }
      if (rIdx === 29) {
        row[22] = "突破"; // W
        row[23] = "收敛三角旗形"; // X
        row[24] = "当前趋势强势延续"; // Y
        row[25] = "回调"; // Z
      }
      if (rIdx === 30) {
        row[22] = "假突破"; // W
        row[23] = "突破后反转"; // X
        row[24] = "反转k"; // Y
        row[25] = "深度回调"; // Z
      }
      if (rIdx === 31) {
        row[22] = "趋势转换"; // W
        row[23] = "双底/双顶"; // X
        row[24] = "窄交易区间"; // Y
        row[25] = "反转失败+第二次入场信号失效"; // Z
      }
      if (rIdx === 32) {
        row[23] = "首次回调"; // X
        row[25] = "首次反转"; // Z
      }
      if (rIdx === 33) {
        row[25] = "假突破"; // Z
      }

      // Sidebar Row 34 (rIdx=34): Trade type statistics header
      if (rIdx === 34) {
        row[17] = "类型"; // R
        row[18] = "盈亏金额"; // S
        row[19] = "胜率"; // T
        row[20] = "使用次数"; // U
        row[23] = "突破失败"; // X
        row[25] = "开盘区间"; // Z
      }

      // Sidebar Row 35 to 38: Trade type statistics
      if (rIdx === 35) {
        row[17] = "趋势延续"; // R
        row[18] = { t: "n", f: `SUMIF(D$3:D$${maxRows},R35,L$3:L$${maxRows})` }; // S
        row[19] = { t: "n", f: `IFERROR(COUNTIFS(D$3:D$${maxRows},R35,M$3:M$${maxRows},"win")/COUNTIF(D$3:D$${maxRows},R35),0)` }; // T
        row[20] = { t: "n", f: `COUNTIF(D$3:D$${maxRows},R35)` }; // U
        row[25] = "多周期共振"; // Z
      }
      if (rIdx === 36) {
        row[17] = "反转（Reversal）"; // R
        row[18] = { t: "n", f: `SUMIF(D$3:D$${maxRows},R36,L$3:L$${maxRows})` }; // S
        row[19] = { t: "n", f: `IFERROR(COUNTIFS(D$3:D$${maxRows},R36,M$3:M$${maxRows},"win")/COUNTIF(D$3:D$${maxRows},R36),0)` }; // T
        row[20] = { t: "n", f: `COUNTIF(D$3:D$${maxRows},R36)` }; // U
      }
      if (rIdx === 37) {
        row[17] = "突破（BO）"; // R
        row[18] = { t: "n", f: `SUMIF(D$3:D$${maxRows},R37,L$3:L$${maxRows})` }; // S
        row[19] = { t: "n", f: `IFERROR(COUNTIFS(D$3:D$${maxRows},R37,M$3:M$${maxRows},"win")/COUNTIF(D$3:D$${maxRows},R37),0)` }; // T
        row[20] = { t: "n", f: `COUNTIF(D$3:D$${maxRows},R37)` }; // U
      }
      if (rIdx === 38) {
        row[17] = "假突破（fBO）"; // R
        row[18] = { t: "n", f: `SUMIF(D$3:D$${maxRows},R38,L$3:L$${maxRows})` }; // S
        row[19] = { t: "n", f: `IFERROR(COUNTIFS(D$3:D$${maxRows},R38,M$3:M$${maxRows},"win")/COUNTIF(D$3:D$${maxRows},R38),0)` }; // T
        row[20] = { t: "n", f: `COUNTIF(D$3:D$${maxRows},R38)` }; // U
      }

      logsData.push(row);
    }

    const logsSheet = XLSX.utils.aoa_to_sheet(logsData);
    XLSX.utils.book_append_sheet(wb, logsSheet, "日志");

    // --- SHEET 2: 错误类型 ---
    const errorsData: any[][] = [];
    errorsData.push(["错误原因", "计数", null, "离场理由"]); // Row 1

    const errorCount = Math.max(configErrors.length, configExits.length, 10);
    for (let i = 0; i < errorCount; i++) {
      const row: any[] = [null, null, null, null];
      
      const err = configErrors[i];
      if (err) {
        const rIdx = i + 2;
        row[0] = err.name;
        row[1] = { t: "n", f: `COUNTIF(日志!$P$3:$P$${maxRows}, 错误类型!A${rIdx})` };
      }
      
      const exitReason = configExits[i];
      if (exitReason) {
        row[3] = exitReason.name;
      }
      
      errorsData.push(row);
    }

    const errorsSheet = XLSX.utils.aoa_to_sheet(errorsData);
    XLSX.utils.book_append_sheet(wb, errorsSheet, "错误类型");

    // 3. Write workbook to array and trigger client-side download
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = "trading-log-export.xlsx";
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    return { success: true };
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

