import type { NextConfig } from 'next';

const config: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  poweredByHeader: false,
  reactStrictMode: true,
  // In development, proxy the API to the local server so cookies stay same-origin.
  ...(process.env.NODE_ENV === 'development'
    ? {
        async rewrites() {
          return [{ source: '/api/:path*', destination: 'http://127.0.0.1:8787/api/:path*' }];
        },
      }
    : {}),
};
export default config;
