import path from 'path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.INTERNAL_API_URL ?? 'http://localhost:3001'}/api/:path*`,
      },
    ];
  },
  experimental: {
    // Required for standalone output to correctly trace and bundle cross-workspace deps.
    outputFileTracingRoot: path.join(__dirname, '../../'),
    optimizePackageImports: ['@mantine/core', '@mantine/hooks'],
  },
};

export default nextConfig;
