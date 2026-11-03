import { createPublicClient, http, type Address, type PublicClient } from "viem";
import { mainnet } from "viem/chains";
import { rpcUrl } from "@/lib/config";

let client: PublicClient | undefined;

function mainnetClient(): PublicClient {
  client ??= createPublicClient({ chain: mainnet, transport: http(rpcUrl(), { timeout: 8_000 }) });
  return client;
}

export function getOnchainBalanceWei(address: Address): Promise<bigint> {
  return mainnetClient().getBalance({ address });
}
