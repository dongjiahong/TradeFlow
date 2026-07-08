export interface Trade {
  id: string;
  date: Date | string;
  remarks: string | null;
  setup: string;
  type: string;
  exitReason: string;
  notes: string | null;
  positionSize: number;
  direction: string;
  entryPrice: number;
  stopLoss: number | null;
  takeProfit: number | null;
  exitPrice1: number;
  exitPrice2: number | null;
  pnl: number;
  rr: number | null;
  status: string;
  symbol: string;
  errorReason: string | null;
  process: string | null;
  marketEnv: string | null;
  fee?: number;
  screenshots?: { id: string; filename: string }[];
}

export interface OptionItem {
  id?: string | number;
  name: string;
}

export interface TradingRule {
  id?: number;
  content: string;
  createdAt: number;
}

export function getRuleStyle(content: string) {
  if (/禁止|不要|不能|严禁|别做|别看|忌/.test(content)) {
    return {
      bg: "bg-red-500/5 dark:bg-red-500/10 hover:bg-red-500/10",
      borderColor: "border-l-trade-red",
      icon: "🚨",
      badge: "忌"
    };
  }
  if (/必须|需要|确认|设定|先.*再|要/.test(content)) {
    return {
      bg: "bg-amber-500/5 dark:bg-amber-500/10 hover:bg-amber-500/10",
      borderColor: "border-l-amber-500",
      icon: "⚠️",
      badge: "律"
    };
  }
  return {
    bg: "bg-emerald-500/5 dark:bg-emerald-500/10 hover:bg-emerald-500/10",
    borderColor: "border-l-trade-green",
    icon: "💡",
    badge: "策"
  };
}

