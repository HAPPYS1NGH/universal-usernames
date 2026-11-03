"use client";

import { useEffect, useState } from "react";
import { formatWeiAsEth } from "@/lib/money";
import { CopyButton } from "./copy-button";

const POLL_INTERVAL_MS = 10_000;

type BalanceState = {
  wei: bigint | null;
  checkedAt: number | null;
  failed: boolean;
  lastDeposit: { wei: bigint; at: number } | null;
};

const INITIAL_BALANCE: BalanceState = { wei: null, checkedAt: null, failed: false, lastDeposit: null };

function nextBalance(previous: BalanceState, wei: bigint): BalanceState {
  const increased = previous.wei !== null && wei > previous.wei;
  return {
    wei,
    checkedAt: Date.now(),
    failed: false,
    lastDeposit: increased ? { wei: wei - (previous.wei ?? 0n), at: Date.now() } : previous.lastDeposit,
  };
}

async function fetchBalanceWei(): Promise<bigint> {
  const response = await fetch("/api/wallet/balance", { cache: "no-store" });
  if (!response.ok) throw new Error(`Balance request failed with ${response.status}`);
  const body = (await response.json()) as { balanceWei: string };
  return BigInt(body.balanceWei);
}

export function DepositCard({ address }: { address: string }) {
  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const [checking, setChecking] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function check() {
      try {
        const wei = await fetchBalanceWei();
        if (!cancelled) setBalance((previous) => nextBalance(previous, wei));
      } catch {
        // The server logs the RPC error; here we keep the last balance and show
        // a retry notice instead.
        if (!cancelled) setBalance((previous) => ({ ...previous, failed: true, checkedAt: Date.now() }));
      }
      if (cancelled) return;
      setChecking(false);
      timer = setTimeout(() => {
        setChecking(true);
        void check();
      }, POLL_INTERVAL_MS);
    }

    void check();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const secondsAgo = balance.checkedAt === null ? null : Math.max(0, Math.round((now - balance.checkedAt) / 1000));
  const recentDeposit = balance.lastDeposit && now - balance.lastDeposit.at < 60_000 ? balance.lastDeposit : null;

  return (
    <section className="overflow-hidden rounded-3xl bg-surface ring-1 ring-line">
      <div className="p-8 sm:p-10">
        <h2 className="text-2xl font-semibold tracking-tight">Deposit ETH</h2>
        <p className="mt-2 text-lg text-muted">Send ETH on Ethereum mainnet to this address.</p>
        <div className="mt-6 flex flex-col items-start gap-4 rounded-2xl bg-canvas p-5 ring-1 ring-line lg:flex-row lg:items-center lg:justify-between">
          <code className="min-w-0 font-mono text-xl leading-snug break-all lg:text-2xl">{address}</code>
          <CopyButton value={address} label="Copy address" />
        </div>
      </div>

      <div
        key={recentDeposit?.at}
        className="border-t border-line p-8 sm:p-10"
        style={recentDeposit ? { animation: "flash-up 3s ease-out" } : undefined}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <p className="text-lg font-medium text-muted">Onchain balance</p>
          <a
            href={`https://etherscan.io/address/${address}`}
            target="_blank"
            rel="noreferrer"
            className="text-muted underline decoration-line underline-offset-4 hover:text-ink"
          >
            View on Etherscan
          </a>
        </div>
        <p className="mt-2 text-6xl font-semibold tracking-tight tabular-nums sm:text-7xl">
          {balance.wei === null ? "–" : formatWeiAsEth(balance.wei)}
          <span className="ml-4 text-3xl font-medium text-muted">ETH</span>
        </p>
        {recentDeposit && (
          <p className="mt-4 inline-flex rounded-full bg-up-soft px-4 py-2 text-lg font-semibold text-up">
            +{formatWeiAsEth(recentDeposit.wei)} ETH received
          </p>
        )}
        <p className="mt-6 flex items-center gap-3 text-muted" aria-live="polite">
          <span className={`size-2.5 rounded-full ${balance.failed ? "bg-amber-500" : "animate-pulse bg-up"}`} />
          {checking
            ? "Checking Ethereum…"
            : balance.failed
              ? "Couldn't reach Ethereum. Retrying…"
              : `Updated ${secondsAgo === 0 ? "just now" : `${secondsAgo}s ago`}`}
        </p>
      </div>
      <div className="h-1.5 bg-canvas">
        {!checking && (
          <div
            key={balance.checkedAt}
            className="h-full origin-left bg-ink/70"
            style={{ animation: `countdown ${POLL_INTERVAL_MS}ms linear forwards` }}
          />
        )}
      </div>
    </section>
  );
}
