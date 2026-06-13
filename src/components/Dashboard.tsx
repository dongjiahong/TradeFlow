"use client";

import { TrendingUp, DollarSign, PieChart, AlertTriangle } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart as RePieChart, Pie, LabelList
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
}

// KPI Card definition
const kpis = [
  { key: "netProfit", label: "总盈亏", icon: DollarSign, format: (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}`, color: (v: number) => v >= 0 ? "text-trade-green" : "text-trade-red", bg: (v: number) => v >= 0 ? "bg-trade-green-dim" : "bg-trade-red-dim" },
  { key: "winRate", label: "胜率", icon: PieChart, format: (v: number) => `${v.toFixed(1)}%`, color: () => "text-[var(--text-primary)]", bg: () => "bg-[var(--color-bg-elevated)]" },
  { key: "profitFactor", label: "盈利因子", icon: TrendingUp, format: (v: number) => `${v.toFixed(2)}`, color: (v: number) => v >= 1.5 ? "text-trade-green" : v >= 1 ? "text-[var(--text-primary)]" : "text-trade-red", bg: (v: number) => v >= 1.5 ? "bg-trade-green-dim" : v >= 1 ? "bg-[var(--color-bg-elevated)]" : "bg-trade-red-dim" },
  { key: "avgWin", label: "平均盈利", icon: DollarSign, format: (v: number) => `+${v.toFixed(2)}`, color: () => "text-trade-green", bg: () => "bg-trade-green-dim" },
  { key: "avgLoss", label: "平均亏损", icon: DollarSign, format: (v: number) => `-${v.toFixed(2)}`, color: () => "text-trade-red", bg: () => "bg-trade-red-dim" },
  { key: "pnlRatio", label: "盈亏比", icon: TrendingUp, format: (v: number) => `${v.toFixed(2)}`, color: (v: number) => v >= 2 ? "text-trade-green" : v >= 1 ? "text-[var(--text-primary)]" : "text-trade-red", bg: (v: number) => v >= 2 ? "bg-trade-green-dim" : v >= 1 ? "bg-[var(--color-bg-elevated)]" : "bg-trade-red-dim" },
];

export default function Dashboard({
  netProfit, winRate, profitFactor, avgWin, avgLoss, pnlRatio,
  capitalCurveData, setupChartData, errorPieData, COLORS,
  dashboardReady
}: DashboardProps) {
  const kpisData = [netProfit, winRate, profitFactor, avgWin, avgLoss, pnlRatio];

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((kpi, idx) => (
          <div key={kpi.key} className="p-3 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[var(--text-muted)] uppercase">{kpi.label}</span>
              <div className={`${kpi.bg(kpisData[idx])} p-1.5 rounded`}>
                <kpi.icon size={14} className={kpi.color(kpisData[idx])} />
              </div>
            </div>
            <h3 className={`text-xl font-bold tracking-tight tabular-nums ${kpi.color(kpisData[idx])}`}>
              {kpi.format(kpisData[idx])}
            </h3>
          </div>
        ))}
      </div>

      {/* Capital Curve */}
      <div className="p-5 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] transition-colors">
        <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wide mb-4">资金曲线</h3>
        <div className="h-72 w-full">
          {capitalCurveData.length > 0 ? (
            dashboardReady ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={capitalCurveData}>
                <defs>
                  <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" stroke="#52525b" fontSize={11} tickLine={false} />
                <YAxis stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v >= 0 ? "+" : ""}${v}`} />
                <Area type="monotone" dataKey="pnl" name="累计盈亏" stroke="#22c55e" strokeWidth={2} fillOpacity={1} fill="url(#colorPnl)" />
              </AreaChart>
            </ResponsiveContainer>
            ) : <div className="flex h-full items-center justify-center text-[var(--text-muted)]">加载图表中...</div>
          ) : <div className="flex h-full items-center justify-center text-[var(--text-muted)]">暂无交易记录，无法显示盈亏曲线。</div>
          }
        </div>
      </div>

      {/* Bottom row: setups + errors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-5 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] transition-colors">
          <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wide mb-4">入场理由盈利</h3>
          <div className="h-72 w-full">
            {setupChartData.length > 0 ? (
              dashboardReady ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={setupChartData.slice(0, 10)} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.04)" />
                  <XAxis type="number" stroke="#52525b" fontSize={10} tickFormatter={(v) => `${v >= 0 ? "+" : ""}${v}`} />
                  <YAxis type="category" dataKey="name" stroke="#52525b" fontSize={10} width={100}
                    tickFormatter={(v) => v.length > 10 ? v.substring(0, 10) + "..." : v} />
                  <Bar dataKey="pnl" name="总盈亏" radius={[0, 4, 4, 0]}>
                    {setupChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? "#22c55e" : "#ef4444"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              ) : <div className="flex h-full items-center justify-center text-[var(--text-muted)]">加载图表中...</div>
            ) : <div className="flex h-full items-center justify-center text-[var(--text-muted)]">暂无数据。</div>
            }
          </div>
        </div>

        <div className="p-5 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] transition-colors">
          <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wide mb-4">错误分布</h3>
          <div className="h-72 flex flex-col md:flex-row items-center justify-center gap-6">
            {errorPieData.length > 0 ? (
              dashboardReady ? (
              <>
                <div className="h-56 w-56 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie data={errorPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={72} paddingAngle={2} dataKey="value">
                        {errorPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto w-full text-xs">
                  {errorPieData.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-3 p-1.5 rounded hover:bg-[var(--color-bg-hover)] transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                        <span className="text-[var(--text-secondary)] truncate">{item.name}</span>
                      </div>
                      <span className="font-semibold text-[var(--text-primary)] tabular-nums">{item.value} 次</span>
                    </div>
                  ))}
                </div>
              </>
              ) : <div className="flex h-full items-center justify-center text-[var(--text-muted)]">加载图表中...</div>
            ) : <div className="flex h-full items-center justify-center text-[var(--text-muted)] text-sm">目前没有错误记录。完美。</div>
            }
          </div>
        </div>
      </div>
    </div>
  );
}
