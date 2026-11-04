import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Keep `next dev` from writing AGENTS.md/CLAUDE.md into the workshop tree.
  agentRules: false,
  // The talk is presented from `next dev`; the dev-tools badge covers the
  // Trade tab on a phone-width screen.
  devIndicators: false,
};

export default nextConfig;
