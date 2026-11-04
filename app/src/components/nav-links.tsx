"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TradeIcon, TrophyIcon, WalletIcon } from "./icons";

const TABS = [
  { href: "/trade", label: "Trade", Icon: TradeIcon },
  { href: "/wallet", label: "Wallet", Icon: WalletIcon },
  { href: "/leaderboard", label: "Leaderboard", Icon: TrophyIcon },
];

// Floating tab bar for signed-in users: a white pill docked above the home
// indicator, inside the app column.
export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-app px-5 pb-[calc(0.75rem_+_env(safe-area-inset-bottom))]"
    >
      <ul className="pointer-events-auto grid grid-cols-3 rounded-full bg-surface/95 p-1.5 shadow-dock backdrop-blur-lg">
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex h-14 flex-col items-center justify-center gap-0.5 rounded-full text-[0.75rem] font-semibold tracking-[-0.005em] transition-[background-color,color,scale] duration-150 ease-ios active:scale-[0.96] ${
                  active ? "bg-fill text-ink" : "text-muted hover:text-ink"
                }`}
              >
                <Icon className="size-[1.375rem]" />
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
      className="flex h-11 items-center rounded-full bg-surface px-4 text-[0.9375rem] font-[650] tracking-[-0.02em] shadow-raised transition-[scale] duration-150 ease-ios active:scale-[0.96]"
    >
      {onLeaderboard ? "Sign in" : "Leaderboard"}
    </Link>
  );
}
