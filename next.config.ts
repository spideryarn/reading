import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // TypeScript build errors are now enforced
    ignoreBuildErrors: false,
  },
  experimental: {
    optimizePackageImports: ["@phosphor-icons/react"],
  },
  output: 'standalone',
  // Optimize dev server performance
  onDemandEntries: {
    // Keep compiled pages in memory for 5 minutes (default is 60 seconds)
    maxInactiveAge: 5 * 60 * 1000,
    // Keep up to 20 pages in dev memory cache (default is 5)
    pagesBufferLength: 20,
  },
  // External packages for pino and pino-pretty to fix worker thread issues
  // nunjucks added to fix fsevents binary module webpack error
  serverExternalPackages: ['pino', 'pino-pretty', 'nunjucks', 'imagescript', '@napi-rs/canvas'],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Client-side fallbacks for Node.js modules (PDF.js compatibility)
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    
    // Optimize file watching for better dev server performance
    config.watchOptions = {
      ...config.watchOptions,
      // Ignore these paths to reduce file system load
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/.next/**',
        '**/playwright/**',
        '**/tests/test-results/**',
        '**/*.log',
        '**/backup/**',
        '**/obsolete_alternative_version/**',
      ],
    };

    // Handle native .node binaries (e.g., imagescript) at runtime instead of bundling
    config.module.rules.push({
      test: /\.node$/,
      loader: 'node-loader',
    });

    // WASM optimization rules
    if (isServer) {
      // Optimize WASM module handling for server-side
      config.module.rules.push({
        test: /\.wasm$/,
        type: 'webassembly/async',
      });

      // Exclude browser-specific WASM variants from server bundle
      config.externals = [
        ...(config.externals || []),
        ({ request }: { request?: string }, callback: (err?: Error | null, result?: string) => void) => {
          // Exclude browser-specific WASM modules
          if (request?.includes('wasm') && request?.includes('browser')) {
            return callback(null, 'commonjs ' + request);
          }
          callback();
        },
      ];

      // Enable tree-shaking for WASM modules
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: false,
      };
    }

    return config;
  },
  // turbopack: {
  //   resolveExtensions: ['.js', '.jsx', '.ts', '.tsx', '.json']
  // },
  async headers() {
    const devImgSrcExtra = process.env.NODE_ENV !== 'production' ? ' http://localhost:54341 http://127.0.0.1:54341' : ''
    return [
      {
        // Apply CSP headers to all routes
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' blob: https://static.hotjar.com https://script.hotjar.com https://www.googletagmanager.com", // Next.js requires unsafe-eval and unsafe-inline in dev + Hotjar analytics + Google Analytics
              "style-src 'self' 'unsafe-inline' https://*.hotjar.com", // Tailwind and academic content require inline styles + Hotjar UI
              `img-src 'self' data: https: blob:${devImgSrcExtra}`, // Allow academic images + local Supabase in dev
              "media-src 'self' blob:", // Permit audio/video playback from blob URLs (voice-input debug autoplay)
              "font-src 'self' data: https://script.hotjar.com", // Hotjar fonts
              "connect-src 'self' blob: http://localhost:54341 http://127.0.0.1:54341 https://blsgjlrezruxcfdyrqpk.supabase.co https://api.anthropic.com https://generativelanguage.googleapis.com https://*.hotjar.com https://*.hotjar.io wss://*.hotjar.com https://*.google-analytics.com https://analytics.google.com wss: ws:", // Allow blob URLs for audio processing + Supabase local + production + AI APIs + Hotjar analytics + Google Analytics (wildcard for regional domains)
              "worker-src 'self' blob:", // Allow Web Workers and blob URLs required by media-encoder-host-broker
              "frame-src 'none'", // No iframes for security
              "object-src 'none'", // No objects/embeds for security
              "base-uri 'self'", // Restrict base tag
              "form-action 'self'", // Only allow forms to same origin
              "upgrade-insecure-requests" // Force HTTPS in production
            ].join('; ')
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(self), geolocation=(), interest-cohort=()'
          }
        ],
      },
    ];
  },
};

export default nextConfig;
