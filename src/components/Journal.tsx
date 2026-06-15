"use client";

import React, { useState, useEffect } from "react";
import {
  Plus, Trash, Edit, Check, X,
  Upload, Camera, Image as ImageIcon, RefreshCw
} from "lucide-react";
import ScreenshotImage from "./ScreenshotImage";
import type { Trade, OptionItem } from "./types";

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
  setLightboxImage: React.Dispatch<React.SetStateAction<string | null>>;
  expandedScreenshotId: string | null;
  setExpandedScreenshotId: React.Dispatch<React.SetStateAction<string | null>>;
  calculateLivePnl: () => number;
  calculateLiveRR: () => number | null;
  handleSaveTrade: () => Promise<void>;
  handleDeleteTrade: (id: string) => Promise<void>;
  handleUploadScreenshots: (tradeId: string, files: FileList | null) => Promise<void>;
  handleDeleteScreenshot: (tradeId: string, screenshotId: string) => Promise<void>;
  handlePendingFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removePendingScreenshot: (index: number) => void;
  clearPendingScreenshots: () => void;
}

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
  calculateLivePnl, calculateLiveRR,
  handleSaveTrade, handleDeleteTrade, handleUploadScreenshots, handleDeleteScreenshot,
  handlePendingFileSelect, removePendingScreenshot, clearPendingScreenshots
}: JournalProps) {
  // 分页状态与计算
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 30;

  useEffect(() => {
    setCurrentPage(1);
  }, [
    filteredTrades.length, searchQuery, directionFilter, statusFilter,
    setupFilter, typeFilter, symbolFilter, processFilter, dateFilter
  ]);

  const totalPages = Math.ceil(filteredTrades.length / pageSize) || 1;
  const activePage = Math.min(currentPage, totalPages);
  const startIndex = (activePage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedTrades = filteredTrades.slice(startIndex, endIndex);

  const renderInlineEditCells = () => {
    const livePnl = calculateLivePnl();
    const liveStatus = livePnl > 0 ? "win" : livePnl < 0 ? "lose" : "BE";

    return (
      <>
        <td className="p-2">
          <input type="date" required value={tradeForm.date.substring(0, 10)}
            onChange={(e) => {
              const oldTime = tradeForm.date.includes("T") ? tradeForm.date.split("T")[1] : "12:00:00";
              setTradeForm(prev => ({ ...prev, date: `${e.target.value}T${oldTime}` }));
            }}
            className="inline-cell-input bg-transparent text-[var(--text-primary)]" />
        </td>
        <td className="p-2">
          <select value={tradeForm.symbol}
            onChange={(e) => setTradeForm(prev => ({ ...prev, symbol: e.target.value }))}
            className="inline-cell-input bg-transparent text-[var(--text-primary)]">
            {symbols.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
        </td>
        <td className="p-2">
          <select value={tradeForm.direction}
            onChange={(e) => setTradeForm(prev => ({ ...prev, direction: e.target.value }))}
            className="inline-cell-input bg-transparent text-[var(--text-primary)]">
            <option value="Long">Long</option>
            <option value="Short">Short</option>
          </select>
        </td>
        <td className="p-2">
          <select value={tradeForm.marketEnv}
            onChange={(e) => setTradeForm(prev => ({ ...prev, marketEnv: e.target.value }))}
            className="inline-cell-input bg-transparent text-[var(--text-primary)]">
            <option value="">-- 无 --</option>
            <option value="突破">突破</option>
            <option value="窄通道">窄通道</option>
            <option value="宽通道">宽通道</option>
            <option value="震荡区间">震荡区间</option>
          </select>
        </td>
        <td className="p-2">
          <select value={tradeForm.setup}
            onChange={(e) => setTradeForm(prev => ({ ...prev, setup: e.target.value }))}
            className="inline-cell-input bg-transparent text-[var(--text-primary)]">
            {setups.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
        </td>
        <td className="p-2">
          <select value={tradeForm.type}
            onChange={(e) => setTradeForm(prev => ({ ...prev, type: e.target.value }))}
            className="inline-cell-input bg-transparent text-[var(--text-primary)]">
            <option value="趋势延续">趋势延续</option>
            <option value="反转（Reversal）">反转</option>
            <option value="突破（BO）">突破</option>
            <option value="假突破（fBO）">假突破</option>
          </select>
        </td>
        <td className="p-2">
          <input type="number" step="any" required value={tradeForm.positionSize}
            onChange={(e) => setTradeForm(prev => ({ ...prev, positionSize: parseFloat(e.target.value) || 0 }))}
            className="inline-cell-input bg-transparent text-[var(--text-primary)] font-mono w-full min-w-[80px]" />
        </td>
        <td className="p-2">
          {(() => {
            const liveRR = calculateLiveRR();
            return (
              <div className="flex flex-col gap-0.5 min-w-[110px]">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-[var(--text-muted)] w-8 shrink-0">入场:</span>
                  <input type="number" step="any" required value={tradeForm.entryPrice}
                    onChange={(e) => setTradeForm(prev => ({ ...prev, entryPrice: parseFloat(e.target.value) || 0 }))}
                    className="inline-cell-input bg-transparent text-[var(--text-primary)] font-mono" />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-[var(--text-muted)] w-8 shrink-0">SL:</span>
                  <input type="number" step="any" value={tradeForm.stopLoss}
                    onChange={(e) => setTradeForm(prev => ({ ...prev, stopLoss: e.target.value }))}
                    placeholder="止损"
                    className="inline-cell-input bg-transparent text-[var(--text-primary)] font-mono" />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-[var(--text-muted)] w-8 shrink-0">TP:</span>
                  <input type="number" step="any" value={tradeForm.takeProfit}
                    onChange={(e) => setTradeForm(prev => ({ ...prev, takeProfit: e.target.value }))}
                    placeholder="止盈"
                    className="inline-cell-input bg-transparent text-[var(--text-primary)] font-mono" />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-[var(--text-muted)] w-8 shrink-0">离场1:</span>
                  <input type="number" step="any" required value={tradeForm.exitPrice1}
                    onChange={(e) => setTradeForm(prev => ({ ...prev, exitPrice1: parseFloat(e.target.value) || 0 }))}
                    className="inline-cell-input bg-transparent text-[var(--text-primary)] font-mono" />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-[var(--text-muted)] w-8 shrink-0">离场2:</span>
                  <input type="number" step="any" value={tradeForm.exitPrice2}
                    onChange={(e) => setTradeForm(prev => ({ ...prev, exitPrice2: e.target.value }))}
                    placeholder="选填"
                    className="inline-cell-input bg-transparent text-[var(--text-primary)] font-mono" />
                </div>
                {liveRR && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-trade-green w-8 shrink-0 font-bold">RR:</span>
                    <span className="text-xs font-mono font-bold text-trade-green tabular-nums">{liveRR}</span>
                  </div>
                )}
              </div>
            );
          })()}
        </td>
        <td className={`p-2 font-mono font-bold text-right whitespace-nowrap tabular-nums ${
          livePnl > 0 ? "text-trade-green" : livePnl < 0 ? "text-trade-red" : "text-[var(--text-muted)]"
        }`}>
          {livePnl > 0 ? "+" : ""}{livePnl.toFixed(2)}
        </td>
        <td className="p-2">
          <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] tabular-nums ${
            liveStatus === "win" ? "bg-[var(--trade-green-dim)] text-trade-green" :
            liveStatus === "lose" ? "bg-[var(--trade-red-dim)] text-trade-red" : "bg-[var(--color-bg-elevated)] text-[var(--text-muted)]"
          }`}>
            {liveStatus}
          </span>
        </td>
        <td className="p-2">
          <select value={tradeForm.exitReason}
            onChange={(e) => setTradeForm(prev => ({ ...prev, exitReason: e.target.value }))}
            className="inline-cell-input bg-transparent text-[var(--text-primary)]">
            {exits.map(ex => <option key={ex.id} value={ex.name}>{ex.name}</option>)}
          </select>
        </td>
        <td className="p-2">
          <select value={tradeForm.process}
            onChange={(e) => setTradeForm(prev => ({ ...prev, process: e.target.value }))}
            className="inline-cell-input bg-transparent text-[var(--text-primary)]">
            <option value="">-- 无 --</option>
            {processes.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
          </select>
        </td>
        <td className="p-2">
          <select value={tradeForm.errorReason}
            onChange={(e) => setTradeForm(prev => ({ ...prev, errorReason: e.target.value }))}
            className="inline-cell-input bg-transparent text-[var(--text-primary)]">
            <option value="">-- 无错误 --</option>
            {errors.map(err => <option key={err.id} value={err.name}>{err.name}</option>)}
          </select>
        </td>
        <td className="p-2">
          <div className="flex flex-col gap-1.5 min-w-[160px]">
            <textarea placeholder="备注..." value={tradeForm.remarks} rows={2}
              onChange={(e) => setTradeForm(prev => ({ ...prev, remarks: e.target.value }))}
              className="inline-cell-input bg-transparent text-[var(--text-primary)] text-sm resize-y" />
            <textarea placeholder="复盘..." value={tradeForm.notes} rows={3}
              onChange={(e) => setTradeForm(prev => ({ ...prev, notes: e.target.value }))}
              className="inline-cell-input bg-transparent text-[var(--text-primary)] text-sm resize-y" />
          </div>
        </td>
        <td className="p-2 text-center">
          <div className="flex items-center justify-center gap-1.5">
            <button onClick={handleSaveTrade} title="保存"
              className="p-1.5 rounded bg-trade-green text-white hover:bg-green-600 transition-colors"><Check size={13} /></button>
            <button onClick={() => { clearPendingScreenshots(); setInlineEditingId(null); }} title="取消"
              className="p-1.5 rounded bg-[var(--color-bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--color-bg-hover)] transition-colors"><X size={13} /></button>
          </div>
        </td>
      </>
    );
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
              <ScreenshotImage screenshotId={pic.id} alt={pic.filename}
                onClick={() => setLightboxImage(pic.id)}
                className="screenshot-thumb w-full cursor-pointer" />
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
    <div className="flex flex-col gap-4 animate-fade-in">
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
          <input type="text" placeholder="搜索备注/笔记/理由..." value={searchQuery}
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

      {/* Table */}
      <div className="rounded-lg border border-[var(--color-border-subtle)] overflow-hidden bg-[var(--color-bg-surface)] transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border-subtle)]">
                <th className="px-3 py-2 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">日期</th>
                <th className="px-3 py-2 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">品类</th>
                <th className="px-3 py-2 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">方向</th>
                <th className="px-3 py-2 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">环境</th>
                <th className="px-3 py-2 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">入场理由</th>
                <th className="px-3 py-2 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">类型</th>
                <th className="px-3 py-2 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">仓位</th>
                <th className="px-3 py-2 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">价格</th>
                <th className="px-3 py-2 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider text-right">盈亏</th>
                <th className="px-3 py-2 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">状态</th>
                <th className="px-3 py-2 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">离场</th>
                <th className="px-3 py-2 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">过程</th>
                <th className="px-3 py-2 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">错误</th>
                <th className="px-3 py-2 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">备注</th>
                <th className="px-3 py-2 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {(inlineEditingId === "__new__" || inlineEditingId ? [inlineEditingId] : []).length > 0 && (
                inlineEditingId === "__new__" || filteredTrades.some(t => t.id === inlineEditingId) ? (
                  (() => {
                    const editingTrade = inlineEditingId === "__new__" ? null : filteredTrades.find(t => t.id === inlineEditingId);
                    if (editingTrade && !editingTrade) return null;
                    return (
                      <React.Fragment>
                        <tr className="bg-[var(--trade-green-dim)]">
                          {renderInlineEditCells()}
                        </tr>
                        <tr className="bg-[var(--color-bg-canvas)]/50 border-b border-[var(--color-border-subtle)]">
                          <td colSpan={15} className="p-3">
                            {inlineEditingId === "__new__"
                              ? screenshotBlock({ ...trades[0]!, screenshots: [] } as Trade, true)
                              : screenshotBlock(editingTrade!, true)}
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })()
                ) : null
              )}
              {paginatedTrades.map(trade => {
                if (inlineEditingId === trade.id) return null;

                return (
                  <React.Fragment key={trade.id}>
                    <tr className="hover:bg-[var(--color-bg-hover)] transition-colors">
                      <td className="px-3 py-2 font-mono text-xs whitespace-nowrap tabular-nums text-[var(--text-secondary)]">
                        {new Date(trade.date).toISOString().split("T")[0]}
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
                      <td className="px-3 py-2 font-mono text-xs tabular-nums text-[var(--text-secondary)]">{trade.positionSize}</td>
                      <td className="px-3 py-2 font-mono text-xs text-[var(--text-muted)] whitespace-nowrap">
                        <div>入: {trade.entryPrice}</div>
                        {trade.stopLoss && <div>SL: {trade.stopLoss}</div>}
                        {trade.takeProfit && <div>TP: {trade.takeProfit}</div>}
                        <div>出1: {trade.exitPrice1}</div>
                        {trade.exitPrice2 && <div>出2: {trade.exitPrice2}</div>}
                        {trade.rr && <div className="text-trade-green font-bold">RR: {trade.rr}</div>}
                      </td>
                      <td className={`px-3 py-2 font-mono font-bold text-right whitespace-nowrap tabular-nums ${
                        trade.pnl > 0 ? "text-trade-green" : trade.pnl < 0 ? "text-trade-red" : "text-[var(--text-muted)]"
                      }`}>
                        {trade.pnl > 0 ? "+" : ""}{trade.pnl.toFixed(2)}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                          trade.status === "win" ? "bg-[var(--trade-green-dim)] text-trade-green" :
                          trade.status === "lose" ? "bg-[var(--trade-red-dim)] text-trade-red" : "bg-[var(--color-bg-elevated)] text-[var(--text-muted)]"
                        }`}>{trade.status}</span>
                      </td>
                      <td className="px-3 py-2 text-[var(--text-muted)] whitespace-nowrap text-xs">{trade.exitReason}</td>
                      <td className="px-3 py-2 text-[var(--text-muted)] whitespace-nowrap text-xs">{trade.process || "-"}</td>
                      <td className="px-3 py-2 text-trade-red whitespace-nowrap text-xs font-medium">{trade.errorReason || "-"}</td>
                      <td className="px-3 py-2 max-w-xs whitespace-normal break-all" title={trade.remarks || ""}>
                        <div className="font-semibold text-[var(--text-secondary)] truncate text-xs">{trade.remarks || "-"}</div>
                        {trade.notes && <div className="text-[10px] text-[var(--text-muted)] whitespace-normal break-all mt-0.5">{trade.notes}</div>}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-center gap-1">
                           <button onClick={() => setExpandedScreenshotId(prev => prev === trade.id ? null : trade.id)} title="截图"
                            className={`p-1.5 rounded transition-colors ${
                              expandedScreenshotId === trade.id ? "bg-trade-green text-white" :
                              (trade.screenshots && trade.screenshots.length > 0) ? "text-trade-green hover:bg-[var(--trade-green-dim)]" : "text-[var(--text-muted)] hover:bg-[var(--color-bg-hover)]"
                            }`}>
                            <Camera size={13} />
                          </button>
                          <button onClick={() => {
                            setInlineEditingId(trade.id);
                            setTradeForm({
                              date: new Date(trade.date).toISOString().split("T")[0],
                              remarks: trade.remarks || "", setup: trade.setup, type: trade.type, exitReason: trade.exitReason,
                              notes: trade.notes || "", positionSize: trade.positionSize, direction: trade.direction,
                              entryPrice: trade.entryPrice, stopLoss: trade.stopLoss !== null ? String(trade.stopLoss) : "",
                              takeProfit: trade.takeProfit !== null ? String(trade.takeProfit) : "",
                              exitPrice1: trade.exitPrice1, exitPrice2: trade.exitPrice2 !== null ? String(trade.exitPrice2) : "",
                              errorReason: trade.errorReason || "", symbol: trade.symbol,
                              process: trade.process || "",
                              marketEnv: trade.marketEnv || ""
                            });
                          }} title="编辑"
                            className="p-1.5 rounded hover:bg-[var(--color-bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                            <Edit size={13} />
                          </button>
                          <button onClick={() => handleDeleteTrade(trade.id)} title="删除"
                            className="p-1.5 rounded hover:bg-[var(--trade-red-dim)] text-[var(--text-muted)] hover:text-trade-red">
                            <Trash size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedScreenshotId === trade.id && (
                      <tr className="bg-[var(--color-bg-canvas)]/50 border-b border-[var(--color-border-subtle)]">
                        <td colSpan={15} className="p-4">
                          {screenshotBlock(trade, false)}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {filteredTrades.length === 0 && (
                <tr><td colSpan={15} className="p-8 text-center text-[var(--text-muted)]">暂无交易记录。</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-[var(--color-bg-surface)] border-t border-[var(--color-border-subtle)] flex-wrap gap-2">
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
    </div>
  );
}
