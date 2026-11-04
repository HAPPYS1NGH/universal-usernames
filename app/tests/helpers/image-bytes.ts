// Minimal image headers for avatar tests: just enough bytes for each format's
// signature and size fields. Nothing here decodes into a picture.

function concat(...parts: (number[] | Uint8Array | string)[]): Uint8Array {
  const bytes = parts.flatMap((part) =>
    typeof part === "string" ? [...part].map((char) => char.charCodeAt(0)) : [...part],
  );
  return Uint8Array.from(bytes);
}

const u16be = (value: number) => [value >> 8, value & 0xff];
const u16le = (value: number) => [value & 0xff, value >> 8];
const u24le = (value: number) => [value & 0xff, (value >> 8) & 0xff, (value >> 16) & 0xff];
const u32be = (value: number) => [value >>> 24, (value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
const u32le = (value: number) => u32be(value).reverse();

export function pngBytes(width: number, height: number): Uint8Array {
  return concat([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], u32be(13), "IHDR", u32be(width), u32be(height), [
    8, 6, 0, 0, 0,
  ]);
}

// JFIF and EXIF segments come before the frame header, as in camera photos.
export function jpegBytes(width: number, height: number): Uint8Array {
  const app0 = concat([0xff, 0xe0], u16be(16), "JFIF\0", [1, 1, 0, 0, 1, 0, 1, 0, 0]);
  const app1 = concat([0xff, 0xe1], u16be(8), "Exif\0\0");
  const sof0 = concat([0xff, 0xc0], u16be(17), [8], u16be(height), u16be(width), [3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1]);
  return concat([0xff, 0xd8], app0, app1, sof0, [0xff, 0xd9]);
}

export function gifBytes(width: number, height: number): Uint8Array {
  return concat("GIF89a", u16le(width), u16le(height), [0, 0, 0]);
}

function riff(chunk: Uint8Array): Uint8Array {
  return concat("RIFF", u32le(chunk.length + 4), "WEBP", chunk);
}

// Lossy WebP: a 3-byte frame tag, the 9d 01 2a start code, then the size.
export function webpLossyBytes(width: number, height: number): Uint8Array {
  return riff(concat("VP8 ", u32le(10), [0, 0, 0], [0x9d, 0x01, 0x2a], u16le(width), u16le(height)));
}

export function webpLosslessBytes(width: number, height: number): Uint8Array {
  const bits = ((width - 1) & 0x3fff) | (((height - 1) & 0x3fff) << 14);
  return riff(concat("VP8L", u32le(5), [0x2f], u32le(bits), [0, 0, 0, 0, 0]));
}

export function webpExtendedBytes(width: number, height: number): Uint8Array {
  return riff(concat("VP8X", u32le(10), [0, 0, 0, 0], u24le(width - 1), u24le(height - 1)));
}

// A file with extra bytes after the header, so size limits can be tested.
export function padded(bytes: Uint8Array, length: number): Uint8Array {
  const out = new Uint8Array(length);
  out.set(bytes);
  return out;
}
