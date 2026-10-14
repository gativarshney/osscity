import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Titles and descriptions go out in the head for every visitor and crawler,
  // so link previews always find them.
  htmlLimitedBots: /.*/,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async redirects() {
    return [
      {
        // Every building has a repository page on Contributable.
        source: "/r/:owner/:repo",
        destination: "https://contributable.vercel.app/repo/:owner/:repo",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
