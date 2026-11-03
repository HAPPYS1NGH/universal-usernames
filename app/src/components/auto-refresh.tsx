"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Re-renders the current server components on an interval, so prices and
// balances stay current without a reload. Client state (form inputs) survives.
export function AutoRefresh({ intervalMs }: { intervalMs: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);
  return null;
}
