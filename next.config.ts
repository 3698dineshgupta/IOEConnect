import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // The proxy (formerly middleware) buffers request bodies; the admin PDF
    // upload route needs more than the 10 MB default.
    proxyClientMaxBodySize: "60mb",
  },
};

export default nextConfig;
