const relativeTime = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
];

export function formatTimeAgo(timestamp: number, now = Date.now()): string {
  const elapsed = now - timestamp;
  for (const [unit, ms] of UNITS) {
    if (elapsed >= ms) return relativeTime.format(-Math.floor(elapsed / ms), unit);
  }
  return "just now";
}
