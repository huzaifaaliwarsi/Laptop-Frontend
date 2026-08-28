/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  async rewrites() {
    let backendUrl = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

    // Ensure protocol (https:// or http://) is present
    if (!backendUrl.startsWith('http://') && !backendUrl.startsWith('https://')) {
      backendUrl = `https://${backendUrl}`;
    }

    // Remove any trailing slash
    backendUrl = backendUrl.replace(/\/+$/, '');

    const target = backendUrl.endsWith('/api') ? `${backendUrl}/:path*` : `${backendUrl}/api/:path*`;
    return [
      {
        source: '/api/:path*',
        destination: target.replace(/\/api\/api\//g, '/api/')
      }
    ];
  }
};

module.exports = nextConfig;
