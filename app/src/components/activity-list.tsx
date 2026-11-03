import type { ActivityEntry } from "@/lib/activity/activity";
import { formatEth, formatUsd } from "@/lib/money";
import { formatTimeAgo } from "@/lib/time-ago";
import { EthIcon } from "./icons";
import { UserAvatar } from "./user-avatar";

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
    <section aria-labelledby="activity-heading">
      <h2 id="activity-heading" className="text-xl font-semibold tracking-tight">
        Activity
      </h2>
      {entries.length === 0 ? (
        <p className="mt-3 rounded-[1.75rem] bg-surface p-4 text-muted">
          No activity yet. Trades and transfers show up here.
        </p>
      ) : (
        <ul className="mt-2">
          {entries.map((entry) => {
            const { title, detail, amount, positive } = describe(entry);
            return (
              <li key={entry.id} className="flex items-center gap-3 py-3">
                {entry.kind === "trade" ? (
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-surface">
                    <EthIcon className="size-6" />
                  </span>
                ) : (
                  <UserAvatar username={entry.counterparty} />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold [overflow-wrap:anywhere]">{title}</p>
                  <p className="text-muted">
                    {detail} · {formatTimeAgo(entry.at)}
                  </p>
                </div>
                <p className={`shrink-0 text-lg font-semibold tabular-nums ${positive ? "text-up" : "text-ink"}`}>
                  {amount}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
