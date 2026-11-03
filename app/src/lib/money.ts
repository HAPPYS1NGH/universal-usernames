// Money is stored as integers: USD in cents, paper ETH in gwei (1e-9 ETH).
// Products of the two can exceed 2^53, so conversions go through BigInt.

const GWEI_PER_ETH = 1_000_000_000n;
const WEI_PER_ETH = 10n ** 18n;
const MAX_INPUT_CENTS = 1_000_000_000_00;

// "nearest" is for display and valuation; "down" is for paying out, so a
// sale never pays more than the ETH is worth.
export function ethValueCents(ethGwei: number, priceCents: number, rounding: "down" | "nearest"): number {
  const product = BigInt(ethGwei) * BigInt(priceCents);
  const offset = rounding === "nearest" ? GWEI_PER_ETH / 2n : 0n;
  return Number((product + offset) / GWEI_PER_ETH);
}

export function ethGweiForCents(usdCents: number, priceCents: number, rounding: "down" | "up"): number {
  const numerator = BigInt(usdCents) * GWEI_PER_ETH;
  const price = BigInt(priceCents);
  const gwei = rounding === "up" ? (numerator + price - 1n) / price : numerator / price;
  return Number(gwei);
}

// Accepts "100", "1,250.5", "$20.00". Returns null for anything else.
export function parseUsdToCents(input: string): number | null {
  const normalized = input.trim().replace(/^\$/, "").replaceAll(",", "");
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(normalized);
  if (!match) return null;
  const cents = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents > MAX_INPUT_CENTS) return null;
  return cents;
}

const usdFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const wholeUsdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function formatUsd(cents: number, { wholeDollars = false } = {}): string {
  return (wholeDollars ? wholeUsdFormatter : usdFormatter).format(cents / 100);
}

export function formatSignedUsd(cents: number): string {
  const sign = cents > 0 ? "+" : cents < 0 ? "-" : "";
  return `${sign}${formatUsd(Math.abs(cents))}`;
}

export function formatPercent(percent: number | null): string {
  if (percent === null) return "n/a";
  const rounded = Math.round(percent * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toFixed(1)}%`;
}

export function formatEth(gwei: number, maxDecimals = 4): string {
  return trimDecimals(Number(gwei) / 1e9, maxDecimals);
}

export function formatWeiAsEth(wei: bigint, maxDecimals = 6): string {
  const whole = wei / WEI_PER_ETH;
  const fraction = (wei % WEI_PER_ETH).toString().padStart(18, "0").slice(0, maxDecimals).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

function trimDecimals(value: number, maxDecimals: number): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: maxDecimals });
}
