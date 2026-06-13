"use client";

import { useState, useCallback } from "react";
import type { OptionItem } from "../types";

export interface TradeFormData {
  date: string;
  remarks: string;
  setup: string;
  type: string;
  exitReason: string;
  notes: string;
  positionSize: number;
  direction: string;
  entryPrice: number;
  stopLoss: string;
  takeProfit: string;
  exitPrice1: number;
  exitPrice2: string;
  errorReason: string;
  symbol: string;
}

const defaultForm: TradeFormData = {
  date: new Date().toISOString().split("T")[0],
  remarks: "",
  setup: "",
  type: "趋势延续",
  exitReason: "",
  notes: "",
  positionSize: 1,
  direction: "Long",
  entryPrice: 0,
  stopLoss: "",
  takeProfit: "",
  exitPrice1: 0,
  exitPrice2: "",
  errorReason: "",
  symbol: ""
};

export function useTradeForm() {
  const [tradeForm, setTradeForm] = useState<TradeFormData>(defaultForm);
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);

  const calculateLivePnl = useCallback((form: TradeFormData): number => {
    const entry = Number(form.entryPrice) || 0;
    const exit1 = Number(form.exitPrice1) || 0;
    const exit2 = form.exitPrice2 ? Number(form.exitPrice2) : null;
    const size = Number(form.positionSize) || 0;
    const dir = form.direction;

    if (exit2 === null || isNaN(exit2) || exit2 === 0) {
      if (dir === "Long") {
        return (exit1 - entry) * size;
      } else {
        return (entry - exit1) * size;
      }
    } else {
      if (dir === "Long") {
        return (exit1 - entry) * (size / 2) + (exit2 - entry) * (size / 2);
      } else {
        return (entry - exit1) * (size / 2) + (entry - exit2) * (size / 2);
      }
    }
  }, []);

  const calculateLiveRR = useCallback((form: TradeFormData): number | null => {
    const entry = Number(form.entryPrice) || 0;
    const sl = Number(form.stopLoss) || 0;
    const tp = Number(form.takeProfit) || 0;
    const dir = form.direction;

    if (!sl || !tp || !entry) return null;

    let risk: number, reward: number;
    if (dir === "Long") {
      risk = entry - sl;
      reward = tp - entry;
    } else {
      risk = sl - entry;
      reward = entry - tp;
    }

    if (risk <= 0 || reward <= 0) return null;
    return parseFloat((reward / risk).toFixed(2));
  }, []);

  const resetNewTradeForm = useCallback((setups: OptionItem[], exits: OptionItem[], symbols: OptionItem[]) => {
    setTradeForm({
      ...defaultForm,
      setup: setups[0]?.name || "",
      exitReason: exits[0]?.name || "",
      symbol: symbols[0]?.name || ""
    });
  }, []);

  const populateEditForm = useCallback((trade: any) => {
    setTradeForm({
      date: new Date(trade.date).toISOString().split("T")[0],
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
      symbol: trade.symbol
    });
  }, []);

  return {
    tradeForm,
    setTradeForm,
    inlineEditingId,
    setInlineEditingId,
    calculateLivePnl,
    calculateLiveRR,
    resetNewTradeForm,
    populateEditForm
  };
}
