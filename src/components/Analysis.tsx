"use client";

import { Filter, TrendingUp, AlertTriangle, BarChart3, DollarSign } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, Cell, CartesianGrid, XAxis, YAxis, PieChart as RePieChart, Pie } from "recharts";

interface AnalysisProps {
  trades: any[];
  quickRange: "today" | "week" | "month" | "all";
  setQuickRange: React.Dispatch<React.SetStateAction<"today" | "week" | "month" | "all">>;
  dateRange: { start: string; end: string };
  setDateRange: React.Dispatch<React.SetStateAction<{ start: string; end: string }>>;
  analysisReady: boolean;
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
  analysisReady
}: AnalysisProps) {
  const filtered = trades.filter(t => {
    if (!dateRange.start && !dateRange.end) return true;
    const d = new Date(t.date).toISOString().split("T")[0];
    return d >= dateRange.start && d <= dateRange.end;
  });

  // Setup analysis
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

  // Error analysis
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

  // Exit analysis
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

  // Type analysis
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

  // Symbol analysis
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

  // Direction analysis
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

  const COLORS = ["#22c55e", "#ef4444", "#fb923c", "#38bdf8", "#818cf8", "#c084fc", "#facc15", "#a7f3d0"];

  const renderStatTable = (data: StatRow[]) => (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border-subtle text-[var(--text-muted)]">
            <th className="text-left py-2 pr-4 font-semibold">维度</th>
            <th className="text-right py-2 px-3 font-semibold">次数</th>
            <th className="text-right py-2 px-3 font-semibold">总盈亏</th>
            <th className="text-right py-2 px-3 font-semibold">胜率</th>
            <th className="text-right py-2 px-3 font-semibold">均盈亏</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-b border-border-subtle hover:bg-bg-hover transition-colors">
              <td className="py-2 pr-4 font-semibold text-[var(--text-secondary)] truncate max-w-[140px]">{row.name}</td>
              <td className="text-right py-2 px-3 font-mono text-[var(--text-secondary)] tabular-nums">{row.count}</td>
              <td className={`text-right py-2 px-3 font-mono font-bold tabular-nums ${row.totalPnl > 0 ? "text-trade-green" : row.totalPnl < 0 ? "text-trade-red" : "text-[var(--text-muted)]"}`}>
                {row.totalPnl > 0 ? "+" : ""}{row.totalPnl.toFixed(2)}
              </td>
              <td className="text-right py-2 px-3 font-mono font-bold text-[var(--text-secondary)] tabular-nums">{row.winRate}%</td>
              <td className={`text-right py-2 px-3 font-mono font-bold tabular-nums ${row.avgPnl > 0 ? "text-trade-green" : row.avgPnl < 0 ? "text-trade-red" : "text-[var(--text-muted)]"}`}>
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

  const sectionCard = (title: string, icon: React.ReactNode, content: React.ReactNode) => (
    <div className="p-5 rounded-lg bg-bg-surface border border-border-subtle transition-colors">
      <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wide mb-4 flex items-center gap-2">
        {icon}{title}
      </h3>
      {content}
    </div>
  );

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-[var(--text-primary)]">行为分析</h2>
          <p className="text-sm text-[var(--text-muted)]">多维度统计分析，发现你的交易模式</p>
        </div>
      </div>

      {/* Date Filter */}
      <div className="p-3 rounded-lg bg-bg-surface border border-border-subtle flex flex-wrap items-center gap-2">
        <Filter size={14} className="text-[var(--text-muted)] shrink-0" />
        {presetRanges.map(p => (
          <button key={p.key} onClick={() => setPreset(p.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              quickRange === p.key ? "bg-trade-green text-white" : "bg-bg-surface text-[var(--text-secondary)] hover:bg-bg-hover"
            }`}>
            {p.label}
          </button>
        ))}
        <span className="text-border-strong">|</span>
        <input type="date" value={dateRange.start}
          onChange={e => { setDateRange(prev => ({ ...prev, start: e.target.value })); setQuickRange("all"); }}
          className="px-2 py-1.5 rounded-lg border border-border-subtle bg-bg-surface text-xs text-[var(--text-primary)]" />
        <span className="text-xs text-[var(--text-muted)]">~</span>
        <input type="date" value={dateRange.end}
          onChange={e => { setDateRange(prev => ({ ...prev, end: e.target.value })); setQuickRange("all"); }}
          className="px-2 py-1.5 rounded-lg border border-border-subtle bg-bg-surface text-xs text-[var(--text-primary)]" />
      </div>

      <p className="text-xs text-[var(--text-muted)]">
        当前范围内共 <span className="font-bold text-[var(--text-primary)] tabular-nums">{filtered.length}</span> 笔交易
      </p>

      {/* 1. Setup Analysis */}
      {sectionCard(
        "入场理由分析",
        <TrendingUp size={16} className="text-trade-green" />,
        setupStats.length > 0 ? (
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 min-w-0">{renderStatTable(setupStats.map(s => ({ name: s.name, count: s.count, totalPnl: s.totalPnl, winRate: s.winRate, avgPnl: s.avgPnl })))}</div>
            {analysisReady && (
              <div className="h-72 w-full lg:w-[600px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={setupStats.slice(0, 8)} layout="vertical" margin={{ left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.04)" />
                    <XAxis type="number" stroke="#52525b" fontSize={10} tickFormatter={(v) => `${v >= 0 ? "+" : ""}${v}`} />
                    <YAxis type="category" dataKey="name" stroke="#52525b" fontSize={10} width={90}
                      tickFormatter={(v) => v.length > 8 ? v.substring(0, 8) + "..." : v} />
                    <Bar dataKey="totalPnl" name="总盈亏">
                      {setupStats.map((entry, idx) => (
                        <Cell key={idx} fill={entry.totalPnl >= 0 ? "#22c55e" : "#ef4444"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        ) : <p className="text-xs text-[var(--text-muted)]">暂无数据</p>
      )}

      {/* 2. Error Analysis */}
      {sectionCard(
        "错误分析",
        <AlertTriangle size={16} className="text-trade-red" />,
        errorStats.length > 0 ? (
          <div className="flex flex-col lg:flex-row gap-4 items-start">
            {analysisReady && (
              <div className="h-48 w-48 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie data={errorStats} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={2} dataKey="count">
                      {errorStats.map((_, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                  </RePieChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="flex-1 min-w-0">{renderStatTable(errorStats)}</div>
          </div>
        ) : <p className="text-xs text-[var(--text-muted)]">没有错误记录，继续保持！</p>
      )}

      {/* 3. Exit Analysis */}
      {sectionCard(
        "离场理由分析",
        <TrendingUp size={16} className="text-[var(--text-muted)]" />,
        exitStats.length > 0 ? (
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 min-w-0">{renderStatTable(exitStats)}</div>
            {analysisReady && (
              <div className="h-72 w-full lg:w-[600px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={exitStats.slice(0, 8)} layout="vertical" margin={{ left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.04)" />
                    <XAxis type="number" stroke="#52525b" fontSize={10} />
                    <YAxis type="category" dataKey="name" stroke="#52525b" fontSize={10} width={90}
                      tickFormatter={(v) => v.length > 8 ? v.substring(0, 8) + "..." : v} />
                    <Bar dataKey="count" name="次数" fill="#38bdf8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        ) : <p className="text-xs text-[var(--text-muted)]">暂无数据</p>
      )}

      {/* 4. Type Analysis */}
      {sectionCard(
        "交易类型分析",
        <BarChart3 size={16} className="text-[var(--text-muted)]" />,
        typeStats.length > 0 ? (
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 min-w-0">{renderStatTable(typeStats)}</div>
            {analysisReady && (
              <div className="h-72 w-full lg:w-[600px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={typeStats} layout="vertical" margin={{ left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.04)" />
                    <XAxis type="number" stroke="#52525b" fontSize={10} tickFormatter={(v) => `${v >= 0 ? "+" : ""}${v}`} />
                    <YAxis type="category" dataKey="name" stroke="#52525b" fontSize={10} width={100}
                      tickFormatter={(v) => v.length > 8 ? v.substring(0, 8) + "..." : v} />
                    <Bar dataKey="totalPnl" name="总盈亏">
                      {typeStats.map((entry, idx) => (
                        <Cell key={idx} fill={entry.totalPnl >= 0 ? "#22c55e" : "#ef4444"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        ) : <p className="text-xs text-[var(--text-muted)]">暂无数据</p>
      )}

      {/* 5. Symbol Analysis */}
      {sectionCard(
        "品类分析",
        <DollarSign size={16} className="text-[var(--text-muted)]" />,
        symbolStats.length > 0 ? (
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 min-w-0">{renderStatTable(symbolStats)}</div>
            {analysisReady && (
              <div className="h-72 w-full lg:w-[600px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={symbolStats.slice(0, 8)} layout="vertical" margin={{ left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.04)" />
                    <XAxis type="number" stroke="#52525b" fontSize={10} tickFormatter={(v) => `${v >= 0 ? "+" : ""}${v}`} />
                    <YAxis type="category" dataKey="name" stroke="#52525b" fontSize={10} width={60}
                      tickFormatter={(v) => v.length > 6 ? v.substring(0, 6) + "..." : v} />
                    <Bar dataKey="totalPnl" name="总盈亏">
                      {symbolStats.map((entry, idx) => (
                        <Cell key={idx} fill={entry.totalPnl >= 0 ? "#22c55e" : "#ef4444"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        ) : <p className="text-xs text-[var(--text-muted)]">暂无数据</p>
      )}

      {/* 6. Direction Analysis */}
      {sectionCard(
        "方向分析",
        <TrendingUp size={16} className="text-[var(--text-muted)]" />,
        dirStats.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {dirStats.map(dir => (
              <div key={dir.name} className="p-4 rounded-lg bg-bg-canvas/50 border border-border-subtle">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-bold ${dir.name === "Long" ? "text-trade-green" : "text-trade-red"}`}>
                    {dir.name === "Long" ? "做多 (Long)" : "做空 (Short)"}
                  </span>
                  <span className={`text-xl font-bold font-mono tabular-nums ${dir.totalPnl > 0 ? "text-trade-green" : dir.totalPnl < 0 ? "text-trade-red" : "text-[var(--text-muted)]"}`}>
                    {dir.totalPnl > 0 ? "+" : ""}{dir.totalPnl.toFixed(2)}
                  </span>
                </div>
                <div className="flex gap-5 text-xs">
                  <div><span className="text-[var(--text-muted)]">次数</span> <span className="font-bold text-[var(--text-primary)] tabular-nums ml-1">{dir.count}</span></div>
                  <div><span className="text-[var(--text-muted)]">胜率</span> <span className="font-bold text-[var(--text-primary)] tabular-nums ml-1">{dir.winRate}%</span></div>
                  <div><span className="text-[var(--text-muted)]">均盈亏</span> <span className={`font-bold tabular-nums ml-1 ${dir.avgPnl > 0 ? "text-trade-green" : dir.avgPnl < 0 ? "text-trade-red" : "text-[var(--text-muted)]"}`}>{dir.avgPnl > 0 ? "+" : ""}{dir.avgPnl.toFixed(2)}</span></div>
                </div>
              </div>
            ))}
          </div>
        ) : <p className="text-xs text-[var(--text-muted)]">暂无数据</p>
      )}
    </div>
  );
}
