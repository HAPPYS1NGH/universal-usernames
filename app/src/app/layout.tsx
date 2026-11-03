import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TabBar } from "@/components/nav-links";
import { SiteHeader } from "@/components/site-header";
import { getSessionUser } from "@/lib/auth/session";
import { appUrl, brandName } from "@/lib/config";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export function generateMetadata(): Metadata {
  const brand = brandName();
  return {
    metadataBase: new URL(appUrl()),
    title: { default: brand, template: `%s · ${brand}` },
    description: `Paper-trade ETH on ${brand}.`,
  };
}

// Room below the content for the fixed tab bar and the phone's home indicator.
const BOTTOM_PADDING = {
  withTabBar: "pb-[calc(6rem_+_env(safe-area-inset-bottom))]",
  plain: "pb-[calc(2.5rem_+_env(safe-area-inset-bottom))]",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  // Matches --color-canvas, so the phone's status bar blends into the app.
  themeColor: "#0e0e11",
  colorScheme: "dark",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getSessionUser();

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-dvh font-sans">
        {/* Phone-width app column. On wide screens it sits centered on the backdrop. */}
        <div className="mx-auto flex min-h-dvh w-full max-w-app flex-col bg-canvas sm:border-x sm:border-line">
          <SiteHeader user={user} />
          <main className={`flex-1 px-4 pt-2 ${user ? BOTTOM_PADDING.withTabBar : BOTTOM_PADDING.plain}`}>
            {children}
          </main>
          {user && <TabBar />}
        </div>
      </body>
    </html>
  );
}
