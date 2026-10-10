import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Keep the page pixel-identical to the design in development too.
  devIndicators: false,
};

export default nextConfig;
