import type { ActivityEntry } from "@/lib/activity/activity";
import type { AvatarChoice } from "@/lib/avatars/avatar-store";
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
        amount: `${buy ? "−" : "+"}${formatUsd(entry.usdCents)}`,
        positive: !buy,
      };
    }
    case "sent":
      return {
        title: `Sent to @${entry.counterparty}`,
        detail: "Transfer",
        amount: `−${formatUsd(entry.usdCents)}`,
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

type ActivityListProps = {
  entries: ActivityEntry[];
  // Avatars of the people in transfers, by username.
  avatars: Map<string, AvatarChoice>;
};

export function ActivityList({ entries, avatars }: ActivityListProps) {
  return (
    <section aria-labelledby="activity-heading">
      <h2 id="activity-heading" className="mb-2 px-1 text-[0.9375rem] font-medium text-muted">
        Activity
      </h2>
      {entries.length === 0 ? (
        <p className="rounded-card bg-surface p-5 text-[0.9375rem] font-medium text-muted shadow-card">
          No activity yet. Trades and transfers show up here.
        </p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-card bg-surface shadow-card">
          {entries.map((entry) => {
            const { title, detail, amount, positive } = describe(entry);
            return (
              <li key={entry.id} className="flex min-h-16 items-center gap-3 px-4 py-2.5">
                {entry.kind === "trade" ? (
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-fill">
                    <EthIcon className="size-6" />
                  </span>
                ) : (
                  <UserAvatar username={entry.counterparty} avatar={avatars.get(entry.counterparty) ?? null} />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold tracking-[-0.01em] [overflow-wrap:anywhere]">{title}</p>
                  <p className="text-[0.8125rem] font-medium text-muted">
                    {detail} · {formatTimeAgo(entry.at)}
                  </p>
                </div>
                <p className={`shrink-0 font-bold tabular-nums ${positive ? "text-up" : "text-ink"}`}>{amount}</p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
