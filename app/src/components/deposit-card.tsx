"use client";

import { useEffect, useState, type ReactNode } from "react";
import { formatWeiAsEth } from "@/lib/money";
import { AnimatedNumber } from "./animated-number";
import { QUIET_BUTTON } from "./control-styles";
import { CopyButton } from "./copy-button";
import { ArrowUpRightIcon } from "./icons";

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

type DepositCardProps = {
  address: string;
  // Shown above the hex address when the app has an ENS parent name.
  ensName: string | null;
  // Rendered on the server, so the QR encoder never ships to the browser.
  qr: ReactNode;
};

export function DepositCard({ address, ensName, qr }: DepositCardProps) {
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
    <section aria-labelledby="deposit-heading" className="overflow-hidden rounded-card bg-surface shadow-card">
      <div className="flex flex-col items-center p-5 text-center">
        <h2 id="deposit-heading" className="text-[1.0625rem] font-[650] tracking-[-0.02em]">
          Deposit ETH
        </h2>
        <p className="mt-0.5 text-[0.9375rem] font-medium text-muted text-balance">
          {ensName
            ? "Send ETH from any ENS-aware wallet to this name."
            : "Send ETH on Ethereum mainnet to this address."}
        </p>
        {ensName && (
          <>
            <div className="mt-4 w-full rounded-2xl bg-accent-soft/60 px-4 py-3.5">
              <p className="text-[0.8125rem] font-semibold text-accent-ink">Your ENS name</p>
              <p className="mt-0.5 text-[1.75rem] leading-tight font-[750] tracking-[-0.03em] [overflow-wrap:anywhere]">
                {ensName}
              </p>
            </div>
            <div className="mt-2.5 grid w-full">
              <CopyButton value={ensName} label="Copy name" />
            </div>
            <p className="mt-6 text-[0.9375rem] font-medium text-muted">Or send on Ethereum mainnet to the address</p>
          </>
        )}
        <div className={ensName ? "mt-4" : "mt-5"}>{qr}</div>
        <code className="mt-5 block max-w-[24ch] font-mono text-[1rem] leading-snug font-semibold break-all">
          {address}
        </code>
        <div className="mt-4 grid w-full grid-cols-2 gap-2">
          <CopyButton value={address} label="Copy" />
          <a
            href={`https://etherscan.io/address/${address}`}
            target="_blank"
            rel="noreferrer"
            className={`${QUIET_BUTTON} pr-4 pl-5`}
          >
            Etherscan
            <ArrowUpRightIcon className="size-4" />
          </a>
        </div>
      </div>

      <div
        key={recentDeposit?.at}
        className="border-t border-line px-5 pt-4 pb-5"
        style={recentDeposit ? { animation: "flash-up 3s ease-out" } : undefined}
      >
        <p className="text-[0.9375rem] font-medium text-muted">Onchain balance</p>
        <p className="mt-1 text-[2.25rem] leading-tight font-bold tracking-[-0.03em] tabular-nums">
          {balance.wei === null ? "–" : <AnimatedNumber value={Number(formatWeiAsEth(balance.wei))} maxFractionDigits={6} />}
          <span className="ml-2 text-[1.25rem] font-semibold text-muted">ETH</span>
        </p>
        {recentDeposit && (
          <p className="mt-3 inline-flex rounded-full bg-up-soft px-4 py-2 text-[0.9375rem] font-semibold text-up">
            +{formatWeiAsEth(recentDeposit.wei)} ETH received
          </p>
        )}
        <p className="mt-2 flex items-center gap-2 text-[0.8125rem] font-medium text-muted tabular-nums" aria-live="polite">
          <span className={`size-2 rounded-full ${balance.failed ? "bg-warn" : "animate-pulse bg-up-dot"}`} />
          {checking
            ? "Checking Ethereum…"
            : balance.failed
              ? "Couldn't reach Ethereum. Retrying…"
              : `Updated ${secondsAgo === 0 ? "just now" : `${secondsAgo}s ago`}`}
        </p>
      </div>
      <div className="h-1 bg-fill">
        {!checking && (
          <div
            key={balance.checkedAt}
            className="h-full origin-left bg-lavender"
            style={{ animation: `countdown ${POLL_INTERVAL_MS}ms linear forwards` }}
          />
        )}
      </div>
    </section>
  );
}
