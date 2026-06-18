"use client";

import React, { useState, useEffect } from "react";
import {
  Plus, Trash, Edit, Check, X,
  Upload, Camera, Image as ImageIcon, RefreshCw, Sparkles
} from "lucide-react";
import ScreenshotImage from "./ScreenshotImage";
import type { Trade, OptionItem } from "./types";
import { marked } from "marked";

interface JournalProps {
  trades: Trade[];
  filteredTrades: Trade[];
  setups: OptionItem[];
  errors: OptionItem[];
  exits: OptionItem[];
  symbols: OptionItem[];
  processes: OptionItem[];
  inlineEditingId: string | null;
  setInlineEditingId: React.Dispatch<React.SetStateAction<string | null>>;
  tradeForm: {
    date: string; remarks: string; setup: string; type: string; exitReason: string;
    notes: string; positionSize: number; direction: string; entryPrice: number;
    stopLoss: string; takeProfit: string; exitPrice1: number; exitPrice2: string;
    errorReason: string; symbol: string; process: string; marketEnv: string;
  };
  setTradeForm: React.Dispatch<React.SetStateAction<{
    date: string; remarks: string; setup: string; type: string; exitReason: string;
    notes: string; positionSize: number; direction: string; entryPrice: number;
    stopLoss: string; takeProfit: string; exitPrice1: number; exitPrice2: string;
    errorReason: string; symbol: string; process: string; marketEnv: string;
  }>>;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  directionFilter: string;
  setDirectionFilter: React.Dispatch<React.SetStateAction<string>>;
  statusFilter: string;
  setStatusFilter: React.Dispatch<React.SetStateAction<string>>;
  setupFilter: string;
  setSetupFilter: React.Dispatch<React.SetStateAction<string>>;
  typeFilter: string;
  setTypeFilter: React.Dispatch<React.SetStateAction<string>>;
  symbolFilter: string;
  setSymbolFilter: React.Dispatch<React.SetStateAction<string>>;
  processFilter: string;
  setProcessFilter: React.Dispatch<React.SetStateAction<string>>;
  marketEnvFilter: string;
  setMarketEnvFilter: React.Dispatch<React.SetStateAction<string>>;
  dateFilter: "30" | "today" | "week" | "month" | "all" | "custom";
  setDateFilter: React.Dispatch<React.SetStateAction<"30" | "today" | "week" | "month" | "all" | "custom">>;
  customStartDate: string;
  setCustomStartDate: React.Dispatch<React.SetStateAction<string>>;
  customEndDate: string;
  setCustomEndDate: React.Dispatch<React.SetStateAction<string>>;
  pendingScreenshots: { file: File; preview: string }[];
  isUploadingScreenshot: boolean;
  lightboxImage: string | null;
  setLightboxImage: (id: string | null, note?: string | null) => void;
  expandedScreenshotId: string | null;
  setExpandedScreenshotId: React.Dispatch<React.SetStateAction<string | null>>;
  calculateLivePnl: () => number;
  calculateLiveRR: () => number | null;
  calculateLiveActualRR: () => number | null;
  handleSaveTrade: () => Promise<void>;
  handleDeleteTrade: (id: string) => Promise<void>;
  handleUploadScreenshots: (tradeId: string, files: FileList | null) => Promise<void>;
  handleDeleteScreenshot: (tradeId: string, screenshotId: string) => Promise<void>;
  handlePendingFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removePendingScreenshot: (index: number) => void;
  clearPendingScreenshots: () => void;
}

// Helper: Ensure the date string is in YYYY-MM-DDTHH:mm:ss format for datetime-local input
const ensureLocalDatetime = (dateStr: string | Date | undefined | null): string => {
  if (!dateStr) return "";
  if (dateStr instanceof Date) {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${dateStr.getFullYear()}-${pad(dateStr.getMonth() + 1)}-${pad(dateStr.getDate())}T${pad(dateStr.getHours())}:${pad(dateStr.getMinutes())}:${pad(dateStr.getSeconds())}`;
  }
  const str = String(dateStr);
  if (str.includes("T")) {
    const [datePart, timePart] = str.split("T");
    const timePieces = timePart.split("Z")[0].split(":");
    const h = (timePieces[0] || "00").padStart(2, "0");
    const m = (timePieces[1] || "00").padStart(2, "0");
    const s = (timePieces[2] || "00").substring(0, 2).padStart(2, "0");
    return `${datePart}T${h}:${m}:${s}`;
  }
  return `${str}T00:00:00`;
};

// Helper: Format date for display in the table (YYYY-MM-DD HH:mm:ss)
const formatDisplayDate = (dateStr: string | Date | undefined | null): string => {
  if (!dateStr) return "-";
  if (dateStr instanceof Date) {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${dateStr.getFullYear()}-${pad(dateStr.getMonth() + 1)}-${pad(dateStr.getDate())} ${pad(dateStr.getHours())}:${pad(dateStr.getMinutes())}:${pad(dateStr.getSeconds())}`;
  }
  const str = String(dateStr);
  const cleaned = str.replace("T", " ");
  if (cleaned.length === 10) return cleaned + " 00:00:00";
  if (cleaned.length === 16) return cleaned + ":00";
  const plusIdx = cleaned.indexOf("+");
  if (plusIdx !== -1) return cleaned.substring(0, plusIdx);
  const zIdx = cleaned.indexOf("Z");
  if (zIdx !== -1) return cleaned.substring(0, zIdx);
  return cleaned;
};

