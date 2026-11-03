import { ensParentName } from "@/lib/config";

// Full ENS name for a username, or null when ENS_PARENT_NAME is not set.
export function ensNameFor(username: string): string | null {
  const parent = ensParentName();
  return parent ? `${username}.${parent}` : null;
}
