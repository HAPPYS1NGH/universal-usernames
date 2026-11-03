import type { ActivityEntry } from "@/lib/activity/activity";
import { formatEth, formatUsd } from "@/lib/money";
import { formatTimeAgo } from "@/lib/time-ago";

function describe(entry: ActivityEntry): { title: string; detail: string; amount: string; positive: boolean } {
  switch (entry.kind) {
    case "trade": {
      const buy = entry.side === "buy";
      return {
        title: `${buy ? "Bought" : "Sold"} ${formatEth(entry.ethGwei, 6)} ETH`,
        detail: `at ${formatUsd(entry.priceCents)}`,
        amount: `${buy ? "-" : "+"}${formatUsd(entry.usdCents)}`,
        positive: !buy,
      };
    }
    case "sent":
      return {
        title: `Sent to @${entry.counterparty}`,
        detail: "Transfer",
        amount: `-${formatUsd(entry.usdCents)}`,
        positive: false,
      };
    case "received":
      return {
        title: `Received from @${entry.counterparty}`,
        detail: "Transfer",
        amount: `+${formatUsd(entry.usdCents)}`,
        positive: true,
      };
  }
}

export function ActivityList({ entries }: { entries: ActivityEntry[] }) {
  return (
    <section className="rounded-3xl bg-surface ring-1 ring-line">
      <h2 className="px-8 pt-8 pb-4 text-2xl font-semibold tracking-tight">Activity</h2>
      {entries.length === 0 ? (
        <p className="px-8 pb-8 text-lg text-muted">No activity yet. Trades and transfers show up here.</p>
      ) : (
        <ul className="divide-y divide-line">
          {entries.map((entry) => {
            const { title, detail, amount, positive } = describe(entry);
            return (
              <li key={entry.id} className="flex items-center justify-between gap-6 px-8 py-5">
                <div>
                  <p className="text-lg font-medium">{title}</p>
                  <p className="text-muted">
                    {detail} · {formatTimeAgo(entry.at)}
                  </p>
                </div>
                <p className={`text-xl tabular-nums ${positive ? "text-up" : "text-ink"}`}>{amount}</p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
