"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, ScrollText, Download, RefreshCw, AlertTriangle, Image as ImageIcon } from "lucide-react";
import { db } from "../lib/db";
import ScreenshotImage from "./ScreenshotImage";
import type { Trade, TradingRule } from "./types";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { marked } from "marked";

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
    // 锁定背景滚动，解决滑动冲突问题
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

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
  }, [period]);



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
        <div className={`flex-1 overflow-y-auto p-6 flex flex-col items-center ${loading || errorMsg ? "justify-center" : "justify-start"}`}>
          
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
              <div className="w-full max-w-[800px] rounded-xl p-8 flex flex-col gap-6" id="pdf-report-content" ref={reportContainerRef} style={{ backgroundColor: "#ffffff", color: "#000000", border: "1px solid #e5e7eb" }}>
                {/* PDF Header Section */}
                <div className="flex items-center justify-between pb-3" style={{ borderBottom: "2px solid #16a34a" }}>
                  <div className="flex flex-col">
                    <h2 className="text-lg font-bold tracking-wide uppercase" style={{ color: "#111827" }}>TradeFlow Pro AI 诊断复盘报告</h2>
                    <span className="text-[10px] font-medium mt-0.5" style={{ color: "#6b7280" }}>诊断时段：{periodLabel} ({getLocalDateStr()})</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase" style={{ color: "#15803d", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                      Trading Coach V1
                    </span>
                  </div>
                </div>

                {/* AI Review Text Area */}
                <div 
                  className="flex flex-col gap-1.5 text-xs pr-1" 
                  style={{ color: "#1f2937" }}
                  dangerouslySetInnerHTML={{ __html: marked.parse(reportText) as string }}
                />

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
                  }
                  #pdf-report-content h4 {
                    font-size: 12px;
                    font-weight: bold;
                    color: #111827;
                    margin-top: 8px;
                    margin-bottom: 4px;
                    padding-left: 4px;
                  }
                  #pdf-report-content p {
                    font-size: 12px;
                    color: #374151;
                    line-height: 1.6;
                    margin-top: 4px;
                    margin-bottom: 4px;
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
                  }
                  #pdf-report-content ol {
                    list-style-type: decimal;
                    list-style-position: inside;
                    margin-left: 8px;
                    margin-top: 4px;
                    margin-bottom: 4px;
                  }
                  #pdf-report-content li {
                    font-size: 12px;
                    color: #374151;
                    line-height: 1.6;
                    margin-top: 2px;
                    margin-bottom: 2px;
                  }
                  #pdf-report-content table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 12px;
                    margin-bottom: 12px;
                    font-size: 11px;
                    color: #374151;
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
                  }
                  #pdf-report-content tr:nth-child(even) td {
                    background-color: #f9fafb;
                  }
                `}} />

                {/* PDF Screenshots & Trade details section */}
                <div className="pt-5 mt-4" style={{ borderTop: "1px solid #e5e7eb" }}>
                  <h2 className="text-sm font-bold flex items-center gap-1.5 mb-4" style={{ color: "#111827" }}>
                    <ImageIcon size={14} style={{ color: "#16a34a" }} />
                    本期交易清单 & 截图回顾
                  </h2>
                  <div className="flex flex-col gap-4">
                    {periodTrades.map((trade, idx) => (
                      <div key={trade.id} className="p-4 rounded-lg flex flex-col gap-3" style={{ backgroundColor: "#f9fafb", border: "1px solid #e5e7eb" }}>
                        <div className="flex items-center justify-between flex-wrap gap-2 pb-2" style={{ borderBottom: "1px solid #e5e7eb" }}>
                          <span className="text-xs font-bold" style={{ color: "#1f2937" }}>
                            #{idx + 1} | {String(trade.date).replace("T", " ")} | {trade.symbol} ({trade.direction})
                          </span>
                          <span className="text-xs font-bold px-2 py-0.5 rounded" style={{
                            backgroundColor: trade.pnl > 0 ? "#dcfce7" : trade.pnl < 0 ? "#fee2e2" : "#f3f4f6",
                            color: trade.pnl > 0 ? "#166534" : trade.pnl < 0 ? "#991b1b" : "#1f2937"
                          }}>
                            盈亏: {trade.pnl > 0 ? "+" : ""}{trade.pnl.toFixed(2)}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px]" style={{ color: "#4b5563" }}>
                          <div><span className="font-semibold" style={{ color: "#1f2937" }}>入场理由:</span> {trade.setup}</div>
                          <div><span className="font-semibold" style={{ color: "#1f2937" }}>交易类型:</span> {trade.type}</div>
                          <div><span className="font-semibold" style={{ color: "#1f2937" }}>市场环境:</span> {trade.marketEnv || "无"}</div>
                          <div><span className="font-semibold" style={{ color: "#1f2937" }}>交易过程:</span> {trade.process || "无"}</div>
                          <div><span className="font-semibold" style={{ color: "#1f2937" }}>离场理由:</span> {trade.exitReason}</div>
                          <div><span className="font-semibold" style={{ color: "#1f2937" }}>离场错误:</span> {trade.errorReason || "无"}</div>
                          <div className="col-span-2 mt-1 leading-relaxed">
                            <span className="font-semibold" style={{ color: "#1f2937" }}>备注与复盘:</span> {trade.remarks || "无备注"} {trade.notes ? `| ${trade.notes}` : ""}
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
