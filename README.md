# TradeFlow Pro - 交易复盘与自律分析系统

个人交易复盘与自律分析系统。记录交易细节、多维度行为分析、发现交易模式。本系统为**纯前端单页应用 (SPA)**，所有数据与截图完全存储在用户浏览器的本地 **IndexedDB** 数据库中，不依赖任何后端服务器，保护交易数据私密安全。

## 🌟 功能

- **仪表盘** — 总盈亏、胜率、盈利因子等 KPI 概览，资金曲线走势。
- **交易日志** — 录入交易记录，支持复制/粘贴截图标注、内联快速编辑。
- **行为分析** — 按入场理由、错误类型、离场理由、交易类型、品类、方向六个维度统计胜率和盈利表现。
- **做单原则** — 录入做单的应做 (DO) 与忌做 (DON'T) 原则。支持在页面 Header 顶部通过下拉帘抽屉快速查阅，在其他页面也能随时警示自律。
- **AI 诊断复盘** — 结合本地存储 of OpenAI 协议 API 配置，在 Header 统计指标上悬停并点击，即可一键呼出 AI 交易教练对当前时段（今日、本周、本月、历史总计）进行深度诊断，结合做单原则对每笔交易进行纪律审计与风控盲点排查。
- **图文 PDF 报告导出** — 纯前端实现 html2canvas + jsPDF 方案，可将生成的 AI 报告一键导出为 A4 分页 PDF 文件，自动垂直排版内嵌交易清单以及本地 IndexedDB 截图，支持点击查看大图灯箱交互，且完全免疫 `oklch` 解析错误。
- **设置管理** — 自定义管理入场理由、错误原因、离场理由、交易品类选项。
- **数据导入导出** — 纯浏览器端实现数据的高效导入导出，支持导出为高级 Excel (`.xlsx`) 文件（**使用 `exceljs` 物理内嵌 IndexedDB 里的截图图片**），或从原 Excel 模板一键导入恢复历史记录。
- **暗色主题** — 支持根据系统偏好或手动切换亮色/暗色主题。

## 🛠️ 技术栈

- **构建工具**: Vite
- **UI 框架**: React 19 (TypeScript)
- **样式系统**: Tailwind CSS v4
- **图表库**: Recharts
- **本地数据库**: IndexedDB (基于 Dexie.js 强力驱动)
- **Excel 解析与导出**: SheetJS (xlsx) & exceljs (内嵌图片导出)
- **Markdown 渲染**: marked (支持 GFM 表格，纯 Hex 样式隔离以兼容 html2canvas)
- **PDF 导出**: html2canvas & jspdf
- **图标**: Lucide React

## 🚀 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 启动本地开发服务器
npm run dev
```

启动后，在浏览器中打开提示的本地地址（通常为 `http://localhost:5173`）即可运行。

## 📦 项目结构

```
├── index.html                  # 静态单页应用 HTML 入口
├── vite.config.ts              # Vite 配置文件
├── tsconfig.json               # TypeScript 配置
├── package.json                # 项目依赖及编译指令
├── nginx/
│   └── tradeflow.conf          # NGINX 生产静态部署配置文件
└── src/
    ├── main.tsx                # 应用启动挂载入口
    ├── App.tsx                 # SPA 主页面结构
    ├── globals.css             # 全局样式及暗色主题变量
    ├── components/
    │   ├── TradingApp.tsx      # 应用状态控制中心
    │   ├── Dashboard.tsx       # 仪表盘图表组件
    │   ├── Journal.tsx         # 交易日志表格及编辑表单
    │   ├── Analysis.tsx        # 行为统计与图表分析
    │   ├── Rules.tsx           # 做单原则配置与管理组件
    │   ├── AiReviewModal.tsx   # AI 交易教练复盘及高保真 PDF 导出组件
    │   ├── Settings.tsx        # 自定义设置及数据导入导出
    │   ├── ScreenshotImage.tsx # 截图按需异步加载与内存释放组件
    │   ├── types.ts            # 全局 TypeScript 接口声明
    │   └── hooks/              # 自定义状态管理 Hooks
    └── lib/
        └── db.ts               # Dexie 数据库实例及纯前端增删改查、Excel 导入导出接口
```

## 💾 备份与导入导出

1. **导出数据**：在“系统设置”页面中点击**“下载 Excel 文件”**。系统将把您在 IndexedDB 中的全部交易日志、自定义配置选项等自动打包成 Excel 格式并触发下载。**该导出版本会在 Excel 表格内物理嵌满您的图表截图**，并内建胜率、累计盈亏等完全相同的统计公式。
2. **导入数据**：在“系统设置”页面中点击**“选择并导入”**，上传导出的或原本的 Excel 模板。**注意：这会覆盖清空浏览器本地现有的交易记录！**

由于纯前端导出大图 Excel 可能需要时间进行 Buffer 写入，处理多图导出时请耐心等待浏览器下载提示。

## 🌐 生产部署 (NGINX 静态托管)

由于项目编译后是纯静态的 HTML/CSS/JS 文件，因此它可以被托管于任何静态服务器（如 Nginx、Vercel、Netlify、GitHub Pages 等）。

### NGINX 配置步骤：

1. **构建生产静态文件**：
   ```bash
   npm run build
   ```
   该指令会在项目根目录下生成 `dist/` 文件夹。

2. **配置 NGINX**：
   我们提供了为 SPA 优化的 NGINX 配置文件 [nginx/tradeflow.conf](file:///Users/lele/develop/vibe_coding/TradingLog/nginx/tradeflow.conf)。请修改配置文件中的 `server_name`（您的域名或 IP）以及 `root`（指向您服务器上 `dist` 目录的实际存放路径）。

3. **启用配置并重新载入 NGINX**：
   ```bash
   # 复制配置到 nginx 的 conf 目录
   sudo cp nginx/tradeflow.conf /etc/nginx/conf.d/tradeflow.conf
   
   # 检查语法并重载
   sudo nginx -t && sudo systemctl reload nginx
   ```
