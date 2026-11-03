import { decodeFunctionData, parseAbi, slice, toFunctionSelector, type Hex } from "viem";
import { namehash } from "viem/ens";
import { decodeDnsName } from "./dns-name.ts";

/** The call the resolver contract forwards to the gateway (ENSIP-10). */
export const resolveAbi = parseAbi(["function resolve(bytes name, bytes data) view returns (bytes)"]);

/** Batch of record calls, as sent by clients that resolve several records at once. */
export const multicallAbi = parseAbi(["function multicall(bytes[] data) returns (bytes[] results)"]);

/** The record calls this gateway answers. */
export const recordAbi = parseAbi([
  "function addr(bytes32 node) view returns (address)",
  "function addr(bytes32 node, uint256 coinType) view returns (bytes)",
  "function text(bytes32 node, string key) view returns (string)",
  "function contenthash(bytes32 node) view returns (bytes)",
]);

export const MAX_MULTICALL_CALLS = 10;

const RESOLVE_SELECTOR = toFunctionSelector(resolveAbi[0]);
const MULTICALL_SELECTOR = toFunctionSelector(multicallAbi[0]);
const RECORD_SELECTORS = new Set(recordAbi.map((item) => toFunctionSelector(item)));

export type RecordCall =
  | { kind: "addr"; node: Hex }
  | { kind: "addrByCoinType"; node: Hex; coinType: bigint }
  | { kind: "text"; node: Hex; key: string }
  | { kind: "contenthash"; node: Hex };

export type LookupRequest = {
  /** The full name being resolved, e.g. "happy.tradepit.eth". */
  name: string;
  calls: RecordCall[];
  /** True when the client sent multicall(bytes[]) and expects bytes[] back. */
  isMulticall: boolean;
};

/** The request is malformed or asks for something this gateway does not answer (HTTP 400). */
export class RequestError extends Error {}

/** Decodes `resolve(bytes name, bytes data)` calldata into the name and the record calls. */
export function decodeLookupRequest(callData: Hex): LookupRequest {
  if (selectorOf(callData) !== RESOLVE_SELECTOR) {
    throw new RequestError(`expected resolve(bytes,bytes) calldata, got selector ${selectorOf(callData)}`);
  }

  const [encodedName, data] = decodeOrThrow(() => decodeFunctionData({ abi: resolveAbi, data: callData }).args);
  const name = decodeName(encodedName);
  const { calls, isMulticall } = decodeRecordCalls(data);

  // Every record call carries the namehash of the name it asks about. It must
  // match the name we were given, or the answer could be signed for the wrong name.
  const node = namehash(name);
  if (calls.some((call) => call.node !== node)) {
    throw new RequestError(`record call node does not match namehash("${name}")`);
  }

  return { name, calls, isMulticall };
}

function decodeRecordCalls(data: Hex): Pick<LookupRequest, "calls" | "isMulticall"> {
  if (selectorOf(data) !== MULTICALL_SELECTOR) {
    return { calls: [decodeRecordCall(data)], isMulticall: false };
  }

  const [batch] = decodeOrThrow(() => decodeFunctionData({ abi: multicallAbi, data }).args);
  if (batch.length === 0 || batch.length > MAX_MULTICALL_CALLS) {
    throw new RequestError(`multicall must contain 1 to ${MAX_MULTICALL_CALLS} calls`);
  }

  // Nested multicalls are rejected here: multicall is not a record selector.
  return { calls: batch.map(decodeRecordCall), isMulticall: true };
}

function decodeRecordCall(data: Hex): RecordCall {
  const selector = selectorOf(data);
  if (!RECORD_SELECTORS.has(selector)) {
    throw new RequestError(`unsupported function selector ${selector}`);
  }

  const call = decodeOrThrow(() => decodeFunctionData({ abi: recordAbi, data }));
  switch (call.functionName) {
    case "addr":
      return call.args.length === 1
        ? { kind: "addr", node: call.args[0] }
        : { kind: "addrByCoinType", node: call.args[0], coinType: call.args[1] };
    case "text":
      return { kind: "text", node: call.args[0], key: call.args[1] };
    case "contenthash":
      return { kind: "contenthash", node: call.args[0] };
  }
}

function decodeName(encodedName: Hex): string {
  try {
    return decodeDnsName(encodedName).join(".");
  } catch (error) {
    throw new RequestError(`invalid DNS-encoded name: ${(error as Error).message}`);
  }
}

function selectorOf(data: Hex): Hex {
  const selector = data.length >= 10 ? slice(data, 0, 4) : data;
  return selector.toLowerCase() as Hex;
}

function decodeOrThrow<T>(decode: () => T): T {
  try {
    return decode();
  } catch {
    throw new RequestError("malformed ABI-encoded calldata");
  }
}
