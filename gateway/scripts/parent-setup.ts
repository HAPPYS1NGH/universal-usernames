// Tells you which contract sets the resolver of your parent name, and prints
// the exact `cast send` command. Read-only: it never sends a transaction.
//
//   corepack pnpm --filter gateway parent-setup tradepit.eth [resolverAddress]
//
// Set MAINNET_RPC_URL to use your own RPC.

import { createPublicClient, http, parseAbi, zeroAddress, type Address } from "viem";
import { mainnet } from "viem/chains";
import { labelhash, namehash, normalize } from "viem/ens";

// Ethereum mainnet. Addresses from https://docs.ens.domains/learn/deployments
const ENS_REGISTRY = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e"; // ENSv1
const NAME_WRAPPER = "0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401"; // ENSv1
const ETH_REGISTRY = "0xf60aba43E1f7F3DAB1186Ff03B561401C9Df85E2"; // ENSv2 registry for .eth names

const registryAbi = parseAbi([
  "function owner(bytes32 node) view returns (address)",
  "function resolver(bytes32 node) view returns (address)",
]);
const nameWrapperAbi = parseAbi([
  "function getData(uint256 id) view returns (address owner, uint32 fuses, uint64 expiry)",
]);
const ethRegistryAbi = parseAbi([
  "function getStatus(uint256 anyId) view returns (uint8)",
  "function getOwner(uint256 anyId) view returns (address)",
  "function getResolver(string label) view returns (address)",
]);

const V2_STATUS = { AVAILABLE: 0, RESERVED: 1, REGISTERED: 2 };
const CANNOT_SET_RESOLVER = 8; // NameWrapper fuse

const [input, resolverArg] = process.argv.slice(2);
if (!input) {
  console.error("Usage: parent-setup <parent name> [resolver address], e.g. parent-setup tradepit.eth");
  process.exit(1);
}

const name = normalize(input);
const resolver = resolverArg ?? "$RESOLVER";
const client = createPublicClient({ chain: mainnet, transport: http(process.env.MAINNET_RPC_URL) });
const labels = name.split(".");
const isDotEth = labels.length >= 2 && labels.at(-1) === "eth";

// 1. ENSv2 first: a .eth name that is REGISTERED in the v2 ETHRegistry (migrated
//    or registered in v2) has no ENSv1 resolver anymore. RESERVED means it has
//    not migrated, so ENSv1 still decides.
if (isDotEth) {
  const ethLabel = labels.at(-2)!;
  const status = await client.readContract({
    address: ETH_REGISTRY,
    abi: ethRegistryAbi,
    functionName: "getStatus",
    args: [BigInt(labelhash(ethLabel))],
  });

  if (status === V2_STATUS.AVAILABLE) {
    fail(`${ethLabel}.eth is not registered.`);
  }

  if (status === V2_STATUS.REGISTERED && labels.length > 2) {
    fail(
      `${ethLabel}.eth lives in ENSv2, so ${name} lives in its subregistry or resolver.\n` +
        "Set a custom resolver for it in the ENS app (app.ens.domains).",
    );
  }

  if (status === V2_STATUS.REGISTERED) {
    const ethRegistry = { address: ETH_REGISTRY, abi: ethRegistryAbi } as const;
    const [owner, current] = await Promise.all([
      client.readContract({ ...ethRegistry, functionName: "getOwner", args: [BigInt(labelhash(ethLabel))] }),
      client.readContract({ ...ethRegistry, functionName: "getResolver", args: [ethLabel] }),
    ]);
    report({
      path: "ENSv2: set it on the ETHRegistry (needs ROLE_SET_RESOLVER, which the owner has)",
      owner,
      current,
      command: `cast send ${ETH_REGISTRY} "setResolver(uint256,address)" ${labelhash(ethLabel)} ${resolver}`,
    });
    process.exit(0);
  }
}

// 2. ENSv1: the registry owner tells wrapped from unwrapped.
const node = namehash(name);
const [registryOwner, current] = await Promise.all([
  client.readContract({ address: ENS_REGISTRY, abi: registryAbi, functionName: "owner", args: [node] }),
  client.readContract({ address: ENS_REGISTRY, abi: registryAbi, functionName: "resolver", args: [node] }),
]);

if (registryOwner === zeroAddress) {
  fail(`${name} has no owner in ENSv1.`);
}

if (registryOwner === NAME_WRAPPER) {
  const [owner, fuses] = await client.readContract({
    address: NAME_WRAPPER,
    abi: nameWrapperAbi,
    functionName: "getData",
    args: [BigInt(node)],
  });
  if ((fuses & CANNOT_SET_RESOLVER) !== 0) {
    fail(`${name} is wrapped with the CANNOT_SET_RESOLVER fuse burned: its resolver can never change.`);
  }
  report({
    path: "ENSv1, wrapped: set it on the NameWrapper",
    owner,
    current,
    command: `cast send ${NAME_WRAPPER} "setResolver(bytes32,address)" ${node} ${resolver}`,
  });
} else {
  report({
    path: "ENSv1, unwrapped: set it on the ENS Registry",
    owner: registryOwner,
    current,
    command: `cast send ${ENS_REGISTRY} "setResolver(bytes32,address)" ${node} ${resolver}`,
  });
}

type SetupPath = { path: string; owner: Address; current: Address; command: string };

function report({ path, owner, current, command }: SetupPath) {
  console.log(`${"name".padEnd(18)} ${name}`);
  console.log(`${"path".padEnd(18)} ${path}`);
  console.log(`${"owner".padEnd(18)} ${owner}`);
  console.log(`${"current resolver".padEnd(18)} ${current === zeroAddress ? "(none)" : current}`);
  console.log("\nSend this from the owner's wallet:\n");
  console.log(`  ${command} \\\n    --rpc-url $MAINNET_RPC_URL --account name-owner\n`);
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}
