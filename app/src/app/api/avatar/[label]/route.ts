import { NextResponse } from "next/server";
import { usernameExists } from "@/lib/accounts/accounts";
import { validateUsername } from "@/lib/auth/username";
import { getAvatarPhoto } from "@/lib/avatars/avatar-store";
import { getDb } from "@/lib/db/connection";
import { renderAvatarSvg } from "@/lib/profiles/avatar-svg";

// The avatar ENS points at, as an image for every user: the uploaded photo,
// or the generated SVG for everyone else.
export async function GET(_request: Request, context: RouteContext<"/api/avatar/[label]">) {
  const { label } = await context.params;
  if (!validateUsername(label).ok) {
    return NextResponse.json({ error: "invalid_label" }, { status: 400 });
  }
  const db = getDb();
  if (!usernameExists(db, label)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const photo = getAvatarPhoto(db, label);
  if (photo) {
    return new Response(new Uint8Array(photo.bytes), {
      headers: {
        // The type was read from the file's bytes at upload, not taken from the client.
        "Content-Type": photo.type,
        // Pages add ?v=<updatedAt>, so a new photo gets a new URL. The short
        // max-age only matters for the bare URL.
        "Cache-Control": "public, max-age=300",
        "Content-Security-Policy": "default-src 'none'",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  return new Response(renderAvatarSvg(label), {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
