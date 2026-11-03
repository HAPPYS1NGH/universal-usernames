import { getAddress, isAddress, isHex, type Hex } from "viem";
import type { PrivateKeyAccount } from "viem/accounts";
import type { AdapterClient } from "./adapter-client.ts";
import { decodeLookupRequest, RequestError } from "./decode-request.ts";
import { encodeResult } from "./records.ts";
import { signResponse } from "./sign-response.ts";
import { usernameFromName } from "./username.ts";

export type LookupDeps = {
  signer: PrivateKeyAccount;
  /** e.g. "tradepit.eth": the gateway answers for <username>.tradepit.eth. */
  parentName: string;
  adapter: AdapterClient;
  ttlSeconds: number;
  now?: () => number;
};

/** An EIP-3668 gateway request: the resolver address and the calldata it sent. */
export type LookupRequestParams = {
  sender: string;
  data: string;
};

// Large enough for a full multicall, small enough to refuse junk early.
const MAX_CALLDATA_BYTES = 4_096;

/**
 * Answers one CCIP-Read request: decode it, look the username up in the app,
 * encode the records and sign them for the resolver that asked.
 *
 * Returns the signed response. Throws RequestError (HTTP 400) for bad requests
 * and AdapterError (HTTP 502) when the app cannot answer, so an error is never signed.
 */
export async function answerLookup({ sender, data }: LookupRequestParams, deps: LookupDeps): Promise<Hex> {
  if (!isAddress(sender, { strict: false })) throw new RequestError("sender must be an address");
  if (!isHex(data, { strict: true }) || data.length % 2 !== 0 || (data.length - 2) / 2 > MAX_CALLDATA_BYTES) {
    throw new RequestError(`data must be 0x-prefixed calldata of at most ${MAX_CALLDATA_BYTES} bytes`);
  }

  const request = decodeLookupRequest(data);

  // Only <username>.<parent> reaches the app. Everything else gets a signed
  // empty answer: "this name has no records".
  const username = usernameFromName(request.name, deps.parentName);
  const profile = username ? await deps.adapter.fetchProfile(username) : null;

  const now = deps.now ?? Date.now;
  return signResponse(deps.signer, {
    resolver: getAddress(sender),
    expires: BigInt(Math.floor(now() / 1000) + deps.ttlSeconds),
    request: data,
    result: encodeResult(request, profile),
  });
}
