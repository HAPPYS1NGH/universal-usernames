// Resolves a name on Ethereum mainnet the way a wallet does: through the ENS
// Universal Resolver, following the CCIP-Read lookup to the gateway.
//
//   pnpm --filter gateway check-name happy.tradepit.eth
//
// Set MAINNET_RPC_URL to use your own RPC. Read-only: it never sends a transaction.

import {
  BaseError,
  ContractFunctionRevertedError,
  createPublicClient,
  decodeErrorResult,
  http,
  parseAbi,
  type Hex,
} from "viem";
import { mainnet } from "viem/chains";
import { normalize } from "viem/ens";

const TEXT_KEYS = ["description", "url", "avatar"];
// ENSv2 hands names that have not migrated to this mirror, which then resolves them through ENSv1.
const ENSV1_RESOLVER = "0x394D8EB4a4fDF599384DeAb25F31d111d755c398";
// OffchainResolver's own errors, which the Universal Resolver wraps in ResolverError(bytes).
const RESOLVER_ERRORS = parseAbi(["error InvalidSignature()", "error SignatureExpired()"]);
const RESOLVER_ERROR_HINTS = {
  InvalidSignature: "the resolver doesn't trust the key that signed the answer. Compare the gateway's signer with the resolver's signers.",
  SignatureExpired: "the signed answer had expired. Check the gateway host's clock.",
} as const;

const input = process.argv[2];
if (!input) {
  console.error("Usage: check-name <name>, e.g. check-name happy.tradepit.eth");
  process.exit(1);
}

const name = normalize(input);
const client = createPublicClient({ chain: mainnet, transport: http(process.env.MAINNET_RPC_URL) });

try {
  // strict: a failed lookup, such as a rejected signature or a gateway error,
  // throws instead of looking like a missing record.
  const [resolver, address, ...texts] = await Promise.all([
    client.getEnsResolver({ name }),
    client.getEnsAddress({ name, strict: true }),
    ...TEXT_KEYS.map((key) => client.getEnsText({ name, key, strict: true })),
  ]);

  console.log(`${"name".padEnd(12)} ${name}`);
  const via = resolver === ENSV1_RESOLVER ? " (ENSV1Resolver: forwards to the resolver set in ENSv1)" : "";
  console.log(`${"resolver".padEnd(12)} ${resolver}${via}`);
  console.log(`${"address".padEnd(12)} ${address ?? "(none)"}`);
  TEXT_KEYS.forEach((key, i) => console.log(`${key.padEnd(12)} ${texts[i] ?? "(none)"}`));

  if (!address) process.exitCode = 1;
} catch (error) {
  console.error(`Could not resolve ${name}: ${describeError(error)}`);
  process.exitCode = 1;
}

// Names the contract error behind a failed lookup, e.g.
// "ResolverError(0x8baa579f = InvalidSignature): <hint>".
function describeError(error: unknown): string {
  if (!(error instanceof BaseError)) return String(error);
  const reverted = error.walk((cause) => cause instanceof ContractFunctionRevertedError);
  if (!(reverted instanceof ContractFunctionRevertedError) || !reverted.data) {
    // viem errors carry a one-line summary; the full message includes the whole request.
    return error.shortMessage;
  }
  const { errorName, args = [] } = reverted.data;
  if (errorName !== "ResolverError") return `${errorName}(${args.join(", ")})`;

  const data = args[0] as Hex;
  const inner = resolverErrorName(data);
  if (!inner) return `ResolverError(${data})`;
  return `ResolverError(${data} = ${inner}): ${RESOLVER_ERROR_HINTS[inner]}`;
}

function resolverErrorName(data: Hex) {
  try {
    return decodeErrorResult({ abi: RESOLVER_ERRORS, data }).errorName;
  } catch {
    return undefined; // not one of ours: the caller prints the raw revert data
  }
}
