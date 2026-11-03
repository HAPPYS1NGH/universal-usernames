import { describe, expect, it } from "vitest";
import { planSweep, TRANSFER_GAS } from "@/lib/wallet/sweep-plan";

const GWEI = 1_000_000_000n;

describe("planSweep", () => {
  it("sends the balance minus the full 21,000-gas fee, leaving zero", () => {
    const balance = 10n ** 16n; // 0.01 ETH
    const result = planSweep(balance, 3n * GWEI);

    expect(result).toEqual({
      ok: true,
      plan: {
        valueWei: balance - 21_000n * 3n * GWEI,
        feeWei: 63_000n * GWEI,
        gas: TRANSFER_GAS,
        maxFeePerGas: 3n * GWEI,
        maxPriorityFeePerGas: 3n * GWEI,
      },
    });
    if (result.ok) expect(result.plan.valueWei + result.plan.feeWei).toBe(balance);
  });

  it("refuses an empty wallet", () => {
    expect(planSweep(0n, GWEI)).toEqual({ ok: false, reason: "zero_balance" });
  });

  it("refuses a balance that can't cover the fee", () => {
    const fee = TRANSFER_GAS * GWEI;
    expect(planSweep(fee, GWEI)).toEqual({ ok: false, reason: "insufficient_for_gas", feeWei: fee });
    expect(planSweep(fee - 1n, GWEI)).toMatchObject({ ok: false, reason: "insufficient_for_gas" });
  });

  it("sends 1 wei when the balance is 1 wei above the fee", () => {
    const result = planSweep(TRANSFER_GAS * GWEI + 1n, GWEI);
    expect(result.ok && result.plan.valueWei).toBe(1n);
  });

  it("rejects a non-positive fee", () => {
    expect(() => planSweep(10n ** 18n, 0n)).toThrow();
  });
});
