import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config, { isServer }) => {
    // Mock Tone.js during build to prevent it from being processed
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'tone': false
      };
    }
    
    return config;
  }
};

export default nextConfig;
