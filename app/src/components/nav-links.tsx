"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SIGNED_IN_LINKS = [
  { href: "/trade", label: "Trade" },
  { href: "/wallet", label: "Wallet" },
  { href: "/leaderboard", label: "Leaderboard" },
];

const SIGNED_OUT_LINKS = [{ href: "/leaderboard", label: "Leaderboard" }];

export function NavLinks({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();
  const links = signedIn ? SIGNED_IN_LINKS : SIGNED_OUT_LINKS;

  return (
    <nav className="flex items-center gap-1">
      {links.map(({ href, label }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`rounded-full px-4 py-2 font-medium transition-colors ${
              active ? "bg-ink text-surface" : "text-muted hover:bg-canvas hover:text-ink"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
