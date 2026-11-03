import {
  decodeAbiParameters,
  encodeFunctionData,
  parseAbi,
  parseAbiParameters,
  toHex,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { namehash, packetToBytes } from "viem/ens";

// Anvil's first well-known test key. Never use it for anything real.
export const TEST_SIGNER = privateKeyToAccount("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");

export const PARENT_NAME = "tradepit.eth";
export const RESOLVER: Address = "0x5615dEB798BB3E4dFa0139dFa1b3D433Cc23b72f";
export const HAPPY_ADDRESS: Address = "0x779981590E7Ccc0CFAe8040Ce7151324747cDb97";

export const HAPPY_ADAPTER_RESPONSE = {
  name: "happy",
  address: HAPPY_ADDRESS,
  texts: {
    description: "Rank #2 on Tradepit · +12.4% PnL",
    url: "https://tradepit.example/u/happy",
    avatar: "https://tradepit.example/api/avatar/happy",
  },
};

// Written independently of src/ so the tests do not just mirror the implementation.
const abi = parseAbi([
  "function resolve(bytes name, bytes data) view returns (bytes)",
  "function addr(bytes32 node) view returns (address)",
  "function addr(bytes32 node, uint256 coinType) view returns (bytes)",
  "function text(bytes32 node, string key) view returns (string)",
  "function contenthash(bytes32 node) view returns (bytes)",
  "function multicall(bytes[] data) returns (bytes[] results)",
  "function name(bytes32 node) view returns (string)",
]);

export const recordCalls = {
  addr: (name: string) => encodeFunctionData({ abi, functionName: "addr", args: [namehash(name)] }),
  addrByCoinType: (name: string, coinType: bigint) =>
    encodeFunctionData({ abi, functionName: "addr", args: [namehash(name), coinType] }),
  text: (name: string, key: string) => encodeFunctionData({ abi, functionName: "text", args: [namehash(name), key] }),
  contenthash: (name: string) => encodeFunctionData({ abi, functionName: "contenthash", args: [namehash(name)] }),
  multicall: (calls: Hex[]) => encodeFunctionData({ abi, functionName: "multicall", args: [calls] }),
  name: (name: string) => encodeFunctionData({ abi, functionName: "name", args: [namehash(name)] }),
};

/** The calldata OffchainResolver puts in OffchainLookup: resolve(dnsEncode(name), data). */
export function resolveCalldata(name: string, data: Hex): Hex {
  return resolveCalldataWithEncodedName(toHex(packetToBytes(name)), data);
}

export function resolveCalldataWithEncodedName(encodedName: Hex, data: Hex): Hex {
  return encodeFunctionData({ abi, functionName: "resolve", args: [encodedName, data] });
}

/** Splits a gateway answer into what resolveWithProof decodes. */
export function decodeSignedResponse(data: Hex) {
  const [result, expires, signature] = decodeAbiParameters(parseAbiParameters("bytes, uint64, bytes"), data);
  return { result, expires, signature };
}

/** A fetch stub for the app adapter: maps a username to a status and JSON body. */
export function stubAdapterFetch(responses: Record<string, { status: number; body: unknown }>) {
  const requestedUrls: string[] = [];
  const fetch = async (input: string | URL | Request) => {
    const url = String(input);
    requestedUrls.push(url);
    const username = decodeURIComponent(url.split("/api/ens/")[1] ?? "");
    const response = responses[username] ?? { status: 404, body: { error: "not_found" } };
    return Response.json(response.body, { status: response.status });
  };
  return { fetch: fetch as typeof globalThis.fetch, requestedUrls };
}
