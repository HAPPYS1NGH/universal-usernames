import Link from "next/link";
import { signOut } from "@/app/auth-actions";
import type { SessionUser } from "@/lib/auth/session";
import { brandName } from "@/lib/config";
import { BrandMark } from "./brand-mark";
import { ICON_BUTTON } from "./control-styles";
import { SignOutIcon } from "./icons";
import { GuestNavLink } from "./nav-links";
import { UserAvatar } from "./user-avatar";

// Top bar of the app column. Signed in, it shows who you are, like a wallet
// app's account header; signed out, it shows the brand.
export function SiteHeader({ user }: { user: SessionUser | null }) {
  const brand = brandName();

  return (
    <header className="sticky top-0 z-20 bg-canvas/85 pt-[env(safe-area-inset-top)] backdrop-blur-lg">
      <div className="flex h-[4.25rem] items-center justify-between gap-4 px-5">
        {user ? (
          <Link
            href="/trade"
            className="-ml-1 flex min-w-0 items-center gap-3 rounded-full p-1 pr-3 transition-colors duration-150 ease-out hover:bg-fill"
          >
            <UserAvatar username={user.username} size="sm" />
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[1.0625rem] font-[650] tracking-[-0.02em]">@{user.username}</span>
              <span className="block text-[0.8125rem] font-medium text-muted">{brand}</span>
            </span>
          </Link>
        ) : (
          <Link
            href="/"
            className="-ml-1 flex items-center gap-2.5 rounded-full p-1 pr-3 text-[1.0625rem] font-[650] tracking-[-0.02em] transition-colors duration-150 ease-out hover:bg-fill"
          >
            <BrandMark brand={brand} />
            {brand}
          </Link>
        )}
        {user ? (
          <form action={signOut}>
            <button type="submit" aria-label="Sign out" title="Sign out" className={`${ICON_BUTTON} hover:text-muted`}>
              <SignOutIcon className="size-5" />
            </button>
          </form>
        ) : (
          <GuestNavLink />
        )}
      </div>
    </header>
  );
}
