import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Images to PDF was folded into the broader Convert tool.
      { source: "/app/images", destination: "/app/convert", permanent: true },
    ];
  },
};

export default nextConfig;
