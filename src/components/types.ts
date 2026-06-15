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
  screenshots?: { id: string; filename: string }[];
}

export interface OptionItem {
  id?: string | number;
  name: string;
}

export interface TradingRule {
  id?: number;
  content: string;
  type: "do" | "dont";
  createdAt: number;
}

export interface TradingAppProps {
  initialTrades: Trade[];
  initialSetups: OptionItem[];
  initialErrors: OptionItem[];
  initialExits: OptionItem[];
  initialSymbols: OptionItem[];
  initialProcesses: OptionItem[];
}
