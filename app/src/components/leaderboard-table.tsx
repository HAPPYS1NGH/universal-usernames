import type { AvatarChoice } from "@/lib/avatars/avatar-store";
import { formatPercent, formatUsd } from "@/lib/money";
import type { LeaderboardEntry } from "@/lib/portfolio/portfolio-queries";
import { UserAvatar } from "./user-avatar";

type LeaderboardTableProps = {
  entries: LeaderboardEntry[];
  currentUsername: string | null;
  avatars: Map<string, AvatarChoice>;
};

function pnlTone(percent: number | null): string {
  // Match formatPercent's one-decimal rounding so "0.0%" is never colored.
  const rounded = percent === null ? 0 : Math.round(percent * 10);
  if (rounded === 0) return "text-muted";
  return rounded > 0 ? "text-up" : "text-down";
}

export function LeaderboardTable({ entries, currentUsername, avatars }: LeaderboardTableProps) {
  if (entries.length === 0) {
    return (
      <p className="rounded-card bg-surface p-5 text-[0.9375rem] font-medium text-muted shadow-card">
        No traders yet. Create an account to take the top spot.
      </p>
    );
  }

  return (
    <ol className="divide-y divide-line overflow-hidden rounded-card bg-surface shadow-card">
      {entries.map((entry) => {
        const isYou = entry.username === currentUsername;
        return (
          <li
            key={entry.userId}
            className={`flex min-h-[4.25rem] items-center gap-3 py-2.5 pr-4 pl-3 ${isYou ? "bg-accent-soft/50" : ""}`}
          >
            <span className="w-6 shrink-0 text-center text-[0.9375rem] font-bold text-muted tabular-nums">
              <span className="sr-only">Rank </span>
              {entry.rank}
            </span>
            <UserAvatar username={entry.username} avatar={avatars.get(entry.username) ?? null} />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-x-2 text-[1.0625rem] font-semibold tracking-[-0.02em]">
                <span className="[overflow-wrap:anywhere]">@{entry.username}</span>
                {isYou && (
                  <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[0.75rem] font-bold tracking-normal text-white">
                    You
                  </span>
                )}
              </p>
            </div>
            <div className="shrink-0 text-right tabular-nums">
              <p className="text-[1.0625rem] font-semibold">
                <span className="sr-only">Portfolio value </span>
                {formatUsd(entry.valueCents)}
              </p>
              <p className={`text-[0.875rem] font-semibold ${pnlTone(entry.pnlPercent)}`}>
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
