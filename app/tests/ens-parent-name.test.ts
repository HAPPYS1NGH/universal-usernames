import { describe, expect, it } from "vitest";
import { parseEnsParentName } from "@/lib/config";

describe("parseEnsParentName", () => {
  it("is off when unset or blank", () => {
    expect(parseEnsParentName(undefined)).toBeNull();
    expect(parseEnsParentName("  ")).toBeNull();
  });

  it.each(["tradepit.eth", "demo.tradepit.eth", "tradepit.xyz"])("accepts %s", (name) => {
    expect(parseEnsParentName(` ${name} `)).toBe(name);
  });

  it.each(["Tradepit.eth", "tradepit", "trade pit.eth", "tradepit.eth.", ".eth", "trade..eth"])(
    "rejects %s",
    (name) => {
      expect(() => parseEnsParentName(name)).toThrow(/ENS_PARENT_NAME/);
    },
  );
});
