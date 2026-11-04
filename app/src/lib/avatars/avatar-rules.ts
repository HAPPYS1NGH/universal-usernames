import { AVATAR_COLORS, AVATAR_EMOJIS } from "./emoji-catalog";
import { readImageHeader, type ImageFormat } from "./image-header";

// The browser crops photos to 512×512 before upload (photo-resize.ts), so a
// real upload is far below these limits. They stop oversized or hand-made
// files from reaching the database or anyone who loads the avatar.
export const AVATAR_PHOTO_MAX_BYTES = 512 * 1024;
export const AVATAR_PHOTO_MIN_SIDE = 64;
export const AVATAR_PHOTO_MAX_SIDE = 2048;
export const AVATAR_PHOTO_TYPES: readonly ImageFormat[] = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export type EmojiAvatar = { emoji: string; color: string };
export type AvatarPhoto = { type: ImageFormat; width: number; height: number };

export type Checked<T> = { ok: true; value: T } | { ok: false; error: string };

const EMOJI_CHARS = new Set(AVATAR_EMOJIS.map((emoji) => emoji.char));
const COLOR_VALUES = new Set(AVATAR_COLORS.map((color) => color.value));

export function checkEmojiAvatar(emoji: unknown, color: unknown): Checked<EmojiAvatar> {
  if (typeof emoji !== "string" || !EMOJI_CHARS.has(emoji)) {
    return { ok: false, error: "Choose an emoji from the list." };
  }
  if (typeof color !== "string" || !COLOR_VALUES.has(color)) {
    return { ok: false, error: "Choose a color from the list." };
  }
  return { ok: true, value: { emoji, color } };
}

export function checkAvatarPhoto(bytes: Uint8Array): Checked<AvatarPhoto> {
  if (bytes.length === 0) return { ok: false, error: "Choose a photo to upload." };
  if (bytes.length > AVATAR_PHOTO_MAX_BYTES) {
    return { ok: false, error: "That photo is over 512 KB. Choose a smaller one." };
  }
  const header = readImageHeader(bytes);
  if (!header) return { ok: false, error: "Use a JPEG, PNG, WebP or GIF photo." };
  if (Math.min(header.width, header.height) < AVATAR_PHOTO_MIN_SIDE) {
    return { ok: false, error: `That photo is too small. Use one at least ${AVATAR_PHOTO_MIN_SIDE} pixels on each side.` };
  }
  if (Math.max(header.width, header.height) > AVATAR_PHOTO_MAX_SIDE) {
    return { ok: false, error: `That photo is too large. Use one at most ${AVATAR_PHOTO_MAX_SIDE} pixels on each side.` };
  }
  return { ok: true, value: header };
}
