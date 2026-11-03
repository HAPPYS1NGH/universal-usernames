import { ensParentName } from "@/lib/config";

// Runs once when the server starts: a malformed ENS_PARENT_NAME fails here
// instead of on the first page view.
export function register(): void {
  ensParentName();
}
