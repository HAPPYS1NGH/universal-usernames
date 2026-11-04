import { describe, expect, it } from "vitest";
import { AVATAR_PHOTO_MAX_BYTES, checkAvatarPhoto, checkEmojiAvatar } from "@/lib/avatars/avatar-rules";
import { readImageHeader } from "@/lib/avatars/image-header";
import {
  gifBytes,
  jpegBytes,
  padded,
  pngBytes,
  webpExtendedBytes,
  webpLosslessBytes,
  webpLossyBytes,
} from "./helpers/image-bytes";

describe("readImageHeader", () => {
  it.each([
    ["PNG", pngBytes(640, 480), "image/png"],
    ["JPEG behind JFIF and EXIF segments", jpegBytes(640, 480), "image/jpeg"],
    ["GIF", gifBytes(640, 480), "image/gif"],
    ["lossy WebP", webpLossyBytes(640, 480), "image/webp"],
    ["lossless WebP", webpLosslessBytes(640, 480), "image/webp"],
    ["extended WebP", webpExtendedBytes(640, 480), "image/webp"],
  ])("reads the type and size of a %s", (_name, bytes, type) => {
    expect(readImageHeader(bytes)).toEqual({ type, width: 640, height: 480 });
  });

  it.each([
    ["SVG", new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"/>')],
    ["HTML", new TextEncoder().encode("<!doctype html><script>alert(1)</script>")],
    ["empty input", new Uint8Array()],
    ["a truncated PNG", pngBytes(640, 480).subarray(0, 20)],
    ["a JPEG cut off before its frame header", jpegBytes(640, 480).subarray(0, 34)],
    ["a zero-width GIF", gifBytes(0, 480)],
  ])("rejects %s", (_name, bytes) => {
    expect(readImageHeader(bytes)).toBeNull();
  });
});

describe("checkAvatarPhoto", () => {
  it("accepts a 512×512 JPEG, the size the browser uploads", () => {
    expect(checkAvatarPhoto(padded(jpegBytes(512, 512), 60_000))).toEqual({
      ok: true,
      value: { type: "image/jpeg", width: 512, height: 512 },
    });
  });

  it("takes the type from the bytes, whatever the file claimed", () => {
    const result = checkAvatarPhoto(pngBytes(256, 256));
    expect(result).toMatchObject({ ok: true, value: { type: "image/png" } });
  });

  it.each([
    ["an empty file", new Uint8Array(), "Choose a photo"],
    ["a file over 512 KB", padded(jpegBytes(512, 512), AVATAR_PHOTO_MAX_BYTES + 1), "over 512 KB"],
    ["an SVG", new TextEncoder().encode("<svg/>"), "JPEG, PNG, WebP or GIF"],
    ["a 32-pixel image", pngBytes(32, 32), "too small"],
    ["a sliver 2000 wide and 40 tall", pngBytes(2000, 40), "too small"],
    ["a 4096-pixel image", pngBytes(4096, 4096), "too large"],
  ])("rejects %s", (_name, bytes, error) => {
    const result = checkAvatarPhoto(bytes);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain(error);
  });
});

describe("checkEmojiAvatar", () => {
  it("accepts an emoji and a color from the lists", () => {
    expect(checkEmojiAvatar("🦊", "#ff9f0a")).toEqual({ ok: true, value: { emoji: "🦊", color: "#ff9f0a" } });
  });

  it.each([
    ["an emoji outside the list", "🫠", "#ff9f0a", "Choose an emoji"],
    ["markup instead of an emoji", "<script>", "#ff9f0a", "Choose an emoji"],
    ["two emojis", "🦊🦊", "#ff9f0a", "Choose an emoji"],
    ["a color outside the list", "🦊", "#123456", "Choose a color"],
    ["CSS instead of a color", "🦊", "red;background:url(x)", "Choose a color"],
    ["a missing value", undefined, "#ff9f0a", "Choose an emoji"],
  ])("rejects %s", (_name, emoji, color, error) => {
    const result = checkEmojiAvatar(emoji, color);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain(error);
  });
});
