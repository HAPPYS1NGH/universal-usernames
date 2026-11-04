import { createHash } from "node:crypto";
import type { AvatarChoice } from "@/lib/avatars/avatar-store";
import { AvatarFace, type AvatarFaceData, type AvatarSize } from "./avatar-face";

// Generated avatar for users who haven't picked one: a two-color gradient from
// a hash of the username, with its initial on top. Same username, same colors.
export function generatedAvatarFace(username: string): AvatarFaceData {
  const hash = createHash("sha256").update(username).digest();
  const hue = hash.readUInt16BE(0) % 360;
  const secondHue = (hue + 40 + (hash[2] % 80)) % 360;
  return {
    kind: "initial",
    initial: username.charAt(0).toUpperCase(),
    gradient: `linear-gradient(135deg, hsl(${hue} 70% 52%), hsl(${secondHue} 75% 38%))`,
  };
}

export function avatarFace(username: string, choice: AvatarChoice | null): AvatarFaceData {
  if (choice?.kind === "emoji") return { kind: "emoji", emoji: choice.emoji, color: choice.color };
  if (choice?.kind === "photo") return { kind: "photo", src: `/api/avatar/${username}?v=${choice.updatedAt}` };
  return generatedAvatarFace(username);
}

type UserAvatarProps = {
  username: string;
  avatar: AvatarChoice | null;
  size?: AvatarSize;
};

export function UserAvatar({ username, avatar, size }: UserAvatarProps) {
  return <AvatarFace face={avatarFace(username, avatar)} size={size} />;
}
