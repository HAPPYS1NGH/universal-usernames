import { beforeEach, describe, expect, it } from "vitest";
import {
  clearAvatar,
  getAvatarChoice,
  getAvatarChoices,
  getAvatarPhoto,
  saveAvatarPhoto,
  saveEmojiAvatar,
} from "@/lib/avatars/avatar-store";
import type { Db } from "@/lib/db/connection";
import { jpegBytes } from "./helpers/image-bytes";
import { createTestDb, createTestUser } from "./helpers/test-db";

describe("avatar store", () => {
  let db: Db;
  let happyId: number;

  beforeEach(() => {
    db = createTestDb();
    happyId = createTestUser(db, "happy");
    createTestUser(db, "nora");
  });

  it("has no choice for a new user, who keeps the generated avatar", () => {
    expect(getAvatarChoice(db, "happy")).toBeNull();
    expect(getAvatarPhoto(db, "happy")).toBeNull();
  });

  it("saves an emoji choice", () => {
    saveEmojiAvatar(db, happyId, { emoji: "🦊", color: "#ff9f0a" }, 1_000);
    expect(getAvatarChoice(db, "happy")).toEqual({ kind: "emoji", emoji: "🦊", color: "#ff9f0a", updatedAt: 1_000 });
  });

  it("replaces an emoji with a photo and keeps the photo's bytes and type", () => {
    const bytes = jpegBytes(512, 512);
    saveEmojiAvatar(db, happyId, { emoji: "🦊", color: "#ff9f0a" }, 1_000);
    saveAvatarPhoto(db, happyId, { bytes, type: "image/jpeg" }, 2_000);

    expect(getAvatarChoice(db, "happy")).toEqual({ kind: "photo", updatedAt: 2_000 });
    const photo = getAvatarPhoto(db, "happy");
    expect(photo?.type).toBe("image/jpeg");
    expect(photo?.updatedAt).toBe(2_000);
    expect(new Uint8Array(photo?.bytes ?? [])).toEqual(bytes);
  });

  it("drops the photo when an emoji replaces it", () => {
    saveAvatarPhoto(db, happyId, { bytes: jpegBytes(512, 512), type: "image/jpeg" }, 1_000);
    saveEmojiAvatar(db, happyId, { emoji: "🐂", color: "#30d158" }, 2_000);

    expect(getAvatarPhoto(db, "happy")).toBeNull();
    expect(getAvatarChoice(db, "happy")).toMatchObject({ kind: "emoji", emoji: "🐂" });
  });

  it("goes back to the generated avatar when cleared", () => {
    saveEmojiAvatar(db, happyId, { emoji: "🦊", color: "#ff9f0a" });
    clearAvatar(db, happyId);
    expect(getAvatarChoice(db, "happy")).toBeNull();
  });

  it("looks up many usernames at once and skips users without a choice", () => {
    saveEmojiAvatar(db, happyId, { emoji: "🦊", color: "#ff9f0a" }, 1_000);
    const choices = getAvatarChoices(db, ["happy", "nora", "nobody"]);
    expect([...choices.keys()]).toEqual(["happy"]);
    expect(getAvatarChoices(db, [])).toEqual(new Map());
  });

  it("deletes the avatar with its user", () => {
    saveEmojiAvatar(db, happyId, { emoji: "🦊", color: "#ff9f0a" });
    db.prepare("DELETE FROM users WHERE id = ?").run(happyId);
    expect(db.prepare("SELECT COUNT(*) AS count FROM avatars").get()).toEqual({ count: 0 });
  });

  it("refuses rows that mix an emoji and a photo", () => {
    expect(() =>
      db
        .prepare(
          "INSERT INTO avatars (user_id, kind, emoji, color, photo, photo_type, updated_at) VALUES (?, 'emoji', '🦊', '#ff9f0a', x'00', 'image/png', 0)",
        )
        .run(happyId),
    ).toThrow(/CHECK constraint/);
  });
});
