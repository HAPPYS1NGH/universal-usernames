// Server-side configuration. Values are read on access, not at import time,
// so `next build` works without a populated environment.

const WALLET_KEY_PATTERN = /^[0-9a-f]{64}$/i;

export function brandName(): string {
  return process.env.BRAND_NAME?.trim() || "Tradepit";
}

// A relative path resolves against the working directory. The standalone
// server.js changes it to its own folder, so production needs an absolute path
// (app/Dockerfile sets /data/app.db).
export function databasePath(): string {
  return process.env.DATABASE_PATH?.trim() || "./data/app.db";
}

export function rpcUrl(): string {
  return process.env.RPC_URL?.trim() || "https://ethereum-rpc.publicnode.com";
}

export function appUrl(): string {
  const url = process.env.APP_URL?.trim() || "http://localhost:3000";
  return url.replace(/\/+$/, "");
}

export function walletEncryptionKey(): Buffer {
  const hex = process.env.WALLET_ENCRYPTION_KEY?.trim();
  if (!hex || !WALLET_KEY_PATTERN.test(hex)) {
    throw new Error(
      "WALLET_ENCRYPTION_KEY must be 32 bytes of hex (64 characters). Generate one with: openssl rand -hex 32",
    );
  }
  return Buffer.from(hex, "hex");
}
