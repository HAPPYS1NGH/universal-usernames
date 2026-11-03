import { describe, expect, it } from "vitest";
import { ethGweiForCents, ethValueCents, formatWeiAsEth, parseUsdToCents } from "@/lib/money";

describe("parseUsdToCents", () => {
  it.each([
    ["100", 100_00],
    ["99.5", 99_50],
    ["0.01", 1],
    ["$1,250.75", 1_250_75],
    [" 20 ", 20_00],
  ])("parses %s", (input, cents) => {
    expect(parseUsdToCents(input)).toBe(cents);
  });

  it.each(["", "abc", "-5", "1.234", "1e3", "12.", ".5", "99999999999"])("rejects %s", (input) => {
    expect(parseUsdToCents(input)).toBeNull();
  });
});

describe("ETH conversions", () => {
  it("rounds ETH bought down and ETH sold up", () => {
    // $10 at $3,000.00/ETH = 0.003333... ETH
    expect(ethGweiForCents(10_00, 3_000_00, "down")).toBe(3_333_333);
    expect(ethGweiForCents(10_00, 3_000_00, "up")).toBe(3_333_334);
  });

  it("never pays out more than ETH is worth", () => {
    expect(ethValueCents(3_333_333, 3_000_00, "down")).toBe(9_99);
    expect(ethValueCents(3_333_333, 3_000_00, "nearest")).toBe(10_00);
  });

  it("formats wei as ETH without float rounding", () => {
    expect(formatWeiAsEth(0n)).toBe("0");
    expect(formatWeiAsEth(10n ** 18n)).toBe("1");
    expect(formatWeiAsEth(1_234_567_890_000_000_000n)).toBe("1.234567");
    expect(formatWeiAsEth(500_000_000_000_000n)).toBe("0.0005");
  });
});
