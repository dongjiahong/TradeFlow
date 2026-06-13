#!/bin/bash
# TradeFlow Pro 完整部署脚本（含首次部署）
# 用法: bash scripts/deploy.sh [--first]
#   --first  首次部署时传入，会初始化数据库

export DATABASE_URL="file:./data/dev.db"

FIRST_DEPLOY=false
for arg in "$@"; do
  [ "$arg" = "--first" ] && FIRST_DEPLOY=true
done

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$APP_DIR"

echo "======================================"
echo "  TradeFlow Pro 部署"
echo "======================================"
echo "  目录: $APP_DIR"
echo "  Node: $(node --version)"
echo "  npm:  $(npm --version)"
echo "  DB:   data/dev.db"
echo "======================================"

# 1. 安装依赖
echo ""
echo "📦 1/5 安装依赖..."
npm ci --omit=dev 2>/dev/null || npm install

# 2. 首次部署：初始化数据库
if [ "$FIRST_DEPLOY" = true ]; then
  echo ""
  echo "🗄️  2/5 初始化数据库..."
  bash scripts/init-db.sh
else
  echo ""
  echo "⏭️  2/5 跳过数据库初始化（首次部署请用 --first）"
fi

# 3. 生成 Prisma Client
echo ""
echo "🔧 3/5 生成 Prisma Client..."
npx prisma generate

# 4. 构建生产版本
echo ""
echo "🏗️  4/5 构建生产版本..."
npm run build

# 5. 创建截图目录
echo ""
echo "📁 5/5 创建必要目录..."
mkdir -p data/screenshots

echo ""
echo "======================================"
echo "  ✅ 部署完成！"
echo "======================================"
echo ""
echo "启动服务: npm start"
echo "首次部署记得用: bash scripts/deploy.sh --first"
