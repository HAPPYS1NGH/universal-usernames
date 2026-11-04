// Text color for a PnL percentage. Uses formatPercent's one-decimal rounding,
// so a value displayed as "0.0%" is never colored.
export function pnlToneClass(percent: number | null): string {
  const rounded = percent === null ? 0 : Math.round(percent * 10);
  if (rounded === 0) return "text-muted";
  return rounded > 0 ? "text-up" : "text-down";
}
