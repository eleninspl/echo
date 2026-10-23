import type { NextConfig } from "next";

// NEXT_PUBLIC_ variables are fixed into the browser bundle at build time, so a Vercel build without the
// engine's URL would ship an app that calls localhost.
if (process.env.VERCEL && !process.env.NEXT_PUBLIC_ENGINE_URL) {
  throw new Error("Set NEXT_PUBLIC_ENGINE_URL to the engine's URL in the Vercel project, then build again.");
}

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
