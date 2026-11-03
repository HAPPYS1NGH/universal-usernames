import { describe, expect, it } from "vitest";
import { isValidUsername, usernameFromName } from "../src/username.ts";

describe("isValidUsername", () => {
  it.each(["abc", "happy", "trader-42", "a1b2c3d4e5f6g7h8i9j0"])("accepts %s", (label) => {
    expect(isValidUsername(label)).toBe(true);
  });

  it.each(["ab", "a1b2c3d4e5f6g7h8i9j0k", "Happy", "-happy", "happy-", "ha--ppy", "hap_py", "hap.py", "häppy", ""])(
    "rejects %j",
    (label) => {
      expect(isValidUsername(label)).toBe(false);
    },
  );
});

describe("usernameFromName", () => {
  it("returns the label of <username>.<parent>", () => {
    expect(usernameFromName("happy.tradepit.eth", "tradepit.eth")).toBe("happy");
  });

  it("returns null for the parent, nested names, other parents and invalid labels", () => {
    expect(usernameFromName("tradepit.eth", "tradepit.eth")).toBeNull();
    expect(usernameFromName("a.happy.tradepit.eth", "tradepit.eth")).toBeNull();
    expect(usernameFromName("happy.other.eth", "tradepit.eth")).toBeNull();
    expect(usernameFromName("happy.nottradepit.eth", "tradepit.eth")).toBeNull();
    expect(usernameFromName("ab.tradepit.eth", "tradepit.eth")).toBeNull();
  });
});
