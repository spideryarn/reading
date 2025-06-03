import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["@phosphor-icons/react"],
  },
  turbopack: {
    resolveExtensions: ['.js', '.jsx', '.ts', '.tsx', '.json']
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude pdf2pic from webpack bundling on server
      config.externals.push({
        'pdf2pic': 'commonjs pdf2pic'
      })
      
      // Exclude pdf-to-png-converter and its native dependencies from webpack bundling
      config.externals.push({
        'pdf-to-png-converter': 'commonjs pdf-to-png-converter',
        '@napi-rs/canvas': 'commonjs @napi-rs/canvas'
      })
    }
    return config
  },
};

export default nextConfig;
