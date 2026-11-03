"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TradeIcon, TrophyIcon, WalletIcon } from "./icons";

const TABS = [
  { href: "/trade", label: "Trade", Icon: TradeIcon },
  { href: "/wallet", label: "Wallet", Icon: WalletIcon },
  { href: "/leaderboard", label: "Leaderboard", Icon: TrophyIcon },
];

// Bottom tab bar for signed-in users, pinned to the app column.
export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-app border-t border-line bg-canvas/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg sm:border-x"
    >
      <ul className="grid grid-cols-3">
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex h-16 flex-col items-center justify-center gap-1 text-[0.8125rem] font-medium transition-colors duration-150 ease-out active:opacity-70 ${
                  active ? "text-ink" : "text-muted hover:text-ink"
                }`}
              >
                <Icon className="size-6" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// Top-right link for signed-out visitors: the leaderboard, or back to sign-in
// when they are already on it.
export function GuestNavLink() {
  const onLeaderboard = usePathname() === "/leaderboard";
  return (
    <Link
      href={onLeaderboard ? "/" : "/leaderboard"}
      className="flex h-11 items-center rounded-full bg-surface px-4 font-medium transition-colors duration-150 ease-out hover:bg-raised"
    >
      {onLeaderboard ? "Sign in" : "Leaderboard"}
    </Link>
  );
}
