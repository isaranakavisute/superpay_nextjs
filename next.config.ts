import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker image (see Dockerfile).
  output: "standalone",
  // Slip images are posted through a server action (base64, ≤ 5 MB decoded).
  experimental: { serverActions: { bodySizeLimit: "12mb" } },
  // Merchant manuals (PDF) served to signed-in shop users by /merchant/docs/[file].
  outputFileTracingIncludes: { "/merchant/docs/[file]": ["./content/merchant-docs/**"] },
  // Old-style addresses from the original site (payments.html, merchant/settings.html, …)
  // land on the clean routes, so existing links and bookmarks keep working.
  // Search engines must not list any part of the site (user, 31 Oct 2026) — every response, including images, PDFs and
  // API answers, carries the header; pages also carry <meta name="robots">. Direct links keep working as before.
  async headers() {
    return [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }] }];
  },
  async redirects() {
    return [
      { source: "/index.html", destination: "/", permanent: false },
      { source: "/merchant/:slug.html", destination: "/merchant/:slug", permanent: false },
      { source: "/:slug.html", destination: "/:slug", permanent: false },
    ];
  },
};

export default nextConfig;
