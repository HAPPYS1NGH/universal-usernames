// The same username rules as the app. They are ASCII-only, so every valid
// username is already ENSIP-15 normalized and can be used as an ENS label as is.
export function isValidUsername(label: string): boolean {
  return (
    /^[a-z0-9-]{3,20}$/.test(label) &&
    !label.startsWith("-") &&
    !label.endsWith("-") &&
    !label.includes("--")
  );
}

/**
 * Returns the username when `name` is exactly `<username>.<parentName>`.
 * Returns null for the parent itself, nested names, names under another
 * parent and labels that break the username rules.
 */
export function usernameFromName(name: string, parentName: string): string | null {
  const suffix = `.${parentName}`;
  if (!name.endsWith(suffix)) return null;

  const label = name.slice(0, -suffix.length);
  return isValidUsername(label) ? label : null;
}
