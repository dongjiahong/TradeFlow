"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, ScrollText, Download, RefreshCw, AlertTriangle, Image as ImageIcon } from "lucide-react";
import { db } from "../lib/db";
import ScreenshotImage from "./ScreenshotImage";
import type { Trade, TradingRule } from "./types";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface AiReviewModalProps {
  period: "today" | "week" | "month" | "all";
  trades: Trade[];
  rules: TradingRule[];
  onClose: () => void;
}

export default function AiReviewModal({ period, trades, rules, onClose }: AiReviewModalProps) {
  const [loading, setLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [reportText, setReportText] = useState("");
  const [isExportingPdf, setIsExportingPdf] = useState(false);

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

  // 2. 模拟 loading 文字切换并在组件载入时请求 AI
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
        date: String(t.date).split("T")[0],
        symbol: t.symbol,
        direction: t.direction,
        setup: t.setup,
        type: t.type,
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

      const doRulesStr = rules.filter(r => r.type === "do").map(r => r.content).join("\n- ");
      const dontRulesStr = rules.filter(r => r.type === "dont").map(r => r.content).join("\n- ");

      const systemPrompt = `你是一个资深的专业交易教练。请根据下面提供的交易日志数据（包含总体盈亏、各笔交易的明细及交易员的自我复盘），以及交易员自己定下的“做单原则”，撰写一份专业的交易复盘总结报告。

做单原则包括：
- 应做交易原则 (DO):
${doRulesStr ? "- " + doRulesStr : "暂无"}
- 忌做交易原则 (DON'T):
${dontRulesStr ? "- " + dontRulesStr : "暂无"}

报告格式要求（请严格使用清晰的 Markdown 格式输出，内容不要超过 1500 字）：
1. 整体交易状况总结：分析整体表现、胜率、盈亏比、主要错误归因。特别是核对交易员在整体上是否遵守了上面列出的“应做”与“忌做”做单原则，并给出系统性的纪律改进建议。
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
  }, [period]);

  // 3. 极简的 Markdown 前端行解析器
  const renderMarkdown = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, idx) => {
      const trimmed = line.trim();
      
      // H1 / H2 / H3
      if (trimmed.startsWith("# ")) {
        return <h1 key={idx} className="text-base font-bold text-[var(--text-primary)] border-b border-[var(--color-border-subtle)] pb-1.5 mt-4 mb-2">{trimmed.replace("# ", "")}</h1>;
      }
      if (trimmed.startsWith("## ")) {
        return <h2 key={idx} className="text-sm font-bold text-[var(--text-primary)] mt-3 mb-1.5 flex items-center gap-1.5"><span className="w-1 h-3 bg-trade-green rounded-full"></span>{trimmed.replace("## ", "")}</h2>;
      }
      if (trimmed.startsWith("### ")) {
        return <h3 key={idx} className="text-xs font-bold text-[var(--text-primary)] mt-2 mb-1 pl-1 border-l-2 border-[var(--color-border-strong)]">{trimmed.replace("### ", "")}</h3>;
      }
      // List
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        const parsedText = parseBoldText(trimmed.substring(2));
        return <li key={idx} className="text-xs text-[var(--text-secondary)] list-disc list-inside ml-2 py-0.5 leading-relaxed">{parsedText}</li>;
      }
      // Ordered List
      if (/^\d+\.\s/.test(trimmed)) {
        const content = trimmed.replace(/^\d+\.\s/, "");
        return <li key={idx} className="text-xs text-[var(--text-secondary)] list-decimal list-inside ml-2 py-0.5 leading-relaxed">{parseBoldText(content)}</li>;
      }
      // Empty line
      if (trimmed === "") {
        return <div key={idx} className="h-1.5" />;
      }
      // Standard paragraph
      return <p key={idx} className="text-xs text-[var(--text-secondary)] leading-relaxed py-0.5">{parseBoldText(trimmed)}</p>;
    });
  };

  // 粗体解析助手
  const parseBoldText = (str: string) => {
    const parts = str.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return <strong key={index} className="font-bold text-[var(--text-primary)]">{part}</strong>;
      }
      return part;
    });
  };

  // 4. 调用 html2canvas + jsPDF 导出 PDF 
  const handleExportPdf = async () => {
    const element = reportContainerRef.current;
    if (!element) return;

    setIsExportingPdf(true);
    try {
      // 开启 useCORS 支持 Canvas 抓取
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF("p", "pt", "a4");

      const imgWidth = 595.28; // A4 宽度 (pt)
      const pageHeight = 841.89; // A4 高度 (pt)
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // 第一页
      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // 分页写入
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const todayStr = new Date().toISOString().split("T")[0];
      pdf.save(`TradeFlow_AI_Review_${period}_${todayStr}.pdf`);
    } catch (err) {
      console.error("Failed to generate PDF:", err);
      alert("生成 PDF 出错，请检查截图或重试。");
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 md:p-6 animate-fade-in">
      <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-standard)] rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] px-6 py-4 bg-[var(--color-bg-canvas)]/30 shrink-0">
          <div className="flex items-center gap-2">
            <ScrollText className="text-trade-green" size={18} />
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              {periodLabel}交易 AI 诊断点评报告
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--color-bg-hover)] text-[var(--text-secondary)] transition-colors cursor-pointer">
            <X size={16} />
          </button>
        </div>

        {/* Content Main Area */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center">
          
          {loading && (
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

          {errorMsg && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 max-w-md text-center">
              <div className="p-3 rounded-full bg-[var(--trade-red-dim)] text-trade-red">
                <AlertTriangle size={24} />
              </div>
              <h4 className="text-sm font-bold text-[var(--text-primary)]">无法生成复盘报告</h4>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                {errorMsg}
              </p>
              <button onClick={onClose} className="mt-2 px-4 py-1.5 bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] text-[var(--text-secondary)] text-xs font-bold rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer">
                关闭返回
              </button>
            </div>
          )}

          {!loading && !errorMsg && (
            <div className="w-full flex flex-col gap-6 items-center">
              
              {/* PDF EXPORT TARGET CONTAINER (Needs custom white background and padding for clean canvas print) */}
              <div className="w-full max-w-[800px] border border-[var(--color-border-subtle)] rounded-xl bg-white text-black p-8 shadow-sm flex flex-col gap-6" id="pdf-report-content" ref={reportContainerRef}>
                {/* PDF Header Section */}
                <div className="flex items-center justify-between border-b-2 border-green-600 pb-3">
                  <div className="flex flex-col">
                    <h2 className="text-lg font-bold text-gray-900 tracking-wide uppercase">TradeFlow Pro AI 诊断复盘报告</h2>
                    <span className="text-[10px] text-gray-500 font-medium mt-0.5">诊断时段：{periodLabel} ({getLocalDateStr()})</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full uppercase">
                      Trading Coach V1
                    </span>
                  </div>
                </div>

                {/* AI Review Text Area */}
                <div className="text-gray-800 flex flex-col gap-1.5 text-xs pr-1">
                  {renderMarkdown(reportText)}
                </div>

                {/* PDF Screenshots & Trade details section */}
                <div className="border-t border-gray-200 pt-5 mt-4">
                  <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5 mb-4">
                    <ImageIcon size={14} className="text-green-600" />
                    本期交易清单 & 截图回顾
                  </h2>
                  <div className="flex flex-col gap-4">
                    {periodTrades.map((trade, idx) => (
                      <div key={trade.id} className="p-4 rounded-lg bg-gray-50 border border-gray-200 flex flex-col gap-3">
                        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-gray-200 pb-2">
                          <span className="text-xs font-bold text-gray-800">
                            #{idx + 1} | {String(trade.date).split("T")[0]} | {trade.symbol} ({trade.direction})
                          </span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                            trade.pnl > 0 ? "bg-green-100 text-green-800" : trade.pnl < 0 ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-800"
                          }`}>
                            盈亏: {trade.pnl > 0 ? "+" : ""}{trade.pnl.toFixed(2)}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px] text-gray-600">
                          <div><span className="font-semibold text-gray-800">入场理由:</span> {trade.setup}</div>
                          <div><span className="font-semibold text-gray-800">交易类型:</span> {trade.type}</div>
                          <div><span className="font-semibold text-gray-800">离场理由:</span> {trade.exitReason}</div>
                          <div><span className="font-semibold text-gray-800">离场错误:</span> {trade.errorReason || "无"}</div>
                          <div className="col-span-2 mt-1 leading-relaxed">
                            <span className="font-semibold text-gray-800">备注与复盘:</span> {trade.remarks || "无备注"} {trade.notes ? `| ${trade.notes}` : ""}
                          </div>
                        </div>

                        {/* Embed Local Screenshot images */}
                        {trade.screenshots && trade.screenshots.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-gray-200/50">
                            {trade.screenshots.map((pic) => (
                              <div key={pic.id} className="rounded-lg overflow-hidden border border-gray-300 w-[120px] aspect-[16/9] bg-gray-100 shrink-0">
                                <ScreenshotImage
                                  screenshotId={pic.id}
                                  alt={pic.filename}
                                  className="w-full h-full object-cover"
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
                <div className="border-t border-gray-200 pt-3 mt-4 flex items-center justify-between text-[9px] text-gray-400">
                  <span>由 TradeFlow Pro 自动生成</span>
                  <span>严格执行做单原则，树立合规与纪律</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 mt-2 pb-4 shrink-0">
                <button onClick={handleExportPdf} disabled={isExportingPdf}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-trade-green hover:bg-green-600 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50">
                  {isExportingPdf ? (
                    <>
                      <RefreshCw className="animate-spin" size={14} />
                      正在导出 PDF...
                    </>
                  ) : (
                    <>
                      <Download size={14} />
                      导出 PDF 总结文档
                    </>
                  )}
                </button>
                <button onClick={onClose}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] text-[var(--text-secondary)] font-bold text-xs hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer">
                  关闭报告
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
