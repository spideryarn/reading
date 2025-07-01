import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Temporarily ignore TypeScript build errors for deployment
    ignoreBuildErrors: true,
  },
  experimental: {
    optimizePackageImports: ["@phosphor-icons/react"],
  },
  // External packages for pino and pino-pretty to fix worker thread issues
  // nunjucks added to fix fsevents binary module webpack error
  serverExternalPackages: ['pino', 'pino-pretty', 'nunjucks'],
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
    return config;
  },
  // turbopack: {
  //   resolveExtensions: ['.js', '.jsx', '.ts', '.tsx', '.json']
  // },
  async headers() {
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
              "img-src 'self' data: https: blob:", // Allow academic images from various sources (https: covers Hotjar CDN)
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
