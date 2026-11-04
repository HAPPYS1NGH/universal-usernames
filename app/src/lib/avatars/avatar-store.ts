import type { Db } from "@/lib/db/connection";
import type { EmojiAvatar } from "./avatar-rules";
import type { ImageFormat } from "./image-header";

// What a user picked. `updatedAt` versions photo URLs, so a new photo is never
// served from a stale cache. Users without a choice get the generated avatar.
export type AvatarChoice =
  | { kind: "emoji"; emoji: string; color: string; updatedAt: number }
  | { kind: "photo"; updatedAt: number };

export type StoredPhoto = { bytes: Buffer; type: ImageFormat; updatedAt: number };

type ChoiceRow = {
  username: string;
  kind: "emoji" | "photo";
  emoji: string | null;
  color: string | null;
  updatedAt: number;
};

function toChoice(row: ChoiceRow): AvatarChoice {
  if (row.kind === "photo") return { kind: "photo", updatedAt: row.updatedAt };
  return { kind: "emoji", emoji: row.emoji as string, color: row.color as string, updatedAt: row.updatedAt };
}

// Choices for a list of usernames in one query. Photos stay out of it: pages
// only need to know that a photo exists, and load it by URL.
export function getAvatarChoices(db: Db, usernames: readonly string[]): Map<string, AvatarChoice> {
  if (usernames.length === 0) return new Map();
  const rows = db
    .prepare<[string], ChoiceRow>(
      `SELECT u.username, a.kind, a.emoji, a.color, a.updated_at AS updatedAt
       FROM avatars a JOIN users u ON u.id = a.user_id
       WHERE u.username IN (SELECT value FROM json_each(?))`,
    )
    .all(JSON.stringify(usernames));
  return new Map(rows.map((row) => [row.username, toChoice(row)]));
}

export function getAvatarChoice(db: Db, username: string): AvatarChoice | null {
  return getAvatarChoices(db, [username]).get(username) ?? null;
}

// Callers validate first (avatar-rules.ts). The table's CHECK constraint only
// guards the shape of a row.
export function saveEmojiAvatar(db: Db, userId: number, avatar: EmojiAvatar, now = Date.now()): void {
  db.prepare(
    `INSERT INTO avatars (user_id, kind, emoji, color, photo, photo_type, updated_at)
     VALUES (?, 'emoji', ?, ?, NULL, NULL, ?)
     ON CONFLICT (user_id) DO UPDATE SET
       kind = excluded.kind, emoji = excluded.emoji, color = excluded.color,
       photo = NULL, photo_type = NULL, updated_at = excluded.updated_at`,
  ).run(userId, avatar.emoji, avatar.color, now);
}

export function saveAvatarPhoto(
  db: Db,
  userId: number,
  photo: { bytes: Uint8Array; type: ImageFormat },
  now = Date.now(),
): void {
  db.prepare(
    `INSERT INTO avatars (user_id, kind, emoji, color, photo, photo_type, updated_at)
     VALUES (?, 'photo', NULL, NULL, ?, ?, ?)
     ON CONFLICT (user_id) DO UPDATE SET
       kind = excluded.kind, emoji = NULL, color = NULL,
       photo = excluded.photo, photo_type = excluded.photo_type, updated_at = excluded.updated_at`,
  ).run(userId, Buffer.from(photo.bytes), photo.type, now);
}

export function clearAvatar(db: Db, userId: number): void {
  db.prepare("DELETE FROM avatars WHERE user_id = ?").run(userId);
}

export function getAvatarPhoto(db: Db, username: string): StoredPhoto | null {
  const row = db
    .prepare<[string], StoredPhoto>(
      `SELECT a.photo AS bytes, a.photo_type AS type, a.updated_at AS updatedAt
       FROM avatars a JOIN users u ON u.id = a.user_id
       WHERE u.username = ? AND a.kind = 'photo'`,
    )
    .get(username);
  return row ?? null;
}
