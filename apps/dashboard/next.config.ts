/** @type {import("next").NextConfig} */
const config = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    loader: "custom",
    loaderFile: "./image-loader.ts",
    qualities: [80, 100],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "alicdn.pppoker.club",
      },
    ],
  },
  transpilePackages: [
    "@midpoker/ui",
    "@midpoker/tailwind",
    "@midpoker/invoice",
    "@midpoker/api",
  ],
  serverExternalPackages: ["@react-pdf/renderer", "pdfjs-dist"],
  typescript: {
    ignoreBuildErrors: true,
  },
  devIndicators: false,
  // Verify invoice editor etc
  // reactCompiler: true,
  async headers() {
    return [
      {
        source: "/((?!api/proxy).*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "geolocation=(), microphone=(), camera=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "worker-src 'self' blob:",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: https: http://alicdn.pppoker.club",
              "font-src 'self' data: https://fonts.gstatic.com",
              // Allow connections to: self, API server, Supabase (auth, realtime, storage)
              "connect-src 'self' http://localhost:* https://*.supabase.co wss://*.supabase.co https://*.claudedokploy.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

// Only apply Sentry configuration in production
const isProduction = process.env.NODE_ENV === "production";

export default config;
