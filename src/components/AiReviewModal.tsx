"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, ScrollText, Download, RefreshCw, AlertTriangle, Image as ImageIcon, ArrowLeft, Sparkles, FileText } from "lucide-react";
import { db } from "../lib/db";
import ScreenshotImage from "./ScreenshotImage";
import type { Trade, TradingRule } from "./types";
import { marked } from "marked";

interface AiReviewModalProps {
  period: "today" | "week" | "month" | "all";
  trades: Trade[];
  rules: TradingRule[];
  onClose: () => void;
}

export default function AiReviewModal({ period, trades, rules, onClose }: AiReviewModalProps) {
  const [reviewMode, setReviewMode] = useState<"ai" | "simple" | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [reportText, setReportText] = useState("");
  const [zoomedImageId, setZoomedImageId] = useState<string | null>(null);

  const reportContainerRef = useRef<HTMLDivElement>(null);

  const loadingSteps = [
    "🚀 正在过滤筛选本期交易日志...",
    "🔍 正在比对做单纪律红线原则...",
    "📈 正在统计综合胜率与盈亏表现...",
    "🤖 AI 正在对每一笔交易进行合规性审查...",
    "📝 AI 正在整理撰写点评与诊断意见...",
    "✨ 正在排版您的专属交易复盘报告..."
  ];

  // 1. 过滤对应时段交易
  const getLocalDateStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const getThisWeekStartStr = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
  };

  const getThisMonthStartStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  };

  const getFilteredTrades = () => {
    const todayStr = getLocalDateStr();
    return trades.filter((t) => {
      const dateVal = t.date;
      const tDate = dateVal instanceof Date 
        ? dateVal.toISOString().split("T")[0] 
        : String(dateVal).split("T")[0];

      if (period === "today") return tDate === todayStr;
      if (period === "week") return tDate >= getThisWeekStartStr();
      if (period === "month") return tDate >= getThisMonthStartStr();
      return true; // "all"
    });
  };

  const periodTrades = getFilteredTrades();
  const periodLabel = {
    today: "今日",
    week: "本周",
    month: "本月",
    all: "全部历史"
  }[period];

  // 计算统计指标
  const winTrades = periodTrades.filter((t) => t.status === "win");
  const loseTrades = periodTrades.filter((t) => t.status === "lose");
  const totalPnl = periodTrades.reduce((acc, t) => acc + t.pnl, 0);
  const totalCount = periodTrades.length;

  const winRate = winTrades.length > 0 || loseTrades.length > 0
    ? (winTrades.length / (winTrades.length + loseTrades.length || 1)) * 100 
    : 0;

  const totalWinsAmount = winTrades.reduce((acc, t) => acc + t.pnl, 0);
  const totalLossesAmount = Math.abs(loseTrades.reduce((acc, t) => acc + t.pnl, 0));
  const avgWin = winTrades.length > 0 ? totalWinsAmount / winTrades.length : 0;
  const avgLoss = loseTrades.length > 0 ? totalLossesAmount / loseTrades.length : 0;
  const rr = avgLoss > 0 ? avgWin / avgLoss : 0;
  const profitFactor = totalLossesAmount > 0 ? totalWinsAmount / totalLossesAmount : totalWinsAmount > 0 ? 99.9 : 0;

  const getDateRangeStr = () => {
    if (periodTrades.length === 0) return "";
    const dates = periodTrades.map(t => {
      const d = t.date;
      return d instanceof Date ? d : new Date(d);
    }).filter(d => !isNaN(d.getTime()));
    
    if (dates.length === 0) return "";
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    const formatDate = (d: Date) => {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    };
    return `${formatDate(minDate)} 至 ${formatDate(maxDate)}`;
  };

  // 2. 模拟 loading 文字切换并在启用 AI 总结模式时请求 AI
  useEffect(() => {
    let stepTimer: NodeJS.Timeout;
    if (loading) {
      stepTimer = setInterval(() => {
        setLoadingStep((prev) => (prev < loadingSteps.length - 1 ? prev + 1 : prev));
      }, 1500);
    }
    return () => clearInterval(stepTimer);
  }, [loading]);

  useEffect(() => {
    // 锁定背景滚动，解决滑动冲突问题
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (reviewMode !== "ai") return;

    setLoading(true);
    setLoadingStep(0);
    setErrorMsg("");
    setReportText("");

    let active = true;
    async function requestAiReport() {
      // 从 localStorage 中读取 AI 密钥配置
      const apiKey = localStorage.getItem("tf_ai_api_key") || "";
      const baseUrl = localStorage.getItem("tf_ai_base_url") || "https://api.openai.com/v1";
      const modelName = localStorage.getItem("tf_ai_model_name") || "gpt-4o";

      if (!apiKey) {
        if (active) {
          setErrorMsg("未配置 AI 接口密钥。请前往「设置」页面最下方，填写并保存您的 AI API Key 配置。");
          setLoading(false);
        }
        return;
      }

      if (periodTrades.length === 0) {
        if (active) {
          setErrorMsg(`您所选择的【${periodLabel}】时段内暂无任何交易日志，无法进行复盘。`);
          setLoading(false);
        }
        return;
      }

      // 提取核心数据，不传输多余的本地图片二进制
      const serializedTrades = periodTrades.map((t, idx) => ({
        index: idx + 1,
        date: String(t.date).replace("T", " "),
        symbol: t.symbol,
        direction: t.direction,
        setup: t.setup,
        type: t.type,
        marketEnv: t.marketEnv,
        process: t.process,
        positionSize: t.positionSize,
        entryPrice: t.entryPrice,
        exitPrice: t.exitPrice1,
        takeProfit: t.takeProfit,
        stopLoss: t.stopLoss,
        pnl: t.pnl,
        status: t.status,
        errorReason: t.errorReason,
        remarks: t.remarks,
        notes: t.notes
      }));

      const rulesStr = rules.map(r => r.content).join("\n- ");

      const systemPrompt = `你是一个资深的专业交易教练。请根据下面提供的交易日志数据（包含总体盈亏、各笔交易的明细及交易员的自我复盘），以及交易员自己定下的“做单原则”，撰写一份专业的交易复盘总结报告。

做单原则包括：
${rulesStr ? "- " + rulesStr : "暂无"}

重要审查守则：
数据中的 \`remarks\`（备注）和 \`notes\`（自我复盘）是交易员本人撰写的，可能存在主观合理化、心理偏见或对自己违规行为的掩饰。作为教练，你必须保持高度的客观和警惕，切勿将其当作无可争辩的事实。你要交叉比对其实际交易参数（如环境、入场/离场理由、类型、过程、盈亏状况、离场错误等）与做单原则，严格审视其描述是否真实合理。特别是要结合当时的「市场环境」（突破/窄通道/宽通道/震荡区间）来交叉审视交易员的入场理由与交易类型是否合理（例如：在窄通道内逆势操作，或在震荡区间中部追突破等行为是否符合纪律）。如果发现交易员的表述存在狡辩、避重就轻或与数据矛盾，请予以指出并揭示其纪律盲点。

报告格式要求（请严格使用清晰的 Markdown 格式输出，内容不要超过 1500 字）：
1. 整体交易状况总结：分析整体表现、胜率、盈亏比、主要错误归因。特别是核对交易员在整体上是否遵守了上面列出的“做单原则”，并给出系统性的纪律改进建议。
2. 逐笔交易深度点评：对交易日志中的每一笔交易（交易1、交易2等）进行简短有力的点评，重点指出该笔交易是否遵守了做单原则（结合其 remarks 备注和 notes 复盘，指明具体遵循或违背了哪一条原则），肯定好的纪律，警告违规操作。`;

      const userPrompt = `这里是本时段【${periodLabel}】的交易数据：\n${JSON.stringify(serializedTrades, null, 2)}`;

      try {
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
            temperature: 0.7
          })
        });

        if (!response.ok) {
          throw new Error(`请求失败 (HTTP ${response.status})，请检查 Base URL 或 API Key 是否配置正确。`);
        }

        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content || "";

        if (active) {
          if (!content) {
            throw new Error("AI 返回了空数据。");
          }
          setReportText(content);
          setLoading(false);
        }
      } catch (err: any) {
        if (active) {
          console.error("AI Request failed:", err);
          setErrorMsg(err.message || "请求 AI 点评出错，请检查网络或配置。");
          setLoading(false);
        }
      }
    }

    requestAiReport();
    return () => { active = false; };
  }, [period, reviewMode]);

  // 4. 调用原生打印导出 PDF
  const handleExportPdf = () => {
    const element = reportContainerRef.current;
    if (!element) return;

    // Create print stylesheet
    const styleEl = document.createElement("style");
    styleEl.innerHTML = `
      @media print {
        body > * {
          display: none !important;
        }
        #print-temp-container {
          display: block !important;
          width: 100% !important;
          height: auto !important;
          background: white !important;
          color: black !important;
          padding: 24px !important;
          font-family: system-ui, -apple-system, sans-serif !important;
        }
        #print-temp-container h1, 
        #print-temp-container h2, 
        #print-temp-container h3, 
        #print-temp-container h4, 
        #print-temp-container h5 {
          color: #111827 !important;
          margin-top: 12px !important;
          margin-bottom: 6px !important;
          font-weight: bold !important;
        }
        #print-temp-container p {
          margin-bottom: 8px !important;
          line-height: 1.5 !important;
        }
        #print-temp-container img {
          max-width: 100% !important;
          height: auto !important;
          page-break-inside: avoid !important;
          border: 1px solid #e5e7eb !important;
          border-radius: 6px !important;
          margin-top: 6px !important;
          margin-bottom: 12px !important;
        }
        .grid {
          display: grid !important;
        }
        .grid-cols-2 {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        }
        .flex {
          display: flex !important;
        }
        .flex-col {
          flex-direction: column !important;
        }
        .gap-4 {
          gap: 16px !important;
        }
        .gap-3 {
          gap: 12px !important;
        }
        .page-break-avoid {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
      }
    `;
    document.head.appendChild(styleEl);

    // Create temporary wrapper and duplicate elements inside
    const tempContainer = document.createElement("div");
    tempContainer.id = "print-temp-container";
    tempContainer.innerHTML = element.innerHTML;
    
    // Add page-break-avoid class to cards to prevent printing cuts
    const cards = tempContainer.querySelectorAll(".border.rounded-xl");
    cards.forEach(c => c.classList.add("page-break-avoid"));

    document.body.appendChild(tempContainer);

    // Set document title temporarily to naming format
    const oldTitle = document.title;
    const todayStr = new Date().toISOString().split("T")[0];
    document.title = reviewMode === "ai"
      ? `TradeFlow_AI智能诊断报告_${periodLabel}_${todayStr}`
      : `TradeFlow_交易复盘清单_${periodLabel}_${todayStr}`;

    // Trigger print
    window.print();

    // Clean up
    document.title = oldTitle;
    document.body.removeChild(tempContainer);
    document.head.removeChild(styleEl);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 md:p-6 animate-fade-in">
      <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-standard)] rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] px-6 py-4 bg-[var(--color-bg-canvas)]/30 shrink-0">
          <div className="flex items-center gap-2">
            {reviewMode !== null && (
              <button 
                onClick={() => {
                  setReviewMode(null);
                  setErrorMsg("");
                  setReportText("");
                  setLoading(false);
                }}
                className="mr-2 p-1 rounded-lg hover:bg-[var(--color-bg-hover)] text-[var(--text-secondary)] transition-colors cursor-pointer"
                title="返回选择"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <ScrollText className="text-trade-green" size={18} />
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              {periodLabel}交易{reviewMode === "ai" ? " AI 诊断点评" : reviewMode === "simple" ? " 复盘清单" : ""}报告
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--color-bg-hover)] text-[var(--text-secondary)] transition-colors cursor-pointer">
            <X size={16} />
          </button>
        </div>

        {/* Content Main Area */}
        <div className={`flex-1 overflow-y-auto p-6 flex flex-col items-center ${loading || errorMsg || reviewMode === null ? "justify-center" : "justify-start"}`}>
          
          {reviewMode === null && (
            <div className="max-w-2xl w-full flex flex-col items-center">
              <div className="text-center mb-8">
                <h4 className="text-base font-extrabold text-[var(--color-text-primary)] tracking-tight">
                  选择复盘报告导出方式
                </h4>
                <p className="text-xs text-[var(--color-text-muted)] mt-1.5 leading-relaxed">
                  请选择适用于【{periodLabel}】时段（共 {periodTrades.length} 笔交易）的复盘生成方案
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                {/* Option 1: AI review */}
                <div 
                  onClick={() => {
                    const apiKey = localStorage.getItem("tf_ai_api_key") || "";
                    if (!apiKey) {
                      setErrorMsg("未配置 AI 接口密钥。请关闭当前窗口，前往「设置」页面最下方，填写并保存您的 AI API Key 配置。");
                    }
                    setReviewMode("ai");
                  }}
                  className="group border border-[var(--color-border-standard)] hover:border-trade-green/50 bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-hover)] p-6 rounded-2xl flex flex-col gap-4 cursor-pointer transition-all duration-300 hover:shadow-xl relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-trade-green/5 rounded-full blur-2xl group-hover:bg-trade-green/10 transition-colors" />
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-trade-green/10 text-trade-green rounded-xl group-hover:scale-110 transition-transform">
                      <Sparkles size={24} />
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-trade-green/10 text-trade-green font-mono uppercase tracking-wider scale-90">
                      Recommended
                    </span>
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-[var(--color-text-primary)] group-hover:text-trade-green transition-colors">
                      AI 智能深度诊断报告
                    </h5>
                    <p className="text-xxs text-[var(--color-text-secondary)] mt-2 leading-relaxed">
                      AI 导师深度分析胜率与做单纪律，核对各项红线原则，结合当时市场环境，进行逐笔客观点评，警告违规操作并寻找纪律盲点。
                    </p>
                  </div>
                  <div className="mt-auto pt-4 border-t border-[var(--color-border-subtle)] text-[10px] text-[var(--color-text-muted)] flex justify-between items-center">
                    <span>需配置 AI 密钥</span>
                    <span className="font-semibold text-trade-green group-hover:translate-x-1 transition-transform">
                      生成约需 10-20 秒 &rarr;
                    </span>
                  </div>
                </div>

                {/* Option 2: Simple review */}
                <div 
                  onClick={() => setReviewMode("simple")}
                  className="group border border-[var(--color-border-standard)] hover:border-blue-500/50 bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-hover)] p-6 rounded-2xl flex flex-col gap-4 cursor-pointer transition-all duration-300 hover:shadow-xl relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors" />
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl group-hover:scale-110 transition-transform">
                      <FileText size={24} />
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-mono uppercase tracking-wider scale-90">
                      Instant
                    </span>
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-[var(--color-text-primary)] group-hover:text-blue-500 transition-colors">
                      纯交易清单与截图复盘
                    </h5>
                    <p className="text-xxs text-[var(--color-text-secondary)] mt-2 leading-relaxed">
                      快速生成本时段的精美交易报告，包含详细交易数据看板、预设做单纪律原则、每笔订单的详细参数以及完整的做单复盘截图。
                    </p>
                  </div>
                  <div className="mt-auto pt-4 border-t border-[var(--color-border-subtle)] text-[10px] text-[var(--color-text-muted)] flex justify-between items-center">
                    <span>无需 API 密钥与网络</span>
                    <span className="font-semibold text-blue-500 group-hover:translate-x-1 transition-transform">
                      即时生成 &rarr;
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {reviewMode !== null && loading && (
            <div className="flex flex-col items-center justify-center gap-4 py-16 animate-pulse">
              <RefreshCw className="animate-spin text-trade-green" size={32} />
              <div className="flex flex-col items-center gap-1.5">
                <p className="text-xs font-semibold text-trade-green tracking-wider uppercase font-mono">
                  AI Coach is diagnosticating...
                </p>
                <p className="text-xs text-[var(--text-secondary)] font-medium">
                  {loadingSteps[loadingStep]}
                </p>
              </div>
            </div>
          )}

          {reviewMode !== null && errorMsg && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 max-w-md text-center">
              <div className="p-3 rounded-full bg-[var(--trade-red-dim)] text-trade-red">
                <AlertTriangle size={24} />
              </div>
              <h4 className="text-sm font-bold text-[var(--text-primary)]">无法生成复盘报告</h4>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                {errorMsg}
              </p>
              <div className="flex gap-3 mt-2">
                <button onClick={() => {
                  setReviewMode(null);
                  setErrorMsg("");
                  setReportText("");
                }} className="px-4 py-1.5 bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] text-[var(--text-secondary)] text-xs font-bold rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer">
                  返回重新选择
                </button>
                <button onClick={onClose} className="px-4 py-1.5 bg-trade-red text-white text-xs font-bold rounded-lg hover:bg-red-600 transition-colors cursor-pointer">
                  关闭返回
                </button>
              </div>
            </div>
          )}

          {reviewMode !== null && !loading && !errorMsg && (
            <div className="w-full flex flex-col gap-6 items-center">
              
              {/* PDF EXPORT TARGET CONTAINER (Needs custom white background and padding for clean canvas print) */}
              <div className="w-full max-w-[800px] rounded-xl p-8 flex flex-col gap-6" id="pdf-report-content" ref={reportContainerRef} style={{ backgroundColor: "#ffffff", color: "#000000", border: "1px solid #e5e7eb" }}>
                {/* PDF Header Section */}
                <div className="flex items-center justify-between pb-3" style={{ borderBottom: "2px solid #16a34a" }}>
                  <div className="flex flex-col">
                    <h2 className="text-lg font-bold tracking-wide uppercase" style={{ color: "#111827", margin: 0 }}>
                      {reviewMode === "ai" ? "TradeFlow Pro AI 诊断复盘报告" : "TradeFlow Pro 交易复盘清单报告"}
                    </h2>
                    <span className="text-[10px] font-medium mt-0.5" style={{ color: "#6b7280" }}>
                      诊断时段：{periodLabel} {getDateRangeStr() ? `(${getDateRangeStr()})` : `(${getLocalDateStr()})`}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase" style={{ color: "#15803d", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                      {reviewMode === "ai" ? "Trading Coach V1" : "TradeFlow Reporter"}
                    </span>
                  </div>
                </div>

                {/* Conditional Rules Section for Non-AI mode */}
                {reviewMode === "simple" && (
                  <div className="p-4 rounded-lg flex flex-col gap-2 text-left" style={{ backgroundColor: "#f9fafb", border: "1px solid #e5e7eb" }}>
                    <h3 className="text-xs font-bold flex items-center gap-1.5" style={{ color: "#111827", margin: 0, padding: 0, border: "none" }}>
                      <span style={{ display: "inline-block", width: "3px", height: "10px", backgroundColor: "#16a34a", borderRadius: "99px" }} />
                      我的交易做单纪律原则
                    </h3>
                    <ul className="list-disc pl-4 text-[10px] leading-relaxed" style={{ color: "#4b5563", margin: 0 }}>
                      {rules.length > 0 ? (
                        rules.map((rule, idx) => (
                          <li key={rule.id || idx} className="mt-0.5">{rule.content}</li>
                        ))
                      ) : (
                        <li className="list-none" style={{ color: "#9ca3af" }}>暂未配置做单纪律原则</li>
                      )}
                    </ul>
                  </div>
                )}

                {/* Conditional Stats Section for Non-AI mode */}
                {reviewMode === "simple" && (
                  <div className="grid grid-cols-2 gap-4 pb-1">
                    {/* First Row of Stats: Core KPIs */}
                    <div className="col-span-2 grid grid-cols-4 gap-3">
                      <div className="p-3 rounded-lg flex flex-col justify-center items-center text-center" style={{ backgroundColor: "#f9fafb", border: "1px solid #e5e7eb" }}>
                        <span className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: "#6b7280" }}>交易笔数</span>
                        <span className="text-sm font-bold mt-1" style={{ color: "#111827" }}>{totalCount} 笔</span>
                      </div>
                      <div className="p-3 rounded-lg flex flex-col justify-center items-center text-center" style={{ backgroundColor: "#f9fafb", border: "1px solid #e5e7eb" }}>
                        <span className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: "#6b7280" }}>净盈亏</span>
                        <span className="text-sm font-bold mt-1" style={{ color: totalPnl >= 0 ? "#16a34a" : "#dc2626" }}>
                          {totalPnl >= 0 ? "+" : ""}{totalPnl.toFixed(2)}
                        </span>
                      </div>
                      <div className="p-3 rounded-lg flex flex-col justify-center items-center text-center" style={{ backgroundColor: "#f9fafb", border: "1px solid #e5e7eb" }}>
                        <span className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: "#6b7280" }}>胜率</span>
                        <span className="text-sm font-bold mt-1" style={{ color: "#111827" }}>{winRate.toFixed(1)}%</span>
                      </div>
                      <div className="p-3 rounded-lg flex flex-col justify-center items-center text-center" style={{ backgroundColor: "#f9fafb", border: "1px solid #e5e7eb" }}>
                        <span className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: "#6b7280" }}>盈亏比 (RR)</span>
                        <span className="text-sm font-bold mt-1" style={{ color: "#111827" }}>{rr.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Second Row of Stats: Details */}
                    <div className="col-span-2 grid grid-cols-4 gap-3">
                      <div className="p-2.5 rounded-lg flex flex-col justify-center items-center text-center" style={{ backgroundColor: "#ffffff", border: "1px solid #f3f4f6" }}>
                        <span className="text-[8px] uppercase tracking-wider" style={{ color: "#9ca3af" }}>赢 / 输</span>
                        <span className="text-xs font-semibold mt-0.5" style={{ color: "#4b5563" }}>
                          <span style={{ color: "#16a34a" }}>{winTrades.length}</span> <span style={{ color: "#9ca3af" }}>/</span> <span style={{ color: "#dc2626" }}>{loseTrades.length}</span>
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg flex flex-col justify-center items-center text-center" style={{ backgroundColor: "#ffffff", border: "1px solid #f3f4f6" }}>
                        <span className="text-[8px] uppercase tracking-wider" style={{ color: "#9ca3af" }}>平均盈利</span>
                        <span className="text-xs font-semibold mt-0.5" style={{ color: "#16a34a" }}>
                          +{avgWin.toFixed(2)}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg flex flex-col justify-center items-center text-center" style={{ backgroundColor: "#ffffff", border: "1px solid #f3f4f6" }}>
                        <span className="text-[8px] uppercase tracking-wider" style={{ color: "#9ca3af" }}>平均亏损</span>
                        <span className="text-xs font-semibold mt-0.5" style={{ color: "#dc2626" }}>
                          -{avgLoss.toFixed(2)}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg flex flex-col justify-center items-center text-center" style={{ backgroundColor: "#ffffff", border: "1px solid #f3f4f6" }}>
                        <span className="text-[8px] uppercase tracking-wider" style={{ color: "#9ca3af" }}>获利因子</span>
                        <span className="text-xs font-semibold mt-0.5" style={{ color: "#4b5563" }}>
                          {profitFactor.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Review Text Area */}
                {reviewMode === "ai" && (
                  <div 
                    className="flex flex-col gap-1.5 text-xs pr-1 text-left" 
                    style={{ color: "#1f2937" }}
                    dangerouslySetInnerHTML={{ __html: marked.parse(reportText) as string }}
                  />
                )}

                {/* Scoped CSS Styles for Markdown Elements in PDF print area (using Hex colors exclusively) */}
                <style dangerouslySetInnerHTML={{ __html: `
                  #pdf-report-content h1 {
                    font-size: 16px;
                    font-weight: bold;
                    color: #111827;
                    border-bottom: 1px solid #e5e7eb;
                    padding-bottom: 6px;
                    margin-top: 16px;
                    margin-bottom: 8px;
                    text-align: left;
                  }
                  #pdf-report-content h2 {
                    font-size: 14px;
                    font-weight: bold;
                    color: #111827;
                    margin-top: 14px;
                    margin-bottom: 8px;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    text-align: left;
                  }
                  #pdf-report-content h2::before {
                    content: '';
                    display: inline-block;
                    width: 4px;
                    height: 12px;
                    background-color: #22c55e;
                    border-radius: 9999px;
                  }
                  #pdf-report-content h3 {
                    font-size: 12px;
                    font-weight: bold;
                    color: #111827;
                    margin-top: 10px;
                    margin-bottom: 6px;
                    padding-left: 4px;
                    border-left: 2px solid #4b5563;
                    text-align: left;
                  }
                  #pdf-report-content h4 {
                    font-size: 12px;
                    font-weight: bold;
                    color: #111827;
                    margin-top: 8px;
                    margin-bottom: 4px;
                    padding-left: 4px;
                    text-align: left;
                  }
                  #pdf-report-content p {
                    font-size: 12px;
                    color: #374151;
                    line-height: 1.6;
                    margin-top: 4px;
                    margin-bottom: 4px;
                    text-align: left;
                  }
                  #pdf-report-content strong {
                    font-weight: bold;
                    color: #111827;
                  }
                  #pdf-report-content ul {
                    list-style-type: disc;
                    list-style-position: inside;
                    margin-left: 8px;
                    margin-top: 4px;
                    margin-bottom: 4px;
                    text-align: left;
                  }
                  #pdf-report-content ol {
                    list-style-type: decimal;
                    list-style-position: inside;
                    margin-left: 8px;
                    margin-top: 4px;
                    margin-bottom: 4px;
                    text-align: left;
                  }
                  #pdf-report-content li {
                    font-size: 12px;
                    color: #374151;
                    line-height: 1.6;
                    margin-top: 2px;
                    margin-bottom: 2px;
                    text-align: left;
                  }
                  #pdf-report-content table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 12px;
                    margin-bottom: 12px;
                    font-size: 11px;
                    color: #374151;
                    text-align: left;
                  }
                  #pdf-report-content th {
                    background-color: #f3f4f6;
                    color: #111827;
                    font-weight: bold;
                    border: 1px solid #d1d5db;
                    padding: 6px 8px;
                    text-align: left;
                  }
                  #pdf-report-content td {
                    border: 1px solid #e5e7eb;
                    padding: 6px 8px;
                    background-color: #ffffff;
                    text-align: left;
                  }
                  #pdf-report-content tr:nth-child(even) td {
                    background-color: #f9fafb;
                  }
                `}} />

                {/* PDF Screenshots & Trade details section */}
                <div className="pt-5 mt-4 text-left" style={{ borderTop: "1px solid #e5e7eb" }}>
                  <h2 className="text-sm font-bold flex items-center gap-1.5 mb-4" style={{ color: "#111827", margin: 0 }}>
                    <ImageIcon size={14} style={{ color: "#16a34a" }} />
                    本期交易清单 & 截图回顾
                  </h2>
                  <div className="flex flex-col gap-4">
                    {periodTrades.map((trade, idx) => (
                      <div key={trade.id} className="p-4 rounded-lg flex flex-col gap-3" style={{ backgroundColor: "#f9fafb", border: "1px solid #e5e7eb" }}>
                        <div className="flex items-center justify-between flex-wrap gap-2 pb-2" style={{ borderBottom: "1px solid #e5e7eb" }}>
                          <span className="text-sm font-bold" style={{ color: "#1f2937" }}>
                            #{idx + 1} | {String(trade.date).replace("T", " ")} | {trade.symbol} ({trade.direction})
                          </span>
                          <span className="text-sm font-bold px-2 py-0.5 rounded" style={{
                            backgroundColor: trade.pnl > 0 ? "#dcfce7" : trade.pnl < 0 ? "#fee2e2" : "#f3f4f6",
                            color: trade.pnl > 0 ? "#166534" : trade.pnl < 0 ? "#991b1b" : "#1f2937"
                          }}>
                            盈亏: {trade.pnl > 0 ? "+" : ""}{trade.pnl.toFixed(2)}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs leading-relaxed" style={{ color: "#4b5563" }}>
                          <div><span className="font-semibold" style={{ color: "#1f2937" }}>入场理由:</span> {trade.setup}</div>
                          <div><span className="font-semibold" style={{ color: "#1f2937" }}>交易类型:</span> {trade.type}</div>
                          <div><span className="font-semibold" style={{ color: "#1f2937" }}>市场环境:</span> {trade.marketEnv || "无"}</div>
                          <div><span className="font-semibold" style={{ color: "#1f2937" }}>交易过程:</span> {trade.process || "无"}</div>
                          <div><span className="font-semibold" style={{ color: "#1f2937" }}>离场理由:</span> {trade.exitReason}</div>
                          <div><span className="font-semibold" style={{ color: "#1f2937" }}>离场错误:</span> {trade.errorReason || "无"}</div>
                          <div className="col-span-2 mt-1.5 leading-relaxed">
                            <span className="font-semibold block mb-1" style={{ color: "#1f2937" }}>下单思路:</span>
                            {trade.remarks ? (
                              <div className="markdown-body p-2.5 rounded text-xs bg-white border border-gray-100" style={{ color: "#374151" }} dangerouslySetInnerHTML={{ __html: marked.parse(trade.remarks) as string }} />
                            ) : (
                              <span style={{ color: "#9ca3af", fontStyle: "italic" }}>无</span>
                            )}
                          </div>
                          <div className="col-span-2 mt-1.5 leading-relaxed">
                            <span className="font-semibold block mb-1" style={{ color: "#1f2937" }}>自我复盘:</span>
                            {trade.notes ? (
                              <div className="markdown-body p-2.5 rounded text-xs bg-white border border-gray-100" style={{ color: "#374151" }} dangerouslySetInnerHTML={{ __html: marked.parse(trade.notes) as string }} />
                            ) : (
                              <span style={{ color: "#9ca3af", fontStyle: "italic" }}>无</span>
                            )}
                          </div>
                        </div>

                        {/* Embed Local Screenshot images */}
                        {trade.screenshots && trade.screenshots.length > 0 && (
                          <div className="flex flex-col gap-4 mt-2 pt-2" style={{ borderTop: "1px solid #f3f4f6" }}>
                            {trade.screenshots.map((pic) => (
                              <div 
                                key={pic.id} 
                                className="rounded-lg overflow-hidden w-full max-w-[600px] aspect-[16/9] shrink-0 cursor-zoom-in hover:brightness-95 transition-all" 
                                style={{ border: "1px solid #d1d5db", backgroundColor: "#f3f4f6" }}
                                onClick={() => setZoomedImageId(pic.id)}
                              >
                                <ScreenshotImage
                                  screenshotId={pic.id}
                                  alt={pic.filename}
                                  className="w-full h-full object-contain"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* PDF Footer Section */}
                <div className="pt-3 mt-4 flex items-center justify-between text-[9px]" style={{ borderTop: "1px solid #e5e7eb", color: "#9ca3af" }}>
                  <span>由 TradeFlow Pro 自动生成</span>
                  <span>严格执行做单原则，树立合规与纪律</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 mt-2 pb-4 shrink-0">
                <button onClick={handleExportPdf}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-trade-green hover:bg-green-600 text-white font-bold text-xs shadow-md transition-all cursor-pointer">
                  <Download size={14} />
                  导出 PDF / 打印报告
                </button>
                <button onClick={() => {
                  setReviewMode(null);
                  setErrorMsg("");
                  setReportText("");
                }}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] text-[var(--text-secondary)] font-bold text-xs hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer">
                  返回
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
      {zoomedImageId && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm cursor-zoom-out p-4 animate-fade-in"
          onClick={() => setZoomedImageId(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh] flex flex-col items-center">
            <ScreenshotImage
              screenshotId={zoomedImageId}
              alt="Zoomed screenshot"
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl border border-white/10"
            />
            <p className="text-white/70 text-xs mt-3 bg-black/40 px-3 py-1 rounded-full pointer-events-none">
              点击任意处返回
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
