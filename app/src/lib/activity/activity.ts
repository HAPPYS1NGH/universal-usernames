import type { Db } from "@/lib/db/connection";
import type { TradeSide } from "@/lib/trading/execute-trade";

export type ActivityEntry =
  | { kind: "trade"; id: string; side: TradeSide; usdCents: number; ethGwei: number; priceCents: number; at: number }
  | { kind: "sent" | "received"; id: string; usdCents: number; counterparty: string; at: number };

type ActivityRow = {
  kind: "trade" | "sent" | "received";
  id: number;
  side: TradeSide | null;
  usdCents: number;
  ethGwei: number | null;
  priceCents: number | null;
  counterparty: string | null;
  at: number;
};

const ACTIVITY_SQL = `
  SELECT 'trade' AS kind, id, side, usd_cents AS usdCents, eth_gwei AS ethGwei,
         price_cents AS priceCents, NULL AS counterparty, created_at AS at
  FROM trades WHERE user_id = @userId
  UNION ALL
  SELECT 'sent', t.id, NULL, t.amount_cents, NULL, NULL, u.username, t.created_at
  FROM transfers t JOIN users u ON u.id = t.to_user_id WHERE t.from_user_id = @userId
  UNION ALL
  SELECT 'received', t.id, NULL, t.amount_cents, NULL, NULL, u.username, t.created_at
  FROM transfers t JOIN users u ON u.id = t.from_user_id WHERE t.to_user_id = @userId
  ORDER BY at DESC, id DESC
  LIMIT @limit
`;

function toEntry(row: ActivityRow): ActivityEntry {
  const id = `${row.kind}-${row.id}`;
  if (row.kind === "trade") {
    return {
      kind: "trade",
      id,
      side: row.side as TradeSide,
      usdCents: row.usdCents,
      ethGwei: row.ethGwei as number,
      priceCents: row.priceCents as number,
      at: row.at,
    };
  }
  return { kind: row.kind, id, usdCents: row.usdCents, counterparty: row.counterparty as string, at: row.at };
}

export function getRecentActivity(db: Db, userId: number, limit = 20): ActivityEntry[] {
  return db
    .prepare<[{ userId: number; limit: number }], ActivityRow>(ACTIVITY_SQL)
    .all({ userId, limit })
    .map(toEntry);
}
