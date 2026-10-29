import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg"],
  experimental: {
    // Unggah gambar soal lewat server action; batas bawaan 1 MB terlalu kecil.
    serverActions: { bodySizeLimit: "5mb" },
  },
  poweredByHeader: false,
  async headers() {
    const isProduction = process.env.NODE_ENV === "production";

    // CSP hanya di produksi: mode dev Next.js memakai eval/websocket untuk HMR.
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      // blob: diperlukan untuk pratinjau lokal gambar soal (URL.createObjectURL).
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline'",
      "connect-src 'self'",
      "manifest-src 'self'",
    ].join("; ");

    const headers = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
    ];
    if (isProduction) headers.push({ key: "Content-Security-Policy", value: csp });

    return [{ source: "/:path*", headers }];
  },
};

export default nextConfig;
