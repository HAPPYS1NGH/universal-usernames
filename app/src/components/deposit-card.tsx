"use client";

import { useEffect, useState } from "react";
import { formatWeiAsEth } from "@/lib/money";
import { CopyButton } from "./copy-button";
import { ArrowDownIcon, ArrowUpRightIcon } from "./icons";

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
    <section
      aria-labelledby="deposit-heading"
      className="overflow-hidden rounded-[1.75rem] bg-surface ring-1 ring-line"
    >
      <div className="p-4">
        <div className="flex items-center gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-raised">
            <ArrowDownIcon className="size-6" />
          </span>
          <div>
            <h2 id="deposit-heading" className="text-xl font-semibold tracking-tight">
              Deposit ETH
            </h2>
            <p className="text-muted">Send ETH on Ethereum mainnet to this address.</p>
          </div>
        </div>
        <div className="mt-4 rounded-xl bg-canvas p-4 ring-1 ring-line">
          <code className="block font-mono text-xl leading-snug break-all">{address}</code>
        </div>
        <div className="mt-3 grid">
          <CopyButton value={address} label="Copy address" />
        </div>
      </div>

      <div
        key={recentDeposit?.at}
        className="border-t border-line p-4"
        style={recentDeposit ? { animation: "flash-up 3s ease-out" } : undefined}
      >
        <div className="flex items-center justify-between gap-4">
          <p className="font-medium text-muted">Onchain balance</p>
          <a
            href={`https://etherscan.io/address/${address}`}
            target="_blank"
            rel="noreferrer"
            className="-my-2 -mr-2 inline-flex h-11 items-center gap-1 rounded-lg px-2 font-medium text-muted transition-colors duration-150 ease-out hover:text-ink"
          >
            View on Etherscan
            <ArrowUpRightIcon className="size-4" />
          </a>
        </div>
        <p className="mt-1 text-[2.75rem] leading-tight font-semibold tracking-tight tabular-nums">
          {balance.wei === null ? "–" : formatWeiAsEth(balance.wei)}
          <span className="ml-2 text-2xl font-medium text-muted">ETH</span>
        </p>
        {recentDeposit && (
          <p className="mt-3 inline-flex rounded-full bg-up-soft px-4 py-2 text-lg font-semibold text-up">
            +{formatWeiAsEth(recentDeposit.wei)} ETH received
          </p>
        )}
        <p className="mt-3 flex items-center gap-2.5 text-muted" aria-live="polite">
          <span className={`size-2 rounded-full ${balance.failed ? "bg-warn" : "animate-pulse bg-up"}`} />
          {checking
            ? "Checking Ethereum…"
            : balance.failed
              ? "Couldn't reach Ethereum. Retrying…"
              : `Updated ${secondsAgo === 0 ? "just now" : `${secondsAgo}s ago`}`}
        </p>
      </div>
      <div className="h-1 bg-canvas">
        {!checking && (
          <div
            key={balance.checkedAt}
            className="h-full origin-left bg-muted/60"
            style={{ animation: `countdown ${POLL_INTERVAL_MS}ms linear forwards` }}
          />
        )}
      </div>
    </section>
  );
}
