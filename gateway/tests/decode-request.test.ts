import { namehash } from "viem/ens";
import { describe, expect, it } from "vitest";
import { decodeLookupRequest, MAX_MULTICALL_CALLS, RequestError } from "../src/decode-request.ts";
import { recordCalls, resolveCalldata, resolveCalldataWithEncodedName } from "./lookup-fixtures.ts";

const NAME = "happy.tradepit.eth";
const NODE = namehash(NAME);

describe("decodeLookupRequest", () => {
  it("decodes addr(bytes32)", () => {
    expect(decodeLookupRequest(resolveCalldata(NAME, recordCalls.addr(NAME)))).toEqual({
      name: NAME,
      calls: [{ kind: "addr", node: NODE }],
      isMulticall: false,
    });
  });

  it("decodes addr(bytes32,uint256)", () => {
    const request = decodeLookupRequest(resolveCalldata(NAME, recordCalls.addrByCoinType(NAME, 60n)));
    expect(request.calls).toEqual([{ kind: "addrByCoinType", node: NODE, coinType: 60n }]);
  });

  it("decodes text(bytes32,string)", () => {
    const request = decodeLookupRequest(resolveCalldata(NAME, recordCalls.text(NAME, "description")));
    expect(request.calls).toEqual([{ kind: "text", node: NODE, key: "description" }]);
  });

  it("decodes contenthash(bytes32)", () => {
    const request = decodeLookupRequest(resolveCalldata(NAME, recordCalls.contenthash(NAME)));
    expect(request.calls).toEqual([{ kind: "contenthash", node: NODE }]);
  });

  it("decodes multicall(bytes[]) of record calls", () => {
    const multicall = recordCalls.multicall([recordCalls.addr(NAME), recordCalls.text(NAME, "url")]);
    expect(decodeLookupRequest(resolveCalldata(NAME, multicall))).toEqual({
      name: NAME,
      calls: [
        { kind: "addr", node: NODE },
        { kind: "text", node: NODE, key: "url" },
      ],
      isMulticall: true,
    });
  });

  it("rejects unsupported selectors", () => {
    expect(() => decodeLookupRequest(resolveCalldata(NAME, recordCalls.name(NAME)))).toThrow(
      new RequestError("unsupported function selector 0x691f3431"),
    );
  });

  it("rejects calldata that is not resolve(bytes,bytes)", () => {
    expect(() => decodeLookupRequest(recordCalls.addr(NAME))).toThrow(/expected resolve\(bytes,bytes\)/);
    expect(() => decodeLookupRequest("0x")).toThrow(RequestError);
  });

  it("rejects truncated calldata", () => {
    const calldata = resolveCalldata(NAME, recordCalls.addr(NAME));
    expect(() => decodeLookupRequest(calldata.slice(0, 80) as `0x${string}`)).toThrow(/malformed/);
  });

  it("rejects a record call whose node is not the namehash of the name", () => {
    const calldata = resolveCalldata(NAME, recordCalls.addr("someone-else.tradepit.eth"));
    expect(() => decodeLookupRequest(calldata)).toThrow(/does not match namehash/);
  });

  it("rejects empty, oversized and nested multicalls", () => {
    const tooMany = Array.from({ length: MAX_MULTICALL_CALLS + 1 }, () => recordCalls.addr(NAME));
    const nested = recordCalls.multicall([recordCalls.multicall([recordCalls.addr(NAME)])]);

    expect(() => decodeLookupRequest(resolveCalldata(NAME, recordCalls.multicall([])))).toThrow(/1 to 10 calls/);
    expect(() => decodeLookupRequest(resolveCalldata(NAME, recordCalls.multicall(tooMany)))).toThrow(/1 to 10 calls/);
    expect(() => decodeLookupRequest(resolveCalldata(NAME, nested))).toThrow(/unsupported function selector 0xac9650d8/);
  });

  it("rejects a malformed DNS-encoded name", () => {
    // "happy.tradepit.eth" with the terminating 0x00 replaced by 0x01.
    const unterminated = resolveCalldataWithEncodedName("0x0568617070790874726164657069740365746801", recordCalls.addr(NAME));
    expect(() => decodeLookupRequest(unterminated)).toThrow(/invalid DNS-encoded name/);
  });
});
