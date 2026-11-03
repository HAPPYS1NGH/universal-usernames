// ETH/USD spot price from Coinbase's public API, cached in memory.
// A failed fetch never throws: callers get the last known price, or a fixed
// fallback if the server has never reached Coinbase.

const SPOT_URL = "https://api.coinbase.com/v2/prices/ETH-USD/spot";
const CACHE_TTL_MS = 15_000;
const FETCH_TIMEOUT_MS = 3_000;
const FALLBACK_PRICE_CENTS = 3_000_00;

export type EthPrice = {
  cents: number;
  source: "live" | "stale" | "fallback";
};

let lastKnown: { cents: number; fetchedAt: number } | undefined;
let lastAttemptAt = 0;
let inFlight: Promise<EthPrice> | undefined;

async function fetchSpotPriceCents(): Promise<number> {
  const response = await fetch(SPOT_URL, {
    cache: "no-store",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`Coinbase responded ${response.status}`);
  }
  const body = (await response.json()) as { data?: { amount?: string } };
  const cents = Math.round(Number(body.data?.amount) * 100);
  if (!Number.isSafeInteger(cents) || cents <= 0) {
    throw new Error(`Unexpected Coinbase payload: ${JSON.stringify(body)}`);
  }
  return cents;
}

function cachedPrice(): EthPrice {
  if (!lastKnown) return { cents: FALLBACK_PRICE_CENTS, source: "fallback" };
  const fresh = Date.now() - lastKnown.fetchedAt < CACHE_TTL_MS;
  return { cents: lastKnown.cents, source: fresh ? "live" : "stale" };
}

async function refreshPrice(): Promise<EthPrice> {
  lastAttemptAt = Date.now();
  try {
    const cents = await fetchSpotPriceCents();
    lastKnown = { cents, fetchedAt: Date.now() };
    return { cents, source: "live" };
  } catch (error) {
    console.warn(`ETH price fetch failed, using ${lastKnown ? "last known" : "fallback"} price:`, error);
    return cachedPrice();
  }
}

export function getEthPrice(): Promise<EthPrice> {
  if (inFlight) return inFlight;
  // Within the TTL of the last attempt (successful or not), serve from memory
  // so an outage doesn't add a timeout to every request.
  if (Date.now() - lastAttemptAt < CACHE_TTL_MS) {
    return Promise.resolve(cachedPrice());
  }
  inFlight = refreshPrice().finally(() => {
    inFlight = undefined;
  });
  return inFlight;
}
