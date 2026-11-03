import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Keep `next dev` from writing AGENTS.md/CLAUDE.md into the workshop tree.
  agentRules: false,
};

export default nextConfig;
