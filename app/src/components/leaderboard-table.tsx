import { formatPercent, formatUsd } from "@/lib/money";
import type { LeaderboardEntry } from "@/lib/portfolio/portfolio-queries";

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
      <p className="rounded-3xl bg-surface p-8 text-lg text-muted ring-1 ring-line">
        No traders yet. Create an account to take the top spot.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-3xl bg-surface ring-1 ring-line">
      <table className="w-full text-left text-xl">
        <thead>
          <tr className="border-b border-line text-base text-muted">
            <th scope="col" className="w-24 py-5 pl-8 font-medium">
              Rank
            </th>
            <th scope="col" className="py-5 font-medium">
              Trader
            </th>
            <th scope="col" className="py-5 text-right font-medium">
              Portfolio value
            </th>
            <th scope="col" className="py-5 pr-8 text-right font-medium">
              PnL
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {entries.map((entry) => {
            const isYou = entry.username === currentUsername;
            return (
              <tr key={entry.userId} className={isYou ? "bg-canvas" : undefined}>
                <td className="py-5 pl-8 text-muted tabular-nums">{entry.rank}</td>
                <td className="py-5 font-semibold">
                  @{entry.username}
                  {isYou && (
                    <span className="ml-3 rounded-full bg-ink px-3 py-1 align-middle text-sm font-medium text-surface">
                      You
                    </span>
                  )}
                </td>
                <td className="py-5 text-right tabular-nums">{formatUsd(entry.valueCents)}</td>
                <td className={`py-5 pr-8 text-right font-semibold tabular-nums ${pnlTone(entry.pnlPercent)}`}>
                  {formatPercent(entry.pnlPercent)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
