import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Tắt source maps trong production để giảm bundle size
  productionBrowserSourceMaps: false,

  // Nén output
  // Avoid the dev-only gzip drain-listener warning while keeping compression
  // enabled for production builds and the VPS runtime.
  compress: process.env.NODE_ENV !== 'development',

  // Tối ưu images
  images: {
    // The upstream phim CDN occasionally stalls when Next's server-side
    // optimizer fetches it, producing 500s from /_next/image. Serve the
    // already-sized remote assets directly so the browser can retry them.
    unoptimized: true,
    qualities: [75, 80, 85, 90],
    // Chỉ WebP: AVIF encode tốn CPU server gấp nhiều lần mà chỉ nhỏ hơn ~10%
    formats: ['image/webp'],
    // Giới hạn số biến thể phải encode + cache
    deviceSizes: [640, 828, 1080, 1200, 1920],
    imageSizes: [96, 128, 160, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 ngày
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'phimimg.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'img.phimapi.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'phimapi.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'phimhayhonro.net',
        pathname: '/uploads/**',
      },
    ],
  },

  // Tối ưu package imports (tree-shaking tốt hơn)
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      '@vidstack/react',
    ],
  },

  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
      // Cache static assets (public images & uploads)
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/uploads/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Security headers cho toàn site
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
