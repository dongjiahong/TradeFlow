"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp, BookOpen, Settings, PieChart,
  Moon, Sun, BarChart3
} from "lucide-react";
import {
  createTrade,
  updateTrade,
  deleteTrade,
  addSetupOption,
  deleteSetupOption,
  addErrorOption,
  deleteErrorOption,
  addExitOption,
  deleteSymbolOption,
  importExcelData
} from "../app/actions";
import Dashboard from "./Dashboard";
import Journal from "./Journal";
import Analysis from "./Analysis";
import SettingsTab from "./Settings";
import type { Trade, OptionItem } from "./types";

export default function TradingApp({
  initialTrades,
  initialSetups,
  initialErrors,
  initialExits,
  initialSymbols
}: {
  initialTrades: Trade[];
  initialSetups: OptionItem[];
  initialErrors: OptionItem[];
  initialExits: OptionItem[];
  initialSymbols: OptionItem[];
}) {
  const [mounted, setMounted] = useState(false);
  const [dashboardReady, setDashboardReady] = useState(false);
  const [analysisReady, setAnalysisReady] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "journal" | "settings" | "analysis">("dashboard");
  const [darkMode, setDarkMode] = useState(false);

  // Analysis date filter
  const [quickRange, setQuickRange] = useState<"today" | "week" | "month" | "all">("all");
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: "", end: "" });

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
    remarks: "", setup: "", type: "趋势延续", exitReason: "", notes: "",
    positionSize: 1, direction: "Long", entryPrice: 0,
    stopLoss: "", takeProfit: "", exitPrice1: 0, exitPrice2: "",
    errorReason: "", symbol: ""
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
    requestAnimationFrame(() => setDashboardReady(true));
    if (initialSetups.length > 0) setTradeForm(prev => ({ ...prev, setup: initialSetups[0].name }));
    if (initialExits.length > 0) setTradeForm(prev => ({ ...prev, exitReason: initialExits[0].name }));
    if (initialSymbols.length > 0) setTradeForm(prev => ({ ...prev, symbol: initialSymbols[0].name }));
  }, [initialSetups, initialExits, initialSymbols]);

  useEffect(() => {
    if (activeTab === "dashboard") { setDashboardReady(false); requestAnimationFrame(() => setDashboardReady(true)); }
    if (activeTab === "analysis") { setAnalysisReady(false); requestAnimationFrame(() => setAnalysisReady(true)); }
  }, [activeTab]);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
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
        setPendingScreenshots(prev => [...prev, ...imageFiles.map(file => ({ file, preview: URL.createObjectURL(file) }))]);
      }
    };
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [inlineEditingId]);

  if (!mounted) return null;

  // --- STATS CALCULATIONS ---
  const winTrades = trades.filter(t => t.status === "win");
  const loseTrades = trades.filter(t => t.status === "lose");
  const netProfit = trades.reduce((acc, t) => acc + t.pnl, 0);
  const winRate = winTrades.length > 0 || loseTrades.length > 0
    ? (winTrades.length / (winTrades.length + loseTrades.length || 1)) * 100 : 0;
  const totalWinsAmount = winTrades.reduce((acc, t) => acc + t.pnl, 0);
  const totalLossesAmount = Math.abs(loseTrades.reduce((acc, t) => acc + t.pnl, 0));
  const profitFactor = totalLossesAmount > 0 ? totalWinsAmount / totalLossesAmount : totalWinsAmount > 0 ? 99.9 : 0;
  const avgWin = winTrades.length > 0 ? totalWinsAmount / winTrades.length : 0;
  const avgLoss = loseTrades.length > 0 ? totalLossesAmount / loseTrades.length : 0;
  const pnlRatio = avgLoss > 0 ? avgWin / avgLoss : 0;

  // --- CHART DATA ---
  let currentCap = 0;
  const capitalCurveData = trades.map((t, idx) => {
    currentCap += t.pnl;
    return { index: idx + 1, date: new Date(t.date).toLocaleDateString("zh-CN", { month: "short", day: "numeric" }), pnl: parseFloat(currentCap.toFixed(2)), tradePnl: parseFloat(t.pnl.toFixed(2)) };
  });

  const setupPerformanceMap = new Map<string, { pnl: number; count: number; wins: number }>();
  trades.forEach(t => {
    const stats = setupPerformanceMap.get(t.setup) || { pnl: 0, count: 0, wins: 0 };
    stats.pnl += t.pnl; stats.count += 1; if (t.status === "win") stats.wins += 1;
    setupPerformanceMap.set(t.setup, stats);
  });
  const setupChartData = Array.from(setupPerformanceMap.entries()).map(([name, stats]) => ({
    name, pnl: parseFloat(stats.pnl.toFixed(2)), winRate: parseFloat(((stats.wins / stats.count) * 100).toFixed(1)), count: stats.count
  })).sort((a, b) => b.pnl - a.pnl);

  const errorMap = new Map<string, number>();
  trades.forEach(t => { if (t.errorReason) errorMap.set(t.errorReason, (errorMap.get(t.errorReason) || 0) + 1); });
  const errorPieData = Array.from(errorMap.entries()).map(([name, value]) => ({
    name: name.length > 15 ? name.substring(0, 15) + "..." : name, value
  }));
  const COLORS = ["#f43f5e", "#fb923c", "#facc15", "#38bdf8", "#818cf8", "#c084fc", "#f472b6", "#a7f3d0", "#d9f99d"];

  // --- HELPERS ---
  const calculateLivePnl = () => {
    const entry = Number(tradeForm.entryPrice) || 0;
    const exit1 = Number(tradeForm.exitPrice1) || 0;
    const exit2 = tradeForm.exitPrice2 ? Number(tradeForm.exitPrice2) : null;
    const size = Number(tradeForm.positionSize) || 0;
    const dir = tradeForm.direction;
    if (exit2 === null || isNaN(exit2) || exit2 === 0) return dir === "Long" ? (exit1 - entry) * size : (entry - exit1) * size;
    return dir === "Long" ? (exit1 - entry) * (size / 2) + (exit2 - entry) * (size / 2) : (entry - exit1) * (size / 2) + (entry - exit2) * (size / 2);
  };

  const calculateLiveRR = (): number | null => {
    const entry = Number(tradeForm.entryPrice) || 0;
    const sl = Number(tradeForm.stopLoss) || 0;
    const tp = Number(tradeForm.takeProfit) || 0;
    const dir = tradeForm.direction;
    if (!sl || !tp || !entry) return null;
    const risk = dir === "Long" ? entry - sl : sl - entry;
    const reward = dir === "Long" ? tp - entry : entry - tp;
    if (risk <= 0 || reward <= 0) return null;
    return parseFloat((reward / risk).toFixed(2));
  };

  const handlePendingFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setPendingScreenshots(prev => [...prev, ...Array.from(files).map(file => ({ file, preview: URL.createObjectURL(file) }))]);
  };

  const removePendingScreenshot = (index: number) => {
    setPendingScreenshots(prev => { URL.revokeObjectURL(prev[index].preview); return prev.filter((_, i) => i !== index); });
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
          setTrades(prev => prev.map(t => t.id === tradeId ? { ...t, screenshots: [...(t.screenshots || []), data.screenshot] } : t));
        }
      }
      pendingScreenshots.forEach(p => URL.revokeObjectURL(p.preview));
      setPendingScreenshots([]);
    } catch (err: any) { alert(`截图上传出错: ${err.message}`); }
    finally { setIsUploadingScreenshot(false); }
  };

  const handleSaveTrade = async () => {
    const parsedExit2 = tradeForm.exitPrice2 ? parseFloat(tradeForm.exitPrice2) : null;
    const parsedStopLoss = tradeForm.stopLoss ? parseFloat(tradeForm.stopLoss) : null;
    const parsedTakeProfit = tradeForm.takeProfit ? parseFloat(tradeForm.takeProfit) : null;
    const payload = {
      date: tradeForm.date, remarks: tradeForm.remarks, setup: tradeForm.setup, type: tradeForm.type,
      exitReason: tradeForm.exitReason, notes: tradeForm.notes, positionSize: Number(tradeForm.positionSize),
      direction: tradeForm.direction, entryPrice: Number(tradeForm.entryPrice),
      stopLoss: parsedStopLoss, takeProfit: parsedTakeProfit,
      exitPrice1: Number(tradeForm.exitPrice1), exitPrice2: parsedExit2,
      symbol: tradeForm.symbol, errorReason: tradeForm.errorReason || undefined
    };

    if (inlineEditingId && inlineEditingId !== "__new__") {
      const res = await updateTrade(inlineEditingId, payload);
      if (res.success && res.trade) {
        setTrades(prev => prev.map(t => t.id === inlineEditingId ? { ...(res.trade as unknown as Trade), screenshots: t.screenshots } : t));
        if (pendingScreenshots.length > 0) await uploadPendingScreenshots(inlineEditingId);
        setInlineEditingId(null);
      } else { alert("更新失败: " + res.error); }
    } else {
      const res = await createTrade(payload);
      if (res.success && res.trade) {
        const newTrade = { ...(res.trade as unknown as Trade), screenshots: [] };
        setTrades(prev => [...prev, newTrade].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
        if (pendingScreenshots.length > 0) await uploadPendingScreenshots(res.trade.id);
        setInlineEditingId(null);
      } else { alert("添加失败: " + res.error); }
    }
  };

  const handleUploadScreenshots = async (tradeId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploadingScreenshot(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append("tradeId", tradeId);
        formData.append("file", files[i]);
        const res = await fetch("/api/screenshots", { method: "POST", body: formData });
        const data = await res.json();
        if (data.success && data.screenshot) {
          setTrades(prev => prev.map(t => t.id === tradeId ? { ...t, screenshots: [...(t.screenshots || []), data.screenshot] } : t));
        } else { alert(`上传失败: ${data.error || "未知错误"}`); }
      }
    } catch (err: any) { alert(`上传出错: ${err.message}`); }
    finally { setIsUploadingScreenshot(false); }
  };

  const handleDeleteScreenshot = async (tradeId: string, screenshotId: string) => {
    if (!confirm("确定要删除这张截图吗？")) return;
    try {
      const res = await fetch(`/api/screenshots/${screenshotId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setTrades(prev => prev.map(t => t.id === tradeId ? { ...t, screenshots: (t.screenshots || []).filter(s => s.id !== screenshotId) } : t));
      } else { alert(`删除失败: ${data.error || "未知错误"}`); }
    } catch (err: any) { alert(`删除出错: ${err.message}`); }
  };

  const handleDeleteTrade = async (id: string) => {
    if (confirm("确定要删除这条交易记录吗？")) {
      const res = await deleteTrade(id);
      if (res.success) setTrades(prev => prev.filter(t => t.id !== id));
      else alert("删除失败: " + res.error);
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
        if (res.success) { setImportStatus(`导入成功！共导入了 ${res.tradesCount} 笔交易！`); window.location.reload(); }
        else { setImportStatus(`导入失败: ${res.error}`); }
      } catch (err: any) { setImportStatus(`文件读取出错: ${err.message}`); }
      finally { setIsImporting(false); }
    };
    reader.readAsDataURL(file);
  };

  // Settings CRUD
  const handleAddSetup = async () => {
    if (!newSetupName.trim()) return;
    const res = await addSetupOption(newSetupName.trim());
    if (res.success && res.option) { setSetups(prev => [...prev, res.option!].sort((a, b) => a.name.localeCompare(b.name))); setNewSetupName(""); }
    else { alert("添加失败: " + res.error); }
  };
  const handleDeleteSetup = async (id: string) => {
    if (confirm("确定要删除此入场理由选项吗？")) {
      const res = await deleteSetupOption(id);
      if (res.success) setSetups(prev => prev.filter(s => s.id !== id));
    }
  };
  const handleAddError = async () => {
    if (!newErrorName.trim()) return;
    const res = await addErrorOption(newErrorName.trim());
    if (res.success && res.option) { setErrors(prev => [...prev, res.option!].sort((a, b) => a.name.localeCompare(b.name))); setNewErrorName(""); }
    else { alert("添加失败: " + res.error); }
  };
  const handleDeleteError = async (id: string) => {
    if (confirm("确定要删除此错误原因选项吗？")) {
      const res = await deleteErrorOption(id);
      if (res.success) setErrors(prev => prev.filter(e => e.id !== id));
    }
  };
  const handleAddExit = async () => {
    if (!newExitName.trim()) return;
    const res = await addExitOption(newExitName.trim());
    if (res.success && res.option) { setExits(prev => [...prev, res.option!].sort((a, b) => a.name.localeCompare(b.name))); setNewExitName(""); }
    else { alert("添加失败: " + res.error); }
  };
  const handleDeleteExit = async (id: string) => {
    if (confirm("确定要删除此离场理由选项吗？")) {
      const res = await deleteErrorOption(id);
      if (res.success) setExits(prev => prev.filter(ex => ex.id !== id));
    }
  };
  const handleAddSymbol = async () => {
    if (!newSymbolName.trim()) return;
    const res = await addSetupOption(newSymbolName.trim());
    if (res.success && res.option) { setSymbols(prev => [...prev, res.option!].sort((a, b) => a.name.localeCompare(b.name))); setNewSymbolName(""); }
    else { alert("添加失败: " + res.error); }
  };
  const handleDeleteSymbol = async (id: string) => {
    if (confirm("确定要删除此品类选项吗？")) {
      const res = await deleteSymbolOption(id);
      if (res.success) setSymbols(prev => prev.filter(s => s.id !== id));
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
    return matchesSearch &&
      (directionFilter === "all" || t.direction === directionFilter) &&
      (statusFilter === "all" || t.status === statusFilter) &&
      (setupFilter === "all" || t.setup === setupFilter) &&
      (typeFilter === "all" || t.type === typeFilter) &&
      (symbolFilter === "all" || t.symbol === symbolFilter);
  });

  const overallComplianceRate = 0;

  return (
    <div className={`flex flex-col flex-1 h-screen font-sans ${darkMode ? "dark bg-[#09090b] text-[#e4e4e7]" : "bg-[#fafafa] text-[#18181b]"}`}>

      {/* LIGHTBOX OVERLAY */}
      {lightboxImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setLightboxImage(null)}>
          <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img src={lightboxImage} alt="Preview" className="max-w-full max-h-[90vh] object-contain rounded-lg" />
            <button onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors">
              <Settings size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Top Header */}
      <header className="flex h-14 items-center justify-between border-b px-6 bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800/50 transition-colors duration-200 fixed top-0 left-0 right-0 z-40">
        <div className="flex items-center gap-3">
          <div className="text-emerald-600 dark:text-emerald-400"><TrendingUp size={18} /></div>
          <h1 className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100">TradeFlow Pro</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-800/50">
            <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              总盈亏: <span className={netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>{netProfit >= 0 ? "+" : ""}{netProfit.toFixed(2)}</span>
            </span>
          </div>
          <button onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-lg border hover:bg-zinc-100 dark:hover:bg-zinc-800 border-zinc-200 dark:border-zinc-800/50 text-zinc-500 dark:text-zinc-400 transition-all duration-200">
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden pt-14">
        {/* Sidebar */}
        <aside className="w-64 border-r bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800/50 flex flex-col justify-between py-6 px-4 shrink-0 transition-colors duration-200 fixed top-14 left-0 bottom-0 z-30">
          <nav className="flex flex-col gap-1">
            {[
              { key: "dashboard" as const, icon: <PieChart size={16} />, label: "仪表盘" },
              { key: "journal" as const, icon: <BookOpen size={16} />, label: "交易日志" },
              { key: "analysis" as const, icon: <BarChart3 size={16} />, label: "行为分析" },
              { key: "settings" as const, icon: <Settings size={16} />, label: "设置" }
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-left ${
                  activeTab === tab.key
                    ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-l-2 border-emerald-500"
                    : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-zinc-700 dark:hover:text-zinc-300"
                }`}>
                {tab.icon}{tab.label}
              </button>
            ))}
          </nav>
          <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800/50">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-400 mb-1">本月自律评分</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{overallComplianceRate.toFixed(1)}%</span>
              <span className="text-xs text-zinc-400">执行率</span>
            </div>
            <div className="mt-1.5 w-full bg-zinc-200 dark:bg-zinc-700 h-1 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${overallComplianceRate}%` }}></div>
            </div>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 ml-64">
          {activeTab === "dashboard" && (
            <Dashboard
              netProfit={netProfit} winRate={winRate} profitFactor={profitFactor}
              avgWin={avgWin} avgLoss={avgLoss} pnlRatio={pnlRatio}
              capitalCurveData={capitalCurveData} setupChartData={setupChartData}
              errorPieData={errorPieData} COLORS={COLORS}
              dashboardReady={dashboardReady} darkMode={darkMode}
            />
          )}
          {activeTab === "journal" && (
            <Journal
              trades={trades} filteredTrades={filteredTrades}
              setups={setups} errors={errors} exits={exits} symbols={symbols}
              darkMode={darkMode}
              inlineEditingId={inlineEditingId} setInlineEditingId={setInlineEditingId}
              tradeForm={tradeForm} setTradeForm={setTradeForm}
              searchQuery={searchQuery} setSearchQuery={setSearchQuery}
              directionFilter={directionFilter} setDirectionFilter={setDirectionFilter}
              statusFilter={statusFilter} setStatusFilter={setStatusFilter}
              setupFilter={setupFilter} setSetupFilter={setSetupFilter}
              typeFilter={typeFilter} setTypeFilter={setTypeFilter}
              symbolFilter={symbolFilter} setSymbolFilter={setSymbolFilter}
              pendingScreenshots={pendingScreenshots}
              isUploadingScreenshot={isUploadingScreenshot}
              lightboxImage={lightboxImage} setLightboxImage={setLightboxImage}
              expandedScreenshotId={expandedScreenshotId} setExpandedScreenshotId={setExpandedScreenshotId}
              calculateLivePnl={calculateLivePnl} calculateLiveRR={calculateLiveRR}
              handleSaveTrade={handleSaveTrade}
              handleDeleteTrade={handleDeleteTrade}
              handleUploadScreenshots={handleUploadScreenshots}
              handleDeleteScreenshot={handleDeleteScreenshot}
              handlePendingFileSelect={handlePendingFileSelect}
              removePendingScreenshot={removePendingScreenshot}
              clearPendingScreenshots={() => { pendingScreenshots.forEach(p => URL.revokeObjectURL(p.preview)); setPendingScreenshots([]); }}
            />
          )}
          {activeTab === "settings" && (
            <SettingsTab
              setups={setups} errors={errors} exits={exits} symbols={symbols}
              isImporting={isImporting} importStatus={importStatus}
              newSetupName={newSetupName} setNewSetupName={setNewSetupName}
              newErrorName={newErrorName} setNewErrorName={setNewErrorName}
              newExitName={newExitName} setNewExitName={setNewExitName}
              newSymbolName={newSymbolName} setNewSymbolName={setNewSymbolName}
              darkMode={darkMode}
              onImportExcel={handleImportExcel}
              onAddSetup={handleAddSetup} onDeleteSetup={handleDeleteSetup}
              onAddError={handleAddError} onDeleteError={handleDeleteError}
              onAddExit={handleAddExit} onDeleteExit={handleDeleteExit}
              onAddSymbol={handleAddSymbol}
              onDeleteSymbol={handleDeleteSymbol}
            />
          )}
          {activeTab === "analysis" && (
            <Analysis
              trades={trades}
              quickRange={quickRange} setQuickRange={setQuickRange}
              dateRange={dateRange} setDateRange={setDateRange}
              analysisReady={analysisReady} darkMode={darkMode}
            />
          )}
        </main>
      </div>
    </div>
  );
}
