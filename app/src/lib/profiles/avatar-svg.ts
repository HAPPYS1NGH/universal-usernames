import { createHash } from "node:crypto";

const SIZE = 256;

// Hex output, because some SVG renderers used by ENS avatar services don't
// understand hsl().
function hslToHex(hue: number, saturation: number, lightness: number): string {
  const s = saturation / 100;
  const l = lightness / 100;
  const channel = (n: number) => {
    const k = (n + hue / 30) % 12;
    const value = l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(value * 255)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
}

// Deterministic avatar: a two-color gradient picked from a hash of the
// username, with its first character on top. Usernames are [a-z0-9-], so the
// initial needs no escaping.
export function renderAvatarSvg(username: string): string {
  const hash = createHash("sha256").update(username).digest();
  const hue = hash.readUInt16BE(0) % 360;
  const secondHue = (hue + 40 + (hash[2] % 80)) % 360;
  const initial = username.charAt(0).toUpperCase();

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${hslToHex(hue, 70, 52)}"/>
      <stop offset="1" stop-color="${hslToHex(secondHue, 75, 38)}"/>
    </linearGradient>
  </defs>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#g)"/>
  <text x="50%" y="50%" dy="0.35em" text-anchor="middle" fill="#ffffff" font-family="Helvetica, Arial, sans-serif" font-size="128" font-weight="700">${initial}</text>
</svg>`;
}

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

// An emoji on a colored square, which ENS apps crop to a circle like the app
// does. Both values come from the allowlists in emoji-catalog.ts; they're
// escaped anyway, because this string is markup.
export function renderEmojiAvatarSvg(emoji: string, color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <rect width="${SIZE}" height="${SIZE}" fill="${escapeXml(color)}"/>
  <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif" font-size="136">${escapeXml(emoji)}</text>
</svg>`;
}
