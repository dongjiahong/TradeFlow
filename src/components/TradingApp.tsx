"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  BookOpen,
  Settings,
  Plus,
  Trash,
  Edit,
  Check,
  X,
  Upload,
  Download,
  AlertTriangle,
  DollarSign,
  PieChart,
  Moon,
  Sun,
  ChevronRight,
  Filter,
  RefreshCw,
  Camera,
  Image as ImageIcon,
  BarChart3
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
  rr: number | null;
  status: string;
  symbol: string;
  errorReason: string | null;
  screenshots?: { id: string; filename: string }[];
}

interface OptionItem {
  id: string;
  name: string;
}

interface TradingAppProps {
  initialTrades: Trade[];
  initialSetups: OptionItem[];
  initialErrors: OptionItem[];
  initialExits: OptionItem[];
  initialSymbols: OptionItem[];
}

export default function TradingApp({
  initialTrades,
  initialSetups,
  initialErrors,
  initialExits,
  initialSymbols
}: TradingAppProps) {
  const [mounted, setMounted] = useState(false);
  const [dashboardReady, setDashboardReady] = useState(false);
  const [analysisReady, setAnalysisReady] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "journal" | "settings" | "analysis">("dashboard");
  const [darkMode, setDarkMode] = useState(false);
  // Analysis date filter
  const [quickRange, setQuickRange] = useState<"today" | "week" | "month" | "all">("all");
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: "",
    end: ""
  });

  // Core data states
  const [trades, setTrades] = useState<Trade[]>(initialTrades);
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
    rr: "",
    errorReason: "",
    symbol: ""
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

  // Reset chart ready state when switching to dashboard or analysis tab
  useEffect(() => {
    if (activeTab === "dashboard") {
      setDashboardReady(false);
      requestAnimationFrame(() => setDashboardReady(true));
    }
    if (activeTab === "analysis") {
      setAnalysisReady(false);
      requestAnimationFrame(() => setAnalysisReady(true));
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

  const overallComplianceRate = 0;

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
    const parsedRr = tradeForm.rr ? parseFloat(tradeForm.rr) : null;

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
      rr: parsedRr,
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
            <option value="趋势延续（Continuation）">趋势延续</option>
            <option value="反转（Reversal）">反转</option>
            <option value="突破（BO）">突破</option>
            <option value="假突破（fBO）">假突破</option>
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
            className="inline-cell-input dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 bg-white border-zinc-300 text-zinc-900 font-mono py-1.5 w-full min-w-[100px]"
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
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-zinc-400 w-8 shrink-0">RR:</span>
              <input
                type="number"
                step="any"
                value={tradeForm.rr}
                onChange={(e) => setTradeForm(prev => ({ ...prev, rr: e.target.value }))}
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
          setImportStatus(`导入成功！共导入了 ${res.tradesCount} 笔交易！`);
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
      <header className="flex h-16 items-center justify-between border-b px-6 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm transition-colors duration-200 fixed top-0 left-0 right-0 z-40">
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
      <div className="flex flex-1 overflow-hidden pt-16">
        
        {/* Navigation Sidebar */}
        <aside className="w-64 border-r bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 flex flex-col justify-between py-6 px-4 shrink-0 transition-colors duration-200 fixed top-16 left-0 bottom-0 z-30">
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
              onClick={() => setActiveTab("analysis")}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group ${
                activeTab === "analysis"
                  ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                  : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80"
              }`}
            >
              <BarChart3 size={18} className="transition-transform group-hover:scale-110" />
              行为分析
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
        <main className="flex-1 overflow-y-auto p-6 md:p-8 ml-64">
          
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
                      rr: "",
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
                  <option value="趋势延续（Continuation）">趋势延续</option>
                  <option value="反转（Reversal）">反转</option>
                  <option value="突破（BO）">突破</option>
                  <option value="假突破（fBO）">假突破</option>
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
                                          rr: trade.rr !== null ? String(trade.rr) : "",
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

          {/* TAB 5: BEHAVIOR ANALYSIS */}
          {activeTab === "analysis" && (
            <div className="flex flex-col gap-6 animate-fade-in">

              {/* Page Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">行为分析</h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">多维度统计分析，发现你的交易模式</p>
                </div>
              </div>

              {/* Date Filter Bar */}
              {(() => {
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
                  <div className="p-4 rounded-2xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center gap-3">
                    <Filter size={14} className="text-zinc-400 shrink-0" />
                    {presetRanges.map(p => (
                      <button
                        key={p.key}
                        onClick={() => setPreset(p.key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          quickRange === p.key
                            ? "bg-emerald-500 text-white shadow-sm"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                    <span className="text-zinc-300 dark:text-zinc-700">|</span>
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={e => { setDateRange(prev => ({ ...prev, start: e.target.value })); setQuickRange("all"); }}
                      className="px-2 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-xs"
                    />
                    <span className="text-xs text-zinc-400">~</span>
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={e => { setDateRange(prev => ({ ...prev, end: e.target.value })); setQuickRange("all"); }}
                      className="px-2 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-xs"
                    />
                  </div>
                );
              })()}

              {/* Filter Summary */}
              {(() => {
                const filtered = trades.filter(t => {
                  if (!dateRange.start && !dateRange.end) return true;
                  const d = new Date(t.date).toISOString().split("T")[0];
                  return d >= dateRange.start && d <= dateRange.end;
                });
                return (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    当前筛选范围内共 <span className="font-bold text-zinc-800 dark:text-zinc-200">{filtered.length}</span> 笔交易
                  </p>
                );
              })()}

              {/* Helper: filtered trades */}
              {(() => {
                const filtered = trades.filter(t => {
                  if (!dateRange.start && !dateRange.end) return true;
                  const d = new Date(t.date).toISOString().split("T")[0];
                  return d >= dateRange.start && d <= dateRange.end;
                });

                /* ── 1. 入场理由分析 ── */
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

                /* ── 2. 做错原因分析 ── */
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

                /* ── 3. 离场理由分析 ── */
                const exitMap = new Map<string, { count: number; wins: number; totalPnl: number }>();
                filtered.forEach(t => {
                  const s = exitMap.get(t.exitReason) || { count: 0, wins: 0, totalPnl: 0 };
                  s.count++; s.totalPnl += t.pnl;
                  if (t.status === "win") s.wins++;
                  exitMap.set(t.exitReason, s);
                });
                const exitStats = Array.from(exitMap.entries()).map(([name, s]) => ({
                  name, count: s.count,
                  winRate: parseFloat(((s.wins / s.count) * 100).toFixed(1)),
                  avgPnl: parseFloat((s.totalPnl / s.count).toFixed(2)),
                  totalPnl: parseFloat(s.totalPnl.toFixed(2))
                })).sort((a, b) => b.count - a.count);

                /* ── 4. 交易类型分析 ── */
                const typeMap = new Map<string, { count: number; wins: number; totalPnl: number }>();
                filtered.forEach(t => {
                  const s = typeMap.get(t.type) || { count: 0, wins: 0, totalPnl: 0 };
                  s.count++; s.totalPnl += t.pnl;
                  if (t.status === "win") s.wins++;
                  typeMap.set(t.type, s);
                });
                const typeStats = Array.from(typeMap.entries()).map(([name, s]) => ({
                  name, count: s.count,
                  winRate: parseFloat(((s.wins / s.count) * 100).toFixed(1)),
                  avgPnl: parseFloat((s.totalPnl / s.count).toFixed(2)),
                  totalPnl: parseFloat(s.totalPnl.toFixed(2))
                })).sort((a, b) => b.count - a.count);

                /* ── 5. 品类分析 ── */
                const symbolMap = new Map<string, { count: number; wins: number; totalPnl: number }>();
                filtered.forEach(t => {
                  const s = symbolMap.get(t.symbol) || { count: 0, wins: 0, totalPnl: 0 };
                  s.count++; s.totalPnl += t.pnl;
                  if (t.status === "win") s.wins++;
                  symbolMap.set(t.symbol, s);
                });
                const symbolStats = Array.from(symbolMap.entries()).map(([name, s]) => ({
                  name, count: s.count,
                  winRate: parseFloat(((s.wins / s.count) * 100).toFixed(1)),
                  avgPnl: parseFloat((s.totalPnl / s.count).toFixed(2)),
                  totalPnl: parseFloat(s.totalPnl.toFixed(2))
                })).sort((a, b) => b.count - a.count);

                /* ── 6. 方向分析 ── */
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

                /* Helper to render a dimension table */
                const renderStatTable = (data: { name: string; count: number; totalPnl: number; winRate: number; avgPnl: number }[]) => (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400">
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
                            <td className={`text-right py-2 px-3 font-mono font-bold ${row.totalPnl > 0 ? "text-emerald-500" : row.totalPnl < 0 ? "text-rose-500" : "text-zinc-500"}`}>
                              {row.totalPnl > 0 ? "+" : ""}{row.totalPnl.toFixed(2)}
                            </td>
                            <td className="text-right py-2 px-3 font-mono font-bold text-zinc-700 dark:text-zinc-300">{row.winRate}%</td>
                            <td className={`text-right py-2 px-3 font-mono font-bold ${row.avgPnl > 0 ? "text-emerald-500" : row.avgPnl < 0 ? "text-rose-500" : "text-zinc-500"}`}>
                              {row.avgPnl > 0 ? "+" : ""}{row.avgPnl.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );

                return (
                  <>{/* Container for all dimension blocks — inline rendering via array */}

                    {/* 1. 入场理由分析 */}
                    <div className="p-6 rounded-3xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm">
                      <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-100 mb-4 flex items-center gap-2">
                        <TrendingUp size={18} className="text-emerald-500" />
                        入场理由分析
                      </h3>
                      {setupStats.length > 0 ? (
                        <div className="flex flex-col lg:flex-row gap-6">
                          <div className="flex-1 min-w-0">
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400">
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
                                      <td className={`text-right py-2 px-3 font-mono font-bold ${row.totalPnl > 0 ? "text-emerald-500" : row.totalPnl < 0 ? "text-rose-500" : "text-zinc-500"}`}>
                                        {row.totalPnl > 0 ? "+" : ""}{row.totalPnl.toFixed(2)}
                                      </td>
                                      <td className="text-right py-2 px-3 font-mono font-bold text-zinc-700 dark:text-zinc-300">{row.winRate}%</td>
                                      <td className={`text-right py-2 px-3 font-mono font-bold ${row.avgPnl > 0 ? "text-emerald-500" : row.avgPnl < 0 ? "text-rose-500" : "text-zinc-500"}`}>
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
                            <div className="h-60 w-full lg:w-72 shrink-0">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={setupStats.slice(0, 8)} layout="vertical">
                                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={darkMode ? "#27272a" : "#f4f4f5"} />
                                  <XAxis type="number" stroke={darkMode ? "#71717a" : "#a1a1aa"} fontSize={10} />
                                  <YAxis type="category" dataKey="name" stroke={darkMode ? "#71717a" : "#a1a1aa"} fontSize={10} width={90}
                                    tickFormatter={(v: string) => v.length > 8 ? v.substring(0, 8) + "..." : v} />
                                  <Tooltip contentStyle={{ backgroundColor: darkMode ? "#18181b" : "#fff", borderColor: darkMode ? "#27272a" : "#e4e4e7", borderRadius: "12px" }} />
                                  <Bar dataKey="totalPnl" name="总盈亏">
                                    {setupStats.map((entry, idx) => (
                                      <Cell key={idx} fill={entry.totalPnl >= 0 ? "#10b981" : "#f43f5e"} />
                                    ))}
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-zinc-400">暂无数据</p>
                      )}
                    </div>

                    {/* 2. 做错原因分析 */}
                    <div className="p-6 rounded-3xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm">
                      <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-100 mb-4 flex items-center gap-2">
                        <AlertTriangle size={18} className="text-rose-500" />
                        做错原因分析
                      </h3>
                      {errorStats.length > 0 ? (
                        <div className="flex flex-col lg:flex-row gap-6 items-start">
                          {analysisReady && (
                            <div className="h-56 w-56 shrink-0">
                              <ResponsiveContainer width="100%" height="100%">
                                <RePieChart>
                                  <Pie data={errorStats} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={3} dataKey="count">
                                    {errorStats.map((_, idx) => (
                                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                                    ))}
                                  </Pie>
                                  <Tooltip contentStyle={{ backgroundColor: darkMode ? "#18181b" : "#fff", borderColor: darkMode ? "#27272a" : "#e4e4e7", borderRadius: "12px" }} />
                                </RePieChart>
                              </ResponsiveContainer>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400">
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
                                      <td className={`text-right py-2 px-3 font-mono font-bold ${row.avgPnl > 0 ? "text-emerald-500" : row.avgPnl < 0 ? "text-rose-500" : "text-zinc-500"}`}>
                                        {row.avgPnl > 0 ? "+" : ""}{row.avgPnl.toFixed(2)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-zinc-400">没有错误记录，继续保持！</p>
                      )}
                    </div>

                    {/* 3. 离场理由分析 */}
                    <div className="p-6 rounded-3xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm">
                      <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-100 mb-4 flex items-center gap-2">
                        <ChevronRight size={18} className="text-emerald-500" />
                        离场理由分析
                      </h3>
                      {exitStats.length > 0 ? (
                        <div className="flex flex-col lg:flex-row gap-6">
                          <div className="flex-1 min-w-0">{renderStatTable(exitStats)}</div>
                          {analysisReady && (
                            <div className="h-60 w-full lg:w-72 shrink-0">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={exitStats.slice(0, 8)} layout="vertical">
                                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={darkMode ? "#27272a" : "#f4f4f5"} />
                                  <XAxis type="number" stroke={darkMode ? "#71717a" : "#a1a1aa"} fontSize={10} />
                                  <YAxis type="category" dataKey="name" stroke={darkMode ? "#71717a" : "#a1a1aa"} fontSize={10} width={90}
                                    tickFormatter={(v: string) => v.length > 8 ? v.substring(0, 8) + "..." : v} />
                                  <Tooltip contentStyle={{ backgroundColor: darkMode ? "#18181b" : "#fff", borderColor: darkMode ? "#27272a" : "#e4e4e7", borderRadius: "12px" }} />
                                  <Bar dataKey="count" name="次数" fill="#38bdf8" />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-zinc-400">暂无数据</p>
                      )}
                    </div>

                    {/* 4. 交易类型分析 */}
                    <div className="p-6 rounded-3xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm">
                      <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-100 mb-4 flex items-center gap-2">
                        <BarChart3 size={18} className="text-emerald-500" />
                        交易类型分析
                      </h3>
                      {typeStats.length > 0 ? (
                        <div className="flex flex-col lg:flex-row gap-6">
                          <div className="flex-1 min-w-0">{renderStatTable(typeStats)}</div>
                          {analysisReady && (
                            <div className="h-60 w-full lg:w-72 shrink-0">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={typeStats} layout="vertical">
                                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={darkMode ? "#27272a" : "#f4f4f5"} />
                                  <XAxis type="number" stroke={darkMode ? "#71717a" : "#a1a1aa"} fontSize={10} />
                                  <YAxis type="category" dataKey="name" stroke={darkMode ? "#71717a" : "#a1a1aa"} fontSize={10} width={100}
                                    tickFormatter={(v: string) => v.length > 8 ? v.substring(0, 8) + "..." : v} />
                                  <Tooltip contentStyle={{ backgroundColor: darkMode ? "#18181b" : "#fff", borderColor: darkMode ? "#27272a" : "#e4e4e7", borderRadius: "12px" }} />
                                  <Bar dataKey="totalPnl" name="总盈亏">
                                    {typeStats.map((entry, idx) => (
                                      <Cell key={idx} fill={entry.totalPnl >= 0 ? "#10b981" : "#f43f5e"} />
                                    ))}
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-zinc-400">暂无数据</p>
                      )}
                    </div>

                    {/* 5. 品类分析 */}
                    <div className="p-6 rounded-3xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm">
                      <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-100 mb-4 flex items-center gap-2">
                        <DollarSign size={18} className="text-emerald-500" />
                        品类分析
                      </h3>
                      {symbolStats.length > 0 ? (
                        <div className="flex flex-col lg:flex-row gap-6">
                          <div className="flex-1 min-w-0">{renderStatTable(symbolStats)}</div>
                          {analysisReady && (
                            <div className="h-60 w-full lg:w-72 shrink-0">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={symbolStats.slice(0, 8)} layout="vertical">
                                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={darkMode ? "#27272a" : "#f4f4f5"} />
                                  <XAxis type="number" stroke={darkMode ? "#71717a" : "#a1a1aa"} fontSize={10} />
                                  <YAxis type="category" dataKey="name" stroke={darkMode ? "#71717a" : "#a1a1aa"} fontSize={10} width={60} />
                                  <Tooltip contentStyle={{ backgroundColor: darkMode ? "#18181b" : "#fff", borderColor: darkMode ? "#27272a" : "#e4e4e7", borderRadius: "12px" }} />
                                  <Bar dataKey="totalPnl" name="总盈亏">
                                    {symbolStats.map((entry, idx) => (
                                      <Cell key={idx} fill={entry.totalPnl >= 0 ? "#10b981" : "#f43f5e"} />
                                    ))}
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-zinc-400">暂无数据</p>
                      )}
                    </div>

                    {/* 6. 方向分析 */}
                    <div className="p-6 rounded-3xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm">
                      <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-100 mb-4 flex items-center gap-2">
                        <TrendingUp size={18} className="text-emerald-500" />
                        方向分析
                      </h3>
                      {dirStats.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {dirStats.map(dir => (
                            <div key={dir.name} className={`p-5 rounded-2xl border shadow-sm ${
                              dir.name === "Long"
                                ? "bg-emerald-500/5 border-emerald-200 dark:border-emerald-800"
                                : "bg-rose-500/5 border-rose-200 dark:border-rose-800"
                            }`}>
                              <div className="flex items-center justify-between mb-3">
                                <span className={`text-lg font-black ${dir.name === "Long" ? "text-emerald-500" : "text-rose-500"}`}>
                                  {dir.name === "Long" ? "Long (做多)" : "Short (做空)"}
                                </span>
                                <span className="text-2xl font-black font-mono">
                                  <span className={dir.totalPnl > 0 ? "text-emerald-500" : dir.totalPnl < 0 ? "text-rose-500" : "text-zinc-500"}>
                                    {dir.totalPnl > 0 ? "+" : ""}{dir.totalPnl.toFixed(2)}
                                  </span>
                                </span>
                              </div>
                              <div className="flex gap-6 text-xs">
                                <div>
                                  <span className="text-zinc-400">次数</span>
                                  <p className="font-bold text-zinc-700 dark:text-zinc-300">{dir.count}</p>
                                </div>
                                <div>
                                  <span className="text-zinc-400">胜率</span>
                                  <p className="font-bold text-zinc-700 dark:text-zinc-300">{dir.winRate}%</p>
                                </div>
                                <div>
                                  <span className="text-zinc-400">均盈亏</span>
                                  <p className={`font-bold ${dir.avgPnl > 0 ? "text-emerald-500" : dir.avgPnl < 0 ? "text-rose-500" : "text-zinc-500"}`}>
                                    {dir.avgPnl > 0 ? "+" : ""}{dir.avgPnl.toFixed(2)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-zinc-400">暂无数据</p>
                      )}
                    </div>

                  </>
                );
              })()}

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
