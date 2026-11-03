// Moves the full mainnet ETH balance of a user's embedded wallet to another
// address. Dry run by default; pass --yes to sign and broadcast.
//
// Usage: pnpm wallet:sweep <username> <toAddress> [--yes]

import { parseArgs } from "node:util";
import {
  createPublicClient,
  createWalletClient,
  formatEther,
  formatGwei,
  getAddress,
  http,
  isAddress,
  zeroAddress,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";
import { validateUsername } from "@/lib/auth/username";
import { databasePath, rpcUrl, walletEncryptionKey } from "@/lib/config";
import { openDatabase } from "@/lib/db/connection";
import { getStoredWalletByUsername } from "@/lib/wallet/embedded-wallet";
import { decryptPrivateKey } from "@/lib/wallet/key-encryption";
import { planSweep } from "@/lib/wallet/sweep-plan";

const USAGE = "Usage: pnpm wallet:sweep <username> <toAddress> [--yes]";

class SweepError extends Error {}

function parseCommand(): { username: string; to: Address; broadcast: boolean } {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { yes: { type: "boolean", default: false } },
  });
  const [username, to] = positionals;
  if (positionals.length !== 2 || !username || !to) throw new SweepError(USAGE);

  const usernameCheck = validateUsername(username);
  if (!usernameCheck.ok) throw new SweepError(`Invalid username "${username}": ${usernameCheck.error}`);
  // Strict mode rejects mixed-case addresses with a bad checksum (likely typos).
  if (!isAddress(to, { strict: true })) {
    throw new SweepError(`"${to}" is not a valid address. Mixed-case addresses must have a correct checksum.`);
  }
  if (getAddress(to) === zeroAddress) throw new SweepError("Refusing to send to the zero address.");
  return { username, to: getAddress(to), broadcast: values.yes };
}

async function sweep(): Promise<void> {
  const { username, to, broadcast } = parseCommand();

  const db = openDatabase(databasePath());
  const wallet = getStoredWalletByUsername(db, username);
  db.close();
  if (!wallet) throw new SweepError(`No user @${username} in ${databasePath()}.`);

  const from = getAddress(wallet.address);
  if (from === to) throw new SweepError("The destination is the wallet itself.");

  const publicClient = createPublicClient({ chain: mainnet, transport: http(rpcUrl()) });
  // 21,000 gas only covers a transfer to a plain account; a contract recipient
  // could revert and burn the fee.
  const code = await publicClient.getCode({ address: to });
  if (code && code !== "0x") throw new SweepError(`${to} is a contract. This script only sends to plain accounts.`);

  const [balanceWei, fees] = await Promise.all([
    publicClient.getBalance({ address: from }),
    publicClient.estimateFeesPerGas(),
  ]);
  const result = planSweep(balanceWei, fees.maxFeePerGas);
  if (!result.ok) {
    if (result.reason === "zero_balance") throw new SweepError(`@${username} (${from}) has no ETH on mainnet.`);
    throw new SweepError(
      `@${username} has ${formatEther(balanceWei)} ETH, not more than the ${formatEther(result.feeWei)} ETH gas fee.`,
    );
  }
  const { plan } = result;

  console.log(`From     @${username} ${from}`);
  console.log(`To       ${to}`);
  console.log(`Balance  ${formatEther(balanceWei)} ETH`);
  console.log(`Amount   ${formatEther(plan.valueWei)} ETH`);
  console.log(`Fee      ${formatEther(plan.feeWei)} ETH (${plan.gas} gas at ${formatGwei(plan.maxFeePerGas)} gwei)`);

  if (!broadcast) {
    console.log("\nDry run: nothing was sent. Run again with --yes to broadcast.");
    return;
  }

  const account = privateKeyToAccount(decryptPrivateKey(wallet.encryptedKey, wallet.address, walletEncryptionKey()));
  if (account.address !== from) throw new Error(`Decrypted key does not match ${from}`);

  const walletClient = createWalletClient({ account, chain: mainnet, transport: http(rpcUrl()) });
  const hash = await walletClient.sendTransaction({
    to,
    value: plan.valueWei,
    gas: plan.gas,
    maxFeePerGas: plan.maxFeePerGas,
    maxPriorityFeePerGas: plan.maxPriorityFeePerGas,
  });
  console.log(`\nSent. Transaction ${hash}`);
  console.log(`https://etherscan.io/tx/${hash}`);
}

sweep().catch((error: unknown) => {
  console.error(error instanceof SweepError ? error.message : error);
  process.exitCode = 1;
});
