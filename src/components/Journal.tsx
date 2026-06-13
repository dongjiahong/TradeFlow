"use client";

import React, { useState } from "react";
import {
  TrendingUp, BookOpen, Plus, Trash, Edit, Check, X,
  Upload, Filter, RefreshCw, Camera, Image as ImageIcon
} from "lucide-react";
import type { Trade, OptionItem } from "./types";

interface JournalProps {
  trades: Trade[];
  filteredTrades: Trade[];
  setups: OptionItem[];
  errors: OptionItem[];
  exits: OptionItem[];
  symbols: OptionItem[];
  darkMode: boolean;
  inlineEditingId: string | null;
  setInlineEditingId: React.Dispatch<React.SetStateAction<string | null>>;
  tradeForm: {
    date: string; remarks: string; setup: string; type: string; exitReason: string;
    notes: string; positionSize: number; direction: string; entryPrice: number;
    stopLoss: string; takeProfit: string; exitPrice1: number; exitPrice2: string;
    errorReason: string; symbol: string;
  };
  setTradeForm: React.Dispatch<React.SetStateAction<{
    date: string; remarks: string; setup: string; type: string; exitReason: string;
    notes: string; positionSize: number; direction: string; entryPrice: number;
    stopLoss: string; takeProfit: string; exitPrice1: number; exitPrice2: string;
    errorReason: string; symbol: string;
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
  trades, filteredTrades, setups, errors, exits, symbols, darkMode,
  inlineEditingId, setInlineEditingId, tradeForm, setTradeForm,
  searchQuery, setSearchQuery, directionFilter, setDirectionFilter,
  statusFilter, setStatusFilter, setupFilter, setSetupFilter,
  typeFilter, setTypeFilter, symbolFilter, setSymbolFilter,
  pendingScreenshots, isUploadingScreenshot,
  lightboxImage, setLightboxImage, expandedScreenshotId, setExpandedScreenshotId,
  calculateLivePnl, calculateLiveRR,
  handleSaveTrade, handleDeleteTrade, handleUploadScreenshots, handleDeleteScreenshot,
  handlePendingFileSelect, removePendingScreenshot, clearPendingScreenshots
}: JournalProps) {
  const renderInlineEditCells = () => {
    const livePnl = calculateLivePnl();
    const liveStatus = livePnl > 0 ? "win" : livePnl < 0 ? "lose" : "BE";

    return (
      <>
        <td className="p-2.5">
          <input type="date" required value={tradeForm.date}
            onChange={(e) => setTradeForm(prev => ({ ...prev, date: e.target.value }))}
            className="inline-cell-input dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 bg-white border-zinc-300 text-zinc-900 font-mono py-1" />
        </td>
        <td className="p-2.5">
          <select value={tradeForm.symbol}
            onChange={(e) => setTradeForm(prev => ({ ...prev, symbol: e.target.value }))}
            className="inline-cell-input dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 bg-white border-zinc-300 text-zinc-900 py-1">
            {symbols.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
        </td>
        <td className="p-2.5">
          <select value={tradeForm.direction}
            onChange={(e) => setTradeForm(prev => ({ ...prev, direction: e.target.value }))}
            className="inline-cell-input dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 bg-white border-zinc-300 text-zinc-900 py-1">
            <option value="Long">Long</option>
            <option value="Short">Short</option>
          </select>
        </td>
        <td className="p-2.5">
          <select value={tradeForm.setup}
            onChange={(e) => setTradeForm(prev => ({ ...prev, setup: e.target.value }))}
            className="inline-cell-input dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 bg-white border-zinc-300 text-zinc-900 py-1">
            {setups.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
        </td>
        <td className="p-2.5">
          <select value={tradeForm.type}
            onChange={(e) => setTradeForm(prev => ({ ...prev, type: e.target.value }))}
            className="inline-cell-input dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 bg-white border-zinc-300 text-zinc-900 py-1">
            <option value="趋势延续">趋势延续</option>
            <option value="反转（Reversal）">反转</option>
            <option value="突破（BO）">突破</option>
            <option value="假突破（fBO）">假突破</option>
          </select>
        </td>
        <td className="p-2.5">
          <input type="number" step="any" required value={tradeForm.positionSize}
            onChange={(e) => setTradeForm(prev => ({ ...prev, positionSize: parseFloat(e.target.value) || 0 }))}
            className="inline-cell-input dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 bg-white border-zinc-300 text-zinc-900 font-mono py-1.5 w-full min-w-[100px]" />
        </td>
        <td className="p-2.5">
          {(() => {
            const liveRR = calculateLiveRR();
            return (
              <div className="flex flex-col gap-1 min-w-[120px]">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-zinc-400 w-10 shrink-0">入场:</span>
                  <input type="number" step="any" required value={tradeForm.entryPrice}
                    onChange={(e) => setTradeForm(prev => ({ ...prev, entryPrice: parseFloat(e.target.value) || 0 }))}
                    className="inline-cell-input dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 bg-white border-zinc-300 text-zinc-900 font-mono py-0.5" />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-zinc-400 w-10 shrink-0">SL:</span>
                  <input type="number" step="any" value={tradeForm.stopLoss}
                    onChange={(e) => setTradeForm(prev => ({ ...prev, stopLoss: e.target.value }))}
                    placeholder="止损"
                    className="inline-cell-input dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 bg-white border-zinc-300 text-zinc-900 font-mono py-0.5" />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-zinc-400 w-10 shrink-0">TP:</span>
                  <input type="number" step="any" value={tradeForm.takeProfit}
                    onChange={(e) => setTradeForm(prev => ({ ...prev, takeProfit: e.target.value }))}
                    placeholder="止盈"
                    className="inline-cell-input dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 bg-white border-zinc-300 text-zinc-900 font-mono py-0.5" />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-zinc-400 w-10 shrink-0">离场1:</span>
                  <input type="number" step="any" required value={tradeForm.exitPrice1}
                    onChange={(e) => setTradeForm(prev => ({ ...prev, exitPrice1: parseFloat(e.target.value) || 0 }))}
                    className="inline-cell-input dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 bg-white border-zinc-300 text-zinc-900 font-mono py-0.5" />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-zinc-400 w-10 shrink-0">离场2:</span>
                  <input type="number" step="any" value={tradeForm.exitPrice2}
                    onChange={(e) => setTradeForm(prev => ({ ...prev, exitPrice2: e.target.value }))}
                    placeholder="选填"
                    className="inline-cell-input dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 bg-white border-zinc-300 text-zinc-900 font-mono py-0.5" />
                </div>
                {liveRR && (
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 w-10 shrink-0 font-bold">RR:</span>
                    <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">{liveRR}</span>
                  </div>
                )}
              </div>
            );
          })()}
        </td>
        <td className={`p-2.5 font-mono font-bold text-right whitespace-nowrap ${
          livePnl > 0 ? "text-emerald-600 dark:text-emerald-400" : livePnl < 0 ? "text-rose-600 dark:text-rose-400" : "text-zinc-500"
        }`}>
          {livePnl > 0 ? "+" : ""}{livePnl.toFixed(2)}
        </td>
        <td className="p-2.5">
          <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-xxs ${
            liveStatus === "win" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
            liveStatus === "lose" ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" : "bg-zinc-500/10 text-zinc-400"
          }`}>
            {liveStatus}
          </span>
        </td>
        <td className="p-2.5">
          <select value={tradeForm.exitReason}
            onChange={(e) => setTradeForm(prev => ({ ...prev, exitReason: e.target.value }))}
            className="inline-cell-input dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 bg-white border-zinc-300 text-zinc-900 py-1">
            {exits.map(ex => <option key={ex.id} value={ex.name}>{ex.name}</option>)}
          </select>
        </td>
        <td className="p-2.5">
          <select value={tradeForm.errorReason}
            onChange={(e) => setTradeForm(prev => ({ ...prev, errorReason: e.target.value }))}
            className="inline-cell-input dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 bg-white border-zinc-300 text-zinc-900 py-1">
            <option value="">-- 无错误 --</option>
            {errors.map(err => <option key={err.id} value={err.name}>{err.name}</option>)}
          </select>
        </td>
        <td className="p-2.5">
          <div className="flex flex-col gap-1.5 min-w-[180px]">
            <textarea placeholder="今日备注..." value={tradeForm.remarks} rows={2}
              onChange={(e) => setTradeForm(prev => ({ ...prev, remarks: e.target.value }))}
              className="inline-cell-input dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 bg-white border-zinc-300 text-zinc-900 py-1 text-xs resize-y leading-relaxed" />
            <textarea placeholder="复盘分析..." value={tradeForm.notes} rows={4}
              onChange={(e) => setTradeForm(prev => ({ ...prev, notes: e.target.value }))}
              className="inline-cell-input dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 bg-white border-zinc-300 text-zinc-900 py-1 text-xs resize-y leading-relaxed" />
          </div>
        </td>
        <td className="p-2.5 text-center">
          <div className="flex items-center justify-center gap-1.5">
            <button onClick={handleSaveTrade} title="保存"
              className="p-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"><Check size={13} /></button>
            <button onClick={() => { clearPendingScreenshots(); setInlineEditingId(null); }} title="取消"
              className="p-1.5 rounded bg-zinc-500 text-white hover:bg-zinc-650 transition-colors shadow-sm"><X size={13} /></button>
          </div>
        </td>
      </>
    );
  };

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* Header and Control row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">交易日志仓</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">在此记录和编辑你的每一笔交易数据</p>
        </div>
        <button
          onClick={() => {
            setInlineEditingId("__new__");
            setTradeForm({
              date: new Date().toISOString().split("T")[0],
              remarks: "",
              setup: setups[0]?.name || "",
              type: "趋势延续",
              exitReason: exits[0]?.name || "",
              notes: "",
              positionSize: 1,
              direction: "Long",
              entryPrice: 0,
              stopLoss: "",
              takeProfit: "",
              exitPrice1: 0,
              exitPrice2: "",
              errorReason: "",
              symbol: symbols[0]?.name || ""
            });
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition-colors">
          <Plus size={16} />新建交易记录
        </button>
      </div>

      {/* Advanced Filter panel */}
      <div className="p-3 rounded-xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800/50 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-800 w-full sm:w-64">
          <Filter size={14} className="text-zinc-400" />
          <input type="text" placeholder="搜索备注/笔记/理由..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-none outline-none text-xs focus:ring-0" />
        </div>
        <select value={symbolFilter} onChange={(e) => setSymbolFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-800 text-xs focus:outline-none">
          <option value="all">所有品类</option>
          {symbols.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
        </select>
        <select value={directionFilter} onChange={(e) => setDirectionFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-800 text-xs focus:outline-none">
          <option value="all">所有方向</option>
          <option value="Long">Long (做多)</option>
          <option value="Short">Short (做空)</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-800 text-xs focus:outline-none">
          <option value="all">所有盈亏状态</option>
          <option value="win">Win (盈利)</option>
          <option value="lose">Lose (亏损)</option>
          <option value="BE">BE (保本)</option>
        </select>
        <select value={setupFilter} onChange={(e) => setSetupFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-800 text-xs max-w-xs focus:outline-none">
          <option value="all">所有入场理由</option>
          {setups.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-800 text-xs focus:outline-none">
          <option value="all">所有交易类型</option>
          <option value="趋势延续">趋势延续</option>
          <option value="反转（Reversal）">反转</option>
          <option value="突破（BO）">突破</option>
          <option value="假突破（fBO）">假突破</option>
        </select>
        {(searchQuery || directionFilter !== "all" || statusFilter !== "all" || setupFilter !== "all" || typeFilter !== "all" || symbolFilter !== "all") && (
          <button onClick={() => { setSearchQuery(""); setDirectionFilter("all"); setStatusFilter("all"); setSetupFilter("all"); setTypeFilter("all"); setSymbolFilter("all"); }}
            className="text-xs text-rose-600 dark:text-rose-400 hover:underline ml-auto">重置筛选</button>
        )}
      </div>

      {/* Data Table */}
      <div className="border border-zinc-200 dark:border-zinc-800/50 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 shadow-sm transition-colors duration-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-800/50 font-bold text-zinc-500 dark:text-zinc-400">
                <th className="px-3 py-2">日期</th><th className="px-3 py-2">品类</th><th className="px-3 py-2">方向</th>
                <th className="px-3 py-2">入场原因</th><th className="px-3 py-2">交易类型</th><th className="px-3 py-2">仓位</th>
                <th className="px-3 py-2">入场/离场价格</th><th className="p-4 text-right">盈亏点数/金额</th>
                <th className="px-3 py-2">盈亏状态</th><th className="px-3 py-2">离场理由</th>
                <th className="px-3 py-2">错误原因</th><th className="px-3 py-2">备注/说明</th><th className="p-4 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/50">
              {inlineEditingId === "__new__" && (
                <React.Fragment>
                  <tr className="bg-emerald-500/5 border-l-2 border-emerald-500">
                    {renderInlineEditCells()}
                  </tr>
                  <tr className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800/50">
                    <td colSpan={13} className="p-3">
                      <div className="flex flex-col gap-3">
                        <h4 className="text-xs font-bold flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                          <Camera size={14} className="text-emerald-600 dark:text-emerald-400" />
                          <span>交易截图（保存后自动上传，支持 Cmd+V 粘贴）</span>
                        </h4>
                        {pendingScreenshots.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {pendingScreenshots.map((item, idx) => (
                              <div key={idx} className="relative group rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800/50 w-[100px]">
                                <img src={item.preview} alt={item.file.name} className="w-full h-[60px] object-cover" />
                                <button onClick={() => removePendingScreenshot(idx)}
                                  className="absolute top-1 right-1 p-1 rounded-full bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                  <X size={10} />
                                </button>
                                <div className="absolute bottom-0 inset-x-0 bg-black/60 text-[8px] text-white py-0.5 px-1 truncate">{item.file.name}</div>
                              </div>
                            ))}
                          </div>
                        )}
                        <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xxs font-semibold text-zinc-600 dark:text-zinc-400 cursor-pointer transition-colors w-fit">
                          <Upload size={12} /><span>选择截图</span>
                          <input type="file" accept="image/*" multiple onChange={handlePendingFileSelect} className="hidden" />
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
                        <tr className="bg-emerald-500/5 border-l-2 border-emerald-500">
                          {renderInlineEditCells()}
                        </tr>
                        <tr className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800/50">
                          <td colSpan={13} className="p-3">
                            <div className="flex flex-col gap-3">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                                  <Camera size={14} className="text-emerald-600 dark:text-emerald-400" />
                                  <span>交易截图 ({trade.screenshots?.length || 0} 张)</span>
                                </h4>
                              </div>
                              {trade.screenshots && trade.screenshots.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {trade.screenshots.map(pic => (
                                    <div key={pic.id} className="relative group rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800/50 w-[100px]">
                                      <img src={`/api/screenshots/${pic.id}`} alt={pic.filename}
                                        onClick={() => setLightboxImage(`/api/screenshots/${pic.id}`)}
                                        className="screenshot-thumb w-full cursor-pointer" />
                                      <button onClick={() => handleDeleteScreenshot(trade.id, pic.id)}
                                        className="absolute top-1 right-1 p-1 rounded-full bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity" title="删除截图">
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
                                      <img src={item.preview} alt={item.file.name} className="w-full h-[60px] object-cover" />
                                      <button onClick={() => removePendingScreenshot(idx)}
                                        className="absolute top-1 right-1 p-1 rounded-full bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                        <X size={10} />
                                      </button>
                                      <div className="absolute bottom-0 inset-x-0 bg-black/60 text-[8px] text-white py-0.5 px-1 truncate">待上传</div>
                                    </div>
                                  ))}
                                </div>
                              )}
                              <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xxs font-semibold text-zinc-600 dark:text-zinc-400 cursor-pointer transition-colors w-fit">
                                <Upload size={12} /><span>选择截图（保存时上传，支持 Cmd+V 粘贴）</span>
                                <input type="file" accept="image/*" multiple onChange={handlePendingFileSelect} className="hidden" />
                              </label>
                              {isUploadingScreenshot && (
                                <span className="text-[10px] text-zinc-400 flex items-center gap-1.5">
                                  <RefreshCw size={10} className="animate-spin text-emerald-600 dark:text-emerald-400" />正在上传...
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
                      <tr className="odd:bg-zinc-50/50 dark:odd:bg-zinc-900/30 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors">
                        <td className="px-3 py-2 font-mono font-medium whitespace-nowrap">
                          {new Date(trade.date).toISOString().split("T")[0]}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xxs">
                            {trade.symbol || "未知"}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-xxs ${
                            trade.direction === "Long" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                          }`}>{trade.direction}</span>
                        </td>
                        <td className="px-3 py-2 font-semibold text-zinc-700 dark:text-zinc-300 whitespace-nowrap">{trade.setup}</td>
                        <td className="px-3 py-2 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{trade.type}</td>
                        <td className="px-3 py-2 font-mono">{trade.positionSize}</td>
                        <td className="px-3 py-2 font-mono text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                          <div>入: {trade.entryPrice}</div>
                          {trade.stopLoss && <div>SL: {trade.stopLoss}</div>}
                          {trade.takeProfit && <div>TP: {trade.takeProfit}</div>}
                          <div>出1: {trade.exitPrice1}</div>
                          {trade.exitPrice2 && <div>出2: {trade.exitPrice2}</div>}
                          {trade.rr && <div className="text-emerald-600 dark:text-emerald-400 font-bold">RR: {trade.rr}</div>}
                        </td>
                        <td className={`px-3 py-2 font-mono font-bold text-right whitespace-nowrap ${
                          trade.pnl > 0 ? "text-emerald-600 dark:text-emerald-400" : trade.pnl < 0 ? "text-rose-600 dark:text-rose-400" : "text-zinc-500"
                        }`}>
                          {trade.pnl > 0 ? "+" : ""}{trade.pnl.toFixed(2)}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-xxs ${
                            trade.status === "win" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                            trade.status === "lose" ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" : "bg-zinc-500/10 text-zinc-400"
                          }`}>{trade.status}</span>
                        </td>
                        <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">{trade.exitReason}</td>
                        <td className="px-3 py-2 text-rose-600 dark:text-rose-400 whitespace-nowrap font-medium">{trade.errorReason || "-"}</td>
                        <td className="px-3 py-2 max-w-xs truncate" title={trade.remarks || ""}>
                          <div className="font-semibold text-zinc-700 dark:text-zinc-300 truncate">{trade.remarks || "-"}</div>
                          <div className="text-xxs text-zinc-400 truncate">{trade.notes}</div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-center gap-1.5">
                            <button onClick={() => setExpandedScreenshotId(prev => prev === trade.id ? null : trade.id)} title="查看/上传截图"
                              className={`p-1.5 rounded transition-colors ${
                                expandedScreenshotId === trade.id ? "bg-emerald-600 text-white" :
                                (trade.screenshots && trade.screenshots.length > 0) ? "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                              }`}>
                              <Camera size={14} />
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
                                errorReason: trade.errorReason || "", symbol: trade.symbol
                              });
                            }} title="编辑交易"
                              className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">
                              <Edit size={14} />
                            </button>
                            <button onClick={() => handleDeleteTrade(trade.id)} title="删除交易"
                              className="p-1.5 rounded hover:bg-rose-500/10 text-zinc-500 hover:text-rose-600"><Trash size={14} /></button>
                          </div>
                        </td>
                      </tr>
                      {expandedScreenshotId === trade.id && (
                        <tr className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800/50">
                          <td colSpan={12} className="p-4">
                            <div className="flex flex-col gap-4">
                              <div className="flex items-center justify-between border-b pb-2 dark:border-zinc-800/50">
                                <h4 className="text-xs font-bold flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                                  <Camera size={14} className="text-emerald-600 dark:text-emerald-400" />
                                  <span>交易截图管理 ({trade.remarks || trade.setup})</span>
                                </h4>
                                <button onClick={() => setExpandedScreenshotId(null)}
                                  className="text-xxs text-zinc-400 dark:text-zinc-400 hover:text-zinc-600">收起</button>
                              </div>
                              <div className="flex flex-col gap-4">
                                {trade.screenshots && trade.screenshots.length > 0 ? (
                                  <div className="flex flex-wrap gap-2">
                                    {trade.screenshots.map(pic => (
                                      <div key={pic.id} className="relative group rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800/50 w-[120px]">
                                        <img src={`/api/screenshots/${pic.id}`} alt={pic.filename}
                                          onClick={() => setLightboxImage(`/api/screenshots/${pic.id}`)}
                                          className="screenshot-thumb w-full" />
                                        <button onClick={() => handleDeleteScreenshot(trade.id, pic.id)}
                                          className="absolute top-1 right-1 p-1 rounded-full bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity" title="删除截图">
                                          <X size={10} />
                                        </button>
                                        <div className="absolute bottom-0 inset-x-0 bg-black/60 text-[8px] text-white py-0.5 px-1 truncate" title={pic.filename}>
                                          {pic.filename}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : <p className="text-xxs text-zinc-400 italic">暂无截图。您可以上传图表截图以便后续复盘。</p>}
                                <div className="flex items-center gap-3">
                                  <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xxs font-semibold text-zinc-600 dark:text-zinc-400 cursor-pointer transition-colors w-fit">
                                    <Upload size={12} /><span>添加截图</span>
                                    <input type="file" accept="image/*" multiple
                                      onChange={(e) => handleUploadScreenshots(trade.id, e.target.files)} className="hidden" />
                                  </label>
                                  {isUploadingScreenshot && (
                                    <span className="text-[10px] text-zinc-400 flex items-center gap-1.5">
                                      <RefreshCw size={10} className="animate-spin text-emerald-600 dark:text-emerald-400" />正在上传...
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
                <tr><td colSpan={12} className="p-8 text-center text-zinc-400">未找到符合筛选条件的交易记录。</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
