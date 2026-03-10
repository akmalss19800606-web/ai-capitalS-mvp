import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

const nextConfig: NextConfig = {
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${BACKEND_URL}/api/v1/:path*`,
      },
    ];
  },
  async redirects() {
    return [
      // REF-004: /portfolio/:id → /portfolios/:id
      {
        source: '/portfolio/:id',
        destination: '/portfolios/:id',
        permanent: true,
      },
      // REF-005: old analytics pages → unified /analytics
      {
        source: '/ai-analytics',
        destination: '/analytics?tab=ai',
        permanent: true,
      },
      {
        source: '/portfolio-analytics',
        destination: '/analytics?tab=portfolio',
        permanent: true,
      },
      // REF-006: old integration pages → unified /integrations
      {
        source: '/api-gateway',
        destination: '/integrations?tab=gateway',
        permanent: true,
      },
      {
        source: '/market-adapters',
        destination: '/integrations?tab=adapters',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
