import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getDb } from "@/lib/db/connection";

const SESSION_COOKIE = "session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type SessionUser = { id: number; username: string };

// Only a hash of the token is stored, so a leaked database can't be used to
// impersonate users.
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function startSession(userId: number): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_MS;
  const db = getDb();
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(now);
  db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)").run(
    hashToken(token),
    userId,
    expiresAt,
  );

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt),
  });
}

export async function endSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    getDb().prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
  }
  cookieStore.delete(SESSION_COOKIE);
}

// Cached per request so the layout and the page share one lookup.
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const user = getDb()
    .prepare<[string, number], SessionUser>(
      `SELECT u.id, u.username FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > ?`,
    )
    .get(hashToken(token), Date.now());
  return user ?? null;
});

export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/");
  return user;
}
