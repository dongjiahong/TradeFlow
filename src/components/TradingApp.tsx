"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  BookOpen,
  Award,
  Settings,
  Plus,
  Trash,
  Edit,
  Check,
  X,
  Upload,
  Download,
  AlertTriangle,
  Calendar,
  DollarSign,
  PieChart,
  Moon,
  Sun,
  ChevronRight,
  Filter,
  RefreshCw,
  Camera,
  Image as ImageIcon
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart as RePieChart,
  Pie
} from "recharts";
import {
  createTrade,
  updateTrade,
  deleteTrade,
  upsertDiaryEntry,
  deleteDiaryEntry,
  addSetupOption,
  deleteSetupOption,
  addErrorOption,
  deleteErrorOption,
  addExitOption,
  deleteExitOption,
  addSymbolOption,
  deleteSymbolOption,
  importExcelData
} from "../app/actions";

interface Trade {
  id: string;
  date: Date | string;
  remarks: string | null;
  setup: string;
  type: string;
  exitReason: string;
  notes: string | null;
  positionSize: number;
  direction: string;
  entryPrice: number;
  exitPrice1: number;
  exitPrice2: number | null;
  pnl: number;
  status: string;
  symbol: string;
  errorReason: string | null;
  screenshots?: { id: string; filename: string }[];
}

interface DiaryEntry {
  id: string;
  date: Date | string;
  ruleExecuted: boolean;
  emotionStable: boolean;
  recordKept: boolean;
  prepared: boolean;
  noFomo: boolean;
  pnl: number;
  remarks: string | null;
}

interface OptionItem {
  id: string;
  name: string;
}

interface TradingAppProps {
  initialTrades: Trade[];
  initialDiaryEntries: DiaryEntry[];
  initialSetups: OptionItem[];
  initialErrors: OptionItem[];
  initialExits: OptionItem[];
  initialSymbols: OptionItem[];
}

