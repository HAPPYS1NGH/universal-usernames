import type { Metadata } from "next";
import Link from "next/link";
import { brandName } from "@/lib/config";

export const metadata: Metadata = { title: "Page not found" };

// Replaces Next's default 404, which sets its own black-on-white body colors
// and clashes with the dark app column. This one renders inside the layout.
export default function NotFound() {
  return (
    <div className="flex flex-col gap-8 pt-6">
      <section>
        <p className="text-lg font-semibold text-muted tabular-nums">404</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-balance">Page not found</h1>
        <p className="mt-2 text-lg leading-relaxed text-muted text-pretty">
          There&apos;s nothing at this address. Check the link, or head back to {brandName()}.
        </p>
      </section>
      <Link
        href="/"
        className="flex h-14 items-center justify-center rounded-xl bg-ink px-6 text-lg font-semibold text-canvas transition-[background-color,transform] duration-150 ease-out hover:bg-ink/90 active:scale-[0.96]"
      >
        Back to {brandName()}
      </Link>
    </div>
  );
}
