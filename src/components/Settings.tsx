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
  darkMode: boolean;
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
  darkMode,
  onImportExcel, onAddSetup, onDeleteSetup,
  onAddError, onDeleteError,
  onAddExit, onDeleteExit, onAddSymbol, onDeleteSymbol
}: SettingsProps) {
  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <div>
        <h2 className="text-xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">系统设置与管理</h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">导入/导出 Excel，并配置入场理由、错误原因、离场理由等筛选项目</p>
      </div>

      {/* Data Import / Export Panel */}
      <div className="p-4 rounded-xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800/50 shadow-sm flex flex-col gap-4">
        <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 border-b pb-3 border-zinc-100 dark:border-zinc-800/50 flex items-center gap-2">
          <RefreshCw size={16} className="text-emerald-600 dark:text-emerald-400" />
          Excel 模板数据互通
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
          {/* Import Excel */}
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800/50 flex flex-col justify-between gap-4">
            <div>
              <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                <Upload size={14} className="text-emerald-600 dark:text-emerald-400" />
                导入交易日志 (xlsx)
              </h4>
              <p className="text-xxs text-zinc-400 mt-1">
                上传现有的交易日志模板。系统将自动解析您的交易记录、每日日记以及入场理由。<strong>注意：这会清空系统内当前的交易记录并以 Excel 的数据为准！</strong>
              </p>
            </div>
            <div className="flex items-center gap-4">
              <label className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer text-center transition-colors">
                {isImporting ? "正在处理中..." : "选择并导入 Excel"}
                <input type="file" accept=".xlsx" onChange={onImportExcel} disabled={isImporting} className="hidden" />
              </label>
            </div>
          </div>

          {/* Export Excel */}
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800/50 flex flex-col justify-between gap-4">
            <div>
              <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                <Download size={14} className="text-emerald-600 dark:text-emerald-400" />
                导出交易日志 (xlsx)
              </h4>
              <p className="text-xxs text-zinc-400 mt-1">
                将数据库中的交易日志、盘后日记本以及自定义选项完整导出为一个兼容原格式的 `.xlsx` 工作簿。
              </p>
            </div>
            <div>
              <a href="/api/export" download="trading-log-export.xlsx"
                className="inline-block px-4 py-2 bg-zinc-800 hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 text-white text-xs font-bold rounded-xl text-center active:scale-95 transition-all shadow-sm">
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Setup Options */}
        <div className="p-4 rounded-xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800/50 shadow-sm flex flex-col gap-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 border-b pb-2 dark:border-zinc-800/50">入场理由配置 ({setups.length})</h3>
          <div className="flex gap-2">
            <input type="text" placeholder="新入场理由..." value={newSetupName} onChange={(e) => setNewSetupName(e.target.value)}
              className="flex-1 px-3 py-1.5 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 text-xs focus:outline-none" />
            <button onClick={onAddSetup} className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700">添加</button>
          </div>
          <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
            {setups.map(item => (
              <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xxs font-medium text-zinc-700 dark:text-zinc-300">
                <span className="truncate">{item.name}</span>
                <button onClick={() => onDeleteSetup(item.id)} className="text-zinc-400 hover:text-rose-600 dark:text-rose-400 transition-colors p-1">
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Error Options */}
        <div className="p-4 rounded-xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800/50 shadow-sm flex flex-col gap-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 border-b pb-2 dark:border-zinc-800/50">做错原因配置 ({errors.length})</h3>
          <div className="flex gap-2">
            <input type="text" placeholder="新错误原因..." value={newErrorName} onChange={(e) => setNewErrorName(e.target.value)}
              className="flex-1 px-3 py-1.5 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 text-xs focus:outline-none" />
            <button onClick={onAddError} className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700">添加</button>
          </div>
          <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
            {errors.map(item => (
              <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xxs font-medium text-zinc-700 dark:text-zinc-300">
                <span className="truncate">{item.name}</span>
                <button onClick={() => onDeleteError(item.id)} className="text-zinc-400 hover:text-rose-600 dark:text-rose-400 transition-colors p-1">
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Exit Options */}
        <div className="p-4 rounded-xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800/50 shadow-sm flex flex-col gap-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 border-b pb-2 dark:border-zinc-800/50">离场理由配置 ({exits.length})</h3>
          <div className="flex gap-2">
            <input type="text" placeholder="新离场理由..." value={newExitName} onChange={(e) => setNewExitName(e.target.value)}
              className="flex-1 px-3 py-1.5 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 text-xs focus:outline-none" />
            <button onClick={onAddExit} className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700">添加</button>
          </div>
          <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
            {exits.map(item => (
              <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xxs font-medium text-zinc-700 dark:text-zinc-300">
                <span className="truncate">{item.name}</span>
                <button onClick={() => onDeleteExit(item.id)} className="text-zinc-400 hover:text-rose-600 dark:text-rose-400 transition-colors p-1">
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Symbol Options */}
        <div className="p-4 rounded-xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800/50 shadow-sm flex flex-col gap-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 border-b pb-2 dark:border-zinc-800/50">交易品类配置 ({symbols.length})</h3>
          <div className="flex gap-2">
            <input type="text" placeholder="新品类 (如 BTC)..." value={newSymbolName} onChange={(e) => setNewSymbolName(e.target.value)}
              className="flex-1 px-3 py-1.5 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 text-xs focus:outline-none" />
            <button onClick={onAddSymbol} className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700">添加</button>
          </div>
          <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
            {symbols.map(item => (
              <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xxs font-medium text-zinc-700 dark:text-zinc-300">
                <span className="truncate">{item.name}</span>
                <button onClick={() => onDeleteSetup(item.id)} className="text-zinc-400 hover:text-rose-600 dark:text-rose-400 transition-colors p-1">
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
