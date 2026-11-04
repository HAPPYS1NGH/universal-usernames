import Link from "next/link";
import type { AvatarChoice } from "@/lib/avatars/avatar-store";
import { formatPercent, formatUsd } from "@/lib/money";
import type { LeaderboardEntry } from "@/lib/portfolio/portfolio-queries";
import { pnlToneClass } from "./pnl-tone";
import { UserAvatar } from "./user-avatar";

type LeaderboardTableProps = {
  entries: LeaderboardEntry[];
  currentUsername: string | null;
  avatars: Map<string, AvatarChoice>;
};

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
            className={`relative flex min-h-[4.25rem] items-center gap-3 py-2.5 pr-4 pl-3 transition-colors duration-150 ease-out ${isYou ? "bg-accent-soft/50" : "hover:bg-canvas"}`}
          >
            <span className="w-6 shrink-0 text-center text-[0.9375rem] font-bold text-muted tabular-nums">
              <span className="sr-only">Rank </span>
              {entry.rank}
            </span>
            <UserAvatar username={entry.username} avatar={avatars.get(entry.username) ?? null} />
            {/* The username spans both lines, centered beside value over PnL. PnL gets a track of its
                own, so a second line on the left only has to clear the short PnL figure. */}
            <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto_auto] items-baseline gap-x-3">
              <p className="row-span-2 flex min-w-0 flex-wrap items-center gap-x-2 self-center text-[1.0625rem] font-semibold tracking-[-0.02em]">
                {/* The link's ::after covers the row, so the whole row opens the profile. */}
                <Link
                  href={`/u/${entry.username}`}
                  className="[overflow-wrap:anywhere] after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-ink"
                >
                  @{entry.username}
                </Link>
                {isYou && (
                  <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[0.75rem] font-bold tracking-normal text-white">
                    You
                  </span>
                )}
              </p>
              <p className="col-span-2 text-right text-[1.0625rem] font-semibold tabular-nums">
                <span className="sr-only">Portfolio value </span>
                {formatUsd(entry.valueCents)}
              </p>
              <p className={`col-start-3 text-right text-[0.875rem] font-semibold tabular-nums ${pnlToneClass(entry.pnlPercent)}`}>
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
