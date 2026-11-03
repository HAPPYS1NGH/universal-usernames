import { toHex } from "viem";
import { packetToBytes } from "viem/ens";
import { describe, expect, it } from "vitest";
import { decodeDnsName } from "../src/dns-name.ts";

describe("decodeDnsName", () => {
  it("decodes a DNS wire-format name into labels", () => {
    expect(decodeDnsName("0x0568617070790874726164657069740365746800")).toEqual(["happy", "tradepit", "eth"]);
  });

  it("round-trips names encoded by viem", () => {
    for (const name of ["tradepit.eth", "happy.tradepit.eth", "a.b.c.tradepit.eth"]) {
      expect(decodeDnsName(toHex(packetToBytes(name))).join(".")).toBe(name);
    }
  });

  it("decodes the root name to no labels", () => {
    expect(decodeDnsName("0x00")).toEqual([]);
  });

  it("rejects a name without the terminating zero byte", () => {
    expect(() => decodeDnsName("0x03657468")).toThrow(/terminating zero byte/);
    expect(() => decodeDnsName("0x")).toThrow(/terminating zero byte/);
  });

  it("rejects a label length that runs past the end", () => {
    expect(() => decodeDnsName("0x0a65746800")).toThrow(/past the end/);
  });

  it("rejects bytes after the terminating zero byte", () => {
    expect(() => decodeDnsName("0x0365746800ff")).toThrow(/after the end/);
  });

  it("rejects labels that contain a dot or invalid UTF-8", () => {
    expect(() => decodeDnsName("0x03612e6200")).toThrow(/dot/);
    expect(() => decodeDnsName("0x02c3280000")).toThrow();
  });
});
