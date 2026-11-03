import { decodeFunctionResult, parseAbi, recoverAddress, zeroAddress, type Hex } from "viem";
import { describe, expect, it } from "vitest";
import { createAdapterClient } from "../src/adapter-client.ts";
import { createServer } from "../src/server.ts";
import { makeSignatureHash } from "../src/sign-response.ts";
import {
  decodeSignedResponse,
  HAPPY_ADAPTER_RESPONSE,
  HAPPY_ADDRESS,
  PARENT_NAME,
  recordCalls,
  RESOLVER,
  resolveCalldata,
  stubAdapterFetch,
  TEST_SIGNER,
} from "./lookup-fixtures.ts";

const NOW_MS = 1_800_000_000_000;
const TTL_SECONDS = 300;

const resultAbi = parseAbi([
  "function addr(bytes32) view returns (address)",
  "function text(bytes32, string) view returns (string)",
  "function multicall(bytes[]) returns (bytes[])",
]);

function setup(adapterResponses: Parameters<typeof stubAdapterFetch>[0] = {}) {
  const stub = stubAdapterFetch({ happy: { status: 200, body: HAPPY_ADAPTER_RESPONSE }, ...adapterResponses });
  const app = createServer({
    signer: TEST_SIGNER,
    parentName: PARENT_NAME,
    adapter: createAdapterClient({ baseUrl: "http://app.test", fetch: stub.fetch }),
    ttlSeconds: TTL_SECONDS,
    now: () => NOW_MS,
  });
  const get = (request: Hex, sender: string = RESOLVER) => app.request(`/${sender.toLowerCase()}/${request}.json`);
  return { app, get, adapterCalls: stub.requestedUrls };
}

/** Checks the signature like resolveWithProof does and returns the verified result. */
async function verifiedResult(response: Response, request: Hex): Promise<Hex> {
  expect(response.status).toBe(200);
  const { data } = (await response.json()) as { data: Hex };
  const { result, expires, signature } = decodeSignedResponse(data);

  expect(expires).toBe(BigInt(NOW_MS / 1000 + TTL_SECONDS));
  const hash = makeSignatureHash({ resolver: RESOLVER, expires, request, result });
  expect(await recoverAddress({ hash, signature })).toBe(TEST_SIGNER.address);
  return result;
}

describe("gateway server", () => {
  it("answers GET /{sender}/{data}.json with a signed address", async () => {
    const { get } = setup();
    const request = resolveCalldata("happy.tradepit.eth", recordCalls.addr("happy.tradepit.eth"));

    const result = await verifiedResult(await get(request), request);
    expect(decodeFunctionResult({ abi: resultAbi, functionName: "addr", data: result })).toBe(HAPPY_ADDRESS);
  });

  it("answers POST / with {sender, data}", async () => {
    const { app } = setup();
    const request = resolveCalldata("happy.tradepit.eth", recordCalls.text("happy.tradepit.eth", "url"));

    const response = await app.request("/", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sender: RESOLVER, data: request }),
    });

    const result = await verifiedResult(response, request);
    expect(decodeFunctionResult({ abi: resultAbi, functionName: "text", data: result })).toBe(
      "https://tradepit.example/u/happy",
    );
  });

  it("answers a multicall with bytes[]", async () => {
    const { get } = setup();
    const name = "happy.tradepit.eth";
    const request = resolveCalldata(name, recordCalls.multicall([recordCalls.addr(name), recordCalls.text(name, "description")]));

    const [addr, description] = decodeFunctionResult({
      abi: resultAbi,
      functionName: "multicall",
      data: await verifiedResult(await get(request), request),
    });
    expect(decodeFunctionResult({ abi: resultAbi, functionName: "addr", data: addr })).toBe(HAPPY_ADDRESS);
    expect(decodeFunctionResult({ abi: resultAbi, functionName: "text", data: description })).toBe(
      "Rank #2 on Tradepit · +12.4% PnL",
    );
  });

  it("allows any origin (CORS)", async () => {
    const { app } = setup();
    const preflight = await app.request("/", {
      method: "OPTIONS",
      headers: { origin: "https://wallet.example", "access-control-request-method": "POST" },
    });

    expect(preflight.headers.get("access-control-allow-origin")).toBe("*");
  });

  it.each([
    ["the parent itself", "tradepit.eth"],
    ["a nested name", "deep.happy.tradepit.eth"],
    ["an invalid username", "Not_Valid.tradepit.eth"],
    ["a name under another parent", "happy.other.eth"],
  ])("signs an empty answer for %s without calling the app", async (_case, name) => {
    const { get, adapterCalls } = setup();
    const request = resolveCalldata(name, recordCalls.addr(name));

    const result = await verifiedResult(await get(request), request);
    expect(decodeFunctionResult({ abi: resultAbi, functionName: "addr", data: result })).toBe(zeroAddress);
    expect(adapterCalls).toEqual([]);
  });

  it("signs an empty answer when the app returns 404", async () => {
    const { get, adapterCalls } = setup();
    const request = resolveCalldata("nobody.tradepit.eth", recordCalls.addr("nobody.tradepit.eth"));

    const result = await verifiedResult(await get(request), request);
    expect(decodeFunctionResult({ abi: resultAbi, functionName: "addr", data: result })).toBe(zeroAddress);
    expect(adapterCalls).toEqual(["http://app.test/api/ens/nobody"]);
  });

  it("returns 502 and signs nothing when the app fails", async () => {
    const { get } = setup({ happy: { status: 500, body: { error: "boom" } } });
    const request = resolveCalldata("happy.tradepit.eth", recordCalls.addr("happy.tradepit.eth"));

    const response = await get(request);
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ message: "the username service is unavailable" });
  });

  it("returns 400 for unsupported selectors", async () => {
    const { get } = setup();
    const request = resolveCalldata("happy.tradepit.eth", recordCalls.name("happy.tradepit.eth"));

    const response = await get(request);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ message: "unsupported function selector 0x691f3431" });
  });

  it("returns 400 for a bad sender, bad data or a bad POST body", async () => {
    const { app, get } = setup();
    const request = resolveCalldata("happy.tradepit.eth", recordCalls.addr("happy.tradepit.eth"));

    expect((await get(request, "0x1234")).status).toBe(400);
    expect((await get("0xnothex" as Hex)).status).toBe(400);
    expect((await app.request("/", { method: "POST", body: "not json" })).status).toBe(400);
  });
});
