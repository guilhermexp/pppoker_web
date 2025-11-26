
/** @type {import("next").NextConfig} */
const config = {
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
    ],
  },
  transpilePackages: [
    "@midday/ui",
    "@midday/tailwind",
    "@midday/invoice",
    "@midday/api",
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
        ],
      },
    ];
  },
};

// Only apply Sentry configuration in production
const isProduction = process.env.NODE_ENV === "production";

export default config;
