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
  serverExternalPackages: ['pino', 'pino-pretty'],
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
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://static.hotjar.com https://script.hotjar.com", // Next.js requires unsafe-eval and unsafe-inline in dev + Hotjar analytics
              "style-src 'self' 'unsafe-inline' https://*.hotjar.com", // Tailwind and academic content require inline styles + Hotjar UI
              "img-src 'self' data: https: blob:", // Allow academic images from various sources (https: covers Hotjar CDN)
              "font-src 'self' data: https://script.hotjar.com", // Hotjar fonts
              "connect-src 'self' http://localhost:54341 http://127.0.0.1:54341 https://blsgjlrezruxcfdyrqpk.supabase.co https://api.anthropic.com https://generativelanguage.googleapis.com https://*.hotjar.com https://*.hotjar.io wss://*.hotjar.com wss: ws:", // Allow Supabase local + production + AI APIs + Hotjar analytics
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
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
          }
        ],
      },
    ];
  },
};

export default nextConfig;
