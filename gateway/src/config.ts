import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { normalize } from "viem/ens";

export type Config = {
  signer: PrivateKeyAccount;
  parentName: string;
  appApiUrl: string;
  port: number;
  ttlSeconds: number;
};

/** Reads and validates the environment. Throws one error that lists every problem. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const problems: string[] = [];
  const fail = (message: string) => {
    problems.push(message);
    return undefined;
  };

  const signer = parseSigner(env.SIGNER_PRIVATE_KEY, fail);
  const parentName = parseParentName(env.ENS_PARENT_NAME, fail);
  const appApiUrl = parseHttpUrl("APP_API_URL", env.APP_API_URL ?? "http://localhost:3000", fail);
  const port = parseInteger("PORT", env.PORT ?? "8080", 1, 65_535, fail);
  const ttlSeconds = parseInteger("RESPONSE_TTL_SECONDS", env.RESPONSE_TTL_SECONDS ?? "300", 1, 86_400, fail);

  if (!signer || !parentName || !appApiUrl || !port || !ttlSeconds) {
    throw new Error(`Invalid gateway configuration:\n  - ${problems.join("\n  - ")}`);
  }
  return { signer, parentName, appApiUrl, port, ttlSeconds };
}

type Fail = (message: string) => undefined;

function parseSigner(value: string | undefined, fail: Fail): PrivateKeyAccount | undefined {
  if (!value) return fail("SIGNER_PRIVATE_KEY is required. Create a dedicated key with `cast wallet new`.");
  if (!/^0x[0-9a-fA-F]{64}$/.test(value)) return fail("SIGNER_PRIVATE_KEY must be a 0x-prefixed 32-byte hex key.");
  try {
    return privateKeyToAccount(value as `0x${string}`);
  } catch {
    return fail("SIGNER_PRIVATE_KEY is not a valid secp256k1 private key.");
  }
}

function parseParentName(value: string | undefined, fail: Fail): string | undefined {
  if (!value) return fail("ENS_PARENT_NAME is required, e.g. tradepit.eth.");
  let normalized: string;
  try {
    normalized = normalize(value);
  } catch (error) {
    return fail(`ENS_PARENT_NAME "${value}" is not a valid ENS name: ${(error as Error).message}`);
  }
  if (normalized !== value) return fail(`ENS_PARENT_NAME must be normalized: use "${normalized}".`);
  if (!value.includes(".")) return fail(`ENS_PARENT_NAME must be a name you own, e.g. tradepit.eth, not "${value}".`);
  return value;
}

function parseHttpUrl(key: string, value: string, fail: Fail): string | undefined {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return fail(`${key} must be a URL, got "${value}".`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return fail(`${key} must be an http(s) URL.`);
  return url.href.replace(/\/+$/, "");
}

function parseInteger(key: string, value: string, min: number, max: number, fail: Fail): number | undefined {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    return fail(`${key} must be an integer from ${min} to ${max}, got "${value}".`);
  }
  return number;
}
