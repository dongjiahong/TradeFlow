"use client";

import { useState } from "react";
import { RefreshCw, Upload, Download, X, AlertTriangle, Trash2, ScrollText } from "lucide-react";
import { getRuleStyle, type OptionItem, type Trade, type TradingRule } from "./types";

interface SettingsProps {
  trades: Trade[];
  setups: OptionItem[];
  errors: OptionItem[];
  exits: OptionItem[];
  symbols: OptionItem[];
  processes: OptionItem[];
  isImporting: boolean;
  importStatus: string;
  newSetupName: string;
  setNewSetupName: React.Dispatch<React.SetStateAction<string>>;
  newErrorName: string;
  setNewErrorName: React.Dispatch<React.SetStateAction<string>>;
  newExitName: string;
  setNewExitName: React.Dispatch<React.SetStateAction<string>>;
  newSymbolName: string;
  setNewSymbolName: React.Dispatch<React.SetStateAction<string>>;
  newProcessName: string;
  setNewProcessName: React.Dispatch<React.SetStateAction<string>>;
  onImportExcel: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExportExcel: (startDate?: string, endDate?: string) => void;
  onAddSetup: () => Promise<void>;
  onDeleteSetup: (id: string | number) => Promise<void>;
  onAddError: () => Promise<void>;
  onDeleteError: (id: string | number) => Promise<void>;
  onAddExit: () => Promise<void>;
  onDeleteExit: (id: string | number) => Promise<void>;
  onAddSymbol: () => Promise<void>;
  onDeleteSymbol: (id: string | number) => Promise<void>;
  onAddProcess: () => Promise<void>;
  onDeleteProcess: (id: string | number) => Promise<void>;
  onDeleteTradesByDateRange: (startDate: string, endDate: string) => Promise<{ success: boolean; count?: number; error?: string }>;
  rules: TradingRule[];
  onAddRule: (content: string) => Promise<void>;
  onDeleteRule: (id: number) => Promise<void>;
}

interface OptionPanelProps {
  title: string;
  count: number;
  items: OptionItem[];
  placeholder: string;
  addKey: string;
  addVal: string;
  onChangeAdd: React.Dispatch<React.SetStateAction<string>>;
  onAdd: () => Promise<void>;
  onDelete: (id: string | number) => Promise<void>;
}

