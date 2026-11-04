import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { CopyButton } from "@/components/copy-button";
import { pnlToneClass } from "@/components/pnl-tone";
import { validateUsername } from "@/lib/auth/username";
import { brandName } from "@/lib/config";
import { getDb } from "@/lib/db/connection";
import { getEthPrice } from "@/lib/market/eth-price";
import { formatPercent, formatUsd } from "@/lib/money";
import { getPublicProfile } from "@/lib/profiles/public-profile";

export async function generateMetadata({ params }: PageProps<"/u/[username]">): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${username}` };
}

export default async function ProfilePage({ params }: PageProps<"/u/[username]">) {
  const { username } = await params;
  if (!validateUsername(username).ok) notFound();

  const price = await getEthPrice();
  const profile = getPublicProfile(getDb(), username, price.cents);
  if (!profile) notFound();

  const pnlTone = pnlToneClass(profile.pnlPercent);
  // Cents are dimmed so the dollar figure reads first.
  const [dollars, cents] = formatUsd(profile.valueCents).split(".");

  return (
    <div className="flex flex-col gap-7 pt-2">
      <header>
        <Image
          src={`/api/avatar/${profile.username}`}
          alt=""
          width={80}
          height={80}
          unoptimized
          className="size-20 rounded-full outline-1 -outline-offset-1 outline-white/10"
        />
        <h1 className="mt-4 text-3xl font-semibold tracking-tight [overflow-wrap:anywhere]">@{profile.username}</h1>
        <p className="mt-3 text-lg">Trader on {brandName()}</p>
        <p className="mt-1 text-lg">
          <span className="font-semibold tabular-nums">#{profile.rank}</span>
          <span className="text-muted"> of {profile.traderCount} traders</span>
        </p>
      </header>

      <section aria-labelledby="profile-value-label">
        <p id="profile-value-label" className="font-medium text-muted">
          Portfolio value
        </p>
        <p className="mt-1 text-[2.75rem] leading-none font-semibold tracking-tight tabular-nums">
          {dollars}
          <span className="text-muted">.{cents}</span>
        </p>
        <p className="mt-3 text-lg tabular-nums">
          <span className={`font-semibold ${pnlTone}`}>{formatPercent(profile.pnlPercent)} PnL</span>
          <span className="text-muted"> all time, excluding transfers</span>
        </p>
      </section>

      <section aria-labelledby="address-heading" className="rounded-[1.75rem] bg-surface p-4 ring-1 ring-line">
        <h2 id="address-heading" className="text-xl font-semibold tracking-tight">
          Wallet address
        </h2>
        <div className="mt-4 rounded-xl bg-canvas p-4 ring-1 ring-line">
          <code className="block font-mono text-xl leading-snug break-all">{profile.address}</code>
        </div>
        <div className="mt-3 grid">
          <CopyButton value={profile.address} label="Copy address" />
        </div>
      </section>
    </div>
  );
}
