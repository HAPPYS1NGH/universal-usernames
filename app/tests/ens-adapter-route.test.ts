import { getAddress } from "viem";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { GET as getAvatar } from "@/app/api/avatar/[label]/route";
import { GET as getEnsRecords } from "@/app/api/ens/[label]/route";
import { saveAvatarPhoto, saveEmojiAvatar } from "@/lib/avatars/avatar-store";
import { getDb } from "@/lib/db/connection";
import { renderEmojiAvatarSvg } from "@/lib/profiles/avatar-svg";
import { executeTrade } from "@/lib/trading/execute-trade";
import { getWalletAddress } from "@/lib/wallet/embedded-wallet";
import { pngBytes } from "./helpers/image-bytes";
import { createTestUser } from "./helpers/test-db";

// Fixed price, so the route never calls Coinbase during tests.
vi.mock("@/lib/market/eth-price", () => ({
  getEthPrice: async () => ({ cents: 2_000_00, source: "live" }),
}));

function requestEns(label: string) {
  return getEnsRecords(new Request(`http://localhost/api/ens/${label}`), {
    params: Promise.resolve({ label }),
  });
}

function requestAvatar(label: string) {
  return getAvatar(new Request(`http://localhost/api/avatar/${label}`), {
    params: Promise.resolve({ label }),
  });
}

describe("GET /api/ens/{label}", () => {
  let happyId: number;

  beforeAll(() => {
    // The route uses the app's shared connection (DATABASE_PATH=:memory: in tests).
    const db = getDb();
    happyId = createTestUser(db, "happy");
    createTestUser(db, "rival");
    // happy: bought $1,000 at $1,600, worth $1,250 now: +2.5%. rival: no trades, 0%.
    executeTrade(db, { userId: happyId, side: "buy", amount: { usdCents: 1_000_00 }, priceCents: 1_600_00 });
  });

  it("returns the public records for a known username", async () => {
    const response = await requestEns("happy");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("cache-control")).toBe("public, max-age=30");

    const address = getWalletAddress(getDb(), happyId);
    expect(await response.json()).toEqual({
      name: "happy",
      address: getAddress(address as string),
      texts: {
        description: "Rank #1 on Tradepit · +2.5% PnL",
        url: "http://localhost:3000/u/happy",
        avatar: "http://localhost:3000/api/avatar/happy",
      },
    });
  });

  it("versions the avatar URL once the user picks an avatar", async () => {
    const foxId = createTestUser(getDb(), "foxy");
    saveEmojiAvatar(getDb(), foxId, { emoji: "🦊", color: "#ff9f0a" }, 1_700_000_000_000);

    const records = (await (await requestEns("foxy")).json()) as { texts: { avatar: string } };
    expect(records.texts.avatar).toBe("http://localhost:3000/api/avatar/foxy?v=1700000000000");
  });

  it("returns 404 for an unknown username", async () => {
    const response = await requestEns("nobody");
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "not_found" });
  });

  it.each(["Happy", "ab", "-happy", "ha--ppy", "happy_1", "admin", "a".repeat(21)])(
    "returns 400 for the invalid label %s",
    async (label) => {
      const response = await requestEns(label);
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "invalid_label" });
    },
  );
});

describe("GET /api/avatar/{label}", () => {
  const photo = pngBytes(256, 256);

  beforeAll(() => {
    const db = getDb();
    saveAvatarPhoto(db, createTestUser(db, "parrot"), { bytes: photo, type: "image/png" });
    saveEmojiAvatar(db, createTestUser(db, "owl"), { emoji: "🦉", color: "#1d3a6e" });
  });

  it("returns a deterministic SVG for a user without a picked avatar", async () => {
    const first = await requestAvatar("happy");
    const second = await requestAvatar("happy");

    expect(first.status).toBe(200);
    expect(first.headers.get("content-type")).toBe("image/svg+xml");
    const svg = await first.text();
    expect(svg).toContain(">H</text>");
    expect(await second.text()).toBe(svg);
  });

  it("draws a picked emoji on its color as SVG", async () => {
    const response = await requestAvatar("owl");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/svg+xml");
    const svg = await response.text();
    expect(svg).toContain('fill="#1d3a6e"');
    expect(svg).toContain(">🦉</text>");
  });

  it("escapes the emoji SVG even though its inputs are allowlisted", () => {
    const svg = renderEmojiAvatarSvg("</text><script>", '"/><script>');
    expect(svg).not.toContain("<script>");
  });

  it("serves an uploaded photo with its stored type", async () => {
    const response = await requestAvatar("parrot");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("cache-control")).toBe("public, max-age=300");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(photo);
  });

  it("returns 404 for unknown usernames and 400 for invalid labels", async () => {
    expect((await requestAvatar("nobody")).status).toBe(404);
    expect((await requestAvatar("Not-Valid")).status).toBe(400);
  });
});
