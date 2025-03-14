import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config, { isServer, dev }) => {
    // Mock Tone.js during build to prevent it from being processed
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'tone': false
      };
    }
    
    // Remove console.* in production
    if (!dev) {
      // Find the terser plugin in the minimizer array
      const terserPluginIndex = config.optimization?.minimizer?.findIndex(
        (minimizer: any) => minimizer?.constructor?.name === 'TerserPlugin'
      );
      
      if (terserPluginIndex > -1 && config.optimization?.minimizer) {
        // Get the terser plugin instance
        const terserPlugin = config.optimization.minimizer[terserPluginIndex] as any;
        
        // Update terser options to drop console logs
        if (terserPlugin.options?.terserOptions) {
          terserPlugin.options.terserOptions.compress = {
            ...terserPlugin.options.terserOptions.compress,
            drop_console: true,
          };
        }
      }
    }
    
    return config;
  }
};

export default nextConfig;
