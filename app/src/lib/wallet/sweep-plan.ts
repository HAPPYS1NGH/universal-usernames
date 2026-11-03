// Amount and fee for moving an embedded wallet's entire ETH balance out in a
// plain transfer.

export const TRANSFER_GAS = 21_000n;

export type SweepPlan = {
  valueWei: bigint;
  feeWei: bigint;
  gas: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
};

export type SweepPlanResult =
  | { ok: true; plan: SweepPlan }
  | { ok: false; reason: "zero_balance" }
  | { ok: false; reason: "insufficient_for_gas"; feeWei: bigint };

// The priority fee is set equal to the max fee, so the transaction pays exactly
// maxFeePerGas per gas whatever the base fee turns out to be. That makes the
// fee known up front and leaves a balance of exactly zero; with a lower tip the
// unused part of the max fee would stay behind as dust. The extra goes to the
// block builder and is small next to the 21,000-gas fee itself.
export function planSweep(balanceWei: bigint, maxFeePerGas: bigint): SweepPlanResult {
  if (maxFeePerGas <= 0n) throw new Error(`Invalid maxFeePerGas: ${maxFeePerGas}`);
  if (balanceWei <= 0n) return { ok: false, reason: "zero_balance" };

  const feeWei = TRANSFER_GAS * maxFeePerGas;
  if (balanceWei <= feeWei) return { ok: false, reason: "insufficient_for_gas", feeWei };

  return {
    ok: true,
    plan: {
      valueWei: balanceWei - feeWei,
      feeWei,
      gas: TRANSFER_GAS,
      maxFeePerGas,
      maxPriorityFeePerGas: maxFeePerGas,
    },
  };
}
