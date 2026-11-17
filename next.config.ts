import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  poweredByHeader: false,
  // Native/Node-only packages used by route handlers and services.
  serverExternalPackages: ["pg", "sharp", "pino"],
};

export default nextConfig;
