import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import * as XLSX from "xlsx";

// Helper: Convert JS Date to Excel Date string YYYY-MM-DD
function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function GET() {
  try {
    // 1. Fetch data from DB
    const trades = await prisma.trade.findMany({ orderBy: { date: "asc" } });
    const configSetups = await prisma.setupOption.findMany({ orderBy: { name: "asc" } });
    const configErrors = await prisma.errorOption.findMany({ orderBy: { name: "asc" } });
    const configExits = await prisma.exitOption.findMany({ orderBy: { name: "asc" } });

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
      const sidebarIdx = rIdx - 1; // 0-based row index (rIdx - 1)
      
      // Sidebar Row 4 (rIdx=4, index=3): Headers
      if (rIdx === 4) {
        row[17] = "入场原因\n（可以自己定义）"; // R
        row[18] = "盈亏金额"; // S
        row[19] = "胜率"; // T
        row[20] = "使用次数"; // U
      }

      // Sidebar Rows 5 to 27 (rIdx=5..27): Setup statistics
      if (rIdx >= 5 && rIdx <= 27) {
        const setupIdx = rIdx - 5;
        // Seed option name or default setup
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
        row[17] = "趋势延续（Continuation）"; // R
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

    // 3. Write workbook to buffer
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    // 4. Return as file attachment response
    return new Response(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="trading-log-export.xlsx"'
      }
    });

  } catch (error: any) {
    console.error("Excel export failed:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
