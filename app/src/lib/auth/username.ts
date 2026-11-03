// Username rules. They are stricter than ENS needs so every username is
// already a valid, normalized ENS label (ENSIP-15) when it becomes
// <username>.<brand>.eth later.

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;

const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "api",
  "app",
  "eth",
  "ens",
  "help",
  "mail",
  "null",
  "root",
  "support",
  "system",
  "undefined",
  "www",
]);

export type UsernameResult = { ok: true; username: string } | { ok: false; error: string };

export function validateUsername(username: string): UsernameResult {
  if (username.length < USERNAME_MIN_LENGTH || username.length > USERNAME_MAX_LENGTH) {
    return { ok: false, error: `Use ${USERNAME_MIN_LENGTH} to ${USERNAME_MAX_LENGTH} characters.` };
  }
  if (!/^[a-z0-9-]+$/.test(username)) {
    return { ok: false, error: "Use lowercase letters, numbers and hyphens only." };
  }
  if (username.startsWith("-") || username.endsWith("-")) {
    return { ok: false, error: "A username can't start or end with a hyphen." };
  }
  if (username.includes("--")) {
    return { ok: false, error: "A username can't contain two hyphens in a row." };
  }
  if (RESERVED_USERNAMES.has(username)) {
    return { ok: false, error: "That username is reserved." };
  }
  return { ok: true, username };
}

// Lenient parsing for form input: tolerates surrounding spaces, a leading "@"
// and capital letters, then applies the strict rules.
export function parseUsernameInput(input: string): UsernameResult {
  const username = input.trim().replace(/^@/, "").toLowerCase();
  return validateUsername(username);
}