export default function TradingApp({
  initialTrades,
  initialDiaryEntries,
  initialSetups,
  initialErrors,
  initialExits,
  initialSymbols
}: TradingAppProps) {
  const [mounted, setMounted] = useState(false);
  const [dashboardReady, setDashboardReady] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "journal" | "diary" | "settings">("dashboard");
  const [darkMode, setDarkMode] = useState(false);

  // Core data states
  const [trades, setTrades] = useState<Trade[]>(initialTrades);
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>(initialDiaryEntries);
  const [setups, setSetups] = useState<OptionItem[]>(initialSetups);
  const [errors, setErrors] = useState<OptionItem[]>(initialErrors);
  const [exits, setExits] = useState<OptionItem[]>(initialExits);
  const [symbols, setSymbols] = useState<OptionItem[]>(initialSymbols);

  // Journal UI states
  const [searchQuery, setSearchQuery] = useState("");
  const [directionFilter, setDirectionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [setupFilter, setSetupFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [symbolFilter, setSymbolFilter] = useState("all");

  // Inline editing & screenshots
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [expandedScreenshotId, setExpandedScreenshotId] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isUploadingScreenshot, setIsUploadingScreenshot] = useState(false);
  const [pendingScreenshots, setPendingScreenshots] = useState<{ file: File; preview: string }[]>([]);

  // Trade form states
  const [tradeForm, setTradeForm] = useState({
    date: new Date().toISOString().split("T")[0],
    remarks: "",
    setup: "",
    type: "趋势延续（Continuation）",
    exitReason: "",
    notes: "",
    positionSize: 1,
    direction: "Long",
    entryPrice: 0,
    exitPrice1: 0,
    exitPrice2: "",
    errorReason: "",
    symbol: ""
  });

  // Diary form states
  const [selectedDiaryDate, setSelectedDiaryDate] = useState(new Date().toISOString().split("T")[0]);
  const [diaryForm, setDiaryForm] = useState({
    ruleExecuted: true,
    emotionStable: true,
    recordKept: true,
    prepared: true,
    noFomo: true,
    pnl: 0,
    remarks: ""
  });

  // Settings custom items
  const [newSetupName, setNewSetupName] = useState("");
  const [newErrorName, setNewErrorName] = useState("");
  const [newExitName, setNewExitName] = useState("");
  const [newSymbolName, setNewSymbolName] = useState("");

  // Excel loader
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState("");

  useEffect(() => {
    setMounted(true);
    // Delay chart rendering to let DOM layout settle
    requestAnimationFrame(() => setDashboardReady(true));
    // Default form setup selection
    if (initialSetups.length > 0) {
      setTradeForm(prev => ({ ...prev, setup: initialSetups[0].name }));
    }
    if (initialExits.length > 0) {
      setTradeForm(prev => ({ ...prev, exitReason: initialExits[0].name }));
    }
    if (initialSymbols.length > 0) {
      setTradeForm(prev => ({ ...prev, symbol: initialSymbols[0].name }));
    }
  }, [initialSetups, initialExits, initialSymbols]);

  // Reset chart ready state when switching to dashboard tab
  useEffect(() => {
    if (activeTab === "dashboard") {
      setDashboardReady(false);
      requestAnimationFrame(() => setDashboardReady(true));
    }
  }, [activeTab]);

  // Sync html class for Tailwind v4 dark mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  // Paste handler for screenshots
  useEffect(() => {
    if (!inlineEditingId) return;
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const imageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) imageFiles.push(file);
        }
      }
      if (imageFiles.length > 0) {
        e.preventDefault();
        const newItems = imageFiles.map(file => ({
          file,
          preview: URL.createObjectURL(file)
        }));
        setPendingScreenshots(prev => [...prev, ...newItems]);
      }
    };
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [inlineEditingId]);

  // Sync diary form on date change
  useEffect(() => {
    const matched = diaryEntries.find(d => {
      const entryD = new Date(d.date).toISOString().split("T")[0];
      return entryD === selectedDiaryDate;
    });

    if (matched) {
      setDiaryForm({
        ruleExecuted: matched.ruleExecuted,
        emotionStable: matched.emotionStable,
        recordKept: matched.recordKept,
        prepared: matched.prepared,
        noFomo: matched.noFomo,
        pnl: matched.pnl,
        remarks: matched.remarks || ""
      });
    } else {
      setDiaryForm({
        ruleExecuted: true,
        emotionStable: true,
        recordKept: true,
        prepared: true,
        noFomo: true,
        pnl: 0,
        remarks: ""
      });
    }
  }, [selectedDiaryDate, diaryEntries]);

  if (!mounted) return null;

  // --- STATS CALCULATIONS ---
  const winTrades = trades.filter(t => t.status === "win");
  const loseTrades = trades.filter(t => t.status === "lose");
  const beTrades = trades.filter(t => t.status === "BE");

  const totalTradesCount = trades.length;
  const netProfit = trades.reduce((acc, t) => acc + t.pnl, 0);

  const winRate = totalTradesCount > 0 
    ? (winTrades.length / (winTrades.length + loseTrades.length || 1)) * 100 
    : 0;

  const totalWinsAmount = winTrades.reduce((acc, t) => acc + t.pnl, 0);
  const totalLossesAmount = Math.abs(loseTrades.reduce((acc, t) => acc + t.pnl, 0));

  const profitFactor = totalLossesAmount > 0 
    ? totalWinsAmount / totalLossesAmount 
    : totalWinsAmount > 0 ? 99.9 : 0;

  const avgWin = winTrades.length > 0 ? totalWinsAmount / winTrades.length : 0;
  const avgLoss = loseTrades.length > 0 ? totalLossesAmount / loseTrades.length : 0;
  const pnlRatio = avgLoss > 0 ? avgWin / avgLoss : 0;

  // Diary Stats
  const completedDiaryDays = diaryEntries.length;
  const ruleFollowCount = diaryEntries.filter(d => d.ruleExecuted).length;
  const emotionalStableCount = diaryEntries.filter(d => d.emotionStable).length;
  const diaryRecordCount = diaryEntries.filter(d => d.recordKept).length;
  const diaryPreparedCount = diaryEntries.filter(d => d.prepared).length;
  const diaryNoFomoCount = diaryEntries.filter(d => d.noFomo).length;

  const overallComplianceRate = completedDiaryDays > 0
    ? ((ruleFollowCount + emotionalStableCount + diaryRecordCount + diaryPreparedCount + diaryNoFomoCount) / (completedDiaryDays * 5)) * 100
    : 0;

  // --- CHART DATA GENERATION ---

  // 1. Capital Curve data
  let currentCap = 0;
  const capitalCurveData = trades.map((t, idx) => {
    currentCap += t.pnl;
    return {
      index: idx + 1,
      date: new Date(t.date).toLocaleDateString("zh-CN", { month: "short", day: "numeric" }),
      pnl: parseFloat(currentCap.toFixed(2)),
      tradePnl: parseFloat(t.pnl.toFixed(2))
    };
  });

  // 2. Setup Performance statistics
  const setupPerformanceMap = new Map<string, { pnl: number; count: number; wins: number }>();
  trades.forEach(t => {
    const stats = setupPerformanceMap.get(t.setup) || { pnl: 0, count: 0, wins: 0 };
    stats.pnl += t.pnl;
    stats.count += 1;
    if (t.status === "win") stats.wins += 1;
    setupPerformanceMap.set(t.setup, stats);
  });

  const setupChartData = Array.from(setupPerformanceMap.entries()).map(([name, stats]) => ({
    name,
    pnl: parseFloat(stats.pnl.toFixed(2)),
    winRate: parseFloat(((stats.wins / stats.count) * 100).toFixed(1)),
    count: stats.count
  })).sort((a, b) => b.pnl - a.pnl);

  // 3. Error counts
  const errorMap = new Map<string, number>();
  trades.forEach(t => {
    if (t.errorReason) {
      errorMap.set(t.errorReason, (errorMap.get(t.errorReason) || 0) + 1);
    }
  });

  const errorPieData = Array.from(errorMap.entries()).map(([name, value]) => ({
    name: name.length > 15 ? name.substring(0, 15) + "..." : name,
    value
  }));

  const COLORS = ["#f43f5e", "#fb923c", "#facc15", "#38bdf8", "#818cf8", "#c084fc", "#f472b6", "#a7f3d0", "#d9f99d"];

  // --- HANDLERS ---

  const calculateLivePnl = () => {
    const entry = Number(tradeForm.entryPrice) || 0;
    const exit1 = Number(tradeForm.exitPrice1) || 0;
    const exit2 = tradeForm.exitPrice2 ? Number(tradeForm.exitPrice2) : null;
    const size = Number(tradeForm.positionSize) || 0;
    const dir = tradeForm.direction;

    if (exit2 === null || isNaN(exit2) || exit2 === 0) {
      if (dir === "Long") {
        return (exit1 - entry) * size;
      } else {
        return (entry - exit1) * size;
      }
    } else {
      if (dir === "Long") {
        return (
          (exit1 - entry) * (size / 2) +
          (exit2 - entry) * (size / 2)
        );
      } else {
        return (
          (entry - exit1) * (size / 2) +
          (entry - exit2) * (size / 2)
        );
      }
    }
  };

  const handlePendingFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newItems = Array.from(files).map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));
    setPendingScreenshots(prev => [...prev, ...newItems]);
  };

  const removePendingScreenshot = (index: number) => {
    setPendingScreenshots(prev => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const uploadPendingScreenshots = async (tradeId: string) => {
    if (pendingScreenshots.length === 0) return;
    setIsUploadingScreenshot(true);
    try {
      for (const item of pendingScreenshots) {
        const formData = new FormData();
        formData.append("tradeId", tradeId);
        formData.append("file", item.file);
        const res = await fetch("/api/screenshots", { method: "POST", body: formData });
        const data = await res.json();
        if (data.success && data.screenshot) {
          setTrades(prev => prev.map(t => {
            if (t.id === tradeId) {
              return { ...t, screenshots: [...(t.screenshots || []), data.screenshot] };
            }
            return t;
          }));
        }
      }
      pendingScreenshots.forEach(p => URL.revokeObjectURL(p.preview));
      setPendingScreenshots([]);
    } catch (err: any) {
      alert(`截图上传出错: ${err.message}`);
    } finally {
      setIsUploadingScreenshot(false);
    }
  };

  const handleSaveTrade = async () => {
    const parsedExit2 = tradeForm.exitPrice2 ? parseFloat(tradeForm.exitPrice2) : null;
    
    const payload = {
      date: tradeForm.date,
      remarks: tradeForm.remarks,
      setup: tradeForm.setup,
      type: tradeForm.type,
      exitReason: tradeForm.exitReason,
      notes: tradeForm.notes,
      positionSize: Number(tradeForm.positionSize),
      direction: tradeForm.direction,
      entryPrice: Number(tradeForm.entryPrice),
      exitPrice1: Number(tradeForm.exitPrice1),
      exitPrice2: parsedExit2,
      symbol: tradeForm.symbol,
      errorReason: tradeForm.errorReason || undefined
    };

    if (inlineEditingId && inlineEditingId !== "__new__") {
      const res = await updateTrade(inlineEditingId, payload);
      if (res.success && res.trade) {
        setTrades(prev => prev.map(t => t.id === inlineEditingId ? { ...(res.trade as unknown as Trade), screenshots: t.screenshots } : t));
        if (pendingScreenshots.length > 0) {
          await uploadPendingScreenshots(inlineEditingId);
        }
        setInlineEditingId(null);
      } else {
        alert("更新失败: " + res.error);
      }
    } else {
      const res = await createTrade(payload);
      if (res.success && res.trade) {
        const newTrade = { ...(res.trade as unknown as Trade), screenshots: [] };
        setTrades(prev => [...prev, newTrade].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
        if (pendingScreenshots.length > 0) {
          await uploadPendingScreenshots(res.trade.id);
        }
        setInlineEditingId(null);
      } else {
        alert("添加失败: " + res.error);
      }
    }
  };

  const handleUploadScreenshots = async (tradeId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploadingScreenshot(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("tradeId", tradeId);
        formData.append("file", file);

        const res = await fetch("/api/screenshots", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (data.success && data.screenshot) {
          setTrades(prev => prev.map(t => {
            if (t.id === tradeId) {
              const currentScreenshots = t.screenshots || [];
              return {
                ...t,
                screenshots: [...currentScreenshots, data.screenshot]
              };
            }
            return t;
          }));
        } else {
          alert(`上传失败: ${data.error || "未知错误"}`);
        }
      }
    } catch (err: any) {
      alert(`上传出错: ${err.message}`);
    } finally {
      setIsUploadingScreenshot(false);
    }
  };

  const handleDeleteScreenshot = async (tradeId: string, screenshotId: string) => {
    if (!confirm("确定要删除这张截图吗？")) return;
    try {
      const res = await fetch(`/api/screenshots/${screenshotId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setTrades(prev => prev.map(t => {
          if (t.id === tradeId) {
            return {
              ...t,
              screenshots: (t.screenshots || []).filter(s => s.id !== screenshotId)
            };
          }
          return t;
        }));
      } else {
        alert(`删除失败: ${data.error || "未知错误"}`);
      }
    } catch (err: any) {
      alert(`删除出错: ${err.message}`);
    }
  };

  const renderInlineEditCells = (onSave: () => void, onCancel: () => void) => {
    const livePnl = calculateLivePnl();
    const liveStatus = livePnl > 0 ? "win" : livePnl < 0 ? "lose" : "BE";

    return (
      <>
        {/* 日期 */}
        <td className="p-2.5">
          <input
            type="date"
            required
            value={tradeForm.date}
            onChange={(e) => setTradeForm(prev => ({ ...prev, date: e.target.value }))}
            className="inline-cell-input dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 bg-white border-zinc-300 text-zinc-900 font-mono py-1"
          />
        </td>
        {/* 品类 */}
        <td className="p-2.5">
          <select
            value={tradeForm.symbol}
            onChange={(e) => setTradeForm(prev => ({ ...prev, symbol: e.target.value }))}
            className="inline-cell-input dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 bg-white border-zinc-300 text-zinc-900 py-1"
          >
            {symbols.map(s => (
              <option key={s.id} value={s.name}>{s.name}</option>
            ))}
          </select>
        </td>
        {/* 方向 */}
        <td className="p-2.5">
          <select
            value={tradeForm.direction}
            onChange={(e) => setTradeForm(prev => ({ ...prev, direction: e.target.value }))}
            className="inline-cell-input dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 bg-white border-zinc-300 text-zinc-900 py-1"
          >
            <option value="Long">Long</option>
            <option value="Short">Short</option>
          </select>
        </td>
        {/* 入场原因 */}
        <td className="p-2.5">
          <select
            value={tradeForm.setup}
            onChange={(e) => setTradeForm(prev => ({ ...prev, setup: e.target.value }))}
            className="inline-cell-input dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 bg-white border-zinc-300 text-zinc-900 py-1"
          >
            {setups.map(s => (
              <option key={s.id} value={s.name}>{s.name}</option>
            ))}
          </select>
        </td>
        {/* 交易类型 */}
        <td className="p-2.5">
          <select
            value={tradeForm.type}
            onChange={(e) => setTradeForm(prev => ({ ...prev, type: e.target.value }))}
            className="inline-cell-input dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 bg-white border-zinc-300 text-zinc-900 py-1"
          >
            <option value="趋势延续（Continuation）">趋势延续 (Continuation)</option>
            <option value="反转（Reversal）">反转 (Reversal)</option>
            <option value="突破（BO）">突破 (BO)</option>
            <option value="假突破（fBO）">假突破 (fBO)</option>
          </select>
        </td>
        {/* 仓位 */}
        <td className="p-2.5">
          <input
            type="number"
            step="any"
            required
            value={tradeForm.positionSize}
            onChange={(e) => setTradeForm(prev => ({ ...prev, positionSize: parseFloat(e.target.value) || 0 }))}
            className="inline-cell-input dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 bg-white border-zinc-300 text-zinc-900 font-mono py-1"
          />
        </td>
        {/* 入场/离场价格 */}
        <td className="p-2.5">
          <div className="flex flex-col gap-1 min-w-[100px]">
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-zinc-400 w-8 shrink-0">入场:</span>
              <input
                type="number"
                step="any"
                required
                value={tradeForm.entryPrice}
                onChange={(e) => setTradeForm(prev => ({ ...prev, entryPrice: parseFloat(e.target.value) || 0 }))}
                className="inline-cell-input dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 bg-white border-zinc-300 text-zinc-900 font-mono py-0.5"
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-zinc-400 w-8 shrink-0">离场1:</span>
              <input
                type="number"
                step="any"
                required
                value={tradeForm.exitPrice1}
                onChange={(e) => setTradeForm(prev => ({ ...prev, exitPrice1: parseFloat(e.target.value) || 0 }))}
                className="inline-cell-input dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 bg-white border-zinc-300 text-zinc-900 font-mono py-0.5"
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-zinc-400 w-8 shrink-0">离场2:</span>
              <input
                type="number"
                step="any"
                value={tradeForm.exitPrice2}
                onChange={(e) => setTradeForm(prev => ({ ...prev, exitPrice2: e.target.value }))}
                placeholder="选填"
                className="inline-cell-input dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 bg-white border-zinc-300 text-zinc-900 font-mono py-0.5"
              />
            </div>
          </div>
        </td>
        {/* 盈亏 */}
        <td className={`p-2.5 font-mono font-bold text-right whitespace-nowrap ${
          livePnl > 0 ? "text-emerald-500" : livePnl < 0 ? "text-rose-500" : "text-zinc-500"
        }`}>
          {livePnl > 0 ? "+" : ""}{livePnl.toFixed(2)}
        </td>
        {/* 盈亏状态 */}
        <td className="p-2.5">
          <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-xxs ${
            liveStatus === "win"
              ? "bg-emerald-500/10 text-emerald-500 dark:text-emerald-400"
              : liveStatus === "lose"
              ? "bg-rose-500/10 text-rose-500 dark:text-rose-400"
              : "bg-zinc-500/10 text-zinc-400"
          }`}>
            {liveStatus}
          </span>
        </td>
        {/* 离场理由 */}
        <td className="p-2.5">
          <select
            value={tradeForm.exitReason}
            onChange={(e) => setTradeForm(prev => ({ ...prev, exitReason: e.target.value }))}
            className="inline-cell-input dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 bg-white border-zinc-300 text-zinc-900 py-1"
          >
            {exits.map(ex => (
              <option key={ex.id} value={ex.name}>{ex.name}</option>
            ))}
          </select>
        </td>
        {/* 错误原因 */}
        <td className="p-2.5">
          <select
            value={tradeForm.errorReason}
            onChange={(e) => setTradeForm(prev => ({ ...prev, errorReason: e.target.value }))}
            className="inline-cell-input dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 bg-white border-zinc-300 text-zinc-900 py-1"
          >
            <option value="">-- 无错误 --</option>
            {errors.map(err => (
              <option key={err.id} value={err.name}>{err.name}</option>
            ))}
          </select>
        </td>
        {/* 备注 / 复盘 */}
        <td className="p-2.5">
          <div className="flex flex-col gap-1.5 min-w-[180px]">
            <textarea
              placeholder="今日备注..."
              value={tradeForm.remarks}
              rows={2}
              onChange={(e) => setTradeForm(prev => ({ ...prev, remarks: e.target.value }))}
              className="inline-cell-input dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 bg-white border-zinc-300 text-zinc-900 py-1 text-xs resize-y leading-relaxed"
            />
            <textarea
              placeholder="复盘分析..."
              value={tradeForm.notes}
              rows={4}
              onChange={(e) => setTradeForm(prev => ({ ...prev, notes: e.target.value }))}
              className="inline-cell-input dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 bg-white border-zinc-300 text-zinc-900 py-1 text-xs resize-y leading-relaxed"
            />
          </div>
        </td>
        {/* 操作 */}
        <td className="p-2.5 text-center">
          <div className="flex items-center justify-center gap-1.5">
            <button
              onClick={onSave}
              title="保存"
              className="p-1.5 rounded bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-sm"
            >
              <Check size={13} />
            </button>
            <button
              onClick={onCancel}
              title="取消"
              className="p-1.5 rounded bg-zinc-500 text-white hover:bg-zinc-650 transition-colors shadow-sm"
            >
              <X size={13} />
            </button>
          </div>
        </td>
      </>
    );
  };

  const handleDeleteTrade = async (id: string) => {
    if (confirm("确定要删除这条交易记录吗？")) {
      const res = await deleteTrade(id);
      if (res.success) {
        setTrades(prev => prev.filter(t => t.id !== id));
      } else {
        alert("删除失败: " + res.error);
      }
    }
  };

  const handleSaveDiary = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      date: selectedDiaryDate,
      ruleExecuted: diaryForm.ruleExecuted,
      emotionStable: diaryForm.emotionStable,
      recordKept: diaryForm.recordKept,
      prepared: diaryForm.prepared,
      noFomo: diaryForm.noFomo,
      pnl: Number(diaryForm.pnl),
      remarks: diaryForm.remarks
    };

    const res = await upsertDiaryEntry(payload);
    if (res.success && res.entry) {
      setDiaryEntries(prev => {
        const entryDateStr = new Date(res.entry!.date).toISOString().split("T")[0];
        const exists = prev.some(d => new Date(d.date).toISOString().split("T")[0] === entryDateStr);
        if (exists) {
          return prev.map(d => new Date(d.date).toISOString().split("T")[0] === entryDateStr ? (res.entry as unknown as DiaryEntry) : d);
        } else {
          return [...prev, res.entry as unknown as DiaryEntry].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        }
      });
      alert("日志记录保存成功！");
    } else {
      alert("保存失败: " + res.error);
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportStatus("正在读取并解析 Excel 文件...");

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const base64Data = (evt.target?.result as string).split(",")[1];
        setImportStatus("正在同步到本地数据库，这可能需要几十秒时间...");
        
        const res = await importExcelData(base64Data);
        if (res.success) {
          setImportStatus(`导入成功！共导入了 ${res.tradesCount} 笔交易，和 ${res.diaryCount} 篇自律日记！`);
          // Reload page data by querying the server actions again
          window.location.reload();
        } else {
          setImportStatus(`导入失败: ${res.error}`);
        }
      } catch (err: any) {
        setImportStatus(`文件读取出错: ${err.message}`);
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Setup options CRUD
  const handleAddSetup = async () => {
    if (!newSetupName.trim()) return;
    const res = await addSetupOption(newSetupName.trim());
    if (res.success && res.option) {
      setSetups(prev => [...prev, res.option!].sort((a, b) => a.name.localeCompare(b.name)));
      setNewSetupName("");
    } else {
      alert("添加失败: " + res.error);
    }
  };
  const handleDeleteSetup = async (id: string) => {
    if (confirm("确定要删除此入场理由选项吗？")) {
      const res = await deleteSetupOption(id);
      if (res.success) {
        setSetups(prev => prev.filter(s => s.id !== id));
      }
    }
  };

  // Error options CRUD
  const handleAddError = async () => {
    if (!newErrorName.trim()) return;
    const res = await addErrorOption(newErrorName.trim());
    if (res.success && res.option) {
      setErrors(prev => [...prev, res.option!].sort((a, b) => a.name.localeCompare(b.name)));
      setNewErrorName("");
    } else {
      alert("添加失败: " + res.error);
    }
  };
  const handleDeleteError = async (id: string) => {
    if (confirm("确定要删除此错误原因选项吗？")) {
      const res = await deleteErrorOption(id);
      if (res.success) {
        setErrors(prev => prev.filter(e => e.id !== id));
      }
    }
  };

  // Exit options CRUD
  const handleAddExit = async () => {
    if (!newExitName.trim()) return;
    const res = await addExitOption(newExitName.trim());
    if (res.success && res.option) {
      setExits(prev => [...prev, res.option!].sort((a, b) => a.name.localeCompare(b.name)));
      setNewExitName("");
    } else {
      alert("添加失败: " + res.error);
    }
  };
  const handleDeleteExit = async (id: string) => {
    if (confirm("确定要删除此离场理由选项吗？")) {
      const res = await deleteExitOption(id);
      if (res.success) {
        setExits(prev => prev.filter(ex => ex.id !== id));
      }
    }
  };

  // Symbol options CRUD
  const handleAddSymbol = async () => {
    if (!newSymbolName.trim()) return;
    const res = await addSymbolOption(newSymbolName.trim());
    if (res.success && res.option) {
      setSymbols(prev => [...prev, res.option!].sort((a, b) => a.name.localeCompare(b.name)));
      setNewSymbolName("");
    } else {
      alert("添加失败: " + res.error);
    }
  };

  const handleDeleteSymbol = async (id: string) => {
    if (confirm("确定要删除此品类选项吗？")) {
      const res = await deleteSymbolOption(id);
      if (res.success) {
        setSymbols(prev => prev.filter(s => s.id !== id));
      }
    }
  };

  // --- FILTERS LOGIC ---
  const filteredTrades = trades.filter(t => {
    const matchesSearch = 
      (t.remarks && t.remarks.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.notes && t.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
      t.setup.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.symbol.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDirection = directionFilter === "all" || t.direction === directionFilter;
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    const matchesSetup = setupFilter === "all" || t.setup === setupFilter;
    const matchesType = typeFilter === "all" || t.type === typeFilter;
    const matchesSymbol = symbolFilter === "all" || t.symbol === symbolFilter;

    return matchesSearch && matchesDirection && matchesStatus && matchesSetup && matchesType && matchesSymbol;
  });

  return (
    <div className={`flex flex-col flex-1 h-screen font-sans ${darkMode ? "dark bg-zinc-950 text-zinc-100" : "bg-zinc-50 text-zinc-900"}`}>
      
      {/* --- LIGHTBOX OVERLAY --- */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img
              src={lightboxImage}
              alt="Preview"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Top Header / Bar */}
      <header className="flex h-16 items-center justify-between border-b px-6 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm transition-colors duration-200">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-emerald-500 to-teal-400 p-2 rounded-xl text-white shadow-md shadow-emerald-500/20">
            <TrendingUp size={20} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-emerald-500 to-teal-400 bg-clip-text text-transparent">
              TradeFlow Pro
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">交易数据复盘与自律系统</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Quick Stats Pill */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              总盈亏: <span className={netProfit >= 0 ? "text-emerald-500" : "text-rose-500"}>{netProfit >= 0 ? "+" : ""}{netProfit.toFixed(2)}</span>
            </span>
          </div>

          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-lg border hover:bg-zinc-100 dark:hover:bg-zinc-800 border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 transition-all duration-200"
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Navigation Sidebar */}
        <aside className="w-64 border-r bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 flex flex-col justify-between py-6 px-4 shrink-0 transition-colors duration-200">
          <nav className="flex flex-col gap-2">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group ${
                activeTab === "dashboard"
                  ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                  : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80"
              }`}
            >
              <PieChart size={18} className="transition-transform group-hover:scale-110" />
              性能仪表盘
            </button>
            <button
              onClick={() => setActiveTab("journal")}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group ${
                activeTab === "journal"
                  ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                  : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80"
              }`}
            >
              <BookOpen size={18} className="transition-transform group-hover:scale-110" />
              交易日志
            </button>
            <button
              onClick={() => setActiveTab("diary")}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group ${
                activeTab === "diary"
                  ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                  : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80"
              }`}
            >
              <Award size={18} className="transition-transform group-hover:scale-110" />
              别瞎搞日记本
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group ${
                activeTab === "settings"
                  ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                  : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80"
              }`}
            >
              <Settings size={18} className="transition-transform group-hover:scale-110" />
              系统设置
            </button>
          </nav>

          {/* Quick Compliance Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-800/40 dark:to-zinc-800/70 border border-zinc-200 dark:border-zinc-800 shadow-inner">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1">本月自律评分</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-500">{overallComplianceRate.toFixed(1)}%</span>
              <span className="text-xs text-zinc-500">执行率</span>
            </div>
            <div className="mt-2 w-full bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${overallComplianceRate}%` }}
              ></div>
            </div>
          </div>
        </aside>

        {/* Content Workspace */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          
          {/* TAB 1: DASHBOARD */}
          {activeTab === "dashboard" && (
            <div className="flex flex-col gap-6 animate-fade-in">
              
              {/* Main Stats Cards Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                
                {/* 1. Net Profit */}
                <div className="p-5 rounded-2xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm hover:scale-[1.02] hover:shadow-md transition-all duration-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase">总盈亏</span>
                    <div className={`p-1.5 rounded-lg ${netProfit >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}>
                      <DollarSign size={14} />
                    </div>
                  </div>
                  <h3 className={`text-xl md:text-2xl font-black tracking-tight ${netProfit >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                    {netProfit >= 0 ? "+" : ""}{netProfit.toFixed(2)}
                  </h3>
                  <p className="text-xxs text-zinc-400 mt-1">账户净资金变动</p>
                </div>

                {/* 2. Win Rate */}
                <div className="p-5 rounded-2xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm hover:scale-[1.02] hover:shadow-md transition-all duration-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase">总胜率</span>
                    <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
                      <PieChart size={14} />
                    </div>
                  </div>
                  <h3 className="text-xl md:text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
                    {winRate.toFixed(1)}%
                  </h3>
                  <p className="text-xxs text-zinc-400 mt-1">win / (win + lose)</p>
                </div>

                {/* 3. Profit Factor */}
                <div className="p-5 rounded-2xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm hover:scale-[1.02] hover:shadow-md transition-all duration-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase">盈利因子</span>
                    <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                      <TrendingUp size={14} />
                    </div>
                  </div>
                  <h3 className={`text-xl md:text-2xl font-black tracking-tight ${profitFactor >= 1.5 ? "text-emerald-500" : profitFactor >= 1.0 ? "text-zinc-900 dark:text-zinc-50" : "text-rose-500"}`}>
                    {profitFactor.toFixed(2)}
                  </h3>
                  <p className="text-xxs text-zinc-400 mt-1">总盈利 / 总亏损</p>
                </div>

                {/* 4. Average Win */}
                <div className="p-5 rounded-2xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm hover:scale-[1.02] hover:shadow-md transition-all duration-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase">平均盈利</span>
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                      <DollarSign size={14} />
                    </div>
                  </div>
                  <h3 className="text-xl md:text-2xl font-black tracking-tight text-emerald-500">
                    +{avgWin.toFixed(2)}
                  </h3>
                  <p className="text-xxs text-zinc-400 mt-1">每笔赢单均值</p>
                </div>

                {/* 5. Average Loss */}
                <div className="p-5 rounded-2xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm hover:scale-[1.02] hover:shadow-md transition-all duration-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase">平均亏损</span>
                    <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500">
                      <DollarSign size={14} />
                    </div>
                  </div>
                  <h3 className="text-xl md:text-2xl font-black tracking-tight text-rose-500">
                    -{avgLoss.toFixed(2)}
                  </h3>
                  <p className="text-xxs text-zinc-400 mt-1">每笔输单均值</p>
                </div>

                {/* 6. PnL Ratio */}
                <div className="p-5 rounded-2xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm hover:scale-[1.02] hover:shadow-md transition-all duration-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase">风险回报比</span>
                    <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-500">
                      <TrendingUp size={14} />
                    </div>
                  </div>
                  <h3 className={`text-xl md:text-2xl font-black tracking-tight ${pnlRatio >= 2.0 ? "text-emerald-500" : pnlRatio >= 1.0 ? "text-zinc-900 dark:text-zinc-50" : "text-rose-500"}`}>
                    {pnlRatio.toFixed(2)}
                  </h3>
                  <p className="text-xxs text-zinc-400 mt-1">平均盈 / 平均亏</p>
                </div>
              </div>

              {/* Capital Curve Area Chart */}
              <div className="p-6 rounded-3xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm transition-colors duration-200">
                <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-100 mb-4 flex items-center gap-2">
                  <TrendingUp size={18} className="text-emerald-500" />
                  累计盈亏资金曲线
                </h3>
                <div className="h-80 w-full">
                  {capitalCurveData.length > 0 ? (
                    dashboardReady ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={capitalCurveData}>
                        <defs>
                          <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#27272a" : "#f4f4f5"} />
                        <XAxis 
                          dataKey="date" 
                          stroke={darkMode ? "#71717a" : "#a1a1aa"} 
                          fontSize={11} 
                          tickLine={false}
                        />
                        <YAxis 
                          stroke={darkMode ? "#71717a" : "#a1a1aa"} 
                          fontSize={11} 
                          tickLine={false} 
                          axisLine={false}
                        />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: darkMode ? "#18181b" : "#ffffff",
                            borderColor: darkMode ? "#27272a" : "#e4e4e7",
                            borderRadius: "12px",
                            color: darkMode ? "#f4f4f5" : "#18181b"
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="pnl" 
                          name="累计盈亏" 
                          stroke="#10b981" 
                          strokeWidth={2.5} 
                          fillOpacity={1} 
                          fill="url(#colorPnl)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center text-zinc-400">
                        加载图表中...
                      </div>
                    )
                  ) : (
                    <div className="flex h-full items-center justify-center text-zinc-400">
                      暂无交易记录，无法显示盈亏曲线。
                    </div>
                  )}
                </div>
              </div>

              {/* Chart breakdown subgrid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Chart A: Setup Performance Bar Chart */}
                <div className="p-6 rounded-3xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm transition-colors duration-200">
                  <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-100 mb-4 flex items-center gap-2">
                    <TrendingUp size={18} className="text-emerald-500" />
                    各入场理由盈利表现 (Top Setups)
                  </h3>
                  <div className="h-80 w-full">
                    {setupChartData.length > 0 ? (
                      dashboardReady ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={setupChartData.slice(0, 10)} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={darkMode ? "#27272a" : "#f4f4f5"} />
                          <XAxis type="number" stroke={darkMode ? "#71717a" : "#a1a1aa"} fontSize={10} />
                          <YAxis 
                            type="category" 
                            dataKey="name" 
                            stroke={darkMode ? "#71717a" : "#a1a1aa"} 
                            fontSize={10} 
                            width={110} 
                            tickFormatter={(v) => v.length > 12 ? v.substring(0, 12) + "..." : v}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: darkMode ? "#18181b" : "#ffffff",
                              borderColor: darkMode ? "#27272a" : "#e4e4e7",
                              borderRadius: "12px",
                              color: darkMode ? "#f4f4f5" : "#18181b"
                            }}
                          />
                          <Bar dataKey="pnl" name="总盈亏">
                            {setupChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? "#10b981" : "#f43f5e"} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                      ) : (
                        <div className="flex h-full items-center justify-center text-zinc-400">
                          加载图表中...
                        </div>
                      )
                    ) : (
                      <div className="flex h-full items-center justify-center text-zinc-400">
                        暂无数据，请先录入交易。
                      </div>
                    )}
                  </div>
                </div>

                {/* Chart B: Error reasons breakdown Pie Chart */}
                <div className="p-6 rounded-3xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm transition-colors duration-200">
                  <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-100 mb-4 flex items-center gap-2">
                    <AlertTriangle size={18} className="text-rose-500" />
                    做错原因分布 (Error Breakdown)
                  </h3>
                  <div className="h-80 flex flex-col md:flex-row items-center justify-center gap-4">
                    {errorPieData.length > 0 ? (
                      dashboardReady ? (
                      <>
                        <div className="h-60 w-60 shrink-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <RePieChart>
                              <Pie
                                data={errorPieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={3}
                                dataKey="value"
                              >
                                {errorPieData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: darkMode ? "#18181b" : "#ffffff",
                                  borderColor: darkMode ? "#27272a" : "#e4e4e7",
                                  borderRadius: "12px",
                                  color: darkMode ? "#f4f4f5" : "#18181b"
                                }}
                              />
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
                      ) : (
                        <div className="flex h-full items-center justify-center text-zinc-400">
                          加载图表中...
                        </div>
                      )
                    ) : (
                      <div className="flex h-full items-center justify-center text-zinc-400">
                        目前非常完美，未记录任何错误记录！
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: JOURNAL GRID */}
          {activeTab === "journal" && (
            <div className="flex flex-col gap-6 animate-fade-in">
              
              {/* Header and Control row */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">交易日志仓</h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">在此记录和编辑你的每一笔交易数据</p>
                </div>
                <button
                  onClick={() => {
                    setPendingScreenshots([]);
                    setInlineEditingId("__new__");
                    setTradeForm({
                      date: new Date().toISOString().split("T")[0],
                      remarks: "",
                      setup: setups[0]?.name || "",
                      type: "趋势延续（Continuation）",
                      exitReason: exits[0]?.name || "",
                      notes: "",
                      positionSize: 1,
                      direction: "Long",
                      entryPrice: 0,
                      exitPrice1: 0,
                      exitPrice2: "",
                      errorReason: "",
                      symbol: symbols[0]?.name || ""
                    });
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-white font-bold text-sm shadow-md hover:bg-emerald-600 shadow-emerald-500/25 active:scale-95 transition-all duration-200"
                >
                  <Plus size={16} />
                  新建交易记录
                </button>
              </div>

              {/* Advanced Filter panel */}
              <div className="p-4 rounded-2xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 w-full sm:w-64">
                  <Filter size={14} className="text-zinc-400" />
                  <input
                    type="text"
                    placeholder="搜索备注/笔记/理由..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent border-none outline-none text-xs focus:ring-0"
                  />
                </div>

                {/* Symbol Filter */}
                <select
                  value={symbolFilter}
                  onChange={(e) => setSymbolFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-xs focus:outline-none"
                >
                  <option value="all">所有品类</option>
                  {symbols.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>

                {/* Direction Filter */}
                <select
                  value={directionFilter}
                  onChange={(e) => setDirectionFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-xs focus:outline-none"
                >
                  <option value="all">所有方向</option>
                  <option value="Long">Long (做多)</option>
                  <option value="Short">Short (做空)</option>
                </select>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-xs focus:outline-none"
                >
                  <option value="all">所有盈亏状态</option>
                  <option value="win">Win (盈利)</option>
                  <option value="lose">Lose (亏损)</option>
                  <option value="BE">BE (保本)</option>
                </select>

                {/* Setup Filter */}
                <select
                  value={setupFilter}
                  onChange={(e) => setSetupFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-xs max-w-xs focus:outline-none"
                >
                  <option value="all">所有入场理由</option>
                  {setups.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>

                {/* Type Filter */}
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-xs focus:outline-none"
                >
                  <option value="all">所有交易类型</option>
                  <option value="趋势延续（Continuation）">趋势延续 (Continuation)</option>
                  <option value="反转（Reversal）">反转 (Reversal)</option>
                  <option value="突破（BO）">突破 (BO)</option>
                  <option value="假突破（fBO）">假突破 (fBO)</option>
                </select>

                {/* Clear filters */}
                {(searchQuery || directionFilter !== "all" || statusFilter !== "all" || setupFilter !== "all" || typeFilter !== "all" || symbolFilter !== "all") && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setDirectionFilter("all");
                      setStatusFilter("all");
                      setSetupFilter("all");
                      setTypeFilter("all");
                      setSymbolFilter("all");
                    }}
                    className="text-xs text-rose-500 hover:underline ml-auto"
                  >
                    重置筛选
                  </button>
                )}
              </div>

              {/* Data Table */}
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 shadow-sm transition-colors duration-200">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-800 font-bold text-zinc-500 dark:text-zinc-400">
                        <th className="p-4">日期</th>
                        <th className="p-4">品类</th>
                        <th className="p-4">方向</th>
                        <th className="p-4">入场原因</th>
                        <th className="p-4">交易类型</th>
                        <th className="p-4">仓位</th>
                        <th className="p-4">入场/离场价格</th>
                        <th className="p-4 text-right">盈亏点数/金额</th>
                        <th className="p-4">盈亏状态</th>
                        <th className="p-4">离场理由</th>
                        <th className="p-4">错误原因</th>
                        <th className="p-4">备注/说明</th>
                        <th className="p-4 text-center">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {inlineEditingId === "__new__" && (
                        <React.Fragment>
                          <tr className="bg-emerald-500/5 dark:bg-emerald-500/5 inline-edit-row border-b border-emerald-500/20">
                            {renderInlineEditCells(handleSaveTrade, () => { pendingScreenshots.forEach(p => URL.revokeObjectURL(p.preview)); setPendingScreenshots([]); setInlineEditingId(null); })}
                          </tr>
                          <tr className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
                            <td colSpan={13} className="p-3">
                              <div className="flex flex-col gap-3">
                                <h4 className="text-xs font-bold flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                                  <Camera size={14} className="text-emerald-500" />
                                  <span>交易截图（保存后自动上传，支持 Cmd+V 粘贴）</span>
                                </h4>
                                {pendingScreenshots.length > 0 && (
                                  <div className="flex flex-wrap gap-2">
                                    {pendingScreenshots.map((item, idx) => (
                                      <div key={idx} className="relative group rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 w-[100px]">
                                        <img
                                          src={item.preview}
                                          alt={item.file.name}
                                          className="w-full h-[60px] object-cover"
                                        />
                                        <button
                                          onClick={() => removePendingScreenshot(idx)}
                                          className="absolute top-1 right-1 p-1 rounded-full bg-rose-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                          <X size={10} />
                                        </button>
                                        <div className="absolute bottom-0 inset-x-0 bg-black/60 text-[8px] text-white py-0.5 px-1 truncate">
                                          {item.file.name}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xxs font-semibold text-zinc-600 dark:text-zinc-400 cursor-pointer transition-colors w-fit">
                                  <Upload size={12} />
                                  <span>选择截图</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handlePendingFileSelect}
                                    className="hidden"
                                  />
                                </label>
                              </div>
                            </td>
                          </tr>
                        </React.Fragment>
                      )}
                      {filteredTrades.length > 0 ? (
                        filteredTrades.map(trade => {
                          if (inlineEditingId === trade.id) {
                            return (
                              <React.Fragment key={trade.id}>
                                <tr className="bg-emerald-500/5 dark:bg-emerald-500/5 inline-edit-row border-b border-emerald-500/20">
                                  {renderInlineEditCells(handleSaveTrade, () => setInlineEditingId(null))}
                                </tr>
                                <tr className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
                                  <td colSpan={13} className="p-3">
                                    <div className="flex flex-col gap-3">
                                      <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-bold flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                                          <Camera size={14} className="text-emerald-500" />
                                          <span>交易截图 ({trade.screenshots?.length || 0} 张)</span>
                                        </h4>
                                      </div>
                                      {trade.screenshots && trade.screenshots.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                          {trade.screenshots.map(pic => (
                                            <div key={pic.id} className="relative group rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 w-[100px]">
                                              <img
                                                src={`/api/screenshots/${pic.id}`}
                                                alt={pic.filename}
                                                onClick={() => setLightboxImage(`/api/screenshots/${pic.id}`)}
                                                className="screenshot-thumb w-full cursor-pointer"
                                              />
                                              <button
                                                onClick={() => handleDeleteScreenshot(trade.id, pic.id)}
                                                className="absolute top-1 right-1 p-1 rounded-full bg-rose-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="删除截图"
                                              >
                                                <X size={10} />
                                              </button>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      {pendingScreenshots.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                          {pendingScreenshots.map((item, idx) => (
                                            <div key={idx} className="relative group rounded-lg overflow-hidden border border-dashed border-emerald-400 dark:border-emerald-600 w-[100px]">
                                              <img
                                                src={item.preview}
                                                alt={item.file.name}
                                                className="w-full h-[60px] object-cover"
                                              />
                                              <button
                                                onClick={() => removePendingScreenshot(idx)}
                                                className="absolute top-1 right-1 p-1 rounded-full bg-rose-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                              >
                                                <X size={10} />
                                              </button>
                                              <div className="absolute bottom-0 inset-x-0 bg-black/60 text-[8px] text-white py-0.5 px-1 truncate">
                                                待上传
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xxs font-semibold text-zinc-600 dark:text-zinc-400 cursor-pointer transition-colors w-fit">
                                        <Upload size={12} />
                                        <span>选择截图（保存时上传，支持 Cmd+V 粘贴）</span>
                                        <input
                                          type="file"
                                          accept="image/*"
                                          multiple
                                          onChange={handlePendingFileSelect}
                                          className="hidden"
                                        />
                                      </label>
                                      {isUploadingScreenshot && (
                                        <span className="text-[10px] text-zinc-400 flex items-center gap-1.5">
                                          <RefreshCw size={10} className="animate-spin text-emerald-500" />
                                          正在上传...
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              </React.Fragment>
                            );
                          }

                          return (
                            <React.Fragment key={trade.id}>
                              <tr className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30 transition-colors">
                                <td className="p-4 font-mono font-medium whitespace-nowrap">
                                  {new Date(trade.date).toISOString().split("T")[0]}
                                </td>
                                <td className="p-4 whitespace-nowrap">
                                  <span className="px-2 py-0.5 rounded-full font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xxs">
                                    {trade.symbol || "未知"}
                                  </span>
                                </td>
                                <td className="p-4">
                                  <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-xxs ${
                                    trade.direction === "Long" 
                                      ? "bg-emerald-500/10 text-emerald-500 dark:text-emerald-400" 
                                      : "bg-rose-500/10 text-rose-500 dark:text-rose-400"
                                  }`}>
                                    {trade.direction}
                                  </span>
                                </td>
                                <td className="p-4 font-semibold text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                                  {trade.setup}
                                </td>
                                <td className="p-4 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                                  {trade.type}
                                </td>
                                <td className="p-4 font-mono">{trade.positionSize}</td>
                                <td className="p-4 font-mono text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                                  <div>入: {trade.entryPrice}</div>
                                  <div>出1: {trade.exitPrice1}</div>
                                  {trade.exitPrice2 && <div>出2: {trade.exitPrice2}</div>}
                                </td>
                                <td className={`p-4 font-mono font-bold text-right whitespace-nowrap ${
                                  trade.pnl > 0 ? "text-emerald-500" : trade.pnl < 0 ? "text-rose-500" : "text-zinc-500"
                                }`}>
                                  {trade.pnl > 0 ? "+" : ""}{trade.pnl.toFixed(2)}
                                </td>
                                <td className="p-4">
                                  <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-xxs ${
                                    trade.status === "win"
                                      ? "bg-emerald-500/10 text-emerald-500 dark:text-emerald-400"
                                      : trade.status === "lose"
                                      ? "bg-rose-500/10 text-rose-500 dark:text-rose-400"
                                      : "bg-zinc-500/10 text-zinc-400"
                                  }`}>
                                    {trade.status}
                                  </span>
                                </td>
                                <td className="p-4 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">{trade.exitReason}</td>
                                <td className="p-4 text-rose-500 dark:text-rose-400 whitespace-nowrap font-medium">{trade.errorReason || "-"}</td>
                                <td className="p-4 max-w-xs truncate" title={trade.remarks || ""}>
                                  <div className="font-semibold text-zinc-700 dark:text-zinc-300 truncate">{trade.remarks || "-"}</div>
                                  <div className="text-xxs text-zinc-400 truncate">{trade.notes}</div>
                                </td>
                                <td className="p-4">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      onClick={() => {
                                        setExpandedScreenshotId(prev => prev === trade.id ? null : trade.id);
                                      }}
                                      title="查看/上传截图"
                                      className={`p-1.5 rounded transition-colors ${
                                        expandedScreenshotId === trade.id
                                          ? "bg-emerald-500 text-white"
                                          : (trade.screenshots && trade.screenshots.length > 0)
                                          ? "text-emerald-500 hover:bg-emerald-500/10"
                                          : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                      }`}
                                    >
                                      <Camera size={14} />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setPendingScreenshots([]);
                                        setInlineEditingId(trade.id);
                                        setTradeForm({
                                          date: new Date(trade.date).toISOString().split("T")[0],
                                          remarks: trade.remarks || "",
                                          setup: trade.setup,
                                          type: trade.type,
                                          exitReason: trade.exitReason,
                                          notes: trade.notes || "",
                                          positionSize: trade.positionSize,
                                          direction: trade.direction,
                                          entryPrice: trade.entryPrice,
                                          exitPrice1: trade.exitPrice1,
                                          exitPrice2: trade.exitPrice2 !== null ? String(trade.exitPrice2) : "",
                                          errorReason: trade.errorReason || "",
                                          symbol: trade.symbol
                                        });
                                      }}
                                      title="编辑交易"
                                      className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                                    >
                                      <Edit size={14} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteTrade(trade.id)}
                                      title="删除交易"
                                      className="p-1.5 rounded hover:bg-rose-500/10 text-zinc-500 hover:text-rose-500"
                                    >
                                      <Trash size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                              {expandedScreenshotId === trade.id && (
                                <tr className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
                                  <td colSpan={12} className="p-4">
                                    <div className="screenshot-expand flex flex-col gap-4">
                                      <div className="flex items-center justify-between border-b pb-2 dark:border-zinc-800">
                                        <h4 className="text-xs font-bold flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                                          <Camera size={14} className="text-emerald-500" />
                                          <span>交易截图管理 ({trade.remarks || trade.setup})</span>
                                        </h4>
                                        <button
                                          onClick={() => setExpandedScreenshotId(null)}
                                          className="text-xxs text-zinc-400 hover:text-zinc-650"
                                        >
                                          收起
                                        </button>
                                      </div>
                                      
                                      <div className="flex flex-col gap-4">
                                        {trade.screenshots && trade.screenshots.length > 0 ? (
                                          <div className="screenshot-grid">
                                            {trade.screenshots.map(pic => (
                                              <div key={pic.id} className="relative group rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 w-[120px]">
                                                <img
                                                  src={`/api/screenshots/${pic.id}`}
                                                  alt={pic.filename}
                                                  onClick={() => setLightboxImage(`/api/screenshots/${pic.id}`)}
                                                  className="screenshot-thumb w-full"
                                                />
                                                <button
                                                  onClick={() => handleDeleteScreenshot(trade.id, pic.id)}
                                                  className="absolute top-1 right-1 p-1 rounded-full bg-rose-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                                  title="删除截图"
                                                >
                                                  <X size={10} />
                                                </button>
                                                <div className="absolute bottom-0 inset-x-0 bg-black/60 text-[8px] text-white py-0.5 px-1 truncate" title={pic.filename}>
                                                  {pic.filename}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <p className="text-xxs text-zinc-400 italic">暂无截图。您可以上传图表截图以便后续复盘。</p>
                                        )}

                                        <div className="flex items-center gap-3">
                                          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xxs font-semibold text-zinc-600 dark:text-zinc-400 cursor-pointer transition-colors w-fit">
                                            <Upload size={12} />
                                            <span>添加截图</span>
                                            <input
                                              type="file"
                                              accept="image/*"
                                              multiple
                                              onChange={(e) => handleUploadScreenshots(trade.id, e.target.files)}
                                              className="hidden"
                                            />
                                          </label>
                                          {isUploadingScreenshot && (
                                            <span className="text-[10px] text-zinc-400 flex items-center gap-1.5">
                                              <RefreshCw size={10} className="animate-spin text-emerald-500" />
                                              正在上传...
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={12} className="p-8 text-center text-zinc-400">
                            未找到符合筛选条件的交易记录。
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: DISCIPLINE DIARY */}
          {activeTab === "diary" && (
            <div className="flex flex-col gap-6 animate-fade-in">
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">别瞎搞日记本</h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">每天记录你的行为合规性与心态状况</p>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-emerald-500" />
                  <input
                    type="date"
                    value={selectedDiaryDate}
                    onChange={(e) => setSelectedDiaryDate(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold focus:outline-none shadow-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Checkin checklist Form */}
                <div className="lg:col-span-2 p-6 rounded-3xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col gap-6">
                  <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 border-b pb-3 border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                    <span>每日规则打卡 ({selectedDiaryDate})</span>
                    <span className="text-xxs px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-500">
                      {diaryEntries.some(d => new Date(d.date).toISOString().split("T")[0] === selectedDiaryDate) ? "已打卡" : "未记录"}
                    </span>
                  </h3>

                  <form onSubmit={handleSaveDiary} className="flex flex-col gap-5">
                    
                    {/* The 5 Compliance Rules */}
                    <div className="flex flex-col gap-3">
                      
                      {/* Rule 1: Limiting Rules (限) */}
                      <label className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all duration-200 ${
                        diaryForm.ruleExecuted 
                          ? "bg-emerald-500/5 border-emerald-500/35 text-emerald-600 dark:text-emerald-400 shadow-sm shadow-emerald-500/5"
                          : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
                      }`}>
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-xl font-black text-xs flex items-center justify-center ${diaryForm.ruleExecuted ? "bg-emerald-500 text-white" : "bg-zinc-100 dark:bg-zinc-800"}`}>
                            限
                          </div>
                          <div>
                            <p className="text-xs font-bold">是否执行规则？</p>
                            <p className="text-xxs text-zinc-400 mt-0.5">限制不合理的入场与冲动下单</p>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={diaryForm.ruleExecuted}
                          onChange={(e) => setDiaryForm(prev => ({ ...prev, ruleExecuted: e.target.checked }))}
                          className="h-5 w-5 rounded-md text-emerald-500 border-zinc-300 dark:border-zinc-700 focus:ring-emerald-500 focus:ring-offset-0"
                        />
                      </label>

                      {/* Rule 2: Emotion Stable (隐) */}
                      <label className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all duration-200 ${
                        diaryForm.emotionStable 
                          ? "bg-emerald-500/5 border-emerald-500/35 text-emerald-600 dark:text-emerald-400 shadow-sm shadow-emerald-500/5"
                          : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
                      }`}>
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-xl font-black text-xs flex items-center justify-center ${diaryForm.emotionStable ? "bg-emerald-500 text-white" : "bg-zinc-100 dark:bg-zinc-800"}`}>
                            隐
                          </div>
                          <div>
                            <p className="text-xs font-bold">是否情绪稳定？</p>
                            <p className="text-xxs text-zinc-400 mt-0.5">保持心如止水，不让亏损或盈利影响决策</p>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={diaryForm.emotionStable}
                          onChange={(e) => setDiaryForm(prev => ({ ...prev, emotionStable: e.target.checked }))}
                          className="h-5 w-5 rounded-md text-emerald-500 border-zinc-300 dark:border-zinc-700 focus:ring-emerald-500 focus:ring-offset-0"
                        />
                      </label>

                      {/* Rule 3: Record Kept (记) */}
                      <label className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all duration-200 ${
                        diaryForm.recordKept 
                          ? "bg-emerald-500/5 border-emerald-500/35 text-emerald-600 dark:text-emerald-400 shadow-sm shadow-emerald-500/5"
                          : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
                      }`}>
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-xl font-black text-xs flex items-center justify-center ${diaryForm.recordKept ? "bg-emerald-500 text-white" : "bg-zinc-100 dark:bg-zinc-800"}`}>
                            记
                          </div>
                          <div>
                            <p className="text-xs font-bold">是否做记录？</p>
                            <p className="text-xxs text-zinc-400 mt-0.5">每笔单子都有截图、有理由、有分析记录</p>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={diaryForm.recordKept}
                          onChange={(e) => setDiaryForm(prev => ({ ...prev, recordKept: e.target.checked }))}
                          className="h-5 w-5 rounded-md text-emerald-500 border-zinc-300 dark:border-zinc-700 focus:ring-emerald-500 focus:ring-offset-0"
                        />
                      </label>

                      {/* Rule 4: Prepared (离) */}
                      <label className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all duration-200 ${
                        diaryForm.prepared 
                          ? "bg-emerald-500/5 border-emerald-500/35 text-emerald-600 dark:text-emerald-400 shadow-sm shadow-emerald-500/5"
                          : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
                      }`}>
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-xl font-black text-xs flex items-center justify-center ${diaryForm.prepared ? "bg-emerald-500 text-white" : "bg-zinc-100 dark:bg-zinc-800"}`}>
                            离
                          </div>
                          <div>
                            <p className="text-xs font-bold">是否提前准备？</p>
                            <p className="text-xxs text-zinc-400 mt-0.5">入场前已想好离场方案和防守策略</p>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={diaryForm.prepared}
                          onChange={(e) => setDiaryForm(prev => ({ ...prev, prepared: e.target.checked }))}
                          className="h-5 w-5 rounded-md text-emerald-500 border-zinc-300 dark:border-zinc-700 focus:ring-emerald-500 focus:ring-offset-0"
                        />
                      </label>

                      {/* Rule 5: No FOMO (止) */}
                      <label className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all duration-200 ${
                        diaryForm.noFomo 
                          ? "bg-emerald-500/5 border-emerald-500/35 text-emerald-600 dark:text-emerald-400 shadow-sm shadow-emerald-500/5"
                          : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
                      }`}>
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-xl font-black text-xs flex items-center justify-center ${diaryForm.noFomo ? "bg-emerald-500 text-white" : "bg-zinc-100 dark:bg-zinc-800"}`}>
                            止
                          </div>
                          <div>
                            <p className="text-xs font-bold">没有 FOMO？</p>
                            <p className="text-xxs text-zinc-400 mt-0.5">克制踏空焦虑，不盲目追涨杀跌，耐心等待</p>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={diaryForm.noFomo}
                          onChange={(e) => setDiaryForm(prev => ({ ...prev, noFomo: e.target.checked }))}
                          className="h-5 w-5 rounded-md text-emerald-500 border-zinc-300 dark:border-zinc-700 focus:ring-emerald-500 focus:ring-offset-0"
                        />
                      </label>

                    </div>

                    {/* Daily PnL & Remarks */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-zinc-500">今日总盈亏</label>
                        <input
                          type="number"
                          value={diaryForm.pnl || ""}
                          onChange={(e) => setDiaryForm(prev => ({ ...prev, pnl: parseFloat(e.target.value) || 0 }))}
                          className="px-3 py-2 border rounded-xl dark:bg-zinc-800 dark:border-zinc-700 text-sm focus:outline-none"
                          placeholder="填入数字盈亏，可为负"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-zinc-500">备注（感悟/盘后分析）</label>
                        <input
                          type="text"
                          value={diaryForm.remarks}
                          onChange={(e) => setDiaryForm(prev => ({ ...prev, remarks: e.target.value }))}
                          className="px-3 py-2 border rounded-xl dark:bg-zinc-800 dark:border-zinc-700 text-sm focus:outline-none"
                          placeholder="例如：今天克制得很好，无FOMO"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="mt-2 w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm rounded-2xl shadow-lg shadow-emerald-500/20 transition-all duration-200"
                    >
                      保存今日打卡状态
                    </button>
                  </form>
                </div>

                {/* Diary History List */}
                <div className="p-6 rounded-3xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col gap-4">
                  <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 border-b pb-3 border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                    <span>打卡历史记录</span>
                    <span className="text-xxs text-zinc-400 font-mono">共 {diaryEntries.length} 天</span>
                  </h3>

                  <div className="flex flex-col gap-3 overflow-y-auto max-h-[480px] pr-2">
                    {diaryEntries.length > 0 ? (
                      diaryEntries.slice().reverse().map(entry => {
                        const dateStr = new Date(entry.date).toISOString().split("T")[0];
                        const checkedCount = [entry.ruleExecuted, entry.emotionStable, entry.recordKept, entry.prepared, entry.noFomo].filter(Boolean).length;
                        
                        return (
                          <div 
                            key={entry.id} 
                            onClick={() => setSelectedDiaryDate(dateStr)}
                            className={`p-3 rounded-2xl border cursor-pointer hover:scale-[1.01] transition-all duration-200 ${
                              selectedDiaryDate === dateStr 
                                ? "bg-emerald-500/5 border-emerald-500/30 shadow-sm" 
                                : "border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200">{dateStr}</span>
                              <span className={`text-xs font-mono font-bold ${entry.pnl >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                                {entry.pnl >= 0 ? "+" : ""}{entry.pnl}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-1.5 mt-2">
                              {["限", "隐", "记", "离", "止"].map((label, idx) => {
                                const checked = [entry.ruleExecuted, entry.emotionStable, entry.recordKept, entry.prepared, entry.noFomo][idx];
                                return (
                                  <span 
                                    key={idx}
                                    className={`text-xxs px-1.5 py-0.5 rounded font-black ${
                                      checked 
                                        ? "bg-emerald-500/10 text-emerald-500 dark:text-emerald-400" 
                                        : "bg-rose-500/10 text-rose-500 dark:text-rose-400"
                                    }`}
                                  >
                                    {label}
                                  </span>
                                );
                              })}
                              
                              <span className="text-xxs text-zinc-400 ml-auto font-bold">{checkedCount}/5 达标</span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center text-zinc-400 py-10 text-xs">
                        尚无打卡数据，赶快选择日期打卡第一天吧！
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 4: SETTINGS */}
          {activeTab === "settings" && (
            <div className="flex flex-col gap-6 animate-fade-in">
              
              <div>
                <h2 className="text-xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">系统设置与管理</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">导入/导出 Excel，并配置入场理由、错误原因、离场理由等筛选项目</p>
              </div>

              {/* Data Import / Export Panel */}
              <div className="p-6 rounded-3xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col gap-4">
                <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 border-b pb-3 border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
                  <RefreshCw size={16} className="text-emerald-500" />
                  Excel 模板数据互通
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                  
                  {/* Import Excel */}
                  <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between gap-4">
                    <div>
                      <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                        <Upload size={14} className="text-emerald-500" />
                        导入交易日志 (xlsx)
                      </h4>
                      <p className="text-xxs text-zinc-400 mt-1">
                        上传现有的 `交易日志模板菜真寒版.xlsx`。系统将自动解析您的交易记录、每日日记以及入场理由。<strong>注意：这会清空系统内当前的交易记录并以 Excel 的数据为准！</strong>
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <label className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl cursor-pointer text-center active:scale-95 transition-all shadow-md shadow-emerald-500/10">
                        {isImporting ? "正在处理中..." : "选择并导入 Excel"}
                        <input
                          type="file"
                          accept=".xlsx"
                          onChange={handleImportExcel}
                          disabled={isImporting}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Export Excel */}
                  <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between gap-4">
                    <div>
                      <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                        <Download size={14} className="text-emerald-500" />
                        导出交易日志 (xlsx)
                      </h4>
                      <p className="text-xxs text-zinc-400 mt-1">
                        将数据库中的交易日志、盘后日记本以及自定义选项完整导出为一个兼容原格式的 `.xlsx` 工作簿，包含自动计算公式、侧边栏数据统计和分类分析模块。
                      </p>
                    </div>
                    
                    <div>
                      <a
                        href="/api/export"
                        download="trading-log-export.xlsx"
                        className="inline-block px-4 py-2 bg-zinc-800 hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 text-white text-xs font-bold rounded-xl text-center active:scale-95 transition-all shadow-sm"
                      >
                        生成并下载 Excel 文件
                      </a>
                    </div>
                  </div>

                </div>

                {importStatus && (
                  <div className="mt-2 p-3 rounded-xl bg-indigo-500/5 text-indigo-500 dark:text-indigo-400 border border-indigo-500/10 text-xs flex items-center gap-2 font-medium">
                    <span className="h-2 w-2 rounded-full bg-indigo-500 animate-ping shrink-0"></span>
                    {importStatus}
                  </div>
                )}
              </div>

              {/* Dynamic Option Management Panels Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* 1. Setup Options Management */}
                <div className="p-5 rounded-3xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col gap-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 border-b pb-2 dark:border-zinc-800">
                    入场理由配置 ({setups.length})
                  </h3>
                  
                  {/* Add Input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="新入场理由..."
                      value={newSetupName}
                      onChange={(e) => setNewSetupName(e.target.value)}
                      className="flex-1 px-3 py-1.5 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 text-xs focus:outline-none"
                    />
                    <button
                      onClick={handleAddSetup}
                      className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-bold rounded-lg hover:bg-emerald-600"
                    >
                      添加
                    </button>
                  </div>

                  {/* Options List */}
                  <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
                    {setups.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xxs font-medium text-zinc-700 dark:text-zinc-300">
                        <span className="truncate">{item.name}</span>
                        <button
                          onClick={() => handleDeleteSetup(item.id)}
                          className="text-zinc-400 hover:text-rose-500 transition-colors p-1"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Error Options Management */}
                <div className="p-5 rounded-3xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col gap-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 border-b pb-2 dark:border-zinc-800">
                    做错原因配置 ({errors.length})
                  </h3>
                  
                  {/* Add Input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="新错误原因..."
                      value={newErrorName}
                      onChange={(e) => setNewErrorName(e.target.value)}
                      className="flex-1 px-3 py-1.5 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 text-xs focus:outline-none"
                    />
                    <button
                      onClick={handleAddError}
                      className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-bold rounded-lg hover:bg-emerald-600"
                    >
                      添加
                    </button>
                  </div>

                  {/* Options List */}
                  <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
                    {errors.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xxs font-medium text-zinc-700 dark:text-zinc-300">
                        <span className="truncate">{item.name}</span>
                        <button
                          onClick={() => handleDeleteError(item.id)}
                          className="text-zinc-400 hover:text-rose-500 transition-colors p-1"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Exit Options Management */}
                <div className="p-5 rounded-3xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col gap-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 border-b pb-2 dark:border-zinc-800">
                    离场理由配置 ({exits.length})
                  </h3>
                  
                  {/* Add Input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="新离场理由..."
                      value={newExitName}
                      onChange={(e) => setNewExitName(e.target.value)}
                      className="flex-1 px-3 py-1.5 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 text-xs focus:outline-none"
                    />
                    <button
                      onClick={handleAddExit}
                      className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-bold rounded-lg hover:bg-emerald-600"
                    >
                      添加
                    </button>
                  </div>

                  {/* Options List */}
                  <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
                    {exits.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xxs font-medium text-zinc-700 dark:text-zinc-300">
                        <span className="truncate">{item.name}</span>
                        <button
                          onClick={() => handleDeleteExit(item.id)}
                          className="text-zinc-400 hover:text-rose-500 transition-colors p-1"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Symbol Options Management */}
                <div className="p-5 rounded-3xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col gap-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 border-b pb-2 dark:border-zinc-800">
                    交易品类配置 ({symbols.length})
                  </h3>
                  
                  {/* Add Input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="新品类 (如 BTC)..."
                      value={newSymbolName}
                      onChange={(e) => setNewSymbolName(e.target.value)}
                      className="flex-1 px-3 py-1.5 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 text-xs focus:outline-none"
                    />
                    <button
                      onClick={handleAddSymbol}
                      className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-bold rounded-lg hover:bg-emerald-600"
                    >
                      添加
                    </button>
                  </div>

                  {/* Options List */}
                  <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
                    {symbols.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xxs font-medium text-zinc-700 dark:text-zinc-300">
                        <span className="truncate">{item.name}</span>
                        <button
                          onClick={() => handleDeleteSymbol(item.id)}
                          className="text-zinc-400 hover:text-rose-500 transition-colors p-1"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          )}

        </main>
      </div>

      {/* --- LIGHTBOX OVERLAY --- */}
      {lightboxImage && (
        <div
          className="lightbox-overlay"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img
              src={lightboxImage}
              alt="Preview"
              className="max-w-full max-h-[90vh] object-contain"
            />
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
