# Contracts

`OffchainResolver` is an [ENSIP-10](https://docs.ens.domains/ensip/10) wildcard resolver. Set it once on the parent name, say `tradepit.eth`, and every `<username>.tradepit.eth` resolves through the [gateway](../gateway). Its `resolve()` sends the client to the gateway with an `OffchainLookup` error. `resolveWithProof()` accepts the answer only if it has not expired and a trusted signer signed it.

It is based on [ensdomains/offchain-resolver](https://github.com/ensdomains/offchain-resolver) (MIT) and uses the same request and signature format. It has no dependencies. The owner can change the gateway URL and the signers without redeploying.

## Build and test

```sh
cd contracts
forge soldeer install   # forge-std, for tests and scripts only
forge build
forge test
```

`test/GatewayFixture.t.sol` checks answers produced by the real gateway code. If you change how the gateway encodes or signs, regenerate the fixture with `corepack pnpm --filter gateway fixture`.

## Deploy

You need the gateway running on an HTTPS host first (see [`../gateway`](../gateway)), and the address of its signer key.

1. Import the key that will deploy and own the resolver into a Foundry keystore. It never goes in an env file.

   ```sh
   cast wallet import deployer --interactive
   ```

2. Fill in `contracts/.env`. Foundry loads it automatically.

   ```sh
   cp .env.example .env
   ```

   | Variable | Value |
   | --- | --- |
   | `GATEWAY_URL` | `https://<gateway host>/{sender}/{data}.json`, placeholders included |
   | `SIGNER_ADDRESS` | Address of the gateway's `SIGNER_PRIVATE_KEY` |
   | `MAINNET_RPC_URL` | Your mainnet RPC |
   | `ETHERSCAN_API_KEY` | Only for `--verify` |

3. Simulate on a mainnet fork. Nothing is sent, and the owner it prints is Foundry's default sender.

   ```sh
   forge script script/Deploy.s.sol --rpc-url mainnet
   ```

4. Deploy. Add `--verify` to verify the source on Etherscan in the same step.

   ```sh
   forge script script/Deploy.s.sol --rpc-url mainnet --account deployer --broadcast
   ```

   To verify later instead:

   ```sh
   forge verify-contract $RESOLVER src/OffchainResolver.sol:OffchainResolver --chain mainnet --watch \
     --constructor-args $(cast abi-encode "constructor(string,address[])" "$GATEWAY_URL" "[$SIGNER_ADDRESS]")
   ```

The script prints the resolver address. Use it as `$RESOLVER` below.

## Set the resolver on the parent name

Which contract you call depends on where the parent name lives. This read-only script checks and prints the exact command:

```sh
MAINNET_RPC_URL=<rpc> corepack pnpm --filter gateway parent-setup tradepit.eth $RESOLVER
```

It reads `getStatus(labelhash)` on the ENSv2 ETHRegistry (2 = registered in ENSv2, 1 = reserved, so the name hasn't migrated), then the ENSv1 registry owner to tell wrapped from unwrapped names.

Send the command from the wallet that owns the name (`name-owner` below, which can be the same keystore account as `deployer`).

### In the ENS app

Open the name on [app.ens.domains](https://app.ens.domains), edit its resolver, choose a custom resolver and paste `$RESOLVER`.

### ENSv1, unwrapped

The ENS Registry owner is your wallet.

```sh
cast send 0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e "setResolver(bytes32,address)" \
  $(cast namehash tradepit.eth) $RESOLVER --rpc-url $MAINNET_RPC_URL --account name-owner
```

### ENSv1, wrapped

The ENS Registry owner is the NameWrapper. This fails if the `CANNOT_SET_RESOLVER` fuse is burned.

```sh
cast send 0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401 "setResolver(bytes32,address)" \
  $(cast namehash tradepit.eth) $RESOLVER --rpc-url $MAINNET_RPC_URL --account name-owner
```

### ENSv2

The name is registered in the ENSv2 ETHRegistry, either migrated or registered there. Call `setResolver` on the registry that holds the name, using the labelhash as the id. The caller needs `ROLE_SET_RESOLVER` on the name. Owners get it when they register or migrate, unless a locked name had its `CANNOT_SET_RESOLVER` fuse burned.

```sh
cast send 0xf60aba43E1f7F3DAB1186Ff03B561401C9Df85E2 "setResolver(uint256,address)" \
  $(cast keccak tradepit) $RESOLVER --rpc-url $MAINNET_RPC_URL --account name-owner
```

For a parent that is itself a subname in ENSv2, call the same function on the registry that holds it, the subregistry of its parent.

### After migrating to ENSv2

> [!WARNING]
> Migrating a name to ENSv2 clears its ENSv1 resolver. If you migrate `tradepit.eth` after this setup, pass `$RESOLVER` as the resolver in the migration data, or run the ENSv2 command right after. Until you do, no username resolves.

### Why it works on ENSv1 and ENSv2

The Universal Resolver uses the resolver set on the longest matching suffix of the name. A resolver found on a parent must support `IExtendedResolver` (ERC-165 id `0x9061b923`), and this one does. For names that haven't migrated, ENSv2 hands resolution to `ENSV1Resolver`, which calls the resolver set in ENSv1.

The resolver deliberately does not advertise ERC-7996 resolver features. With it, the Universal Resolver would call the resolver directly and wallets would see the Universal Resolver as the CCIP-Read `sender`, so the gateway would sign for the wrong address.

## Check it end to end

This resolves the name on mainnet through the Universal Resolver, the way a wallet does:

```sh
MAINNET_RPC_URL=<rpc> corepack pnpm --filter gateway check-name happy.tradepit.eth
```

```text
name         happy.tradepit.eth
resolver     0x394D8EB4a4fDF599384DeAb25F31d111d755c398 (ENSV1Resolver: forwards to the resolver set in ENSv1)
address      0x…
description  Rank #2 on Tradepit · +12.4% PnL
url          https://…/u/happy
avatar       https://…/api/avatar/happy
```

For a parent in ENSv2, `resolver` is `$RESOLVER` itself. Clients need viem 2.35.0 or later, or ethers 6.17.0 or later.

## Move the gateway or rotate the signer

The deployer owns the resolver, so these are sent from `deployer`.

Move the gateway to a new host. Keep the old host up until the transaction confirms.

```sh
cast send $RESOLVER "setUrl(string)" "https://new-host.example/{sender}/{data}.json" \
  --rpc-url $MAINNET_RPC_URL --account deployer
```

Rotate the signer key without downtime:

```sh
cast wallet new                                   # new SIGNER_PRIVATE_KEY and address
cast send $RESOLVER "setSigners(address[],bool)" "[$NEW_SIGNER]" true \
  --rpc-url $MAINNET_RPC_URL --account deployer
# restart the gateway with the new SIGNER_PRIVATE_KEY, then:
cast send $RESOLVER "setSigners(address[],bool)" "[$OLD_SIGNER]" false \
  --rpc-url $MAINNET_RPC_URL --account deployer
```

If a signer key leaks, run only the last command, right away. Answers signed with that key stop verifying as soon as it confirms.

Hand the resolver to another owner, such as a multisig, with `transferOwnership(address)`.
