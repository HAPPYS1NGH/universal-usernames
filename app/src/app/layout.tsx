import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-dvh font-sans">
        <SiteHeader />
        <main className="mx-auto w-full max-w-6xl px-6 pb-24 pt-10 sm:px-10">{children}</main>
      </body>
    </html>
  );
}
