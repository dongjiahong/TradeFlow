"use client";

import { Filter, TrendingUp, AlertTriangle, ChevronRight, BarChart3, DollarSign } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, Cell, CartesianGrid, XAxis, YAxis, PieChart as RePieChart, Pie } from "recharts";

interface AnalysisProps {
  trades: any[];
  quickRange: "today" | "week" | "month" | "all";
  setQuickRange: React.Dispatch<React.SetStateAction<"today" | "week" | "month" | "all">>;
  dateRange: { start: string; end: string };
  setDateRange: React.Dispatch<React.SetStateAction<{ start: string; end: string }>>;
  analysisReady: boolean;
  darkMode: boolean;
}

interface StatRow {
  name: string;
  count: number;
  totalPnl: number;
  winRate: number;
  avgPnl: number;
}

export default function Analysis({
  trades, quickRange, setQuickRange, dateRange, setDateRange,
  analysisReady, darkMode
}: AnalysisProps) {
  // Filtered trades by date range
  const filtered = trades.filter(t => {
    if (!dateRange.start && !dateRange.end) return true;
    const d = new Date(t.date).toISOString().split("T")[0];
    return d >= dateRange.start && d <= dateRange.end;
  });

  // 1. 入场理由分析
  const setupMap = new Map<string, { count: number; wins: number; totalPnl: number; dirLong: number; dirShort: number; totalRr: number; rrCount: number }>();
  filtered.forEach(t => {
    const s = setupMap.get(t.setup) || { count: 0, wins: 0, totalPnl: 0, dirLong: 0, dirShort: 0, totalRr: 0, rrCount: 0 };
    s.count++; s.totalPnl += t.pnl;
    if (t.status === "win") s.wins++;
    if (t.direction === "Long") s.dirLong++; else s.dirShort++;
    if (t.rr !== null && t.rr > 0) { s.totalRr += t.rr; s.rrCount++; }
    setupMap.set(t.setup, s);
  });
  const setupStats = Array.from(setupMap.entries()).map(([name, s]) => ({
    name, count: s.count, totalPnl: parseFloat(s.totalPnl.toFixed(2)),
    winRate: parseFloat(((s.wins / s.count) * 100).toFixed(1)),
    avgPnl: parseFloat((s.totalPnl / s.count).toFixed(2)),
    avgRr: s.rrCount > 0 ? parseFloat((s.totalRr / s.rrCount).toFixed(2)) : 0,
    wins: s.wins, losses: s.count - s.wins,
    dirLong: s.dirLong, dirShort: s.dirShort
  })).sort((a, b) => b.count - a.count);

  // 2. 做错原因分析
  const errorMap = new Map<string, { count: number; wins: number; totalPnl: number }>();
  filtered.forEach(t => {
    if (!t.errorReason) return;
    const s = errorMap.get(t.errorReason) || { count: 0, wins: 0, totalPnl: 0 };
    s.count++; s.totalPnl += t.pnl;
    if (t.status === "win") s.wins++;
    errorMap.set(t.errorReason, s);
  });
  const errorStats = Array.from(errorMap.entries()).map(([name, s]) => ({
    name, count: s.count,
    winRate: parseFloat(((s.wins / s.count) * 100).toFixed(1)),
    avgPnl: parseFloat((s.totalPnl / s.count).toFixed(2)),
    totalPnl: parseFloat(s.totalPnl.toFixed(2))
  })).sort((a, b) => b.count - a.count);

  // 3. 离场理由分析
  const exitMap = new Map<string, { count: number; wins: number; totalPnl: number }>();
  filtered.forEach(t => {
    const s = exitMap.get(t.exitReason) || { count: 0, wins: 0, totalPnl: 0 };
    s.count++; s.totalPnl += t.pnl;
    if (t.status === "win") s.wins++;
    exitMap.set(t.exitReason, s);
  });
  const exitStats: StatRow[] = Array.from(exitMap.entries()).map(([name, s]) => ({
    name, count: s.count,
    winRate: parseFloat(((s.wins / s.count) * 100).toFixed(1)),
    avgPnl: parseFloat((s.totalPnl / s.count).toFixed(2)),
    totalPnl: parseFloat(s.totalPnl.toFixed(2))
  })).sort((a, b) => b.count - a.count);

  // 4. 交易类型分析
  const typeMap = new Map<string, { count: number; wins: number; totalPnl: number }>();
  filtered.forEach(t => {
    const s = typeMap.get(t.type) || { count: 0, wins: 0, totalPnl: 0 };
    s.count++; s.totalPnl += t.pnl;
    if (t.status === "win") s.wins++;
    typeMap.set(t.type, s);
  });
  const typeStats: StatRow[] = Array.from(typeMap.entries()).map(([name, s]) => ({
    name, count: s.count,
    winRate: parseFloat(((s.wins / s.count) * 100).toFixed(1)),
    avgPnl: parseFloat((s.totalPnl / s.count).toFixed(2)),
    totalPnl: parseFloat(s.totalPnl.toFixed(2))
  })).sort((a, b) => b.count - a.count);

  // 5. 品类分析
  const symbolMap = new Map<string, { count: number; wins: number; totalPnl: number }>();
  filtered.forEach(t => {
    const s = symbolMap.get(t.symbol) || { count: 0, wins: 0, totalPnl: 0 };
    s.count++; s.totalPnl += t.pnl;
    if (t.status === "win") s.wins++;
    symbolMap.set(t.symbol, s);
  });
  const symbolStats: StatRow[] = Array.from(symbolMap.entries()).map(([name, s]) => ({
    name, count: s.count,
    winRate: parseFloat(((s.wins / s.count) * 100).toFixed(1)),
    avgPnl: parseFloat((s.totalPnl / s.count).toFixed(2)),
    totalPnl: parseFloat(s.totalPnl.toFixed(2))
  })).sort((a, b) => b.count - a.count);

  // 6. 方向分析
  const dirMap = new Map<string, { count: number; wins: number; totalPnl: number }>();
  filtered.forEach(t => {
    const s = dirMap.get(t.direction) || { count: 0, wins: 0, totalPnl: 0 };
    s.count++; s.totalPnl += t.pnl;
    if (t.status === "win") s.wins++;
    dirMap.set(t.direction, s);
  });
  const dirStats = Array.from(dirMap.entries()).map(([name, s]) => ({
    name, count: s.count,
    winRate: parseFloat(((s.wins / s.count) * 100).toFixed(1)),
    avgPnl: parseFloat((s.totalPnl / s.count).toFixed(2)),
    totalPnl: parseFloat(s.totalPnl.toFixed(2))
  }));

  const COLORS = ["#10b981", "#f43f5e", "#fb923c", "#38bdf8", "#818cf8", "#c084fc", "#facc15", "#a7f3d0"];

  const renderStatTable = (data: StatRow[]) => (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800/50 text-zinc-500 dark:text-zinc-400">
            <th className="text-left py-2 pr-4 font-semibold">维度</th>
            <th className="text-right py-2 px-3 font-semibold">次数</th>
            <th className="text-right py-2 px-3 font-semibold">总盈亏</th>
            <th className="text-right py-2 px-3 font-semibold">胜率</th>
            <th className="text-right py-2 px-3 font-semibold">均盈亏</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
              <td className="py-2 pr-4 font-semibold text-zinc-800 dark:text-zinc-200 truncate max-w-[140px]">{row.name}</td>
              <td className="text-right py-2 px-3 font-mono text-zinc-600 dark:text-zinc-400">{row.count}</td>
              <td className={`text-right py-2 px-3 font-mono font-bold ${row.totalPnl > 0 ? "text-emerald-600 dark:text-emerald-400" : row.totalPnl < 0 ? "text-rose-600 dark:text-rose-400" : "text-zinc-500"}`}>
                {row.totalPnl > 0 ? "+" : ""}{row.totalPnl.toFixed(2)}
              </td>
              <td className="text-right py-2 px-3 font-mono font-bold text-zinc-700 dark:text-zinc-300">{row.winRate}%</td>
              <td className={`text-right py-2 px-3 font-mono font-bold ${row.avgPnl > 0 ? "text-emerald-600 dark:text-emerald-400" : row.avgPnl < 0 ? "text-rose-600 dark:text-rose-400" : "text-zinc-500"}`}>
                {row.avgPnl > 0 ? "+" : ""}{row.avgPnl.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const presetRanges = [
    { key: "today", label: "今天" },
    { key: "week", label: "本周" },
    { key: "month", label: "本月" },
    { key: "all", label: "全部" }
  ] as const;

  const setPreset = (key: typeof quickRange) => {
    const today = new Date();
    const toStr = (d: Date) => d.toISOString().split("T")[0];
    setQuickRange(key);
    switch (key) {
      case "today": setDateRange({ start: toStr(today), end: toStr(today) }); break;
      case "week": {
        const ws = new Date(today); ws.setDate(today.getDate() - today.getDay());
        setDateRange({ start: toStr(ws), end: toStr(today) }); break;
      }
      case "month": {
        const ms = new Date(today.getFullYear(), today.getMonth(), 1);
        setDateRange({ start: toStr(ms), end: toStr(today) }); break;
      }
      case "all": setDateRange({ start: "", end: "" }); break;
    }
  };

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">行为分析</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">多维度统计分析，发现你的交易模式</p>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="p-3 rounded-xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800/50 flex flex-wrap items-center gap-2">
        <Filter size={14} className="text-zinc-400 shrink-0" />
        {presetRanges.map(p => (
          <button key={p.key} onClick={() => setPreset(p.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              quickRange === p.key ? "bg-emerald-600 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            }`}>
            {p.label}
          </button>
        ))}
        <span className="text-zinc-300 dark:text-zinc-700">|</span>
        <input type="date" value={dateRange.start}
          onChange={e => { setDateRange(prev => ({ ...prev, start: e.target.value })); setQuickRange("all"); }}
          className="px-2 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-800 text-xs" />
        <span className="text-xs text-zinc-400">~</span>
        <input type="date" value={dateRange.end}
          onChange={e => { setDateRange(prev => ({ ...prev, end: e.target.value })); setQuickRange("all"); }}
          className="px-2 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-800 text-xs" />
      </div>

      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        当前筛选范围内共 <span className="font-bold text-zinc-800 dark:text-zinc-200">{filtered.length}</span> 笔交易
      </p>

      {/* 1. 入场理由分析 */}
      <div className="p-6 rounded-3xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800/50 shadow-sm">
        <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-100 mb-4 flex items-center gap-2">
          <TrendingUp size={18} className="text-emerald-600 dark:text-emerald-400" />
          入场理由分析
        </h3>
        {setupStats.length > 0 ? (
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 min-w-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800/50 text-zinc-500 dark:text-zinc-400">
                      <th className="text-left py-2 pr-4 font-semibold">入场理由</th>
                      <th className="text-right py-2 px-3 font-semibold">次数</th>
                      <th className="text-right py-2 px-3 font-semibold">总盈亏</th>
                      <th className="text-right py-2 px-3 font-semibold">胜率</th>
                      <th className="text-right py-2 px-3 font-semibold">均盈亏</th>
                      <th className="text-right py-2 px-3 font-semibold">平均 RR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {setupStats.map((row, i) => (
                      <tr key={i} className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                        <td className="py-2 pr-4 font-semibold text-zinc-800 dark:text-zinc-200 truncate max-w-[140px]">{row.name}</td>
                        <td className="text-right py-2 px-3 font-mono text-zinc-600 dark:text-zinc-400">{row.count}</td>
                        <td className={`text-right py-2 px-3 font-mono font-bold ${row.totalPnl > 0 ? "text-emerald-600 dark:text-emerald-400" : row.totalPnl < 0 ? "text-rose-600 dark:text-rose-400" : "text-zinc-500"}`}>
                          {row.totalPnl > 0 ? "+" : ""}{row.totalPnl.toFixed(2)}
                        </td>
                        <td className="text-right py-2 px-3 font-mono font-bold text-zinc-700 dark:text-zinc-300">{row.winRate}%</td>
                        <td className={`text-right py-2 px-3 font-mono font-bold ${row.avgPnl > 0 ? "text-emerald-600 dark:text-emerald-400" : row.avgPnl < 0 ? "text-rose-600 dark:text-rose-400" : "text-zinc-500"}`}>
                          {row.avgPnl > 0 ? "+" : ""}{row.avgPnl.toFixed(2)}
                        </td>
                        <td className="text-right py-2 px-3 font-mono font-bold text-zinc-700 dark:text-zinc-300">
                          {row.avgRr > 0 ? row.avgRr.toFixed(2) : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {analysisReady && (
              <div className="h-80 w-full lg:w-[720px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={setupStats.slice(0, 8)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={darkMode ? "#27272a" : "#f4f4f5"} />
                    <XAxis type="number" stroke={darkMode ? "#71717a" : "#a1a1aa"} fontSize={10} />
                    <YAxis type="category" dataKey="name" stroke={darkMode ? "#71717a" : "#a1a1aa"} fontSize={10} width={90}
                      tickFormatter={(v: string) => v.length > 8 ? v.substring(0, 8) + "..." : v} />
                    <Bar dataKey="totalPnl" name="总盈亏">
                      {setupStats.map((entry, idx) => (
                        <Cell key={idx} fill={entry.totalPnl >= 0 ? "#059669" : "#dc2626"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        ) : <p className="text-xs text-zinc-400">暂无数据</p>}
      </div>

      {/* 2. 做错原因分析 */}
      <div className="p-6 rounded-3xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800/50 shadow-sm">
        <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-100 mb-4 flex items-center gap-2">
          <AlertTriangle size={18} className="text-rose-600 dark:text-rose-400" />
          做错原因分析
        </h3>
        {errorStats.length > 0 ? (
          <div className="flex flex-col lg:flex-row gap-4 items-start">
            {analysisReady && (
              <div className="h-56 w-56 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie data={errorStats} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={3} dataKey="count">
                      {errorStats.map((_, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                  </RePieChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800/50 text-zinc-500 dark:text-zinc-400">
                      <th className="text-left py-2 pr-4 font-semibold">错误原因</th>
                      <th className="text-right py-2 px-3 font-semibold">次数</th>
                      <th className="text-right py-2 px-3 font-semibold">该错误胜率</th>
                      <th className="text-right py-2 px-3 font-semibold">均盈亏</th>
                    </tr>
                  </thead>
                  <tbody>
                    {errorStats.map((row, i) => (
                      <tr key={i} className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                        <td className="py-2 pr-4 font-semibold text-zinc-800 dark:text-zinc-200 truncate max-w-[160px]">{row.name}</td>
                        <td className="text-right py-2 px-3 font-mono text-zinc-600 dark:text-zinc-400">{row.count}</td>
                        <td className="text-right py-2 px-3 font-mono font-bold text-zinc-700 dark:text-zinc-300">{row.winRate}%</td>
                        <td className={`text-right py-2 px-3 font-mono font-bold ${row.avgPnl > 0 ? "text-emerald-600 dark:text-emerald-400" : row.avgPnl < 0 ? "text-rose-600 dark:text-rose-400" : "text-zinc-500"}`}>
                          {row.avgPnl > 0 ? "+" : ""}{row.avgPnl.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : <p className="text-xs text-zinc-400">没有错误记录，继续保持！</p>}
      </div>

      {/* 3. 离场理由分析 */}
      <div className="p-6 rounded-3xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800/50 shadow-sm">
        <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-100 mb-4 flex items-center gap-2">
          <ChevronRight size={18} className="text-emerald-600 dark:text-emerald-400" />
          离场理由分析
        </h3>
        {exitStats.length > 0 ? (
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 min-w-0">{renderStatTable(exitStats)}</div>
            {analysisReady && (
              <div className="h-80 w-full lg:w-[720px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={exitStats.slice(0, 8)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={darkMode ? "#27272a" : "#f4f4f5"} />
                    <XAxis type="number" stroke={darkMode ? "#71717a" : "#a1a1aa"} fontSize={10} />
                    <YAxis type="category" dataKey="name" stroke={darkMode ? "#71717a" : "#a1a1aa"} fontSize={10} width={90}
                      tickFormatter={(v: string) => v.length > 8 ? v.substring(0, 8) + "..." : v} />
<Bar dataKey="count" name="次数" fill="#38bdf8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        ) : <p className="text-xs text-zinc-400">暂无数据</p>}
      </div>

      {/* 4. 交易类型分析 */}
      <div className="p-6 rounded-3xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800/50 shadow-sm">
        <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-100 mb-4 flex items-center gap-2">
          <BarChart3 size={18} className="text-emerald-600 dark:text-emerald-400" />
          交易类型分析
        </h3>
        {typeStats.length > 0 ? (
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 min-w-0">{renderStatTable(typeStats)}</div>
            {analysisReady && (
              <div className="h-80 w-full lg:w-[720px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={typeStats} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={darkMode ? "#27272a" : "#f4f4f5"} />
                    <XAxis type="number" stroke={darkMode ? "#71717a" : "#a1a1aa"} fontSize={10} />
                    <YAxis type="category" dataKey="name" stroke={darkMode ? "#71717a" : "#a1a1aa"} fontSize={10} width={100}
                      tickFormatter={(v: string) => v.length > 8 ? v.substring(0, 8) + "..." : v} />
                    <Bar dataKey="totalPnl" name="总盈亏">
                      {typeStats.map((entry, idx) => (
                        <Cell key={idx} fill={entry.totalPnl >= 0 ? "#059669" : "#dc2626"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        ) : <p className="text-xs text-zinc-400">暂无数据</p>}
      </div>

      {/* 5. 品类分析 */}
      <div className="p-6 rounded-3xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800/50 shadow-sm">
        <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-100 mb-4 flex items-center gap-2">
          <DollarSign size={18} className="text-emerald-600 dark:text-emerald-400" />
          品类分析
        </h3>
        {symbolStats.length > 0 ? (
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 min-w-0">{renderStatTable(symbolStats)}</div>
            {analysisReady && (
              <div className="h-80 w-full lg:w-[720px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={symbolStats.slice(0, 8)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={darkMode ? "#27272a" : "#f4f4f5"} />
                    <XAxis type="number" stroke={darkMode ? "#71717a" : "#a1a1aa"} fontSize={10} />
                    <YAxis type="category" dataKey="name" stroke={darkMode ? "#71717a" : "#a1a1aa"} fontSize={10} width={60} />
                    <Bar dataKey="totalPnl" name="总盈亏">
                      {symbolStats.map((entry, idx) => (
                        <Cell key={idx} fill={entry.totalPnl >= 0 ? "#059669" : "#dc2626"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        ) : <p className="text-xs text-zinc-400">暂无数据</p>}
      </div>

      {/* 6. 方向分析 */}
      <div className="p-6 rounded-3xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800/50 shadow-sm">
        <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-100 mb-4 flex items-center gap-2">
          <TrendingUp size={18} className="text-emerald-600 dark:text-emerald-400" />
          方向分析
        </h3>
        {dirStats.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dirStats.map(dir => (
              <div key={dir.name} className={`p-3 rounded-lg border shadow-sm ${
                dir.name === "Long" ? "bg-emerald-500/5 border-emerald-200 dark:border-emerald-800" : "bg-rose-500/5 border-rose-200 dark:border-rose-800"
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-lg font-black ${dir.name === "Long" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                    {dir.name === "Long" ? "Long (做多)" : "Short (做空)"}
                  </span>
                  <span className="text-2xl font-black font-mono">
                    <span className={dir.totalPnl > 0 ? "text-emerald-600 dark:text-emerald-400" : dir.totalPnl < 0 ? "text-rose-600 dark:text-rose-400" : "text-zinc-500"}>
                      {dir.totalPnl > 0 ? "+" : ""}{dir.totalPnl.toFixed(2)}
                    </span>
                  </span>
                </div>
                <div className="flex gap-6 text-xs">
                  <div><span className="text-zinc-400">次数</span><p className="font-bold text-zinc-700 dark:text-zinc-300">{dir.count}</p></div>
                  <div><span className="text-zinc-400">胜率</span><p className="font-bold text-zinc-700 dark:text-zinc-300">{dir.winRate}%</p></div>
                  <div><span className="text-zinc-400">均盈亏</span>
                    <p className={`font-bold ${dir.avgPnl > 0 ? "text-emerald-600 dark:text-emerald-400" : dir.avgPnl < 0 ? "text-rose-600 dark:text-rose-400" : "text-zinc-500"}`}>
                      {dir.avgPnl > 0 ? "+" : ""}{dir.avgPnl.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : <p className="text-xs text-zinc-400">暂无数据</p>}
      </div>
    </div>
  );
}
