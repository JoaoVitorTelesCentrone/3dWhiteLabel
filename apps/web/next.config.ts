import type { NextConfig } from "next";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const workspaceEnv = resolve(process.cwd(), "../../.env.local");
if (existsSync(workspaceEnv)) process.loadEnvFile(workspaceEnv);

const nextConfig: NextConfig = {
  distDir: process.env.AGENCIA3D_BENCH === "true" ? ".next-bench" : process.env.AGENCIA3D_E2E === "true" ? ".next-e2e" : ".next",
  devIndicators: false,
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
