
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    return [
      {
        // Apply this header to all routes
        source: '/:path*',
        headers: [
          {
            key: 'Origin-Agent-Cluster',
            value: '?1', // Opt-in to origin-keyed agent clusters
          },
        ],
      },
    ];
  },
};

export default nextConfig;
