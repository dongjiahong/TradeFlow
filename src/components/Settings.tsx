"use client";

import { RefreshCw, Upload, Download, X } from "lucide-react";
import type { OptionItem } from "./types";

interface SettingsProps {
  setups: OptionItem[];
  errors: OptionItem[];
  exits: OptionItem[];
  symbols: OptionItem[];
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
  onImportExcel: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAddSetup: () => Promise<void>;
  onDeleteSetup: (id: string) => Promise<void>;
  onAddError: () => Promise<void>;
  onDeleteError: (id: string) => Promise<void>;
  onAddExit: () => Promise<void>;
  onDeleteExit: (id: string) => Promise<void>;
  onAddSymbol: () => Promise<void>;
  onDeleteSymbol: (id: string) => Promise<void>;
}

export default function Settings({
  setups, errors, exits, symbols,
  isImporting, importStatus,
  newSetupName, setNewSetupName,
  newErrorName, setNewErrorName,
  newExitName, setNewExitName,
  newSymbolName, setNewSymbolName,
  onImportExcel, onAddSetup, onDeleteSetup,
  onAddError, onDeleteError,
  onAddExit, onDeleteExit, onAddSymbol, onDeleteSymbol
}: SettingsProps) {
  const OptionPanel = ({
    title, count, items, placeholder,
    addKey, addVal, onChangeAdd, onAdd, onDelete
  }: {
    title: string; count: number; items: OptionItem[]; placeholder: string;
    addKey: string; addVal: string; onChangeAdd: React.Dispatch<React.SetStateAction<string>>;
    onAdd: () => Promise<void>; onDelete: (id: string) => Promise<void>;
  }) => (
    <div className="p-4 rounded-lg bg-bg-surface border border-border-subtle flex flex-col gap-3">
      <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
        {title} ({count})
      </h3>
      <div className="flex gap-2">
        <input type="text" placeholder={placeholder} value={addVal} onChange={(e) => onChangeAdd(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") onAdd(); }}
          className="flex-1 px-3 py-1.5 border border-border-subtle bg-bg-surface text-xs text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-1 focus:ring-trade-green" />
        <button onClick={onAdd} className="px-3 py-1.5 bg-trade-green text-white text-xs font-bold rounded-lg hover:bg-green-600 transition-colors">
          添加
        </button>
      </div>
      <div className="flex flex-col gap-1 max-h-[240px] overflow-y-auto pr-1">
        {items.map(item => (
          <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-bg-canvas/50 hover:bg-bg-hover text-xs text-[var(--text-secondary)] transition-colors">
            <span className="truncate">{item.name}</span>
            <button onClick={() => onDelete(item.id)} className="text-[var(--text-muted)] hover:text-trade-red transition-colors p-1">
              <X size={12} />
            </button>
          </div>
        ))}
        {items.length === 0 && <p className="text-xs text-[var(--text-muted)] text-center py-4">暂无配置项</p>}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-[var(--text-primary)]">系统设置</h2>
        <p className="text-sm text-[var(--text-muted)]">导入导出数据，配置入场理由、错误原因、离场理由等选项</p>
      </div>

      {/* Import / Export */}
      <div className="p-4 rounded-lg bg-bg-surface border border-border-subtle flex flex-col gap-4">
        <h3 className="text-sm font-bold text-[var(--text-secondary)] flex items-center gap-2">
          <RefreshCw size={16} className="text-trade-green" />
          数据导入导出
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-bg-canvas/50 border border-border-subtle flex flex-col justify-between gap-4">
            <div>
              <h4 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Upload size={14} className="text-trade-green" />
                导入交易日志
              </h4>
              <p className="text-xxs text-[var(--text-muted)] mt-1.5">
                上传 Excel 文件。系统将解析您的交易记录。<strong>注意：会清空当前交易记录！</strong>
              </p>
            </div>
            <label className="px-4 py-2 bg-trade-green hover:bg-green-600 text-white text-xs font-bold rounded-lg cursor-pointer text-center transition-colors">
              {isImporting ? "处理中..." : "选择并导入"}
              <input type="file" accept=".xlsx" onChange={onImportExcel} disabled={isImporting} className="hidden" />
            </label>
          </div>

          <div className="p-4 rounded-lg bg-bg-canvas/50 border border-border-subtle flex flex-col justify-between gap-4">
            <div>
              <h4 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Download size={14} className="text-[var(--text-muted)]" />
                导出交易日志
              </h4>
              <p className="text-xxs text-[var(--text-muted)] mt-1.5">
                将交易记录、日记和自定义选项完整导出为 `.xlsx` 文件。
              </p>
            </div>
            <a href="/api/export" download="trading-log-export.xlsx"
              className="inline-block px-4 py-2 bg-bg-elevated hover:bg-bg-hover text-[var(--text-primary)] text-xs font-bold rounded-lg text-center active:scale-95 transition-all text-center">
              下载 Excel 文件
            </a>
          </div>
        </div>

        {importStatus && (
          <div className="p-3 rounded-lg bg-bg-hover text-[var(--text-secondary)] text-xs flex items-center gap-2 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-trade-green animate-ping shrink-0"></span>
            {importStatus}
          </div>
        )}
      </div>

      {/* Option Panels Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <OptionPanel title="入场理由" count={setups.length} items={setups} placeholder="新入场理由..."
          addKey="setup" addVal={newSetupName} onChangeAdd={setNewSetupName} onAdd={onAddSetup} onDelete={onDeleteSetup} />
        <OptionPanel title="错误原因" count={errors.length} items={errors} placeholder="新错误原因..."
          addKey="error" addVal={newErrorName} onChangeAdd={setNewErrorName} onAdd={onAddError} onDelete={onDeleteError} />
        <OptionPanel title="离场理由" count={exits.length} items={exits} placeholder="新离场理由..."
          addKey="exit" addVal={newExitName} onChangeAdd={setNewExitName} onAdd={onAddExit} onDelete={onDeleteExit} />
        <OptionPanel title="交易品类" count={symbols.length} items={symbols} placeholder="新品类 (如 BTC)..."
          addKey="symbol" addVal={newSymbolName} onChangeAdd={setNewSymbolName} onAdd={onAddSymbol} onDelete={onDeleteSymbol} />
      </div>
    </div>
  );
}
