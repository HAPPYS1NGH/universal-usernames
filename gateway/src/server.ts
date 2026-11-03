import { Hono } from "hono";
import { cors } from "hono/cors";
import { AdapterError } from "./adapter-client.ts";
import { answerLookup, type LookupDeps } from "./answer-lookup.ts";
import { RequestError } from "./decode-request.ts";

/**
 * The EIP-3668 (CCIP-Read) HTTP interface. The resolver contract's URL
 * template is https://<host>/{sender}/{data}.json, so clients use GET.
 * POST / with {"sender", "data"} is the spec's alternative for long calldata.
 *
 * Successful answers are {"data": "0x..."}. Errors are {"message": "..."}.
 */
export function createServer(deps: LookupDeps): Hono {
  const app = new Hono();

  // Wallets and dapps call the gateway straight from the browser.
  app.use(cors({ origin: "*", allowMethods: ["GET", "POST", "OPTIONS"] }));

  app.get("/health", (c) => c.json({ ok: true }));

  app.get("/:sender/:file{[^/]+\\.json}", async (c) => {
    const sender = c.req.param("sender");
    const data = c.req.param("file").slice(0, -".json".length);
    return c.json({ data: await answerLookup({ sender, data }, deps) });
  });

  app.post("/", async (c) => {
    const body: unknown = await c.req.json().catch(() => null);
    const { sender, data } = (body ?? {}) as Record<string, unknown>;
    if (typeof sender !== "string" || typeof data !== "string") {
      throw new RequestError('body must be JSON: {"sender": "0x...", "data": "0x..."}');
    }
    return c.json({ data: await answerLookup({ sender, data }, deps) });
  });

  app.onError((error, c) => {
    if (error instanceof RequestError) return c.json({ message: error.message }, 400);

    // 5xx tells EIP-3668 clients to try the next gateway URL, if there is one.
    if (error instanceof AdapterError) {
      console.error(`Adapter error: ${error.message}`);
      return c.json({ message: "the username service is unavailable" }, 502);
    }

    console.error(error);
    return c.json({ message: "internal error" }, 500);
  });

  return app;
}
