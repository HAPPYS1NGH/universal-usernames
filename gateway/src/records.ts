import { encodeAbiParameters, parseAbiParameters, zeroAddress, type Hex } from "viem";
import type { Profile } from "./adapter-client.ts";
import type { LookupRequest, RecordCall } from "./decode-request.ts";

// SLIP-44 coin type for Ethereum mainnet addresses (ENSIP-9).
const ETH_COIN_TYPE = 60n;

/**
 * ABI-encodes the answer to a lookup exactly as the original resolver
 * function returns it, so the client can decode it as if it had called the
 * function onchain. A multicall returns `bytes[]` with one answer per call.
 *
 * A null profile means the name has no records: every answer is the empty value.
 */
export function encodeResult(request: LookupRequest, profile: Profile | null): Hex {
  const answers = request.calls.map((call) => encodeRecord(call, profile));
  if (request.isMulticall) return encodeAbiParameters(parseAbiParameters("bytes[]"), [answers]);
  return answers[0];
}

export function encodeRecord(call: RecordCall, profile: Profile | null): Hex {
  switch (call.kind) {
    case "addr":
      return encodeAbiParameters(parseAbiParameters("address"), [profile?.address ?? zeroAddress]);

    case "addrByCoinType": {
      // Only the Ethereum address is published. Other coin types are empty.
      const addressBytes = profile && call.coinType === ETH_COIN_TYPE ? profile.address.toLowerCase() : "0x";
      return encodeAbiParameters(parseAbiParameters("bytes"), [addressBytes as Hex]);
    }

    case "text":
      return encodeAbiParameters(parseAbiParameters("string"), [profile?.texts.get(call.key) ?? ""]);

    case "contenthash":
      return encodeAbiParameters(parseAbiParameters("bytes"), ["0x"]);
  }
}