// Helper: Parse <think>...</think> block from text
const parseThinkContent = (text: string) => {
  if (!text) return { think: "", content: "" };
  
  // 支持大小写不敏感匹配
  const lowerText = text.toLowerCase();
  
  // 查找 <think> 和 </think> 的位置
  const startIdx = lowerText.indexOf("<think>");
  const endIdx = lowerText.indexOf("</think>");
  
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    const think = text.substring(startIdx + 7, endIdx).trim();
    const content = text.substring(endIdx + 8).trim();
    return { think, content };
  }
  
  if (startIdx !== -1 && endIdx === -1) {
    const think = text.substring(startIdx + 7).trim();
    return { think, content: "" };
  }
  
  // 正则兜底匹配（支持跨行修饰符 s）
  const thinkRegex = /<think>([\s\S]*?)<\/think>/i;
  const match = text.match(thinkRegex);
  if (match) {
    const think = match[1].trim();
    const content = text.replace(thinkRegex, "").trim();
    return { think, content };
  }
  
  return { think: "", content: text };
};


export default function Journal({
  trades, filteredTrades, setups, errors, exits, symbols, processes,
  inlineEditingId, setInlineEditingId, tradeForm, setTradeForm,
  searchQuery, setSearchQuery, directionFilter, setDirectionFilter,
  statusFilter, setStatusFilter, setupFilter, setSetupFilter,
  typeFilter, setTypeFilter, symbolFilter, setSymbolFilter,
  processFilter, setProcessFilter,
  marketEnvFilter, setMarketEnvFilter,
  dateFilter, setDateFilter, customStartDate, setCustomStartDate, customEndDate, setCustomEndDate,
  pendingScreenshots, isUploadingScreenshot,
  lightboxImage, setLightboxImage, expandedScreenshotId, setExpandedScreenshotId,
  calculateLivePnl, calculateLiveRR, calculateLiveActualRR,
  handleSaveTrade, handleDeleteTrade, handleUploadScreenshots, handleDeleteScreenshot,
  handlePendingFileSelect, removePendingScreenshot, clearPendingScreenshots
}: JournalProps) {
  // 分页状态与计算
  const [currentPage, setCurrentPage] = useState(1);
  const [remarksTab, setRemarksTab] = useState<"edit" | "preview">("edit");
  const [notesTab, setNotesTab] = useState<"edit" | "preview">("edit");
  const pageSize = 30;

  // AI 美化状态与方法
  const [showBeautifyModal, setShowBeautifyModal] = useState(false);
  const [beautifyOriginalText, setBeautifyOriginalText] = useState("");
  const [beautifyResultText, setBeautifyResultText] = useState("");
  const [isBeautifying, setIsBeautifying] = useState(false);

  const handleAiBeautify = async () => {
    const originalText = tradeForm.notes.trim();
    if (!originalText) {
      alert("请先在「自我复盘总结」中输入内容，AI 才能为您进行美化。");
      return;
    }

    const apiKey = localStorage.getItem("tf_ai_api_key") || "";
    const baseUrl = localStorage.getItem("tf_ai_base_url") || "https://api.openai.com/v1";
    const modelName = localStorage.getItem("tf_ai_model_name") || "gpt-4o";
    const thinkMode = localStorage.getItem("tf_ai_think_mode") || "think-high";

    if (!apiKey) {
      alert("未配置 AI 接口密钥。请前往「设置」页面最下方，填写并保存您的 AI API Key 配置。");
      return;
    }

    setBeautifyOriginalText(originalText);
    setBeautifyResultText("");
    setShowBeautifyModal(true);
    setIsBeautifying(true);

    try {
      let systemPrompt = "";
      if (thinkMode === "non-think") {
        systemPrompt = "你的任务是将交易员提供的复盘内容重新整理，使其足够清晰明了和结构化（使用 Markdown 格式）。请直接输出最终的整理结果，不要输出任何 <think> 标签或你的思考过程，也不要附带任何解释或前言。";
      } else {
        // think-high 和 think-max 统一使用同一套核心提示词与格式规则
        systemPrompt = "你的任务是将交易员提供的复盘内容重新整理，使其足够清晰明了和结构化（使用 Markdown 格式）。请首先在 <think>...</think> 标签中输出你的思考和重组逻辑，然后再给出正式的整理结果。只输出 <think>思考过程</think>正式回答，不要附带其他前言。";
      }

      const userPrompt = `这是交易员输入的原始复盘内容：\n\n${originalText}`;

      const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.5
        })
      });

      if (!response.ok) {
        throw new Error(`API 请求失败 (HTTP ${response.status})。请检查 Base URL 或 API Key。`);
      }

      const data = await response.json();
      const polished = data?.choices?.[0]?.message?.content || "";
      if (!polished) {
        throw new Error("AI 返回了空数据。");
      }

      setBeautifyResultText(polished);
    } catch (err: any) {
      alert(`AI 美化失败: ${err.message || err}`);
      setShowBeautifyModal(false);
    } finally {
      setIsBeautifying(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [
    filteredTrades.length, searchQuery, directionFilter, statusFilter,
    setupFilter, typeFilter, symbolFilter, processFilter, dateFilter
  ]);

  useEffect(() => {
    setRemarksTab("edit");
    setNotesTab("edit");
  }, [inlineEditingId]);

  const totalPages = Math.ceil(filteredTrades.length / pageSize) || 1;
  const activePage = Math.min(currentPage, totalPages);
  const startIndex = (activePage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedTrades = filteredTrades.slice(startIndex, endIndex);

  const handleRowClick = (trade: Trade) => {
    setInlineEditingId(trade.id);
    setTradeForm({
      date: ensureLocalDatetime(trade.date),
      remarks: trade.remarks || "",
      setup: trade.setup,
      type: trade.type,
      exitReason: trade.exitReason,
      notes: trade.notes || "",
      positionSize: trade.positionSize,
      direction: trade.direction,
      entryPrice: trade.entryPrice,
      stopLoss: trade.stopLoss !== null ? String(trade.stopLoss) : "",
      takeProfit: trade.takeProfit !== null ? String(trade.takeProfit) : "",
      exitPrice1: trade.exitPrice1,
      exitPrice2: trade.exitPrice2 !== null ? String(trade.exitPrice2) : "",
      errorReason: trade.errorReason || "",
      symbol: trade.symbol,
      process: trade.process || "",
      marketEnv: trade.marketEnv || ""
    });
  };

  const screenshotBlock = (trade: Trade, isEditingRow: boolean) => (
    <div className="flex flex-col gap-3">
      <h4 className="text-xs font-bold flex items-center gap-1.5 text-[var(--text-secondary)]">
        <Camera size={13} className="text-trade-green" />
        <span>{isEditingRow ? "交易截图" : `交易截图 (${trade.screenshots?.length || 0} 张)`}</span>
      </h4>
      {trade.screenshots && trade.screenshots.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {trade.screenshots.map(pic => (
            <div key={pic.id} className="relative group rounded-lg overflow-hidden border border-[var(--color-border-subtle)] w-[100px]">
              <ScreenshotImage screenshotId={pic.id} alt="Screenshot" className="w-full h-full object-cover cursor-zoom-in"
                onClick={() => setLightboxImage(pic.id, trade.remarks || `${trade.direction === "long" ? "做多" : "做空"} ${trade.symbol} | 盈亏: ${trade.pnl} 元`)} />
              <button onClick={() => handleDeleteScreenshot(trade.id, pic.id)}
                className="absolute top-1 right-1 p-1 rounded-full bg-trade-red text-white opacity-0 group-hover:opacity-100 transition-opacity" title="删除">
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}
      {isEditingRow && pendingScreenshots.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {pendingScreenshots.map((item, idx) => (
            <div key={idx} className="relative group rounded-lg overflow-hidden border border-dashed border-trade-green w-[100px]">
              <img src={item.preview} alt={item.file.name} className="w-full h-[60px] object-cover" />
              <button onClick={() => removePendingScreenshot(idx)}
                className="absolute top-1 right-1 p-1 rounded-full bg-trade-red text-white opacity-0 group-hover:opacity-100 transition-opacity">
                <X size={10} />
              </button>
              <div className="absolute bottom-0 inset-x-0 bg-black/60 text-[8px] text-white py-0.5 px-1 truncate">待上传</div>
            </div>
          ))}
        </div>
      )}
      <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-[var(--color-border-standard)] bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-hover)] text-xs font-semibold text-[var(--text-secondary)] cursor-pointer transition-colors w-fit">
        <Upload size={12} /><span>{isEditingRow ? "选择截图（保存时上传）" : "添加截图"}</span>
        <input type="file" accept="image/*" multiple onChange={isEditingRow ? handlePendingFileSelect : (e) => handleUploadScreenshots(trade.id, e.target.files)} className="hidden" />
      </label>
      {isUploadingScreenshot && (
        <span className="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
          <RefreshCw size={10} className="animate-spin text-trade-green" />上传中...
        </span>
      )}
    </div>
  );

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4 animate-fade-in relative">
      {/* Header & Filters Container */}
      <div className="flex-shrink-0 bg-[var(--color-bg-canvas)] pb-4 -mt-4 -mx-4 px-4 md:-mt-6 md:-mx-6 md:px-6 flex flex-col gap-4 border-b border-[var(--color-border-subtle)]">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-[var(--text-primary)]">交易日志</h2>
            <p className="text-sm text-[var(--text-muted)]">记录每一笔交易，复盘每一次决策</p>
          </div>
          <button
            onClick={() => {
              const getLocalISOString = () => {
                const d = new Date();
                const pad = (n: number) => String(n).padStart(2, '0');
                return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
              };
              setInlineEditingId("__new__");
              setTradeForm({
                date: getLocalISOString(),
                remarks: "", setup: setups[0]?.name || "", type: "趋势延续",
                exitReason: exits[0]?.name || "", notes: "", positionSize: 1,
                direction: "Long", entryPrice: 0, stopLoss: "", takeProfit: "",
                exitPrice1: 0, exitPrice2: "", errorReason: "",
                symbol: symbols[0]?.name || "", process: processes[0]?.name || "",
                marketEnv: ""
              });
            }}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-trade-green text-white font-bold text-sm hover:bg-green-600 transition-colors">
            <Plus size={16} />新建
          </button>
        </div>

        {/* Filters */}
        <div className="p-3 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] w-full sm:w-64">
            <input type="text" placeholder="搜索思路/笔记/理由..." value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-none outline-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]" />
          </div>
          <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value as any)}
            className="px-3 py-1.5 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] text-sm text-[var(--text-primary)] focus:outline-none">
            <option value="30">最近 30 条</option>
            <option value="today">今天</option>
            <option value="week">本周</option>
            <option value="month">本月</option>
            <option value="all">全部</option>
            <option value="custom">自定义范围</option>
          </select>
          {dateFilter === "custom" && (
            <div className="flex items-center gap-1.5">
              <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2 py-1 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] text-xs text-[var(--text-primary)] focus:outline-none" />
              <span className="text-xs text-[var(--text-muted)]">至</span>
              <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2 py-1 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] text-xs text-[var(--text-primary)] focus:outline-none" />
            </div>
          )}
          <select value={symbolFilter} onChange={(e) => setSymbolFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] text-sm text-[var(--text-primary)] focus:outline-none">
            <option value="all">所有品类</option>
            {symbols.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
          <select value={directionFilter} onChange={(e) => setDirectionFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] text-sm text-[var(--text-primary)] focus:outline-none">
            <option value="all">所有方向</option>
            <option value="Long">Long</option>
            <option value="Short">Short</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] text-sm text-[var(--text-primary)] focus:outline-none">
            <option value="all">所有状态</option>
            <option value="win">盈利</option>
            <option value="lose">亏损</option>
            <option value="BE">保本</option>
          </select>
          <select value={marketEnvFilter} onChange={(e) => setMarketEnvFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] text-sm text-[var(--text-primary)] focus:outline-none">
            <option value="all">所有环境</option>
            <option value="突破">突破</option>
            <option value="窄通道">窄通道</option>
            <option value="宽通道">宽通道</option>
            <option value="震荡区间">震荡区间</option>
          </select>
          <select value={setupFilter} onChange={(e) => setSetupFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] text-sm text-[var(--text-primary)] max-w-xs focus:outline-none">
            <option value="all">所有入场</option>
            {setups.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] text-sm text-[var(--text-primary)] focus:outline-none">
            <option value="all">所有类型</option>
            <option value="趋势延续">趋势延续</option>
            <option value="反转（Reversal）">反转</option>
            <option value="突破（BO）">突破</option>
            <option value="假突破（fBO）">假突破</option>
          </select>
          <select value={processFilter} onChange={(e) => setProcessFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] text-sm text-[var(--text-primary)] focus:outline-none">
            <option value="all">所有过程</option>
            {processes.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
          </select>
          {(searchQuery || directionFilter !== "all" || statusFilter !== "all" || setupFilter !== "all" || typeFilter !== "all" || symbolFilter !== "all" || processFilter !== "all" || marketEnvFilter !== "all" || dateFilter !== "30" || customStartDate || customEndDate) && (
            <button onClick={() => { setSearchQuery(""); setDirectionFilter("all"); setStatusFilter("all"); setSetupFilter("all"); setTypeFilter("all"); setSymbolFilter("all"); setProcessFilter("all"); setMarketEnvFilter("all"); setDateFilter("30"); setCustomStartDate(""); setCustomEndDate(""); }}
              className="text-xs text-trade-red hover:underline ml-auto">重置</button>
          )}
        </div>
      </div>

      {/* Table Card */}
      <div className="flex-1 min-h-0 flex flex-col rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] transition-colors overflow-hidden">
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-left text-sm relative">
            <thead className="sticky top-0 z-10 bg-[var(--color-bg-surface)] shadow-[0_1px_0_0_var(--color-border-subtle)]">
              <tr className="border-b border-[var(--color-border-subtle)]">
                <th className="px-3 py-2 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider bg-[var(--color-bg-surface)]">日期</th>
                <th className="px-3 py-2 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider bg-[var(--color-bg-surface)]">品类</th>
                <th className="px-3 py-2 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider bg-[var(--color-bg-surface)]">方向</th>
                <th className="px-3 py-2 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider bg-[var(--color-bg-surface)]">环境</th>
                <th className="px-3 py-2 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider bg-[var(--color-bg-surface)]">入场理由</th>
                <th className="px-3 py-2 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider bg-[var(--color-bg-surface)]">类型</th>
                <th className="px-3 py-2 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider text-right bg-[var(--color-bg-surface)]">RR</th>
                <th className="px-3 py-2 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider bg-[var(--color-bg-surface)]">离场</th>
                <th className="px-3 py-2 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider bg-[var(--color-bg-surface)]">过程</th>
                <th className="px-3 py-2 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider bg-[var(--color-bg-surface)]">错误</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {paginatedTrades.map(trade => {
                const isEditing = inlineEditingId === trade.id;
                const rowBgClass = trade.status === "win"
                  ? "bg-trade-green-dim/35 dark:bg-trade-green-dim/15 hover:bg-trade-green-dim/50 dark:hover:bg-trade-green-dim/25 text-[var(--text-primary)]"
                  : trade.status === "lose"
                    ? "bg-trade-red-dim/35 dark:bg-trade-red-dim/15 hover:bg-trade-red-dim/50 dark:hover:bg-trade-red-dim/25 text-[var(--text-primary)]"
                    : "hover:bg-[var(--color-bg-hover)] bg-[var(--color-bg-surface)] text-[var(--text-primary)]";
                const activeClass = isEditing ? "ring-2 ring-trade-green ring-inset" : "";

                return (
                  <tr 
                    key={trade.id} 
                    onClick={() => handleRowClick(trade)}
                    className={`cursor-pointer transition-all duration-150 border-b border-[var(--color-border-subtle)] ${rowBgClass} ${activeClass}`}
                  >
                    <td className="px-3 py-2 font-mono text-xs whitespace-nowrap tabular-nums text-[var(--text-secondary)]">
                      {formatDisplayDate(trade.date)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded font-semibold bg-[var(--color-bg-elevated)] text-[var(--text-secondary)] text-[10px]">
                        {trade.symbol || "-"}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                        trade.direction === "Long" ? "bg-[var(--trade-green-dim)] text-trade-green" : "bg-[var(--trade-red-dim)] text-trade-red"
                      }`}>{trade.direction}</span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded font-semibold bg-[var(--color-bg-elevated)] text-[var(--text-secondary)] text-[10px]">
                        {trade.marketEnv || "-"}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-semibold text-[var(--text-secondary)] whitespace-nowrap">{trade.setup}</td>
                    <td className="px-3 py-2 text-[var(--text-muted)] whitespace-nowrap">{trade.type}</td>
                    <td className="px-3 py-2 font-mono text-xs text-right whitespace-nowrap tabular-nums text-[var(--text-secondary)]">
                      {trade.rr !== null && trade.rr !== undefined ? `${trade.rr} R` : "-"}
                    </td>
                    <td className="px-3 py-2 text-[var(--text-muted)] whitespace-nowrap text-xs">{trade.exitReason}</td>
                    <td className="px-3 py-2 text-[var(--text-muted)] whitespace-nowrap text-xs">{trade.process || "-"}</td>
                    <td className="px-3 py-2 text-trade-red whitespace-nowrap text-xs font-medium">{trade.errorReason || "-"}</td>
                  </tr>
                );
              })}
              {filteredTrades.length === 0 && (
                <tr><td colSpan={10} className="p-8 text-center text-[var(--text-muted)]">暂无交易记录。</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-[var(--color-bg-surface)] border-t border-[var(--color-border-subtle)] flex-wrap gap-2">
            <div className="text-xs text-[var(--text-muted)]">
              显示 {startIndex + 1} - {Math.min(endIndex, filteredTrades.length)} 条，共 <span className="font-bold">{filteredTrades.length}</span> 条交易记录
            </div>
            <div className="flex items-center gap-1.5 font-mono">
              <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={activePage === 1}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] text-[var(--text-secondary)] disabled:opacity-40 hover:bg-[var(--color-bg-hover)] disabled:hover:bg-transparent transition-colors cursor-pointer">
                上一页
              </button>
              {Array.from({ length: totalPages }).map((_, idx) => {
                const p = idx + 1;
                return (
                  <button key={p} onClick={() => setCurrentPage(p)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      activePage === p
                        ? "bg-trade-green text-white"
                        : "border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--color-bg-hover)]"
                    }`}>
                    {p}
                  </button>
                );
              })}
              <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={activePage === totalPages}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] text-[var(--text-secondary)] disabled:opacity-40 hover:bg-[var(--color-bg-hover)] disabled:hover:bg-transparent transition-colors cursor-pointer">
                下一页
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Drawer Backdrop Overlay */}
      {inlineEditingId !== null && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 transition-opacity duration-300"
          onClick={() => { clearPendingScreenshots(); setInlineEditingId(null); }}
        />
      )}

      {/* Drawer Panel */}
      {inlineEditingId !== null && (
        <div className="fixed right-0 top-0 h-screen w-full sm:w-[600px] bg-[var(--color-bg-surface)] border-l border-[var(--color-border-subtle)] shadow-2xl z-50 flex flex-col overflow-hidden animate-slide-in">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              {inlineEditingId === "__new__" ? "新建交易日志" : "交易详情与编辑"}
            </h3>
            <button 
              onClick={() => { clearPendingScreenshots(); setInlineEditingId(null); }}
              className="p-1 rounded-lg hover:bg-[var(--color-bg-hover)] text-[var(--text-secondary)] transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Form Content (scrollable) */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Grid of basic fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">日期 *</label>
                <input type="datetime-local" step="1" required value={ensureLocalDatetime(tradeForm.date)}
                  onChange={(e) => {
                    setTradeForm(prev => ({ ...prev, date: e.target.value }));
                  }}
                  className="px-3 py-1.5 rounded-lg border border-[var(--color-border-standard)] bg-[var(--color-bg-canvas)] text-sm text-[var(--text-primary)] focus:border-trade-green outline-none w-full" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">品类 *</label>
                <select value={tradeForm.symbol}
                  onChange={(e) => setTradeForm(prev => ({ ...prev, symbol: e.target.value }))}
                  className="px-3 py-1.5 rounded-lg border border-[var(--color-border-standard)] bg-[var(--color-bg-canvas)] text-sm text-[var(--text-primary)] focus:border-trade-green outline-none">
                  {symbols.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">方向 *</label>
                <select value={tradeForm.direction}
                  onChange={(e) => setTradeForm(prev => ({ ...prev, direction: e.target.value }))}
                  className="px-3 py-1.5 rounded-lg border border-[var(--color-border-standard)] bg-[var(--color-bg-canvas)] text-sm text-[var(--text-primary)] focus:border-trade-green outline-none">
                  <option value="Long">Long</option>
                  <option value="Short">Short</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">环境</label>
                <select value={tradeForm.marketEnv}
                  onChange={(e) => setTradeForm(prev => ({ ...prev, marketEnv: e.target.value }))}
                  className="px-3 py-1.5 rounded-lg border border-[var(--color-border-standard)] bg-[var(--color-bg-canvas)] text-sm text-[var(--text-primary)] focus:border-trade-green outline-none">
                  <option value="">-- 无 --</option>
                  <option value="突破">突破</option>
                  <option value="窄通道">窄通道</option>
                  <option value="宽通道">宽通道</option>
                  <option value="震荡区间">震荡区间</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">入场理由</label>
                <select value={tradeForm.setup}
                  onChange={(e) => setTradeForm(prev => ({ ...prev, setup: e.target.value }))}
                  className="px-3 py-1.5 rounded-lg border border-[var(--color-border-standard)] bg-[var(--color-bg-canvas)] text-sm text-[var(--text-primary)] focus:border-trade-green outline-none">
                  {setups.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">交易类型</label>
                <select value={tradeForm.type}
                  onChange={(e) => setTradeForm(prev => ({ ...prev, type: e.target.value }))}
                  className="px-3 py-1.5 rounded-lg border border-[var(--color-border-standard)] bg-[var(--color-bg-canvas)] text-sm text-[var(--text-primary)] focus:border-trade-green outline-none">
                  <option value="趋势延续">趋势延续</option>
                  <option value="反转（Reversal）">反转</option>
                  <option value="突破（BO）">突破</option>
                  <option value="假突破（fBO）">假突破</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">仓位大小 *</label>
                <input type="number" step="any" required value={tradeForm.positionSize}
                  onChange={(e) => setTradeForm(prev => ({ ...prev, positionSize: parseFloat(e.target.value) || 0 }))}
                  className="px-3 py-1.5 rounded-lg border border-[var(--color-border-standard)] bg-[var(--color-bg-canvas)] text-sm text-[var(--text-primary)] font-mono focus:border-trade-green outline-none" />
              </div>
            </div>

            {/* Price Inputs Block */}
            <div className="border-t border-[var(--color-border-subtle)] pt-4 mt-2">
              <h4 className="text-xs font-bold text-[var(--text-secondary)] mb-3">价格与止损/止盈</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">入场价格 *</label>
                  <input type="number" step="any" required value={tradeForm.entryPrice}
                    onChange={(e) => setTradeForm(prev => ({ ...prev, entryPrice: parseFloat(e.target.value) || 0 }))}
                    className="px-3 py-1.5 rounded-lg border border-[var(--color-border-standard)] bg-[var(--color-bg-canvas)] text-sm text-[var(--text-primary)] font-mono focus:border-trade-green outline-none" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">离场价格1 *</label>
                  <input type="number" step="any" required value={tradeForm.exitPrice1}
                    onChange={(e) => setTradeForm(prev => ({ ...prev, exitPrice1: parseFloat(e.target.value) || 0 }))}
                    className="px-3 py-1.5 rounded-lg border border-[var(--color-border-standard)] bg-[var(--color-bg-canvas)] text-sm text-[var(--text-primary)] font-mono focus:border-trade-green outline-none" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">离场价格2 (选填)</label>
                  <input type="number" step="any" value={tradeForm.exitPrice2}
                    onChange={(e) => setTradeForm(prev => ({ ...prev, exitPrice2: e.target.value }))}
                    className="px-3 py-1.5 rounded-lg border border-[var(--color-border-standard)] bg-[var(--color-bg-canvas)] text-sm text-[var(--text-primary)] font-mono focus:border-trade-green outline-none" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">止损价 (SL)</label>
                  <input type="number" step="any" value={tradeForm.stopLoss}
                    onChange={(e) => setTradeForm(prev => ({ ...prev, stopLoss: e.target.value }))}
                    className="px-3 py-1.5 rounded-lg border border-[var(--color-border-standard)] bg-[var(--color-bg-canvas)] text-sm text-[var(--text-primary)] font-mono focus:border-trade-green outline-none" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">止盈价 (TP)</label>
                  <input type="number" step="any" value={tradeForm.takeProfit}
                    onChange={(e) => setTradeForm(prev => ({ ...prev, takeProfit: e.target.value }))}
                    className="px-3 py-1.5 rounded-lg border border-[var(--color-border-standard)] bg-[var(--color-bg-canvas)] text-sm text-[var(--text-primary)] font-mono focus:border-trade-green outline-none" />
                </div>
                
                {/* Live RR Display */}
                {(() => {
                  const liveRR = calculateLiveRR();
                  const liveActualRR = calculateLiveActualRR();
                  if (!liveRR && !liveActualRR) return null;
                  return (
                    <div className="flex gap-4 justify-end pb-1.5 col-span-2 sm:col-span-1">
                      {liveRR && (
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-semibold text-[var(--text-secondary)]">计划盈亏比 (Planned R)</span>
                          <span className="text-sm font-bold text-trade-green font-mono">{liveRR}R</span>
                        </div>
                      )}
                      {liveActualRR !== null && !isNaN(liveActualRR) && (
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-semibold text-[var(--text-secondary)]">实际盈亏比 (Actual R)</span>
                          <span className={`text-sm font-bold font-mono ${liveActualRR >= 0 ? "text-trade-green" : "text-trade-red"}`}>
                            {liveActualRR > 0 ? `+${liveActualRR}` : liveActualRR}R
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Exit details & status */}
            <div className="border-t border-[var(--color-border-subtle)] pt-4 mt-2">
              <h4 className="text-xs font-bold text-[var(--text-secondary)] mb-3">离场与执行评估</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">离场理由</label>
                  <select value={tradeForm.exitReason}
                    onChange={(e) => setTradeForm(prev => ({ ...prev, exitReason: e.target.value }))}
                    className="px-3 py-1.5 rounded-lg border border-[var(--color-border-standard)] bg-[var(--color-bg-canvas)] text-sm text-[var(--text-primary)] focus:border-trade-green outline-none">
                    {exits.map(ex => <option key={ex.id} value={ex.name}>{ex.name}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">交易过程评估</label>
                  <select value={tradeForm.process}
                    onChange={(e) => setTradeForm(prev => ({ ...prev, process: e.target.value }))}
                    className="px-3 py-1.5 rounded-lg border border-[var(--color-border-standard)] bg-[var(--color-bg-canvas)] text-sm text-[var(--text-primary)] focus:border-trade-green outline-none">
                    <option value="">-- 无 --</option>
                    {processes.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1 col-span-2">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">离场错误原因</label>
                  <select value={tradeForm.errorReason}
                    onChange={(e) => setTradeForm(prev => ({ ...prev, errorReason: e.target.value }))}
                    className="px-3 py-1.5 rounded-lg border border-[var(--color-border-standard)] bg-[var(--color-bg-canvas)] text-sm text-[var(--text-primary)] focus:border-trade-green outline-none">
                    <option value="">-- 无错误 --</option>
                    {errors.map(err => <option key={err.id} value={err.name}>{err.name}</option>)}
                  </select>
                </div>

                {/* Real-time calculated PnL & Status */}
                {(() => {
                  const livePnl = calculateLivePnl();
                  const liveStatus = livePnl > 0 ? "win" : livePnl < 0 ? "lose" : "BE";
                  return (
                    <>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-semibold text-[var(--text-secondary)]">实时计入盈亏</span>
                        <span className={`text-sm font-bold font-mono ${
                          livePnl > 0 ? "text-trade-green" : livePnl < 0 ? "text-trade-red" : "text-[var(--text-muted)]"
                        }`}>
                          {livePnl > 0 ? "+" : ""}{livePnl.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-semibold text-[var(--text-secondary)]">实时盈亏状态</span>
                        <div>
                          <span className={`inline-block px-2 py-0.5 rounded font-bold uppercase text-[10px] tabular-nums ${
                            liveStatus === "win" ? "bg-[var(--trade-green-dim)] text-trade-green" :
                            liveStatus === "lose" ? "bg-[var(--trade-red-dim)] text-trade-red" : "bg-[var(--color-bg-elevated)] text-[var(--text-muted)]"
                          }`}>
                            {liveStatus}
                          </span>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Remarks & Notes */}
            <div className="border-t border-[var(--color-border-subtle)] pt-4 mt-2 flex flex-col gap-3">
              <h4 className="text-xs font-bold text-[var(--text-secondary)]">下单思路与复盘</h4>
              
              {/* 备注信息 */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">下单思路 (入场理由)</label>
                  <div className="flex rounded-md bg-[var(--color-bg-elevated)] p-0.5 border border-[var(--color-border-subtle)]">
                    <button
                      type="button"
                      onClick={() => setRemarksTab("edit")}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-sm transition-all cursor-pointer ${
                        remarksTab === "edit"
                          ? "bg-[var(--color-bg-surface)] text-trade-green shadow-xs"
                          : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                      }`}
                    >
                      ✍️ 编辑
                    </button>
                    <button
                      type="button"
                      onClick={() => setRemarksTab("preview")}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-sm transition-all cursor-pointer ${
                        remarksTab === "preview"
                          ? "bg-[var(--color-bg-surface)] text-trade-green shadow-xs"
                          : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                      }`}
                    >
                      👁️ 预览
                    </button>
                  </div>
                </div>
                {remarksTab === "edit" ? (
                  <textarea
                    placeholder="输入下单思路（下单环境、入场理由、逻辑规划等，支持 Markdown，选填）..."
                    value={tradeForm.remarks}
                    rows={4}
                    onChange={(e) => setTradeForm(prev => ({ ...prev, remarks: e.target.value }))}
                    className="w-full px-3 py-1.5 rounded-lg border border-[var(--color-border-standard)] bg-[var(--color-bg-canvas)] text-sm font-mono text-[var(--text-primary)] focus:border-trade-green outline-none resize-y leading-relaxed"
                  />
                ) : (
                  <div
                    className="w-full px-3 py-2 rounded-lg border border-[var(--color-border-standard)] bg-[var(--color-bg-canvas)] min-h-[96px] text-xs text-[var(--text-primary)] overflow-y-auto leading-relaxed markdown-body"
                    dangerouslySetInnerHTML={{ __html: tradeForm.remarks ? (marked.parse(tradeForm.remarks) as string) : '<p class="text-[var(--text-muted)] italic">无思路预览内容</p>' }}
                  />
                )}
              </div>

              {/* 自我复盘总结 */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">自我复盘总结</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAiBeautify}
                      disabled={isBeautifying}
                      className="px-2 py-0.5 text-[10px] font-bold rounded border border-trade-green/30 bg-trade-green-dim/10 text-trade-green hover:bg-trade-green hover:text-white transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Sparkles size={10} />
                      {isBeautifying ? "美化中..." : "AI 美化"}
                    </button>
                    <div className="flex rounded-md bg-[var(--color-bg-elevated)] p-0.5 border border-[var(--color-border-subtle)]">
                      <button
                        type="button"
                        onClick={() => setNotesTab("edit")}
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-sm transition-all cursor-pointer ${
                          notesTab === "edit"
                            ? "bg-[var(--color-bg-surface)] text-trade-green shadow-xs"
                            : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                        }`}
                      >
                        ✍️ 编辑
                      </button>
                      <button
                        type="button"
                        onClick={() => setNotesTab("preview")}
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-sm transition-all cursor-pointer ${
                          notesTab === "preview"
                            ? "bg-[var(--color-bg-surface)] text-trade-green shadow-xs"
                            : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                        }`}
                      >
                        👁️ 预览
                      </button>
                    </div>
                  </div>
                </div>
                {notesTab === "edit" ? (
                  <textarea
                    placeholder="输入自我复盘总结（支持 Markdown 结构化输入，选填）..."
                    value={tradeForm.notes}
                    rows={6}
                    onChange={(e) => setTradeForm(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-3 py-1.5 rounded-lg border border-[var(--color-border-standard)] bg-[var(--color-bg-canvas)] text-sm font-mono text-[var(--text-primary)] focus:border-trade-green outline-none resize-y leading-relaxed"
                  />
                ) : (
                  <div
                    className="w-full px-3 py-2 rounded-lg border border-[var(--color-border-standard)] bg-[var(--color-bg-canvas)] min-h-[128px] text-xs text-[var(--text-primary)] overflow-y-auto leading-relaxed markdown-body"
                    dangerouslySetInnerHTML={{ __html: tradeForm.notes ? (marked.parse(tradeForm.notes) as string) : '<p class="text-[var(--text-muted)] italic">无复盘预览内容</p>' }}
                  />
                )}
              </div>
            </div>

            {/* Screenshots Block */}
            <div className="border-t border-[var(--color-border-subtle)] pt-4 mt-2">
              {inlineEditingId === "__new__"
                ? screenshotBlock({ ...trades[0]!, screenshots: [] } as Trade, true)
                : screenshotBlock(trades.find(t => t.id === inlineEditingId)!, true)}
            </div>
          </div>

          {/* Sticky Footer */}
          <div className="flex items-center justify-between px-5 py-4 border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
            {inlineEditingId !== "__new__" ? (
              <button 
                onClick={() => {
                  if (confirm("确定要删除这笔交易吗？")) {
                    handleDeleteTrade(inlineEditingId);
                    setInlineEditingId(null);
                  }
                }} 
                className="flex items-center gap-1 text-xs font-semibold text-trade-red hover:underline cursor-pointer"
              >
                <Trash size={14} />删除交易
              </button>
            ) : <div />}
            <div className="flex gap-2">
              <button 
                onClick={() => { clearPendingScreenshots(); setInlineEditingId(null); }}
                className="px-3 py-1.5 rounded-lg border border-[var(--color-border-standard)] text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer"
              >
                取消
              </button>
              <button 
                onClick={handleSaveTrade}
                className="px-4 py-1.5 rounded-lg bg-trade-green text-white text-xs font-bold hover:bg-green-600 transition-colors cursor-pointer"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Beautification Compare Modal */}
      {showBeautifyModal && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-5xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
              <div className="flex items-center gap-2 text-trade-green">
                <Sparkles size={18} className="animate-pulse" />
                <h3 className="font-bold text-sm text-[var(--color-text-primary)]">AI 复盘美化润色</h3>
              </div>
              <button onClick={() => setShowBeautifyModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] p-1 rounded-lg hover:bg-[var(--color-bg-hover)]">
                <X size={16} />
              </button>
            </div>

            {/* Body: Split Columns */}
            <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Column: Original */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-[var(--text-secondary)] flex items-center gap-1">
                  <span>📝 您的原始复盘</span>
                </span>
                <textarea
                  readOnly
                  value={beautifyOriginalText}
                  className="flex-1 min-h-[200px] md:min-h-full w-full p-3 rounded-lg border border-[var(--color-border-standard)] bg-[var(--color-bg-canvas)] text-xs text-[var(--text-secondary)] resize-none focus:outline-none leading-relaxed"
                />
              </div>

              {/* Right Column: AI Polished */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-trade-green flex items-center gap-1">
                  <Sparkles size={12} />
                  <span>✨ AI 结构化美化</span>
                </span>
                {(() => {
                  const thinkMode = localStorage.getItem("tf_ai_think_mode") || "think-high";
                  const { think, content } = parseThinkContent(beautifyResultText);
                  return (
                    <div
                      className="flex-1 min-h-[200px] md:min-h-full w-full p-3 rounded-lg border border-trade-green/30 bg-trade-green-dim/10 text-xs text-[var(--text-primary)] overflow-y-auto leading-relaxed markdown-body flex flex-col"
                    >
                      {thinkMode !== "non-think" && think && (
                        <details className="p-2 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] text-[10px] text-[var(--color-text-secondary)] mb-3 cursor-pointer outline-none" open>
                          <summary className="font-bold outline-none select-none flex items-center gap-1.5 text-trade-green text-xxs">
                            <Sparkles size={10} className="animate-pulse" />
                            <span>AI 思考路径</span>
                          </summary>
                          <div className="mt-1.5 leading-relaxed whitespace-pre-wrap font-mono border-t border-[var(--color-border-subtle)]/50 pt-1.5 opacity-80">
                            {think}
                          </div>
                        </details>
                      )}
                      <div dangerouslySetInnerHTML={{ __html: content ? (marked.parse(content) as string) : (beautifyResultText ? '' : '<p class="text-[var(--text-muted)] italic">AI 润色中...</p>') }} />
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
              <button
                onClick={() => setShowBeautifyModal(false)}
                className="px-4 py-2 border border-[var(--color-border-standard)] rounded-lg text-xs font-bold hover:bg-[var(--color-bg-hover)] text-[var(--text-secondary)] transition-colors cursor-pointer"
              >
                保留原始内容
              </button>
              <button
                onClick={() => {
                  const { content } = parseThinkContent(beautifyResultText);
                  setTradeForm(prev => ({ ...prev, notes: content }));
                  setShowBeautifyModal(false);
                }}
                disabled={!beautifyResultText}
                className="px-4 py-2 bg-trade-green hover:bg-green-600 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-40 disabled:hover:bg-trade-green cursor-pointer flex items-center gap-1.5"
              >
                <Check size={14} />使用美化结果
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
