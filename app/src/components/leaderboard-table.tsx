import { formatPercent, formatUsd } from "@/lib/money";
import type { LeaderboardEntry } from "@/lib/portfolio/portfolio-queries";
import { UserAvatar } from "./user-avatar";

type LeaderboardTableProps = {
  entries: LeaderboardEntry[];
  currentUsername: string | null;
};

function pnlTone(percent: number | null): string {
  // Match formatPercent's one-decimal rounding so "0.0%" is never colored.
  const rounded = percent === null ? 0 : Math.round(percent * 10);
  if (rounded === 0) return "text-muted";
  return rounded > 0 ? "text-up" : "text-down";
}

export function LeaderboardTable({ entries, currentUsername }: LeaderboardTableProps) {
  if (entries.length === 0) {
    return (
      <p className="rounded-[1.75rem] bg-surface p-4 text-lg text-muted">
        No traders yet. Create an account to take the top spot.
      </p>
    );
  }

  return (
    <ol className="-mx-2 flex flex-col">
      {entries.map((entry) => {
        const isYou = entry.username === currentUsername;
        return (
          <li
            key={entry.userId}
            className={`flex items-center gap-3 rounded-2xl px-2 py-3 ${isYou ? "bg-surface ring-1 ring-line" : ""}`}
          >
            <span className="w-7 shrink-0 text-center text-lg font-semibold text-muted tabular-nums">
              <span className="sr-only">Rank </span>
              {entry.rank}
            </span>
            <UserAvatar username={entry.username} />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-x-2 text-lg font-semibold">
                <span className="[overflow-wrap:anywhere]">@{entry.username}</span>
                {isYou && (
                  <span className="shrink-0 rounded-full bg-ink px-2 py-0.5 text-xs font-semibold text-canvas">
                    You
                  </span>
                )}
              </p>
            </div>
            <div className="shrink-0 text-right tabular-nums">
              <p className="text-lg font-semibold">
                <span className="sr-only">Portfolio value </span>
                {formatUsd(entry.valueCents)}
              </p>
              <p className={`font-semibold ${pnlTone(entry.pnlPercent)}`}>
                <span className="sr-only">PnL </span>
                {formatPercent(entry.pnlPercent)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
