import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

// Point to the correct SQLite database file in the project root
const adapter = new PrismaBetterSqlite3({
  url: "file:./dev.db"
});
const prisma = new PrismaClient({ adapter });

const setups = [
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

const errors = [
  "逆势交易（Fading a strong trend）",
  "盈利单但是提前离场(Letting a winning trade turn to losing)",
  "突破/反转判断错误（BW/OL）",
  "错误的信号k线（Wrong Signal bar）",
  "限价单入场（limit entry）",
  "k线未收线就入场（Entry mid-bar）",
  "在阻力位买入，在支撑位卖出（buy into resist, sell into support）",
  "浮亏加仓（scaling into a losing position）.",
  "市场背景理解错误（bad structure reading）"
];

const exits = [
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

const symbols = [
  "BTC",
  "ETH",
  "SOL",
  "EURUSD",
  "GOLD"
];

async function main() {
  console.log("Seeding setups...");
  for (const name of setups) {
    await prisma.setupOption.upsert({
      where: { name },
      update: {},
      create: { name }
    });
  }

  console.log("Seeding errors...");
  for (const name of errors) {
    await prisma.errorOption.upsert({
      where: { name },
      update: {},
      create: { name }
    });
  }

  console.log("Seeding exit reasons...");
  for (const name of exits) {
    await prisma.exitOption.upsert({
      where: { name },
      update: {},
      create: { name }
    });
  }

  console.log("Seeding symbol options...");
  for (const name of symbols) {
    await prisma.symbolOption.upsert({
      where: { name },
      update: {},
      create: { name }
    });
  }

  console.log("Seeding completed successfully!");
}

main()
  .catch(e => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
