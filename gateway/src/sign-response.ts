import { encodeAbiParameters, encodePacked, keccak256, parseAbiParameters, type Address, type Hex } from "viem";
import type { PrivateKeyAccount } from "viem/accounts";

type SignedAnswer = {
  /** The resolver contract that will verify the answer (the EIP-3668 `sender`). */
  resolver: Address;
  /** Unix time in seconds after which the resolver rejects the answer. */
  expires: bigint;
  /** The exact calldata the resolver sent to the gateway. */
  request: Hex;
  /** The ABI-encoded answer. */
  result: Hex;
};

/**
 * The hash the resolver contract recomputes before checking the signature.
 * Same layout as SignatureVerifier.makeSignatureHash in ensdomains/offchain-resolver:
 *
 *   keccak256(abi.encodePacked(hex"1900", resolver, expires, keccak256(request), keccak256(result)))
 *
 * 0x19 0x00 is EIP-191 version 0 ("data with intended validator"): binding the
 * resolver address means an answer signed for one resolver is useless on another.
 */
export function makeSignatureHash({ resolver, expires, request, result }: SignedAnswer): Hex {
  return keccak256(
    encodePacked(
      ["bytes2", "address", "uint64", "bytes32", "bytes32"],
      ["0x1900", resolver, expires, keccak256(request), keccak256(result)],
    ),
  );
}

/**
 * Signs the answer and packs it the way `resolveWithProof` decodes it:
 * abi.encode(bytes result, uint64 expires, bytes signature).
 */
export async function signResponse(signer: PrivateKeyAccount, answer: SignedAnswer): Promise<Hex> {
  // A raw ECDSA signature over the hash: no "\x19Ethereum Signed Message" prefix.
  const signature = await signer.sign({ hash: makeSignatureHash(answer) });
  return encodeAbiParameters(parseAbiParameters("bytes result, uint64 expires, bytes signature"), [
    answer.result,
    answer.expires,
    signature,
  ]);
}
