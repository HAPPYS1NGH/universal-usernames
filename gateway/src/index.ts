import { serve } from "@hono/node-server";
import { createAdapterClient } from "./adapter-client.ts";
import { loadConfig, type Config } from "./config.ts";
import { createServer } from "./server.ts";

let config: Config;
try {
  config = loadConfig();
} catch (error) {
  console.error((error as Error).message);
  process.exit(1);
}

const app = createServer({
  signer: config.signer,
  parentName: config.parentName,
  adapter: createAdapterClient({ baseUrl: config.appApiUrl }),
  ttlSeconds: config.ttlSeconds,
});

const server = serve({ fetch: app.fetch, port: config.port }, ({ port }) => {
  console.log(`CCIP-Read gateway for *.${config.parentName} on port ${port}`);
  console.log(`Signer ${config.signer.address}, app adapter ${config.appApiUrl}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
