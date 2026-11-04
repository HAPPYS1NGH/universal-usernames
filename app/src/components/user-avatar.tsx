import { createHash } from "node:crypto";

const SIZES = {
  sm: "size-10 text-[1.0625rem]",
  md: "size-10 text-[1.0625rem]",
};

// Deterministic avatar: a two-color gradient picked from a hash of the
// username, with its initial on top. Same username, same colors, everywhere.
function avatarGradient(username: string): string {
  const hash = createHash("sha256").update(username).digest();
  const hue = hash.readUInt16BE(0) % 360;
  const secondHue = (hue + 40 + (hash[2] % 80)) % 360;
  return `linear-gradient(135deg, hsl(${hue} 70% 52%), hsl(${secondHue} 75% 38%))`;
}

export function UserAvatar({ username, size = "md" }: { username: string; size?: keyof typeof SIZES }) {
  return (
    <span
      aria-hidden
      style={{ backgroundImage: avatarGradient(username) }}
      className={`grid shrink-0 place-items-center rounded-full font-bold text-white ${SIZES[size]}`}
    >
      {username.charAt(0).toUpperCase()}
    </span>
  );
}
