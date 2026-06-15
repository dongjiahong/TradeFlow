"use client";

import React, { useState } from "react";
import { ScrollText, Trash, Plus } from "lucide-react";
import type { TradingRule } from "./types";

interface RulesProps {
  rules: TradingRule[];
  onAddRule: (content: string, type: "do" | "dont") => Promise<void>;
  onDeleteRule: (id: number) => Promise<void>;
}

export default function Rules({ rules, onAddRule, onDeleteRule }: RulesProps) {
  const [newDoContent, setNewDoContent] = useState("");
  const [newDontContent, setNewDontContent] = useState("");

  const handleAddDo = async () => {
    if (!newDoContent.trim()) return;
    await onAddRule(newDoContent.trim(), "do");
    setNewDoContent("");
  };

  const handleAddDont = async () => {
    if (!newDontContent.trim()) return;
    await onAddRule(newDontContent.trim(), "dont");
    setNewDontContent("");
  };

  const doRules = rules.filter((r) => r.type === "do");
  const dontRules = rules.filter((r) => r.type === "dont");

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-10">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
          <ScrollText className="text-trade-green" size={20} />
          做单原则管理
        </h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          明确什么样的交易可以做，什么样的交易不能做。树立清晰的执行红线，提升纪律性。
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* DO COLUMN */}
        <div className="flex flex-col gap-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-3">
            <h3 className="text-sm font-bold text-trade-green flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-trade-green animate-pulse" />
              应做交易 (DO)
            </h3>
            <span className="text-[10px] text-trade-green bg-[var(--trade-green-dim)] px-2 py-0.5 rounded-full font-bold">
              共 {doRules.length} 条
            </span>
          </div>

          {/* Quick Input */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="输入应做交易原则，按回车保存..."
              value={newDoContent}
              onChange={(e) => setNewDoContent(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddDo()}
              className="flex-1 text-xs bg-[var(--color-bg-canvas)] border border-[var(--color-border-standard)] rounded-lg px-3 py-2 text-[var(--text-primary)] focus:border-trade-green focus:ring-1 focus:ring-trade-green outline-none transition-all placeholder:text-[var(--text-muted)]"
            />
            <button
              onClick={handleAddDo}
              className="flex items-center justify-center p-2 rounded-lg bg-trade-green text-white hover:bg-green-600 transition-colors cursor-pointer"
              title="添加原则"
            >
              <Plus size={15} />
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-[var(--color-border-subtle)] rounded-lg">
            <table className="w-full text-left text-xs text-[var(--text-primary)]">
              <thead className="bg-[var(--color-bg-elevated)] border-b border-[var(--color-border-subtle)] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-3 py-2.5 w-12 text-center">序号</th>
                  <th className="px-4 py-2.5">做单原则内容</th>
                  <th className="px-3 py-2.5 w-16 text-center">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-subtle)]">
                {doRules.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-[var(--text-muted)] italic">
                      暂未设定应做原则。在上方快速添加。
                    </td>
                  </tr>
                ) : (
                  doRules.map((rule, idx) => (
                    <tr key={rule.id} className="hover:bg-[var(--color-bg-hover)] transition-colors">
                      <td className="px-3 py-3 text-center text-[var(--text-muted)] font-mono">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-3 leading-relaxed break-all">
                        {rule.content}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {rule.id && (
                          <button
                            onClick={() => onDeleteRule(rule.id!)}
                            className="p-1 rounded text-[var(--text-muted)] hover:text-trade-red hover:bg-[var(--color-bg-hover)] transition-all cursor-pointer"
                            title="删除原则"
                          >
                            <Trash size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* DON'T COLUMN */}
        <div className="flex flex-col gap-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-3">
            <h3 className="text-sm font-bold text-trade-red flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-trade-red animate-pulse" />
              忌做交易 (DON'T)
            </h3>
            <span className="text-[10px] text-trade-red bg-[var(--trade-red-dim)] px-2 py-0.5 rounded-full font-bold">
              共 {dontRules.length} 条
            </span>
          </div>

          {/* Quick Input */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="输入忌做交易原则，按回车保存..."
              value={newDontContent}
              onChange={(e) => setNewDontContent(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddDont()}
              className="flex-1 text-xs bg-[var(--color-bg-canvas)] border border-[var(--color-border-standard)] rounded-lg px-3 py-2 text-[var(--text-primary)] focus:border-trade-red focus:ring-1 focus:ring-trade-red outline-none transition-all placeholder:text-[var(--text-muted)]"
            />
            <button
              onClick={handleAddDont}
              className="flex items-center justify-center p-2 rounded-lg bg-trade-red text-white hover:bg-red-600 transition-colors cursor-pointer"
              title="添加原则"
            >
              <Plus size={15} />
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-[var(--color-border-subtle)] rounded-lg">
            <table className="w-full text-left text-xs text-[var(--text-primary)]">
              <thead className="bg-[var(--color-bg-elevated)] border-b border-[var(--color-border-subtle)] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-3 py-2.5 w-12 text-center">序号</th>
                  <th className="px-4 py-2.5">做单原则内容</th>
                  <th className="px-3 py-2.5 w-16 text-center">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-subtle)]">
                {dontRules.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-[var(--text-muted)] italic">
                      暂未设定忌做原则。在上方快速添加。
                    </td>
                  </tr>
                ) : (
                  dontRules.map((rule, idx) => (
                    <tr key={rule.id} className="hover:bg-[var(--color-bg-hover)] transition-colors">
                      <td className="px-3 py-3 text-center text-[var(--text-muted)] font-mono">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-3 leading-relaxed break-all">
                        {rule.content}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {rule.id && (
                          <button
                            onClick={() => onDeleteRule(rule.id!)}
                            className="p-1 rounded text-[var(--text-muted)] hover:text-trade-red hover:bg-[var(--color-bg-hover)] transition-all cursor-pointer"
                            title="删除原则"
                          >
                            <Trash size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
