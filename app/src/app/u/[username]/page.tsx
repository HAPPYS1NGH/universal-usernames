import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AvatarFace } from "@/components/avatar-face";
import { AvatarPicker } from "@/components/avatar-picker";
import { QUIET_BUTTON } from "@/components/control-styles";
import { CopyButton } from "@/components/copy-button";
import { ArrowUpRightIcon, PencilIcon } from "@/components/icons";
import { pnlToneClass } from "@/components/pnl-tone";
import { avatarFace, generatedAvatarFace } from "@/components/user-avatar";
import { getSessionUser } from "@/lib/auth/session";
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

// Public profile, laid out like the Aave app's: the avatar and names centered
// on top, then the numbers in a white card. On your own profile the avatar
// opens the avatar picker.
export default async function ProfilePage({ params }: PageProps<"/u/[username]">) {
  const { username } = await params;
  if (!validateUsername(username).ok) notFound();

  const price = await getEthPrice();
  const profile = getPublicProfile(getDb(), username, price.cents);
  if (!profile) notFound();
  const isYou = (await getSessionUser())?.username === profile.username;
  const face = avatarFace(profile.username, profile.avatar);

  return (
    <div className="flex flex-col gap-6 pt-3">
      <header className="flex flex-col items-center text-center">
        {isYou ? (
          <AvatarPicker
            username={profile.username}
            current={face}
            generated={generatedAvatarFace(profile.username)}
          >
            <span className="relative block">
              <AvatarFace face={face} size="lg" />
              <span className="absolute -right-0.5 -bottom-0.5 grid size-8 place-items-center rounded-full bg-surface text-ink shadow-raised">
                <PencilIcon className="size-4" />
              </span>
            </span>
          </AvatarPicker>
        ) : (
          <AvatarFace face={face} size="lg" />
        )}
        <h1 className="mt-3 text-[1.625rem] leading-tight font-[750] tracking-[-0.03em] [overflow-wrap:anywhere]">
          @{profile.username}
        </h1>
        <p className="mt-1 text-[0.9375rem] font-medium text-muted">Trader on {brandName()}</p>
      </header>

      <section aria-labelledby="profile-value-label" className="rounded-card bg-surface shadow-card">
        <div className="px-5 pt-5 pb-4 text-center">
          <p id="profile-value-label" className="text-[0.9375rem] font-medium text-muted">
            Portfolio value
          </p>
          <p className="mt-1 text-[2.25rem] leading-tight font-bold tracking-[-0.03em] tabular-nums">
            {formatUsd(profile.valueCents)}
          </p>
        </div>
        <dl className="grid grid-cols-[1fr_1px_1fr] items-center border-t border-line py-4">
          <div className="text-center">
            <dt className="text-[0.8125rem] font-medium text-muted">Rank</dt>
            <dd className="mt-0.5 text-[1.375rem] font-bold tabular-nums">
              #{profile.rank}
              <span className="text-[0.9375rem] font-semibold text-muted"> of {profile.traderCount}</span>
            </dd>
          </div>
          <div aria-hidden className="h-10 bg-line" />
          <div className="text-center">
            <dt className="text-[0.8125rem] font-medium text-muted">PnL, excluding transfers</dt>
            <dd className={`mt-0.5 text-[1.375rem] font-bold tabular-nums ${pnlToneClass(profile.pnlPercent)}`}>
              {formatPercent(profile.pnlPercent)}
            </dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="address-heading" className="rounded-card bg-surface p-5 shadow-card">
        <h2 id="address-heading" className="text-[1.0625rem] font-[650] tracking-[-0.02em]">
          Wallet address
        </h2>
        <code className="mt-2 block font-mono text-[1rem] leading-snug font-semibold break-all">{profile.address}</code>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <CopyButton value={profile.address} label="Copy" />
          <a
            href={`https://etherscan.io/address/${profile.address}`}
            target="_blank"
            rel="noreferrer"
            className={`${QUIET_BUTTON} pr-4 pl-5`}
          >
            Etherscan
            <ArrowUpRightIcon className="size-4" />
          </a>
        </div>
      </section>
    </div>
  );
}
