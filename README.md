# TradeFlow Pro

个人交易复盘与自律分析系统。记录交易细节、多维度行为分析、发现交易模式。

## 功能

- **仪表盘** — 总盈亏、胜率、盈利因子等 KPI 概览，资金曲线走势
- **交易日志** — 录入交易记录，支持截图标注、Excel 批量导入、内联编辑
- **行为分析** — 按入场理由、错误类型、离场理由、交易类型、品类、方向六维度统计
- **设置** — 管理入场理由、错误原因、离场理由、交易品类选项
- **暗色主题** — 支持亮色/暗色切换

## 技术栈

- **框架**: Next.js 16 (App Router)
- **UI**: React 19 + Tailwind CSS v4
- **图表**: Recharts v3
- **数据库**: SQLite + Prisma
- **图标**: Lucide React

## 快速开始

```bash
# 安装依赖
npm install

# 初始化数据库（首次）
npx prisma generate
npx prisma db push

# 启动开发服务器
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)

## 项目结构

```
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── actions.ts          # Server Actions (CRUD)
│   │   ├── api/                # API routes (截图上传/导出)
│   │   ├── globals.css         # 全局样式 + 暗色主题变量
│   │   └── page.tsx            # 入口页面
│   ├── components/
│   │   ├── TradingApp.tsx      # 主应用组件
│   │   ├── Dashboard.tsx       # 仪表盘
│   │   ├── Journal.tsx         # 交易日志
│   │   ├── Analysis.tsx        # 行为分析
│   │   ├── Settings.tsx        # 设置
│   │   ├── types.ts            # TypeScript 类型定义
│   │   └── hooks/              # 自定义 Hooks
│   └── lib/
│       └── db.ts               # 数据库连接
├── prisma/
│   └── schema.prisma           # Prisma 数据模型
├── scripts/
│   ├── init-db.sh              # 数据库初始化（预置数据导入）
│   └── deploy.sh               # 生产部署脚本
└── data/
    ├── dev.db                  # SQLite 数据库（由 .gitignore 忽略）
    └── screenshots/            # 截图存储目录
```

## 数据模型

| 模型 | 说明 |
|------|------|
| Trade | 交易记录（日期、方向、进出场价格、盈亏、状态等） |
| SetupOption | 入场理由选项 |
| ErrorOption | 错误原因选项 |
| ExitOption | 离场理由选项 |
| SymbolOption | 交易品类选项 |
| TradeScreenshot | 交易截图 |

## 环境变量

```bash
DATABASE_URL="file:./dev.db"
```

## 生产部署


### 手动部署

```bash
# 1. 安装依赖（仅生产环境）
npm ci --omit=dev

# 2. 初始化数据库（首次）
bash scripts/init-db.sh

# 3. 生成 Prisma Client
npx prisma generate

# 4. 构建
npm run build

# 5. 启动
npm start
```


## 开发命令

```bash
npm run dev       # 启动开发服务器
npm run build     # 生产构建
npm start         # 启动生产服务器
```

## Nginx 反代

项目自带 Nginx 配置文件 `nginx/tradeflow.conf`，安装步骤：

```bash
# 1. 修改域名（可选）
sed -i 's/tradeflow.example.com/你的域名或 IP/' nginx/tradeflow.conf

# 2. 复制到 Nginx 配置目录
sudo cp nginx/tradeflow.conf /etc/nginx/conf.d/tradeflow.conf

# 3. 验证配置并重载
sudo nginx -t && sudo systemctl reload nginx
```

配置说明：

| 配置项 | 值 | 说明 |
|--------|------|------|
| 监听端口 | 80 | HTTP |
| 反代地址 | 127.0.0.1:3000 | Next.js 生产服务 |
| 上传限制 | 50M | 截图上传大小上限 |
| WebSocket | 启用 | HMR 和 SSE 支持 |

如果需要 HTTPS，推荐用 Let's Encrypt：

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d tradeflow.example.com
```
