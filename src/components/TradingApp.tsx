"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp, BookOpen, Settings, PieChart,
  Moon, Sun, BarChart3, ScrollText,
  ChevronLeft, ChevronRight, BookMarked, X
} from "lucide-react";
import {
  getTrades,
  getConfigOptions,
  createTrade,
  updateTrade,
  deleteTrade,
  addSetupOption,
  deleteSetupOption,
  addErrorOption,
  deleteErrorOption,
  addExitOption,
  deleteExitOption,
  deleteSymbolOption,
  addSymbolOption,
  addProcessOption,
  deleteProcessOption,
  importExcelData,
  exportExcelData,
  uploadScreenshot,
  deleteScreenshot,
  deleteTradesByDateRange,
  getTradingRules,
  addTradingRule,
  deleteTradingRule,
} from "../lib/db";
import ScreenshotImage from "./ScreenshotImage";
import Dashboard from "./Dashboard";
import Journal from "./Journal";
import Analysis from "./Analysis";
import AiReviewModal from "./AiReviewModal";
import SettingsTab from "./Settings";
import { getRuleStyle, type Trade, type OptionItem, type TradingRule } from "./types";

export default function TradingApp({
  initialTrades = [],
  initialSetups = [],
  initialErrors = [],
  initialExits = [],
  initialSymbols = [],
  initialProcesses = []
}: {
  initialTrades?: Trade[];
  initialSetups?: OptionItem[];
  initialErrors?: OptionItem[];
  initialExits?: OptionItem[];
  initialSymbols?: OptionItem[];
  initialProcesses?: OptionItem[];
} = {}) {
  const getLocalISOString = () => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  const [mounted, setMounted] = useState(false);
  const [dashboardReady, setDashboardReady] = useState(false);
  const [analysisReady, setAnalysisReady] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "journal" | "settings" | "analysis" | "rules">("journal");
  const [darkMode, setDarkMode] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sidebar_collapsed") === "true";
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem("sidebar_collapsed", String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  // Analysis date filter
  const [quickRange, setQuickRange] = useState<"today" | "week" | "month" | "all">("all");
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: "", end: "" });

  // Core data states
  const [trades, setTrades] = useState<Trade[]>(initialTrades);
  const [setups, setSetups] = useState<OptionItem[]>(initialSetups);
  const [errors, setErrors] = useState<OptionItem[]>(initialErrors);
  const [exits, setExits] = useState<OptionItem[]>(initialExits);
  const [symbols, setSymbols] = useState<OptionItem[]>(initialSymbols);
  const [processes, setProcesses] = useState<OptionItem[]>(initialProcesses);
  const [rules, setRules] = useState<TradingRule[]>([]);
  const [showRulesDropdown, setShowRulesDropdown] = useState(false);
  const [activeReviewPeriod, setActiveReviewPeriod] = useState<"today" | "week" | "month" | "all" | null>(null);

  // Journal UI states
  const [searchQuery, setSearchQuery] = useState("");
  const [directionFilter, setDirectionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [setupFilter, setSetupFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [symbolFilter, setSymbolFilter] = useState("all");
  const [processFilter, setProcessFilter] = useState("all");
  const [marketEnvFilter, setMarketEnvFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<"30" | "today" | "week" | "month" | "all" | "custom">("30");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // Inline editing & screenshots
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [expandedScreenshotId, setExpandedScreenshotId] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxNote, setLightboxNote] = useState<string | null>(null);

  const handleSetLightbox = (id: string | null, note?: string | null) => {
    setLightboxImage(id);
    setLightboxNote(note || null);
  };
  const [isUploadingScreenshot, setIsUploadingScreenshot] = useState(false);
  const [pendingScreenshots, setPendingScreenshots] = useState<{ file: File; preview: string }[]>([]);

  // Trade form states
  const [tradeForm, setTradeForm] = useState({
    date: getLocalISOString(),
    remarks: "", setup: "", type: "趋势延续", exitReason: "", notes: "",
    positionSize: 1, direction: "Long", entryPrice: 0,
    stopLoss: "", takeProfit: "", exitPrice1: 0, exitPrice2: "",
    errorReason: "", symbol: "", process: "", marketEnv: ""
  });

  // Settings custom items
  const [newSetupName, setNewSetupName] = useState("");
  const [newErrorName, setNewErrorName] = useState("");
  const [newExitName, setNewExitName] = useState("");
  const [newSymbolName, setNewSymbolName] = useState("");
  const [newProcessName, setNewProcessName] = useState("");

  // Excel loader
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState("");

  const refreshData = async () => {
    const localTrades = await getTrades();
    const localOptions = await getConfigOptions();
    const localRules = await getTradingRules();
    setTrades(localTrades);
    setSetups(localOptions.setups);
    setErrors(localOptions.errors);
    setExits(localOptions.exits);
    setSymbols(localOptions.symbols);
    setProcesses(localOptions.processes || []);
    setRules(localRules);
    return localOptions;
  };

  const handleAddRule = async (content: string) => {
    try {
      const newRule = await addTradingRule(content);
      setRules(prev => [...prev, newRule]);
    } catch (err: any) {
      alert("添加原则失败: " + err.message);
    }
  };

  const handleDeleteRule = async (id: number) => {
    try {
      await deleteTradingRule(id);
      setRules(prev => prev.filter(r => r.id !== id));
    } catch (err: any) {
      alert("删除原则失败: " + err.message);
    }
  };



  useEffect(() => {
    setMounted(true);
    let active = true;
    async function loadLocalData() {
      const localOptions = await refreshData();
      if (active) {
        if (localOptions.setups.length > 0) setTradeForm(prev => ({ ...prev, setup: localOptions.setups[0].name }));
        if (localOptions.exits.length > 0) setTradeForm(prev => ({ ...prev, exitReason: localOptions.exits[0].name }));
        if (localOptions.symbols.length > 0) setTradeForm(prev => ({ ...prev, symbol: localOptions.symbols[0].name }));
        setDashboardReady(true);
        setAnalysisReady(true);
      }
    }
    loadLocalData();
    return () => { active = false; };
  }, []);

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

  // --- PERIOD STATS FOR HEADER ---
  const getPeriodStats = (filterFn: (tradeDateStr: string) => boolean) => {
    const periodTrades = trades.filter(t => {
      const dateVal = t.date;
      const tDate = dateVal instanceof Date 
        ? dateVal.toISOString().split("T")[0] 
        : String(dateVal).split("T")[0];
      return filterFn(tDate);
    });

    const winTrades = periodTrades.filter(t => t.status === "win");
    const loseTrades = periodTrades.filter(t => t.status === "lose");
    const pnl = periodTrades.reduce((acc, t) => acc + t.pnl, 0);
    const count = periodTrades.length;
    
    const winRate = winTrades.length > 0 || loseTrades.length > 0
      ? (winTrades.length / (winTrades.length + loseTrades.length || 1)) * 100 
      : 0;

    const totalWinsAmount = winTrades.reduce((acc, t) => acc + t.pnl, 0);
    const totalLossesAmount = Math.abs(loseTrades.reduce((acc, t) => acc + t.pnl, 0));
    const avgWin = winTrades.length > 0 ? totalWinsAmount / winTrades.length : 0;
    const avgLoss = loseTrades.length > 0 ? totalLossesAmount / loseTrades.length : 0;
    const rr = avgLoss > 0 ? avgWin / avgLoss : 0;

    return { pnl, count, winRate, rr };
  };

  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getThisWeekStartStr = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
  };

  const getThisMonthStartStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  };

  const todayStr = getTodayStr();
  const todayStats = getPeriodStats(date => date === todayStr);
  const thisWeekStats = getPeriodStats(date => date >= getThisWeekStartStr());
  const thisMonthStats = getPeriodStats(date => date >= getThisMonthStartStr());
  const totalStats = getPeriodStats(() => true);

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

  const calculateLiveActualRR = (): number | null => {
    const entry = Number(tradeForm.entryPrice) || 0;
    const sl = Number(tradeForm.stopLoss) || 0;
    const size = Number(tradeForm.positionSize) || 0;
    if (!sl || !entry || !size || size <= 0) return null;
    const riskAmount = Math.abs(entry - sl) * size;
    if (riskAmount <= 0) return null;
    const pnl = calculateLivePnl();
    return parseFloat((pnl / riskAmount).toFixed(2));
  };

  const handlePendingFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setPendingScreenshots(prev => [...prev, ...Array.from(files).map(file => ({ file, preview: URL.createObjectURL(file) }))]);
  };

  const removePendingScreenshot = (index: number) => {
    if (!confirm("确定要删除这张待上传的截图吗？")) return;
    setPendingScreenshots(prev => { URL.revokeObjectURL(prev[index].preview); return prev.filter((_, i) => i !== index); });
  };

  const uploadPendingScreenshots = async (tradeId: string) => {
    if (pendingScreenshots.length === 0) return;
    setIsUploadingScreenshot(true);
    try {
      for (const item of pendingScreenshots) {
        const data = await uploadScreenshot(tradeId, item.file);
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
      symbol: tradeForm.symbol, errorReason: tradeForm.errorReason || undefined,
      process: tradeForm.process || undefined,
      marketEnv: tradeForm.marketEnv || undefined
    };

    const sortTradesAsc = (a: Trade, b: Trade) => new Date(a.date).getTime() - new Date(b.date).getTime();

    if (inlineEditingId && inlineEditingId !== "__new__") {
      const res = await updateTrade(inlineEditingId, payload);
      if (res.success && res.trade) {
        setTrades(prev => prev.map(t => t.id === inlineEditingId ? { ...(res.trade as unknown as Trade), screenshots: t.screenshots } : t).sort(sortTradesAsc));
        if (pendingScreenshots.length > 0) await uploadPendingScreenshots(inlineEditingId);
        setInlineEditingId(null);
      } else { alert("更新失败: " + res.error); }
    } else {
      const res = await createTrade(payload);
      if (res.success && res.trade) {
        const newTrade = { ...(res.trade as unknown as Trade), screenshots: [] };
        setTrades(prev => [...prev, newTrade].sort(sortTradesAsc));
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
        const data = await uploadScreenshot(tradeId, files[i]);
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
      const data = await deleteScreenshot(screenshotId);
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

  const handleDeleteTradesByDateRange = async (startDate: string, endDate: string) => {
    const res = await deleteTradesByDateRange(startDate, endDate);
    if (res.success) {
      await refreshData();
      return { success: true, count: res.count };
    } else {
      return { success: false, error: res.error };
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
          await refreshData();
        }
        else { setImportStatus(`导入失败: ${res.error}`); }
      } catch (err: any) { setImportStatus(`文件读取出错: ${err.message}`); }
      finally { setIsImporting(false); }
    };
    reader.readAsDataURL(file);
  };

  const handleExportExcel = async (startDate?: string, endDate?: string) => {
    setImportStatus("正在从浏览器 IndexedDB 组装数据并导出...");
    let res = await exportExcelData(startDate, endDate);
    
    if (res.success && res.count === 0) {
      const dateRangeMsg = (startDate && endDate) 
        ? `在所选时间范围（${startDate} 至 ${endDate}）` 
        : "在所选时间范围内";
      
      const confirmAll = confirm(`${dateRangeMsg}没有交易记录。是否要导出全部历史记录？`);
      if (confirmAll) {
        setImportStatus("正在导出全部历史记录...");
        res = await exportExcelData();
        if (res.success) {
          setImportStatus("导出成功，已触发全部文件下载！");
        } else {
          setImportStatus(`导出失败: ${res.error}`);
        }
      } else {
        setImportStatus("已取消导出。");
      }
      return;
    }

    if (res.success) {
      setImportStatus("导出成功，已触发浏览器文件下载！");
    } else {
      setImportStatus(`导出失败: ${res.error}`);
    }
  };

  // Settings CRUD
  const handleAddSetup = async () => {
    if (!newSetupName.trim()) return;
    const res = await addSetupOption(newSetupName.trim());
    if (res.success && res.option) { setSetups(prev => [...prev, res.option!].sort((a, b) => a.name.localeCompare(b.name))); setNewSetupName(""); }
    else { alert("添加失败: " + res.error); }
  };
  const handleDeleteSetup = async (id: string | number) => {
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
  const handleDeleteError = async (id: string | number) => {
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
  const handleDeleteExit = async (id: string | number) => {
    if (confirm("确定要删除此离场理由选项吗？")) {
      const res = await deleteExitOption(id);
      if (res.success) setExits(prev => prev.filter(ex => ex.id !== id));
    }
  };
  const handleAddSymbol = async () => {
    if (!newSymbolName.trim()) return;
    const res = await addSymbolOption(newSymbolName.trim());
    if (res.success && res.option) { setSymbols(prev => [...prev, res.option!].sort((a, b) => a.name.localeCompare(b.name))); setNewSymbolName(""); }
    else { alert("添加失败: " + res.error); }
  };
  const handleDeleteSymbol = async (id: string | number) => {
    if (confirm("确定要删除此品类选项吗？")) {
      const res = await deleteSymbolOption(id);
      if (res.success) setSymbols(prev => prev.filter(s => s.id !== id));
    }
  };
  const handleAddProcess = async () => {
    if (!newProcessName.trim()) return;
    const res = await addProcessOption(newProcessName.trim());
    if (res.success && res.option) { setProcesses(prev => [...prev, res.option!].sort((a, b) => a.name.localeCompare(b.name))); setNewProcessName(""); }
    else { alert("添加失败: " + res.error); }
  };
  const handleDeleteProcess = async (id: string | number) => {
    if (confirm("确定要删除此过程选项吗？")) {
      const res = await deleteProcessOption(id);
      if (res.success) setProcesses(prev => prev.filter(p => p.id !== id));
    }
  };

  // --- FILTERS LOGIC ---
  const getLocalDateStr = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const getTradeDateOnly = (t: Trade) => {
    if (t.date instanceof Date) {
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${t.date.getFullYear()}-${pad(t.date.getMonth() + 1)}-${pad(t.date.getDate())}`;
    }
    return String(t.date).split("T")[0];
  };

  let dateFilteredTrades = [...trades];
  if (dateFilter === "today") {
    const todayStr = getLocalDateStr();
    dateFilteredTrades = trades.filter(t => getTradeDateOnly(t) === todayStr);
  } else if (dateFilter === "week") {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    const mondayStr = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
    dateFilteredTrades = trades.filter(t => getTradeDateOnly(t) >= mondayStr);
  } else if (dateFilter === "month") {
    const today = new Date();
    const firstDayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
    dateFilteredTrades = trades.filter(t => getTradeDateOnly(t) >= firstDayStr);
  } else if (dateFilter === "custom") {
    dateFilteredTrades = trades.filter(t => {
      const tDateOnly = getTradeDateOnly(t);
      return (!customStartDate || tDateOnly >= customStartDate) && (!customEndDate || tDateOnly <= customEndDate);
    });
  } else if (dateFilter === "30") {
    dateFilteredTrades = trades.slice(-30);
  }

  const filteredTrades = dateFilteredTrades.filter(t => {
    const matchesSearch =
      (t.remarks && t.remarks.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.notes && t.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
      t.setup.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.process && t.process.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.marketEnv && t.marketEnv.toLowerCase().includes(searchQuery.toLowerCase())) ||
      t.symbol.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch &&
      (directionFilter === "all" || t.direction === directionFilter) &&
      (statusFilter === "all" || t.status === statusFilter) &&
      (setupFilter === "all" || t.setup === setupFilter) &&
      (typeFilter === "all" || t.type === typeFilter) &&
      (processFilter === "all" || t.process === processFilter) &&
      (marketEnvFilter === "all" || t.marketEnv === marketEnvFilter) &&
      (symbolFilter === "all" || t.symbol === symbolFilter);
  }).reverse();



  // --- SIDEBAR NAV ITEMS ---
  const navItems = [
    { key: "dashboard" as const, icon: <PieChart size={18} />, label: "仪表盘" },
    { key: "journal" as const, icon: <BookOpen size={18} />, label: "交易日志" },
    { key: "analysis" as const, icon: <BarChart3 size={18} />, label: "行为分析" },
    { key: "settings" as const, icon: <Settings size={18} />, label: "设置" }
  ];

  return (
    <div className="flex flex-col flex-1 h-screen bg-[var(--color-bg-canvas)] text-[var(--color-text-primary)]">

      {/* LIGHTBOX OVERLAY */}
      {lightboxImage && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => { setLightboxImage(null); setLightboxNote(null); }}>
          <div className="relative max-w-[90vw] max-h-[85vh] flex flex-col items-center gap-3 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <ScreenshotImage screenshotId={lightboxImage} alt="Preview" className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl border border-white/10" />
            {lightboxNote && (
              <div className="px-4 py-2 rounded-xl bg-black/75 backdrop-blur-md text-white text-xs font-semibold max-w-xl text-center leading-normal border border-white/10 shadow-lg">
                {lightboxNote}
              </div>
            )}
            <button onClick={() => { setLightboxImage(null); setLightboxNote(null); }}
              className="absolute -top-12 right-0 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer border border-white/10">
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Top Header */}
      <header className="flex h-14 items-center justify-between border-b border-[var(--color-border-subtle)] px-6 bg-[var(--color-bg-canvas)] z-40 fixed top-0 left-0 right-0">
        <div className="flex items-center gap-3">
          <div className="text-trade-green"><TrendingUp size={18} /></div>
          <h1 className="text-base font-bold tracking-tight text-[var(--text-primary)]">TradeFlow Pro</h1>
        </div>
        <div className="flex items-center gap-4">
          {/* 做单原则帘子 */}
          <div className="relative">
            <button onClick={() => setShowRulesDropdown(!showRulesDropdown)}
              className={`flex items-center gap-1.5 h-10 px-3 rounded-lg border border-[var(--color-border-subtle)] text-xs font-semibold hover:bg-[var(--color-bg-hover)] transition-all cursor-pointer ${
                showRulesDropdown 
                  ? "bg-[var(--color-bg-elevated)] border-[var(--color-border-strong)] text-[var(--color-text-primary)]" 
                  : "bg-[var(--color-bg-surface)] text-[var(--text-secondary)]"
              }`}>
              <ScrollText size={14} className="text-trade-green" />
              <span className="hidden sm:inline">做单原则</span>
            </button>
            
            {showRulesDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowRulesDropdown(false)} />
                <div className="absolute left-0 mt-2 w-[480px] max-w-[calc(100vw-2rem)] max-h-[80vh] overflow-y-auto z-50 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] shadow-2xl p-4 flex flex-col gap-4 animate-fade-in text-left">
                  <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-2">
                    <h3 className="font-bold text-xs text-[var(--color-text-primary)] flex items-center gap-1.5">
                      <ScrollText size={14} className="text-trade-green animate-pulse" />交易做单原则
                    </h3>
                    <span className="text-[10px] text-[var(--color-text-muted)] bg-[var(--color-bg-elevated)] px-2 py-0.5 rounded-full">
                      共 {rules.length} 条
                    </span>
                  </div>
                  <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
                    {rules.length === 0 ? (
                      <p className="text-xs text-[var(--text-muted)] italic py-4 text-center">暂未设定做单原则</p>
                    ) : (
                      <div className="flex flex-col gap-2 pr-0.5">
                        {rules.map(r => {
                          const style = getRuleStyle(r.content);
                          return (
                            <div key={r.id} className={`flex items-start gap-1.5 px-3 py-2.5 rounded-r-lg border-y border-r border-l-[3px] border-[var(--color-border-subtle)] ${style.borderColor} ${style.bg} text-xs leading-normal transition-all duration-150 hover:shadow-xs`}>
                              <span className="shrink-0 mt-0.5 text-[13px]">{style.icon}</span>
                              <p className="flex-1 text-[12px] font-semibold text-[var(--color-text-primary)] leading-relaxed">
                                {r.content}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="border-t border-[var(--color-border-subtle)] pt-2.5 flex justify-end">
                    <button onClick={() => { setActiveTab("settings"); setShowRulesDropdown(false); }}
                      className="text-xs text-trade-green font-semibold hover:underline cursor-pointer">
                      管理原则 &rarr;
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* 今日 */}
            <div 
              onClick={() => todayStats.count > 0 && setActiveReviewPeriod("today")}
              className={`hidden lg:flex flex-col justify-center items-end h-10 px-2.5 rounded-lg border leading-tight group relative overflow-hidden transition-all duration-200 ${
                todayStats.count > 0 
                  ? "bg-[var(--color-bg-surface)] border-[var(--color-border-subtle)] cursor-pointer" 
                  : "bg-[var(--color-bg-surface)] border-[var(--color-border-subtle)] cursor-not-allowed"
              }`}
            >
              <div className="flex flex-col justify-center w-full h-full transition-all duration-200 group-hover:opacity-0 group-hover:-translate-y-2">
                <div className="flex items-center justify-between w-full gap-2">
                  <span className="text-[10px] text-[var(--text-muted)] font-medium">今日</span>
                  <span className={`text-xs font-bold ${todayStats.pnl >= 0 ? "text-trade-green" : "text-trade-red"}`}>
                    {todayStats.pnl >= 0 ? "+" : ""}{todayStats.pnl.toFixed(2)}
                  </span>
                </div>
                <div className="text-[9px] text-[var(--text-muted)] mt-0.5">
                  {todayStats.count}笔 | 胜率:{todayStats.winRate.toFixed(0)}% | RR:{todayStats.rr.toFixed(1)}
                </div>
              </div>
              <div className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold transition-all duration-200 translate-y-2 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 ${
                todayStats.count > 0 
                  ? "bg-gradient-to-r from-red-500 to-rose-600 text-white" 
                  : "bg-[var(--color-bg-elevated)] text-[var(--text-muted)]"
              }`}>
                {todayStats.count > 0 ? "导出 AI 总结" : "今日无交易"}
              </div>
            </div>

            {/* 本周 */}
            <div 
              onClick={() => thisWeekStats.count > 0 && setActiveReviewPeriod("week")}
              className={`hidden md:flex flex-col justify-center items-end h-10 px-2.5 rounded-lg border leading-tight group relative overflow-hidden transition-all duration-200 ${
                thisWeekStats.count > 0 
                  ? "bg-[var(--color-bg-surface)] border-[var(--color-border-subtle)] cursor-pointer" 
                  : "bg-[var(--color-bg-surface)] border-[var(--color-border-subtle)] cursor-not-allowed"
              }`}
            >
              <div className="flex flex-col justify-center w-full h-full transition-all duration-200 group-hover:opacity-0 group-hover:-translate-y-2">
                <div className="flex items-center justify-between w-full gap-2">
                  <span className="text-[10px] text-[var(--text-muted)] font-medium">本周</span>
                  <span className={`text-xs font-bold ${thisWeekStats.pnl >= 0 ? "text-trade-green" : "text-trade-red"}`}>
                    {thisWeekStats.pnl >= 0 ? "+" : ""}{thisWeekStats.pnl.toFixed(2)}
                  </span>
                </div>
                <div className="text-[9px] text-[var(--text-muted)] mt-0.5">
                  {thisWeekStats.count}笔 | 胜率:{thisWeekStats.winRate.toFixed(0)}% | RR:{thisWeekStats.rr.toFixed(1)}
                </div>
              </div>
              <div className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold transition-all duration-200 translate-y-2 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 ${
                thisWeekStats.count > 0 
                  ? "bg-gradient-to-r from-red-500 to-rose-600 text-white" 
                  : "bg-[var(--color-bg-elevated)] text-[var(--text-muted)]"
              }`}>
                {thisWeekStats.count > 0 ? "导出 AI 总结" : "本周无交易"}
              </div>
            </div>

            {/* 本月 */}
            <div 
              onClick={() => thisMonthStats.count > 0 && setActiveReviewPeriod("month")}
              className={`hidden md:flex flex-col justify-center items-end h-10 px-2.5 rounded-lg border leading-tight group relative overflow-hidden transition-all duration-200 ${
                thisMonthStats.count > 0 
                  ? "bg-[var(--color-bg-surface)] border-[var(--color-border-subtle)] cursor-pointer" 
                  : "bg-[var(--color-bg-surface)] border-[var(--color-border-subtle)] cursor-not-allowed"
              }`}
            >
              <div className="flex flex-col justify-center w-full h-full transition-all duration-200 group-hover:opacity-0 group-hover:-translate-y-2">
                <div className="flex items-center justify-between w-full gap-2">
                  <span className="text-[10px] text-[var(--text-muted)] font-medium">本月</span>
                  <span className={`text-xs font-bold ${thisMonthStats.pnl >= 0 ? "text-trade-green" : "text-trade-red"}`}>
                    {thisMonthStats.pnl >= 0 ? "+" : ""}{thisMonthStats.pnl.toFixed(2)}
                  </span>
                </div>
                <div className="text-[9px] text-[var(--text-muted)] mt-0.5">
                  {thisMonthStats.count}笔 | 胜率:{thisMonthStats.winRate.toFixed(0)}% | RR:{thisMonthStats.rr.toFixed(1)}
                </div>
              </div>
              <div className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold transition-all duration-200 translate-y-2 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 ${
                thisMonthStats.count > 0 
                  ? "bg-gradient-to-r from-red-500 to-rose-600 text-white" 
                  : "bg-[var(--color-bg-elevated)] text-[var(--text-muted)]"
              }`}>
                {thisMonthStats.count > 0 ? "导出 AI 总结" : "本月无交易"}
              </div>
            </div>

            {/* 总计 */}
            <div 
              onClick={() => totalStats.count > 0 && setActiveReviewPeriod("all")}
              className={`flex flex-col justify-center items-end h-10 px-2.5 rounded-lg border leading-tight group relative overflow-hidden transition-all duration-200 ${
                totalStats.count > 0 
                  ? "bg-[var(--color-bg-surface)] border-[var(--color-border-subtle)] cursor-pointer" 
                  : "bg-[var(--color-bg-surface)] border-[var(--color-border-subtle)] cursor-not-allowed"
              }`}
            >
              <div className="flex flex-col justify-center w-full h-full transition-all duration-200 group-hover:opacity-0 group-hover:-translate-y-2">
                <div className="flex items-center justify-between w-full gap-2">
                  <span className="text-[10px] text-[var(--text-muted)] font-medium">总计</span>
                  <span className={`text-xs font-bold ${totalStats.pnl >= 0 ? "text-trade-green" : "text-trade-red"}`}>
                    {totalStats.pnl >= 0 ? "+" : ""}{totalStats.pnl.toFixed(2)}
                  </span>
                </div>
                <div className="text-[9px] text-[var(--text-muted)] mt-0.5">
                  {totalStats.count}笔 | 胜率:{totalStats.winRate.toFixed(0)}% | RR:{totalStats.rr.toFixed(1)}
                </div>
              </div>
              <div className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold transition-all duration-200 translate-y-2 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 ${
                totalStats.count > 0 
                  ? "bg-gradient-to-r from-red-500 to-rose-600 text-white" 
                  : "bg-[var(--color-bg-elevated)] text-[var(--text-muted)]"
              }`}>
                {totalStats.count > 0 ? "导出 AI 总结" : "暂无交易"}
              </div>
            </div>
          </div>
          <button onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-lg border border-[var(--color-border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--color-bg-hover)] transition-colors">
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden pt-14">
        {/* Sidebar */}
        <aside className={`border-r border-[var(--color-border-subtle)] bg-[var(--color-bg-canvas)] flex flex-col justify-between py-6 shrink-0 fixed top-14 left-0 bottom-0 z-30 transition-all duration-300 ${
          isSidebarCollapsed ? "w-16 px-2" : "w-64 px-4"
        }`}>
          <nav className="flex flex-col gap-1">
            {navItems.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                title={isSidebarCollapsed ? tab.label : undefined}
                className={`flex items-center rounded-lg text-sm font-medium transition-all text-left ${
                  isSidebarCollapsed 
                    ? "justify-center p-2.5" 
                    : "gap-3 px-3 py-2"
                } ${
                  activeTab === tab.key
                    ? "bg-[var(--color-bg-elevated)] text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--text-primary)]"
                }`}>
                {tab.icon}
                {!isSidebarCollapsed && <span>{tab.label}</span>}
              </button>
            ))}
          </nav>

          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            title={isSidebarCollapsed ? "展开侧边栏" : undefined}
            className={`flex items-center rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--text-primary)] transition-all text-left ${
              isSidebarCollapsed 
                ? "justify-center p-2.5" 
                : "gap-3 px-3 py-2"
            }`}
          >
            {isSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            {!isSidebarCollapsed && <span>收起侧边栏</span>}
          </button>
        </aside>

        {/* Content */}
        <main className={`flex-1 transition-all duration-300 ${
          isSidebarCollapsed ? "ml-16" : "ml-64"
        } ${activeTab === "journal" ? "flex flex-col min-h-0 overflow-hidden" : "overflow-y-auto"} p-4 md:p-6`}>
          {activeTab === "dashboard" && (
            <Dashboard
              netProfit={netProfit} winRate={winRate} profitFactor={profitFactor}
              avgWin={avgWin} avgLoss={avgLoss} pnlRatio={pnlRatio}
              capitalCurveData={capitalCurveData} setupChartData={setupChartData}
              errorPieData={errorPieData} COLORS={COLORS}
              dashboardReady={dashboardReady}
            />
          )}
          {activeTab === "journal" && (
            <Journal
              trades={trades} filteredTrades={filteredTrades}
              setups={setups} errors={errors} exits={exits} symbols={symbols}
              processes={processes} processFilter={processFilter} setProcessFilter={setProcessFilter}
              marketEnvFilter={marketEnvFilter} setMarketEnvFilter={setMarketEnvFilter}
              inlineEditingId={inlineEditingId} setInlineEditingId={setInlineEditingId}
              tradeForm={tradeForm} setTradeForm={setTradeForm}
              searchQuery={searchQuery} setSearchQuery={setSearchQuery}
              directionFilter={directionFilter} setDirectionFilter={setDirectionFilter}
              statusFilter={statusFilter} setStatusFilter={setStatusFilter}
              setupFilter={setupFilter} setSetupFilter={setSetupFilter}
              typeFilter={typeFilter} setTypeFilter={setTypeFilter}
              symbolFilter={symbolFilter} setSymbolFilter={setSymbolFilter}
              dateFilter={dateFilter} setDateFilter={setDateFilter}
              customStartDate={customStartDate} setCustomStartDate={setCustomStartDate}
              customEndDate={customEndDate} setCustomEndDate={setCustomEndDate}
              pendingScreenshots={pendingScreenshots}
              isUploadingScreenshot={isUploadingScreenshot}
              lightboxImage={lightboxImage} setLightboxImage={handleSetLightbox}
              expandedScreenshotId={expandedScreenshotId} setExpandedScreenshotId={setExpandedScreenshotId}
              calculateLivePnl={calculateLivePnl} calculateLiveRR={calculateLiveRR} calculateLiveActualRR={calculateLiveActualRR}
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
              trades={trades}
              setups={setups} errors={errors} exits={exits} symbols={symbols} processes={processes}
              isImporting={isImporting} importStatus={importStatus}
              newSetupName={newSetupName} setNewSetupName={setNewSetupName}
              newErrorName={newErrorName} setNewErrorName={setNewErrorName}
              newExitName={newExitName} setNewExitName={setNewExitName}
              newSymbolName={newSymbolName} setNewSymbolName={setNewSymbolName}
              newProcessName={newProcessName} setNewProcessName={setNewProcessName}
              onImportExcel={handleImportExcel}
              onExportExcel={handleExportExcel}
              onAddSetup={handleAddSetup} onDeleteSetup={handleDeleteSetup}
              onAddError={handleAddError} onDeleteError={handleDeleteError}
              onAddExit={handleAddExit} onDeleteExit={handleDeleteExit}
              onAddSymbol={handleAddSymbol} onDeleteSymbol={handleDeleteSymbol}
              onAddProcess={handleAddProcess} onDeleteProcess={handleDeleteProcess}
              onDeleteTradesByDateRange={handleDeleteTradesByDateRange}
              rules={rules}
              onAddRule={handleAddRule}
              onDeleteRule={handleDeleteRule}
            />
          )}
          {activeTab === "analysis" && (
            <Analysis
              trades={trades}
              quickRange={quickRange} setQuickRange={setQuickRange}
              dateRange={dateRange} setDateRange={setDateRange}
              analysisReady={analysisReady}
            />
          )}
        </main>
      </div>
      {activeReviewPeriod && (
        <AiReviewModal
          period={activeReviewPeriod}
          trades={trades}
          rules={rules}
          onClose={() => setActiveReviewPeriod(null)}
        />
      )}
    </div>
  );
}
