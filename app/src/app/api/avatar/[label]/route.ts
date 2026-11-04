import { NextResponse } from "next/server";
import { validateUsername } from "@/lib/auth/username";
import { getAvatarPhoto } from "@/lib/avatars/avatar-store";
import { getDb } from "@/lib/db/connection";

// Serves uploaded avatar photos to the app's own pages. Emoji and generated
// avatars are drawn in the page, so a user without a photo gets 404 here.
export async function GET(_request: Request, context: RouteContext<"/api/avatar/[label]">) {
  const { label } = await context.params;
  if (!validateUsername(label).ok) {
    return NextResponse.json({ error: "invalid_label" }, { status: 400 });
  }
  const photo = getAvatarPhoto(getDb(), label);
  if (!photo) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

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
