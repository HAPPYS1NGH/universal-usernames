import { afterEach, describe, expect, it, vi } from "vitest";
import { AdapterError, createAdapterClient } from "../src/adapter-client.ts";
import { HAPPY_ADAPTER_RESPONSE, HAPPY_ADDRESS, stubAdapterFetch } from "./lookup-fixtures.ts";

const BASE_URL = "http://app.test";

afterEach(() => {
  vi.useRealTimers();
});

describe("createAdapterClient", () => {
  it("fetches GET {baseUrl}/api/ens/{username} and parses the profile", async () => {
    const stub = stubAdapterFetch({ happy: { status: 200, body: HAPPY_ADAPTER_RESPONSE } });
    const adapter = createAdapterClient({ baseUrl: BASE_URL, fetch: stub.fetch });

    const profile = await adapter.fetchProfile("happy");

    expect(stub.requestedUrls).toEqual(["http://app.test/api/ens/happy"]);
    expect(profile?.address).toBe(HAPPY_ADDRESS);
    expect(profile?.texts.get("description")).toBe("Rank #2 on Tradepit · +12.4% PnL");
  });

  it("returns null for 404", async () => {
    const stub = stubAdapterFetch({});
    const adapter = createAdapterClient({ baseUrl: BASE_URL, fetch: stub.fetch });

    expect(await adapter.fetchProfile("nobody")).toBeNull();
  });

  it("throws AdapterError for other statuses, bad bodies and network failures", async () => {
    const stub = stubAdapterFetch({
      broken: { status: 500, body: { error: "boom" } },
      invalid: { status: 400, body: { error: "invalid_label" } },
      noaddress: { status: 200, body: { name: "noaddress", texts: {} } },
      wrongname: { status: 200, body: { ...HAPPY_ADAPTER_RESPONSE, name: "someone" } },
    });
    const adapter = createAdapterClient({ baseUrl: BASE_URL, fetch: stub.fetch });
    const offline = createAdapterClient({
      baseUrl: BASE_URL,
      fetch: () => Promise.reject(new TypeError("fetch failed")),
    });

    await expect(adapter.fetchProfile("broken")).rejects.toThrow(AdapterError);
    await expect(adapter.fetchProfile("invalid")).rejects.toThrow(AdapterError);
    await expect(adapter.fetchProfile("noaddress")).rejects.toThrow(/valid address/);
    await expect(adapter.fetchProfile("wrongname")).rejects.toThrow(/answered for "someone"/);
    await expect(offline.fetchProfile("happy")).rejects.toThrow(AdapterError);
  });

  it("times out slow requests", async () => {
    const hang: typeof fetch = (_input, init) =>
      new Promise((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(init.signal?.reason)));
    const adapter = createAdapterClient({ baseUrl: BASE_URL, fetch: hang, timeoutMs: 20 });

    await expect(adapter.fetchProfile("happy")).rejects.toThrow(AdapterError);
  });

  it("keeps only string text records", async () => {
    const stub = stubAdapterFetch({
      happy: { status: 200, body: { ...HAPPY_ADAPTER_RESPONSE, texts: { url: "https://x.test", rank: 2 } } },
    });
    const adapter = createAdapterClient({ baseUrl: BASE_URL, fetch: stub.fetch });

    const profile = await adapter.fetchProfile("happy");
    expect([...(profile?.texts ?? [])]).toEqual([["url", "https://x.test"]]);
  });

  it("caches answers, including not found, until the TTL passes", async () => {
    vi.useFakeTimers();
    const stub = stubAdapterFetch({ happy: { status: 200, body: HAPPY_ADAPTER_RESPONSE } });
    const adapter = createAdapterClient({ baseUrl: BASE_URL, fetch: stub.fetch, cacheTtlMs: 30_000 });

    await adapter.fetchProfile("happy");
    await adapter.fetchProfile("happy");
    await adapter.fetchProfile("nobody");
    await adapter.fetchProfile("nobody");
    expect(stub.requestedUrls).toHaveLength(2);

    vi.advanceTimersByTime(30_001);
    await adapter.fetchProfile("happy");
    expect(stub.requestedUrls).toHaveLength(3);
  });

  it("does not cache failures", async () => {
    let calls = 0;
    const flaky: typeof fetch = async () => {
      calls += 1;
      return calls === 1 ? new Response("down", { status: 503 }) : Response.json(HAPPY_ADAPTER_RESPONSE);
    };
    const adapter = createAdapterClient({ baseUrl: BASE_URL, fetch: flaky });

    await expect(adapter.fetchProfile("happy")).rejects.toThrow(AdapterError);
    expect((await adapter.fetchProfile("happy"))?.address).toBe(HAPPY_ADDRESS);
  });
});
