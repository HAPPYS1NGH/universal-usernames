import { decodeFunctionResult, parseAbi, zeroAddress } from "viem";
import { namehash } from "viem/ens";
import { describe, expect, it } from "vitest";
import type { Profile } from "../src/adapter-client.ts";
import type { LookupRequest } from "../src/decode-request.ts";
import { encodeResult } from "../src/records.ts";
import { HAPPY_ADDRESS } from "./lookup-fixtures.ts";

const NODE = namehash("happy.tradepit.eth");
const PROFILE: Profile = {
  address: HAPPY_ADDRESS,
  texts: new Map([["description", "Rank #2 on Tradepit"]]),
};

// Decode results with the original resolver ABI, the way a client would.
const abi = parseAbi([
  "function addr(bytes32 node) view returns (address)",
  "function addrByCoinType(bytes32 node, uint256 coinType) view returns (bytes)",
  "function text(bytes32 node, string key) view returns (string)",
  "function contenthash(bytes32 node) view returns (bytes)",
  "function multicall(bytes[] data) returns (bytes[] results)",
]);

function single(call: LookupRequest["calls"][number]): LookupRequest {
  return { name: "happy.tradepit.eth", calls: [call], isMulticall: false };
}

describe("encodeResult", () => {
  it("encodes addr(bytes32) as an address", () => {
    const result = encodeResult(single({ kind: "addr", node: NODE }), PROFILE);
    expect(decodeFunctionResult({ abi, functionName: "addr", data: result })).toBe(HAPPY_ADDRESS);
  });

  it("encodes addr(bytes32,uint256) as address bytes for coin type 60 only", () => {
    const eth = encodeResult(single({ kind: "addrByCoinType", node: NODE, coinType: 60n }), PROFILE);
    const base = encodeResult(single({ kind: "addrByCoinType", node: NODE, coinType: 0x80002105n }), PROFILE);

    expect(decodeFunctionResult({ abi, functionName: "addrByCoinType", data: eth })).toBe(HAPPY_ADDRESS.toLowerCase());
    expect(decodeFunctionResult({ abi, functionName: "addrByCoinType", data: base })).toBe("0x");
  });

  it("encodes text(bytes32,string) as a string, empty for unknown keys", () => {
    const description = encodeResult(single({ kind: "text", node: NODE, key: "description" }), PROFILE);
    const unknown = encodeResult(single({ kind: "text", node: NODE, key: "constructor" }), PROFILE);

    expect(decodeFunctionResult({ abi, functionName: "text", data: description })).toBe("Rank #2 on Tradepit");
    expect(decodeFunctionResult({ abi, functionName: "text", data: unknown })).toBe("");
  });

  it("encodes contenthash(bytes32) as empty bytes", () => {
    const result = encodeResult(single({ kind: "contenthash", node: NODE }), PROFILE);
    expect(decodeFunctionResult({ abi, functionName: "contenthash", data: result })).toBe("0x");
  });

  it("encodes empty values when there is no profile", () => {
    const addr = encodeResult(single({ kind: "addr", node: NODE }), null);
    const coin = encodeResult(single({ kind: "addrByCoinType", node: NODE, coinType: 60n }), null);
    const text = encodeResult(single({ kind: "text", node: NODE, key: "description" }), null);

    expect(decodeFunctionResult({ abi, functionName: "addr", data: addr })).toBe(zeroAddress);
    expect(decodeFunctionResult({ abi, functionName: "addrByCoinType", data: coin })).toBe("0x");
    expect(decodeFunctionResult({ abi, functionName: "text", data: text })).toBe("");
  });

  it("encodes a multicall as bytes[] with one encoded answer per call", () => {
    const request: LookupRequest = {
      name: "happy.tradepit.eth",
      calls: [
        { kind: "addr", node: NODE },
        { kind: "text", node: NODE, key: "description" },
      ],
      isMulticall: true,
    };

    const [addr, text] = decodeFunctionResult({
      abi,
      functionName: "multicall",
      data: encodeResult(request, PROFILE),
    });
    expect(decodeFunctionResult({ abi, functionName: "addr", data: addr })).toBe(HAPPY_ADDRESS);
    expect(decodeFunctionResult({ abi, functionName: "text", data: text })).toBe("Rank #2 on Tradepit");
  });
});
