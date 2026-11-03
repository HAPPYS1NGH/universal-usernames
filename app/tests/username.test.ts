import { describe, expect, it } from "vitest";
import { parseUsernameInput, validateUsername } from "@/lib/auth/username";

describe("validateUsername", () => {
  it.each(["happy", "abc", "a-b-c", "trader-42", "007", "a".repeat(20)])("accepts %s", (username) => {
    expect(validateUsername(username)).toEqual({ ok: true, username });
  });

  it.each([
    ["ab", "too short"],
    ["a".repeat(21), "too long"],
    ["Happy", "uppercase"],
    ["hap py", "space"],
    ["happy_1", "underscore"],
    ["héllo", "non-ascii"],
    ["-happy", "leading hyphen"],
    ["happy-", "trailing hyphen"],
    ["ha--ppy", "double hyphen"],
    ["admin", "reserved"],
    ["www", "reserved"],
  ])("rejects %s (%s)", (username) => {
    expect(validateUsername(username).ok).toBe(false);
  });
});

describe("parseUsernameInput", () => {
  it("normalizes form input before validating", () => {
    expect(parseUsernameInput("  @Happy ")).toEqual({ ok: true, username: "happy" });
  });

  it("still applies the strict rules", () => {
    expect(parseUsernameInput("@ha--ppy").ok).toBe(false);
  });
});
