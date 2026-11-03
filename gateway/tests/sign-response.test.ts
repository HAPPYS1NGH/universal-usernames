import { concat, keccak256, numberToHex, recoverAddress, type Hex } from "viem";
import { describe, expect, it } from "vitest";
import { makeSignatureHash, signResponse } from "../src/sign-response.ts";
import { decodeSignedResponse, RESOLVER, TEST_SIGNER } from "./lookup-fixtures.ts";

const answer = {
  resolver: RESOLVER,
  expires: 1_900_000_000n,
  request: "0x9061b923aabbcc" as Hex,
  result: "0x0000000000000000000000000000000000000000000000000000000000000001" as Hex,
};

// The contract's hash, spelled out byte by byte instead of with encodePacked:
// 0x1900 ++ resolver (20 bytes) ++ expires (8 bytes) ++ keccak256(request) ++ keccak256(result)
const contractHash = keccak256(
  concat([
    "0x1900",
    RESOLVER,
    numberToHex(answer.expires, { size: 8 }),
    keccak256(answer.request),
    keccak256(answer.result),
  ]),
);

describe("signResponse", () => {
  it("hashes like SignatureVerifier.makeSignatureHash", () => {
    expect(makeSignatureHash(answer)).toBe(contractHash);
  });

  it("returns abi.encode(result, expires, signature) signed by the signer", async () => {
    const response = await signResponse(TEST_SIGNER, answer);
    const { result, expires, signature } = decodeSignedResponse(response);

    expect(result).toBe(answer.result);
    expect(expires).toBe(answer.expires);
    expect(signature).toHaveLength(2 + 65 * 2);
    expect(await recoverAddress({ hash: contractHash, signature })).toBe(TEST_SIGNER.address);
  });

  it("binds the signature to the resolver, request and result", async () => {
    const { signature } = decodeSignedResponse(await signResponse(TEST_SIGNER, answer));
    const otherResolver = makeSignatureHash({ ...answer, resolver: "0x0000000000000000000000000000000000000001" });
    const otherResult = makeSignatureHash({ ...answer, result: "0x" });

    expect(await recoverAddress({ hash: otherResolver, signature })).not.toBe(TEST_SIGNER.address);
    expect(await recoverAddress({ hash: otherResult, signature })).not.toBe(TEST_SIGNER.address);
  });
});
