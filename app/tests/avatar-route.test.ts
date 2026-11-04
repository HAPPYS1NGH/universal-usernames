import { beforeAll, describe, expect, it } from "vitest";
import { GET as getAvatar } from "@/app/api/avatar/[label]/route";
import { saveAvatarPhoto, saveEmojiAvatar } from "@/lib/avatars/avatar-store";
import { getDb } from "@/lib/db/connection";
import { pngBytes } from "./helpers/image-bytes";
import { createTestUser } from "./helpers/test-db";

function requestAvatar(label: string) {
  return getAvatar(new Request(`http://localhost/api/avatar/${label}`), {
    params: Promise.resolve({ label }),
  });
}

describe("GET /api/avatar/{label}", () => {
  const photo = pngBytes(256, 256);

  beforeAll(() => {
    // The route uses the app's shared connection (DATABASE_PATH=:memory: in tests).
    const db = getDb();
    saveAvatarPhoto(db, createTestUser(db, "parrot"), { bytes: photo, type: "image/png" });
    saveEmojiAvatar(db, createTestUser(db, "foxy"), { emoji: "🦊", color: "#ff9f0a" });
    createTestUser(db, "plain");
  });

  it("serves an uploaded photo with its stored type and locked-down headers", async () => {
    const response = await requestAvatar("parrot");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("cache-control")).toBe("public, max-age=300");
    expect(response.headers.get("content-security-policy")).toBe("default-src 'none'");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(photo);
  });

  it("returns 404 for users without a photo, whose avatar is drawn in the page", async () => {
    expect((await requestAvatar("foxy")).status).toBe(404);
    expect((await requestAvatar("plain")).status).toBe(404);
    expect((await requestAvatar("nobody")).status).toBe(404);
  });

  it("returns 400 for an invalid label", async () => {
    const response = await requestAvatar("Not-Valid");
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_label" });
  });
});
