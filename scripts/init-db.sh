#!/bin/bash
# 首次部署：初始化数据库并导入预置数据
# 用法: bash scripts/init-db.sh

set -e
export DATABASE_URL="${DATABASE_URL:-file:./data/dev.db}"

DB_FILE="${DB_FILE:-data/dev.db}"
DB_DIR="$(dirname "$DB_FILE")"

echo "📦 初始化数据库: $DB_FILE"
mkdir -p "$DB_DIR"

# 如果数据库已存在，先备份
if [ -f "$DB_FILE" ]; then
  BACKUP="${DB_FILE}.backup.$(date +%Y%m%d%H%M%S)"
  echo "⚠️  数据库已存在，备份到 ${BACKUP}"
  cp "$DB_FILE" "$BACKUP"
fi

sqlite3 "$DB_FILE" <<'SQL'
-- 预置入场理由
INSERT OR IGNORE INTO SetupOption (name) VALUES ('交易区间内三推反转');
INSERT OR IGNORE INTO SetupOption (name) VALUES ('交易区间内2ndleg陷阱');
INSERT OR IGNORE INTO SetupOption (name) VALUES ('交易区间确认突破');
INSERT OR IGNORE INTO SetupOption (name) VALUES ('AIL，AIS首次回调');
INSERT OR IGNORE INTO SetupOption (name) VALUES ('牛旗或熊旗');
INSERT OR IGNORE INTO SetupOption (name) VALUES ('三推楔形、信号k');
INSERT OR IGNORE INTO SetupOption (name) VALUES ('三推楔形、双底');
INSERT OR IGNORE INTO SetupOption (name) VALUES ('嵌套三推楔形');
INSERT OR IGNORE INTO SetupOption (name) VALUES ('嵌套楔形、高潮、信号K');
INSERT OR IGNORE INTO SetupOption (name) VALUES ('三重底');
INSERT OR IGNORE INTO SetupOption (name) VALUES ('三推楔形、双顶');
INSERT OR IGNORE INTO SetupOption (name) VALUES ('交易区间上下沿、信号K');
INSERT OR IGNORE INTO SetupOption (name) VALUES ('交易区间内2ndleg、趋势线');
INSERT OR IGNORE INTO SetupOption (name) VALUES ('EMA20、H/L1');
INSERT OR IGNORE INTO SetupOption (name) VALUES ('交易区间顶低限价单');
INSERT OR IGNORE INTO SetupOption (name) VALUES ('交易区间内2ndleg陷阱、信号K');
INSERT OR IGNORE INTO SetupOption (name) VALUES ('强趋势50%回调');
INSERT OR IGNORE INTO SetupOption (name) VALUES ('三推楔形、EMA20、信号K');
INSERT OR IGNORE INTO SetupOption (name) VALUES ('抛物线楔形、信号K');
INSERT OR IGNORE INTO SetupOption (name) VALUES ('趋势线、信号K');
INSERT OR IGNORE INTO SetupOption (name) VALUES ('H1、L1');
INSERT OR IGNORE INTO SetupOption (name) VALUES ('H2、L2');
INSERT OR IGNORE INTO SetupOption (name) VALUES ('不知道为什么开仓');

-- 预置错误原因
INSERT INTO ErrorOption (name) VALUES ('逆势交易');
INSERT INTO ErrorOption (name) VALUES ('盈利单但是提前离场');
INSERT INTO ErrorOption (name) VALUES ('突破/反转判断错误');
INSERT INTO ErrorOption (name) VALUES ('错误的信号k线');
INSERT INTO ErrorOption (name) VALUES ('限价单入场');
INSERT INTO ErrorOption (name) VALUES ('k线未收线就入场');
INSERT INTO ErrorOption (name) VALUES ('在阻力位买入，在支撑位卖出');
INSERT INTO ErrorOption (name) VALUES ('浮亏加仓');
INSERT INTO ErrorOption (name) VALUES ('市场背景理解错误');

-- 预置离场理由
INSERT INTO ExitOption (name) VALUES ('回测三推起点');
INSERT INTO ExitOption (name) VALUES ('止盈太远');
INSERT INTO ExitOption (name) VALUES ('推保本');
INSERT INTO ExitOption (name) VALUES ('EMA20');
INSERT INTO ExitOption (name) VALUES ('移动止盈');
INSERT INTO ExitOption (name) VALUES ('止损触发（Stop out）');
INSERT INTO ExitOption (name) VALUES ('觉得有逆势压提前止盈');
INSERT INTO ExitOption (name) VALUES ('1倍MM');
INSERT INTO ExitOption (name) VALUES ('2倍MM');
INSERT INTO ExitOption (name) VALUES ('趋势线');

-- 预置交易品类
INSERT INTO SymbolOption (name) VALUES ('BTCUSDT');
INSERT INTO SymbolOption (name) VALUES ('XAUUSD');
INSERT INTO SymbolOption (name) VALUES ('SPY');
INSERT INTO SymbolOption (name) VALUES ('QQQ');
INSERT INTO SymbolOption (name) VALUES ('ES1');

-- 预置截图目录
SQL

mkdir -p data/screenshots

echo "✅ 数据库初始化完成"
echo "   入场理由: 23 项"
echo "   错误原因: 9 项"
echo "   离场理由: 10 项"
echo "   交易品类: 5 项"
