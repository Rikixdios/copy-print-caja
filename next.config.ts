import type { NextConfig } from 'next';

const noStore = {key: 'Cache-Control', value: 'private, no-store'};
const noIndex = {key: 'X-Robots-Tag', value: 'noindex, nofollow'};

const nextConfig: NextConfig = {
  async headers() {
    return [
      ...['/', '/recuperar-acceso', '/extension'].map(source => ({source, headers: [noStore, noIndex]})),
      {source: '/estado-de-cuenta/:path*', headers: [
        noStore, noIndex, {key: 'Referrer-Policy', value: 'no-referrer'},
      ]},
    ];
  },
};

export default nextConfig;
