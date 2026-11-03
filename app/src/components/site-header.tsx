import Link from "next/link";
import { signOut } from "@/app/auth-actions";
import { getSessionUser } from "@/lib/auth/session";
import { brandName } from "@/lib/config";
import { BrandMark } from "./brand-mark";
import { NavLinks } from "./nav-links";

export async function SiteHeader() {
  const user = await getSessionUser();
  const brand = brandName();

  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex min-h-20 w-full max-w-6xl flex-wrap items-center gap-x-10 gap-y-3 px-6 py-4 sm:px-10">
        <Link href={user ? "/trade" : "/"} className="flex items-center gap-3 text-xl font-semibold tracking-tight">
          <BrandMark brand={brand} />
          {brand}
        </Link>
        <NavLinks signedIn={user !== null} />
        {user && (
          <div className="ml-auto flex items-center gap-4">
            <span className="hidden rounded-full bg-canvas px-4 py-2 font-medium md:inline">@{user.username}</span>
            <form action={signOut}>
              <button type="submit" className="text-muted transition-colors hover:text-ink">
                Sign out
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
