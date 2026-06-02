import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  async redirects() {
    return [
      { source: "/problems", destination: "/app?tab=sets", permanent: false },
      { source: "/contests", destination: "/app?tab=contests", permanent: false },
      { source: "/leaderboard", destination: "/app?tab=home", permanent: false },
    ];
  },
};

export default nextConfig;
