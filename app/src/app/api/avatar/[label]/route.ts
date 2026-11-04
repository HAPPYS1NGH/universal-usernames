import { NextResponse } from "next/server";
import { usernameExists } from "@/lib/accounts/accounts";
import { validateUsername } from "@/lib/auth/username";
import { getAvatarChoice, getAvatarPhoto } from "@/lib/avatars/avatar-store";
import { getDb } from "@/lib/db/connection";
import { renderAvatarSvg, renderEmojiAvatarSvg } from "@/lib/profiles/avatar-svg";

const HEADERS = {
  // Avatars change when users pick a new one. The adapter versions the URL it
  // publishes (?v=), so this short max-age only matters for the bare URL.
  "Cache-Control": "public, max-age=300",
  "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
  "X-Content-Type-Options": "nosniff",
};

// The avatar ENS points at, as an image for every user: the uploaded photo,
// the chosen emoji drawn as SVG, or the generated SVG for everyone else.
export async function GET(_request: Request, context: RouteContext<"/api/avatar/[label]">) {
  const { label } = await context.params;
  if (!validateUsername(label).ok) {
    return NextResponse.json({ error: "invalid_label" }, { status: 400 });
  }
  const db = getDb();
  if (!usernameExists(db, label)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const choice = getAvatarChoice(db, label);
  const photo = choice?.kind === "photo" ? getAvatarPhoto(db, label) : null;
  if (photo) {
    // The type was read from the file's bytes at upload, not taken from the client.
    return new Response(new Uint8Array(photo.bytes), { headers: { ...HEADERS, "Content-Type": photo.type } });
  }

  const svg = choice?.kind === "emoji" ? renderEmojiAvatarSvg(choice.emoji, choice.color) : renderAvatarSvg(label);
  return new Response(svg, { headers: { ...HEADERS, "Content-Type": "image/svg+xml" } });
}
