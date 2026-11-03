import { getAddress, isAddress, type Address } from "viem";

/** What the app exposes about one username through its read-only adapter. */
export type Profile = {
  address: Address;
  texts: Map<string, string>;
};

export type AdapterClient = {
  /** Returns the profile, or null when the app has no such username. */
  fetchProfile(username: string): Promise<Profile | null>;
};

/** The app's adapter failed or answered with something unexpected (HTTP 502). Never sign in this case. */
export class AdapterError extends Error {}

type AdapterClientOptions = {
  /** Base URL of the app, e.g. http://localhost:3000. */
  baseUrl: string;
  timeoutMs?: number;
  cacheTtlMs?: number;
  fetch?: typeof fetch;
};

// Bounds memory if someone sweeps through many usernames.
const MAX_CACHE_ENTRIES = 10_000;

/**
 * Reads usernames from the app with `GET {baseUrl}/api/ens/{username}`.
 * Answers, including "not found", are cached briefly so a wallet that asks
 * for several records of one name hits the app once. Failures are not cached.
 */
export function createAdapterClient({
  baseUrl,
  timeoutMs = 3_000,
  cacheTtlMs = 30_000,
  fetch: fetchFromApp = fetch,
}: AdapterClientOptions): AdapterClient {
  const cache = new Map<string, { profile: Profile | null; expiresAt: number }>();

  async function fetchProfile(username: string): Promise<Profile | null> {
    const cached = cache.get(username);
    if (cached && cached.expiresAt > Date.now()) return cached.profile;

    const profile = await requestProfile(username);
    remember(username, profile);
    return profile;
  }

  async function requestProfile(username: string): Promise<Profile | null> {
    let response: Response;
    try {
      response = await fetchFromApp(`${baseUrl}/api/ens/${encodeURIComponent(username)}`, {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      throw new AdapterError(`request to the app failed: ${(error as Error).message}`, { cause: error });
    }

    if (response.status === 404) return null;
    if (!response.ok) throw new AdapterError(`the app answered HTTP ${response.status}`);

    let body: unknown;
    try {
      body = await response.json();
    } catch (error) {
      throw new AdapterError("the app answered with invalid JSON", { cause: error });
    }
    return parseProfile(body, username);
  }

  function remember(username: string, profile: Profile | null) {
    // Map keeps insertion order, so the first key is the oldest entry.
    cache.delete(username);
    if (cache.size >= MAX_CACHE_ENTRIES) {
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) cache.delete(oldest);
    }
    cache.set(username, { profile, expiresAt: Date.now() + cacheTtlMs });
  }

  return { fetchProfile };
}

function parseProfile(body: unknown, username: string): Profile {
  if (typeof body !== "object" || body === null) {
    throw new AdapterError("the app answered with something other than a JSON object");
  }

  const { name, address, texts } = body as Record<string, unknown>;
  if (name !== username) {
    throw new AdapterError(`asked the app for "${username}" but it answered for "${String(name)}"`);
  }
  if (typeof address !== "string" || !isAddress(address, { strict: false })) {
    throw new AdapterError(`the app answered without a valid address for "${username}"`);
  }

  // Text keys vary per app. Keep every string value and skip anything else.
  const textRecords = new Map<string, string>();
  if (typeof texts === "object" && texts !== null) {
    for (const [key, value] of Object.entries(texts)) {
      if (typeof value === "string") textRecords.set(key, value);
    }
  }

  return { address: getAddress(address), texts: textRecords };
}
