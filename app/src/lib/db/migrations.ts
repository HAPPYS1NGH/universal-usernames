import type { Db } from "./connection";

// Append-only. Each entry runs once, tracked by SQLite's user_version pragma.
const MIGRATIONS: readonly string[] = [
  `
  CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    cash_cents INTEGER NOT NULL CHECK (cash_cents >= 0),
    eth_gwei INTEGER NOT NULL DEFAULT 0 CHECK (eth_gwei >= 0),
    created_at INTEGER NOT NULL
  );

  CREATE TABLE wallets (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    address TEXT NOT NULL UNIQUE,
    key_ciphertext TEXT NOT NULL,
    key_iv TEXT NOT NULL,
    key_auth_tag TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );
  CREATE INDEX sessions_user_id ON sessions(user_id);

  CREATE TABLE trades (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
    usd_cents INTEGER NOT NULL CHECK (usd_cents > 0),
    eth_gwei INTEGER NOT NULL CHECK (eth_gwei > 0),
    price_cents INTEGER NOT NULL CHECK (price_cents > 0),
    created_at INTEGER NOT NULL
  );
  CREATE INDEX trades_user_created ON trades(user_id, created_at);

  CREATE TABLE transfers (
    id INTEGER PRIMARY KEY,
    from_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    to_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    created_at INTEGER NOT NULL,
    CHECK (from_user_id <> to_user_id)
  );
  CREATE INDEX transfers_from_created ON transfers(from_user_id, created_at);
  CREATE INDEX transfers_to_created ON transfers(to_user_id, created_at);
  `,
  // Avatars a user picked. No row means the generated default. Photos live in
  // the database, so they persist on the same volume and need no file store.
  `
  CREATE TABLE avatars (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('emoji', 'photo')),
    emoji TEXT,
    color TEXT,
    photo BLOB,
    photo_type TEXT,
    updated_at INTEGER NOT NULL,
    CHECK (
      (kind = 'emoji' AND emoji IS NOT NULL AND color IS NOT NULL AND photo IS NULL AND photo_type IS NULL) OR
      (kind = 'photo' AND photo IS NOT NULL AND photo_type IS NOT NULL AND emoji IS NULL AND color IS NULL)
    )
  );
  `,
];

export function migrate(db: Db): void {
  const current = db.pragma("user_version", { simple: true }) as number;
  for (let version = current; version < MIGRATIONS.length; version++) {
    db.transaction(() => {
      db.exec(MIGRATIONS[version]);
      db.pragma(`user_version = ${version + 1}`);
    }).immediate();
  }
}
