import { getTrades, getDiaryEntries, getConfigOptions } from "./actions";
import TradingApp from "../components/TradingApp";

export const dynamic = "force-dynamic";

export default async function Home() {
  // 1. Fetch initial data from SQLite
  const tradesData = await getTrades();
  const diaryEntriesData = await getDiaryEntries();
  const { setups, errors, exits, symbols } = await getConfigOptions();

  // 2. Serialize Dates to string to prevent Next.js Client Component serialization warnings
  const trades = tradesData.map(t => ({
    id: t.id,
    date: t.date.toISOString(),
    remarks: t.remarks,
    setup: t.setup,
    type: t.type,
    exitReason: t.exitReason,
    notes: t.notes,
    positionSize: t.positionSize,
    direction: t.direction,
    entryPrice: t.entryPrice,
    exitPrice1: t.exitPrice1,
    exitPrice2: t.exitPrice2,
    pnl: t.pnl,
    status: t.status,
    symbol: t.symbol,
    errorReason: t.errorReason,
    screenshots: t.screenshots,
  }));

  const diaryEntries = diaryEntriesData.map(d => ({
    id: d.id,
    date: d.date.toISOString(),
    ruleExecuted: d.ruleExecuted,
    emotionStable: d.emotionStable,
    recordKept: d.recordKept,
    prepared: d.prepared,
    noFomo: d.noFomo,
    pnl: d.pnl,
    remarks: d.remarks,
  }));

  return (
    <TradingApp
      initialTrades={trades}
      initialDiaryEntries={diaryEntries}
      initialSetups={setups}
      initialErrors={errors}
      initialExits={exits}
      initialSymbols={symbols}
    />
  );
}
