"use client";

import { TrendingUp, DollarSign, PieChart, AlertTriangle } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart as RePieChart, Pie
} from "recharts";

interface DashboardProps {
  netProfit: number;
  winRate: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  pnlRatio: number;
  capitalCurveData: { index: number; date: string; pnl: number; tradePnl: number }[];
  setupChartData: { name: string; pnl: number; winRate: number; count: number }[];
  errorPieData: { name: string; value: number }[];
  COLORS: string[];
  dashboardReady: boolean;
  darkMode: boolean;
}

export default function Dashboard({
  netProfit, winRate, profitFactor, avgWin, avgLoss, pnlRatio,
  capitalCurveData, setupChartData, errorPieData, COLORS,
  dashboardReady, darkMode
}: DashboardProps) {
  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* Main Stats Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="p-3 rounded-lg border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800/50 shadow-sm transition-colors duration-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-zinc-400 dark:text-zinc-400 uppercase">总盈亏</span>
            <div className={`p-1.5 rounded-lg ${netProfit >= 0 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400"}`}>
              <DollarSign size={14} />
            </div>
          </div>
          <h3 className={`text-xl md:text-2xl font-black tracking-tight ${netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
            {netProfit >= 0 ? "+" : ""}{netProfit.toFixed(2)}
          </h3>
          <p className="text-xxs text-zinc-400 mt-1">账户净资金变动</p>
        </div>

        <div className="p-3 rounded-lg border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800/50 shadow-sm transition-colors duration-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-zinc-400 dark:text-zinc-400 uppercase">总胜率</span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
              <PieChart size={14} />
            </div>
          </div>
          <h3 className="text-xl md:text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
            {winRate.toFixed(1)}%
          </h3>
          <p className="text-xxs text-zinc-400 mt-1">win / (win + lose)</p>
        </div>

        <div className="p-3 rounded-lg border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800/50 shadow-sm transition-colors duration-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-zinc-400 dark:text-zinc-400 uppercase">盈利因子</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
              <TrendingUp size={14} />
            </div>
          </div>
          <h3 className={`text-xl md:text-2xl font-black tracking-tight ${profitFactor >= 1.5 ? "text-emerald-600 dark:text-emerald-400" : profitFactor >= 1.0 ? "text-zinc-900 dark:text-zinc-50" : "text-rose-600 dark:text-rose-400"}`}>
            {profitFactor.toFixed(2)}
          </h3>
          <p className="text-xxs text-zinc-400 mt-1">总盈利 / 总亏损</p>
        </div>

        <div className="p-3 rounded-lg border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800/50 shadow-sm transition-colors duration-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-zinc-400 dark:text-zinc-400 uppercase">平均盈利</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <DollarSign size={14} />
            </div>
          </div>
          <h3 className="text-xl md:text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
            +{avgWin.toFixed(2)}
          </h3>
          <p className="text-xxs text-zinc-400 mt-1">每笔赢单均值</p>
        </div>

        <div className="p-3 rounded-lg border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800/50 shadow-sm transition-colors duration-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-zinc-400 dark:text-zinc-400 uppercase">平均亏损</span>
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <DollarSign size={14} />
            </div>
          </div>
          <h3 className="text-xl md:text-2xl font-black tracking-tight text-rose-600 dark:text-rose-400">
            -{avgLoss.toFixed(2)}
          </h3>
          <p className="text-xxs text-zinc-400 mt-1">每笔输单均值</p>
        </div>

        <div className="p-3 rounded-lg border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800/50 shadow-sm transition-colors duration-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-zinc-400 dark:text-zinc-400 uppercase">风险回报比</span>
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-500">
              <TrendingUp size={14} />
            </div>
          </div>
          <h3 className={`text-xl md:text-2xl font-black tracking-tight ${pnlRatio >= 2.0 ? "text-emerald-600 dark:text-emerald-400" : pnlRatio >= 1.0 ? "text-zinc-900 dark:text-zinc-50" : "text-rose-600 dark:text-rose-400"}`}>
            {pnlRatio.toFixed(2)}
          </h3>
          <p className="text-xxs text-zinc-400 mt-1">平均盈 / 平均亏</p>
        </div>
      </div>

      {/* Capital Curve Area Chart */}
      <div className="p-6 rounded-3xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800/50 shadow-sm transition-colors duration-200">
        <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-100 mb-4 flex items-center gap-2">
          <TrendingUp size={18} className="text-emerald-600 dark:text-emerald-400" />
          累计盈亏资金曲线
        </h3>
        <div className="h-80 w-full">
          {capitalCurveData.length > 0 ? (
            dashboardReady ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={capitalCurveData}>
                <defs>
                  <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#27272a" : "#f4f4f5"} />
                <XAxis dataKey="date" stroke={darkMode ? "#71717a" : "#a1a1aa"} fontSize={11} tickLine={false} />
                <YAxis stroke={darkMode ? "#71717a" : "#a1a1aa"} fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: darkMode ? "#18181b" : "#ffffff", borderColor: darkMode ? "#27272a" : "#e4e4e7", borderRadius: "8px", color: darkMode ? "#f4f4f5" : "#18181b" }} />
                <Area type="monotone" dataKey="pnl" name="累计盈亏" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorPnl)" />
              </AreaChart>
            </ResponsiveContainer>
            ) : <div className="flex h-full items-center justify-center text-zinc-400">加载图表中...</div>
          ) : <div className="flex h-full items-center justify-center text-zinc-400">暂无交易记录，无法显示盈亏曲线。</div>
          }
        </div>
      </div>

      {/* Chart breakdown subgrid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800/50 shadow-sm transition-colors duration-200">
          <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-100 mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-emerald-600 dark:text-emerald-400" />
            各入场理由盈利表现 (Top Setups)
          </h3>
          <div className="h-80 w-full">
            {setupChartData.length > 0 ? (
              dashboardReady ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={setupChartData.slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={darkMode ? "#27272a" : "#f4f4f5"} />
                  <XAxis type="number" stroke={darkMode ? "#71717a" : "#a1a1aa"} fontSize={10} />
                  <YAxis type="category" dataKey="name" stroke={darkMode ? "#71717a" : "#a1a1aa"} fontSize={10} width={110}
                    tickFormatter={(v) => v.length > 12 ? v.substring(0, 12) + "..." : v} />
                  <Tooltip contentStyle={{ backgroundColor: darkMode ? "#18181b" : "#ffffff", borderColor: darkMode ? "#27272a" : "#e4e4e7", borderRadius: "8px", color: darkMode ? "#f4f4f5" : "#18181b" }} />
                  <Bar dataKey="pnl" name="总盈亏">
                    {setupChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? "#059669" : "#dc2626"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              ) : <div className="flex h-full items-center justify-center text-zinc-400">加载图表中...</div>
            ) : <div className="flex h-full items-center justify-center text-zinc-400">暂无数据，请先录入交易。</div>
            }
          </div>
        </div>

        <div className="p-4 rounded-xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800/50 shadow-sm transition-colors duration-200">
          <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-100 mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-rose-600 dark:text-rose-400" />
            做错原因分布 (Error Breakdown)
          </h3>
          <div className="h-80 flex flex-col md:flex-row items-center justify-center gap-4">
            {errorPieData.length > 0 ? (
              dashboardReady ? (
              <>
                <div className="h-60 w-60 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie data={errorPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={3} dataKey="value">
                        {errorPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: darkMode ? "#18181b" : "#ffffff", borderColor: darkMode ? "#27272a" : "#e4e4e7", borderRadius: "8px", color: darkMode ? "#f4f4f5" : "#18181b" }} />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-2 max-h-60 overflow-y-auto w-full text-xs">
                  {errorPieData.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-4 p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800/50">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                        <span className="text-zinc-600 dark:text-zinc-300 truncate" title={item.name}>{item.name}</span>
                      </div>
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">{item.value} 次</span>
                    </div>
                  ))}
                </div>
              </>
              ) : <div className="flex h-full items-center justify-center text-zinc-400">加载图表中...</div>
            ) : <div className="flex h-full items-center justify-center text-zinc-400">目前非常完美，未记录任何错误记录！</div>
            }
          </div>
        </div>
      </div>
    </div>
  );
}
