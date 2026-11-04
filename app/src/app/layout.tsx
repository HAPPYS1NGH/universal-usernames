import type { Metadata, Viewport } from "next";
import { TabBar } from "@/components/nav-links";
import { SiteHeader } from "@/components/site-header";
import { getSessionUser } from "@/lib/auth/session";
import { getAvatarChoice } from "@/lib/avatars/avatar-store";
import { appUrl, brandName } from "@/lib/config";
import { getDb } from "@/lib/db/connection";
import "./globals.css";

export function generateMetadata(): Metadata {
  const brand = brandName();
  return {
    metadataBase: new URL(appUrl()),
    title: { default: brand, template: `%s · ${brand}` },
    description: `Paper-trade ETH on ${brand}.`,
  };
}

// Room below the content for the floating tab bar and the phone's home indicator.
const BOTTOM_PADDING = {
  withTabBar: "pb-[calc(7.5rem_+_env(safe-area-inset-bottom))]",
  plain: "pb-[calc(2.5rem_+_env(safe-area-inset-bottom))]",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  // Matches --color-canvas, so the phone's status bar blends into the app.
  themeColor: "#f8f5f0",
  colorScheme: "light",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getSessionUser();
  const avatar = user ? getAvatarChoice(getDb(), user.username) : null;

  return (
    <html lang="en">
      <body className="min-h-dvh font-sans">
        {/* Phone-width app column, centered on the cream ground on wide screens. */}
        <div className="mx-auto flex min-h-dvh w-full max-w-app flex-col">
          <SiteHeader user={user} avatar={avatar} />
          <main className={`flex-1 px-5 pt-2 ${user ? BOTTOM_PADDING.withTabBar : BOTTOM_PADDING.plain}`}>
            {children}
          </main>
          {user && <TabBar />}
        </div>
      </body>
    </html>
  );
}
