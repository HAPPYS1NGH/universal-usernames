// Reads the format and pixel size from the first bytes of an image, without
// decoding it. Only the formats avatars accept are recognized, so the type
// comes from the bytes, never from the file name or the browser's claim.

export type ImageFormat = "image/png" | "image/jpeg" | "image/gif" | "image/webp";

export type ImageHeader = { type: ImageFormat; width: number; height: number };

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(start, start + length));
}

function sized(type: ImageFormat, width: number, height: number): ImageHeader | null {
  return width > 0 && height > 0 ? { type, width, height } : null;
}

function readPng(bytes: Uint8Array, view: DataView): ImageHeader | null {
  if (bytes.length < 24 || ascii(bytes, 12, 4) !== "IHDR") return null;
  return sized("image/png", view.getUint32(16), view.getUint32(20));
}

// JPEG stores the size in its start-of-frame segment, somewhere after the
// metadata segments, so walk the segments until one turns up.
function readJpeg(bytes: Uint8Array, view: DataView): ImageHeader | null {
  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    const marker = bytes[offset + 1];
    if (marker === 0xff) {
      offset += 1; // fill byte
      continue;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
      offset += 2; // markers without a length
      continue;
    }
    if (marker === 0xd9 || marker === 0xda) return null; // image data before any frame header
    const length = view.getUint16(offset + 2);
    if (length < 2) return null;
    const isFrameHeader = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isFrameHeader) {
      if (offset + 9 > bytes.length) return null;
      return sized("image/jpeg", view.getUint16(offset + 7), view.getUint16(offset + 5));
    }
    offset += 2 + length;
  }
  return null;
}

function readGif(bytes: Uint8Array, view: DataView): ImageHeader | null {
  if (bytes.length < 10) return null;
  return sized("image/gif", view.getUint16(6, true), view.getUint16(8, true));
}

function readWebp(bytes: Uint8Array, view: DataView): ImageHeader | null {
  if (bytes.length < 30) return null;
  switch (ascii(bytes, 12, 4)) {
    case "VP8 ": {
      if (bytes[23] !== 0x9d || bytes[24] !== 0x01 || bytes[25] !== 0x2a) return null;
      return sized("image/webp", view.getUint16(26, true) & 0x3fff, view.getUint16(28, true) & 0x3fff);
    }
    case "VP8L": {
      if (bytes[20] !== 0x2f) return null;
      const bits = view.getUint32(21, true);
      return sized("image/webp", (bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1);
    }
    case "VP8X": {
      const width = 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16));
      const height = 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16));
      return sized("image/webp", width, height);
    }
    default:
      return null;
  }
}

export function readImageHeader(bytes: Uint8Array): ImageHeader | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (PNG_SIGNATURE.every((byte, index) => bytes[index] === byte)) return readPng(bytes, view);
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return readJpeg(bytes, view);
  const start = ascii(bytes, 0, 6);
  if (start === "GIF87a" || start === "GIF89a") return readGif(bytes, view);
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") return readWebp(bytes, view);
  return null;
}
