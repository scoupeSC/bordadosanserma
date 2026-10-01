import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Evita que Turbopack tome la raíz del monorepo por package-lock.json del repo
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
