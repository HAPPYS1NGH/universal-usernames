import Link from "next/link";
import { signOut } from "@/app/auth-actions";
import type { SessionUser } from "@/lib/auth/session";
import { brandName } from "@/lib/config";
import { BrandMark } from "./brand-mark";
import { SignOutIcon } from "./icons";
import { GuestNavLink } from "./nav-links";
import { UserAvatar } from "./user-avatar";

// Top bar of the app column. Signed in, it shows who you are, like a wallet
// app's account header; signed out, it shows the brand.
export function SiteHeader({ user }: { user: SessionUser | null }) {
  const brand = brandName();

  return (
    <header className="sticky top-0 z-20 bg-canvas/85 pt-[env(safe-area-inset-top)] backdrop-blur-lg">
      <div className="flex h-16 items-center justify-between gap-4 px-4">
        {user ? (
          <Link
            href="/trade"
            className="-mx-1 flex min-w-0 items-center gap-3 rounded-full p-1 pr-4 transition-colors duration-150 ease-out hover:bg-surface"
          >
            <UserAvatar username={user.username} size="sm" />
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-lg font-semibold">@{user.username}</span>
              <span className="block text-sm text-muted">{brand}</span>
            </span>
          </Link>
        ) : (
          <Link
            href="/"
            className="-mx-1 flex items-center gap-2.5 rounded-full p-1 pr-4 text-lg font-semibold tracking-tight transition-colors duration-150 ease-out hover:bg-surface"
          >
            <BrandMark brand={brand} />
            {brand}
          </Link>
        )}
        {user ? (
          <form action={signOut}>
            <button
              type="submit"
              aria-label="Sign out"
              title="Sign out"
              className="-mr-1.5 grid size-11 place-items-center rounded-full text-muted transition-[color,background-color,transform] duration-150 ease-out hover:bg-surface hover:text-ink active:scale-[0.96]"
            >
              <SignOutIcon className="size-[1.375rem]" />
            </button>
          </form>
        ) : (
          <GuestNavLink />
        )}
      </div>
    </header>
  );
}
