// Resolves a name on Ethereum mainnet the way a wallet does: through the ENS
// Universal Resolver, following the CCIP-Read lookup to the gateway.
//
//   corepack pnpm --filter gateway check-name happy.tradepit.eth
//
// Set MAINNET_RPC_URL to use your own RPC. Read-only: it never sends a transaction.

import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";
import { normalize } from "viem/ens";

const TEXT_KEYS = ["description", "url", "avatar"];
// ENSv2 hands names that have not migrated to this mirror, which then resolves them through ENSv1.
const ENSV1_RESOLVER = "0x394D8EB4a4fDF599384DeAb25F31d111d755c398";

const input = process.argv[2];
if (!input) {
  console.error("Usage: check-name <name>, e.g. check-name happy.tradepit.eth");
  process.exit(1);
}

const name = normalize(input);
const client = createPublicClient({ chain: mainnet, transport: http(process.env.MAINNET_RPC_URL) });

try {
  const [resolver, address, ...texts] = await Promise.all([
    client.getEnsResolver({ name }),
    client.getEnsAddress({ name }),
    ...TEXT_KEYS.map((key) => client.getEnsText({ name, key })),
  ]);

  console.log(`${"name".padEnd(12)} ${name}`);
  const via = resolver === ENSV1_RESOLVER ? " (ENSV1Resolver: forwards to the resolver set in ENSv1)" : "";
  console.log(`${"resolver".padEnd(12)} ${resolver}${via}`);
  console.log(`${"address".padEnd(12)} ${address ?? "(none)"}`);
  TEXT_KEYS.forEach((key, i) => console.log(`${key.padEnd(12)} ${texts[i] ?? "(none)"}`));

  if (!address) process.exitCode = 1;
} catch (error) {
  // viem errors carry a one-line summary; the full message includes the whole request.
  const { shortMessage, message } = error as { shortMessage?: string; message: string };
  console.error(`Could not resolve ${name}: ${shortMessage ?? message}`);
  process.exitCode = 1;
}