const OptionPanel = ({
  title, count, items, placeholder,
  addKey, addVal, onChangeAdd, onAdd, onDelete
}: OptionPanelProps) => (
  <div className="p-4 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] flex flex-col gap-3">
    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
      {title} ({count})
    </h3>
    <div className="flex gap-2">
      <input type="text" placeholder={placeholder} value={addVal} onChange={(e) => onChangeAdd(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") onAdd(); }}
        className="flex-1 px-3 py-1.5 border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] text-xs text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-1 focus:ring-trade-green" />
      <button onClick={onAdd} className="px-3 py-1.5 bg-trade-green text-white text-xs font-bold rounded-lg hover:bg-green-600 transition-colors">
        添加
      </button>
    </div>
    <div className="flex flex-col gap-1 max-h-[240px] overflow-y-auto pr-1">
      {items.map(item => (
        <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-[var(--color-bg-canvas)]/50 hover:bg-[var(--color-bg-hover)] text-xs text-[var(--text-secondary)] transition-colors">
          <span className="truncate">{item.name}</span>
          <button onClick={() => item.id !== undefined && onDelete(item.id)} className="text-[var(--text-muted)] hover:text-trade-red transition-colors p-1">
            <X size={12} />
          </button>
        </div>
      ))}
      {items.length === 0 && <p className="text-xs text-[var(--text-muted)] text-center py-4">暂无配置项</p>}
    </div>
  </div>
);

export default function Settings({
  trades, setups, errors, exits, symbols, processes,
  isImporting, importStatus,
  newSetupName, setNewSetupName,
  newErrorName, setNewErrorName,
  newExitName, setNewExitName,
  newSymbolName, setNewSymbolName,
  newProcessName, setNewProcessName,
  onImportExcel, onExportExcel, onAddSetup, onDeleteSetup,
  onAddError, onDeleteError,
  onAddExit, onDeleteExit, onAddSymbol, onDeleteSymbol,
  onAddProcess, onDeleteProcess,
  onDeleteTradesByDateRange,
  rules, onAddRule, onDeleteRule
}: SettingsProps) {
  // 日志管理删除状态
  const [deleteStartDate, setDeleteStartDate] = useState("");
  const [deleteEndDate, setDeleteEndDate] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState("");

  // AI 交易教练配置状态
  const [aiApiKey, setAiApiKey] = useState(() => (typeof window !== "undefined" ? localStorage.getItem("tf_ai_api_key") || "" : ""));
  const [aiBaseUrl, setAiBaseUrl] = useState(() => (typeof window !== "undefined" ? localStorage.getItem("tf_ai_base_url") || "https://api.openai.com/v1" : "https://api.openai.com/v1"));
  const [aiModelName, setAiModelName] = useState(() => (typeof window !== "undefined" ? localStorage.getItem("tf_ai_model_name") || "gpt-4o" : "gpt-4o"));
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // 做单原则管理状态与事件
  const [newRuleContent, setNewRuleContent] = useState("");
  const handleAddRuleInline = async () => {
    if (!newRuleContent.trim()) return;
    await onAddRule(newRuleContent.trim());
    setNewRuleContent("");
  };

  const handleSaveAiConfig = () => {
    localStorage.setItem("tf_ai_api_key", aiApiKey.trim());
    localStorage.setItem("tf_ai_base_url", aiBaseUrl.trim());
    localStorage.setItem("tf_ai_model_name", aiModelName.trim());
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  // 辅助函数，获取今天本地的 YYYY-MM-DD
  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [exportStartDate, setExportStartDate] = useState(getTodayString());
  const [exportEndDate, setExportEndDate] = useState(getTodayString());

  const setExportRangeToday = () => {
    const today = getTodayString();
    setExportStartDate(today);
    setExportEndDate(today);
  };

  const setExportRangeThisWeek = () => {
    const d = new Date();
    const day = d.getDay(); // 0 is Sunday, 1 is Monday, etc.
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    
    const y = monday.getFullYear();
    const m = String(monday.getMonth() + 1).padStart(2, '0');
    const dateStr = String(monday.getDate()).padStart(2, '0');
    
    setExportStartDate(`${y}-${m}-${dateStr}`);
    setExportEndDate(getTodayString());
  };

  const setExportRangeThisMonth = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    setExportStartDate(`${y}-${m}-01`);
    setExportEndDate(getTodayString());
  };

  const setExportRangeAll = () => {
    setExportStartDate("");
    setExportEndDate("");
  };

  const getOldestDate = () => {
    if (trades && trades.length > 0) {
      const d = trades[0].date;
      return typeof d === "string" ? d.split("T")[0] : new Date(d).toISOString().split("T")[0];
    }
    // 如果没有任何数据，默认最早是今天
    return new Date().toISOString().split("T")[0];
  };

  const getTradesCountInRange = () => {
    if (!deleteStartDate || !deleteEndDate) return 0;
    return trades.filter(t => {
      const d = typeof t.date === "string" ? t.date.split("T")[0] : new Date(t.date).toISOString().split("T")[0];
      return d >= deleteStartDate && d <= deleteEndDate;
    }).length;
  };

  // 快捷设置删除范围
  const setDeleteRangeMonthsAgo = (months: number) => {
    const today = new Date();
    today.setMonth(today.getMonth() - months);
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    setDeleteStartDate("1970-01-01");
    setDeleteEndDate(`${y}-${m}-${d}`);
    setDeleteMsg("");
  };

  const setDeleteRangeAll = () => {
    setDeleteStartDate("1970-01-01");
    setDeleteEndDate(new Date().toISOString().split("T")[0]);
    setDeleteMsg("");
  };

  const triggerDeleteCheck = () => {
    if (!deleteStartDate || !deleteEndDate) {
      alert("请先选择要删除的开始日期和结束日期！");
      return;
    }
    if (deleteStartDate > deleteEndDate) {
      alert("开始日期不能晚于结束日期！");
      return;
    }
    setDeleteMsg("");
    setShowDeleteConfirm(true);
  };

  const executeDelete = async (needBackup: boolean) => {
    setIsDeleting(true);
    try {
      if (needBackup) {
        onExportExcel();
        await new Promise(resolve => setTimeout(resolve, 800));
      }
      
      const res = await onDeleteTradesByDateRange(deleteStartDate, deleteEndDate);
      if (res.success) {
        setDeleteMsg(`成功删除了该时间段内的 ${res.count ?? 0} 条交易日志！`);
        setDeleteStartDate("");
        setDeleteEndDate("");
      } else {
        alert("删除失败: " + res.error);
      }
    } catch (err: any) {
      alert("操作出错: " + err.message);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };



  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-[var(--text-primary)]">系统设置</h2>
        <p className="text-sm text-[var(--text-muted)]">导入导出数据，配置入场理由、错误原因、离场理由等选项</p>
      </div>

      {/* 导入导出与日志清理（并排） */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 数据导入导出 */}
        <div className="p-4 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] flex flex-col justify-between min-h-[200px]">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-secondary)] flex items-center gap-2 mb-2.5">
              <RefreshCw size={16} className="text-trade-green" />
              数据导入导出
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Import */}
              <div className="p-3 rounded-lg bg-[var(--color-bg-canvas)]/50 border border-[var(--color-border-subtle)] flex flex-col justify-between gap-2">
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                      <Upload size={13} className="text-trade-green" />
                      导入交易日志
                    </h4>
                    <span className="text-xxs text-[var(--text-muted)] font-medium">导入将覆盖现有日志</span>
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1.5 leading-normal">
                    选择包含符合格式交易数据的 Excel 工作表导入。
                  </p>
                </div>
                <label className="w-full mt-2.5 px-2.5 py-1.5 bg-[var(--color-bg-elevated)] hover:bg-[var(--color-bg-hover)] text-[var(--text-primary)] text-xs font-bold rounded-lg cursor-pointer text-center active:scale-95 transition-all block border border-[var(--color-border-subtle)]">
                  {isImporting ? "处理中..." : "选择并导入 Excel"}
                  <input type="file" accept=".xlsx" onChange={onImportExcel} disabled={isImporting} className="hidden" />
                </label>
              </div>

              {/* Export */}
              <div className="p-3 rounded-lg bg-[var(--color-bg-canvas)]/50 border border-[var(--color-border-subtle)] flex flex-col justify-between gap-2.5">
                <div>
                  <h4 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    <Download size={13} className="text-[var(--text-muted)]" />
                    导出交易日志 (17列明细)
                  </h4>
                  
                  {/* 日期选择器（横向并排） */}
                  <div className="flex items-center gap-1.5 mt-2">
                    <input 
                      type="date" 
                      value={exportStartDate} 
                      onChange={(e) => setExportStartDate(e.target.value)}
                      className="px-2.5 py-1 border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] text-xs text-[var(--text-primary)] font-normal rounded-lg focus:outline-none focus:ring-1 focus:ring-trade-green w-[125px] h-[28px] cursor-pointer" 
                    />
                    <span className="text-xs text-[var(--text-muted)]">至</span>
                    <input 
                      type="date" 
                      value={exportEndDate} 
                      onChange={(e) => setExportEndDate(e.target.value)}
                      className="px-2.5 py-1 border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] text-xs text-[var(--text-primary)] font-normal rounded-lg focus:outline-none focus:ring-1 focus:ring-trade-green w-[125px] h-[28px] cursor-pointer" 
                    />
                  </div>

                  {/* 快捷按钮 */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    <button 
                      onClick={setExportRangeToday}
                      className={`px-2 py-0.5 border text-xxs rounded-lg transition-colors cursor-pointer ${exportStartDate === getTodayString() && exportEndDate === getTodayString() ? 'bg-trade-green/10 text-trade-green border-trade-green/30 font-medium' : 'border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--color-bg-hover)]'}`}
                    >
                      今天
                    </button>
                    <button 
                      onClick={setExportRangeThisWeek}
                      className="px-2 py-0.5 border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--color-bg-hover)] text-xxs rounded-lg transition-colors cursor-pointer"
                    >
                      本周
                    </button>
                    <button 
                      onClick={setExportRangeThisMonth}
                      className="px-2 py-0.5 border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--color-bg-hover)] text-xxs rounded-lg transition-colors cursor-pointer"
                    >
                      本月
                    </button>
                    <button 
                      onClick={setExportRangeAll}
                      className={`px-2 py-0.5 border text-xxs rounded-lg transition-colors cursor-pointer ${!exportStartDate && !exportEndDate ? 'bg-trade-green/10 text-trade-green border-trade-green/30 font-medium' : 'border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--color-bg-hover)]'}`}
                    >
                      全部
                    </button>
                  </div>
                </div>

                <button onClick={() => onExportExcel(exportStartDate, exportEndDate)}
                  className="w-full px-3 py-1.5 bg-trade-green hover:bg-green-600 text-white text-xs font-bold rounded-lg text-center active:scale-95 transition-all cursor-pointer block">
                  下载 Excel 文件
                </button>
              </div>
            </div>
          </div>

          {importStatus && (
            <div className="p-2 rounded-lg bg-[var(--color-bg-hover)] text-[var(--text-secondary)] text-xxs flex items-center gap-2 font-medium mt-2">
              <span className="h-1.5 w-1.5 rounded-full bg-trade-green animate-ping shrink-0"></span>
              {importStatus}
            </div>
          )}
        </div>

        {/* 交易日志清理与管理 */}
        <div className="p-4 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] flex flex-col justify-between min-h-[200px]">
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-sm font-bold text-[var(--text-secondary)] flex items-center gap-2">
                <Trash2 size={16} className="text-trade-red" />
                交易日志清理与管理
              </h3>
              <span className="text-xxs text-trade-red font-medium">会清空本地数据！</span>
            </div>
            
            <div className="p-3 rounded-lg bg-[var(--color-bg-canvas)]/50 border border-[var(--color-border-subtle)] flex flex-col gap-3">
              <p className="text-xxs text-[var(--text-muted)] leading-relaxed">
                选择删除的日期区间，一键安全清理该时段内所有交易日志。清理前系统将提示您进行备份。
              </p>
              
              <div className="flex flex-col gap-2.5">
                {/* 日期选择器（横向并排） */}
                <div className="flex items-center gap-1.5">
                  <input 
                    type="date" 
                    value={deleteStartDate} 
                    onChange={(e) => { setDeleteStartDate(e.target.value); setDeleteMsg(""); }}
                    className="px-2.5 py-1 border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] text-xs text-[var(--text-primary)] font-normal rounded-lg focus:outline-none focus:ring-1 focus:ring-trade-green w-[125px] h-[28px] cursor-pointer" 
                  />
                  <span className="text-xs text-[var(--text-muted)]">至</span>
                  <input 
                    type="date" 
                    value={deleteEndDate} 
                    onChange={(e) => { setDeleteEndDate(e.target.value); setDeleteMsg(""); }}
                    className="px-2.5 py-1 border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] text-xs text-[var(--text-primary)] font-normal rounded-lg focus:outline-none focus:ring-1 focus:ring-trade-green w-[125px] h-[28px] cursor-pointer" 
                  />
                </div>
                
                {/* 快捷按钮 */}
                <div className="flex flex-wrap gap-1">
                  <button onClick={() => setDeleteRangeMonthsAgo(3)}
                    className="px-2 py-0.5 border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-hover)] text-[var(--text-secondary)] text-xxs rounded-lg transition-colors cursor-pointer">
                    3个月前
                  </button>
                  <button onClick={() => setDeleteRangeMonthsAgo(6)}
                    className="px-2 py-0.5 border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-hover)] text-[var(--text-secondary)] text-xxs rounded-lg transition-colors cursor-pointer">
                    6个月前
                  </button>
                  <button onClick={() => setDeleteRangeMonthsAgo(12)}
                    className="px-2 py-0.5 border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-hover)] text-[var(--text-secondary)] text-xxs rounded-lg transition-colors cursor-pointer">
                    1年前
                  </button>
                  <button onClick={setDeleteRangeAll}
                    className="px-2 py-0.5 border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-hover)] text-[var(--text-secondary)] text-xxs rounded-lg transition-colors cursor-pointer">
                    全部日志
                  </button>
                </div>
              </div>
              
              <button onClick={triggerDeleteCheck}
                className="w-full px-3 py-1.5 bg-trade-red hover:bg-red-600 active:scale-95 text-white text-xs font-bold rounded-lg transition-all cursor-pointer text-center">
                安全删除选中时段日志
              </button>
            </div>
          </div>
          
          {deleteMsg && (
            <div className="p-2 rounded-lg bg-[var(--color-bg-hover)] text-trade-green text-xxs font-medium mt-2">
              {deleteMsg}
            </div>
          )}
        </div>
      </div>

      {/* Option Panels Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <OptionPanel title="入场理由" count={setups.length} items={setups} placeholder="新入场理由..."
          addKey="setup" addVal={newSetupName} onChangeAdd={setNewSetupName} onAdd={onAddSetup} onDelete={onDeleteSetup} />
        <OptionPanel title="错误原因" count={errors.length} items={errors} placeholder="新错误原因..."
          addKey="error" addVal={newErrorName} onChangeAdd={setNewErrorName} onAdd={onAddError} onDelete={onDeleteError} />
        <OptionPanel title="离场理由" count={exits.length} items={exits} placeholder="新离场理由..."
          addKey="exit" addVal={newExitName} onChangeAdd={setNewExitName} onAdd={onAddExit} onDelete={onDeleteExit} />
        <OptionPanel title="交易品类" count={symbols.length} items={symbols} placeholder="新品类 (如 BTC)..."
          addKey="symbol" addVal={newSymbolName} onChangeAdd={setNewSymbolName} onAdd={onAddSymbol} onDelete={onDeleteSymbol} />
        <OptionPanel title="交易过程" count={processes.length} items={processes} placeholder="新交易过程..."
          addKey="process" addVal={newProcessName} onChangeAdd={setNewProcessName} onAdd={onAddProcess} onDelete={onDeleteProcess} />
      </div>

      {/* 做单原则与 AI 配置并排 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* 做单原则管理 */}
        <div className="p-5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] flex flex-col gap-4 shadow-sm justify-between">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-3">
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <ScrollText size={16} className="text-trade-green animate-pulse" />
                <span>做单原则管理</span>
              </h3>
              <span className="text-[10px] text-trade-green bg-[var(--color-trade-green-dim)] px-2 py-0.5 rounded-full font-bold">
                共 {rules.length} 条
              </span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="输入做单原则，按回车保存..."
                value={newRuleContent}
                onChange={(e) => setNewRuleContent(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddRuleInline(); }}
                className="flex-1 text-xs bg-[var(--color-bg-canvas)] border border-[var(--color-border-standard)] rounded-lg px-3 py-1.5 text-[var(--text-primary)] focus:border-trade-green outline-none placeholder:text-[var(--text-muted)]"
              />
              <button
                onClick={handleAddRuleInline}
                className="px-3 py-1.5 bg-trade-green hover:bg-green-600 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                添加
              </button>
            </div>

            <div className="flex flex-col gap-1.5 h-[148px] overflow-y-auto pr-1">
              {rules.map((rule, idx) => {
                const style = getRuleStyle(rule.content);
                return (
                  <div key={rule.id} className={`flex items-start gap-1.5 px-2.5 py-1.5 rounded-r-lg border-y border-r border-l-[3px] border-[var(--color-border-subtle)] ${style.borderColor} ${style.bg} text-xs leading-normal transition-all duration-150`}>
                    <span className="shrink-0 mt-0.5 text-xs">{style.icon}</span>
                    <span className="flex-1 text-[11px] font-semibold text-[var(--color-text-primary)] leading-normal break-all">
                      {rule.content}
                    </span>
                    <button
                      onClick={() => rule.id !== undefined && onDeleteRule(rule.id)}
                      className="text-[var(--text-muted)] hover:text-trade-red transition-colors p-0.5 shrink-0 cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  </div>
                );
              })}
              {rules.length === 0 && (
                <p className="text-xs text-[var(--text-muted)] text-center py-6 italic">暂未设定任何做单原则</p>
              )}
            </div>
          </div>
          <p className="text-xxs text-[var(--text-muted)] leading-relaxed mt-2 pt-2 border-t border-[var(--color-border-subtle)]/40">
            * 设定后可在顶部下拉帘快速查阅，同时在进行 AI 复盘诊断时作为考核红线。
          </p>
        </div>

        {/* AI 交易教练配置 */}
        <div className="p-5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] flex flex-col gap-4 shadow-sm justify-between">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-3">
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <RefreshCw size={16} className="text-trade-green animate-spin-slow" />
                <span>AI 交易教练配置 (兼容 OpenAI 协议)</span>
              </h3>
              <span className="text-[10px] text-[var(--text-muted)] bg-[var(--color-bg-elevated)] px-2 py-0.5 rounded-full">
                提供智能数据分析与整体交易总结
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">API Key</label>
                <div className="relative flex items-center">
                  <input
                    type={showApiKey ? "text" : "password"}
                    placeholder="sk-..."
                    value={aiApiKey}
                    onChange={(e) => setAiApiKey(e.target.value)}
                    className="w-full text-xs bg-[var(--color-bg-canvas)] border border-[var(--color-border-standard)] rounded-lg pl-3 pr-8 py-1.5 text-[var(--text-primary)] focus:border-trade-green outline-none transition-all placeholder:text-[var(--text-muted)] font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2 text-xxs font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] px-1 py-0.5 rounded transition-colors cursor-pointer"
                  >
                    {showApiKey ? "隐藏" : "显示"}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">API Base URL</label>
                <input
                  type="text"
                  placeholder="https://api.openai.com/v1"
                  value={aiBaseUrl}
                  onChange={(e) => setAiBaseUrl(e.target.value)}
                  className="w-full text-xs bg-[var(--color-bg-canvas)] border border-[var(--color-border-standard)] rounded-lg px-3 py-1.5 text-[var(--text-primary)] focus:border-trade-green outline-none transition-all placeholder:text-[var(--text-muted)] font-mono"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">模型名称 (Model Name)</label>
                <input
                  type="text"
                  placeholder="gpt-4o"
                  value={aiModelName}
                  onChange={(e) => setAiModelName(e.target.value)}
                  className="w-full text-xs bg-[var(--color-bg-canvas)] border border-[var(--color-border-standard)] rounded-lg px-3 py-1.5 text-[var(--text-primary)] focus:border-trade-green outline-none transition-all placeholder:text-[var(--text-muted)] font-mono"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-[var(--color-border-subtle)]/40 pt-3 flex-wrap gap-2">
            <p className="text-xxs text-[var(--text-muted)] leading-relaxed">
              * 密钥信息仅保存在本机的 LocalStorage 中，安全私密。
            </p>
            <div className="flex items-center gap-2">
              {saveSuccess && (
                <span className="text-xs text-trade-green font-medium animate-fade-in">✓ 配置已保存</span>
              )}
              <button
                onClick={handleSaveAiConfig}
                className="px-3 py-1.5 bg-trade-green text-white text-xs font-bold rounded-lg hover:bg-green-600 transition-colors cursor-pointer"
              >
                保存配置
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 animate-scale-in">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-[var(--trade-red-dim)] text-trade-red shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div className="flex flex-col gap-1.5">
                <h3 className="text-base font-bold text-[var(--text-primary)]">⚠️ 交易日志清理警告</h3>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  您将要删除从 <span className="font-bold text-[var(--text-primary)]">{deleteStartDate}</span> 至 <span className="font-bold text-[var(--text-primary)]">{deleteEndDate}</span> 日期范围内的所有交易日志。
                  <br />
                  在此期间内**共计有 <span className="font-bold text-trade-red">{getTradesCountInRange()}</span> 条交易日志**会被删除。
                </p>
                <p className="text-xs text-trade-red font-semibold leading-relaxed">
                  此操作将永久抹除日志及其所有的交易截图数据，不可撤销！建议您在删除前导出备份。
                </p>
              </div>
            </div>
            
            <div className="flex flex-col gap-2 mt-2">
              <button onClick={() => executeDelete(true)} disabled={isDeleting}
                className="w-full py-2 bg-trade-green hover:bg-green-600 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer text-center">
                {isDeleting ? "正在处理..." : "推荐：先导出备份并删除"}
              </button>
              <button onClick={() => executeDelete(false)} disabled={isDeleting}
                className="w-full py-2 bg-[var(--color-bg-elevated)] hover:bg-[var(--color-bg-hover)] disabled:opacity-50 text-trade-red text-xs font-bold rounded-lg transition-colors cursor-pointer text-center border border-[var(--color-border-subtle)]">
                {isDeleting ? "正在处理..." : "不备份，直接删除"}
              </button>
              <button onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}
                className="w-full py-2 bg-[var(--color-bg-canvas)] hover:bg-[var(--color-bg-hover)] disabled:opacity-50 text-[var(--text-secondary)] text-xs font-semibold rounded-lg transition-colors cursor-pointer text-center border border-[var(--color-border-subtle)]">
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
