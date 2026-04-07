import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    serverActions: {
      // 100 MB for file uploads (audio/video to generate notes)
      bodySizeLimit: "100mb",
    },
  },
  serverExternalPackages: ["sharp", "onnxruntime-node", "ffmpeg-static", "fluent-ffmpeg"],

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Required for SharedArrayBuffer / WASM threading (already present)
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },

          // Prevent MIME-type sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },

          // Block page from being embedded in iframes
          { key: "X-Frame-Options", value: "DENY" },

          // Only send origin on same-origin requests
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

          // Disable legacy XSS auditor (CSP is the modern replacement)
          { key: "X-XSS-Protection", value: "0" },

          // Force HTTPS for 1 year in production
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },

          // Restrict browser features
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },

          // Content-Security-Policy
          // Note: 'unsafe-inline' and 'unsafe-eval' are required for Next.js.
          // Once your app is stable, add a nonce-based CSP for script-src.
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              "img-src 'self' data: blob: https:",
              "media-src 'self' blob:",
              "connect-src 'self' https:",
              "worker-src 'self' blob:",
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

export default nextConfig;
