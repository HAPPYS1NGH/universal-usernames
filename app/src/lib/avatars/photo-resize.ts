import { AVATAR_PHOTO_MIN_SIDE, AVATAR_PHOTO_TYPES } from "./avatar-rules";

// Browser only. Crops a picked photo to a centered square and re-encodes it as
// a 512×512 JPEG before upload. Uploads stay small (tens of KB, far under the
// server's 512 KB limit), EXIF data such as GPS location never leaves the
// device, and the photo's orientation is applied to the pixels.

const SIDE = 512;
const QUALITY = 0.88;
const MAX_SOURCE_BYTES = 20 * 1024 * 1024;

export type PreparedPhoto = { ok: true; file: File } | { ok: false; error: string };

function encodeJpeg(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", QUALITY));
}

export async function preparePhoto(source: File): Promise<PreparedPhoto> {
  if (!(AVATAR_PHOTO_TYPES as readonly string[]).includes(source.type)) {
    return { ok: false, error: "Use a JPEG, PNG, WebP or GIF photo." };
  }
  if (source.size > MAX_SOURCE_BYTES) {
    return { ok: false, error: "That photo is over 20 MB. Choose a smaller one." };
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(source);
  } catch {
    return { ok: false, error: "That photo couldn't be opened. Try another one." };
  }

  try {
    const side = Math.min(bitmap.width, bitmap.height);
    if (side < AVATAR_PHOTO_MIN_SIDE) {
      return { ok: false, error: `That photo is too small. Use one at least ${AVATAR_PHOTO_MIN_SIDE} pixels on each side.` };
    }
    const target = Math.min(side, SIDE);
    const canvas = document.createElement("canvas");
    canvas.width = target;
    canvas.height = target;
    const context = canvas.getContext("2d");
    if (!context) return { ok: false, error: "This browser can't prepare photos. Try an emoji instead." };

    // JPEG has no transparency, so transparent pixels land on white, not black.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, target, target);
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, target, target);

    const blob = await encodeJpeg(canvas);
    if (!blob) return { ok: false, error: "That photo couldn't be prepared. Try another one." };
    return { ok: true, file: new File([blob], "avatar.jpg", { type: "image/jpeg" }) };
  } finally {
    bitmap.close();
  }
}
