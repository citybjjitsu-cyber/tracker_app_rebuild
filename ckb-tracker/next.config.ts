import type { NextConfig } from "next";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
const useApiProxy = process.env.NEXT_PUBLIC_API_PROXY === 'true';

const isDev = process.env.NODE_ENV === 'development';

const cspHeader = `
  default-src 'self';
  script-src 'self'${isDev ? " 'unsafe-inline' 'unsafe-eval'" : " 'unsafe-inline'"};
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: blob: ${apiUrl};
  font-src 'self' data: https://fonts.gstatic.com;
  connect-src 'self'${useApiProxy ? '' : ` ${apiUrl}`};
  frame-ancestors 'none';
  form-action 'self';
  base-uri 'self';
`;

const nextConfig: NextConfig = {
  async rewrites() {
    if (!useApiProxy) return [];

    const apiRoutes = [
      'auth',
      'attendance',
      'classes',
      'class-instances',
      'comments',
      'curricula',
      'dashboard',
      'database',
      'feedback',
      'gym-locations',
      'kiosk',
      'lessons',
      'news',
      'points-adjustments',
      'rank-tiers',
      'roles',
      'terms',
      'themes',
      'users',
      'uploads',
    ];

    return apiRoutes.map((route) => ({
      source: `/${route}/:path*`,
      destination: `${apiUrl}/${route}/:path*`,
    }));
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
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
            key: 'Content-Security-Policy',
            value: cspHeader.replace(/\s{2,}/g, ' ').trim(),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
