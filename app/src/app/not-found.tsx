import type { Metadata } from "next";
import Link from "next/link";
import { PRIMARY_BUTTON } from "@/components/control-styles";
import { brandName } from "@/lib/config";

export const metadata: Metadata = { title: "Page not found" };

// Replaces Next's default 404, which sets its own body colors and clashes with
// the cream app column. This one renders inside the layout.
export default function NotFound() {
  return (
    <div className="flex flex-col gap-8 pt-6">
      <section>
        <p className="text-[0.9375rem] font-semibold text-muted tabular-nums">404</p>
        <h1 className="mt-1 text-[2rem] leading-tight font-[750] tracking-[-0.035em] text-balance">Page not found</h1>
        <p className="mt-2 text-[1.0625rem] leading-normal font-medium text-muted text-pretty">
          There&apos;s nothing at this address. Check the link, or head back to {brandName()}.
        </p>
      </section>
      <Link href="/" className={PRIMARY_BUTTON}>
        Back to {brandName()}
      </Link>
    </div>
  );
}
