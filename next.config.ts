import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["@phosphor-icons/react"],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude pdf-to-png-converter from webpack bundling on server
      config.externals.push({
        'pdf-to-png-converter': 'commonjs pdf-to-png-converter'
      })
    }
    return config
  },
};

export default nextConfig;
